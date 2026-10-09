import AsyncStorage from '@react-native-async-storage/async-storage';
import { isRegionalAdvertisingDisabled } from './regionalAdvertising';
import {
  beginProcessingChoice, getProcessingInputs, hydrateProcessingAccess, isProcessingChoiceCurrent, isCurrentProcessingSaveFailure,
  markProcessingNoticePresented, notifyProcessingChoiceIntent, setLaunchProcessingOptions, setProcessingChoice,
} from './processingAccess';
import { PROCESSING_NOTICE_VERSION, type Purpose } from './processingPolicy';
import { getAdvertisingWithdrawalState, resetAdvertisingWithdrawalConfirmation, withdrawAdvertisingConsent, getReportingWithdrawalState, resetReportingWithdrawalConfirmation, withdrawAdPerformanceReporting } from './privacyRights';

// Only the notice acknowledgement and specific function activations are stored.
// No age, jurisdiction, device, ad, or workout information belongs in this record.
const KEY = '@flapfit/processing-notice-v1';
type Notice = { version: number; acknowledged: boolean; adsActivated: boolean; reportingActivated: boolean; europeanReportingActivated?: boolean };
let saved: Notice = { version: PROCESSING_NOTICE_VERSION, acknowledged: false, adsActivated: false, reportingActivated: false };
let hydration: Promise<void> | null = null;
let writes: Promise<void> = Promise.resolve();
const pendingAllows: Partial<Record<'ads' | 'analytics', number>> = {};
export function isProcessingAllowPending(purpose: 'ads' | 'analytics'): boolean {
  const intent = pendingAllows[purpose];
  return intent !== undefined && isProcessingChoiceCurrent(purpose, intent);
}

export const AD_PROCESSING_DISCLOSURE = 'Google AdMob uses app and device information, IP address and approximate location, diagnostics, and ad interactions to deliver non-personalized ads. RevenueCat measures ad loads, views, clicks, and revenue using a separate random app ID and app/device information. Neither receives your camera footage, recordings, exercises, scores, or training history.';
// Full provider details remain in the linked policy and Info. This summary is
// notice wording, not express permission for additional processing purposes.
export const AD_PROCESSING_SUMMARY = 'We use app and device information to deliver ads and measure ad performance.';

export async function restoreProcessingNotice(): Promise<void> {
  // Notice caching must not suppress a retry of unreadable purpose choices.
  await hydrateProcessingAccess();
  if (!hydration) hydration = (async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      const value = raw ? JSON.parse(raw) : null;
      if (value?.version === PROCESSING_NOTICE_VERSION && value.acknowledged === true &&
          typeof value.adsActivated === 'boolean' && typeof value.reportingActivated === 'boolean') {
        saved = { version: PROCESSING_NOTICE_VERSION, acknowledged: true,
          adsActivated: value.adsActivated, reportingActivated: value.reportingActivated, europeanReportingActivated: value.europeanReportingActivated === true };
      }
    } catch { /* An unreadable acknowledgement grants nothing. */ }
  })();
  await hydration;
  applySavedNotice();
}

function applySavedNotice(): void {
  if (!saved.acknowledged) return;
  const input = getProcessingInputs();
  // Activations have their own provenance. A generic old grant is insufficient.
  if (input.launch) {
    const current = input.launch.options.quebecFunctionsActivated;
    const ads = saved.adsActivated && input.choices.ads.decision === 'granted' && input.choices.ads.noticeVersion === PROCESSING_NOTICE_VERSION;
    const analytics = saved.reportingActivated && input.choices.analytics.decision === 'granted' && input.choices.analytics.noticeVersion === PROCESSING_NOTICE_VERSION;
    const europeanReportingActivated = saved.europeanReportingActivated === true && analytics;
    if (current?.ads !== ads || current?.analytics !== analytics || input.launch.options.europeanReportingActivated !== europeanReportingActivated) {
      setLaunchProcessingOptions({ ...input.launch.options, quebecFunctionsActivated: { ads, analytics }, europeanReportingActivated });
    }
  }
  if (input.presentedNoticeVersion !== PROCESSING_NOTICE_VERSION) markProcessingNoticePresented(PROCESSING_NOTICE_VERSION);
}

export function isProcessingNoticeAcknowledged(): boolean { return saved.acknowledged; }

/** May be called only after the displayed disclosure's Continue/Save action.
 * This records a notice, not express purpose permission or eligibility. */
export function acknowledgeProcessingNotice(): Promise<void> {
  const operation = writes.catch(() => undefined).then(async () => {
    const next = { ...saved, acknowledged: true };
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
    saved = next;
    applySavedNotice();
  });
  writes = operation;
  return operation;
}

/** Independent, clearly labeled function activation. Country/age/Apple gates
 * still apply; this cannot satisfy an unresolved policy or parental authority. */
export async function allowProcessingPurpose(purpose: 'ads' | 'analytics'): Promise<void> {
  const intent = beginProcessingChoice(purpose);
  pendingAllows[purpose] = intent;
  notifyProcessingChoiceIntent();
  try {
    const current = () => isProcessingChoiceCurrent(purpose, intent);
    await restoreProcessingNotice();
    if (!current()) return;
    if (purpose === 'analytics') resetReportingWithdrawalConfirmation();
    else resetAdvertisingWithdrawalConfirmation();
    // Complete the supplementary notice write first. Publishing a purpose grant
    // before this write finishes can start a notice-based provider while the UI
    // still reports Allow pending. A prior refusal remains the durable choice
    // until the last required write succeeds.
    const operation = writes.catch(() => undefined).then(async () => {
      if (!current()) return;
      const next = { ...saved,
        ...(purpose === 'ads' ? { adsActivated: true } : { reportingActivated: true, europeanReportingActivated: getProcessingInputs().launch?.plan?.europeanReportingActivationRequired === true || saved.europeanReportingActivated === true }) };
      await AsyncStorage.setItem(KEY, JSON.stringify(next));
      if (current()) saved = next;
    });
    writes = operation;
    try {
      await operation;
      if (!current()) return;
      await setProcessingChoice(purpose, 'granted', intent);
      if (current()) applySavedNotice();
    } catch (error) {
      if (!current() && !isCurrentProcessingSaveFailure(error, purpose)) return; // Never withdraw a newer user action.
      if (purpose === 'analytics') await withdrawAdPerformanceReporting();
      else await setProcessingChoice(purpose, 'denied').catch(() => undefined);
      throw error;
    }
  } finally {
    if (pendingAllows[purpose] === intent) {
      delete pendingAllows[purpose];
      notifyProcessingChoiceIntent();
    }
  }
}

export async function refuseProcessingPurpose(purpose: 'ads' | 'analytics'): Promise<void> {
  if (purpose === 'analytics') {
    const result = await withdrawAdPerformanceReporting();
    if (result.status !== 'completed') throw new Error(
      `${result.saved ? 'Choice saved.' : 'Choice save not confirmed.'} ${result.nativeStopped
        ? 'Native reporting stopped.' : 'Native stop not confirmed.'} Use Retry stopping reporting.`);
  } else {
    const result = await withdrawAdvertisingConsent();
    if (result.status !== 'completed') throw new Error('Advertising refusal save not confirmed. New ad requests are blocked for this session. Use Retry saving privacy choice.');
  }
}

export function canChooseProcessingPurpose(purpose: 'ads' | 'analytics'): boolean {
  const input = getProcessingInputs();
  const plan = input.launch?.plan;
  return input.hydrated && !!input.launch?.current && !!plan && plan.ageEligibility === 'allowed' &&
    !isRegionalAdvertisingDisabled(input) &&
    !input.appleAccessRestricted && !plan.parentalAuthorityRequired[purpose] &&
    plan.requirements[purpose] !== 'unresolved';
}

export function needsSeparatePurposeChoice(purpose: 'ads' | 'analytics'): boolean {
  const input = getProcessingInputs();
  const plan = input.launch?.plan;
  if (isRegionalAdvertisingDisabled(input)) return false;
  if (!plan || plan.ageEligibility !== 'allowed' || plan.parentalAuthorityRequired[purpose] ||
      plan.requirements[purpose] === 'unresolved' || input.choices[purpose].decision === 'denied') return false;
  if (plan.requirements[purpose] !== 'express-consent') return false;
  const choice = input.choices[purpose];
  const activated = purpose === 'ads' ? saved.adsActivated : saved.reportingActivated;
  return choice.decision !== 'granted' || choice.noticeVersion !== PROCESSING_NOTICE_VERSION ||
    (plan.quebecActivationRequired[purpose] && !activated) ||
    (purpose === 'analytics' && plan.europeanReportingActivationRequired === true && saved.europeanReportingActivated !== true);
}

export function processingPurposeStatus(purpose: 'ads' | 'analytics'): string {
  const input = getProcessingInputs();
  if (isProcessingAllowPending(purpose)) return 'Allow request pending · you can stop it before confirmation';
  if (purpose === 'ads' && input.choices.ads.decision === 'denied') {
    const withdrawal = getAdvertisingWithdrawalState();
    if (withdrawal.status === 'pending') return 'Confirming advertising refusal save · new ad requests blocked';
    if (withdrawal.status === 'save-unconfirmed') return 'Advertising refusal save not confirmed · new ad requests blocked for this session';
    if (withdrawal.status === 'completed') return 'Advertising refusal saved · new ad requests blocked';
  }
  if (purpose === 'analytics' && input.choices.analytics.decision === 'denied') {
    const withdrawal = getReportingWithdrawalState();
    if (withdrawal.status === 'pending') return 'Confirming your saved choice and native reporting stop';
    if (withdrawal.status === 'completed') return 'Choice saved · native reporting stopped';
    if (withdrawal.status === 'save-unconfirmed' || withdrawal.status === 'native-stop-unconfirmed') {
      return `${withdrawal.saved ? 'Choice saved' : 'Choice save not confirmed'} · ${withdrawal.nativeStopped
        ? 'native reporting stopped' : 'Native stop not confirmed'}`;
    }
  }
  if (!input.hydrated) return 'Saved privacy choices are unavailable · retry loading';
  if (input.choices[purpose].decision === 'denied') return 'Off by your choice';
  // Report explicit privacy choices only. Age/location policy decisions must not
  // become an advertising-outcome hint beside the questions or saved answers.
  if (purpose === 'analytics' && input.choices.analytics.decision === 'granted') return 'Reporting permission saved';
  return '';
}

export function canPresentProcessingNotice(): boolean {
  const input = getProcessingInputs();
  const plan = input.launch?.plan;
  return input.hydrated && !!input.launch?.current && !!plan && plan.ageEligibility === 'allowed' &&
    !input.appleAccessRestricted && !isRegionalAdvertisingDisabled(input) && (['ads', 'analytics'] as Purpose[]).some(purpose =>
      input.choices[purpose].decision !== 'denied' && plan.requirements[purpose] !== 'unresolved' && !plan.parentalAuthorityRequired[purpose]);
}
