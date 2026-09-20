import { requestEuropeanAppleAgeEvidence } from './appleAgeControl';
import {
  beginEuropeanProviderProcessing, getAgeVerificationRevision, getProcessingAccess, getProcessingInputs,
  invalidateEuropeanProviderDecisions, setEuropeanProviderDecisions,
} from './processingAccess';
import { PROCESSING_NOTICE_VERSION, type EuropeanProviderDecisions, type ProcessingAccess, type ProcessingDecision } from './processingPolicy';
import { EUROPEAN_PROVIDER_POLICY } from './europeanProviderPolicy';
import { getUmpProcessingControls } from './umpPrivacyControls';
import type { UmpProviderInfo } from './umpStoredSignals';

export type EuropeanProviderResult = Readonly<{
  status: 'processed' | 'not-applicable' | 'unavailable' | 'age-unresolved' | 'not-presented' | 'stale';
  access: ProcessingAccess;
}>;
export type EuropeanProviderPresentation = {
  canPresent: () => boolean;
  present: <T>(operation: () => Promise<T>) => Promise<T>;
};
let pending: Promise<EuropeanProviderResult> | null = null;
let completedKey: string | null = null;
let completedStatus: EuropeanProviderResult['status'] = 'unavailable';
let ageRequestAttempted = false;
let generation = 0;
const key = () => EUROPEAN_PROVIDER_POLICY.revision + ':' + getAgeVerificationRevision();
const result = (status: EuropeanProviderResult['status']): EuropeanProviderResult => ({ status, access: getProcessingAccess() });
const appleAdult = () => {
  const verification = getProcessingInputs().verification;
  return verification?.mandatoryCheckSatisfied === true && verification.treatment === 'unspecified';
};
const deny = (reason: ProcessingDecision['reason'] = 'policy-unresolved'): ProcessingDecision => ({ allowed: false, reason });
const allowed = (): ProcessingDecision => ({ allowed: true, reason: 'allowed' });
/** Google selects NPA or LTD using its complete TCF/AC state; a P1 bit does not
 * identify the actual fill mode. Publisher P1/P7 apply only to separate reporting. */
function decisions(info: UmpProviderInfo): EuropeanProviderDecisions {
  const policy = EUROPEAN_PROVIDER_POLICY;
  const resolved = info.supported && info.gdprApplies === true &&
    info.consentStatus !== 'UNKNOWN' && info.consentStatus !== 'REQUIRED';
  const googleRouteReviewed = policy.googleNonPersonalizedRouteReviewed && policy.googleLimitedAdsRouteReviewed;
  const reportingConsent = info.publisherPurposeOneConsent === true && info.publisherPurposeSevenConsent === true;
  const competitionChoice = getProcessingInputs().choices.competition;
  return {
    ads: resolved && info.canRequestAds && googleRouteReviewed ? allowed() : deny(),
    analytics: !policy.revenueCatPublisherNoticeReviewed || !resolved ? deny() : reportingConsent ? allowed() : deny('refused'),
    competition: policy.competitionRequestedServiceReviewed && competitionChoice.decision === 'granted' &&
      competitionChoice.noticeVersion === PROCESSING_NOTICE_VERSION ? allowed() : deny(),
  };
}
/** Called by the mounted lobby coordinator before its ad-eligibility early return.
 * Does not import GMA/RevenueCat or collect a country/birthday. Existing native
 * Apple and Google sheets share the caller's result/privacy presentation barrier. */
export function prepareEuropeanProviderProcessing(options: EuropeanProviderPresentation): Promise<EuropeanProviderResult> {
  if (!EUROPEAN_PROVIDER_POLICY.enabled) return Promise.resolve(result('not-applicable'));
  if (pending) return pending;
  if (!options.canPresent()) return Promise.resolve(result('not-presented'));
  if (completedKey === key()) return Promise.resolve(result(completedStatus));
  const input = getProcessingInputs();
  if (!input.hydrated || input.appleAccessRestricted || input.appleRequirement === 'pending' || input.appleRequirement === 'error') {
    return Promise.resolve(result('unavailable'));
  }
  const controls = getUmpProcessingControls();
  if (!controls) return Promise.resolve(result('unavailable'));
  const token = ++generation;
  // Defer the body so reentrant state subscribers see this shared operation first.
  pending = Promise.resolve().then(async (): Promise<EuropeanProviderResult> => {
    let verification = getAgeVerificationRevision();
    const current = () => token === generation && verification === getAgeVerificationRevision();
    try {
      // Unknown users get protective TFUA. A stored false/missing flag is never adult eligibility.
      const discovery = await controls.update(!appleAdult());
      if (!current()) return result('stale');
      if (!discovery.supported) return result('unavailable');
      if (discovery.gdprApplies !== true) return result(discovery.gdprApplies === false ? 'not-applicable' : 'unavailable');
      if (!options.canPresent()) return result('not-presented');
      if (beginEuropeanProviderProcessing() === null) return result('unavailable');
      if (!appleAdult()) {
        // Session dedupe includes refusals: lobby refocus cannot show another age sheet.
        if (ageRequestAttempted) return result('age-unresolved');
        const age = await options.present(() => {
          if (!options.canPresent()) return Promise.resolve(null);
          ageRequestAttempted = true;
          return requestEuropeanAppleAgeEvidence();
        });
        verification = getAgeVerificationRevision();
        if (token !== generation || age?.status === 'stale') return result('stale');
        if (!age || !options.canPresent()) return result('not-presented');
        if (age.status !== 'processed' || !appleAdult()) return result('age-unresolved');
      }
      if (!current() || !getProcessingInputs().europeanProvider) return result('stale');
      let info = await controls.update(false);
      if (!current()) return result('stale');
      if (!options.canPresent()) return result('not-presented');
      if (!info.supported || info.gdprApplies !== true) return result('unavailable');
      if (info.consentStatus === 'REQUIRED') {
        const form = await options.present(() => options.canPresent() ? controls.loadAndShowIfRequired() : Promise.resolve(null));
        if (!current()) return result('stale');
        if (!form || !options.canPresent()) return result('not-presented');
        info = form;
      }
      if (!setEuropeanProviderDecisions(decisions(info), verification)) return result('stale');
      return result('processed');
    } catch {
      if (current()) invalidateEuropeanProviderDecisions();
      return result(current() ? 'unavailable' : 'stale');
    }
  }).then((outcome) => {
    if (token === generation && outcome.status !== 'not-presented' && outcome.status !== 'stale') {
      completedKey = key(); completedStatus = outcome.status;
    }
    return outcome;
  }).finally(() => { pending = null; });
  return pending;
}
/** Invoke immediately after the existing Google rights form. Gates close before
 * the first await, so revoked reporting cannot enqueue work during signal reads.
 * No new update/form/age request is made and local durable refusals still win. */
export async function reconcileEuropeanProviderPrivacyOptions(): Promise<EuropeanProviderResult> {
  if (!EUROPEAN_PROVIDER_POLICY.enabled) return result('not-applicable');
  const token = ++generation;
  completedKey = null;
  invalidateEuropeanProviderDecisions(true);
  const verification = getAgeVerificationRevision();
  const controls = getUmpProcessingControls();
  if (!controls || !getProcessingInputs().europeanProvider || !appleAdult()) return result('unavailable');
  try {
    const info = await controls.getProviderInfo();
    if (token !== generation || verification !== getAgeVerificationRevision()) return result('stale');
    if (!info.supported || info.gdprApplies !== true) return result('unavailable');
    if (!setEuropeanProviderDecisions(decisions(info), verification)) return result('stale');
    completedKey = key(); completedStatus = 'processed';
    return result('processed');
  } catch { return result('unavailable'); }
}
