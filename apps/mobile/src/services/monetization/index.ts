import Constants, { ExecutionEnvironment } from 'expo-constants';
import { AppState, NativeModules, Platform } from 'react-native';
import type { AgeRestrictedTreatment, PaidEvent } from 'react-native-google-mobile-ads';
import type { AdRevenueData, PurchasesAdTracker } from 'react-native-purchases';
import { holdGameplayActivity, isGameplayActive } from '../gameplayActivity';
import { ResultAdGate, type InterstitialCallbacks, type ReadyInterstitial } from './resultAdGate';
import { getAgeVerificationRevision, getProcessingAccess, getProcessingInputs, subscribeProcessingAccess } from '../privacy/processingAccess';
import { getUmpPrivacyControls } from '../privacy/umpPrivacyControls';
import { createRevenueCatTestDiagnostics, type RevenueCatTestDiagnosticKind } from './revenueCatTestDiagnostics';
import { createAdDeliveryDiagnostics } from './adDeliveryDiagnostics';

type AdsSdk = typeof import('react-native-google-mobile-ads');
type PurchasesSdk = typeof import('react-native-purchases');
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const supported = !isExpoGo && (Platform.OS === 'ios' || Platform.OS === 'android');
export const adDeliveryDiagnosticsEnabled = Platform.OS === 'ios' &&
  String(Constants.platform?.ios?.buildNumber ?? Constants.expoConfig?.ios?.buildNumber) === '7';
const adDeliveryDiagnostics = createAdDeliveryDiagnostics(adDeliveryDiagnosticsEnabled);
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
let menuPreparedEpoch: number | null = null;
function setAdsReady(value: boolean) {
  adsReady = value;
  if (!value) menuPreparedEpoch = null;
}
let initFromMenu = false;
let privacyRequired = false;
let privacyStatusRevision = 0;
let privacyOptionsRequest: Promise<void> | null = null;
let privacyOptionsEpoch: number | null = null;
let init: Promise<void> | null = null;
let initEpoch: number | null = null;
let consentEpoch = 0;
let presentationIntentEpoch = 0;
let launchPreparation: Promise<void> | null = null;
let privacyPresentation: Promise<unknown> | null = null;
let privacyPresentationEpoch: number | null = null;
let impressionSequence = 0;
let mandatoryAppleRequest: Promise<void> | null = null;
let mandatoryAppleAttemptRevision: number | null = null;
let processingAccess = getProcessingAccess();
let revenueCatEpoch = 0;
let revenueCatDiagnosticIdentity: string | null = null;
const revenueCatTestDiagnostics = createRevenueCatTestDiagnostics(() => ({
  adsMode: mode,
  revenueCatPermitted: getProcessingAccess().revenueCat.allowed,
  generation: revenueCatEpoch,
  appVersion: Constants.expoConfig?.version,
  buildNumber: Constants.platform?.ios?.buildNumber ?? Constants.expoConfig?.ios?.buildNumber,
}));
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
    if (!next.ads.allowed) ++presentationIntentEpoch;
    ++consentEpoch;
    setAdsReady(false);
    disposeResultAds();
  }
  if (!sameAnalytics) {
    ++revenueCatEpoch;
    tracker = null;
    revenueCatDiagnosticIdentity = null;
    if (!next.revenueCat.allowed) {
      // Native transport cancellation and persistent-event purge are required;
      // clearing the JavaScript tracker alone cannot stop an initialized SDK.
      void requestRevenueCatWithdrawal();
    }
  }
});

function currentAdPermission(epoch: number) {
  return getProcessingAccess().ads.allowed && epoch === consentEpoch;
}
export const resultAdGate = new ResultAdGate();
export const isMonetizationPrepared = () => adsReady;
export function getAdDeliveryDiagnosticReport(): string {
  const access = getProcessingAccess();
  return adDeliveryDiagnostics.report({
    'Ad mode': mode, 'Native runtime supported': supported, 'Ad unit configured': Boolean(liveUnit),
    'App permits ads': access.ads.allowed, 'Ad SDK loaded': Boolean(ads), 'Ad SDK ready': adsReady,
    'RevenueCat permitted': access.revenueCat.allowed, 'RevenueCat tracker ready': Boolean(tracker),
    'Workout active': isGameplayActive(), 'Result ads retained': String(activeResultAds.size),
  });
}
export const adEnvironment = {
  isActive: () => AppState.currentState === 'active',
  onActive: (callback: () => void) => {
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') callback(); });
    return () => subscription.remove();
  },
};

/** Called by a saved choice while its menu is still open. No foreground or
 * gameplay listener restarts preparation, and required forms keep their existing
 * explicit setup owner. This refresh never requests an interstitial. */
export function refreshMonetizationFromChoices(canPresent: () => boolean): Promise<void> {
  return preparePermittedMonetization(canPresent, true);
}

/** Recovery belongs only to a still-visible, unclaimed result. Read current UMP
 * permission without presenting a form; never wait for inventory on an exit. */
export function refreshMonetizationForResult(isCurrentResult: () => boolean): Promise<void> {
  return preparePermittedMonetization(isCurrentResult, true);
}

function notifyPrivacy() { privacyListeners.forEach((listener) => listener()); }
export function subscribeAdPrivacy(listener: () => void) {
  privacyListeners.add(listener);
  return () => { privacyListeners.delete(listener); };
}
export function isAdPrivacyRequired() { return privacyRequired; }
function publishPrivacyRequirement(required: boolean | null) {
  ++privacyStatusRevision;
  if (required === null) return; // Uncertainty cannot remove a known rights entry.
  privacyRequired = required;
  notifyPrivacy();
}

/** Read-only recovery of Google's existing rights entry, including after a cold
 * start with ads ineligible. This is not a fresh advertising consent decision. */
export async function refreshAdPrivacyRequirement(): Promise<void> {
  const controls = getUmpPrivacyControls();
  if (!controls) return;
  const revision = ++privacyStatusRevision;
  try {
    const info = await bounded(controls.getConsentInfo());
    if (revision === privacyStatusRevision) publishPrivacyRequirement(info.required);
  } catch { /* Keep any known required entry usable after a failed status read. */ }
}

function loadAdsSdk(): AdsSdk | null {
  if (!supported || mode === 'off') return null;
  // Runtime require is deliberate. Expo Go must never evaluate this native SDK.
  try { ads ??= require('react-native-google-mobile-ads') as AdsSdk; }
  catch (error) { adDeliveryDiagnostics.error('Load ad SDK', error); return null; }
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

function prepareRevenueCatTestIdentity(sdk: PurchasesSdk, epoch: number): void {
  // This cached SDK identity read is optional local test instrumentation. It
  // never delays SDK readiness or permits processing on a missing decision.
  if (mode !== 'test' || epoch !== revenueCatEpoch || !getProcessingAccess().revenueCat.allowed) return;
  const current = tracker;
  const recordConfigured = (appUserID?: string) => {
    if (tracker !== current || epoch !== revenueCatEpoch || !getProcessingAccess().revenueCat.allowed) return;
    revenueCatDiagnosticIdentity = appUserID ?? null;
    revenueCatTestDiagnostics.record({ kind: 'configured', generation: epoch, appUserID });
  };
  try {
    if (typeof sdk.default.getAppUserID !== 'function') { recordConfigured(); return; }
    void sdk.default.getAppUserID().then(recordConfigured, () => recordConfigured()).catch(() => undefined);
  } catch { recordConfigured(); }
}

function initializeRevenueCat(canPrepare: () => boolean): Promise<void> {
  if (isGameplayActive() || !canPrepare() || !supported || !revenueCatKey || tracker || !getProcessingAccess().revenueCat.allowed) return Promise.resolve();
  // A candidate without the native pause bridge cannot start optional reporting.
  if (typeof NativeModules.RNPurchases?.flapFitSetNetworkPaused !== 'function') return Promise.resolve();
  if (revenueCatInit) return revenueCatInit;
  const epoch = revenueCatEpoch;
  revenueCatInit = (async () => {
    try {
      let withdrawal = await revenueCatWithdrawal;
      if (withdrawal.state === 'failed') withdrawal = await requestRevenueCatWithdrawal();
      if (withdrawal.state === 'failed') return;
      if (!canPrepare() || epoch !== revenueCatEpoch || !getProcessingAccess().revenueCat.allowed) return;
      // A configured native SDK remains allocated during withdrawal. Reopening
      // its fence can resume native work before this bridge promise resolves.
      // Track that possibility before awaiting the acknowledgement.
      if (revenueCatConfigured) nativeRevenueCatMayBeActive = true;
      if (!await setNativeRevenueCatProcessing(true)) {
        if (nativeRevenueCatMayBeActive) await requestRevenueCatWithdrawal();
        return;
      }
      if (!canPrepare() || epoch !== revenueCatEpoch || !getProcessingAccess().revenueCat.allowed) {
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
      prepareRevenueCatTestIdentity(sdk, epoch);
    } catch (error) {
      adDeliveryDiagnostics.error('RevenueCat setup', error);
      await requestRevenueCatWithdrawal();
    } finally {
      revenueCatInit = null;
    }
  })();
  return revenueCatInit;
}

const nativeSdkSetup = new Set<Promise<unknown>>();
function trackNativeSdkSetup<T>(operation: Promise<T>): Promise<T> {
  nativeSdkSetup.add(operation);
  void operation.then(() => nativeSdkSetup.delete(operation), () => nativeSdkSetup.delete(operation));
  return operation;
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
  privacyPresentationEpoch = consentEpoch;
  return presentation.finally(() => {
    if (privacyPresentation === presentation) { privacyPresentation = null; privacyPresentationEpoch = null; }
  });
}

export async function settlePrivacyBeforeGameplay(): Promise<void> {
  ++presentationIntentEpoch;
  ++consentEpoch; // A pending info request may finish, but must never start a new form.
  disposeResultAds();
  await settleResultPresentations();
  const presentation = privacyPresentation;
  if (presentation) {
    try { await presentation; } catch { /* Consent failure does not prevent playing. */ }
  }
  // An already-dispatched native initialization must settle before the camera
  // mounts. Invalidated info requests cannot dispatch any further SDK work.
  await Promise.allSettled([...nativeSdkSetup, ...(revenueCatInit ? [revenueCatInit] : [])]);
}

let gameplayTransition: Promise<void> = Promise.resolve();
function syncRevenueCatGameplayPause(): Promise<void> {
  const operation = gameplayTransition.catch(() => undefined).then(async () => {
    if (!nativeRevenueCatMayBeActive) return;
    const apply = NativeModules.RNPurchases?.flapFitSetNetworkPaused;
    if (typeof apply !== 'function' || (await apply(isGameplayActive())) !== true) {
      throw new Error('Reporting pause could not be confirmed.');
    }
  });
  gameplayTransition = operation;
  return operation;
}
/** Called before camera admission, never from the pose loop. A pause preserves
 * consent and pending ad events; only real withdrawal may purge those events. */
export async function pauseOptionalWorkForGameplay(): Promise<() => void> {
  await settlePrivacyBeforeGameplay();
  const release = holdGameplayActivity();
  try { await syncRevenueCatGameplayPause(); }
  catch (error) { release(); throw error; }
  let ended = false;
  return () => {
    if (ended) return;
    ended = true;
    release();
    // A failed resume leaves reporting paused; it must not block result actions.
    void syncRevenueCatGameplayPause().catch(() => undefined);
  };
}

// Explicit result/rights/competition callers share native presentation ownership.
// The game-entry barrier also waits for an already-presented native form.
/** React to effective processing changes after Apple/status/consent resolution,
 * not every raw store revision. No returned field contains an age or identifier. */
export function getLobbyPrivacyKey(): string {
  const input = getProcessingInputs();
  const access = getProcessingAccess();
  return [input.appleRequirement, Boolean(input.verification?.mandatoryCheckSatisfied),
    access.ads.allowed, access.ads.treatment, access.ads.underAgeOfConsent,
    access.revenueCat.allowed, ...(input.launch ? [input.launch.country ?? '', input.launch.current] : [])].join(':');
}

export function prepareMonetization(canPresent: () => boolean, options: { requiredOnly?: boolean; eligibilityOnly?: boolean } = {}): Promise<void> {
  if (options.requiredOnly) return prepareExistingMonetization(canPresent, true);
  if (!getProcessingInputs().launch || !supported || Platform.OS !== 'ios') {
    return options.eligibilityOnly ? Promise.resolve() : prepareExistingMonetization(canPresent);
  }
  const intent = presentationIntentEpoch;
  const current = () => intent === presentationIntentEpoch && canPresent() && adEnvironment.isActive();
  if (!launchPreparation) {
    const operation = Promise.resolve().then(async () => {
      await settleResultPresentations();
      if (privacyOptionsRequest) { try { await privacyOptionsRequest; } catch { /* Recheck ownership below. */ } }
      if (init) { try { await init; } catch { /* A failed SDK startup grants nothing. */ } }
      if (privacyPresentation) { try { await privacyPresentation; } catch { /* Recheck ownership below. */ } }
      if (!current()) return;
      const control = require('../privacy/launchProcessingControl') as typeof import('../privacy/launchProcessingControl');
      await control.prepareLaunchProcessing({ canPresent: current, present: presentPrivacy });
    });
    launchPreparation = operation.finally(() => { launchPreparation = null; });
  }
  return launchPreparation.then(async () => {
    if (!current()) return;
    // A newly focused caller may have joined an older native request that became
    // stale while backgrounded. The deduped controller retries only a fresh key,
    // preserving refusal/error suppression for the unchanged request.
    const control = require('../privacy/launchProcessingControl') as typeof import('../privacy/launchProcessingControl');
    await control.prepareLaunchProcessing({ canPresent: current, present: presentPrivacy });
    if (!current() || options.eligibilityOnly) return;
    const launch = getProcessingInputs().launch;
    // A resolved-country flow owns this Apple attempt, including refusal/error.
    // Never immediately fall back to a second mandatory system request.
    return launch?.current && launch.country ? preparePermittedMonetization(canPresent) : prepareExistingMonetization(canPresent);
  });
}
/** Competition is an independently requested service. It can establish current
 * eligibility without a workout, advertising notice, Google form or RC setup. */
export async function prepareCompetitionEligibility(canPresent: () => boolean): Promise<void> {
  const intent = presentationIntentEpoch;
  const current = () => intent === presentationIntentEpoch && canPresent() && adEnvironment.isActive() &&
    getProcessingInputs().choices.competition.decision === 'granted';
  if (!current()) return;
  const startup = require('../privacy/privacyStartup') as typeof import('../privacy/privacyStartup');
  const country = require('../privacy/privacyCountry') as typeof import('../privacy/privacyCountry');
  await country.refreshPrivacyCountry();
  if (!current()) return;
  const input = getProcessingInputs();
  if (!input.hydrated || input.appleRequirement === 'pending' || input.appleRequirement === 'error') {
    await startup.preparePrivacyStartup();
  }
  if (current()) await prepareMonetization(current, { eligibilityOnly: true });
}
function prepareExistingMonetization(canPresent: () => boolean, requiredOnly = false): Promise<void> {
  const input = getProcessingInputs();
  if (input.appleRequirement === 'required' && !input.verification?.mandatoryCheckSatisfied) {
    if (mandatoryAppleRequest) return mandatoryAppleRequest;
    if (!supported || Platform.OS !== 'ios' || mandatoryAppleAttemptRevision === getAgeVerificationRevision()) return Promise.resolve();
    const epoch = consentEpoch;
    const operation = (async () => {
      await settleResultPresentations();
      if (privacyOptionsRequest) {
        try { await privacyOptionsRequest; } catch { /* Rights failure grants nothing. */ }
      }
      if (privacyPresentation) {
        try { await privacyPresentation; } catch { /* Recheck ownership below. */ }
      }
      if (epoch !== consentEpoch || !canPresent() || !adEnvironment.isActive()) return;
      const current = getProcessingInputs();
      if (current.appleRequirement !== 'required' || current.verification?.mandatoryCheckSatisfied) return;
      const control = require('../privacy/appleAgeControl') as typeof import('../privacy/appleAgeControl');
      const result = await presentPrivacy(() => control.requestAppleAgeEvidence());
      if (result.status === 'stale') return;
      // No repeated automatic sheet on each lobby return after a refusal/error.
      // A new launch or an explicit account/duty invalidation permits a new check.
      mandatoryAppleAttemptRevision = getAgeVerificationRevision();
      if (!requiredOnly && epoch === consentEpoch && canPresent() && adEnvironment.isActive()) {
        await preparePermittedMonetization(canPresent);
      }
    })().catch(() => undefined);
    mandatoryAppleRequest = operation;
    void operation.then(() => { if (mandatoryAppleRequest === operation) mandatoryAppleRequest = null; });
    return operation;
  }
  return requiredOnly ? Promise.resolve() : preparePermittedMonetization(canPresent);
}

/** A new effective policy may arrive while an older setup/form is finishing.
 * Resume once under the latest policy, but never retry an unchanged failure or
 * reopen privacy after a later game-entry/withdrawal invalidates this waiter. */
function resumeAfterPreparation(pending: Promise<unknown>, ownedEpoch: number | null, canPresent: () => boolean, fromMenu = false, resumeExplicitly = false): Promise<void> {
  const waitingEpoch = consentEpoch;
  return pending.catch(() => undefined).then(() => {
    if ((resumeExplicitly || (ownedEpoch !== null && ownedEpoch !== waitingEpoch)) && waitingEpoch === consentEpoch &&
      canPresent() && adEnvironment.isActive() && getProcessingAccess().ads.allowed && !adsReady) {
      return preparePermittedMonetization(canPresent, fromMenu);
    }
  });
}

function preparePermittedMonetization(canPresent: () => boolean, fromMenu = false): Promise<void> {
  const intent = presentationIntentEpoch;
  const current = () => !isGameplayActive() && intent === presentationIntentEpoch && canPresent() && adEnvironment.isActive();
  if (!current()) return Promise.resolve();
  // Only a menu/setup or visible-result owner starts providers. Global listeners
  // may stop revoked processing, but cannot start work during a camera run.
  void initializeRevenueCat(current);
  // A lobby focus change must not launch a second UMP form while the existing
  // settings request owns native presentation (or is checking its status).
  if (privacyOptionsRequest) return resumeAfterPreparation(privacyOptionsRequest, privacyOptionsEpoch, canPresent, fromMenu);
  if (init) return resumeAfterPreparation(init, initEpoch, canPresent, fromMenu, !fromMenu && initFromMenu);
  if (privacyPresentation) return resumeAfterPreparation(privacyPresentation, privacyPresentationEpoch, canPresent, fromMenu);
  const access = getProcessingAccess();
  if (!access.ads.allowed || (adsReady && (fromMenu || menuPreparedEpoch === consentEpoch))) return Promise.resolve();
  const sdk = loadAdsSdk();
  if (!sdk) return Promise.resolve();
  setAdsReady(false); // Revalidate prior permission before any new request.
  disposeResultAds();
  const epoch = consentEpoch;
  initEpoch = epoch;
  initFromMenu = fromMenu;
  init = (async () => {
    let stage = 'Google consent update';
    try {
      adDeliveryDiagnostics.stage(stage);
      const info = await bounded(sdk.AdsConsent.requestInfoUpdate({ tagForUnderAgeOfConsent: access.ads.underAgeOfConsent }));
      adDeliveryDiagnostics.consent(info.canRequestAds);
      if (!currentAdPermission(epoch) || !current()) return;
      publishPrivacyRequirement(info.privacyOptionsRequirementStatus === sdk.AdsConsentPrivacyOptionsRequirementStatus.REQUIRED);
      await settleResultPresentations();
      if (!currentAdPermission(epoch) || !current()) return;
      stage = fromMenu ? 'Google consent status' : 'Google consent form';
      adDeliveryDiagnostics.stage(stage);
      const consent = fromMenu ? info : await presentPrivacy(() => sdk.AdsConsent.loadAndShowConsentFormIfRequired());
      adDeliveryDiagnostics.consent(consent.canRequestAds);
      if (!currentAdPermission(epoch) || !current()) return;
      publishPrivacyRequirement(consent.privacyOptionsRequirementStatus === sdk.AdsConsentPrivacyOptionsRequirementStatus.REQUIRED);
      if (!consent.canRequestAds) { setAdsReady(false); return; }
      // UMP does not forward TFUA to the ad SDK. Google maps under-consent-age
      // treatment to CHILD; TEEN alone does not provide those protections.
      // No IDFA collection, personalized requests, health or competition attributes.
      stage = 'Google request configuration';
      adDeliveryDiagnostics.stage(stage);
      await bounded(trackNativeSdkSetup(sdk.default().setRequestConfiguration({ maxAdContentRating: sdk.MaxAdContentRating.PG, ageRestrictedTreatment: (access.ads.underAgeOfConsent ? 'child' : access.ads.treatment) as AgeRestrictedTreatment })));
      if (!currentAdPermission(epoch) || !current()) return;
      void initializeRevenueCat(current);
      stage = 'Google SDK initialization';
      adDeliveryDiagnostics.stage(stage);
      await bounded(trackNativeSdkSetup(sdk.default().initialize()));
      if (currentAdPermission(epoch) && current()) {
        menuPreparedEpoch = fromMenu ? epoch : null;
        setAdsReady(true);
        adDeliveryDiagnostics.stage('Ready');
      }
    } catch (error) {
      adDeliveryDiagnostics.error(stage, error);
      if (epoch === consentEpoch) setAdsReady(false);
    } finally {
      init = null;
      initEpoch = null;
    }
  })();
  return init;
}

export function showAdPrivacyOptions(canPresent: () => boolean = () => true): Promise<void> {
  if (privacyOptionsRequest) return privacyOptionsRequest;
  const operation = openAdPrivacyOptions(canPresent);
  privacyOptionsRequest = operation;
  privacyOptionsEpoch = privacyPresentation ? privacyPresentationEpoch : consentEpoch;
  const finished = () => {
    if (privacyOptionsRequest === operation) { privacyOptionsRequest = null; privacyOptionsEpoch = null; }
  };
  void operation.then(finished, finished);
  return operation;
}

async function openAdPrivacyOptions(canPresent: () => boolean): Promise<void> {
  const intent = ++presentationIntentEpoch;
  const current = () => intent === presentationIntentEpoch && canPresent() && adEnvironment.isActive();
  if (!adEnvironment.isActive() || !canPresent()) return;
  if (privacyPresentation) { await privacyPresentation; return; }
  setAdsReady(false);
  const epoch = ++consentEpoch; // Invalidate old ads and in-flight initialization.
  disposeResultAds();
  try {
    await settleResultPresentations();
    if (epoch !== consentEpoch || !adEnvironment.isActive() || !canPresent()) return;
    const controls = getUmpPrivacyControls();
    let consent: { required: boolean | null; canRequestAds: boolean };
    if (controls) {
      const info = await bounded(controls.getConsentInfo());
      if (epoch !== consentEpoch || !adEnvironment.isActive() || !canPresent()) return;
      publishPrivacyRequirement(info.required);
      if (info.required === null) throw new Error('Privacy requirement is unavailable');
      // A stale visible row can become NOT_REQUIRED before the tap is handled.
      // Reuse Google's current permission so that this no-form path does not
      // leave otherwise eligible advertising disabled by the invalidation above.
      consent = info.required ? await presentPrivacy(() => controls.showPrivacyOptionsForm()) : info;
    } else {
      // Compatibility with older supported native builds. A missing bridge may
      // never cause an ineligible session to evaluate or start the ad SDK.
      const sdk = ads ?? (getProcessingAccess().ads.allowed ? loadAdsSdk() : null);
      if (!sdk) throw new Error('Privacy controls are unavailable');
      const info = await presentPrivacy(() => sdk.AdsConsent.showPrivacyOptionsForm());
      consent = {
        required: info.privacyOptionsRequirementStatus === sdk.AdsConsentPrivacyOptionsRequirementStatus.REQUIRED,
        canRequestAds: info.canRequestAds,
      };
    }
    if (epoch !== consentEpoch) return;
    publishPrivacyRequirement(consent.required);
    if (consent.canRequestAds && currentAdPermission(epoch) && current()) {
      const sdk = loadAdsSdk();
      if (!sdk) return;
      const access = getProcessingAccess();
      // Reapply the independent age/processing policy before any initialization.
      await bounded(trackNativeSdkSetup(sdk.default().setRequestConfiguration({ maxAdContentRating: sdk.MaxAdContentRating.PG, ageRestrictedTreatment: (access.ads.underAgeOfConsent ? 'child' : access.ads.treatment) as AgeRestrictedTreatment })));
      if (!currentAdPermission(epoch) || !current()) return;
      void initializeRevenueCat(current);
      await bounded(trackNativeSdkSetup(sdk.default().initialize()));
      if (currentAdPermission(epoch) && current()) setAdsReady(true);
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

function track(kind: RevenueCatTestDiagnosticKind, impressionId: string, send: (value: PurchasesAdTracker) => Promise<void>) {
  const current = tracker;
  const epoch = revenueCatEpoch;
  const access = getProcessingAccess();
  if (!current || !access.revenueCat.allowed) return;
  // Recheck at dispatch as well as at the ad callback. A refusal in this turn
  // must discard queued reports rather than send them with yesterday's grant.
  void Promise.resolve().then(() => {
    const latest = getProcessingAccess();
    if (tracker !== current || !latest.revenueCat.allowed || revenueCatEpoch !== epoch) return;
    const sent = send(current);
    revenueCatTestDiagnostics.record({ kind, generation: epoch, appUserID: revenueCatDiagnosticIdentity, impressionId });
    return sent;
  }).catch(() => undefined);
}

export function prepareResultInterstitial(): ReadyInterstitial | null {
  if (isGameplayActive()) return null;
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
      adDeliveryDiagnostics.count('loaded');
      track('ad_loaded', impressionId, (value) => value.trackAdLoaded(base));
    });
    ad.addAdEventListener(sdk.AdEventType.OPENED, () => {
      if (released || !shown || opened) return;
      opened = true;
      adDeliveryDiagnostics.count('opened');
      if (!invalidated) track('ad_displayed', impressionId, (value) => value.trackAdDisplayed(base));
      // Lifecycle accounting must survive withdrawal; this sends no analytics.
      callbacks?.opened();
    });
    ad.addAdEventListener(sdk.AdEventType.CLICKED, () => {
      if (!invalidated && !released) track('ad_clicked', impressionId, (value) => value.trackAdOpened(base));
    });
    ad.addAdEventListener(sdk.AdEventType.PAID, (payload) => {
      if (invalidated || released) return;
      const revenue = toRevenueData(base, payload as unknown as PaidEvent);
      if (revenue) track('ad_revenue', impressionId, (value) => value.trackAdRevenue(revenue));
    });
    ad.addAdEventListener(sdk.AdEventType.ERROR, (error) => {
      if (released) return;
      adDeliveryDiagnostics.count('failed');
      adDeliveryDiagnostics.error(shown ? 'Ad display' : 'Ad load', error);
      if (!shown && !invalidated) track('ad_failed_to_load', impressionId, (value) => value.trackAdFailedToLoad({ mediatorName: base.mediatorName, adFormat: base.adFormat, placement: base.placement, adUnitId }));
      // On this one-shot request, an error after show is the native full-screen
      // presentation failure callback. Disposal never synthesizes this event.
      finish('failed');
    });
    ad.addAdEventListener(sdk.AdEventType.CLOSED, () => { if (shown) finish('closed'); });
    adDeliveryDiagnostics.count('requested');
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
        } catch (error) {
          adDeliveryDiagnostics.count('failed');
          adDeliveryDiagnostics.error('Ad display', error);
          // The locked SDK rejects before present() (not-ready/no controller),
          // or JS validation throws before dispatch. Neither can present later.
          finish('failed');
        }
      },
      dispose,
    };
  } catch (error) {
    adDeliveryDiagnostics.count('failed');
    adDeliveryDiagnostics.error('Create ad request', error);
    try { release?.(); } catch { /* A failed request still returns the no-ad path. */ }
    return null;
  }
}
