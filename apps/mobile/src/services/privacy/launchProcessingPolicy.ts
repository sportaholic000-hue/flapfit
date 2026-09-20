import {
  PROCESSING_NOTICE_VERSION,
  type AgeEvidence, type ProcessingChoice, type ProcessingDecision,
  type Purpose, type PurposeRequirement,
} from './processingPolicy';
import type { NewYorkApplicabilityEvidence } from './regionalPolicy';

/** Actual restricted route, not a provider permission. Native/UMP/Apple gates remain separate. */
export const LAUNCH_PROCESSING_ROUTES = {
  advertising: { nonPersonalized: true, restrictedDataProcessing: true, maximumAdContentRating: 'PG' },
  revenueCat: { adsOnly: true, quebecActivationRequired: true, connecticutTeenNecessityEstablished: false },
  competition: { requestedServiceOnly: true },
} as const;
export type LaunchMissingFact = 'country' | 'age' | 'province' | 'state' |
  'parental-authority' | 'new-york-applicability' | 'contextual-ad-necessity';
export type LaunchPolicyReason = 'notice-route' | 'requested-service' | 'country-unresolved' |
  'outside-launch-scope' | 'age-unresolved' | 'outside-audience' | 'province-unresolved' |
  'state-unresolved' | 'parental-authority-required' | 'quebec-activation-required' |
  'new-york-express-consent-required' | 'connecticut-ad-necessity-unresolved' |
  'connecticut-reporting-not-necessary';
export type ConnecticutResidency = 'resident' | 'not-resident' | 'unknown';
export type LaunchProcessingOptions = {
  /** Explicit local clarification, not IP location or New York consent. */
  connecticutResidency?: ConnecticutResidency;
  /** Verified authority for this processing; never download permission. */
  parentalAuthority?: Partial<Record<Purpose, boolean>>;
  /** Exact disclosed purpose activation, not Google vendor consent or a generic grant. */
  quebecFunctionsActivated?: { ads: boolean; analytics: boolean };
  adsWithdrawalScope?: 'none' | 'sale-sharing-targeting' | 'all-ad-personal-data';
};
export type LaunchProcessingInput = LaunchProcessingOptions & {
  /** Trusted current context; locale, storefront and store availability are insufficient. */
  country: string | null;
  subdivision: string | null;
  age: AgeEvidence;
  notices: Record<Purpose, boolean>;
  choices: Record<Purpose, ProcessingChoice>;
  newYorkApplicability?: Partial<Record<'ads' | 'analytics', NewYorkApplicabilityEvidence>>;
  connecticutContextualAdsReviewed?: boolean;
};
/** Derived rules only. May be retained in RAM; never contains raw Apple bounds/source. */
type LaunchAgeThresholds = { thirteen: boolean; fourteen: boolean; fifteen: boolean; eighteen: boolean };
export type LaunchProcessingPlan = {
  /** Latent CA-specific authority rule for a later confirmed Quebec refinement. */
  quebecMinorAuthorityRequired: boolean;
  requirements: Record<Purpose, PurposeRequirement>;
  reasons: Record<Purpose, LaunchPolicyReason>;
  missingFacts: Record<Purpose, LaunchMissingFact[]>;
  parentalAuthorityRequired: Record<Purpose, boolean>;
  quebecActivationRequired: { ads: boolean; analytics: boolean };
  separateExpressChoiceRequired: { ads: boolean; analytics: boolean };
  ageEligibility: 'allowed' | 'age-unresolved' | 'outside-audience';
  treatment: 'child' | 'teen' | 'unspecified';
  adTreatment: 'child' | 'teen' | 'unspecified';
  underAgeOfConsent: boolean;
};
export type LaunchProcessingResolution = LaunchProcessingPlan & {
  decisions: Record<Purpose, ProcessingDecision>;
};
/** No birthday; at most three Apple thresholds in any request. */
export function launchAppleAgeGates(country: string | null): [number, number, number] {
  switch (country?.trim().toUpperCase()) {
    // Adjacent 13/14 gates are invalid in Apple's API. Below 14 remains
    // unresolved for optional processing; this never restricts local play.
    case 'CA': return [14, 16, 18];
    case 'AU': return [13, 15, 18];
    default: return [13, 16, 18];
  }
}
const PURPOSES: Purpose[] = ['ads', 'analytics', 'competition'];
const PROVINCES = new Set(['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT', 'NON-QC']);
const STATES = new Set('AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' '));
function validAge(age: AgeEvidence): boolean {
  return age.status === 'shared' && age.source !== 'none' && age.lowerBound !== null &&
    Number.isSafeInteger(age.lowerBound) && age.lowerBound >= 0 &&
    (age.upperBound === null || (Number.isSafeInteger(age.upperBound) && age.upperBound >= age.lowerBound));
}
function outsideNewYork(evidence: NewYorkApplicabilityEvidence | undefined): boolean {
  return evidence?.status === 'wholly-outside' && evidence.collectedOutsideNewYork &&
    evidence.noUseInNewYork && evidence.noNewYorkCollectedDataUsed;
}
/**
 * Reevaluate consent/withdrawal without retaining or requesting Apple's range again.
 * Prior denials remain effective across notice versions. A sale/targeting opt-out
 * is not a withdrawal from every restricted advertisement.
 */
export function evaluateLaunchProcessingPlan(
  plan: LaunchProcessingPlan,
  notices: Record<Purpose, boolean>,
  choices: Record<Purpose, ProcessingChoice>,
  options: LaunchProcessingOptions = {},
): LaunchProcessingResolution {
  const decisions = {} as Record<Purpose, ProcessingDecision>;
  const reasons = { ...plan.reasons };
  const missingFacts = { ads: [...plan.missingFacts.ads], analytics: [...plan.missingFacts.analytics], competition: [...plan.missingFacts.competition] };
  for (const purpose of PURPOSES) {
    const choice = choices[purpose];
    const restrictedAdOptOut = purpose === 'ads' && options.adsWithdrawalScope === 'sale-sharing-targeting';
    if ((choice.decision === 'denied' && !restrictedAdOptOut) ||
        (purpose === 'ads' && options.adsWithdrawalScope === 'all-ad-personal-data')) {
      decisions[purpose] = { allowed: false, reason: 'refused' };
      continue;
    }
    if (plan.ageEligibility !== 'allowed') {
      decisions[purpose] = { allowed: false, reason: plan.ageEligibility };
      continue;
    }
    if (plan.requirements[purpose] === 'unresolved') {
      decisions[purpose] = { allowed: false, reason: 'policy-unresolved' };
      continue;
    }
    if (plan.parentalAuthorityRequired[purpose] && options.parentalAuthority?.[purpose] !== true) {
      decisions[purpose] = { allowed: false, reason: 'parent-permission-required' };
      reasons[purpose] = 'parental-authority-required';
      missingFacts[purpose].push('parental-authority');
      continue;
    }
    if (!notices[purpose]) {
      decisions[purpose] = { allowed: false, reason: 'notice-needed' };
      continue;
    }
    const qcActivation = purpose !== 'competition' && plan.quebecActivationRequired[purpose];
    if (qcActivation && !options.quebecFunctionsActivated?.[purpose as 'ads' | 'analytics']) {
      decisions[purpose] = { allowed: false, reason: 'permission-needed' };
      reasons[purpose] = 'quebec-activation-required';
      continue;
    }
    // Verified QC activation already is the specific choice for that function.
    // NY consent and requested competition remain independent current choices.
    const needsChoice = purpose === 'competition' ||
      plan.separateExpressChoiceRequired[purpose] ||
      (plan.requirements[purpose] === 'express-consent' && !qcActivation);
    if (needsChoice && choice.decision !== 'granted') {
      decisions[purpose] = { allowed: false, reason: 'permission-needed' };
    } else if (needsChoice && choice.noticeVersion !== PROCESSING_NOTICE_VERSION) {
      decisions[purpose] = { allowed: false, reason: 'notice-changed' };
    } else {
      decisions[purpose] = { allowed: true, reason: 'allowed' };
      // These facts are alternatives to the verified specific activation/consent.
      missingFacts[purpose] = missingFacts[purpose].filter(fact => fact !== 'province' && fact !== 'new-york-applicability');
    }
  }
  return { ...plan, reasons, missingFacts, decisions };
}
/**
 * Restricted ad / ads-only RC / minimal requested leaderboard policy:
 * QC P-39.1 ss4.1,8.1,14: https://www.legisquebec.gouv.qc.ca/en/document/cs/P-39.1
 * NY GBL899-EE/FF: https://ag.ny.gov/child-data-protection-act-guidance
 * CT ss42-529a/d: https://prdext2.cga.ct.gov/2026/sup/chap_743jj.htm
 * AU APP3/6 and capacity B.61: https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines
 * MX consent: https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf
 * MX minor capacity: https://www.diputados.gob.mx/LeyesBiblio/pdf/CCF.pdf
 */
export function resolveLaunchProcessingPolicy(input: LaunchProcessingInput): LaunchProcessingResolution {
  const valid = validAge(input.age);
  const lower = valid ? input.age.lowerBound! : 0;
  const outside = input.age.status === 'shared' && input.age.source !== 'none' &&
    input.age.upperBound !== null && Number.isSafeInteger(input.age.upperBound) &&
    input.age.upperBound >= 0 && input.age.upperBound < 13;
  const eligibility = valid && lower >= 13 ? 'allowed' : outside ? 'outside-audience' : 'age-unresolved';
  return resolveWithThresholds(input, eligibility, {
    thirteen: valid && lower >= 13, fourteen: valid && lower >= 14,
    fifteen: valid && lower >= 15, eighteen: valid && lower >= 18,
  });
}
/** Only call when the central Apple verifier already established adulthood. */
export function resolveVerifiedAdultLaunchPlan(input: Omit<LaunchProcessingInput, 'age'>): LaunchProcessingResolution {
  return resolveWithThresholds(input, 'allowed', { thirteen: true, fourteen: true, fifteen: true, eighteen: true });
}
/** Refine subdivision within the SAME country only, using existing minimal rule outcomes. */
export function refineLaunchProcessingPlan(
  plan: LaunchProcessingPlan, input: Omit<LaunchProcessingInput, 'age'>,
): LaunchProcessingResolution {
  const adult = plan.ageEligibility === 'allowed' && plan.treatment === 'unspecified';
  const country = input.country?.trim().toUpperCase();
  return resolveWithThresholds(input, plan.ageEligibility, {
    thirteen: plan.ageEligibility === 'allowed',
    fourteen: adult || (country === 'CA' && !plan.quebecMinorAuthorityRequired),
    fifteen: adult || (country === 'AU' && !plan.underAgeOfConsent),
    eighteen: adult,
  });
}
function resolveWithThresholds(
  input: Omit<LaunchProcessingInput, 'age'>,
  eligibility: LaunchProcessingPlan['ageEligibility'],
  thresholds: LaunchAgeThresholds,
): LaunchProcessingResolution {
  const plan: LaunchProcessingPlan = {
    quebecMinorAuthorityRequired: input.country?.trim().toUpperCase() === 'CA' && !thresholds.fourteen,
    requirements: { ads: 'unresolved', analytics: 'unresolved', competition: 'unresolved' },
    reasons: { ads: 'country-unresolved', analytics: 'country-unresolved', competition: 'country-unresolved' },
    missingFacts: { ads: [], analytics: [], competition: [] },
    parentalAuthorityRequired: { ads: false, analytics: false, competition: false },
    quebecActivationRequired: { ads: false, analytics: false },
    separateExpressChoiceRequired: { ads: false, analytics: false },
    ageEligibility: eligibility, treatment: 'child', adTreatment: 'child', underAgeOfConsent: true,
  };
  const finish = () => evaluateLaunchProcessingPlan(plan, input.notices, input.choices, input);
  const block = (purpose: Purpose, reason: LaunchPolicyReason, missing?: LaunchMissingFact) => {
    plan.requirements[purpose] = 'unresolved';
    plan.reasons[purpose] = reason;
    if (missing) plan.missingFacts[purpose].push(missing);
  };
  const country = input.country?.trim().toUpperCase() ?? '';
  if (!['CA', 'US', 'AU', 'MX'].includes(country)) {
    for (const purpose of PURPOSES) block(purpose, country ? 'outside-launch-scope' : 'country-unresolved', 'country');
    return finish();
  }
  if (eligibility !== 'allowed' || !thresholds.thirteen) {
    for (const purpose of PURPOSES) block(purpose, plan.ageEligibility === 'outside-audience' ? 'outside-audience' : 'age-unresolved', 'age');
    return finish();
  }
  const adult = thresholds.eighteen;
  const subdivision = input.subdivision?.trim().toUpperCase().replace(new RegExp('^' + country + '-'), '') ?? '';
  const knownProvince = country === 'CA' && PROVINCES.has(subdivision);
  const knownState = country === 'US' && STATES.has(subdivision);
  const quebecPossible = country === 'CA' && (!knownProvince || subdivision === 'QC');
  plan.underAgeOfConsent = !adult && (
    country === 'MX' || (quebecPossible && !thresholds.fourteen) || (country === 'AU' && !thresholds.fifteen)
  );
  plan.treatment = plan.underAgeOfConsent ? 'child' : adult ? 'unspecified' : 'teen';
  plan.adTreatment = plan.treatment;
  plan.requirements = { ads: 'notice-and-opt-out', analytics: 'notice-and-opt-out', competition: 'requested-service' };
  plan.reasons = { ads: 'notice-route', analytics: 'notice-route', competition: 'requested-service' };
  for (const purpose of PURPOSES) {
    // No case-by-case capacity or verified guardian service is collected here.
    // OAIC B.61 does not let a CHILD ad tag stand in for under-15 consent.
    plan.parentalAuthorityRequired[purpose] = (!adult && country === 'MX') ||
      (quebecPossible && !thresholds.fourteen) || (country === 'AU' && !thresholds.fifteen);
    if (purpose === 'competition') continue;
    if (quebecPossible) {
      plan.quebecActivationRequired[purpose] = true;
      plan.requirements[purpose] = 'express-consent';
      plan.reasons[purpose] = 'quebec-activation-required';
      if (!knownProvince) plan.missingFacts[purpose].push('province');
    }
    const connecticutPossible = input.connecticutResidency === 'resident' || subdivision === 'CT' ||
      (input.connecticutResidency !== 'not-resident' && !knownState);
    if (!adult && country === 'US' && connecticutPossible) {
      if (purpose === 'analytics') {
        block(purpose, knownState || input.connecticutResidency === 'resident' ? 'connecticut-reporting-not-necessary' : 'state-unresolved', knownState || input.connecticutResidency === 'resident' ? undefined : 'state');
        continue;
      }
      if (!input.connecticutContextualAdsReviewed) {
        block(purpose, 'connecticut-ad-necessity-unresolved', 'contextual-ad-necessity');
        continue;
      }
    }
    // Residence/current country does not exclude covered NY activity or retained data.
    // Exact NY-compliant purpose consent may satisfy uncertain applicability.
    if (!adult && !outsideNewYork(input.newYorkApplicability?.[purpose])) {
      plan.requirements[purpose] = 'express-consent';
      plan.separateExpressChoiceRequired[purpose] = true;
      plan.reasons[purpose] = 'new-york-express-consent-required';
      if (input.newYorkApplicability?.[purpose]?.status !== 'applies') {
        plan.missingFacts[purpose].push('new-york-applicability');
      }
    }
  }
  return finish();
}
