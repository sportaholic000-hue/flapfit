const settle = async () => { for (let i = 0; i < 40; i++) await Promise.resolve(); };
const originalEnv = { ...process.env };
async function load(options: { offline?: boolean; age?: unknown; required?: boolean } = {}) {
  jest.resetModules();
  process.env.EXPO_PUBLIC_ADS_MODE = 'test'; process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY = 'appl_test_only';
  const storage = { getItem: jest.fn().mockResolvedValue(null), setItem: jest.fn().mockResolvedValue(undefined), removeItem: jest.fn().mockResolvedValue(undefined) };
  jest.doMock('@react-native-async-storage/async-storage', () => storage);
  const listeners = new Set<(value: string) => void>(); const fence = jest.fn().mockResolvedValue(true);
  const appState = { currentState: 'active', addEventListener: jest.fn((_event, listener) => { listeners.add(listener); return { remove: () => listeners.delete(listener) }; }) };
  jest.doMock('react-native', () => ({ AppState: appState, Platform: { OS: 'ios', Version: '26.6' }, TurboModuleRegistry: { get: () => null }, NativeModules: { RNPurchases: { flapFitSetProcessingAllowed: fence } } }));
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
    url: 'https://flapfitapp.com/cdn-cgi/trace', headers: { get: (key: string) => key === 'content-type' ? 'text/plain' : null }, text: async () => 'h=flapfitapp.com\nloc=US\nip=192.0.2.9\n' } as unknown as Response);
  if (options.offline) fetcher.mockRejectedValue(new Error('offline'));
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'fetch'); Object.defineProperty(globalThis, 'fetch', { configurable: true, writable: true, value: fetcher });
  const access: typeof import('../processingAccess') = require('../processingAccess');
  const adapter: typeof import('../../monetization') = require('../../monetization');
  const startup: typeof import('../privacyStartup') = require('../privacyStartup');
  const country: typeof import('../privacyCountry') = require('../privacyCountry');
  const stop = startup.startPrivacyStartup(); await Promise.all([startup.preparePrivacyStartup(), country.refreshPrivacyCountry()]);
  return { access, adapter, country, requestAge, nativeAds, purchases, adLoad, rcLoad, storage, fence,
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
