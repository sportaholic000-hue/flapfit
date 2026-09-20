import type { LaunchProcessingPlan, LaunchProcessingOptions, LaunchProcessingResolution } from './launchProcessingPolicy';
import type { LaunchCountry } from './privacyCountry';
/** Independent purpose decisions. Apple age evidence is never processing consent. */
export const PROCESSING_NOTICE_VERSION = 1;
export type PrivacyRegion = 'us' | 'ca-quebec' | 'ca-other' | 'other' | 'unknown';
export type Purpose = 'ads' | 'analytics' | 'competition';
export type AgeEvidence = {
  source: 'apple' | 'self' | 'none';
  status: 'shared' | 'unknown' | 'declined' | 'unsupported' | 'unavailable' | 'error';
  lowerBound: number | null;
  /** Inclusive upper bound, matching Apple. Null means no upper restriction. */
  upperBound: number | null;
};
export type PurposeRequirement = 'unresolved' | 'express-consent' | 'notice-and-opt-out' | 'requested-service';
export type AppleRequirement = 'pending' | 'required' | 'not-required' | 'unsupported' | 'error';
export type ProcessingChoice = {
  decision: 'unset' | 'granted' | 'denied';
  noticeVersion: number;
  decidedAt: string | null;
};
export type ProcessingInputs = {
  hydrated: boolean;
  region: PrivacyRegion;
  age: AgeEvidence;
  appleRequirement: AppleRequirement;
  appleAgeCheckSatisfied: boolean;
  appleAccessRestricted: boolean;
  /** A required Apple flow also needs a current verified rescission status. */
  appleRescissionPending: boolean;
  choices: Record<Purpose, ProcessingChoice>;
  requirements: Record<Purpose, PurposeRequirement>;
  presentedNoticeVersion: number | null;
};
export type ProcessingReason =
  | 'allowed' | 'loading' | 'region-unconfirmed' | 'region-not-cleared'
  | 'apple-check-pending' | 'apple-check-required' | 'apple-access-restricted' | 'apple-access-check-pending'
  | 'age-unresolved' | 'outside-audience' | 'parent-permission-required'
  | 'age-14-unresolved' | 'policy-unresolved' | 'notice-needed' | 'permission-needed' | 'refused' | 'notice-changed';
export type ProcessingDecision = { allowed: boolean; reason: ProcessingReason };
/** Minimum ephemeral verification outcome, not an Apple age profile. Never persisted. */
export type AgeVerification = {
  eligibility: ProcessingReason;
  mandatoryCheckSatisfied: boolean;
  treatment: 'child' | 'teen' | 'unspecified';
  underAgeOfConsent: boolean;
};
/** Provider applicability is not a country, residence, or reusable consent grant. */
export type EuropeanProviderDecisions = Record<Purpose, ProcessingDecision>;
export type ProcessingRuntimeInputs = Omit<ProcessingInputs, 'age' | 'appleAgeCheckSatisfied'> & {
  verification: AgeVerification | null;
  europeanProvider?: EuropeanProviderDecisions;
  launch?: { country: LaunchCountry | null; current: boolean; plan: LaunchProcessingPlan | null; resolution: LaunchProcessingResolution | null; options: LaunchProcessingOptions };
};
export type ProcessingAccess = {
  ads: ProcessingDecision & {
    treatment: 'child' | 'teen' | 'unspecified';
    underAgeOfConsent: boolean;
  };
  revenueCat: ProcessingDecision;
  competition: ProcessingDecision;
  revision: number;
};
export function initialProcessingInputs(): ProcessingInputs {
  const unset = (): ProcessingChoice => ({
    decision: 'unset', noticeVersion: PROCESSING_NOTICE_VERSION, decidedAt: null,
  });
  return {
    hydrated: false, region: 'unknown',
    age: { source: 'none', status: 'unknown', lowerBound: null, upperBound: null },
    appleRequirement: 'pending', appleAgeCheckSatisfied: false,
    appleAccessRestricted: false, appleRescissionPending: true,
    choices: { ads: unset(), analytics: unset(), competition: unset() },
    requirements: { ads: 'unresolved', analytics: 'unresolved', competition: 'unresolved' },
    presentedNoticeVersion: null,
  };
}
function validAge(age: AgeEvidence): boolean {
  if (age.status !== 'shared' || age.source === 'none' ||
      (age.lowerBound === null && age.upperBound === null)) return false;
  if (age.lowerBound !== null && (!Number.isInteger(age.lowerBound) || age.lowerBound < 0)) return false;
  return age.upperBound === null ||
    (Number.isInteger(age.upperBound) && age.upperBound >= (age.lowerBound ?? 0));
}
function eligibility(input: ProcessingInputs): ProcessingReason {
  if (!input.hydrated) return 'loading';
  if (input.appleAccessRestricted) return 'apple-access-restricted';
  if (input.appleRequirement === 'pending' || input.appleRequirement === 'error') return 'apple-check-pending';
  if (input.appleRequirement === 'required' &&
      (!input.appleAgeCheckSatisfied || input.age.source !== 'apple' || !validAge(input.age))) {
    return 'apple-check-required';
  }
  if (input.appleRequirement === 'required' && input.appleRescissionPending) return 'apple-access-check-pending';
  if (input.region === 'unknown') return 'region-unconfirmed';
  if (input.region === 'other') return 'region-not-cleared';
  if (!validAge(input.age)) return 'age-unresolved';
  const lower = input.age.lowerBound ?? 0;
  const upper = input.age.upperBound;
  if (upper !== null && upper < 13) return 'outside-audience';
  if (lower < 13) return 'age-unresolved';
  if (input.region === 'ca-quebec' && lower < 14) {
    return upper !== null && upper < 14 ? 'parent-permission-required' : 'age-14-unresolved';
  }
  return 'allowed';
}
function decide(input: Pick<ProcessingInputs, 'requirements' | 'choices' | 'presentedNoticeVersion'>, purpose: Purpose, common: ProcessingReason): ProcessingDecision {
  if (common !== 'allowed') return { allowed: false, reason: common };
  const requirement = input.requirements[purpose];
  if (requirement === 'unresolved') return { allowed: false, reason: 'policy-unresolved' };
  const choice = input.choices[purpose];
  if (choice.decision === 'denied') return { allowed: false, reason: 'refused' };
  if (requirement === 'notice-and-opt-out' && choice.decision === 'unset') {
    return input.presentedNoticeVersion === PROCESSING_NOTICE_VERSION
      ? { allowed: true, reason: 'allowed' } : { allowed: false, reason: 'notice-needed' };
  }
  if (choice.decision !== 'granted') return { allowed: false, reason: 'permission-needed' };
  if (choice.noticeVersion !== PROCESSING_NOTICE_VERSION) return { allowed: false, reason: 'notice-changed' };
  return { allowed: true, reason: 'allowed' };
}
/** Consume a transient range. The outcome contains no raw age, source, or bounds. */
export function verifyTransientAge(input: ProcessingInputs): AgeVerification {
  const ageKnown = validAge(input.age);
  const adult = ageKnown && (input.age.lowerBound ?? 0) >= 18;
  const teen = ageKnown && (input.age.lowerBound ?? 0) >= 13 && !adult;
  return {
    eligibility: eligibility({
      ...input, hydrated: true, appleAccessRestricted: false, appleRequirement: 'not-required',
    }),
    mandatoryCheckSatisfied: input.appleAgeCheckSatisfied && input.age.source === 'apple' && ageKnown,
    treatment: adult ? 'unspecified' : teen ? 'teen' : 'child',
    underAgeOfConsent: !adult && !teen,
  };
}
export function initialProcessingRuntimeInputs(): ProcessingRuntimeInputs {
  const { age: _age, appleAgeCheckSatisfied: _checked, ...common } = initialProcessingInputs();
  return { ...common, verification: null };
}
function runtimeEligibility(input: ProcessingRuntimeInputs): ProcessingReason {
  if (!input.hydrated) return 'loading';
  if (input.appleAccessRestricted) return 'apple-access-restricted';
  if (input.appleRequirement === 'pending' || input.appleRequirement === 'error') return 'apple-check-pending';
  if (input.appleRequirement === 'required' && !input.verification?.mandatoryCheckSatisfied) return 'apple-check-required';
  if (input.appleRequirement === 'required' && input.appleRescissionPending) return 'apple-access-check-pending';
  if (input.launch) {
    if (!input.launch.current || !input.launch.country) return 'region-unconfirmed';
    if (!input.verification?.mandatoryCheckSatisfied) return 'age-unresolved';
    return input.launch.plan?.ageEligibility ?? 'age-unresolved';
  }
  if (input.europeanProvider) {
    // The current automatic provider branch is established only for an Apple-verified adult.
    // A self-reported adult or missing range cannot enter it; minors remain unresolved.
    if (!input.verification?.mandatoryCheckSatisfied || input.verification.treatment !== 'unspecified') return 'age-unresolved';
    return 'allowed';
  }
  if (input.region === 'unknown') return 'region-unconfirmed';
  if (input.region === 'other') return 'region-not-cleared';
  return input.verification?.eligibility ?? 'age-unresolved';
}
/** Runtime decisions use verification outcomes only; raw Apple evidence is already discarded. */
export function evaluateVerifiedProcessing(input: ProcessingRuntimeInputs, revision = 0): ProcessingAccess {
  const common = runtimeEligibility(input);
  const purpose = (key: Purpose): ProcessingDecision => {
    if (input.launch) {
      if (common !== 'allowed') return { allowed: false, reason: common };
      return input.launch.resolution?.decisions[key] ?? { allowed: false, reason: 'policy-unresolved' };
    }
    if (!input.europeanProvider) return decide(input, key, common);
    if (common !== 'allowed') return { allowed: false, reason: common };
    if (input.choices[key].decision === 'denied') return { allowed: false, reason: 'refused' };
    return { ...input.europeanProvider[key] };
  };
  return {
    ads: {
      ...purpose('ads'),
      treatment: input.launch?.plan?.adTreatment ?? input.verification?.treatment ?? 'child',
      underAgeOfConsent: input.launch?.plan?.underAgeOfConsent ?? input.verification?.underAgeOfConsent ?? true,
    },
    revenueCat: purpose('analytics'),
    competition: purpose('competition'),
    revision,
  };
}
/** Pure evaluation for transient evidence; callers must not retain raw Apple inputs. */
export function evaluateProcessing(input: ProcessingInputs, revision = 0): ProcessingAccess {
  const { age: _age, appleAgeCheckSatisfied: _checked, ...common } = input;
  return evaluateVerifiedProcessing({ ...common, verification: verifyTransientAge(input) }, revision);
}
/** No automatic re-prompt during the calendar year following a refusal. */
export function mayAutomaticallyRequest(choice: ProcessingChoice, now = new Date()): boolean {
  if (choice.decision === 'unset') return true;
  if (choice.decision === 'granted') return false;
  const denied = choice.decidedAt ? new Date(choice.decidedAt) : null;
  return !!denied && Number.isFinite(denied.getTime()) &&
    now.getUTCFullYear() > denied.getUTCFullYear() + 1;
}
