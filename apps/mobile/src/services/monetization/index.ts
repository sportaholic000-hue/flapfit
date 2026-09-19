import Constants, { ExecutionEnvironment } from 'expo-constants';
import { AppState, NativeModules, Platform } from 'react-native';
import type { AgeRestrictedTreatment, PaidEvent } from 'react-native-google-mobile-ads';
import type { AdRevenueData, PurchasesAdTracker } from 'react-native-purchases';
import { ResultAdGate, type InterstitialCallbacks, type ReadyInterstitial } from './resultAdGate';
import { getProcessingAccess, subscribeProcessingAccess } from '../privacy/processingAccess';

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
let processingAccess = getProcessingAccess();
let revenueCatEpoch = 0;
let revenueCatConfigured = false;
let revenueCatInit: Promise<void> | null = null;
export type RevenueCatWithdrawalStatus = Readonly<{
  state: 'not-requested' | 'pending' | 'stopped' | 'failed';
  error: string | null;
}>;
let nativeRevenueCatMayBeActive = false;
let withdrawalSequence = 0;
let withdrawalStatus: RevenueCatWithdrawalStatus = { state: 'not-requested', error: null };
const withdrawalListeners = new Set<() => void>();
let revenueCatWithdrawal: Promise<RevenueCatWithdrawalStatus> = Promise.resolve(withdrawalStatus);
void requestRevenueCatWithdrawal();
const privacyListeners = new Set<() => void>();
const activeResultAds = new Set<() => void>();
// Retain native presentation ownership until close/failure, including after a
// result unmount. Resolving show() only acknowledges handoff, not dismissal.
const resultPresentations = new Set<Promise<void>>();
async function settleResultPresentations(): Promise<void> {
  await Promise.all([...resultPresentations]);
}
function disposeResultAds() {
  for (const dispose of [...activeResultAds]) {
    try { dispose(); } catch { /* Cleanup cannot interrupt consent or gameplay. */ }
  }
}
// Every native continuation also reads the current decision. This listener makes
// already loaded requests unusable immediately, without waiting for lobby focus.
subscribeProcessingAccess(() => {
  const next = getProcessingAccess();
  const sameAdTreatment = next.ads.allowed === processingAccess.ads.allowed
    && next.ads.treatment === processingAccess.ads.treatment
    && next.ads.underAgeOfConsent === processingAccess.ads.underAgeOfConsent;
  const sameAnalytics = next.revenueCat.allowed === processingAccess.revenueCat.allowed;
  processingAccess = next;
  if (!sameAdTreatment) {
    ++consentEpoch;
    adsReady = false;
    disposeResultAds();
  }
  if (!sameAnalytics) {
    ++revenueCatEpoch;
    tracker = null;
    if (!next.revenueCat.allowed) {
      // Native transport cancellation and persistent-event purge are required;
      // clearing the JavaScript tracker alone cannot stop an initialized SDK.
      void requestRevenueCatWithdrawal();
    } else {
      void initializeRevenueCat();
    }
  }
});

function currentAdPermission(epoch: number) {
  return getProcessingAccess().ads.allowed && epoch === consentEpoch;
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

async function setNativeRevenueCatProcessing(allowed: boolean): Promise<boolean> {
  // The iOS bridge is provided by the version-pinned consent fence. A build
  // without a proven native stop path never initializes RevenueCat.
  if (!supported || Platform.OS !== 'ios') return false;
  try {
    const apply = NativeModules.RNPurchases?.flapFitSetProcessingAllowed;
    if (typeof apply !== 'function') return false;
    return (await apply(allowed)) === true;
  } catch { return false; }
}

function publishWithdrawalStatus(status: RevenueCatWithdrawalStatus) {
  withdrawalStatus = status;
  for (const listener of withdrawalListeners) {
    try { listener(); } catch { /* A view cannot interrupt stopping native processing. */ }
  }
}

export function getRevenueCatWithdrawalStatus(): RevenueCatWithdrawalStatus { return withdrawalStatus; }
export function subscribeRevenueCatWithdrawal(listener: () => void) {
  withdrawalListeners.add(listener);
  return () => { withdrawalListeners.delete(listener); };
}

function requestRevenueCatWithdrawal(): Promise<RevenueCatWithdrawalStatus> {
  const sequence = ++withdrawalSequence;
  const nativeStopRequired = nativeRevenueCatMayBeActive;
  publishWithdrawalStatus({ state: 'pending', error: null });
  const operation = setNativeRevenueCatProcessing(false).then((acknowledged): RevenueCatWithdrawalStatus => {
    // A never-started SDK needs no native shutdown. Once processing may have
    // begun, bridge absence/rejection/false must remain a visible failure.
    if (acknowledged && sequence === withdrawalSequence) nativeRevenueCatMayBeActive = false;
    const status: RevenueCatWithdrawalStatus = acknowledged || !nativeStopRequired
      ? { state: 'stopped', error: null }
      : { state: 'failed', error: 'RevenueCat could not confirm that native processing stopped. Please retry.' };
    if (sequence === withdrawalSequence) publishWithdrawalStatus(status);
    return status;
  });
  revenueCatWithdrawal = operation;
  return operation;
}

export function settleRevenueCatWithdrawal(): Promise<RevenueCatWithdrawalStatus> { return revenueCatWithdrawal; }
export function retryRevenueCatWithdrawal(): Promise<RevenueCatWithdrawalStatus> {
  return getProcessingAccess().revenueCat.allowed ? Promise.resolve(withdrawalStatus) : requestRevenueCatWithdrawal();
}

function initializeRevenueCat(): Promise<void> {
  if (!supported || !revenueCatKey || tracker || !getProcessingAccess().revenueCat.allowed) return Promise.resolve();
  if (revenueCatInit) return revenueCatInit;
  const epoch = revenueCatEpoch;
  revenueCatInit = (async () => {
    try {
      let withdrawal = await revenueCatWithdrawal;
      if (withdrawal.state === 'failed') withdrawal = await requestRevenueCatWithdrawal();
      if (withdrawal.state === 'failed') return;
      if (epoch !== revenueCatEpoch || !getProcessingAccess().revenueCat.allowed) return;
      // A configured native SDK remains allocated during withdrawal. Reopening
      // its fence can resume native work before this bridge promise resolves.
      // Track that possibility before awaiting the acknowledgement.
      if (revenueCatConfigured) nativeRevenueCatMayBeActive = true;
      if (!await setNativeRevenueCatProcessing(true)) {
        if (nativeRevenueCatMayBeActive) await requestRevenueCatWithdrawal();
        return;
      }
      if (epoch !== revenueCatEpoch || !getProcessingAccess().revenueCat.allowed) {
        await requestRevenueCatWithdrawal();
        return;
      }
      const sdk = require('react-native-purchases') as PurchasesSdk;
      // Mark before configure: a throw may occur after native startup began.
      ++withdrawalSequence; // Older acknowledgements cannot overwrite this activation.
      nativeRevenueCatMayBeActive = true;
      publishWithdrawalStatus({ state: 'not-requested', error: null });
      revenueCatWithdrawal = Promise.resolve(withdrawalStatus);
      if (!revenueCatConfigured) {
        sdk.default.configure({
          apiKey: revenueCatKey,
          automaticDeviceIdentifierCollectionEnabled: false,
          diagnosticsEnabled: false,
          shouldShowInAppMessagesAutomatically: false,
        });
        revenueCatConfigured = true;
      }
      tracker = sdk.default.adTracker;
    } catch {
      await requestRevenueCatWithdrawal();
    } finally {
      revenueCatInit = null;
      if (epoch !== revenueCatEpoch && getProcessingAccess().revenueCat.allowed) void initializeRevenueCat();
    }
  })();
  return revenueCatInit;
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
  await settleResultPresentations();
  const presentation = privacyPresentation;
  if (presentation) {
    try { await presentation; } catch { /* Consent failure does not prevent playing. */ }
  }
}

// Only lobby focus can start consent setup. The game-entry barrier also covers
// a native form that has already begun loading when the user selects Play.
export function prepareMonetization(canPresent: () => boolean): Promise<void> {
  // Analytics permission is independent of ad eligibility and UMP. This also
  // covers loading this module after a permitted decision was already restored.
  // Its own native fence/generation checks apply without delaying gameplay.
  void initializeRevenueCat();
  if (init) return init;
  const access = getProcessingAccess();
  if (!access.ads.allowed) return Promise.resolve();
  const sdk = loadAdsSdk();
  if (!sdk) return Promise.resolve();
  adsReady = false; // Revalidate prior permission before any new request.
  disposeResultAds();
  const epoch = consentEpoch;
  init = (async () => {
    try {
      const info = await bounded(sdk.AdsConsent.requestInfoUpdate({ tagForUnderAgeOfConsent: access.ads.underAgeOfConsent }));
      if (!currentAdPermission(epoch)) return;
      privacyRequired = info.privacyOptionsRequirementStatus === sdk.AdsConsentPrivacyOptionsRequirementStatus.REQUIRED;
      notifyPrivacy();
      await settleResultPresentations();
      if (!currentAdPermission(epoch) || !canPresent() || !adEnvironment.isActive()) return;
      const consent = await presentPrivacy(() => sdk.AdsConsent.loadAndShowConsentFormIfRequired());
      if (!currentAdPermission(epoch)) return;
      privacyRequired = consent.privacyOptionsRequirementStatus === sdk.AdsConsentPrivacyOptionsRequirementStatus.REQUIRED;
      notifyPrivacy();
      if (!consent.canRequestAds) { adsReady = false; return; }
      // No IDFA collection, personalized requests, health or competition attributes.
      await bounded(sdk.default().setRequestConfiguration({ maxAdContentRating: sdk.MaxAdContentRating.PG, ageRestrictedTreatment: access.ads.treatment as AgeRestrictedTreatment }));
      if (!currentAdPermission(epoch)) return;
      void initializeRevenueCat();
      await bounded(sdk.default().initialize());
      if (currentAdPermission(epoch)) adsReady = true;
    } catch {
      if (epoch === consentEpoch) adsReady = false;
    } finally {
      init = null;
    }
  })();
  return init;
}

export async function showAdPrivacyOptions(): Promise<void> {
  const sdk = ads ?? (getProcessingAccess().ads.allowed ? loadAdsSdk() : null);
  if (!sdk || !adEnvironment.isActive()) return;
  if (privacyPresentation) { await privacyPresentation; return; }
  adsReady = false;
  const epoch = ++consentEpoch; // Invalidate old ads and in-flight initialization.
  const access = getProcessingAccess();
  disposeResultAds();
  try {
    await settleResultPresentations();
    if (epoch !== consentEpoch || !adEnvironment.isActive()) return;
    const consent = await presentPrivacy(() => sdk.AdsConsent.showPrivacyOptionsForm());
    if (epoch !== consentEpoch) return;
    privacyRequired = consent.privacyOptionsRequirementStatus === sdk.AdsConsentPrivacyOptionsRequirementStatus.REQUIRED;
    notifyPrivacy();
    if (consent.canRequestAds && currentAdPermission(epoch)) {
      // This can be the first allowed initialization after a denied/failed startup.
      await bounded(sdk.default().setRequestConfiguration({ maxAdContentRating: sdk.MaxAdContentRating.PG, ageRestrictedTreatment: access.ads.treatment as AgeRestrictedTreatment }));
      if (!currentAdPermission(epoch)) return;
      void initializeRevenueCat();
      await bounded(sdk.default().initialize());
      if (currentAdPermission(epoch)) adsReady = true;
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
  const epoch = revenueCatEpoch;
  const access = getProcessingAccess();
  if (!current || !access.revenueCat.allowed) return;
  // Recheck at dispatch as well as at the ad callback. A refusal in this turn
  // must discard queued reports rather than send them with yesterday's grant.
  void Promise.resolve().then(() => {
    const latest = getProcessingAccess();
    if (tracker !== current || !latest.revenueCat.allowed || revenueCatEpoch !== epoch) return;
    return send(current);
  }).catch(() => undefined);
}

export function prepareResultInterstitial(): ReadyInterstitial | null {
  const sdk = ads;
  const access = getProcessingAccess();
  if (!supported || !sdk || !adsReady || mode === 'off' || !access.ads.allowed || resultPresentations.size > 0) return null;
  const adUnitId = mode === 'live' ? liveUnit : sdk.TestIds.INTERSTITIAL;
  if (!adUnitId) return null;
  const epoch = consentEpoch;
  const impressionId = `ff-${Date.now().toString(36)}-${(++impressionSequence).toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  const base = { mediatorName: 'AdMob', adFormat: 'interstitial', placement: 'result_exit', adUnitId, impressionId };
  let loaded = false;
  let invalidated = false;
  let released = false;
  let shown = false;
  let opened = false;
  let terminal = false;
  let callbacks: InterstitialCallbacks | null = null;
  let acknowledgePresentation: (() => void) | undefined;
  let release: (() => void) | undefined;
  try {
    const ad = sdk.InterstitialAd.createForAdRequest(adUnitId, { requestNonPersonalizedAdsOnly: true, networkExtras: { rdp: '1' } });
    const destroy = () => {
      if (released) return;
      released = true;
      activeResultAds.delete(dispose);
      try { ad.destroy(); } catch { /* Confirmed native completion still releases the result. */ }
    };
    const dispose = () => {
      invalidated = true;
      loaded = false;
      // destroy() removes the native delegate and JS listeners; it is NOT a
      // cancellation/dismissal acknowledgement. Keep terminal callbacks alive
      // after native handoff, but reject reuse and optional reporting at once.
      if (!shown || terminal) destroy();
    };
    const finish = (outcome: 'closed' | 'failed') => {
      if (terminal || released) return;
      terminal = true;
      invalidated = true;
      loaded = false;
      const pending = callbacks;
      callbacks = null;
      destroy();
      acknowledgePresentation?.();
      acknowledgePresentation = undefined;
      pending?.[outcome]();
    };
    release = dispose;
    activeResultAds.add(dispose);
    ad.addAdEventListener(sdk.AdEventType.LOADED, () => {
      if (invalidated || released || shown) return;
      loaded = true;
      track((value) => value.trackAdLoaded(base));
    });
    ad.addAdEventListener(sdk.AdEventType.OPENED, () => {
      if (released || !shown || opened) return;
      opened = true;
      if (!invalidated) track((value) => value.trackAdDisplayed(base));
      // Lifecycle accounting must survive withdrawal; this sends no analytics.
      callbacks?.opened();
    });
    ad.addAdEventListener(sdk.AdEventType.CLICKED, () => {
      if (!invalidated && !released) track((value) => value.trackAdOpened(base));
    });
    ad.addAdEventListener(sdk.AdEventType.PAID, (payload) => {
      if (invalidated || released) return;
      const revenue = toRevenueData(base, payload as unknown as PaidEvent);
      if (revenue) track((value) => value.trackAdRevenue(revenue));
    });
    ad.addAdEventListener(sdk.AdEventType.ERROR, () => {
      if (released) return;
      if (!shown && !invalidated) track((value) => value.trackAdFailedToLoad({ mediatorName: base.mediatorName, adFormat: base.adFormat, placement: base.placement, adUnitId }));
      // On this one-shot request, an error after show is the native full-screen
      // presentation failure callback. Disposal never synthesizes this event.
      finish('failed');
    });
    ad.addAdEventListener(sdk.AdEventType.CLOSED, () => { if (shown) finish('closed'); });
    ad.load();
    return {
      isReady: () => loaded && !invalidated && !released && !shown && adsReady && currentAdPermission(epoch) && resultPresentations.size === 0,
      show: async (next) => {
        if (!loaded || invalidated || released || shown || !adsReady || !currentAdPermission(epoch) || !adEnvironment.isActive() || resultPresentations.size > 0) { next.failed(); return; }
        shown = true;
        loaded = false;
        callbacks = next;
        const presentation = new Promise<void>((resolve) => {
          acknowledgePresentation = () => { resultPresentations.delete(presentation); resolve(); };
        });
        resultPresentations.add(presentation);
        try {
          await ad.show();
          // This promise resolves as soon as native present() is invoked.
          // Only CLOSED/ERROR may settle a successfully handed-off presentation.
        } catch {
          // The locked SDK rejects before present() (not-ready/no controller),
          // or JS validation throws before dispatch. Neither can present later.
          finish('failed');
        }
      },
      dispose,
    };
  } catch {
    try { release?.(); } catch { /* A failed request still returns the no-ad path. */ }
    return null;
  }
}
