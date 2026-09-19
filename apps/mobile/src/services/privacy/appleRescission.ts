import { AppState } from 'react-native';
import { ONLINE_SERVICES } from '@/config/release';
import {
  getVerifiedAppleAppTransaction, type AppleAppTransactionResult,
} from '../../../modules/flap-fit-age-range/app-transaction';
import { setAppleAccessRestricted, setAppleRescissionPending } from './processingAccess';

export type AppleRescissionSnapshot = Readonly<{
  status: 'unknown' | 'checking' | 'no-revocation-recorded' | 'revoked' | 'unavailable';
  checkedAt: string | null;
  revision: number;
}>;
type Dependencies = {
  readTransaction: () => Promise<AppleAppTransactionResult>;
  request: typeof fetch;
  setRestricted: (restricted: boolean) => void;
  recordRevocation?: () => void;
  supabaseUrl: string;
  publishableKey: string;
  timeoutMs?: number;
  freshnessMs?: number;
};
type Pending = { cancel: () => void; generation: number };

/** The only retained facts are a server status and its timestamp. Neither a signed
 * transaction nor an account token/identifier belongs in state, storage or analytics.
 * Call refresh/invalidate before enabling processing and on account/lifecycle changes.
 * No-record removes only this restriction; it never grants a purpose or clears a
 * revocation already observed by this instance. Reapproval needs a separate authority. */
export function createAppleRescissionService(deps: Dependencies) {
  let generation = 0;
  let pending: Pending | null = null;
  let revokedAt: string | null = null;
  let freshUntil = 0;
  let expiration: ReturnType<typeof setTimeout> | null = null;
  let currentCheck: Promise<AppleRescissionSnapshot> | null = null;
  let snapshot: AppleRescissionSnapshot = { status: 'unknown', checkedAt: null, revision: 0 };
  const listeners = new Set<() => void>();
  const publish = (status: AppleRescissionSnapshot['status'], checkedAt: string | null = null) => {
    snapshot = { status, checkedAt, revision: snapshot.revision + 1 };
    deps.setRestricted(status !== 'no-revocation-recorded');
    for (const listener of listeners) {
      try { listener(); } catch { /* One observer cannot stop the restriction. */ }
    }
  };
  const invalidate = () => {
    freshUntil = 0;
    if (expiration) clearTimeout(expiration);
    expiration = null;
    ++generation;
    currentCheck = null;
    pending?.cancel();
    pending = null;
    publish(revokedAt ? 'revoked' : 'unknown', revokedAt);
  };
  const run = (mode: 'status' | 'link', accessToken?: string): Promise<AppleRescissionSnapshot> => {
    invalidate();
    const token = generation;
    if (!/^https:\/\/[^/]+(?:\/)?$/.test(deps.supabaseUrl) || !deps.publishableKey ||
        (mode === 'link' && (!accessToken?.trim() || /[\r\n]/.test(accessToken)))) {
      publish(revokedAt ? 'revoked' : 'unavailable', revokedAt);
      return Promise.resolve(snapshot);
    }
    publish(revokedAt ? 'revoked' : 'checking', revokedAt);
    const controller = new AbortController();
    let cancel = () => undefined as void;
    const cancelled = new Promise<never>((_, reject) => {
      cancel = () => { controller.abort(); reject(new Error('Apple status check cancelled')); };
    });
    pending = { cancel, generation: token };
    const timer = setTimeout(cancel, deps.timeoutMs ?? 10_000);
    const assertCurrent = () => {
      if (token !== generation || controller.signal.aborted) throw new Error('Apple status check stale');
    };
    const operation = (async () => {
      let transaction: AppleAppTransactionResult | null = null;
      try {
        transaction = await deps.readTransaction();
        assertCurrent();
        if (transaction.status !== 'verified' ||
            (transaction.environment !== 'Production' && transaction.environment !== 'Sandbox')) throw new Error('Apple transaction unavailable');
        const headers: Record<string, string> = {
          'Content-Type': 'application/json', apikey: deps.publishableKey,
          'Cache-Control': 'no-store',
        };
        if (mode === 'link') headers.Authorization = 'Bearer ' + accessToken;
        const functionName = transaction.environment === 'Production'
          ? 'flapfit-apple-consent' : 'flapfit-apple-consent-sandbox';
        const response = await deps.request(
          deps.supabaseUrl.replace(/\/$/, '') + '/functions/v1/' + functionName + '/' + mode,
          { method: 'POST', headers, body: JSON.stringify({ signedAppTransaction: transaction.signedAppTransaction }),
            signal: controller.signal, cache: 'no-store', redirect: 'error', credentials: 'omit' },
        );
        transaction = null;
        assertCurrent();
        if (!response.ok) throw new Error('Apple status unavailable');
        const value: unknown = await response.json();
        assertCurrent();
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid Apple status');
        const result = value as Record<string, unknown>;
        if ((result.status !== 'revoked' && result.status !== 'no-revocation-recorded') ||
            typeof result.checkedAt !== 'string' ||
            !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(result.checkedAt) ||
            !Number.isFinite(Date.parse(result.checkedAt))) throw new Error('Invalid Apple status');
        if (result.status === 'revoked') { revokedAt = result.checkedAt; deps.recordRevocation?.(); }
        if (!revokedAt) {
          const ttl = deps.freshnessMs ?? 5 * 60_000;
          freshUntil = Date.now() + ttl;
          expiration = setTimeout(invalidate, ttl);
        }
        publish(revokedAt ? 'revoked' : 'no-revocation-recorded', revokedAt ?? result.checkedAt);
      } finally {
        transaction = null;
      }
    })();
    return Promise.race([operation, cancelled]).catch(() => {
      if (token === generation) publish(revokedAt ? 'revoked' : 'unavailable', revokedAt);
    }).then(() => snapshot).finally(() => {
      clearTimeout(timer);
      if (pending?.generation === token) pending = null;
    });
  };
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    invalidate,
    isFresh: () => snapshot.status === 'no-revocation-recorded' && Date.now() < freshUntil,
    ensureCurrent: (): Promise<AppleRescissionSnapshot> => {
      if ((snapshot.status === 'no-revocation-recorded' && Date.now() < freshUntil) || revokedAt) return Promise.resolve(snapshot);
      if (currentCheck) return currentCheck;
      const check = run('status');
      currentCheck = check;
      void check.then(() => { if (currentCheck === check) currentCheck = null; });
      return check;
    },
    refresh: () => run('status'),
    /** Only a caller's existing authenticated session may link an online profile.
     * Never create/refresh an account solely to check or link app consent. */
    linkExistingAccount: (accessToken: string) => run('link', accessToken),
  };
}

const service = createAppleRescissionService({
  readTransaction: getVerifiedAppleAppTransaction,
  request: (...args) => fetch(...args),
  setRestricted: setAppleRescissionPending,
  recordRevocation: () => setAppleAccessRestricted(true),
  supabaseUrl: ONLINE_SERVICES.supabaseUrl,
  publishableKey: ONLINE_SERVICES.supabasePublishableKey,
});
export const getAppleRescissionStatus = service.getSnapshot;
export const subscribeAppleRescissionStatus = service.subscribe;
export const invalidateAppleRescissionStatus = service.invalidate;
export const refreshAppleRescissionStatus = service.refresh;
export const ensureCurrentAppleRescissionStatus = service.ensureCurrent;
export const isAppleRescissionStatusFresh = service.isFresh;
export const linkAppleRescissionToExistingAccount = service.linkExistingAccount;

/** Explicit lifecycle hook for the future coordinator; importing this file does not
 * start network traffic. Backgrounding blocks immediately, foregrounding rechecks.
 * Account changes must additionally call invalidateAppleRescissionStatus. */
export function startAppleRescissionMonitoring(): () => void {
  let active = false;
  let stopped = false;
  const unsubscribe = service.subscribe(() => {
    // Defer expiration recovery so run's synchronous invalidation cannot recurse.
    void Promise.resolve().then(() => {
      if (!stopped && active && service.getSnapshot().status === 'unknown') void service.ensureCurrent();
    });
  });
  const check = (state: string) => {
    active = state === 'active';
    if (active) void service.ensureCurrent();
    else service.invalidate();
  };
  const subscription = AppState.addEventListener('change', check);
  check(AppState.currentState);
  return () => { stopped = true; unsubscribe(); subscription.remove(); service.invalidate(); };
}
