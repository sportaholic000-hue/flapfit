const originalEnv = { ...process.env };
function loadAdapter(options: { platform?: string; expoGo?: boolean; rcFails?: boolean } = {}) {
  jest.resetModules();
  process.env.EXPO_PUBLIC_ADS_MODE = 'test';
  process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY = 'appl_unit_test_only';
  const events = new Map<string, (value?: unknown) => void>();
  const consent = { canRequestAds: true, privacyOptionsRequirementStatus: 'required' };
  const tracker = Object.fromEntries(['trackAdLoaded', 'trackAdDisplayed', 'trackAdOpened', 'trackAdRevenue', 'trackAdFailedToLoad'].map((name) => [name, jest.fn().mockResolvedValue(undefined)]));
  const nativeAd = { load: jest.fn(), show: jest.fn().mockResolvedValue(undefined), addAdEventListener: jest.fn((name, listener) => events.set(name, listener)), removeAllListeners: jest.fn() };
  const mobileAds = { setRequestConfiguration: jest.fn().mockResolvedValue(undefined), initialize: jest.fn().mockResolvedValue(undefined) };
  const sdk = {
    default: () => mobileAds,
    AdsConsent: { requestInfoUpdate: jest.fn().mockResolvedValue(consent), loadAndShowConsentFormIfRequired: jest.fn().mockResolvedValue(consent), showPrivacyOptionsForm: jest.fn().mockResolvedValue(consent) },
    AdsConsentPrivacyOptionsRequirementStatus: { REQUIRED: 'required' },
    MaxAdContentRating: { PG: 'PG' },
    TestIds: { INTERSTITIAL: 'test-interstitial' },
    AdEventType: { LOADED: 'loaded', OPENED: 'opened', CLICKED: 'clicked', PAID: 'paid', ERROR: 'error', CLOSED: 'closed' },
    InterstitialAd: { createForAdRequest: jest.fn(() => nativeAd) },
  };
  const purchases = { configure: jest.fn(() => { if (options.rcFails) throw new Error('RevenueCat unavailable'); }), adTracker: tracker };
  const state = { currentState: 'active', addEventListener: jest.fn(() => ({ remove: jest.fn() })) };
  const nativeLoad = jest.fn(() => sdk);
  const purchasesLoad = jest.fn(() => ({ default: purchases }));
  jest.doMock('expo-constants', () => ({ __esModule: true, default: { executionEnvironment: options.expoGo ? 'storeClient' : 'standalone' }, ExecutionEnvironment: { StoreClient: 'storeClient' } }));
  jest.doMock('react-native', () => ({ Platform: { OS: options.platform ?? 'ios' }, AppState: state }));
  jest.doMock('react-native-google-mobile-ads', () => nativeLoad());
  jest.doMock('react-native-purchases', () => purchasesLoad());
  const adapter = require('../monetization') as typeof import('../monetization');
  return { adapter, sdk, purchases, mobileAds, state, nativeLoad, purchasesLoad, nativeAd, tracker, events, consent };
}

afterEach(() => { process.env = { ...originalEnv }; jest.useRealTimers(); });

test.each([{ expoGo: true }, { platform: 'web' }])('does not evaluate either native SDK in unsupported runtime %j', async (options) => {
  const f = loadAdapter(options);
  await f.adapter.prepareMonetization(() => true);
  expect(f.adapter.prepareResultInterstitial()).toBeNull();
  expect(f.nativeLoad).not.toHaveBeenCalled();
  expect(f.purchasesLoad).not.toHaveBeenCalled();
});

test('leaving the lobby during the consent request cannot present a form', async () => {
  const f = loadAdapter(); let focused = true;
  let resolve!: (value: typeof f.consent) => void;
  f.sdk.AdsConsent.requestInfoUpdate.mockReturnValue(new Promise((done) => { resolve = done; }));
  const setup = f.adapter.prepareMonetization(() => focused);
  focused = false; resolve(f.consent); await setup;
  expect(f.sdk.AdsConsent.loadAndShowConsentFormIfRequired).not.toHaveBeenCalled();
  expect(f.mobileAds.initialize).not.toHaveBeenCalled();
});

test('a consent service failure returns without enabling ads or throwing into gameplay', async () => {
  const f = loadAdapter();
  f.sdk.AdsConsent.requestInfoUpdate.mockRejectedValue(new Error('offline'));
  await expect(f.adapter.prepareMonetization(() => true)).resolves.toBeUndefined();
  expect(f.adapter.prepareResultInterstitial()).toBeNull();
  expect(f.purchases.configure).not.toHaveBeenCalled();
});

test('RevenueCat failure does not disable the separately functioning ad SDK', async () => {
  const f = loadAdapter({ rcFails: true });
  await f.adapter.prepareMonetization(() => true);
  expect(f.adapter.prepareResultInterstitial()).not.toBeNull();
  expect(f.mobileAds.initialize).toHaveBeenCalledTimes(1);
});

test('reports one ad identity with SDK-correct micros and no gameplay attributes', async () => {
  const f = loadAdapter(); await f.adapter.prepareMonetization(() => true);
  const ad = f.adapter.prepareResultInterstitial()!;
  expect(f.nativeAd.show).not.toHaveBeenCalled();
  f.events.get('loaded')!();
  expect(ad.isReady()).toBe(true);
  const callbacks = { opened: jest.fn(), closed: jest.fn(), failed: jest.fn() };
  await ad.show(callbacks); f.events.get('opened')!(); f.events.get('clicked')!();
  f.events.get('paid')!({ value: 0.00123, currency: 'USD', precision: 3 });
  f.events.get('closed')!();
  expect(callbacks.opened).toHaveBeenCalledTimes(1); expect(callbacks.closed).toHaveBeenCalledTimes(1);
  const base = f.tracker.trackAdLoaded.mock.calls[0][0];
  expect(Object.keys(base).sort()).toEqual(['adFormat', 'adUnitId', 'impressionId', 'mediatorName', 'placement'].sort());
  expect(f.tracker.trackAdDisplayed).toHaveBeenCalledWith(base);
  expect(f.tracker.trackAdOpened).toHaveBeenCalledWith(base);
  expect(f.tracker.trackAdRevenue).toHaveBeenCalledWith({ ...base, revenueMicros: 1230, currency: 'USD', precision: 'exact' });
  expect(f.purchases.configure).toHaveBeenCalledWith(expect.objectContaining({ automaticDeviceIdentifierCollectionEnabled: false, diagnosticsEnabled: false }));
  expect(f.sdk.InterstitialAd.createForAdRequest).toHaveBeenCalledWith('test-interstitial', { requestNonPersonalizedAdsOnly: true });
});

test('rejects invalid paid events rather than reporting misleading revenue', () => {
  const f = loadAdapter(); const base = { mediatorName: 'AdMob', adFormat: 'interstitial', impressionId: 'test', adUnitId: 'test-interstitial' };
  for (const value of [-1, NaN, Infinity, Number.MAX_VALUE]) expect(f.adapter.toRevenueData(base, { value, currency: 'USD', precision: 3 })).toBeNull();
  expect(f.adapter.toRevenueData(base, { value: 1, currency: '', precision: 3 })).toBeNull();
  expect(f.adapter.toRevenueData(base, { value: 0, currency: 'CAD', precision: 0 })).toEqual({ ...base, revenueMicros: 0, currency: 'CAD', precision: 'unknown' });
});

test('changing privacy choices invalidates an already loaded ad', async () => {
  const f = loadAdapter(); await f.adapter.prepareMonetization(() => true);
  const ad = f.adapter.prepareResultInterstitial()!; f.events.get('loaded')!();
  expect(ad.isReady()).toBe(true);
  f.sdk.AdsConsent.showPrivacyOptionsForm.mockResolvedValue({ ...f.consent, canRequestAds: false });
  await f.adapter.showAdPrivacyOptions();
  expect(ad.isReady()).toBe(false);
  expect(f.adapter.prepareResultInterstitial()).toBeNull();
});

test('late startup initialization cannot undo newer denied privacy choices', async () => {
  const f = loadAdapter(); let resolve!: () => void;
  f.mobileAds.initialize.mockReturnValue(new Promise<void>((done) => { resolve = done; }));
  const setup = f.adapter.prepareMonetization(() => true);
  for (let i = 0; i < 12; i++) await Promise.resolve();
  expect(f.mobileAds.initialize).toHaveBeenCalledTimes(1);
  f.sdk.AdsConsent.showPrivacyOptionsForm.mockResolvedValue({ ...f.consent, canRequestAds: false });
  await f.adapter.showAdPrivacyOptions(); resolve(); await setup;
  expect(f.adapter.prepareResultInterstitial()).toBeNull();
});


test('entering a game cancels a slow info request without waiting for the network', async () => {
  const f = loadAdapter(); let resolve!: (value: typeof f.consent) => void;
  f.sdk.AdsConsent.requestInfoUpdate.mockReturnValue(new Promise((done) => { resolve = done; }));
  const setup = f.adapter.prepareMonetization(() => true);
  await f.adapter.settlePrivacyBeforeGameplay();
  resolve(f.consent); await setup;
  expect(f.sdk.AdsConsent.loadAndShowConsentFormIfRequired).not.toHaveBeenCalled();
});

test.each([false, true])('game entry waits for an already loading native form (failure=%s)', async (failure) => {
  const f = loadAdapter();
  let resolve!: (value: typeof f.consent) => void; let reject!: (error: Error) => void;
  f.sdk.AdsConsent.loadAndShowConsentFormIfRequired.mockReturnValue(new Promise((yes, no) => { resolve = yes; reject = no; }));
  const setup = f.adapter.prepareMonetization(() => true);
  for (let i = 0; i < 6; i++) await Promise.resolve();
  expect(f.sdk.AdsConsent.loadAndShowConsentFormIfRequired).toHaveBeenCalledTimes(1);
  const startCamera = jest.fn();
  const entry = f.adapter.settlePrivacyBeforeGameplay().then(startCamera);
  for (let i = 0; i < 6; i++) await Promise.resolve();
  expect(startCamera).not.toHaveBeenCalled();
  if (failure) reject(new Error('form unavailable')); else resolve(f.consent);
  await Promise.all([setup, entry]);
  expect(startCamera).toHaveBeenCalledTimes(1);
  expect(f.adapter.prepareResultInterstitial()).toBeNull();
});


test('a new consent check cannot reuse old ad permission when gameplay wins the race', async () => {
  const f = loadAdapter(); await f.adapter.prepareMonetization(() => true);
  expect(f.adapter.prepareResultInterstitial()).not.toBeNull();
  let resolve!: (value: typeof f.consent) => void;
  f.sdk.AdsConsent.requestInfoUpdate.mockReturnValue(new Promise((done) => { resolve = done; }));
  const setup = f.adapter.prepareMonetization(() => true);
  await f.adapter.settlePrivacyBeforeGameplay();
  resolve({ ...f.consent, canRequestAds: false }); await setup;
  expect(f.adapter.prepareResultInterstitial()).toBeNull();
});

test('privacy options cannot launch a second native form over one already loading', async () => {
  const f = loadAdapter(); let resolve!: (value: typeof f.consent) => void;
  f.sdk.AdsConsent.loadAndShowConsentFormIfRequired.mockReturnValue(new Promise((done) => { resolve = done; }));
  const setup = f.adapter.prepareMonetization(() => true);
  for (let i = 0; i < 6; i++) await Promise.resolve();
  const options = f.adapter.showAdPrivacyOptions();
  expect(f.sdk.AdsConsent.showPrivacyOptionsForm).not.toHaveBeenCalled();
  resolve(f.consent); await Promise.all([setup, options]);
});


test('granting privacy choices later applies the PG cap before the first SDK initialization', async () => {
  const f = loadAdapter();
  f.sdk.AdsConsent.loadAndShowConsentFormIfRequired.mockResolvedValue({ ...f.consent, canRequestAds: false });
  await f.adapter.prepareMonetization(() => true);
  expect(f.mobileAds.initialize).not.toHaveBeenCalled();
  expect(f.adapter.prepareResultInterstitial()).toBeNull();
  f.mobileAds.initialize.mockImplementation(async () => {
    expect(f.mobileAds.setRequestConfiguration).toHaveBeenCalledWith({ maxAdContentRating: 'PG' });
  });
  await f.adapter.showAdPrivacyOptions();
  expect(f.mobileAds.initialize).toHaveBeenCalledTimes(1);
  expect(f.adapter.prepareResultInterstitial()).not.toBeNull();
});
