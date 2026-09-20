const originalEnv = { ...process.env };
function loadAdapter(options: { platform?: string; expoGo?: boolean; rcFails?: boolean; adsAllowed?: boolean; rcAllowed?: boolean; treatment?: string; underAgeOfConsent?: boolean; nativeFence?: boolean; umpBridge?: boolean; appleRequired?: boolean } = {}) {
  jest.resetModules();
  process.env.EXPO_PUBLIC_ADS_MODE = 'test';
  process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY = 'appl_unit_test_only';
  let access = { ads: { allowed: options.adsAllowed ?? true, treatment: options.treatment ?? 'unspecified', underAgeOfConsent: options.underAgeOfConsent ?? false }, revenueCat: { allowed: options.rcAllowed ?? true }, competition: { allowed: true }, revision: 1 };
  const accessListeners = new Set<() => void>();
  const changeAccess = (change: Partial<typeof access>) => { access = { ...access, ...change, revision: access.revision + 1 }; accessListeners.forEach((listener) => listener()); };
  let ageRevision = 0;
  const privacyInput = { appleRequirement: options.appleRequired ? 'required' : 'not-required', verification: null as { mandatoryCheckSatisfied: boolean } | null };
  const ageRequest = jest.fn(async () => { ++ageRevision; return { status: 'processed', access, regional: null }; });
  jest.doMock('../privacy/appleAgeControl', () => ({ requestAppleAgeEvidence: ageRequest }));
  const invalidateAge = () => { ++ageRevision; privacyInput.verification = null; };
  jest.doMock('../privacy/processingAccess', () => ({ getProcessingInputs: () => privacyInput, getAgeVerificationRevision: () => ageRevision, getProcessingAccess: () => access, subscribeProcessingAccess: (listener: () => void) => { accessListeners.add(listener); return () => accessListeners.delete(listener); } }));
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
  const stateListeners = new Set<(state: string) => void>();
  const state = { currentState: 'active', addEventListener: jest.fn((_event: string, listener: (state: string) => void) => {
    stateListeners.add(listener);
    return { remove: jest.fn(() => stateListeners.delete(listener)) };
  }) };
  const changeState = (next: string) => { state.currentState = next; [...stateListeners].forEach((listener) => listener(next)); };
  const nativeLoad = jest.fn(() => sdk);
  const purchasesLoad = jest.fn(() => ({ default: purchases }));
  jest.doMock('expo-constants', () => ({ __esModule: true, default: { executionEnvironment: options.expoGo ? 'storeClient' : 'standalone' }, ExecutionEnvironment: { StoreClient: 'storeClient' } }));
  const nativeModules: { RNPurchases?: { flapFitSetProcessingAllowed?: typeof nativeFence } } = options.nativeFence === false ? {} : { RNPurchases: { flapFitSetProcessingAllowed: nativeFence } };
  const umpInfo = { canRequestAds: true, privacyOptionsRequirementStatus: 'REQUIRED' };
  const ump = { getConsentInfo: jest.fn().mockResolvedValue(umpInfo), showPrivacyOptionsForm: jest.fn().mockResolvedValue(umpInfo) };
  const turbo = { get: jest.fn(() => options.umpBridge ? ump : null) };
  jest.doMock('react-native', () => ({ TurboModuleRegistry: turbo, Platform: { OS: options.platform ?? 'ios' }, AppState: state, NativeModules: nativeModules }));
  jest.doMock('react-native-google-mobile-ads', () => nativeLoad());
  jest.doMock('react-native-purchases', () => purchasesLoad());
  const adapter = require('../monetization') as typeof import('../monetization');
  return { adapter, sdk, purchases, mobileAds, state, nativeLoad, purchasesLoad, nativeAd, tracker, events, consent, changeAccess, getAccess: () => access, nativeFence, nativeModules, changeState, ump, umpInfo, ageRequest, privacyInput, invalidateAge };
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
  await f.adapter.prepareMonetization(() => true);
  await expect(f.adapter.showAdPrivacyOptions()).rejects.toThrow('Ad privacy settings could not open');
  expect(f.nativeLoad).not.toHaveBeenCalled(); expect(f.purchasesLoad).not.toHaveBeenCalled();
});

test.each(['teen', 'child'])('restricted %s ads run without RevenueCat consent', async (treatment) => {
  const f = loadAdapter({ rcAllowed: false, treatment, underAgeOfConsent: true });
  await f.adapter.prepareMonetization(() => true);
  expect(f.sdk.AdsConsent.requestInfoUpdate).toHaveBeenCalledWith({ tagForUnderAgeOfConsent: true });
  expect(f.mobileAds.setRequestConfiguration).toHaveBeenCalledWith({ maxAdContentRating: 'PG', ageRestrictedTreatment: 'child' });
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


test('withdrawal waits for native close before completing an active result exit once', async () => {
  const f = loadAdapter(); await f.adapter.prepareMonetization(() => true);
  f.adapter.resultAdGate.createResult(null, f.adapter.adEnvironment).exit(false, jest.fn());
  const ad = f.adapter.prepareResultInterstitial()!; f.events.get('loaded')!();
  const result = f.adapter.resultAdGate.createResult(ad, f.adapter.adEnvironment);
  const action = jest.fn(); result.exit(false, action); await Promise.resolve();
  f.changeAccess({ ads: { ...f.getAccess().ads, allowed: false } });
  expect(action).not.toHaveBeenCalled();
  expect(f.nativeAd.destroy).not.toHaveBeenCalled();
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

// F1: exercise the real adapter and gate together. Native presentation is mocked;
// these tests do not claim physical-device or complete Google SDK shutdown proof.
test.each(['ios', 'android'])('withdrawal during pending %s presentation retains terminal ownership', async (platform) => {
  const f = loadAdapter({ platform }); await f.adapter.prepareMonetization(() => true);
  let acknowledgeShow!: () => void;
  f.nativeAd.show.mockReturnValue(new Promise<void>((done) => { acknowledgeShow = done; }));
  f.adapter.resultAdGate.createResult(null, f.adapter.adEnvironment).exit(false, jest.fn());
  const ad = f.adapter.prepareResultInterstitial()!; f.events.get('loaded')!();
  const result = f.adapter.resultAdGate.createResult(ad, f.adapter.adEnvironment);
  const action = jest.fn(); result.exit(false, action);
  f.changeAccess({ ads: { ...f.getAccess().ads, allowed: false }, revenueCat: { allowed: false } });
  await f.adapter.settleRevenueCatWithdrawal();
  expect(action).not.toHaveBeenCalled(); expect(f.nativeAd.destroy).not.toHaveBeenCalled();
  expect(ad.isReady()).toBe(false); expect(f.adapter.prepareResultInterstitial()).toBeNull();
  // A resolved show promise means handoff, NOT dismissal. A late opening stays on results.
  acknowledgeShow(); await Promise.resolve(); f.events.get('opened')!();
  f.events.get('paid')!({ value: 1, currency: 'USD', precision: 3 });
  await Promise.resolve();
  expect(action).not.toHaveBeenCalled(); expect(f.tracker.trackAdRevenue).not.toHaveBeenCalled();
  f.events.get('closed')!(); f.events.get('error')!();
  expect(action).toHaveBeenCalledTimes(1); expect(f.nativeAd.destroy).toHaveBeenCalledTimes(1);
});

test.each(['close', 'error', 'reject'])('withdrawal while displayed/pending releases only after native %s and foreground', async (terminal) => {
  const f = loadAdapter(); await f.adapter.prepareMonetization(() => true);
  let rejectShow!: (error: Error) => void;
  if (terminal === 'reject') f.nativeAd.show.mockReturnValue(new Promise<void>((_yes, no) => { rejectShow = no; }));
  f.adapter.resultAdGate.createResult(null, f.adapter.adEnvironment).exit(false, jest.fn());
  const ad = f.adapter.prepareResultInterstitial()!; f.events.get('loaded')!();
  const action = jest.fn(); const result = f.adapter.resultAdGate.createResult(ad, f.adapter.adEnvironment);
  result.exit(false, action); if (terminal === 'close') f.events.get('opened')!();
  f.changeState('background');
  f.changeAccess({ ads: { ...f.getAccess().ads, allowed: false } });
  f.changeState('active'); expect(action).not.toHaveBeenCalled();
  f.changeState('background');
  if (terminal === 'reject') rejectShow(new Error('native refused presentation'));
  else f.events.get(terminal === 'close' ? 'closed' : 'error')!();
  for (let i = 0; i < 6; i++) await Promise.resolve();
  expect(action).not.toHaveBeenCalled(); expect(f.nativeAd.destroy).toHaveBeenCalledTimes(1);
  f.changeState('active'); f.changeState('active'); f.events.get('closed')!();
  expect(action).toHaveBeenCalledTimes(1); expect(result.exit(false, action)).toBe(false);
});

test('withdrawal before show destroys the preload and continues without native presentation', async () => {
  const f = loadAdapter(); await f.adapter.prepareMonetization(() => true);
  f.adapter.resultAdGate.createResult(null, f.adapter.adEnvironment).exit(false, jest.fn());
  const ad = f.adapter.prepareResultInterstitial()!; f.events.get('loaded')!();
  f.changeAccess({ ads: { ...f.getAccess().ads, allowed: false } });
  const action = jest.fn(); f.adapter.resultAdGate.createResult(ad, f.adapter.adEnvironment).exit(false, action);
  expect(action).toHaveBeenCalledTimes(1); expect(f.nativeAd.show).not.toHaveBeenCalled();
  expect(f.nativeAd.destroy).toHaveBeenCalledTimes(1);
});

test.each(['closed', 'error', 'reject'])('unmount retains the native %s barrier but never replays the old result action', async (terminal) => {
  const f = loadAdapter(); await f.adapter.prepareMonetization(() => true);
  let rejectShow!: (error: Error) => void;
  if (terminal === 'reject') f.nativeAd.show.mockReturnValue(new Promise<void>((_yes, no) => { rejectShow = no; }));
  f.adapter.resultAdGate.createResult(null, f.adapter.adEnvironment).exit(false, jest.fn());
  const ad = f.adapter.prepareResultInterstitial()!; f.events.get('loaded')!();
  const action = jest.fn(); const result = f.adapter.resultAdGate.createResult(ad, f.adapter.adEnvironment);
  result.exit(false, action); result.dispose(); result.dispose();
  const startCamera = jest.fn(); const entry = f.adapter.settlePrivacyBeforeGameplay().then(startCamera);
  for (let i = 0; i < 6; i++) await Promise.resolve();
  expect(startCamera).not.toHaveBeenCalled(); expect(f.nativeAd.destroy).not.toHaveBeenCalled();
  if (terminal === 'reject') rejectShow(new Error('not ready'));
  else f.events.get(terminal)!();
  await entry; f.changeState('active');
  expect(startCamera).toHaveBeenCalledTimes(1); expect(action).not.toHaveBeenCalled();
  expect(f.nativeAd.destroy).toHaveBeenCalledTimes(1);
});

test('privacy form cannot cover an unsettled native result ad', async () => {
  const f = loadAdapter(); await f.adapter.prepareMonetization(() => true);
  const ad = f.adapter.prepareResultInterstitial()!; f.events.get('loaded')!();
  await ad.show({ opened: jest.fn(), closed: jest.fn(), failed: jest.fn() });
  const options = f.adapter.showAdPrivacyOptions();
  for (let i = 0; i < 6; i++) await Promise.resolve();
  expect(f.sdk.AdsConsent.showPrivacyOptionsForm).not.toHaveBeenCalled();
  f.events.get('closed')!(); await options;
  expect(f.sdk.AdsConsent.showPrivacyOptionsForm).toHaveBeenCalledTimes(1);
});


test('a cold restricted session recovers the required Google entry without starting either SDK', async () => {
  const f = loadAdapter({ adsAllowed: false, rcAllowed: false, umpBridge: true });
  expect(f.adapter.isAdPrivacyRequired()).toBe(false);
  await f.adapter.refreshAdPrivacyRequirement();
  expect(f.adapter.isAdPrivacyRequired()).toBe(true);
  await f.adapter.showAdPrivacyOptions();
  expect(f.ump.showPrivacyOptionsForm).toHaveBeenCalledTimes(1);
  expect(f.nativeLoad).not.toHaveBeenCalled(); expect(f.purchasesLoad).not.toHaveBeenCalled();
  expect(f.mobileAds.initialize).not.toHaveBeenCalled();
  expect(f.adapter.prepareResultInterstitial()).toBeNull();
  expect(f.getAccess().ads.allowed).toBe(false); expect(f.getAccess().revenueCat.allowed).toBe(false);
});

test('required-entry recovery keeps known requirements on unknown/error, and clears an explicit not-required result', async () => {
  const f = loadAdapter({ adsAllowed: false, rcAllowed: false, umpBridge: true });
  await f.adapter.refreshAdPrivacyRequirement();
  f.umpInfo.privacyOptionsRequirementStatus = 'UNKNOWN';
  await f.adapter.refreshAdPrivacyRequirement();
  expect(f.adapter.isAdPrivacyRequired()).toBe(true);
  f.ump.getConsentInfo.mockRejectedValueOnce(new Error('unavailable'));
  await f.adapter.refreshAdPrivacyRequirement();
  expect(f.adapter.isAdPrivacyRequired()).toBe(true);
  f.umpInfo.privacyOptionsRequirementStatus = 'NOT_REQUIRED';
  await f.adapter.refreshAdPrivacyRequirement();
  expect(f.adapter.isAdPrivacyRequired()).toBe(false);
  await f.adapter.showAdPrivacyOptions();
  expect(f.ump.showPrivacyOptionsForm).not.toHaveBeenCalled();
  expect(f.nativeLoad).not.toHaveBeenCalled(); expect(f.purchasesLoad).not.toHaveBeenCalled();
});

test('a stale read cannot erase the privacy result from a newer form', async () => {
  const f = loadAdapter({ adsAllowed: false, rcAllowed: false, umpBridge: true });
  let resolve!: (value: typeof f.umpInfo) => void;
  f.ump.getConsentInfo.mockReturnValueOnce(new Promise(done => { resolve = done; }));
  const stale = f.adapter.refreshAdPrivacyRequirement();
  await f.adapter.showAdPrivacyOptions();
  resolve({ ...f.umpInfo, privacyOptionsRequirementStatus: 'NOT_REQUIRED' }); await stale;
  expect(f.adapter.isAdPrivacyRequired()).toBe(true);
});

test.each(['game', 'background', 'blur'])('a late native rights query cannot open a form after %s', async (reason) => {
  const f = loadAdapter({ adsAllowed: false, rcAllowed: false, umpBridge: true });
  let resolve!: (value: typeof f.umpInfo) => void; let focused = true;
  f.ump.getConsentInfo.mockReturnValueOnce(new Promise(done => { resolve = done; }));
  const options = f.adapter.showAdPrivacyOptions(() => focused);
  for (let i = 0; i < 8; ++i) await Promise.resolve();
  if (reason === 'game') await f.adapter.settlePrivacyBeforeGameplay();
  if (reason === 'background') f.changeState('background');
  if (reason === 'blur') focused = false;
  resolve(f.umpInfo); await options;
  expect(f.ump.showPrivacyOptionsForm).not.toHaveBeenCalled();
  expect(f.nativeLoad).not.toHaveBeenCalled(); expect(f.purchasesLoad).not.toHaveBeenCalled();
});

test('repeated rights requests share one native form and game entry waits for its completion', async () => {
  const f = loadAdapter({ adsAllowed: false, rcAllowed: false, umpBridge: true });
  let resolve!: (value: typeof f.umpInfo) => void;
  f.ump.showPrivacyOptionsForm.mockReturnValue(new Promise(done => { resolve = done; }));
  const first = f.adapter.showAdPrivacyOptions(); const second = f.adapter.showAdPrivacyOptions();
  expect(first).toBe(second);
  for (let i = 0; i < 12; ++i) await Promise.resolve();
  expect(f.ump.showPrivacyOptionsForm).toHaveBeenCalledTimes(1);
  const start = jest.fn(); const entry = f.adapter.settlePrivacyBeforeGameplay().then(start);
  for (let i = 0; i < 8; ++i) await Promise.resolve();
  expect(start).not.toHaveBeenCalled();
  resolve(f.umpInfo); await Promise.all([first, entry]);
  expect(start).toHaveBeenCalledTimes(1);
});

test('native Google choices can restore independently permitted restricted ads without RevenueCat', async () => {
  const f = loadAdapter({ rcAllowed: false, treatment: 'teen', underAgeOfConsent: true, umpBridge: true });
  await f.adapter.showAdPrivacyOptions();
  expect(f.mobileAds.setRequestConfiguration).toHaveBeenCalledWith({ maxAdContentRating: 'PG', ageRestrictedTreatment: 'child' });
  expect(f.mobileAds.initialize).toHaveBeenCalledTimes(1);
  expect(f.adapter.prepareResultInterstitial()).not.toBeNull();
  expect(f.purchasesLoad).not.toHaveBeenCalled(); expect(f.nativeFence).not.toHaveBeenCalledWith(true);
});

test('native Google refusal does not erase independent RevenueCat permission or initialize ads', async () => {
  const f = loadAdapter({ umpBridge: true }); f.umpInfo.canRequestAds = false;
  await f.adapter.showAdPrivacyOptions();
  expect(f.getAccess().revenueCat.allowed).toBe(true);
  expect(f.mobileAds.initialize).not.toHaveBeenCalled();
  expect(f.adapter.prepareResultInterstitial()).toBeNull();
});

test.each(['UNKNOWN', 'error'])('unavailable Google rights %s surface a retryable failure', async (reason) => {
  const f = loadAdapter({ adsAllowed: false, rcAllowed: false, umpBridge: true });
  if (reason === 'error') f.ump.showPrivacyOptionsForm.mockRejectedValue(new Error('failed to present'));
  else f.umpInfo.privacyOptionsRequirementStatus = reason;
  await expect(f.adapter.showAdPrivacyOptions()).rejects.toThrow('Ad privacy settings could not open');
  expect(f.nativeLoad).not.toHaveBeenCalled(); expect(f.purchasesLoad).not.toHaveBeenCalled();
});


test('lobby re-entry cannot start a second native form while privacy options are presented', async () => {
  const f = loadAdapter({ rcAllowed: false, umpBridge: true });
  let resolve!: (value: typeof f.umpInfo) => void;
  f.ump.showPrivacyOptionsForm.mockReturnValue(new Promise(done => { resolve = done; }));
  const options = f.adapter.showAdPrivacyOptions();
  for (let i = 0; i < 12; ++i) await Promise.resolve();
  expect(f.ump.showPrivacyOptionsForm).toHaveBeenCalledTimes(1);
  const setup = f.adapter.prepareMonetization(() => true);
  expect(f.sdk.AdsConsent.requestInfoUpdate).not.toHaveBeenCalled();
  expect(f.sdk.AdsConsent.loadAndShowConsentFormIfRequired).not.toHaveBeenCalled();
  resolve(f.umpInfo); await Promise.all([options, setup]);
  expect(f.mobileAds.initialize).toHaveBeenCalledTimes(1);
});

test('lobby re-entry during an unresolved rights query cannot bypass its later refusal', async () => {
  const f = loadAdapter({ rcAllowed: false, umpBridge: true });
  let resolve!: (value: typeof f.umpInfo) => void;
  f.ump.getConsentInfo.mockReturnValueOnce(new Promise(done => { resolve = done; }));
  const options = f.adapter.showAdPrivacyOptions();
  const setup = f.adapter.prepareMonetization(() => true);
  for (let i = 0; i < 8; ++i) await Promise.resolve();
  expect(f.sdk.AdsConsent.requestInfoUpdate).not.toHaveBeenCalled();
  f.umpInfo.canRequestAds = false; resolve(f.umpInfo);
  await Promise.all([options, setup]);
  expect(f.mobileAds.initialize).not.toHaveBeenCalled();
  expect(f.adapter.prepareResultInterstitial()).toBeNull();
});


test('positive Apple duty invokes the system check with no location question or invented processing grant', async () => {
  const f = loadAdapter({ adsAllowed: false, rcAllowed: false, appleRequired: true });
  await f.adapter.prepareMonetization(() => true);
  expect(f.ageRequest).toHaveBeenCalledWith();
  expect(f.nativeLoad).not.toHaveBeenCalled(); expect(f.purchasesLoad).not.toHaveBeenCalled();
  expect(f.getAccess().ads.allowed).toBe(false); expect(f.getAccess().revenueCat.allowed).toBe(false);
});

test.each(['pending', 'error', 'not-required', 'unsupported'])('Apple duty %s never automatically presents the age sheet', async (duty) => {
  const f = loadAdapter({ adsAllowed: false, rcAllowed: false }); f.privacyInput.appleRequirement = duty;
  await f.adapter.prepareMonetization(() => true);
  expect(f.ageRequest).not.toHaveBeenCalled();
});

test('an already satisfied Apple check is reused and no repeated system sheet is requested', async () => {
  const f = loadAdapter({ adsAllowed: false, rcAllowed: false, appleRequired: true });
  f.privacyInput.verification = { mandatoryCheckSatisfied: true };
  await f.adapter.prepareMonetization(() => true);
  expect(f.ageRequest).not.toHaveBeenCalled();
});

test('Apple refusal is not automatically re-requested on ordinary lobby return', async () => {
  const f = loadAdapter({ adsAllowed: false, rcAllowed: false, appleRequired: true });
  await f.adapter.prepareMonetization(() => true);
  await f.adapter.prepareMonetization(() => true);
  expect(f.ageRequest).toHaveBeenCalledTimes(1);
  f.invalidateAge(); await f.adapter.prepareMonetization(() => true);
  expect(f.ageRequest).toHaveBeenCalledTimes(2);
});

test('game entry waits for an Apple system sheet already dispatched, without allowing ads', async () => {
  const f = loadAdapter({ adsAllowed: false, rcAllowed: false, appleRequired: true });
  let resolve!: (value: unknown) => void;
  f.ageRequest.mockReturnValue(new Promise(done => { resolve = done; }) as never);
  const first = f.adapter.prepareMonetization(() => true);
  const second = f.adapter.prepareMonetization(() => true); expect(first).toBe(second);
  for (let i = 0; i < 8; ++i) await Promise.resolve();
  expect(f.ageRequest).toHaveBeenCalledTimes(1);
  const start = jest.fn(); const entry = f.adapter.settlePrivacyBeforeGameplay().then(start);
  for (let i = 0; i < 8; ++i) await Promise.resolve();
  expect(start).not.toHaveBeenCalled();
  resolve({ status: 'processed', access: f.getAccess(), regional: null });
  await Promise.all([first, entry]); expect(start).toHaveBeenCalledTimes(1);
  expect(f.mobileAds.initialize).not.toHaveBeenCalled();
});

test('leaving the lobby before native dispatch cannot show an Apple sheet over the next screen', async () => {
  const f = loadAdapter({ adsAllowed: false, rcAllowed: false, appleRequired: true }); let focused = true;
  const request = f.adapter.prepareMonetization(() => focused); focused = false;
  await request; expect(f.ageRequest).not.toHaveBeenCalled();
});

test('an invalidated Apple response cannot consume the fresh account check attempt', async () => {
  const f = loadAdapter({ adsAllowed: false, rcAllowed: false, appleRequired: true });
  f.ageRequest.mockResolvedValueOnce({ status: 'stale', access: f.getAccess(), regional: null });
  await f.adapter.prepareMonetization(() => true);
  await f.adapter.prepareMonetization(() => true);
  expect(f.ageRequest).toHaveBeenCalledTimes(2);
});

test('the lobby key changes when required Apple information is satisfied, without exposing any range', () => {
  const f = loadAdapter({ appleRequired: true });
  expect(f.adapter.getLobbyPrivacyKey()).toBe('required:false:true:unspecified:false:true');
  f.privacyInput.verification = { mandatoryCheckSatisfied: true };
  expect(f.adapter.getLobbyPrivacyKey()).toBe('required:true:true:unspecified:false:true');
});


test('required Apple sheet waits for an already pending Google rights lookup and form', async () => {
  const f = loadAdapter({ adsAllowed: false, rcAllowed: false, appleRequired: true, umpBridge: true });
  let resolve!: (value: typeof f.umpInfo) => void;
  f.ump.getConsentInfo.mockReturnValueOnce(new Promise(done => { resolve = done; }));
  const rights = f.adapter.showAdPrivacyOptions();
  const age = f.adapter.prepareMonetization(() => true);
  for (let i = 0; i < 10; ++i) await Promise.resolve();
  expect(f.ageRequest).not.toHaveBeenCalled();
  resolve(f.umpInfo); await Promise.all([rights, age]);
  expect(f.ump.showPrivacyOptionsForm).toHaveBeenCalledTimes(1);
  expect(f.ageRequest).toHaveBeenCalledTimes(1);
  expect(f.ump.showPrivacyOptionsForm.mock.invocationCallOrder[0]).toBeLessThan(f.ageRequest.mock.invocationCallOrder[0]);
});


test('lobby readiness changes when permitted ads become available while analytics remains refused', async () => {
  const f = loadAdapter({ adsAllowed: false, rcAllowed: false });
  const before = f.adapter.getLobbyPrivacyKey();
  await f.adapter.prepareMonetization(() => true); expect(f.nativeLoad).not.toHaveBeenCalled();
  f.changeAccess({ ads: { ...f.getAccess().ads, allowed: true, treatment: 'teen' } });
  expect(f.adapter.getLobbyPrivacyKey()).not.toBe(before);
  await f.adapter.prepareMonetization(() => true);
  expect(f.adapter.prepareResultInterstitial()).not.toBeNull();
  expect(f.purchasesLoad).not.toHaveBeenCalled();
});

test('the lobby key ignores unrelated competition revisions but reacts to each effective SDK decision', () => {
  const f = loadAdapter(); const initial = f.adapter.getLobbyPrivacyKey();
  f.changeAccess({ competition: { allowed: false } });
  expect(f.adapter.getLobbyPrivacyKey()).toBe(initial);
  f.changeAccess({ revenueCat: { allowed: false } }); const reportingOff = f.adapter.getLobbyPrivacyKey();
  expect(reportingOff).not.toBe(initial);
  f.changeAccess({ ads: { ...f.getAccess().ads, treatment: 'teen', underAgeOfConsent: true } });
  expect(f.adapter.getLobbyPrivacyKey()).not.toBe(reportingOff);
});

test('a newer eligible ad policy resumes after an old info request without waiting for another lobby visit', async () => {
  const f = loadAdapter({ rcAllowed: false }); let resolve!: (value: typeof f.consent) => void;
  f.sdk.AdsConsent.requestInfoUpdate.mockReturnValueOnce(new Promise(done => { resolve = done; }));
  const old = f.adapter.prepareMonetization(() => true);
  f.changeAccess({ ads: { ...f.getAccess().ads, treatment: 'teen', underAgeOfConsent: true } });
  const latest = f.adapter.prepareMonetization(() => true);
  resolve(f.consent); await Promise.all([old, latest]);
  expect(f.sdk.AdsConsent.requestInfoUpdate).toHaveBeenCalledTimes(2);
  expect(f.sdk.AdsConsent.requestInfoUpdate).toHaveBeenLastCalledWith({ tagForUnderAgeOfConsent: true });
  expect(f.mobileAds.setRequestConfiguration).toHaveBeenCalledTimes(1);
  expect(f.mobileAds.setRequestConfiguration).toHaveBeenCalledWith({ maxAdContentRating: 'PG', ageRestrictedTreatment: 'child' });
  expect(f.adapter.prepareResultInterstitial()).not.toBeNull(); expect(f.purchasesLoad).not.toHaveBeenCalled();
});

test.each(['game', 'blur', 'background'])('a queued policy refresh cannot resume after %s', async (reason) => {
  const f = loadAdapter({ rcAllowed: false }); let focused = true;
  let resolve!: (value: typeof f.consent) => void;
  f.sdk.AdsConsent.requestInfoUpdate.mockReturnValueOnce(new Promise(done => { resolve = done; }));
  const old = f.adapter.prepareMonetization(() => focused);
  f.changeAccess({ ads: { ...f.getAccess().ads, treatment: 'teen' } });
  const latest = f.adapter.prepareMonetization(() => focused);
  if (reason === 'game') await f.adapter.settlePrivacyBeforeGameplay();
  if (reason === 'blur') focused = false;
  if (reason === 'background') f.changeState('background');
  resolve(f.consent); await Promise.all([old, latest]);
  expect(f.sdk.AdsConsent.requestInfoUpdate).toHaveBeenCalledTimes(1);
  expect(f.mobileAds.initialize).not.toHaveBeenCalled();
});

test('unchanged failed setup does not become an automatic retry loop for concurrent callers', async () => {
  const f = loadAdapter({ rcAllowed: false }); f.sdk.AdsConsent.requestInfoUpdate.mockRejectedValue(new Error('offline'));
  await Promise.all([f.adapter.prepareMonetization(() => true), f.adapter.prepareMonetization(() => true)]);
  expect(f.sdk.AdsConsent.requestInfoUpdate).toHaveBeenCalledTimes(1);
  expect(f.mobileAds.initialize).not.toHaveBeenCalled();
});

test('a newer independent policy waits for the Google rights form before preparing eligible ads', async () => {
  const f = loadAdapter({ rcAllowed: false, umpBridge: true }); let resolve!: (value: typeof f.umpInfo) => void;
  f.ump.showPrivacyOptionsForm.mockReturnValueOnce(new Promise(done => { resolve = done; }));
  const rights = f.adapter.showAdPrivacyOptions();
  for (let i = 0; i < 12; ++i) await Promise.resolve();
  expect(f.ump.showPrivacyOptionsForm).toHaveBeenCalledTimes(1);
  f.changeAccess({ ads: { ...f.getAccess().ads, treatment: 'teen', underAgeOfConsent: true } });
  const latest = f.adapter.prepareMonetization(() => true);
  expect(f.sdk.AdsConsent.requestInfoUpdate).not.toHaveBeenCalled();
  resolve(f.umpInfo); await Promise.all([rights, latest]);
  expect(f.sdk.AdsConsent.requestInfoUpdate).toHaveBeenCalledTimes(1);
  expect(f.mobileAds.setRequestConfiguration).toHaveBeenCalledWith({ maxAdContentRating: 'PG', ageRestrictedTreatment: 'child' });
  expect(f.mobileAds.initialize).toHaveBeenCalledTimes(1); expect(f.purchasesLoad).not.toHaveBeenCalled();
});

test.each(['startup', 'privacy-options'])('an eligible teen above the consent threshold retains teen ads through %s', async (entry) => {
  const f = loadAdapter({ rcAllowed: false, treatment: 'teen', underAgeOfConsent: false, umpBridge: true });
  if (entry === 'startup') await f.adapter.prepareMonetization(() => true);
  else await f.adapter.showAdPrivacyOptions();
  expect(f.mobileAds.setRequestConfiguration).toHaveBeenCalledWith({ maxAdContentRating: 'PG', ageRestrictedTreatment: 'teen' });
  expect(f.adapter.prepareResultInterstitial()).not.toBeNull();
  expect(f.purchasesLoad).not.toHaveBeenCalled();
});

test('a consent-threshold change replaces the ad treatment without granting analytics', async () => {
  const f = loadAdapter({ rcAllowed: false, treatment: 'teen', underAgeOfConsent: true });
  await f.adapter.prepareMonetization(() => true);
  const restricted = f.adapter.prepareResultInterstitial()!; f.events.get('loaded')!();
  expect(restricted.isReady()).toBe(true);
  expect(f.mobileAds.setRequestConfiguration).toHaveBeenLastCalledWith({ maxAdContentRating: 'PG', ageRestrictedTreatment: 'child' });
  f.changeAccess({ ads: { ...f.getAccess().ads, underAgeOfConsent: false } });
  expect(restricted.isReady()).toBe(false);
  await f.adapter.prepareMonetization(() => true);
  expect(f.mobileAds.setRequestConfiguration).toHaveBeenLastCalledWith({ maxAdContentRating: 'PG', ageRestrictedTreatment: 'teen' });
  expect(f.adapter.prepareResultInterstitial()).not.toBeNull();
  expect(f.purchasesLoad).not.toHaveBeenCalled();
});
