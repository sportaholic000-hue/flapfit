import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  beginProcessingChoice, getProcessingAccess, getProcessingInputs, hydrateProcessingAccess, isProcessingChoiceCurrent,
  markProcessingNoticePresented, setLaunchProcessingOptions, setProcessingChoice,
} from './processingAccess';
import { PROCESSING_NOTICE_VERSION, type Purpose } from './processingPolicy';
import { getReportingWithdrawalState, resetReportingWithdrawalConfirmation, withdrawAdPerformanceReporting } from './privacyRights';

// Only the notice acknowledgement and specific function activations are stored.
// No age, jurisdiction, device, ad, or workout information belongs in this record.
const KEY = '@flapfit/processing-notice-v1';
type Notice = { version: number; acknowledged: boolean; adsActivated: boolean; reportingActivated: boolean };
let saved: Notice = { version: PROCESSING_NOTICE_VERSION, acknowledged: false, adsActivated: false, reportingActivated: false };
let hydration: Promise<void> | null = null;
let writes: Promise<void> = Promise.resolve();

export const AD_PROCESSING_DISCLOSURE = 'Google AdMob uses app and device information, IP address and approximate location, diagnostics, and ad interactions to deliver non-personalized ads. RevenueCat measures ad loads, views, clicks, and revenue using a separate random app ID and app/device information. Neither receives your camera footage, recordings, exercises, scores, or training history.';

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
          adsActivated: value.adsActivated, reportingActivated: value.reportingActivated };
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
    if (current?.ads !== ads || current?.analytics !== analytics) {
      setLaunchProcessingOptions({ ...input.launch.options, quebecFunctionsActivated: { ads, analytics } });
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
  const current = () => isProcessingChoiceCurrent(purpose, intent);
  await restoreProcessingNotice();
  if (!current()) return;
  if (purpose === 'analytics') resetReportingWithdrawalConfirmation();
  await setProcessingChoice(purpose, 'granted', intent);
  if (!current()) return;
  const operation = writes.catch(() => undefined).then(async () => {
    if (!current()) return;
    const next = { ...saved,
      ...(purpose === 'ads' ? { adsActivated: true } : { reportingActivated: true }) };
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
    if (!current()) return;
    saved = next;
    applySavedNotice();
  });
  writes = operation;
  try { await operation; }
  catch (error) {
    if (!current()) return; // A stale failed write cannot withdraw a newer choice.
    // Never retain a grant whose specific activation could not be saved.
    if (purpose === 'analytics') await withdrawAdPerformanceReporting();
    else await setProcessingChoice(purpose, 'denied').catch(() => undefined);
    throw error;
  }
}

export async function refuseProcessingPurpose(purpose: 'ads' | 'analytics'): Promise<void> {
  if (purpose === 'analytics') {
    const result = await withdrawAdPerformanceReporting();
    if (result.status !== 'completed') throw new Error(
      `${result.saved ? 'Choice saved.' : 'Choice save not confirmed.'} ${result.nativeStopped
        ? 'Native reporting stopped.' : 'Native stop not confirmed.'} Use Retry stopping reporting.`);
  } else await setProcessingChoice('ads', 'denied');
}

export function canChooseProcessingPurpose(purpose: 'ads' | 'analytics'): boolean {
  const input = getProcessingInputs();
  const plan = input.launch?.plan;
  return input.hydrated && !!input.launch?.current && !!plan && plan.ageEligibility === 'allowed' &&
    !input.appleAccessRestricted && !plan.parentalAuthorityRequired[purpose] &&
    plan.requirements[purpose] !== 'unresolved';
}

export function needsSeparatePurposeChoice(purpose: 'ads' | 'analytics'): boolean {
  const input = getProcessingInputs();
  const plan = input.launch?.plan;
  if (!plan || plan.ageEligibility !== 'allowed' || plan.parentalAuthorityRequired[purpose] ||
      plan.requirements[purpose] === 'unresolved' || input.choices[purpose].decision === 'denied') return false;
  if (plan.requirements[purpose] !== 'express-consent') return false;
  const choice = input.choices[purpose];
  const activated = purpose === 'ads' ? saved.adsActivated : saved.reportingActivated;
  return choice.decision !== 'granted' || choice.noticeVersion !== PROCESSING_NOTICE_VERSION ||
    (plan.quebecActivationRequired[purpose] && !activated);
}

export function processingPurposeStatus(purpose: 'ads' | 'analytics'): string {
  const input = getProcessingInputs();
  const decision = purpose === 'ads' ? getProcessingAccess().ads : getProcessingAccess().revenueCat;
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
  if (decision.allowed) return purpose === 'ads' ? 'Permitted · Google choices also apply' : 'On';
  if (needsSeparatePurposeChoice(purpose)) return 'Your permission is needed';
  if (decision.reason === 'notice-needed') return 'Available after this notice';
  if (decision.reason === 'parent-permission-required') return 'Unavailable: verified parent or guardian permission is required. Flap Fit does not collect that permission.';
  const reason = input.launch?.resolution?.reasons[purpose];
  if (reason === 'connecticut-reporting-not-necessary') return 'Reporting is unavailable for this age and Connecticut privacy setting';
  if (reason === 'connecticut-ad-necessity-unresolved') return 'Advertising is unavailable for this age and regional privacy setting';
  if (reason === 'state-unresolved') return 'Review State privacy rules in this section';
  if (decision.reason === 'age-unresolved') return 'Unavailable until age eligibility can be confirmed';
  return 'Waiting for applicable age and privacy checks';
}

export function canPresentProcessingNotice(): boolean {
  const input = getProcessingInputs();
  const plan = input.launch?.plan;
  return input.hydrated && !!input.launch?.current && !!plan && plan.ageEligibility === 'allowed' &&
    !input.appleAccessRestricted && (['ads', 'analytics'] as Purpose[]).some(purpose =>
      input.choices[purpose].decision !== 'denied' && plan.requirements[purpose] !== 'unresolved' && !plan.parentalAuthorityRequired[purpose]);
}
