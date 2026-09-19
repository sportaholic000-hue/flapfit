import { createAppleRescissionService, startAppleRescissionMonitoring } from '../appleRescission';
import type { AppleAppTransactionResult } from '../../../../modules/flap-fit-age-range/app-transaction';
const mockReadNative = jest.fn();
const mockRestrict = jest.fn();
const mockAppState = { currentState: 'active', addEventListener: jest.fn() };
jest.mock('../../../../modules/flap-fit-age-range/app-transaction', () => ({
  getVerifiedAppleAppTransaction: () => mockReadNative(),
}));
jest.mock('../processingAccess', () => ({ setAppleAccessRestricted: jest.fn(), setAppleRescissionPending: (value: boolean) => mockRestrict(value) }));
jest.mock('@/config/release', () => ({ ONLINE_SERVICES: {
  supabaseUrl: 'https://flapfit.test', supabasePublishableKey: 'public-test-key',
} }));
jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  return Object.create(actual, { AppState: { get: () => mockAppState } });
});

const checkedAt = '2026-09-19T12:00:00.000Z';
const nativeResult: AppleAppTransactionResult = { status: 'verified', signedAppTransaction: 'header.payload.signature', environment: 'Production' };
const response = (status: string = 'no-revocation-recorded', extra = {}) => ({
  ok: true, json: jest.fn().mockResolvedValue({ status, checkedAt, ...extra }),
});
const cleanups: Array<() => void> = [];
function fixture(options: Partial<Parameters<typeof createAppleRescissionService>[0]> = {}) {
  const readTransaction = jest.fn<Promise<AppleAppTransactionResult>, []>().mockResolvedValue(nativeResult);
  const request = jest.fn().mockResolvedValue(response());
  const setRestricted = jest.fn();
  const service = createAppleRescissionService({ readTransaction, request, setRestricted,
    supabaseUrl: 'https://flapfit.test', publishableKey: 'public-test-key', ...options });
  cleanups.push(service.invalidate);
  return { service, readTransaction, request, setRestricted };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
const flush = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };
beforeEach(() => { jest.clearAllMocks(); });
afterEach(() => { cleanups.splice(0).forEach((cleanup) => cleanup()); jest.useRealTimers(); });

test('constructor performs no traffic or authorization; missing check is unknown', () => {
  const { service, request, readTransaction, setRestricted } = fixture();
  expect(service.getSnapshot()).toEqual({ status: 'unknown', checkedAt: null, revision: 0 });
  expect(request).not.toHaveBeenCalled(); expect(readTransaction).not.toHaveBeenCalled();
  expect(setRestricted).not.toHaveBeenCalled();
});

test('checks are restricted synchronously; no-record only removes the independent restriction', async () => {
  const { service, request, setRestricted } = fixture();
  const result = service.refresh();
  expect(service.getSnapshot().status).toBe('checking');
  expect(setRestricted).toHaveBeenLastCalledWith(true);
  await result;
  expect(service.getSnapshot()).toMatchObject({ status: 'no-revocation-recorded', checkedAt });
  expect(setRestricted).toHaveBeenLastCalledWith(false);
  expect(request).toHaveBeenCalledWith('https://flapfit.test/functions/v1/flapfit-apple-consent/status',
    expect.objectContaining({ method: 'POST', cache: 'no-store', redirect: 'error',
      body: JSON.stringify({ signedAppTransaction: nativeResult.signedAppTransaction }),
      headers: { 'Content-Type': 'application/json', apikey: 'public-test-key', 'Cache-Control': 'no-store' } }));
  expect(JSON.stringify(service.getSnapshot())).not.toContain('signature');
});

test('link sends only the supplied existing token and signed transaction; no user ID', async () => {
  const { service, request } = fixture();
  await service.linkExistingAccount('existing-live-token');
  expect(request).toHaveBeenCalledWith('https://flapfit.test/functions/v1/flapfit-apple-consent/link',
    expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer existing-live-token' }),
      body: JSON.stringify({ signedAppTransaction: nativeResult.signedAppTransaction }) }));
  expect(JSON.stringify(service.getSnapshot())).not.toContain('token');
});

test.each(['', 'bad\ntoken'])('missing or malformed link token %j stays restricted without any native/network work', async (token) => {
  const { service, request, readTransaction, setRestricted } = fixture();
  expect((await service.linkExistingAccount(token)).status).toBe('unavailable');
  expect(request).not.toHaveBeenCalled(); expect(readTransaction).not.toHaveBeenCalled();
  expect(setRestricted).toHaveBeenLastCalledWith(true);
});

test.each(['unsupported', 'unavailable', 'unverified', 'error'] as const)('native %s remains blocked with no network call', async (status) => {
  const { service, request, readTransaction, setRestricted } = fixture();
  readTransaction.mockResolvedValue({ status, signedAppTransaction: null });
  expect((await service.refresh()).status).toBe('unavailable');
  expect(request).not.toHaveBeenCalled(); expect(setRestricted).toHaveBeenLastCalledWith(true);
});

test.each([
  null, [], {}, { status: 'approved', checkedAt },
  { status: 'no-revocation-recorded' }, { status: 'no-revocation-recorded', checkedAt: 'yesterday' },
])('invalid server result %j never clears a restriction', async (data) => {
  const { service, request, setRestricted } = fixture();
  request.mockResolvedValue({ ok: true, json: async () => data });
  expect((await service.refresh()).status).toBe('unavailable');
  expect(setRestricted).not.toHaveBeenCalledWith(false);
});

test('server extras, identifiers, and permission claims are discarded', async () => {
  const { service, request } = fixture();
  request.mockResolvedValue(response('no-revocation-recorded', { appTransactionId: 'private', analyticsAllowed: true }));
  expect(await service.refresh()).toEqual({ status: 'no-revocation-recorded', checkedAt, revision: 3 });
});

test.each(['http', 'network', 'body', 'native'])('%s failure is unavailable without raw error information', async (step) => {
  const { service, request, readTransaction, setRestricted } = fixture();
  const error = new Error('private signing/account details');
  if (step === 'http') request.mockResolvedValue({ ok: false });
  if (step === 'network') request.mockRejectedValue(error);
  if (step === 'body') request.mockResolvedValue({ ok: true, json: async () => { throw error; } });
  if (step === 'native') readTransaction.mockRejectedValue(error);
  expect((await service.refresh()).status).toBe('unavailable');
  expect(JSON.stringify(service.getSnapshot())).not.toContain('private');
  expect(setRestricted).not.toHaveBeenCalledWith(false);
});

test.each(['', 'http://flapfit.test', 'https://flapfit.test/other'])('invalid endpoint %j causes no transmission', async (supabaseUrl) => {
  const { service, readTransaction, request } = fixture({ supabaseUrl });
  expect((await service.refresh()).status).toBe('unavailable');
  expect(readTransaction).not.toHaveBeenCalled(); expect(request).not.toHaveBeenCalled();
});

test('an observed revocation cannot be cleared by a later no-record, retry, link, or invalidation', async () => {
  const { service, request, setRestricted } = fixture();
  request.mockResolvedValueOnce(response('revoked'));
  expect((await service.refresh()).status).toBe('revoked');
  service.invalidate();
  expect((await service.refresh()).status).toBe('revoked');
  expect((await service.linkExistingAccount('existing-live-token')).status).toBe('revoked');
  expect(setRestricted).not.toHaveBeenCalledWith(false);
});

test('account/background invalidation prevents late native result from sending signed data', async () => {
  const pending = deferred<AppleAppTransactionResult>();
  const { service, request, readTransaction, setRestricted } = fixture();
  readTransaction.mockReturnValue(pending.promise);
  const check = service.refresh();
  service.invalidate();
  pending.resolve(nativeResult);
  expect((await check).status).toBe('unknown');
  await flush();
  expect(request).not.toHaveBeenCalled(); expect(setRestricted).not.toHaveBeenCalledWith(false);
});

test('invalidation aborts network and rejects even a transport that resolves its body later', async () => {
  const body = deferred<unknown>();
  const { service, request, setRestricted } = fixture();
  request.mockResolvedValue({ ok: true, json: () => body.promise });
  const check = service.refresh();
  await flush();
  const signal = request.mock.calls[0][1].signal;
  service.invalidate();
  expect(signal.aborted).toBe(true);
  body.resolve({ status: 'no-revocation-recorded', checkedAt });
  expect((await check).status).toBe('unknown');
  await flush();
  expect(setRestricted).not.toHaveBeenCalledWith(false);
});

test('a superseded check cannot clear a newer verified revocation', async () => {
  const older = deferred<unknown>();
  const { service, request, setRestricted } = fixture();
  request.mockResolvedValueOnce({ ok: true, json: () => older.promise }).mockResolvedValueOnce(response('revoked'));
  const first = service.refresh(); await flush();
  expect((await service.refresh()).status).toBe('revoked');
  older.resolve({ status: 'no-revocation-recorded', checkedAt });
  await first; await flush();
  expect(service.getSnapshot().status).toBe('revoked'); expect(setRestricted).not.toHaveBeenCalledWith(false);
});

test('hung native reads time out fail-closed and cannot transmit later', async () => {
  jest.useFakeTimers();
  const native = deferred<AppleAppTransactionResult>();
  const { service, readTransaction, request, setRestricted } = fixture({ timeoutMs: 50 });
  readTransaction.mockReturnValue(native.promise);
  const check = service.refresh(); jest.advanceTimersByTime(50);
  expect((await check).status).toBe('unavailable');
  native.resolve(nativeResult); await flush();
  expect(request).not.toHaveBeenCalled(); expect(setRestricted).not.toHaveBeenCalledWith(false);
});

test('a new process does not inherit a successful snapshot or signed identity', async () => {
  const first = fixture(); await first.service.refresh();
  const relaunched = fixture();
  expect(relaunched.service.getSnapshot().status).toBe('unknown');
  expect(relaunched.readTransaction).not.toHaveBeenCalled();
  await relaunched.service.refresh(); expect(relaunched.readTransaction).toHaveBeenCalledTimes(1);
});

test('observer errors cannot prevent restriction or other observers', async () => {
  const { service, setRestricted } = fixture();
  const listener = jest.fn();
  service.subscribe(() => { throw new Error('observer failed'); }); service.subscribe(listener);
  service.invalidate();
  expect(setRestricted).toHaveBeenLastCalledWith(true); expect(listener).toHaveBeenCalledTimes(1);
});

test('explicit lifecycle monitor blocks in background and rechecks on foreground without startup UI', async () => {
  let change!: (state: string) => void;
  const remove = jest.fn();
  mockAppState.currentState = 'background';
  mockAppState.addEventListener.mockImplementation((_event, listener) => { change = listener; return { remove }; });
  mockReadNative.mockResolvedValue({ status: 'unsupported', signedAppTransaction: null });
  const stop = startAppleRescissionMonitoring();
  expect(mockRestrict).toHaveBeenLastCalledWith(true); expect(mockReadNative).not.toHaveBeenCalled();
  change('active'); await flush();
  expect(mockReadNative).toHaveBeenCalledTimes(1);
  change('inactive'); expect(mockRestrict).toHaveBeenLastCalledWith(true);
  stop(); expect(remove).toHaveBeenCalledTimes(1); expect(mockRestrict).toHaveBeenLastCalledWith(true);
});


test('fresh status and concurrent pending checks are reused without permission churn', async () => {
  const {service,request,setRestricted}=fixture();
  await Promise.all([service.ensureCurrent(),service.ensureCurrent()]);
  expect(request).toHaveBeenCalledTimes(1);setRestricted.mockClear();
  await service.ensureCurrent();expect(request).toHaveBeenCalledTimes(1);expect(setRestricted).not.toHaveBeenCalled();
});

test('freshness expires to a blocked state and requires a new native verification', async () => {
  jest.useFakeTimers();const {service,readTransaction,setRestricted}=fixture({freshnessMs:100});
  await service.ensureCurrent();expect(service.isFresh()).toBe(true);
  jest.advanceTimersByTime(100);expect(service.isFresh()).toBe(false);expect(setRestricted).toHaveBeenLastCalledWith(true);
  await service.ensureCurrent();expect(readTransaction).toHaveBeenCalledTimes(2);
});

test('verified revocation records the confirmed restriction; no-record never clears it', async () => {
  const recordRevocation=jest.fn();const {service,request}=fixture({recordRevocation});
  request.mockResolvedValueOnce(response('revoked'));await service.refresh();
  expect(recordRevocation).toHaveBeenCalledTimes(1);await service.refresh();
  expect(service.getSnapshot().status).toBe('revoked');expect(recordRevocation).toHaveBeenCalledTimes(1);
});


test('a native-verified Sandbox transaction uses only the fixed Sandbox endpoint', async () => {
  const {service,readTransaction,request}=fixture();
  readTransaction.mockResolvedValue({...nativeResult, environment:'Sandbox'} as AppleAppTransactionResult);
  await service.refresh();
  expect(request).toHaveBeenCalledWith('https://flapfit.test/functions/v1/flapfit-apple-consent-sandbox/status',expect.anything());
});
test('an endpoint error never triggers a cross-environment retry', async () => {
  const {service,readTransaction,request}=fixture();
  readTransaction.mockResolvedValue({...nativeResult, environment:'Sandbox'} as AppleAppTransactionResult);
  request.mockResolvedValue({ok:false});await service.refresh();
  expect(request).toHaveBeenCalledTimes(1);expect(service.getSnapshot().status).toBe('unavailable');
});
