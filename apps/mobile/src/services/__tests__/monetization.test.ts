const originalEnv = { ...process.env };
function loadAdapter(options: { platform?: string; expoGo?: boolean; rcFails?: boolean; adsAllowed?: boolean; rcAllowed?: boolean; treatment?: string; underAgeOfConsent?: boolean; nativeFence?: boolean } = {}) {
  jest.resetModules();
  process.env.EXPO_PUBLIC_ADS_MODE = 'test';
  process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY = 'appl_unit_test_only';
  let access = { ads: { allowed: options.adsAllowed ?? true, treatment: options.treatment ?? 'unspecified', underAgeOfConsent: options.underAgeOfConsent ?? false }, revenueCat: { allowed: options.rcAllowed ?? true }, competition: { allowed: true }, revision: 1 };
  const accessListeners = new Set<() => void>();
  const changeAccess = (change: Partial<typeof access>) => { access = { ...access, ...change, revision: access.revision + 1 }; accessListeners.forEach((listener) => listener()); };
  jest.doMock('../privacy/processingAccess', () => ({ getProcessingAccess: () => access, subscribeProcessingAccess: (listener: () => void) => { accessListeners.add(listener); return () => accessListeners.delete(listener); } }));
  const nativeFence = jest.fn().mockResolvedValue(true);
  const events = new Map<string, (value?: unknown) => void>();
  const consent = { canRequestAds: true, privacyOptionsRequirementStatus: 'required' };
  const tracker = Object.fromEntries(['trackAdLoaded', 'trackAdDisplayed', 'trackAdOpened', 'trackAdRevenue', 'trackAdFailedToLoad'].map((name) => [name, jest.fn().mockResolvedValue(undefined)]));
  const nativeAd = { load: jest.fn(), show: jest.fn().mockResolvedValue(undefined), addAdEventListener: jest.fn((name, listener) => events.set(name, listener)), removeAllListeners: jest.fn(), destroy: jest.fn() };
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
  const nativeModules: { RNPurchases?: { flapFitSetProcessingAllowed?: typeof nativeFence } } = options.nativeFence === false ? {} : { RNPurchases: { flapFitSetProcessingAllowed: nativeFence } };
  jest.doMock('react-native', () => ({ Platform: { OS: options.platform ?? 'ios' }, AppState: state, NativeModules: nativeModules }));
  jest.doMock('react-native-google-mobile-ads', () => nativeLoad());
  jest.doMock('react-native-purchases', () => purchasesLoad());
  const adapter = require('../monetization') as typeof import('../monetization');
  return { adapter, sdk, purchases, mobileAds, state, nativeLoad, purchasesLoad, nativeAd, tracker, events, consent, changeAccess, getAccess: () => access, nativeFence, nativeModules };
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

test('a consent service failure disables ads without blocking independently permitted RevenueCat', async () => {
  const f = loadAdapter();
  f.sdk.AdsConsent.requestInfoUpdate.mockRejectedValue(new Error('offline'));
  await expect(f.adapter.prepareMonetization(() => true)).resolves.toBeUndefined();
  for (let i = 0; i < 16; i++) await Promise.resolve();
  expect(f.adapter.prepareResultInterstitial()).toBeNull();
  expect(f.purchases.configure).toHaveBeenCalledTimes(1);
});

test('RevenueCat failure does not disable the separately functioning ad SDK', async () => {
  const f = loadAdapter({ rcFails: true });
  await f.adapter.prepareMonetization(() => true);
  expect(f.adapter.prepareResultInterstitial()).not.toBeNull();
  expect(f.mobileAds.initialize).toHaveBeenCalledTimes(1);
});

test('reports one ad identity with SDK-correct micros and no gameplay attributes', async () => {
  const f = loadAdapter(); await f.adapter.prepareMonetization(() => true);
  for (let i = 0; i < 10; i++) await Promise.resolve();
  const ad = f.adapter.prepareResultInterstitial()!;
  expect(f.nativeAd.show).not.toHaveBeenCalled();
  f.events.get('loaded')!();
  expect(ad.isReady()).toBe(true);
  const callbacks = { opened: jest.fn(), closed: jest.fn(), failed: jest.fn() };
  await ad.show(callbacks); f.events.get('opened')!(); f.events.get('clicked')!();
  f.events.get('paid')!({ value: 0.00123, currency: 'USD', precision: 3 });
  f.events.get('closed')!();
  expect(callbacks.opened).toHaveBeenCalledTimes(1); expect(callbacks.closed).toHaveBeenCalledTimes(1);
  await Promise.resolve();
  const base = f.tracker.trackAdLoaded.mock.calls[0][0];
  expect(Object.keys(base).sort()).toEqual(['adFormat', 'adUnitId', 'impressionId', 'mediatorName', 'placement'].sort());
  expect(f.tracker.trackAdDisplayed).toHaveBeenCalledWith(base);
  expect(f.tracker.trackAdOpened).toHaveBeenCalledWith(base);
  expect(f.tracker.trackAdRevenue).toHaveBeenCalledWith({ ...base, revenueMicros: 1230, currency: 'USD', precision: 'exact' });
  expect(f.purchases.configure).toHaveBeenCalledWith(expect.objectContaining({ automaticDeviceIdentifierCollectionEnabled: false, diagnosticsEnabled: false }));
  expect(f.sdk.InterstitialAd.createForAdRequest).toHaveBeenCalledWith('test-interstitial', { requestNonPersonalizedAdsOnly: true, networkExtras: { rdp: '1' } });
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
    expect(f.mobileAds.setRequestConfiguration).toHaveBeenCalledWith({ maxAdContentRating: 'PG', ageRestrictedTreatment: 'unspecified' });
  });
  await f.adapter.showAdPrivacyOptions();
  expect(f.mobileAds.initialize).toHaveBeenCalledTimes(1);
  expect(f.adapter.prepareResultInterstitial()).not.toBeNull();
});


test('discarding an unused result destroys its native request exactly once', async () => {
  const f = loadAdapter(); await f.adapter.prepareMonetization(() => true);
  const ad = f.adapter.prepareResultInterstitial()!;
  ad.dispose(); ad.dispose(); f.events.get('loaded')!();
  expect(f.nativeAd.destroy).toHaveBeenCalledTimes(1);
  expect(ad.isReady()).toBe(false);
  expect(f.tracker.trackAdLoaded).not.toHaveBeenCalled();
});

test('load startup exceptions still dispose the created SDK instance', async () => {
  const f = loadAdapter(); await f.adapter.prepareMonetization(() => true);
  f.nativeAd.load.mockImplementation(() => { throw new Error('native request failed'); });
  expect(f.adapter.prepareResultInterstitial()).toBeNull();
  expect(f.nativeAd.destroy).toHaveBeenCalledTimes(1);
});

test('consent invalidation destroys unfinished ads and ignores their late revenue/load events', async () => {
  const f = loadAdapter(); await f.adapter.prepareMonetization(() => true);
  const ad = f.adapter.prepareResultInterstitial()!;
  await f.adapter.showAdPrivacyOptions();
  f.events.get('loaded')!(); f.events.get('paid')!({ value: 1, currency: 'USD', precision: 3 });
  expect(ad.isReady()).toBe(false);
  expect(f.nativeAd.destroy).toHaveBeenCalledTimes(1);
  expect(f.tracker.trackAdLoaded).not.toHaveBeenCalled();
  expect(f.tracker.trackAdRevenue).not.toHaveBeenCalled();
});

test('a forwarded Android presentation failure completes the selected result action once', async () => {
  const f = loadAdapter({ platform: 'android' }); await f.adapter.prepareMonetization(() => true);
  f.adapter.resultAdGate.createResult(null, f.adapter.adEnvironment).exit(false, jest.fn());
  const ad = f.adapter.prepareResultInterstitial()!; f.events.get('loaded')!();
  const result = f.adapter.resultAdGate.createResult(ad, f.adapter.adEnvironment);
  const action = jest.fn();
  expect(result.exit(false, action)).toBe(true);
  await Promise.resolve();
  expect(action).not.toHaveBeenCalled();
  f.events.get('error')!(); f.events.get('closed')!();
  expect(action).toHaveBeenCalledTimes(1);
  expect(result.exit(false, action)).toBe(false);
  expect(f.nativeAd.destroy).toHaveBeenCalledTimes(1);
});


test('unresolved processing never loads either SDK', async () => {
  const f = loadAdapter({ adsAllowed: false, rcAllowed: false });
  await f.adapter.prepareMonetization(() => true); await f.adapter.showAdPrivacyOptions();
  expect(f.nativeLoad).not.toHaveBeenCalled(); expect(f.purchasesLoad).not.toHaveBeenCalled();
});

test.each(['teen', 'child'])('restricted %s ads run without RevenueCat consent', async (treatment) => {
  const f = loadAdapter({ rcAllowed: false, treatment, underAgeOfConsent: true });
  await f.adapter.prepareMonetization(() => true);
  expect(f.sdk.AdsConsent.requestInfoUpdate).toHaveBeenCalledWith({ tagForUnderAgeOfConsent: true });
  expect(f.mobileAds.setRequestConfiguration).toHaveBeenCalledWith({ maxAdContentRating: 'PG', ageRestrictedTreatment: treatment });
  expect(f.adapter.prepareResultInterstitial()).not.toBeNull();
  expect(f.purchasesLoad).not.toHaveBeenCalled(); expect(f.nativeFence).toHaveBeenCalledWith(false);
  expect(f.nativeFence).not.toHaveBeenCalledWith(true);
});

test('processing permission alone cannot override UMP denial', async () => {
  const f = loadAdapter(); f.consent.canRequestAds = false;
  await f.adapter.prepareMonetization(() => true);
  expect(f.mobileAds.initialize).not.toHaveBeenCalled(); expect(f.adapter.prepareResultInterstitial()).toBeNull();
});

test('a build missing the native RevenueCat stop fence still serves eligible ads', async () => {
  const f = loadAdapter({ nativeFence: false }); await f.adapter.prepareMonetization(() => true);
  expect(f.adapter.prepareResultInterstitial()).not.toBeNull(); expect(f.purchasesLoad).not.toHaveBeenCalled();
});

test('analytics refusal preserves loaded ads and drops queued and subsequent reporting', async () => {
  const f = loadAdapter(); await f.adapter.prepareMonetization(() => true);
  for (let i = 0; i < 8; i++) await Promise.resolve();
  const ad = f.adapter.prepareResultInterstitial()!;
  f.events.get('loaded')!(); f.events.get('paid')!({ value: 1, currency: 'USD', precision: 3 });
  f.changeAccess({ revenueCat: { allowed: false } });
  await f.adapter.settleRevenueCatWithdrawal();
  expect(ad.isReady()).toBe(true); expect(f.nativeAd.destroy).not.toHaveBeenCalled();
  expect(f.nativeFence).toHaveBeenLastCalledWith(false);
  for (const event of ['loaded', 'opened', 'clicked', 'error']) f.events.get(event)!();
  f.events.get('paid')!({ value: 1, currency: 'USD', precision: 3 }); await Promise.resolve();
  for (const method of Object.values(f.tracker)) expect(method).not.toHaveBeenCalled();
});

test('ad-specific changes invalidate preloads and late native initialization', async () => {
  const f = loadAdapter(); let resolve!: () => void;
  f.mobileAds.initialize.mockReturnValue(new Promise<void>((done) => { resolve = done; }));
  const setup = f.adapter.prepareMonetization(() => true);
  for (let i = 0; i < 16; i++) await Promise.resolve();
  f.changeAccess({ ads: { ...f.getAccess().ads, allowed: false } }); resolve(); await setup;
  expect(f.adapter.prepareResultInterstitial()).toBeNull();
});

test('analytics refusal during native grant never configures RevenueCat', async () => {
  const f = loadAdapter(); let grant!: (value: boolean) => void;
  f.nativeFence.mockImplementation((allowed) => allowed ? new Promise<boolean>((done) => { grant = done; }) : Promise.resolve(true));
  await f.adapter.prepareMonetization(() => true);
  f.changeAccess({ revenueCat: { allowed: false } }); grant(true);
  for (let i = 0; i < 10; i++) await Promise.resolve();
  expect(f.purchasesLoad).not.toHaveBeenCalled(); expect(f.nativeFence).toHaveBeenLastCalledWith(false);
  expect(f.adapter.prepareResultInterstitial()).not.toBeNull();
});


test('analytics can be granted later while an existing eligible ad remains ready', async () => {
  const f = loadAdapter({ rcAllowed: false }); await f.adapter.prepareMonetization(() => true);
  const ad = f.adapter.prepareResultInterstitial()!; f.events.get('loaded')!();
  f.changeAccess({ revenueCat: { allowed: true } });
  for (let i = 0; i < 16; i++) await Promise.resolve();
  expect(ad.isReady()).toBe(true); expect(f.purchases.configure).toHaveBeenCalledTimes(1);
  f.events.get('paid')!({ value: 0.5, currency: 'CAD', precision: 3 }); await Promise.resolve();
  expect(f.tracker.trackAdRevenue).toHaveBeenCalledWith(expect.objectContaining({ revenueMicros: 500000 }));
});

test('withdrawal followed by a later grant does not replay old queued events', async () => {
  const f = loadAdapter(); await f.adapter.prepareMonetization(() => true);
  for (let i = 0; i < 16; i++) await Promise.resolve();
  f.adapter.prepareResultInterstitial(); f.events.get('loaded')!();
  f.changeAccess({ revenueCat: { allowed: false } }); await f.adapter.settleRevenueCatWithdrawal();
  f.changeAccess({ revenueCat: { allowed: true } });
  for (let i = 0; i < 16; i++) await Promise.resolve();
  expect(f.tracker.trackAdLoaded).not.toHaveBeenCalled(); expect(f.nativeFence).toHaveBeenLastCalledWith(true);
  f.events.get('paid')!({ value: 0.1, currency: 'USD', precision: 3 }); await Promise.resolve();
  expect(f.tracker.trackAdRevenue).toHaveBeenCalledTimes(1);
});


test('withdrawal of ad permission completes an active result exit once', async () => {
  const f = loadAdapter(); await f.adapter.prepareMonetization(() => true);
  f.adapter.resultAdGate.createResult(null, f.adapter.adEnvironment).exit(false, jest.fn());
  const ad = f.adapter.prepareResultInterstitial()!; f.events.get('loaded')!();
  const result = f.adapter.resultAdGate.createResult(ad, f.adapter.adEnvironment);
  const action = jest.fn(); result.exit(false, action); await Promise.resolve();
  f.changeAccess({ ads: { ...f.getAccess().ads, allowed: false } });
  f.events.get('closed')!();
  expect(action).toHaveBeenCalledTimes(1); expect(f.nativeAd.destroy).toHaveBeenCalledTimes(1);
});


test.each(['reject', 'missing', 'false'])('native withdrawal %s remains observable after RevenueCat starts', async (failure) => {
  const f = loadAdapter(); await f.adapter.prepareMonetization(() => true);
  for (let i = 0; i < 16; i++) await Promise.resolve();
  expect(f.purchases.configure).toHaveBeenCalledTimes(1);
  const ad = f.adapter.prepareResultInterstitial()!; f.events.get('loaded')!(); await Promise.resolve();
  const changed = jest.fn(); const unsubscribe = f.adapter.subscribeRevenueCatWithdrawal(changed);
  if (failure === 'missing') delete f.nativeModules.RNPurchases;
  else if (failure === 'reject') f.nativeFence.mockRejectedValue(new Error('native bridge failed'));
  else f.nativeFence.mockResolvedValue(false);
  f.changeAccess({ revenueCat: { allowed: false } });
  expect(f.adapter.getRevenueCatWithdrawalStatus().state).toBe('pending');
  const status = await f.adapter.settleRevenueCatWithdrawal();
  expect(status.state).toBe('failed'); expect(status.error).toMatch(/could not confirm/);
  expect(f.adapter.getRevenueCatWithdrawalStatus()).toEqual(status);
  expect(changed).toHaveBeenCalledTimes(2); expect(ad.isReady()).toBe(true);
  f.events.get('paid')!({ value: 1, currency: 'USD', precision: 3 }); await Promise.resolve();
  expect(f.tracker.trackAdRevenue).not.toHaveBeenCalled();
  unsubscribe();
});

test('missing native bridge is safe to acknowledge when RevenueCat never started', async () => {
  const f = loadAdapter({ nativeFence: false, rcAllowed: false });
  await expect(f.adapter.settleRevenueCatWithdrawal()).resolves.toEqual({ state: 'stopped', error: null });
  expect(f.purchases.configure).not.toHaveBeenCalled();
});

test('a failed native withdrawal can be retried without enabling reporting or disabling ads', async () => {
  const f = loadAdapter(); await f.adapter.prepareMonetization(() => true);
  for (let i = 0; i < 16; i++) await Promise.resolve();
  f.nativeFence.mockResolvedValue(false);
  f.changeAccess({ revenueCat: { allowed: false } });
  expect((await f.adapter.settleRevenueCatWithdrawal()).state).toBe('failed');
  f.nativeFence.mockResolvedValue(true);
  await expect(f.adapter.retryRevenueCatWithdrawal()).resolves.toEqual({ state: 'stopped', error: null });
  expect(f.adapter.prepareResultInterstitial()).not.toBeNull();
  expect(f.nativeFence).toHaveBeenLastCalledWith(false);
});


test('withdrawal during a configured SDK re-grant requires a native stop acknowledgement', async () => {
  const f = loadAdapter(); await f.adapter.prepareMonetization(() => true);
  for (let i = 0; i < 16; i++) await Promise.resolve();
  expect(f.purchases.configure).toHaveBeenCalledTimes(1);
  f.changeAccess({ revenueCat: { allowed: false } });
  expect((await f.adapter.settleRevenueCatWithdrawal()).state).toBe('stopped');
  let grant!: (value: boolean) => void;
  f.nativeFence.mockImplementation((allowed) => allowed
    ? new Promise<boolean>((done) => { grant = done; })
    : Promise.resolve(false));
  f.changeAccess({ revenueCat: { allowed: true } });
  for (let i = 0; i < 8; i++) await Promise.resolve();
  expect(grant).toBeDefined();
  f.changeAccess({ revenueCat: { allowed: false } });
  expect((await f.adapter.settleRevenueCatWithdrawal()).state).toBe('failed');
  grant(true);
  for (let i = 0; i < 16; i++) await Promise.resolve();
  expect((await f.adapter.settleRevenueCatWithdrawal()).state).toBe('failed');
  expect(f.purchases.configure).toHaveBeenCalledTimes(1);
  expect(f.adapter.prepareResultInterstitial()).not.toBeNull();
});

test('an uncertain native re-grant is closed again before reporting can resume', async () => {
  const f = loadAdapter(); await f.adapter.prepareMonetization(() => true);
  for (let i = 0; i < 16; i++) await Promise.resolve();
  f.changeAccess({ revenueCat: { allowed: false } });
  await f.adapter.settleRevenueCatWithdrawal();
  f.nativeFence.mockImplementation((allowed) => allowed
    ? Promise.reject(new Error('enable acknowledgement lost'))
    : Promise.resolve(false));
  f.changeAccess({ revenueCat: { allowed: true } });
  for (let i = 0; i < 16; i++) await Promise.resolve();
  expect(f.nativeFence).toHaveBeenLastCalledWith(false);
  expect((await f.adapter.settleRevenueCatWithdrawal()).state).toBe('failed');
  f.adapter.prepareResultInterstitial();
  f.events.get('paid')!({ value: 1, currency: 'USD', precision: 3 });
  await Promise.resolve();
  expect(f.tracker.trackAdRevenue).not.toHaveBeenCalled();
});


test('a restored RevenueCat grant initializes independently when ads are denied before module load', async () => {
  const f = loadAdapter({ adsAllowed: false, rcAllowed: true });
  await expect(f.adapter.prepareMonetization(() => true)).resolves.toBeUndefined();
  for (let i = 0; i < 16; i++) await Promise.resolve();
  expect(f.nativeLoad).not.toHaveBeenCalled();
  expect(f.sdk.AdsConsent.requestInfoUpdate).not.toHaveBeenCalled();
  expect(f.purchases.configure).toHaveBeenCalledTimes(1);
  expect(f.nativeFence).toHaveBeenLastCalledWith(true);
  expect(f.adapter.prepareResultInterstitial()).toBeNull();
});
