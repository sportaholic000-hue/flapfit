import { getProcessingAccess, getProcessingInputs, setProcessingChoice } from './processingAccess';

export type PrivacyWithdrawalResult = Readonly<{
  status: 'completed' | 'save-unconfirmed' | 'native-stop-unconfirmed' | 'superseded';
  saved: boolean;
  nativeStopped: boolean;
}>;

/** Reading settings requires neither an initialized SDK nor an eligible session.
 * A saved permission can still be withdrawn after region/age access is restricted. */
export function getPrivacyRights() {
  const inputs = getProcessingInputs();
  const access = getProcessingAccess();
  return {
    canWithdrawReporting: inputs.choices.analytics.decision === 'granted' || access.revenueCat.allowed ||
      (inputs.choices.analytics.decision === 'denied' && ['pending', 'save-unconfirmed', 'native-stop-unconfirmed'].includes(reportingState.status)),
    reportingRefused: inputs.choices.analytics.decision === 'denied',
    canStopCompetition: inputs.choices.competition.decision === 'granted' || access.competition.allowed,
    competitionStopped: inputs.choices.competition.decision === 'denied',
  };
}

type Confirmation<T> = { confirmed: true; value: T } | { confirmed: false };
/** A broken native promise must not leave Info permanently busy. The underlying
 * refusal remains in force; a timeout is never presented as a successful stop. */
function confirmWithin<T>(operation: Promise<T>): Promise<Confirmation<T>> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ confirmed: false }), 10_000);
    void operation.then((value) => {
      clearTimeout(timer);
      resolve({ confirmed: true, value });
    }, () => {
      clearTimeout(timer);
      resolve({ confirmed: false });
    });
  });
}

let reportingWithdrawal: Promise<PrivacyWithdrawalResult> | null = null;
let competitionWithdrawal: Promise<PrivacyWithdrawalResult> | null = null;
let retryNativeStop = false;
type ReportingWithdrawalState = Readonly<{
  status: PrivacyWithdrawalResult['status'] | 'not-requested' | 'pending';
  saved: boolean;
  nativeStopped: boolean;
}>;
let reportingState: ReportingWithdrawalState = { status: 'not-requested', saved: false, nativeStopped: false };
const reportingListeners = new Set<() => void>();
export const getReportingWithdrawalState = () => reportingState;
/** A new explicit grant cannot inherit a previous native-stop confirmation. */
export function resetReportingWithdrawalConfirmation(): void {
  publishReportingWithdrawal({ status: 'not-requested', saved: false, nativeStopped: false });
}
export function subscribeReportingWithdrawal(listener: () => void): () => void {
  reportingListeners.add(listener);
  return () => { reportingListeners.delete(listener); };
}
function publishReportingWithdrawal(next: ReportingWithdrawalState): void {
  reportingState = next;
  reportingListeners.forEach(listener => { try { listener(); } catch { /* Keep the withdrawal independent of its UI. */ } });
}

/** Explicit rights action only. There is intentionally no grant or disable-ads
 * operation here. Applying this refusal must not change permitted ad delivery. */
export function withdrawAdPerformanceReporting(): Promise<PrivacyWithdrawalResult> {
  if (reportingWithdrawal && getProcessingInputs().choices.analytics.decision === 'denied') {
    return reportingWithdrawal;
  }
  publishReportingWithdrawal({ status: 'pending', saved: false, nativeStopped: false });
  // The central setter publishes a refusal synchronously, before awaiting storage.
  // Existing SDK subscribers therefore close their gates before any queued report.
  const saving = confirmWithin(setProcessingChoice('analytics', 'denied'));
  const stopping = confirmWithin((async () => {
    // Keep the SDK-owning service lazy, using the same Metro-compatible runtime
    // require as the monetization adapter. Reading rights never evaluates it.
    const native = require('../monetization') as typeof import('../monetization');
    const status = native.getRevenueCatWithdrawalStatus();
    return retryNativeStop || status.state === 'failed'
      ? native.retryRevenueCatWithdrawal()
      : native.settleRevenueCatWithdrawal();
  })());
  const operation = (async (): Promise<PrivacyWithdrawalResult> => {
    const [saved, stopped] = await Promise.all([saving, stopping]);
    const nativeStopped = stopped.confirmed && stopped.value.state === 'stopped';
    retryNativeStop = !nativeStopped;
    const current = getProcessingInputs().choices.analytics.decision === 'denied' &&
      !getProcessingAccess().revenueCat.allowed;
    return {
      status: !current ? 'superseded' : !saved.confirmed ? 'save-unconfirmed' :
        !nativeStopped ? 'native-stop-unconfirmed' : 'completed',
      saved: saved.confirmed,
      nativeStopped: current && nativeStopped,
    };
  })();
  reportingWithdrawal = operation;
  void operation.then(result => {
    if (reportingWithdrawal === operation) {
      reportingWithdrawal = null;
      publishReportingWithdrawal(result);
    }
  });
  return operation;
}

/** Stop participation without signing out, deleting the profile, or changing
 * analytics/ads. Existing authenticated deletion and support remain available. */
export function stopOnlineCompetition(): Promise<PrivacyWithdrawalResult> {
  if (competitionWithdrawal && getProcessingInputs().choices.competition.decision === 'denied') {
    return competitionWithdrawal;
  }
  const saving = confirmWithin(setProcessingChoice('competition', 'denied'));
  const operation = (async (): Promise<PrivacyWithdrawalResult> => {
    const saved = await saving;
    const current = getProcessingInputs().choices.competition.decision === 'denied';
    return {
      status: !current ? 'superseded' : saved.confirmed ? 'completed' : 'save-unconfirmed',
      saved: saved.confirmed,
      nativeStopped: false,
    };
  })();
  competitionWithdrawal = operation;
  void operation.then(() => { if (competitionWithdrawal === operation) competitionWithdrawal = null; });
  return operation;
}
