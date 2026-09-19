import Constants, { ExecutionEnvironment } from 'expo-constants';
import { AppState, Platform } from 'react-native';
import type { PaidEvent } from 'react-native-google-mobile-ads';
import type { AdRevenueData, PurchasesAdTracker } from 'react-native-purchases';
import { ResultAdGate, type InterstitialCallbacks, type ReadyInterstitial } from './resultAdGate';

type AdsSdk = typeof import('react-native-google-mobile-ads');
type PurchasesSdk = typeof import('react-native-purchases');
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const supported = !isExpoGo && (Platform.OS === 'ios' || Platform.OS === 'android');
const mode = process.env.EXPO_PUBLIC_ADS_MODE?.trim() ?? 'test';
const liveUnit = Platform.OS === 'ios'
  ? process.env.EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_ID?.trim()
  : process.env.EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID?.trim();
const revenueCatKey = Platform.OS === 'ios'
  ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY?.trim()
  : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY?.trim();
let ads: AdsSdk | null = null;
let tracker: PurchasesAdTracker | null = null;
let adsReady = false;
let privacyRequired = false;
let init: Promise<void> | null = null;
let consentEpoch = 0;
let privacyPresentation: Promise<unknown> | null = null;
let impressionSequence = 0;
const privacyListeners = new Set<() => void>();
const activeResultAds = new Set<() => void>();
function disposeResultAds() {
  for (const dispose of [...activeResultAds]) {
    try { dispose(); } catch { /* Cleanup cannot interrupt consent or gameplay. */ }
  }
}
export const resultAdGate = new ResultAdGate();
export const adEnvironment = {
  isActive: () => AppState.currentState === 'active',
  onActive: (callback: () => void) => {
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') callback(); });
    return () => subscription.remove();
  },
};

function notifyPrivacy() { privacyListeners.forEach((listener) => listener()); }
export function subscribeAdPrivacy(listener: () => void) {
  privacyListeners.add(listener);
  return () => { privacyListeners.delete(listener); };
}
export function isAdPrivacyRequired() { return privacyRequired; }

function loadAdsSdk(): AdsSdk | null {
  if (!supported || mode === 'off') return null;
  // Runtime require is deliberate. Expo Go must never evaluate this native SDK.
  try { ads ??= require('react-native-google-mobile-ads') as AdsSdk; } catch { return null; }
  return ads;
}

function initializeRevenueCat() {
  if (!supported || !revenueCatKey || tracker) return;
  try {
    const sdk = require('react-native-purchases') as PurchasesSdk;
    sdk.default.configure({
      apiKey: revenueCatKey,
      automaticDeviceIdentifierCollectionEnabled: false,
      diagnosticsEnabled: false,
      shouldShowInAppMessagesAutomatically: false,
    });
    tracker = sdk.default.adTracker;
  } catch { /* Ads and gameplay remain available if RevenueCat fails. */ }
}

function bounded<T>(operation: Promise<T>, milliseconds = 10_000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Ad setup timed out')), milliseconds);
    void operation.then((value) => { clearTimeout(timer); resolve(value); }, (error: unknown) => { clearTimeout(timer); reject(error); });
  });
}

// UMP loads and presents internally, so its request cannot be cancelled once begun.
// Game entry waits for that native presentation to finish before mounting the camera.
function presentPrivacy<T>(operation: () => Promise<T>): Promise<T> {
  const presentation = operation();
  privacyPresentation = presentation;
  return presentation.finally(() => {
    if (privacyPresentation === presentation) privacyPresentation = null;
  });
}

export async function settlePrivacyBeforeGameplay(): Promise<void> {
  ++consentEpoch; // A pending info request may finish, but must never start a new form.
  disposeResultAds();
  const presentation = privacyPresentation;
  if (presentation) {
    try { await presentation; } catch { /* Consent failure does not prevent playing. */ }
  }
}

// Only lobby focus can start consent setup. The game-entry barrier also covers
// a native form that has already begun loading when the user selects Play.
export function prepareMonetization(canPresent: () => boolean): Promise<void> {
  if (init) return init;
  const sdk = loadAdsSdk();
  if (!sdk) return Promise.resolve();
  adsReady = false; // Revalidate prior permission before any new request.
  disposeResultAds();
  const epoch = consentEpoch;
  init = (async () => {
    try {
      const info = await bounded(sdk.AdsConsent.requestInfoUpdate());
      if (epoch !== consentEpoch) return;
      privacyRequired = info.privacyOptionsRequirementStatus === sdk.AdsConsentPrivacyOptionsRequirementStatus.REQUIRED;
      notifyPrivacy();
      if (!canPresent() || !adEnvironment.isActive()) return;
      const consent = await presentPrivacy(() => sdk.AdsConsent.loadAndShowConsentFormIfRequired());
      if (epoch !== consentEpoch) return;
      privacyRequired = consent.privacyOptionsRequirementStatus === sdk.AdsConsentPrivacyOptionsRequirementStatus.REQUIRED;
      notifyPrivacy();
      if (!consent.canRequestAds) { adsReady = false; return; }
      // No IDFA collection, personalized requests, health or competition attributes.
      await bounded(sdk.default().setRequestConfiguration({ maxAdContentRating: sdk.MaxAdContentRating.PG }));
      if (epoch !== consentEpoch) return;
      initializeRevenueCat();
      await bounded(sdk.default().initialize());
      if (epoch === consentEpoch) adsReady = true;
    } catch {
      if (epoch === consentEpoch) adsReady = false;
    } finally {
      init = null;
    }
  })();
  return init;
}

export async function showAdPrivacyOptions(): Promise<void> {
  const sdk = loadAdsSdk();
  if (!sdk || !adEnvironment.isActive()) return;
  if (privacyPresentation) { await privacyPresentation; return; }
  adsReady = false;
  const epoch = ++consentEpoch; // Invalidate old ads and in-flight initialization.
  disposeResultAds();
  try {
    const consent = await presentPrivacy(() => sdk.AdsConsent.showPrivacyOptionsForm());
    if (epoch !== consentEpoch) return;
    privacyRequired = consent.privacyOptionsRequirementStatus === sdk.AdsConsentPrivacyOptionsRequirementStatus.REQUIRED;
    notifyPrivacy();
    if (consent.canRequestAds) {
      // This can be the first allowed initialization after a denied/failed startup.
      await bounded(sdk.default().setRequestConfiguration({ maxAdContentRating: sdk.MaxAdContentRating.PG }));
      if (epoch !== consentEpoch) return;
      initializeRevenueCat();
      await bounded(sdk.default().initialize());
      if (epoch === consentEpoch) adsReady = true;
    }
  } catch {
    throw new Error('Ad privacy settings could not open. Please try again when online.');
  }
}

export function toRevenueData(base: Omit<AdRevenueData, 'revenueMicros' | 'currency' | 'precision'>, paid: PaidEvent): AdRevenueData | null {
  // SDK 16.5.0 emits currency units on both platforms (Android divides native
  // micros by 1e6; iOS emits GADAdValue.value). RevenueCat requires micros.
  // Version-lock this conversion and reject invalid/overflowing events.
  if (!Number.isFinite(paid.value) || paid.value < 0 || !Number.isSafeInteger(Math.round(paid.value * 1_000_000)) || !/^[A-Z]{3}$/.test(paid.currency)) return null;
  const precision = ['unknown', 'estimated', 'publisher_defined', 'exact'][paid.precision] ?? 'unknown';
  return { ...base, revenueMicros: Math.round(paid.value * 1_000_000), currency: paid.currency, precision };
}

function track(send: (value: PurchasesAdTracker) => Promise<void>) {
  const current = tracker;
  if (!current) return;
  try { void send(current).catch(() => undefined); } catch { /* Reporting never controls gameplay. */ }
}

export function prepareResultInterstitial(): ReadyInterstitial | null {
  const sdk = ads;
  if (!supported || !sdk || !adsReady || mode === 'off') return null;
  const adUnitId = mode === 'live' ? liveUnit : sdk.TestIds.INTERSTITIAL;
  if (!adUnitId) return null;
  const epoch = consentEpoch;
  const impressionId = `ff-${Date.now().toString(36)}-${(++impressionSequence).toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  const base = { mediatorName: 'AdMob', adFormat: 'interstitial', placement: 'result_exit', adUnitId, impressionId };
  let loaded = false;
  let disposed = false;
  let shown = false;
  let callbacks: InterstitialCallbacks | null = null;
  let release: (() => void) | undefined;
  try {
    const ad = sdk.InterstitialAd.createForAdRequest(adUnitId, { requestNonPersonalizedAdsOnly: true });
    const dispose = () => {
      if (disposed) return;
      disposed = true;
      loaded = false;
      callbacks = null;
      activeResultAds.delete(dispose);
      ad.destroy();
    };
    release = dispose;
    activeResultAds.add(dispose);
    ad.addAdEventListener(sdk.AdEventType.LOADED, () => {
      if (disposed) return;
      loaded = true;
      track((value) => value.trackAdLoaded(base));
    });
    ad.addAdEventListener(sdk.AdEventType.OPENED, () => {
      if (disposed) return;
      track((value) => value.trackAdDisplayed(base));
      callbacks?.opened();
    });
    ad.addAdEventListener(sdk.AdEventType.CLICKED, () => {
      if (!disposed) track((value) => value.trackAdOpened(base));
    });
    ad.addAdEventListener(sdk.AdEventType.PAID, (payload) => {
      if (disposed) return;
      const revenue = toRevenueData(base, payload as unknown as PaidEvent);
      if (revenue) track((value) => value.trackAdRevenue(revenue));
    });
    ad.addAdEventListener(sdk.AdEventType.ERROR, () => {
      if (disposed) return;
      loaded = false;
      if (!shown) track((value) => value.trackAdFailedToLoad({ mediatorName: base.mediatorName, adFormat: base.adFormat, placement: base.placement, adUnitId }));
      callbacks?.failed();
    });
    ad.addAdEventListener(sdk.AdEventType.CLOSED, () => { if (!disposed) callbacks?.closed(); });
    ad.load();
    return {
      isReady: () => loaded && !disposed && !shown && adsReady && epoch === consentEpoch,
      show: async (next) => {
        if (!loaded || disposed || shown || !adsReady || epoch !== consentEpoch || !adEnvironment.isActive()) { next.failed(); return; }
        shown = true;
        loaded = false;
        callbacks = next;
        await ad.show();
      },
      dispose,
    };
  } catch {
    try { release?.(); } catch { /* A failed request still returns the no-ad path. */ }
    return null;
  }
}
