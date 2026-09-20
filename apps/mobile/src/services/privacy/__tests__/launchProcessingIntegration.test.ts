const settle = async () => { for (let i = 0; i < 40; i++) await Promise.resolve(); };
const originalEnv = { ...process.env };
async function load(options: { offline?: boolean; age?: unknown; required?: boolean; country?: string; memory?: Map<string, string> } = {}) {
  jest.resetModules();
  process.env.EXPO_PUBLIC_ADS_MODE = 'test'; process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY = 'appl_test_only';
  const memory = options.memory ?? new Map<string, string>();
  const storage = { getItem: jest.fn(async (key: string) => memory.get(key) ?? null), setItem: jest.fn(async (key: string, value: string) => { memory.set(key, value); }), removeItem: jest.fn(async (key: string) => { memory.delete(key); }) };
  jest.doMock('@react-native-async-storage/async-storage', () => storage);
  const listeners = new Set<(value: string) => void>(); const fence = jest.fn().mockResolvedValue(true);
  const appState = { currentState: 'active', addEventListener: jest.fn((_event, listener) => { listeners.add(listener); return { remove: () => listeners.delete(listener) }; }) };
  const alert = jest.fn((_title, _body, buttons) => buttons.find((button: { text: string }) => button.text === 'Continue')?.onPress());
  jest.doMock('react-native', () => ({ Alert: { alert }, AppState: appState, Platform: { OS: 'ios', Version: '26.6' }, TurboModuleRegistry: { get: () => null }, NativeModules: { RNPurchases: { flapFitSetProcessingAllowed: fence } } }));
  jest.doMock('expo-constants', () => ({ __esModule: true, default: { executionEnvironment: 'standalone', expoConfig: {} }, ExecutionEnvironment: { StoreClient: 'storeClient' } }));
  const requestAge = jest.fn().mockResolvedValue(options.age ?? { status: 'shared', lowerBound: 18, upperBound: null });
  jest.doMock('../../../../modules/flap-fit-age-range', () => ({ ...jest.requireActual('../../../../modules/flap-fit-age-range/src/gates'),
    getAppleAgeRequirements: jest.fn().mockResolvedValue({ status: 'available', ageRangeSupported: true, eligibility: options.required ?? false,
      regulatoryFeaturesSupported: true, regulatoryFeatures: [], compiledCapabilities: { ageRange: true, regionalEligibility: true, regulatoryFeatures: true, confirmedAssurance: true } }), requestAppleAgeRange: requestAge }));
  const nativeAds = { setRequestConfiguration: jest.fn().mockResolvedValue(undefined), initialize: jest.fn().mockResolvedValue(undefined) };
  const sdk = { default: () => nativeAds, AdsConsent: { requestInfoUpdate: jest.fn().mockResolvedValue({ canRequestAds: true, privacyOptionsRequirementStatus: 'NOT_REQUIRED' }), loadAndShowConsentFormIfRequired: jest.fn().mockResolvedValue({ canRequestAds: true, privacyOptionsRequirementStatus: 'NOT_REQUIRED' }) }, AdsConsentPrivacyOptionsRequirementStatus: { REQUIRED: 'REQUIRED' }, MaxAdContentRating: { PG: 'PG' } };
  const purchases = { configure: jest.fn(), adTracker: {} };
  const adLoad = jest.fn(() => sdk), rcLoad = jest.fn(() => ({ default: purchases }));
  jest.doMock('react-native-google-mobile-ads', adLoad); jest.doMock('react-native-purchases', rcLoad);
  const fetcher = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>().mockResolvedValue({ ok: true, status: 200, redirected: false,
    url: 'https://flapfitapp.com/cdn-cgi/trace', headers: { get: (key: string) => key === 'content-type' ? 'text/plain' : null }, text: async () => 'h=flapfitapp.com\nloc=' + (options.country ?? 'US') + '\nip=192.0.2.9\n' } as unknown as Response);
  if (options.offline) fetcher.mockRejectedValue(new Error('offline'));
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'fetch'); Object.defineProperty(globalThis, 'fetch', { configurable: true, writable: true, value: fetcher });
  const access: typeof import('../processingAccess') = require('../processingAccess');
  const adapter: typeof import('../../monetization') = require('../../monetization');
  const startup: typeof import('../privacyStartup') = require('../privacyStartup');
  const country: typeof import('../privacyCountry') = require('../privacyCountry');
  const stop = startup.startPrivacyStartup(); await Promise.all([startup.preparePrivacyStartup(), country.refreshPrivacyCountry()]);
  return { access, adapter, country, requestAge, nativeAds, consent: sdk.AdsConsent, purchases, adLoad, rcLoad, storage, fence, memory, alert,
    change: (value: string) => { appState.currentState = value; [...listeners].forEach((listener) => listener(value)); },
    finish: () => { stop(); if (descriptor) Object.defineProperty(globalThis, 'fetch', descriptor); } };
}
afterEach(() => { process.env = { ...originalEnv }; });
test('real cold startup connects trusted country and native Apple before eligibility; only actual disclosure callback unlocks adult notice route', async () => {
  const f = await load(); try {
    await f.adapter.prepareMonetization(() => true); expect(f.requestAge).toHaveBeenCalledWith([13, 16, 18]);
    expect(f.access.getProcessingAccess().ads.reason).toBe('notice-needed'); expect(f.adLoad).not.toHaveBeenCalled(); expect(f.rcLoad).not.toHaveBeenCalled();
    // This is the explicit approved-visible-disclosure callback, not an inferred web notice.
    f.access.markProcessingNoticePresented(1); await f.adapter.prepareMonetization(() => true); await settle();
    expect(f.nativeAds.initialize).toHaveBeenCalledTimes(1); expect(f.purchases.configure).toHaveBeenCalledTimes(1);
    expect(f.access.getProcessingAccess()).toMatchObject({ ads: { allowed: true }, revenueCat: { allowed: true }, competition: { allowed: false } });
    expect(f.requestAge).toHaveBeenCalledTimes(1); expect(f.storage.setItem).not.toHaveBeenCalled();
    expect(JSON.stringify(f.access.getProcessingInputs())).not.toMatch(/lowerBound|upperBound|assurance|192\.0\.2/);
  } finally { f.finish(); }
});
test('analytics refusal leaves separately permitted restricted advertising functioning', async () => {
  const f = await load(); try {
    await f.access.setProcessingChoice('analytics', 'denied'); f.access.markProcessingNoticePresented(1);
    await f.adapter.prepareMonetization(() => true); await settle();
    expect(f.nativeAds.initialize).toHaveBeenCalledTimes(1); expect(f.purchases.configure).not.toHaveBeenCalled();
    expect(f.access.getProcessingAccess().revenueCat.reason).toBe('refused'); expect(f.access.getProcessingAccess().ads.allowed).toBe(true);
  } finally { f.finish(); }
});
test.each([{ offline: true }, { age: { status: 'declined' } }])('unknown country or age %j cannot initialize SDKs', async (options) => {
  const f = await load(options); try {
    f.access.markProcessingNoticePresented(1); await f.adapter.prepareMonetization(() => true); await settle();
    expect(f.adLoad).not.toHaveBeenCalled(); expect(f.purchases.configure).not.toHaveBeenCalled(); expect(f.access.getProcessingAccess().ads.allowed).toBe(false);
    await f.adapter.prepareMonetization(() => true); expect(f.requestAge.mock.calls.length).toBeLessThanOrEqual(1);
  } finally { f.finish(); }
});
test('same-country foreground reuses verified plan while background immediately stops processing and preserves withdrawal', async () => {
  const f = await load(); try {
    f.access.markProcessingNoticePresented(1); await f.adapter.prepareMonetization(() => true); await settle();
    f.change('background'); expect(f.access.getProcessingAccess().ads.allowed).toBe(false); expect(f.access.getProcessingAccess().revenueCat.allowed).toBe(false);
    expect(f.access.getProcessingInputs().verification?.mandatoryCheckSatisfied).toBe(true);
    await f.access.setProcessingChoice('analytics', 'denied'); f.change('active'); await f.country.refreshPrivacyCountry();
    await f.adapter.prepareMonetization(() => true); await settle();
    expect(f.requestAge).toHaveBeenCalledTimes(1); expect(f.access.getProcessingAccess().ads.allowed).toBe(true); expect(f.access.getProcessingAccess().revenueCat.reason).toBe('refused');
  } finally { f.finish(); }
});
test('game entry cancels queued native privacy presentation without changing gameplay', async () => {
  const f = await load(); try {
    const preparing = f.adapter.prepareMonetization(() => true); await f.adapter.settlePrivacyBeforeGameplay(); await preparing;
    expect(f.requestAge).not.toHaveBeenCalled(); expect(f.nativeAds.initialize).not.toHaveBeenCalled();
  } finally { f.finish(); }
});

test('a refused required country-specific Apple request never falls back to a second system sheet', async () => {
  const f = await load({ required: true, age: { status: 'declined' } }); try {
    await f.adapter.prepareMonetization(() => true); await f.adapter.prepareMonetization(() => true);
    expect(f.requestAge).toHaveBeenCalledTimes(1); expect(f.access.getProcessingAccess().ads.allowed).toBe(false);
  } finally { f.finish(); }
});
test('a stale background age response does not consume the fresh same-country attempt', async () => {
  const f = await load(); try {
    let resolve!: (value: unknown) => void;
    f.requestAge.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    const first = f.adapter.prepareMonetization(() => true); await settle(); expect(f.requestAge).toHaveBeenCalledTimes(1);
    f.change('background'); resolve({ status: 'shared', lowerBound: 18, upperBound: null }); await first;
    expect(f.access.getProcessingInputs().verification).toBeNull();
    f.change('active'); await f.country.refreshPrivacyCountry(); await f.adapter.prepareMonetization(() => true);
    expect(f.requestAge).toHaveBeenCalledTimes(2); expect(f.access.getProcessingInputs().verification?.mandatoryCheckSatisfied).toBe(true);
  } finally { f.finish(); }
});

test('a fresh lobby caller joining an old native sheet recovers after foreground returns before the old response', async () => {
  const f = await load(); try {
    let resolve!: (value: unknown) => void;
    f.requestAge.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    const first = f.adapter.prepareMonetization(() => true); await settle(); expect(f.requestAge).toHaveBeenCalledTimes(1);
    f.change('background'); f.change('active'); await f.country.refreshPrivacyCountry();
    const fresh = f.adapter.prepareMonetization(() => true);
    resolve({ status: 'shared', lowerBound: 18, upperBound: null }); await Promise.all([first, fresh]);
    expect(f.requestAge).toHaveBeenCalledTimes(2); expect(f.access.getProcessingInputs().verification?.mandatoryCheckSatisfied).toBe(true);
  } finally { f.finish(); }
});

test('first-play preparation requests no optional age, advertising, or reporting permission', async () => {
  const f = await load(); try {
    await f.adapter.prepareMonetization(() => true, { requiredOnly: true });
    expect(f.requestAge).not.toHaveBeenCalled();
    expect(f.adLoad).not.toHaveBeenCalled();
    expect(f.rcLoad).not.toHaveBeenCalled();
    expect(f.alert).not.toHaveBeenCalled();
  } finally { f.finish(); }
});
test('a genuine required Apple check remains before play without starting optional SDKs', async () => {
  const f = await load({ required: true }); try {
    await f.adapter.prepareMonetization(() => true, { requiredOnly: true });
    expect(f.requestAge).toHaveBeenCalledTimes(1);
    expect(f.adLoad).not.toHaveBeenCalled(); expect(f.rcLoad).not.toHaveBeenCalled();
  } finally { f.finish(); }
});
test.each(['US', 'AU', 'MX'])('%s adult post-game acknowledgement permits ads and reporting without repeated notices', async country => {
  const f = await load({ country }); try {
    const flow: typeof import('../postGamePrivacy') = require('../postGamePrivacy');
    const choices = jest.fn().mockResolvedValue(undefined);
    await flow.preparePostGamePrivacy(() => true, choices); await settle();
    expect(f.alert).toHaveBeenCalledTimes(1); expect(choices).not.toHaveBeenCalled();
    expect(f.nativeAds.initialize).toHaveBeenCalledTimes(1); expect(f.purchases.configure).toHaveBeenCalledTimes(1);
    await flow.preparePostGamePrivacy(() => true, choices); await settle();
    expect(f.alert).toHaveBeenCalledTimes(1); expect(f.nativeAds.initialize).toHaveBeenCalledTimes(1);
    expect(f.access.getProcessingAccess()).toMatchObject({ ads: { allowed: true }, revenueCat: { allowed: true }, competition: { allowed: false } });
    expect([...f.memory.values()].join('')).not.toMatch(/lowerBound|upperBound|192\.0\.2|exercise|score|country/);
  } finally { f.finish(); }
});
test('reporting refusal through Info survives relaunch while permitted Google ads initialize', async () => {
  let f = await load();
  const memory = f.memory;
  try {
    const notice: typeof import('../processingNotice') = require('../processingNotice');
    const flow: typeof import('../postGamePrivacy') = require('../postGamePrivacy');
    await notice.restoreProcessingNotice();
    await notice.refuseProcessingPurpose('analytics');
    await flow.preparePostGamePrivacy(() => true, jest.fn()); await settle();
    expect(f.nativeAds.initialize).toHaveBeenCalledTimes(1); expect(f.purchases.configure).not.toHaveBeenCalled();
    expect(f.access.getProcessingInputs().choices.ads.decision).toBe('unset');
  } finally { f.finish(); }
  f = await load({ memory });
  try {
    const flow: typeof import('../postGamePrivacy') = require('../postGamePrivacy');
    await flow.preparePostGamePrivacy(() => true, jest.fn()); await settle();
    expect(f.alert).not.toHaveBeenCalled();
    expect(f.nativeAds.initialize).toHaveBeenCalledTimes(1); expect(f.purchases.configure).not.toHaveBeenCalled();
    expect(f.access.getProcessingAccess()).toMatchObject({ ads: { allowed: true }, revenueCat: { allowed: false, reason: 'refused' } });
  } finally { f.finish(); }
});
test('Canadian activation is purpose-specific and can allow ads with reporting refused', async () => {
  const f = await load({ country: 'CA' }); try {
    const flow: typeof import('../postGamePrivacy') = require('../postGamePrivacy');
    const notice: typeof import('../processingNotice') = require('../processingNotice');
    const choices = jest.fn(async () => {
      await notice.refuseProcessingPurpose('analytics');
      await notice.allowProcessingPurpose('ads');
      expect(f.nativeAds.initialize).not.toHaveBeenCalled();
      await notice.acknowledgeProcessingNotice();
    });
    await flow.preparePostGamePrivacy(() => true, choices); await settle();
    expect(f.access.getProcessingInputs().launch).toMatchObject({ country: 'CA', plan: { ageEligibility: 'allowed' } });
    expect(choices).toHaveBeenCalledTimes(1); expect(f.alert).not.toHaveBeenCalled();
    expect(f.nativeAds.initialize).toHaveBeenCalledTimes(1); expect(f.purchases.configure).not.toHaveBeenCalled();
    expect(f.access.getProcessingAccess()).toMatchObject({ ads: { allowed: true }, revenueCat: { allowed: false } });
    await flow.preparePostGamePrivacy(() => true, choices);
    expect(choices).toHaveBeenCalledTimes(1);
  } finally { f.finish(); }
});
test.each([{ offline: true }, { age: { status: 'declined' } }])('post-game unknown evidence %j grants nothing and shows no misleading consent request', async options => {
  const f = await load(options); try {
    const flow: typeof import('../postGamePrivacy') = require('../postGamePrivacy'); const choices = jest.fn();
    await flow.preparePostGamePrivacy(() => true, choices);
    expect(f.adLoad).not.toHaveBeenCalled(); expect(f.rcLoad).not.toHaveBeenCalled();
    expect(f.alert).not.toHaveBeenCalled(); expect(choices).not.toHaveBeenCalled();
  } finally { f.finish(); }
});
test('a stale post-game alert response cannot acknowledge the notice or initialize providers', async () => {
  const f = await load(); try {
    const flow: typeof import('../postGamePrivacy') = require('../postGamePrivacy');
    const notice: typeof import('../processingNotice') = require('../processingNotice');
    let respond: (() => void) | undefined; let current = true;
    f.alert.mockImplementationOnce((_title, _body, buttons) => { respond = buttons.find((button: { text: string }) => button.text === 'Continue').onPress; });
    const pending = flow.preparePostGamePrivacy(() => current, jest.fn());
    for (let i = 0; i < 8 && !respond; ++i) await settle();
    expect(respond).toBeDefined(); current = false; respond!(); await pending;
    expect(notice.isProcessingNoticeAcknowledged()).toBe(false);
    expect(f.adLoad).not.toHaveBeenCalled(); expect(f.rcLoad).not.toHaveBeenCalled();
  } finally { f.finish(); }
});


test('saved reporting refusal survives an unrelated failed competition save and restart', async () => {
  let f = await load();
  const memory = f.memory;
  try {
    const notice: typeof import('../processingNotice') = require('../processingNotice');
    const flow: typeof import('../postGamePrivacy') = require('../postGamePrivacy');
    await notice.restoreProcessingNotice();
    await notice.refuseProcessingPurpose('analytics');
    await f.access.setProcessingChoice('competition', 'granted');
    await flow.preparePostGamePrivacy(() => true, jest.fn()); await settle();
    expect(notice.isProcessingNoticeAcknowledged()).toBe(true);
    f.storage.setItem.mockRejectedValueOnce(new Error('unrelated competition write failed'));
    await expect(f.access.setProcessingChoice('competition', 'granted')).rejects.toThrow('unrelated competition write failed');
    expect(f.access.getProcessingAccess().ads.allowed).toBe(true);
  } finally { f.finish(); }
  f = await load({ memory });
  try {
    const flow: typeof import('../postGamePrivacy') = require('../postGamePrivacy');
    await flow.preparePostGamePrivacy(() => true, jest.fn()); await settle();
    expect(f.alert).not.toHaveBeenCalled();
    expect(f.access.getProcessingAccess()).toMatchObject({
      ads: { allowed: true }, revenueCat: { allowed: false, reason: 'refused' }, competition: { allowed: true },
    });
    expect(f.nativeAds.initialize).toHaveBeenCalledTimes(1);
    expect(f.rcLoad).not.toHaveBeenCalled();
    expect(f.purchases.configure).not.toHaveBeenCalled();
  } finally { f.finish(); }
});


test.each([false, true])('Google presentation waits for privacy dismissal; backgrounded=%s', async backgrounded => {
  const f = await load({ country: 'CA' });
  try {
    const notice: typeof import('../processingNotice') = require('../processingNotice');
    const flow: typeof import('../postGamePrivacy') = require('../postGamePrivacy');
    let dismissed!: () => void;
    const nativeDismissal = new Promise<void>(resolve => { dismissed = resolve; });
    const choices = jest.fn(async () => {
      await notice.allowProcessingPurpose('ads');
      await notice.refuseProcessingPurpose('analytics');
      await notice.acknowledgeProcessingNotice();
      await nativeDismissal;
    });
    let active = true;
    const preparing = flow.preparePostGamePrivacy(() => active, choices);
    for (let i = 0; i < 8; ++i) await settle();
    expect(choices).toHaveBeenCalledTimes(1);
    expect(f.consent.loadAndShowConsentFormIfRequired).not.toHaveBeenCalled();
    expect(f.nativeAds.initialize).not.toHaveBeenCalled();
    if (backgrounded) { active = false; f.change('background'); }
    dismissed(); await preparing; await settle();
    if (backgrounded) {
      expect(f.consent.loadAndShowConsentFormIfRequired).not.toHaveBeenCalled();
      active = true; f.change('active'); await f.country.refreshPrivacyCountry();
      await flow.preparePostGamePrivacy(() => active, choices); await settle();
    }
    expect(f.consent.loadAndShowConsentFormIfRequired).toHaveBeenCalledTimes(1);
    expect(f.nativeAds.initialize).toHaveBeenCalledTimes(1);
    expect(f.purchases.configure).not.toHaveBeenCalled();
    expect(choices).toHaveBeenCalledTimes(1);
  } finally { f.finish(); }
});

test('US teen result flow resolves residency and independent consent in one sheet before Google presentation', async () => {
  const f=await load({age:{status:'shared',lowerBound:13,upperBound:15}});
  try {
    const flow: typeof import('../postGamePrivacy')=require('../postGamePrivacy');
    const notice: typeof import('../processingNotice')=require('../processingNotice');
    const regional: typeof import('../regionalClarification')=require('../regionalClarification');
    const choices=jest.fn(async () => {
      expect(regional.needsConnecticutClarification()).toBe(true);
      await regional.saveConnecticutResidency('not-resident');
      expect(f.nativeAds.initialize).not.toHaveBeenCalled(); expect(f.rcLoad).not.toHaveBeenCalled();
      await notice.allowProcessingPurpose('ads'); await notice.refuseProcessingPurpose('analytics');
      await notice.acknowledgeProcessingNotice();
      expect(f.consent.loadAndShowConsentFormIfRequired).not.toHaveBeenCalled();
    });
    await flow.preparePostGamePrivacy(() => true,choices); await settle();
    expect(choices).toHaveBeenCalledTimes(1); expect(f.alert).not.toHaveBeenCalled();
    expect(f.nativeAds.initialize).toHaveBeenCalledTimes(1); expect(f.rcLoad).not.toHaveBeenCalled();
    expect(f.nativeAds.setRequestConfiguration).toHaveBeenCalledWith(expect.objectContaining({ageRestrictedTreatment:'teen'}));
    await flow.preparePostGamePrivacy(() => true,choices);
    expect(choices).toHaveBeenCalledTimes(1);
  } finally {f.finish();}
});
test('closing the US teen clarification continues locally without recurring prompts or SDK initialization', async () => {
  const f=await load({age:{status:'shared',lowerBound:13,upperBound:15}});
  try {
    const flow: typeof import('../postGamePrivacy')=require('../postGamePrivacy');
    const choices=jest.fn().mockResolvedValue(undefined);
    await flow.preparePostGamePrivacy(() => true,choices); await flow.preparePostGamePrivacy(() => true,choices);
    expect(choices).toHaveBeenCalledTimes(1); expect(f.nativeAds.initialize).not.toHaveBeenCalled(); expect(f.rcLoad).not.toHaveBeenCalled();
  } finally {f.finish();}
});


test.each([
  {country:'AU',lowerBound:15,upperBound:17,gates:[13,15,18]},
  {country:'CA',lowerBound:14,upperBound:15,gates:[14,16,18]},
])('$country eligible teen: independent choices, withdrawal and restart use the production coordinator', async scenario => {
  const age={status:'shared',lowerBound:scenario.lowerBound,upperBound:scenario.upperBound};
  let f=await load({country:scenario.country,age}); const memory=f.memory;
  try {
    const flow: typeof import('../postGamePrivacy')=require('../postGamePrivacy');
    const notice: typeof import('../processingNotice')=require('../processingNotice');
    const rights: typeof import('../privacyRights')=require('../privacyRights');
    const choices=jest.fn(async () => {
      await notice.allowProcessingPurpose('ads'); await notice.allowProcessingPurpose('analytics');
      await notice.acknowledgeProcessingNotice();
    });
    await flow.preparePostGamePrivacy(() => true,choices); await settle();
    expect(f.requestAge).toHaveBeenCalledWith(scenario.gates);
    expect(choices).toHaveBeenCalledTimes(1); expect(f.alert).not.toHaveBeenCalled();
    expect(f.nativeAds.setRequestConfiguration).toHaveBeenCalledWith(expect.objectContaining({ageRestrictedTreatment:'teen'}));
    expect(f.consent.requestInfoUpdate).toHaveBeenCalledWith(expect.objectContaining({tagForUnderAgeOfConsent:false}));
    expect(f.purchases.configure).toHaveBeenCalledTimes(1);
    expect(f.access.getProcessingAccess()).toMatchObject({ads:{allowed:true},revenueCat:{allowed:true}});
    const outcome=await rights.withdrawAdPerformanceReporting(); await settle();
    expect(outcome).toMatchObject({status:'completed',saved:true,nativeStopped:true});
    expect(f.access.getProcessingAccess()).toMatchObject({ads:{allowed:true},revenueCat:{allowed:false}});
  } finally {f.finish();}
  f=await load({country:scenario.country,age,memory});
  try {
    const flow: typeof import('../postGamePrivacy')=require('../postGamePrivacy'); const choices=jest.fn();
    await flow.preparePostGamePrivacy(() => true,choices); await settle();
    expect(choices).not.toHaveBeenCalled(); expect(f.alert).not.toHaveBeenCalled();
    expect(f.nativeAds.initialize).toHaveBeenCalledTimes(1); expect(f.rcLoad).not.toHaveBeenCalled();
    expect(f.access.getProcessingAccess().revenueCat.reason).toBe('refused');
  } finally {f.finish();}
});

test.each([
  {country:'AU',lowerBound:13,upperBound:14,reason:'parent-permission-required'},
  {country:'MX',lowerBound:13,upperBound:15,reason:'parent-permission-required'},
  {country:'MX',lowerBound:16,upperBound:17,reason:'parent-permission-required'},
  {country:'CA',lowerBound:0,upperBound:13,reason:'age-unresolved'},
])('$country $lowerBound-$upperBound cannot turn a personal grant into verified authority', async scenario => {
  const f=await load({country:scenario.country,age:{status:'shared',lowerBound:scenario.lowerBound,upperBound:scenario.upperBound}});
  try {
    const flow: typeof import('../postGamePrivacy')=require('../postGamePrivacy');
    const notice: typeof import('../processingNotice')=require('../processingNotice'); const choices=jest.fn();
    for(const purpose of ['ads','analytics','competition'] as const) await f.access.setProcessingChoice(purpose,'granted');
    f.access.markProcessingNoticePresented(1);
    await flow.preparePostGamePrivacy(() => true,choices); await settle();
    expect(choices).not.toHaveBeenCalled(); expect(f.alert).not.toHaveBeenCalled();
    expect(f.adLoad).not.toHaveBeenCalled(); expect(f.rcLoad).not.toHaveBeenCalled();
    expect(notice.canChooseProcessingPurpose('ads')).toBe(false);
    expect(notice.canChooseProcessingPurpose('analytics')).toBe(false);
    expect(f.access.getProcessingAccess()).toMatchObject({ads:{allowed:false,reason:scenario.reason},revenueCat:{allowed:false,reason:scenario.reason},competition:{allowed:false,reason:scenario.reason}});
  } finally {f.finish();}
});

test.each(['US','CA','AU','MX'])('%s adult reporting refusal and competition permission persist independently across restart', async country => {
  let f=await load({country}); const memory=f.memory;
  try {
    const flow: typeof import('../postGamePrivacy')=require('../postGamePrivacy');
    const notice: typeof import('../processingNotice')=require('../processingNotice');
    await notice.refuseProcessingPurpose('analytics');
    await f.access.setProcessingChoice('competition','granted');
    const choices=jest.fn(async () => {await notice.allowProcessingPurpose('ads'); await notice.acknowledgeProcessingNotice();});
    await flow.preparePostGamePrivacy(() => true,choices); await settle();
    expect(f.access.getProcessingAccess()).toMatchObject({ads:{allowed:true},revenueCat:{allowed:false,reason:'refused'},competition:{allowed:true}});
    expect(f.rcLoad).not.toHaveBeenCalled();
  } finally {f.finish();}
  f=await load({country,memory});
  try {
    const flow: typeof import('../postGamePrivacy')=require('../postGamePrivacy'); const choices=jest.fn();
    await flow.preparePostGamePrivacy(() => true,choices); await settle();
    expect(choices).not.toHaveBeenCalled(); expect(f.alert).not.toHaveBeenCalled();
    expect(f.nativeAds.initialize).toHaveBeenCalledTimes(1); expect(f.rcLoad).not.toHaveBeenCalled();
    expect(f.access.getProcessingAccess()).toMatchObject({ads:{allowed:true},revenueCat:{allowed:false,reason:'refused'},competition:{allowed:true}});
  } finally {f.finish();}
});
