const settle = async () => { for (let i = 0; i < 40; i++) await Promise.resolve(); };
const originalEnv = { ...process.env };
async function load(options: { offline?: boolean; unsupported?: boolean; age?: unknown; required?: boolean; country?: string; memory?: Map<string, string>; quebecResidency?: 'resident' | 'not-resident' } = {}) {
  jest.resetModules();
  process.env.EXPO_PUBLIC_ADS_MODE = 'test'; process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY = 'appl_test_only';
  const memory = options.memory ?? new Map<string, string>();
  if (options.quebecResidency) memory.set('@flapfit/quebec-residency-v1',JSON.stringify({version:1,answer:options.quebecResidency}));
  const storage = { getItem: jest.fn(async (key: string) => memory.get(key) ?? null), setItem: jest.fn(async (key: string, value: string) => { memory.set(key, value); }), removeItem: jest.fn(async (key: string) => { memory.delete(key); }) };
  jest.doMock('@react-native-async-storage/async-storage', () => storage);
  const listeners = new Set<(value: string) => void>(); const fence = jest.fn().mockResolvedValue(true);
  const appState = { currentState: 'active', addEventListener: jest.fn((_event, listener) => { listeners.add(listener); return { remove: () => listeners.delete(listener) }; }) };
  const alert = jest.fn((_title, _body, buttons) => buttons.find((button: { text: string }) => button.text === 'Continue')?.onPress());
  jest.doMock('react-native', () => ({ Alert: { alert }, AppState: appState, Platform: { OS: 'ios', Version: options.unsupported ? '16.4' : '26.6' }, TurboModuleRegistry: { get: () => null }, NativeModules: { RNPurchases: { flapFitSetProcessingAllowed: fence } } }));
  jest.doMock('expo-constants', () => ({ __esModule: true, default: { executionEnvironment: 'standalone', expoConfig: {} }, ExecutionEnvironment: { StoreClient: 'storeClient' } }));
  const requestAge = jest.fn().mockResolvedValue(options.age ?? { status: 'shared', lowerBound: 18, upperBound: null });
  jest.doMock('../../../../modules/flap-fit-age-range', () => ({ ...jest.requireActual('../../../../modules/flap-fit-age-range/src/gates'),
    getAppleAgeRequirements: jest.fn().mockResolvedValue({ status: options.unsupported ? 'unsupported' : 'available', ageRangeSupported: !options.unsupported, eligibility: options.required ?? false,
      regulatoryFeaturesSupported: true, regulatoryFeatures: [], compiledCapabilities: { ageRange: true, regionalEligibility: true, regulatoryFeatures: true, confirmedAssurance: true } }), requestAppleAgeRange: requestAge }));
  const nativeAds = { setRequestConfiguration: jest.fn().mockResolvedValue(undefined), initialize: jest.fn().mockResolvedValue(undefined) };
  const events = new Map<string, (value?: unknown) => void>();
  const nativeAd = { load: jest.fn(), show: jest.fn().mockResolvedValue(undefined), destroy: jest.fn(),
    addAdEventListener: jest.fn((name, listener) => { events.set(name, listener); return jest.fn(); }) };
  const interstitial = { createForAdRequest: jest.fn(() => nativeAd) };
  const sdk = { InterstitialAd: interstitial, TestIds: { INTERSTITIAL: 'test-interstitial' },
    AdEventType: { LOADED:'loaded', OPENED:'opened', CLICKED:'clicked', PAID:'paid', ERROR:'error', CLOSED:'closed' },
    default: () => nativeAds, AdsConsent: { requestInfoUpdate: jest.fn().mockResolvedValue({ canRequestAds: true, privacyOptionsRequirementStatus: 'NOT_REQUIRED' }), loadAndShowConsentFormIfRequired: jest.fn().mockResolvedValue({ canRequestAds: true, privacyOptionsRequirementStatus: 'NOT_REQUIRED' }) }, AdsConsentPrivacyOptionsRequirementStatus: { REQUIRED: 'REQUIRED' }, MaxAdContentRating: { PG: 'PG' } };
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
  return { access, adapter, country, requestAge, nativeAds, nativeAd, events, interstitial, consent: sdk.AdsConsent, purchases, adLoad, rcLoad, storage, fence, memory, alert,
    change: (value: string) => { appState.currentState = value; [...listeners].forEach((listener) => listener(value)); },
    finish: () => { stop(); if (descriptor) Object.defineProperty(globalThis, 'fetch', descriptor); } };
}
afterEach(() => { process.env = { ...originalEnv }; });

test.each([['AU', 13], ['MX', 17]] as const)('%s age %s can keep playing without starting advertising providers', async (country, lowerBound) => {
  const f = await load({ country, age: { status: 'shared', lowerBound, upperBound: 17 } });
  try {
    const flow: typeof import('../postGamePrivacy') = require('../postGamePrivacy');
    const entry: typeof import('../gameEntry') = require('../gameEntry');
    await flow.preparePostGamePrivacy(() => true, jest.fn()); await settle();
    expect(await entry.authorizeGameEntry()).toEqual({ status: 'available' });
    expect(await entry.authorizeGameEntry()).toEqual({ status: 'available' });
    expect(f.nativeAds.initialize).not.toHaveBeenCalled();
    expect(f.purchases.configure).not.toHaveBeenCalled();
    expect(f.interstitial.createForAdRequest).not.toHaveBeenCalled();
    expect(f.nativeAd.show).not.toHaveBeenCalled();
  } finally { f.finish(); }
});

test('Quebec keeps gameplay with legacy grants, providers stay off and withdrawal survives restart', async () => {
  const memory = orderedMemory();
  let f = await load({ country: 'CA', quebecResidency: 'resident', memory });
  try {
    const notice: typeof import('../processingNotice') = require('../processingNotice');
    const flow: typeof import('../postGamePrivacy') = require('../postGamePrivacy');
    const choices = jest.fn();
    await flow.preparePostGamePrivacy(() => true, choices); await settle();
    expect(f.nativeAds.initialize).not.toHaveBeenCalled(); expect(f.purchases.configure).not.toHaveBeenCalled();
    expect(f.alert).not.toHaveBeenCalled(); expect(choices).not.toHaveBeenCalled();
    expect(f.access.getProcessingAccess().ads.reason).toBe('regional-advertising-disabled');
    const entry: typeof import('../gameEntry') = require('../gameEntry');
    expect(await entry.authorizeGameEntry()).toEqual({status:'available'});
    expect(f.interstitial.createForAdRequest).not.toHaveBeenCalled();
    f.access.setLaunchProcessingCountry('CA', false);
    await notice.refuseProcessingPurpose('ads');
    expect(JSON.parse(memory.get('@flapfit/processing-choices-v1')!).choices.ads.decision).toBe('denied');
  } finally { f.finish(); }
  f = await load({ country: 'CA', memory });
  try {
    await f.adapter.prepareMonetization(() => true); await settle();
    expect(f.access.getProcessingAccess().ads.reason).toBe('refused');
    expect(f.nativeAds.initialize).not.toHaveBeenCalled(); expect(f.purchases.configure).not.toHaveBeenCalled();
  } finally { f.finish(); }
});

test.each(['CT', 'NY'] as const)('%s minor can play while the result coordinator never initializes native ad or reporting SDKs', async region => {
  const f = await load({ age: { status: 'shared', lowerBound: 13, upperBound: 17 } });
  try {
    const regional: typeof import('../regionalClarification') = require('../regionalClarification');
    const ny: typeof import('../newYorkClarification') = require('../newYorkClarification');
    const notice: typeof import('../processingNotice') = require('../processingNotice');
    const flow: typeof import('../postGamePrivacy') = require('../postGamePrivacy');
    await flow.preparePostGamePrivacy(() => true, async () => {
      await regional.saveConnecticutResidency(region === 'CT' ? 'resident' : 'not-resident');
      if (region === 'NY') await ny.saveNewYorkPresence('present');
      await notice.acknowledgeProcessingNotice();
    }); await settle();
    expect(f.nativeAds.initialize).not.toHaveBeenCalled(); expect(f.purchases.configure).not.toHaveBeenCalled();
    expect(f.access.getProcessingAccess().ads.allowed).toBe(false);
    expect(f.access.getProcessingInputs().choices.ads.decision).toBe('unset');
    expect(f.access.getProcessingInputs().choices.analytics.decision).toBe('unset');
    const entry: typeof import('../gameEntry') = require('../gameEntry');
    expect(await entry.authorizeGameEntry()).toEqual({status:'available'});
    expect(f.interstitial.createForAdRequest).not.toHaveBeenCalled();
    expect(f.nativeAd.show).not.toHaveBeenCalled();
  } finally { f.finish(); }
});

test('a newly established New York context disposes a ready teen ad and stops reporting before any result ad can show', async () => {
  const f = await load({ age: { status: 'shared', lowerBound: 13, upperBound: 17 } });
  try {
    const regional: typeof import('../regionalClarification') = require('../regionalClarification');
    const ny: typeof import('../newYorkClarification') = require('../newYorkClarification');
    const notice: typeof import('../processingNotice') = require('../processingNotice');
    await f.adapter.prepareMonetization(() => true, { eligibilityOnly: true });
    await regional.saveConnecticutResidency('not-resident'); await ny.saveNewYorkPresence('not-present');
    await notice.acknowledgeProcessingNotice(); await f.adapter.prepareMonetization(() => true); await settle();
    expect(f.nativeAds.initialize).toHaveBeenCalledTimes(1); expect(f.purchases.configure).toHaveBeenCalledTimes(1);
    const ad = f.adapter.prepareResultInterstitial(); expect(ad).not.toBeNull();
    f.events.get('loaded')!(); expect(ad!.isReady()).toBe(true);
    await ny.saveNewYorkPresence('present'); await settle();
    expect(f.access.getProcessingAccess()).toMatchObject({ ads: { allowed: false }, revenueCat: { allowed: false } });
    expect(f.nativeAd.destroy).toHaveBeenCalled(); expect(f.nativeAd.show).not.toHaveBeenCalled();
    expect(ad!.isReady()).toBe(false);
    expect(f.fence).toHaveBeenLastCalledWith(false);
    const gate: typeof import('../gameEntry') = require('../gameEntry');
    expect(await gate.authorizeGameEntry()).toEqual({ status: 'available' });
  } finally { f.finish(); }
});

test.each(['@flapfit/processing-notice-v1', '@flapfit/processing-choices-v1'])('failed reporting Allow at %s preserves the previous refusal through actual configuration and restart', async failedKey => {
  const memory = orderedMemory(); let f = await load({ country: 'CA', quebecResidency: 'not-resident', memory });
  try {
    await f.adapter.prepareCompetitionEligibility(() => true);
    const notice: typeof import('../processingNotice') = require('../processingNotice');
    await notice.restoreProcessingNotice();
    let fail = true;
    f.storage.setItem.mockImplementation(async (key, value) => { if (key === failedKey && fail) { fail = false; throw new Error('write failed'); } memory.set(key, value); });
    await expect(notice.allowProcessingPurpose('analytics')).rejects.toThrow('write failed');
    await f.adapter.prepareMonetization(() => true); await settle();
    expect(f.purchases.configure).not.toHaveBeenCalled(); expect(f.nativeAds.initialize).toHaveBeenCalledTimes(1);
    expect(JSON.parse(memory.get('@flapfit/processing-choices-v1')!).choices.analytics.decision).toBe('denied');
  } finally { f.finish(); }
  f = await load({ country: 'CA', memory });
  try {
    const flow: typeof import('../postGamePrivacy') = require('../postGamePrivacy');
    await flow.preparePostGamePrivacy(() => true, jest.fn()); await settle();
    expect(f.purchases.configure).not.toHaveBeenCalled(); expect(f.nativeAds.initialize).toHaveBeenCalledTimes(1);
    expect(f.access.getProcessingAccess().revenueCat.reason).toBe('refused');
  } finally { f.finish(); }
});
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
test('Canadian regional clarification permits independent ads with reporting refused', async () => {
  const f = await load({ country: 'CA' }); try {
    const flow: typeof import('../postGamePrivacy') = require('../postGamePrivacy');
    const notice: typeof import('../processingNotice') = require('../processingNotice');
    const choices = jest.fn(async () => {
      await notice.refuseProcessingPurpose('analytics');
      await (require('../regionalClarification') as typeof import('../regionalClarification')).saveQuebecResidency('not-resident');
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
      await (require('../regionalClarification') as typeof import('../regionalClarification')).saveQuebecResidency('not-resident');
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

test('US teen result flow resolves residency and current location separately from consent in one sheet before Google presentation', async () => {
  const f=await load({age:{status:'shared',lowerBound:13,upperBound:15}});
  try {
    const flow: typeof import('../postGamePrivacy')=require('../postGamePrivacy');
    const notice: typeof import('../processingNotice')=require('../processingNotice');
    const regional: typeof import('../regionalClarification')=require('../regionalClarification');
    const choices=jest.fn(async () => {
      expect(regional.needsConnecticutClarification()).toBe(true);
      await regional.saveConnecticutResidency('not-resident');
      expect(f.nativeAds.initialize).not.toHaveBeenCalled(); expect(f.rcLoad).not.toHaveBeenCalled();
      await (require('../newYorkClarification') as typeof import('../newYorkClarification')).saveNewYorkPresence('not-present');
      expect(f.access.getProcessingInputs().choices.ads.decision).toBe('unset');
      await notice.refuseProcessingPurpose('analytics');
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
test('closing the US teen clarification does not complete the unanswered question or initialize SDKs', async () => {
  const f=await load({age:{status:'shared',lowerBound:13,upperBound:15}});
  try {
    const flow: typeof import('../postGamePrivacy')=require('../postGamePrivacy');
    const choices=jest.fn().mockResolvedValue(undefined);
    await flow.preparePostGamePrivacy(() => true,choices); await flow.preparePostGamePrivacy(() => true,choices);
    expect(choices).toHaveBeenCalledTimes(2); expect(f.nativeAds.initialize).not.toHaveBeenCalled(); expect(f.rcLoad).not.toHaveBeenCalled();
  } finally {f.finish();}
});


test.each([
  {country:'AU',lowerBound:15,upperBound:17,gates:[13,15,18]},
  {country:'CA',lowerBound:13,upperBound:15,gates:[13,16,18]},
])('$country eligible teen: independent choices, withdrawal and restart use the production coordinator', async scenario => {
  const age={status:'shared',lowerBound:scenario.lowerBound,upperBound:scenario.upperBound};
  let f=await load({country:scenario.country,age,quebecResidency:scenario.country==='CA'?'not-resident':undefined}); const memory=f.memory;
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
    expect(choices).not.toHaveBeenCalled(); expect(f.alert).toHaveBeenCalledTimes(1);
    expect(f.access.getProcessingInputs().choices.ads.decision).toBe('unset');
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
  let f=await load({country,quebecResidency:country==='CA'?'not-resident':undefined}); const memory=f.memory;
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

test.each(['US', 'CA', 'AU', 'MX'])('%s Compete can establish independent eligibility before any result or ad notice', async country => {
  const f = await load({ country });
  try {
    await f.access.setProcessingChoice('competition', 'granted');
    await f.adapter.prepareCompetitionEligibility(() => true); await settle();
    expect(f.requestAge).toHaveBeenCalledTimes(1);
    expect(f.access.getProcessingAccess()).toMatchObject({competition:{allowed:true},ads:{allowed:false},revenueCat:{allowed:false}});
    expect(f.access.getProcessingInputs().presentedNoticeVersion).toBeNull();
    expect(f.adLoad).not.toHaveBeenCalled(); expect(f.rcLoad).not.toHaveBeenCalled();
    expect(f.alert).not.toHaveBeenCalled();
    await f.adapter.prepareCompetitionEligibility(() => true);
    expect(f.requestAge).toHaveBeenCalledTimes(1);
    expect(f.access.getProcessingAccess().competition.allowed).toBe(true);
  } finally { f.finish(); }
});

test.each(['unset','denied'])('Compete eligibility does not request Apple evidence for %s competition choice', async decision => {
  const f = await load();
  try {
    if (decision === 'denied') await f.access.setProcessingChoice('competition','denied');
    await f.adapter.prepareCompetitionEligibility(() => true);
    expect(f.requestAge).not.toHaveBeenCalled(); expect(f.adLoad).not.toHaveBeenCalled(); expect(f.rcLoad).not.toHaveBeenCalled();
  } finally { f.finish(); }
});

test('leaving Compete for gameplay cancels a queued eligibility presentation', async () => {
  const f=await load();
  try {
    await f.access.setProcessingChoice('competition','granted');
    const pending=f.adapter.prepareCompetitionEligibility(() => true);
    await f.adapter.settlePrivacyBeforeGameplay(); await pending;
    expect(f.requestAge).not.toHaveBeenCalled(); expect(f.adLoad).not.toHaveBeenCalled(); expect(f.rcLoad).not.toHaveBeenCalled();
  } finally {f.finish();}
});

test.each([
  {country:'AU',lowerBound:13,upperBound:14},
  {country:'MX',lowerBound:13,upperBound:15},
  {country:'CA',lowerBound:13,upperBound:13},
])('$country regional under-consent threshold reaches the actual adapter without invented guardian permission', async scenario => {
  const f=await load({country:scenario.country,age:{status:'shared',lowerBound:scenario.lowerBound,upperBound:scenario.upperBound}});
  try {
    const flow: typeof import('../postGamePrivacy')=require('../postGamePrivacy');
    await flow.preparePostGamePrivacy(() => true,jest.fn()); await settle();
    expect(f.access.getProcessingAccess().ads).toMatchObject({allowed:false,treatment:'child',underAgeOfConsent:true});
    expect(f.nativeAds.initialize).not.toHaveBeenCalled(); expect(f.adLoad).not.toHaveBeenCalled();
    expect(f.consent.requestInfoUpdate).not.toHaveBeenCalled();
    expect(f.rcLoad).not.toHaveBeenCalled();
  } finally {f.finish();}
});

test('visiting Compete preserves an already verified plan and independently prepared ads', async () => {
  const f=await load();
  try {
    const flow:typeof import('../postGamePrivacy')=require('../postGamePrivacy');
    await flow.preparePostGamePrivacy(()=>true,jest.fn());await settle();
    await f.access.setProcessingChoice('competition','granted');
    const revision=f.access.getAgeVerificationRevision();
    await f.adapter.prepareCompetitionEligibility(()=>true);await settle();
    expect(f.access.getAgeVerificationRevision()).toBe(revision);
    expect(f.requestAge).toHaveBeenCalledTimes(1);
    expect(f.nativeAds.initialize).toHaveBeenCalledTimes(1);
    expect(f.adapter.isMonetizationPrepared()).toBe(true);
    expect(f.access.getProcessingAccess()).toMatchObject({ads:{allowed:true},revenueCat:{allowed:true},competition:{allowed:true}});
  }finally{f.finish();}
});


const orderedChoice = (decision: string) => ({ decision, noticeVersion: 1, decidedAt: null });
const orderedMemory = () => new Map([
  ['@flapfit/processing-choices-v1', JSON.stringify({ version: 1, region: 'unknown', choices: {
    ads: orderedChoice('granted'), analytics: orderedChoice('denied'), competition: orderedChoice('granted'),
  } })],
  ['@flapfit/processing-notice-v1', JSON.stringify({ version: 1, acknowledged: true, adsActivated: true, reportingActivated: false })],
]);

test.each(['allow-only', 'stop-only', 'allow-then-stop'] as const)('audit continuation: delayed notice %s respects action order through the real Canadian coordinator and RC configuration', async (order) => {
  const f = await load({ country: 'CA', memory: orderedMemory(), quebecResidency: 'not-resident' });
  let release!: (value: string | null) => void;
  const delayed = new Promise<string | null>(resolve => { release = resolve; });
  try {
    await f.adapter.prepareCompetitionEligibility(() => true);
    const notice: typeof import('../processingNotice') = require('../processingNotice');
    expect(notice.canChooseProcessingPurpose('analytics')).toBe(true);
    expect(notice.needsSeparatePurposeChoice('analytics')).toBe(false);
    expect(f.access.getProcessingInputs().choices.analytics.decision).toBe('denied');
    f.storage.getItem.mockImplementation(async key => key === '@flapfit/processing-notice-v1' ? delayed : f.memory.get(key) ?? null);
    const allowing = order !== 'stop-only' ? notice.allowProcessingPurpose('analytics') : notice.restoreProcessingNotice();
    await settle();
    if (order !== 'allow-only') await notice.refuseProcessingPurpose('analytics');
    release(f.memory.get('@flapfit/processing-notice-v1')!); await allowing;
    await f.adapter.prepareMonetization(() => true); await settle();
    const decision = order === 'allow-only' ? 'granted' : 'denied';
    expect(f.access.getProcessingInputs().choices.analytics.decision).toBe(decision);
    expect(JSON.parse(f.memory.get('@flapfit/processing-choices-v1')!).choices.analytics.decision).toBe(decision);
    expect(f.purchases.configure).toHaveBeenCalledTimes(order === 'allow-only' ? 1 : 0);
    expect(f.nativeAds.initialize).toHaveBeenCalledTimes(1);
    expect(f.access.getProcessingAccess().competition.allowed).toBe(true);
  } finally { release(null); f.finish(); }
});

test.each(['choice-write', 'notice-write'] as const)('audit continuation: newer Stop wins while older Allow waits at %s', async boundary => {
  const f = await load({ country: 'CA', memory: orderedMemory(), quebecResidency: 'not-resident' });
  let release!: () => void; const wait = new Promise<void>(resolve => { release = resolve; });
  let started!: () => void; const waiting = new Promise<void>(resolve => { started = resolve; });
  try {
    await f.adapter.prepareCompetitionEligibility(() => true);
    const notice: typeof import('../processingNotice') = require('../processingNotice');
    await notice.restoreProcessingNotice();
    let delayed = false;
    f.storage.setItem.mockImplementation(async (key,value) => {
      if (!delayed && key === (boundary === 'choice-write' ? '@flapfit/processing-choices-v1' : '@flapfit/processing-notice-v1')) {
        delayed = true; started(); await wait;
      }
      f.memory.set(key,value);
    });
    const allowing = notice.allowProcessingPurpose('analytics'); await waiting;
    const stopping = notice.refuseProcessingPurpose('analytics');
    expect(f.access.getProcessingInputs().choices.analytics.decision).toBe('denied');
    release(); await Promise.all([allowing,stopping]);
    await f.adapter.prepareMonetization(() => true); await settle();
    expect(f.access.getProcessingInputs().choices.analytics.decision).toBe('denied');
    expect(JSON.parse(f.memory.get('@flapfit/processing-choices-v1')!).choices.analytics.decision).toBe('denied');
    expect(f.purchases.configure).not.toHaveBeenCalled();
    expect(f.nativeAds.initialize).toHaveBeenCalledTimes(1);
    expect(f.access.getProcessingAccess().competition.allowed).toBe(true);
  } finally { release(); f.finish(); }
});

test('regional correction: real Canadian result path chooses outside Quebec and configures ads while reporting remains refused across restart', async () => {
  let f=await load({country:'CA'});const memory=f.memory;
  try {
    const flow:typeof import('../postGamePrivacy')=require('../postGamePrivacy');
    const regional:typeof import('../regionalClarification')=require('../regionalClarification');
    const notice:typeof import('../processingNotice')=require('../processingNotice');
    await notice.refuseProcessingPurpose('analytics');
    const choices=jest.fn(async()=>{
      expect(f.access.getProcessingInputs().launch?.plan?.quebecActivationRequired.ads).toBe(false);
      expect(notice.canChooseProcessingPurpose('ads')).toBe(false);
      await regional.saveQuebecResidency('not-resident');
      expect(notice.needsSeparatePurposeChoice('ads')).toBe(false);
      expect(f.access.getProcessingInputs().choices.ads.decision).toBe('unset');
      await notice.acknowledgeProcessingNotice();
      expect(f.consent.loadAndShowConsentFormIfRequired).not.toHaveBeenCalled();
    });
    await flow.preparePostGamePrivacy(()=>true,choices);await settle();
    expect(choices).toHaveBeenCalledTimes(1);
    expect(f.nativeAds.initialize).toHaveBeenCalledTimes(1);
    expect(f.purchases.configure).not.toHaveBeenCalled();
    expect(f.access.getProcessingAccess()).toMatchObject({ads:{allowed:true},revenueCat:{allowed:false,reason:'refused'}});
  } finally {f.finish();}
  f=await load({country:'CA',memory});
  try {
    const flow:typeof import('../postGamePrivacy')=require('../postGamePrivacy');const choices=jest.fn();
    await flow.preparePostGamePrivacy(()=>true,choices);await settle();
    expect(choices).not.toHaveBeenCalled();
    expect(f.nativeAds.initialize).toHaveBeenCalledTimes(1);
    expect(f.purchases.configure).not.toHaveBeenCalled();
  } finally {f.finish();}
});
test('regional correction: closing unanswered Canada clarification records nothing and never marks the question complete', async () => {
  const f=await load({country:'CA'});
  try {
    const flow:typeof import('../postGamePrivacy')=require('../postGamePrivacy');const choices=jest.fn().mockResolvedValue(undefined);
    await flow.preparePostGamePrivacy(()=>true,choices);await flow.preparePostGamePrivacy(()=>true,choices);
    expect(choices).toHaveBeenCalledTimes(2);
    expect(f.access.getProcessingInputs().launch?.options.quebecResidency).toBeUndefined();
    expect(f.access.getProcessingInputs().choices.ads.decision).toBe('unset');
    expect(f.access.getProcessingInputs().launch?.plan?.quebecActivationRequired.ads).toBe(false);
    expect(f.nativeAds.initialize).not.toHaveBeenCalled();expect(f.purchases.configure).not.toHaveBeenCalled();
  } finally {f.finish();}
});

test('non-Quebec adult with no ad grant receives a restricted result-exit ad while reporting stays refused', async () => {
  const f=await load({country:'CA',quebecResidency:'not-resident'});
  try {
    const notice:typeof import('../processingNotice')=require('../processingNotice');
    const flow:typeof import('../postGamePrivacy')=require('../postGamePrivacy');
    const {ResultAdGate}=require('../../monetization/resultAdGate');
    await notice.refuseProcessingPurpose('analytics');
    const choices=jest.fn();
    await flow.preparePostGamePrivacy(()=>true,choices);await settle();
    expect(choices).not.toHaveBeenCalled();
    expect(f.access.getProcessingInputs().choices.ads.decision).toBe('unset');
    const gate=new ResultAdGate();
    const environment={isActive:()=>true,onActive:jest.fn(()=>jest.fn())};
    const first=jest.fn();
    gate.createResult(null,environment).exit(false,first);
    expect(first).toHaveBeenCalledTimes(1);
    expect(f.nativeAd.show).not.toHaveBeenCalled();
    const ad=f.adapter.prepareResultInterstitial();
    expect(ad).not.toBeNull();
    expect(f.interstitial.createForAdRequest).toHaveBeenCalledWith('test-interstitial',
      {requestNonPersonalizedAdsOnly:true,networkExtras:{rdp:'1'}});
    expect(f.nativeAd.load).toHaveBeenCalledTimes(1);
    f.events.get('loaded')!();expect(ad!.isReady()).toBe(true);
    const nextGame=jest.fn();
    const result=gate.createResult(ad,environment);
    expect(f.nativeAd.show).not.toHaveBeenCalled();
    expect(result.exit(false,nextGame)).toBe(true);
    expect(f.nativeAd.show).toHaveBeenCalledTimes(1);
    f.events.get('opened')!();
    expect(nextGame).not.toHaveBeenCalled();
    f.events.get('closed')!();f.events.get('closed')!();
    expect(nextGame).toHaveBeenCalledTimes(1);
    expect(result.exit(false,nextGame)).toBe(false);
    expect(f.purchases.configure).not.toHaveBeenCalled();
    expect(f.access.getProcessingAccess().revenueCat.reason).toBe('refused');
  } finally {f.finish();}
});

test.each([false,true])('competition Stop/accept/Stop survives restart and blocks actual Auth/request boundary; Apple required=%s',async required=>{
  let f=await load({country:'CA',quebecResidency:'not-resident',required});
  const memory=f.memory;
  // Model an already-cleared Apple account check; the native age lookup remains real to this fixture.
  f.access.setAppleRescissionPending(false);
  const boundary=()=>{
    const createClient=jest.fn();
    jest.doMock('@supabase/supabase-js',()=>({createClient}));
    jest.doMock('react-native-url-polyfill/auto',()=>({}));
    jest.doMock('@/config/release',()=>({ONLINE_SERVICES:{supabaseUrl:'https://test.supabase.co',supabasePublishableKey:'public-test'}}));
    jest.doMock('@/utils/game/store',()=>({COMPETITION_TERMS_VERSION:1,useGameStore:{getState:()=>({competitionTermsVersion:1}),subscribe:()=>jest.fn()}}));
    jest.doMock('../appleRescission',()=>({
      ensureCurrentAppleRescissionStatus:jest.fn().mockResolvedValue({status:'no-revocation-recorded',revision:1}),
      getAppleRescissionStatus:()=>({status:'no-revocation-recorded',revision:1}),isAppleRescissionStatusFresh:()=>true,
      linkAppleRescissionToExistingAccount:jest.fn(),startAppleRescissionMonitoring:()=>jest.fn(),
    }));
    const api:typeof import('../../competitionApi')=jest.requireActual('../../competitionApi');
    return {api,createClient};
  };
  try {
    const notice:typeof import('../processingNotice')=require('../processingNotice');
    const flow:typeof import('../postGamePrivacy')=require('../postGamePrivacy');
    const rights:typeof import('../privacyRights')=require('../privacyRights');
    await notice.refuseProcessingPurpose('analytics');
    await flow.preparePostGamePrivacy(()=>true,jest.fn());
    await f.access.setProcessingChoice('competition','granted');
    expect(f.access.getProcessingAccess().competition.allowed).toBe(true);
    const network=boundary();
    let release!:()=>void;
    const saving=new Promise<void>(resolve=>{release=resolve;});
    const write=f.storage.setItem.getMockImplementation()!;
    f.storage.setItem.mockImplementationOnce(async(key,value)=>{await saving;await write(key,value);});
    const first=rights.stopOnlineCompetition();
    const accepting=f.access.setProcessingChoice('competition','granted');
    const latest=rights.stopOnlineCompetition();
    release();await Promise.all([first,accepting,latest]);
    expect(f.access.getProcessingAccess()).toMatchObject({ads:{allowed:true},revenueCat:{allowed:false},competition:{allowed:false}});
    (global.fetch as jest.Mock).mockClear();
    await expect(network.api.competitionRequest('/leaderboard')).rejects.toBeInstanceOf(network.api.CompetitionAccessRequiredError);
    await expect(network.api.beginCompetitionRun({kind:'leaderboard',exercise:'squats'})).rejects.toBeInstanceOf(network.api.CompetitionAccessRequiredError);
    expect(network.createClient).not.toHaveBeenCalled();expect(global.fetch).not.toHaveBeenCalled();
  } finally {f.finish();}
  f=await load({country:'CA',memory,required});
  f.access.setAppleRescissionPending(false);
  try {
    const flow:typeof import('../postGamePrivacy')=require('../postGamePrivacy');
    await flow.preparePostGamePrivacy(()=>true,jest.fn());
    await f.adapter.prepareCompetitionEligibility(()=>true);
    expect(f.access.getProcessingInputs().choices.competition.decision).toBe('denied');
    expect(f.access.getProcessingAccess().ads.allowed).toBe(true);
    expect(f.nativeAds.initialize).toHaveBeenCalledTimes(1);expect(f.purchases.configure).not.toHaveBeenCalled();
    const network=boundary();(global.fetch as jest.Mock).mockClear();
    await expect(network.api.competitionRequest('/leaderboard')).rejects.toBeInstanceOf(network.api.CompetitionAccessRequiredError);
    expect(network.createClient).not.toHaveBeenCalled();expect(global.fetch).not.toHaveBeenCalled();
  } finally {f.finish();}
});


test.each([false,true])('existing Canadian consent withdrawal survives lost eligibility, recovery and restart; failed first save=%s',async failSave=>{
  let f=await load({country:'CA',quebecResidency:'not-resident'});
  const memory=f.memory;
  try {
    let notice:typeof import('../processingNotice')=require('../processingNotice');
    await f.adapter.prepareCompetitionEligibility(()=>true);
    await notice.allowProcessingPurpose('ads');await notice.acknowledgeProcessingNotice();
    await f.access.setProcessingChoice('competition','granted');
    await notice.refuseProcessingPurpose('analytics');
    await f.adapter.prepareMonetization(()=>true);await settle();
    expect(f.nativeAds.initialize).toHaveBeenCalledTimes(1);
    const ad=f.adapter.prepareResultInterstitial();expect(ad).not.toBeNull();
    f.events.get('loaded')!();expect(ad!.isReady()).toBe(true);
    f.access.setLaunchProcessingCountry(null,false);
    expect(notice.canChooseProcessingPurpose('ads')).toBe(false);
    expect(f.nativeAd.destroy).toHaveBeenCalled();
    if(failSave)f.storage.setItem.mockRejectedValueOnce(new Error('disk full'));
    const stopping=notice.refuseProcessingPurpose('ads');
    expect(f.access.getProcessingAccess().ads.allowed).toBe(false);
    if(failSave){
      await expect(stopping).rejects.toThrow('save not confirmed');
      expect(JSON.parse(memory.get('@flapfit/processing-choices-v1')!).choices.ads.decision).toBe('granted');
      expect(notice.processingPurposeStatus('ads')).toContain('save not confirmed');
      await notice.refuseProcessingPurpose('ads');
    }else await stopping;
    expect(f.adapter.prepareResultInterstitial()).toBeNull();
    expect(f.nativeAd.show).not.toHaveBeenCalled();
    f.access.setLaunchProcessingCountry('CA',true);
    f.access.verifyLaunchAgeEvidence({source:'apple',status:'shared',lowerBound:18,upperBound:null},'CA',f.access.getAgeVerificationRevision());
    await f.adapter.prepareMonetization(()=>true);await settle();
    expect(f.access.getProcessingAccess()).toMatchObject({ads:{allowed:false,reason:'refused'},revenueCat:{allowed:false},competition:{allowed:true}});
    expect(f.interstitial.createForAdRequest).toHaveBeenCalledTimes(1);
    expect(JSON.parse(memory.get('@flapfit/processing-choices-v1')!).choices).toMatchObject({ads:{decision:'denied'},analytics:{decision:'denied'},competition:{decision:'granted'}});
  }finally{f.finish();}
  f=await load({country:'CA',memory});
  try{
    await f.adapter.prepareMonetization(()=>true);await settle();
    expect(f.access.getProcessingAccess()).toMatchObject({ads:{allowed:false,reason:'refused'},competition:{allowed:true}});
    expect(f.adLoad).not.toHaveBeenCalled();expect(f.purchases.configure).not.toHaveBeenCalled();
  }finally{f.finish();}
});

test('supported older iOS never fakes age or starts provider SDKs; it reports the actual compatibility limit',async()=>{
  const f=await load({unsupported:true});
  try{
    const notice:typeof import('../processingNotice')=require('../processingNotice');
    f.access.markProcessingNoticePresented(1);
    await f.access.setProcessingChoice('competition','granted');
    await f.adapter.prepareMonetization(()=>true);await f.adapter.prepareCompetitionEligibility(()=>true);
    expect(f.access.getProcessingInputs().appleRequirement).toBe('unsupported');
    expect(f.requestAge).not.toHaveBeenCalled();
    expect(f.adLoad).not.toHaveBeenCalled();expect(f.rcLoad).not.toHaveBeenCalled();
    expect(f.access.getProcessingAccess()).toMatchObject({ads:{allowed:false},revenueCat:{allowed:false},competition:{allowed:false}});
    expect(notice.processingPurposeStatus('ads')).toBe('');
  }finally{f.finish();}
});

test.each(['US','CA','AU','MX'])('older iOS %s adult reaches actual ads configuration after a local answer and notice, while reporting refusal survives restart',async country=>{
  let f=await load({unsupported:true,country,quebecResidency:country==='CA'?'not-resident':undefined});const memory=f.memory;
  try{
    await f.access.setProcessingChoice('analytics','denied');
    const local:typeof import('../localAgeAnswer')=require('../localAgeAnswer');
    const notice:typeof import('../processingNotice')=require('../processingNotice');
    await local.saveLocalAgeAnswer('18-plus');
    expect(f.access.getProcessingAccess().ads.allowed).toBe(false);
    await notice.acknowledgeProcessingNotice();
    await f.adapter.prepareMonetization(()=>true);await settle();
    expect(f.nativeAds.initialize).toHaveBeenCalledTimes(1);
    expect(f.purchases.configure).not.toHaveBeenCalled();expect(f.rcLoad).not.toHaveBeenCalled();
    expect(f.requestAge).not.toHaveBeenCalled();
    expect(f.access.getProcessingInputs().verification).toMatchObject({mandatoryCheckSatisfied:false,localCheckSatisfied:true});
    expect(f.access.getProcessingAccess()).toMatchObject({ads:{allowed:true},revenueCat:{reason:'refused'}});
  }finally{f.finish();}
  f=await load({unsupported:true,country,memory});
  try{
    const {preparePostGamePrivacy}:typeof import('../postGamePrivacy')=require('../postGamePrivacy');
    const open=jest.fn().mockResolvedValue(undefined);
    await preparePostGamePrivacy(()=>true,open);await settle();
    expect(open).not.toHaveBeenCalled();
    expect(f.nativeAds.initialize).toHaveBeenCalledTimes(1);
    expect(f.purchases.configure).not.toHaveBeenCalled();expect(f.requestAge).not.toHaveBeenCalled();
    expect(f.access.getProcessingAccess().revenueCat.reason).toBe('refused');
  }finally{f.finish();}
});

test('older iOS opens the existing post-game panel for missing age, and dismissal records no answer',async()=>{
  const f=await load({unsupported:true});
  try{
    const {preparePostGamePrivacy}:typeof import('../postGamePrivacy')=require('../postGamePrivacy');
    const open=jest.fn().mockResolvedValue(undefined);
    await preparePostGamePrivacy(()=>true,open);
    expect(open).toHaveBeenCalledTimes(1);
    expect(f.memory.has('@flapfit/local-age-answer-v1')).toBe(false);
    expect(f.adLoad).not.toHaveBeenCalled();expect(f.rcLoad).not.toHaveBeenCalled();
  }finally{f.finish();}
});

test('older-system adult uses real permitted RevenueCat configuration and restricted result-ad requests',async()=>{
  const f=await load({unsupported:true});
  try{
    const local:typeof import('../localAgeAnswer')=require('../localAgeAnswer');
    const notice:typeof import('../processingNotice')=require('../processingNotice');
    await local.saveLocalAgeAnswer('18-plus');await notice.acknowledgeProcessingNotice();
    await f.adapter.prepareMonetization(()=>true);await settle();
    expect(f.purchases.configure).toHaveBeenCalledTimes(1);
    expect(f.nativeAds.initialize).toHaveBeenCalledTimes(1);
    f.adapter.prepareResultInterstitial();
    expect(f.interstitial.createForAdRequest).toHaveBeenCalledWith('test-interstitial',expect.objectContaining({requestNonPersonalizedAdsOnly:true,networkExtras:{rdp:'1'}}));
    expect(JSON.stringify(f.purchases.configure.mock.calls)).not.toMatch(/18-plus|lowerBound|upperBound|self/);
  }finally{f.finish();}
});

test.each([{country:'US',answer:'under-13'},{country:'AU',answer:'13-14'},{country:'MX',answer:'13-17'}] as const)('local minor answer %j cannot be treated as adulthood or parental permission',async scenario=>{
  const f=await load({unsupported:true,country:scenario.country});
  try{
    const local:typeof import('../localAgeAnswer')=require('../localAgeAnswer');
    const notice:typeof import('../processingNotice')=require('../processingNotice');
    await local.saveLocalAgeAnswer(scenario.answer);await notice.acknowledgeProcessingNotice();
    await f.adapter.prepareMonetization(()=>true);await settle();
    expect(f.access.getProcessingAccess()).toMatchObject({ads:{allowed:false},revenueCat:{allowed:false},competition:{allowed:false}});
    expect(f.adLoad).not.toHaveBeenCalled();expect(f.rcLoad).not.toHaveBeenCalled();
    expect(f.access.getProcessingInputs().verification?.mandatoryCheckSatisfied).toBe(false);
  }finally{f.finish();}
});

test('advertising withdrawal changes only its purpose and an unrelated failed save cannot erase the saved refusal',async()=>{
  let f=await load({country:'CA',quebecResidency:'not-resident'});const memory=f.memory;
  try{
    const notice:typeof import('../processingNotice')=require('../processingNotice');
    await f.adapter.prepareCompetitionEligibility(()=>true);
    await notice.allowProcessingPurpose('ads');await notice.allowProcessingPurpose('analytics');
    await f.access.setProcessingChoice('competition','granted');await notice.acknowledgeProcessingNotice();
    await f.adapter.prepareMonetization(()=>true);await settle();
    expect(f.purchases.configure).toHaveBeenCalledTimes(1);expect(f.nativeAds.initialize).toHaveBeenCalledTimes(1);
    await notice.refuseProcessingPurpose('ads');
    expect(f.access.getProcessingAccess()).toMatchObject({ads:{allowed:false},revenueCat:{allowed:true},competition:{allowed:true}});
    f.storage.setItem.mockRejectedValueOnce(new Error('unrelated write failed'));
    await expect(f.access.setProcessingChoice('competition','denied')).rejects.toThrow();
    expect(JSON.parse(memory.get('@flapfit/processing-choices-v1')!).choices.ads.decision).toBe('denied');
  }finally{f.finish();}
  f=await load({country:'CA',memory});
  try{
    await f.adapter.prepareMonetization(()=>true);await settle();
    expect(f.access.getProcessingAccess().ads.reason).toBe('refused');
    expect(f.adLoad).not.toHaveBeenCalled();
  }finally{f.finish();}
});

test.each(['CA','US'] as const)('regional binary answers: dismissing %s clarification writes no regional fact, consent or refusal and remains unanswered after restart',async country=>{
  const age={status:'shared',lowerBound:country==='CA'?18:14,upperBound:country==='CA'?null:17};
  let f=await load({country,age});const memory=f.memory;
  try{
    const flow:typeof import('../postGamePrivacy')=require('../postGamePrivacy');
    await flow.preparePostGamePrivacy(()=>true,jest.fn().mockResolvedValue(undefined));
    expect(f.storage.setItem).not.toHaveBeenCalled();
    expect(f.access.getProcessingInputs().choices).toMatchObject({ads:{decision:'unset'},analytics:{decision:'unset'},competition:{decision:'unset'}});
    expect(f.access.getProcessingInputs().launch?.options[country==='CA'?'quebecResidency':'connecticutResidency']).toBeUndefined();
    expect(f.adLoad).not.toHaveBeenCalled();expect(f.rcLoad).not.toHaveBeenCalled();
  }finally{f.finish();}
  f=await load({country,age,memory});
  try{
    const flow:typeof import('../postGamePrivacy')=require('../postGamePrivacy');
    const choices=jest.fn().mockResolvedValue(undefined);
    await flow.preparePostGamePrivacy(()=>true,choices);
    expect(choices).toHaveBeenCalledTimes(1);
    expect(f.storage.setItem).not.toHaveBeenCalled();
    expect(f.access.getProcessingInputs().choices.ads.decision).toBe('unset');
  }finally{f.finish();}
});

const previewNotices: unknown[] = [];
afterAll(() => {
  const output = process.env.FLAPFIT_PRIVACY_PREVIEW_OUTPUT;
  if (output) require('node:fs').writeFileSync(require('node:path').join(require('node:path').dirname(output), 'notices.json'), JSON.stringify(previewNotices, null, 2) + '\n');
});
test.each(['CA', 'US', 'AU', 'MX'])('%s captures the actual shared post-game notice without describing age/location ad outcomes', async country => {
  const f = await load({ country, quebecResidency: country === 'CA' ? 'not-resident' : undefined });
  try {
    const flow: typeof import('../postGamePrivacy') = require('../postGamePrivacy');
    await flow.preparePostGamePrivacy(() => true, jest.fn());
    const notice = f.alert.mock.calls.find(call => call[0] === 'Ads keep Flap Fit free');
    expect(notice).toBeDefined();
    expect(notice![1]).not.toMatch(/Quebec|Connecticut|New York|Australia|Mexico|under 18|ads enabled|advertising off/i);
    previewNotices.push({ country, title: notice![0], body: notice![1], buttons: notice![2].map((button: { text: string }) => button.text) });
  } finally { f.finish(); }
});
