const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
let api: typeof import('../privacyRights');
let inputs: { choices: Record<string, { decision: string }> };
let access: { revenueCat: { allowed: boolean }; ads: { allowed: boolean }; competition: { allowed: boolean } };
let save: jest.Mock;
let nativeLoad: jest.Mock;
let native: { getRevenueCatWithdrawalStatus: jest.Mock; settleRevenueCatWithdrawal: jest.Mock; retryRevenueCatWithdrawal: jest.Mock };
let setChoice: jest.Mock;
let choiceRevision = 0;
const tick = async () => { for (let i = 0; i < 12; ++i) await Promise.resolve(); };

beforeEach(() => {
  jest.resetModules();
  choiceRevision = 0;
  inputs = { choices: { analytics: { decision: 'granted' }, ads: { decision: 'granted' }, competition: { decision: 'granted' } } };
  access = { revenueCat: { allowed: true }, ads: { allowed: true }, competition: { allowed: true } };
  save = jest.fn().mockResolvedValue(undefined);
  setChoice = jest.fn((purpose: string, decision: string) => {
    ++choiceRevision;
    inputs.choices[purpose] = { decision };
    if (purpose === 'analytics') access.revenueCat.allowed = false;
    if (purpose === 'competition') access.competition.allowed = false;
    if (purpose === 'ads') access.ads.allowed = false;
    return save();
  });
  jest.doMock('../processingAccess', () => ({
    getProcessingInputs: () => inputs, getProcessingAccess: () => access,
    getProcessingChoiceRevision: () => choiceRevision,
    isProcessingChoiceCurrent: (_purpose: string, revision: number) => revision === choiceRevision,
    setProcessingChoice: (purpose: string, decision: string) => setChoice(purpose, decision),
  }));
  native = {
    getRevenueCatWithdrawalStatus: jest.fn(() => ({ state: 'pending', error: null })),
    settleRevenueCatWithdrawal: jest.fn().mockResolvedValue({ state: 'stopped', error: null }),
    retryRevenueCatWithdrawal: jest.fn().mockResolvedValue({ state: 'stopped', error: null }),
  };
  nativeLoad = jest.fn(() => native);
  jest.doMock('../../monetization', () => nativeLoad());
  api = require('../privacyRights');
});
afterEach(() => jest.useRealTimers());

test('settings retain withdrawal access while all processing is restricted and no SDK has loaded', () => {
  access = { revenueCat: { allowed: false }, ads: { allowed: false }, competition: { allowed: false } };
  expect(api.getPrivacyRights()).toEqual({
    canWithdrawReporting: true, reportingRefused: false, canStopCompetition: true, competitionStopped: false,
  });
  expect(nativeLoad).not.toHaveBeenCalled();
  expect(setChoice).not.toHaveBeenCalled();
});

test('reporting closes immediately, but completion waits for both persistence and native acknowledgement', async () => {
  const saving = deferred<void>(); const stopping = deferred<{ state: string; error: null }>();
  save.mockReturnValue(saving.promise);
  native.settleRevenueCatWithdrawal.mockReturnValue(stopping.promise);
  const action = api.withdrawAdPerformanceReporting();
  expect(access.revenueCat.allowed).toBe(false);
  expect(access.ads.allowed).toBe(true);
  expect(access.competition.allowed).toBe(true);
  const completed = jest.fn(); void action.then(completed);
  stopping.resolve({ state: 'stopped', error: null }); await tick();
  expect(completed).not.toHaveBeenCalled();
  saving.resolve();
  await expect(action).resolves.toEqual({ status: 'completed', saved: true, nativeStopped: true });
  expect(setChoice).toHaveBeenCalledWith('analytics', 'denied');
  expect(setChoice).toHaveBeenCalledTimes(1);
});

test.each(['pending', 'failed', 'not-requested'])('a native %s result is not a confirmed withdrawal', async (state) => {
  native.settleRevenueCatWithdrawal.mockResolvedValue({ state, error: null });
  await expect(api.withdrawAdPerformanceReporting()).resolves.toEqual({
    status: 'native-stop-unconfirmed', saved: true, nativeStopped: false,
  });
  expect(access.ads.allowed).toBe(true);
});

test('an earlier native failure is retried without re-enabling reporting', async () => {
  native.getRevenueCatWithdrawalStatus.mockReturnValue({ state: 'failed', error: 'stop failed' });
  await expect(api.withdrawAdPerformanceReporting()).resolves.toMatchObject({ status: 'completed' });
  expect(native.retryRevenueCatWithdrawal).toHaveBeenCalledTimes(1);
  expect(native.settleRevenueCatWithdrawal).not.toHaveBeenCalled();
  expect(access.revenueCat.allowed).toBe(false);
});

test('failed local persistence is not reported as a completed withdrawal', async () => {
  save.mockRejectedValue(new Error('storage failed'));
  await expect(api.withdrawAdPerformanceReporting()).resolves.toEqual({
    status: 'save-unconfirmed', saved: false, nativeStopped: true,
  });
});

test('a newer explicit grant supersedes the old withdrawal result', async () => {
  const stopping = deferred<{ state: string; error: null }>();
  native.settleRevenueCatWithdrawal.mockReturnValue(stopping.promise);
  const action = api.withdrawAdPerformanceReporting(); await tick();
  inputs.choices.analytics = { decision: 'granted' };
  access.revenueCat.allowed = true;
  stopping.resolve({ state: 'stopped', error: null });
  await expect(action).resolves.toEqual({ status: 'superseded', saved: true, nativeStopped: false });
});

test('repeated taps share the same pending withdrawal', async () => {
  const saving = deferred<void>(); save.mockReturnValue(saving.promise);
  const first = api.withdrawAdPerformanceReporting();
  const second = api.withdrawAdPerformanceReporting();
  expect(first).toBe(second);
  expect(setChoice).toHaveBeenCalledTimes(1);
  saving.resolve(); await first;
});

test('a hung native stop releases the settings action without claiming success', async () => {
  jest.useFakeTimers();
  const stopping = deferred<{ state: string; error: null }>();
  native.settleRevenueCatWithdrawal.mockReturnValue(stopping.promise);
  const action = api.withdrawAdPerformanceReporting(); await tick();
  jest.advanceTimersByTime(10_000);
  await expect(action).resolves.toEqual({ status: 'native-stop-unconfirmed', saved: true, nativeStopped: false });
  expect(access.revenueCat.allowed).toBe(false);
  await expect(api.withdrawAdPerformanceReporting()).resolves.toMatchObject({ status: 'completed' });
  expect(native.retryRevenueCatWithdrawal).toHaveBeenCalledTimes(1);
  stopping.resolve({ state: 'stopped', error: null }); await tick();
  expect(jest.getTimerCount()).toBe(0);
});

test('stopping competition touches only that purpose and never loads monetization', async () => {
  await expect(api.stopOnlineCompetition()).resolves.toEqual({ status: 'completed', saved: true, nativeStopped: false });
  expect(setChoice).toHaveBeenCalledWith('competition', 'denied');
  expect(setChoice).toHaveBeenCalledTimes(1);
  expect(nativeLoad).not.toHaveBeenCalled();
  expect(access.ads.allowed).toBe(true);
  expect(access.revenueCat.allowed).toBe(true);
});

test('unknown and refused states do not invent a grant or a universal advertising switch', () => {
  inputs.choices.analytics.decision = 'denied';
  inputs.choices.competition.decision = 'unset';
  access.revenueCat.allowed = false; access.competition.allowed = false;
  expect(api.getPrivacyRights()).toEqual({
    canWithdrawReporting: false, reportingRefused: true, canStopCompetition: false, competitionStopped: false,
  });
  expect(Object.keys(api).sort()).toEqual(['getAdvertisingWithdrawalState', 'getCompetitionStopState', 'getPrivacyRights', 'getReportingWithdrawalState', 'resetAdvertisingWithdrawalConfirmation', 'resetReportingWithdrawalConfirmation', 'stopOnlineCompetition', 'subscribeAdvertisingWithdrawal', 'subscribeCompetitionStop', 'subscribeReportingWithdrawal', 'withdrawAdPerformanceReporting', 'withdrawAdvertisingConsent']);
});

test('an intervening Allow intention prevents reusing an older pending Stop confirmation', async () => {
  const stopping = deferred<{state:string;error:null}>();
  native.settleRevenueCatWithdrawal.mockReturnValue(stopping.promise);
  const first = api.withdrawAdPerformanceReporting();await tick();
  // Real reservation is synchronous before notice/storage awaits.
  ++choiceRevision;
  const latest = api.withdrawAdPerformanceReporting();
  expect(latest).not.toBe(first);expect(setChoice).toHaveBeenCalledTimes(2);
  stopping.resolve({state:'stopped',error:null});
  await expect(latest).resolves.toMatchObject({status:'completed',saved:true,nativeStopped:true});
});

test('competition Stop reserves a new refusal after an intervening pending acceptance', async () => {
  const saving = deferred<void>(); save.mockReturnValue(saving.promise);
  const first = api.stopOnlineCompetition();
  ++choiceRevision; // Acceptance reserves its intent before its storage write.
  const latest = api.stopOnlineCompetition();
  expect(latest).not.toBe(first);
  expect(setChoice).toHaveBeenCalledTimes(2);
  saving.resolve();
  await expect(latest).resolves.toMatchObject({status:'completed',saved:true});
});

test('repeated competition Stop without a newer intent shares its pending save', async () => {
  const saving = deferred<void>(); save.mockReturnValue(saving.promise);
  const first = api.stopOnlineCompetition();
  expect(api.stopOnlineCompetition()).toBe(first);
  expect(setChoice).toHaveBeenCalledTimes(1);
  saving.resolve(); await first;
});

test('an older successful competition Stop cannot confirm a newer pending acceptance',async()=>{
  const saving=deferred<void>();save.mockReturnValue(saving.promise);
  const stopping=api.stopOnlineCompetition();
  ++choiceRevision;
  saving.resolve();
  await expect(stopping).resolves.toMatchObject({status:'superseded'});
});
test('competition save failure remains retryable without changing ads or reporting',async()=>{
  save.mockRejectedValueOnce(new Error('disk full'));
  await expect(api.stopOnlineCompetition()).resolves.toMatchObject({status:'save-unconfirmed',saved:false});
  await expect(api.stopOnlineCompetition()).resolves.toMatchObject({status:'completed',saved:true});
  expect(access.ads.allowed).toBe(true);expect(access.revenueCat.allowed).toBe(true);
});

test('advertising save timeout stays unconfirmed and retryable without changing competition or reporting',async()=>{
  jest.useFakeTimers();const saving=deferred<void>();save.mockReturnValueOnce(saving.promise);
  const first=api.withdrawAdvertisingConsent();
  expect(access.ads.allowed).toBe(false);
  expect(api.getAdvertisingWithdrawalState().status).toBe('pending');
  expect(api.withdrawAdvertisingConsent()).toBe(first);
  await jest.advanceTimersByTimeAsync(10_000);
  await expect(first).resolves.toEqual({status:'save-unconfirmed',saved:false});
  expect(api.getAdvertisingWithdrawalState().status).toBe('save-unconfirmed');
  saving.resolve();await tick();
  // A late write cannot silently change the reported unconfirmed state.
  expect(api.getAdvertisingWithdrawalState().status).toBe('save-unconfirmed');
  await expect(api.withdrawAdvertisingConsent()).resolves.toEqual({status:'completed',saved:true});
  expect(access.competition.allowed).toBe(true);expect(access.revenueCat.allowed).toBe(true);
  expect(nativeLoad).not.toHaveBeenCalled();expect(jest.getTimerCount()).toBe(0);
});
test('advertising Stop does not reuse an older pending Stop after an intervening Allow intent',async()=>{
  const saving=deferred<void>();save.mockReturnValue(saving.promise);
  const first=api.withdrawAdvertisingConsent();++choiceRevision;
  const latest=api.withdrawAdvertisingConsent();expect(latest).not.toBe(first);
  saving.resolve();
  await expect(first).resolves.toMatchObject({status:'superseded'});
  await expect(latest).resolves.toMatchObject({status:'completed',saved:true});
  expect(api.getAdvertisingWithdrawalState().status).toBe('completed');
});
