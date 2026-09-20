import Constants, { ExecutionEnvironment } from 'expo-constants';
import { AppState, Platform } from 'react-native';

export type LaunchCountry = 'CA' | 'US' | 'AU' | 'MX';
export type PrivacyCountrySnapshot = Readonly<{
  status: 'unknown' | 'checking' | 'resolved' | 'outside-launch' | 'unavailable';
  country: LaunchCountry | null;
  source: 'cloudflare-trace' | null;
}>;
const TRACE_URL = 'https://flapfitapp.com/cdn-cgi/trace';
const TRACE_HOST = 'flapfitapp.com';
const MAX_TRACE_BYTES = 4096;
const TIMEOUT_MS = 8_000;
const countries = new Set<LaunchCountry>(['CA', 'US', 'AU', 'MX']);
const unresolved = (status: 'unknown' | 'checking' | 'unavailable'): PrivacyCountrySnapshot => ({ status, country: null, source: null });
/** Consume and discard trace text immediately. It includes an IP and must never
 * enter logs, storage, snapshots, analytics, error details or other SDKs.
 * loc describes the current network country, not residence, state/province or age.
 * colo is deliberately ignored. Cloudflare owns this endpoint:
 * https://developers.cloudflare.com/fundamentals/reference/cdn-cgi-endpoint/ */
export function parsePrivacyCountryTrace(raw: string): PrivacyCountrySnapshot {
  if (!raw || raw.length > MAX_TRACE_BYTES || /[^\x20-\x7E\r\n]/.test(raw)) return unresolved('unavailable');
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  if (lines.length > 64) return unresolved('unavailable');
  const seen = new Set<string>();
  let host: string | null = null;
  let country: string | null = null;
  for (const line of lines) {
    const separator = line.indexOf('=');
    if (separator < 1) return unresolved('unavailable');
    const key = line.slice(0, separator);
    if (!/^[a-z][a-z0-9_]{0,31}$/.test(key) || seen.has(key)) return unresolved('unavailable');
    seen.add(key);
    // No map of values is made: all unrelated, potentially identifying values are ignored.
    if (key === 'h') host = line.slice(separator + 1);
    if (key === 'loc') country = line.slice(separator + 1);
  }
  if (host !== TRACE_HOST || !country || !/^[A-Z]{2}$/.test(country) || country === 'XX' || country === 'ZZ') return unresolved('unavailable');
  if (!countries.has(country as LaunchCountry)) {
    // No unsupported country code is retained or used to choose a policy.
    return { status: 'outside-launch', country: null, source: 'cloudflare-trace' };
  }
  return { status: 'resolved', country: country as LaunchCountry, source: 'cloudflare-trace' };
}

async function readBoundedTrace(response: Response, assertCurrent: () => void): Promise<PrivacyCountrySnapshot> {
  let raw: string | null = null;
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  try {
    const length = response.headers.get('content-length');
    if (length !== null && (!/^\d+$/.test(length) || Number(length) > MAX_TRACE_BYTES)) return unresolved('unavailable');
    if (typeof response.body?.getReader === 'function') {
      reader = response.body.getReader();
      let bytes = 0;
      raw = '';
      while (true) {
        const part = await reader.read();
        assertCurrent();
        if (part.done) break;
        bytes += part.value.byteLength;
        if (bytes > MAX_TRACE_BYTES || part.value.some((byte) => byte > 127)) return unresolved('unavailable');
        raw += String.fromCharCode(...part.value);
      }
    } else {
      // React Native's standard fetch may not expose streaming. Reject the text
      // before parsing when it exceeds the limit; never persist the body.
      raw = await response.text();
    }
    assertCurrent();
    return parsePrivacyCountryTrace(raw);
  } finally {
    raw = null;
    if (reader) {
      try { await reader.cancel(); } catch { /* Cancellation cannot reveal trace data. */ }
      reader.releaseLock();
      reader = null;
    }
  }
}

type Dependencies = { request: typeof fetch; isSupported?: () => boolean };
const installedNative = () => (Platform.OS === 'ios' || Platform.OS === 'android') &&
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
/** One bounded attempt per generation. Repeated renders cannot create retry loops.
 * The mounting lifecycle owner invalidates on background and refreshes on foreground. */
export function createPrivacyCountryService(deps: Dependencies) {
  let generation = 0;
  let attemptedGeneration: number | null = null;
  let pending: Promise<PrivacyCountrySnapshot> | null = null;
  let cancel: (() => void) | null = null;
  let snapshot: PrivacyCountrySnapshot = Object.freeze(unresolved('unknown'));
  const listeners = new Set<() => void>();
  const publish = (value: PrivacyCountrySnapshot) => {
    snapshot = Object.freeze({ ...value });
    for (const listener of listeners) {
      try { listener(); } catch { /* A view cannot prevent restriction publication. */ }
    }
  };
  const invalidate = () => {
    ++generation;
    attemptedGeneration = null;
    pending = null;
    const stop = cancel;
    cancel = null;
    stop?.();
    publish(unresolved('unknown'));
  };
  const refresh = (): Promise<PrivacyCountrySnapshot> => {
    if (pending) return pending;
    if (attemptedGeneration === generation) return Promise.resolve(snapshot);
    attemptedGeneration = generation;
    if (!(deps.isSupported ?? installedNative)()) { publish(unresolved('unavailable')); return Promise.resolve(snapshot); }
    const token = generation;
    const controller = new AbortController();
    let rejectCancellation!: (reason: Error) => void;
    const cancelled = new Promise<never>((_, reject) => { rejectCancellation = reject; });
    const stop = () => { controller.abort(); rejectCancellation(new Error('Country lookup cancelled')); };
    cancel = stop;
    const timer = setTimeout(stop, TIMEOUT_MS);
    const assertCurrent = () => {
      if (token !== generation || controller.signal.aborted) throw new Error('Country lookup stale');
    };
    const operation = Promise.resolve().then(async () => {
      assertCurrent();
      const response = await deps.request(TRACE_URL, {
        method: 'GET', credentials: 'omit', cache: 'no-store', redirect: 'error', signal: controller.signal,
        headers: { Accept: 'text/plain', 'Cache-Control': 'no-store', Pragma: 'no-cache' },
      });
      assertCurrent();
      // Enforce both transport destination and trace host; do not accept a redirect
      // even if the fetch implementation ignores the request's redirect option.
      if (!response.ok || response.status !== 200 || response.redirected || response.url !== TRACE_URL ||
        response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'text/plain') return unresolved('unavailable');
      return readBoundedTrace(response, assertCurrent);
    });
    const task = Promise.race([operation, cancelled]).then((value) => {
      assertCurrent(); publish(value); return snapshot;
    }).catch(() => {
      if (token === generation) publish(unresolved('unavailable'));
      return token === generation ? snapshot : unresolved('unknown');
    }).finally(() => {
      clearTimeout(timer);
      if (token === generation) { pending = null; if (cancel === stop) cancel = null; }
    });
    pending = task;
    publish(unresolved('checking'));
    return task;
  };
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    refresh, invalidate,
  };
}

// Keep fetch lazy: importing a privacy service never triggers the Expo fetch runtime or a request.
const privacyCountry = createPrivacyCountryService({ request: (...args) => fetch(...args) });
export const getPrivacyCountrySnapshot = privacyCountry.getSnapshot;
export const subscribePrivacyCountry = privacyCountry.subscribe;
export const refreshPrivacyCountry = privacyCountry.refresh;
export const invalidatePrivacyCountry = privacyCountry.invalidate;
let consumers = 0;
let removeLifecycle: (() => void) | null = null;
/** Mount from privacyStartup once, independently of ad/analytics eligibility.
 * A native sheet's inactive→active transition is not a new country session. */
export function startPrivacyCountry(): () => void {
  ++consumers;
  if (consumers === 1) {
    let previous = AppState.currentState;
    let backgrounded = previous === 'background';
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background' && previous !== 'background') {
        backgrounded = true;
        invalidatePrivacyCountry();
      }
      const enteredForeground = state === 'active' && previous !== 'active';
      previous = state;
      if (enteredForeground && (backgrounded || getPrivacyCountrySnapshot().status === 'unknown')) {
        backgrounded = false;
        void refreshPrivacyCountry();
      }
    });
    removeLifecycle = () => subscription.remove();
    if (previous === 'active') void refreshPrivacyCountry();
  }
  let stopped = false;
  return () => {
    if (stopped) return;
    stopped = true;
    if (--consumers === 0) {
      removeLifecycle?.(); removeLifecycle = null;
      invalidatePrivacyCountry();
    }
  };
}
