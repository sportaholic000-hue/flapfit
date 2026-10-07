import { LAUNCH_COUNTRIES } from '../launchCountries';
const URL = 'https://flapfitapp.com/cdn-cgi/trace';
const trace = (loc = 'CA') => 'fl=123\nh=flapfitapp.com\nip=192.0.2.9\nuag=Native Test\ncolo=IAD\nloc=' + loc + '\ntls=TLSv1.3\n';
const deferred = <T,>() => { let resolve!: (value: T) => void; const promise = new Promise<T>((done) => { resolve = done; }); return { promise, resolve }; };
function response(body = trace(), overrides: Record<string, unknown> = {}): Response {
  return { ok: true, status: 200, redirected: false, url: URL,
    headers: { get: (key: string) => key === 'content-type' ? 'text/plain; charset=UTF-8' : null },
    text: jest.fn().mockResolvedValue(body), ...overrides } as unknown as Response;
}
function load(options: { platform?: string; expoGo?: boolean; state?: string } = {}) {
  jest.resetModules();
  const listeners = new Set<(state: string) => void>();
  const appState = { currentState: options.state ?? 'active', addEventListener: jest.fn((_event, listener) => {
    listeners.add(listener); return { remove: () => { listeners.delete(listener); } };
  }) };
  jest.doMock('react-native', () => ({ AppState: appState, Platform: { OS: options.platform ?? 'ios' } }));
  jest.doMock('expo-constants', () => ({ __esModule: true, default: { executionEnvironment: options.expoGo ? 'storeClient' : 'standalone' }, ExecutionEnvironment: { StoreClient: 'storeClient' } }));
  const api: typeof import('../privacyCountry') = require('../privacyCountry');
  const request = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>().mockResolvedValue(response());
  const service = api.createPrivacyCountryService({ request });
  return { api, request, service, listeners, change: (state: string) => { appState.currentState = state; [...listeners].forEach((listener) => listener(state)); } };
}
afterEach(() => jest.useRealTimers());
test.each(Object.keys(LAUNCH_COUNTRIES))('retains only selected %s country, source and status', (country) => {
  const f = load(); expect(f.api.parsePrivacyCountryTrace(trace(country))).toEqual({ status: 'resolved', country, source: 'cloudflare-trace' });
  expect(JSON.stringify(f.api.parsePrivacyCountryTrace(trace(country)))).not.toMatch(/192\.0\.2|uag|colo|fl=|tls/);
});
test('uses loc rather than colo and discards unsupported country details', () => {
  const f = load(); expect(f.api.parsePrivacyCountryTrace(trace('JP'))).toEqual({ status: 'outside-launch', country: null, source: 'cloudflare-trace' });
  expect(f.api.parsePrivacyCountryTrace(trace().replace('loc=CA\n', '')).status).toBe('unavailable');
});
test.each([
  '', 'h=flapfitapp.com\nloc=CA\nloc=US\n', 'h=flapfitapp.com\nh=flapfitapp.com\nloc=CA',
  'h=flapfitapp.com\nloc=CA\nuag=one\nuag=two', 'h=evil.example\nloc=CA', 'h=flapfitapp.com:443\nloc=CA',
  'h=flapfitapp.com\nloc=ca', 'h=flapfitapp.com\nloc=CA ', 'h=flapfitapp.com\nloc=CAN', 'h=flapfitapp.com\nloc=XX',
  'h=flapfitapp.com\nloc=ZZ', 'h=flapfitapp.com\nloc=T1', 'h=flapfitapp.com\nloc=CA\nmalformed',
  'h=flapfitapp.com\nloc=CA\n\n', 'h=flapfitapp.com\nloc=CA\nuag=\u0000', 'h=flapfitapp.com\nloc=CA\nuag=Ã©',
  'h=flapfitapp.com\nloc=CA\nuag=' + 'a'.repeat(4096),
])('rejects malformed, duplicate or oversized trace %#', (raw) => {
  expect(load().api.parsePrivacyCountryTrace(raw)).toEqual({ status: 'unavailable', country: null, source: null });
});
test('accepts CRLF trace and equals signs inside ignored values', () => {
  expect(load().api.parsePrivacyCountryTrace(trace().replace('Native Test', 'Native=Test').replace(/\n/g, '\r\n')).country).toBe('CA');
});
test('fetch uses fixed HTTPS endpoint without cookies, cache, redirect or injected region headers', async () => {
  const f = load(); expect((await f.service.refresh()).country).toBe('CA');
  expect(f.request).toHaveBeenCalledWith(URL, expect.objectContaining({ method: 'GET', credentials: 'omit', cache: 'no-store', redirect: 'error', signal: expect.anything(), headers: { Accept: 'text/plain', 'Cache-Control': 'no-store', Pragma: 'no-cache' } }));
  expect(Object.keys(f.service.getSnapshot()).sort()).toEqual(['country', 'source', 'status']);
});
test.each([
  { ok: false, status: 500 }, { status: 204 }, { redirected: true }, { url: 'https://evil.example/cdn-cgi/trace' }, { url: '' },
  { headers: { get: () => 'text/html' } }, { headers: { get: (key: string) => key === 'content-type' ? 'text/plain' : '4097' } },
  { headers: { get: (key: string) => key === 'content-type' ? 'text/plain' : 'garbage' } },
])('rejects transport/response metadata %# before retaining data', async (overrides) => {
  const f = load(); f.request.mockResolvedValueOnce(response(trace(), overrides)); expect((await f.service.refresh()).status).toBe('unavailable');
});
test('deduplicates overlapping calls and does not loop-retry failures during a foreground session', async () => {
  const f = load(); f.request.mockRejectedValueOnce(new Error('offline')); const a = f.service.refresh(), b = f.service.refresh();
  expect(a).toBe(b); await a; await f.service.refresh(); expect(f.request).toHaveBeenCalledTimes(1);
  f.service.invalidate(); expect((await f.service.refresh()).country).toBe('CA'); expect(f.request).toHaveBeenCalledTimes(2);
});
test('8-second timeout aborts uncooperative fetch and late success cannot publish a country', async () => {
  jest.useFakeTimers(); const f = load(); const pending = deferred<Response>(); f.request.mockReturnValueOnce(pending.promise);
  const operation = f.service.refresh(); await Promise.resolve(); await jest.advanceTimersByTimeAsync(8_001);
  expect((await operation).status).toBe('unavailable'); expect(f.request.mock.calls[0][1]?.signal?.aborted).toBe(true);
  pending.resolve(response()); for (let i = 0; i < 5; i++) await Promise.resolve(); expect(f.service.getSnapshot().status).toBe('unavailable');
});
test('invalidation rejects stale lifecycle work even when old fetch resolves after a new country', async () => {
  const f = load(); const pending = deferred<Response>(); f.request.mockReturnValueOnce(pending.promise);
  const old = f.service.refresh(); await Promise.resolve(); f.service.invalidate();
  expect(f.service.getSnapshot()).toEqual({ status: 'unknown', country: null, source: null });
  f.request.mockResolvedValueOnce(response(trace('AU'))); await f.service.refresh(); pending.resolve(response(trace('US'))); await old;
  expect(f.service.getSnapshot().country).toBe('AU');
});
test('body timeout and stale body read cannot republish a late result', async () => {
  jest.useFakeTimers(); const f = load(); const body = deferred<string>();
  f.request.mockResolvedValueOnce(response('', { text: () => body.promise })); const operation = f.service.refresh();
  await jest.advanceTimersByTimeAsync(8_001); expect((await operation).status).toBe('unavailable'); body.resolve(trace());
  for (let i = 0; i < 5; i++) await Promise.resolve(); expect(f.service.getSnapshot().country).toBeNull();
});
test('streaming reader rejects a body above 4KB without text fallback and cancels it', async () => {
  const f = load(); const cancel = jest.fn().mockResolvedValue(undefined), releaseLock = jest.fn();
  const read = jest.fn().mockResolvedValueOnce({ done: false, value: new Uint8Array(4097) }); const text = jest.fn();
  f.request.mockResolvedValueOnce(response('', { text, body: { getReader: () => ({ read, cancel, releaseLock }) } }));
  expect((await f.service.refresh()).status).toBe('unavailable'); expect(text).not.toHaveBeenCalled(); expect(cancel).toHaveBeenCalled(); expect(releaseLock).toHaveBeenCalled();
});
test.each([{ platform: 'web' }, { expoGo: true }])('unsupported runtime %j never makes network request', async (options) => {
  const f = load(options); expect((await f.service.refresh()).status).toBe('unavailable'); expect(f.request).not.toHaveBeenCalled();
});
test('lifecycle mounts once, ignores native-sheet inactive transitions, invalidates actual background and retries once', async () => {
  const f = load(); const original = Object.getOwnPropertyDescriptor(globalThis, 'fetch');
  Object.defineProperty(globalThis, 'fetch', { configurable: true, writable: true, value: f.request });
  try {
    const stopA = f.api.startPrivacyCountry(), stopB = f.api.startPrivacyCountry(); await f.api.refreshPrivacyCountry();
    expect(f.request).toHaveBeenCalledTimes(1); expect(f.listeners.size).toBe(1);
    f.change('inactive'); f.change('active'); await f.api.refreshPrivacyCountry(); expect(f.request).toHaveBeenCalledTimes(1);
    f.change('background'); expect(f.api.getPrivacyCountrySnapshot().status).toBe('unknown');
    f.change('active'); await f.api.refreshPrivacyCountry(); expect(f.request).toHaveBeenCalledTimes(2);
    stopA(); stopA(); expect(f.listeners.size).toBe(1); stopB(); expect(f.listeners.size).toBe(0);
  } finally { if (original) Object.defineProperty(globalThis, 'fetch', original); }
});
