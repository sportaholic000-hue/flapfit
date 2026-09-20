import { createRevenueCatTestDiagnostics, type RevenueCatTestDiagnosticContext } from '../monetization/revenueCatTestDiagnostics';

const sdkId = '$RCAnonymousID:0123456789abcdef0123456789abcdef';
const impression = 'ff-mfx22abc-1-abcdef0123';
function fixture() {
  const context: RevenueCatTestDiagnosticContext = {
    adsMode: 'test', revenueCatPermitted: true, generation: 1, appVersion: '1.0.0', buildNumber: '13',
  };
  const sink = jest.fn();
  const diagnostics = createRevenueCatTestDiagnostics(() => context, sink, () => 1_700_000_000_000);
  const event = { kind: 'ad_displayed' as const, generation: 1, appUserID: sdkId, impressionId: impression };
  return { context, sink, diagnostics, event };
}

test('records a bounded local callback with correlation fields without claiming server receipt', () => {
  const f = fixture();
  expect(f.diagnostics.record(f.event)).toBe(true);
  const line = f.sink.mock.calls[0][0] as string;
  expect(JSON.parse(line)).toEqual({
    scope: 'flapfit.rc.test.local', receipt: 'unverified', timestamp: '2023-11-14T22:13:20.000Z',
    generation: 1, kind: 'ad_displayed', appVersion: '1.0.0', buildNumber: '13',
    rcIdSuffix: '456789abcdef', impressionId: impression,
  });
  expect(line).not.toContain(sdkId);
  expect(line.length).toBeLessThanOrEqual(512);
});

test.each(['live', undefined, '', 'TEST'])('does not log in ads mode %s', (mode) => {
  const f = fixture();
  f.context.adsMode = mode;
  expect(f.diagnostics.record(f.event)).toBe(false);
  expect(f.sink).not.toHaveBeenCalled();
});

test('withdrawal and regrant cannot revive stale callbacks', () => {
  const f = fixture();
  f.context.revenueCatPermitted = false;
  expect(f.diagnostics.record(f.event)).toBe(false);
  f.context.generation = 2;
  f.context.revenueCatPermitted = true;
  expect(f.diagnostics.record(f.event)).toBe(false);
  expect(f.diagnostics.record({ ...f.event, generation: 2 })).toBe(true);
  expect(f.sink).toHaveBeenCalledTimes(1);
});

test('rejects missing event correlation, malformed generations and arbitrary kinds', () => {
  const f = fixture();
  expect(f.diagnostics.record({ ...f.event, impressionId: undefined })).toBe(false);
  expect(f.diagnostics.record({ ...f.event, impressionId: 'email@example.com' })).toBe(false);
  expect(f.diagnostics.record({ ...f.event, generation: NaN })).toBe(false);
  expect(f.diagnostics.record({ ...f.event, kind: 'secret-api-key' as never })).toBe(false);
  expect(f.diagnostics.record({ kind: 'configured', generation: 1, appUserID: sdkId })).toBe(true);
  expect(f.sink).toHaveBeenCalledTimes(1);
});

test('omits custom identity, unstructured metadata and invalid build labels', () => {
  const f = fixture();
  f.context.appVersion = 'secret-app-value';
  f.context.buildNumber = 'email@example.com';
  expect(f.diagnostics.record({ ...f.event, appUserID: 'person@example.com', secret: 'appl_do_not_log' } as typeof f.event)).toBe(true);
  const line = f.sink.mock.calls[0][0] as string;
  expect(line).not.toMatch(/secret|example|appl_|rcIdSuffix|appVersion|buildNumber/);
});

test('stops at 100 local records without queues or retry timers', () => {
  const f = fixture();
  for (let i = 0; i < 110; i++) f.diagnostics.record(f.event);
  expect(f.sink).toHaveBeenCalledTimes(100);
});

test('context, clock and sink errors never escape', () => {
  const event = { kind: 'configured' as const, generation: 1 };
  const context: RevenueCatTestDiagnosticContext = { adsMode: 'test', revenueCatPermitted: true, generation: 1 };
  const fail = () => { throw new Error('diagnostic failure'); };
  expect(createRevenueCatTestDiagnostics(fail, jest.fn()).record(event)).toBe(false);
  expect(createRevenueCatTestDiagnostics(() => context, fail).record(event)).toBe(false);
  expect(createRevenueCatTestDiagnostics(() => context, jest.fn(), fail).record(event)).toBe(false);
});