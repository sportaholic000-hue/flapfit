import type {
  AgeEvidence, PrivacyRegion, Purpose, PurposeRequirement,
} from './processingPolicy';

/** Assessed CA/US release scope, not a worldwide policy or a source of age evidence. */
export const REGIONAL_POLICY_REVIEWED_ON = '2026-09-19';

export type QuebecFunctionAssessment =
  | 'not-present'
  | 'activation-required'
  | 'unresolved';

export type RegionalFlowChecks = {
  /** Verified contract/configuration: no sale, independent reuse, or cross-context profiles. */
  providerOnly: boolean;
  /** Appropriate notice before collection, understandable to the applicable audience. */
  disclosed: boolean;
  /** Actual fields, context and inferences assessed; NPA alone is not this verification. */
  nonSensitive: boolean;
  /** Only the disclosed purpose and necessary fields/retention; no optional profiles. */
  purposeLimited: boolean;
  /** Quebec section 8.1 assessment of identification, location and profiling functions. */
  quebecFunctions: QuebecFunctionAssessment;
};

/** These are reviewed facts about the effective route, never defaults derived from NPA/RDP. */
export type RegionalAdsRouteVerification =
  | {
      kind: 'google-only';
      demandRestrictedToGoogle: boolean;
      thirdPartyCreativeVendorsExcluded: boolean;
      noSaleSharingOrCrossContext: boolean;
      contractualPurposeAndRetentionLimits: boolean;
    }
  | {
      kind: 'restricted-demand';
      thirdPartyRecipientsDisclosed: boolean;
      bidRequestDataMinimized: boolean;
      creativeProcessingRestricted: boolean;
      noSaleSharingOrCrossContext: boolean;
      contractualPurposeAndRetentionLimits: boolean;
    };

export type RegionalAdsChecks = RegionalFlowChecks & {
  /** An assessed alternative to providerOnly; buyers need not all be our processors. */
  routeVerification?: RegionalAdsRouteVerification;
  nonPersonalized: boolean;
  restrictedDataProcessing: boolean;
  /** Separate documented necessity assessment; disclosure/consent alone cannot set this. */
  connecticutNecessaryContextualDelivery: boolean;
};

export type RegionalAnalyticsChecks = RegionalFlowChecks & {
  /** Strict internal-operations/necessity assessment, not a general analytics consent. */
  connecticutStrictInternalNecessity: boolean;
};

export type RegionalChoices = {
  /** Supplied only for an applicable right; this module creates no universal ad-free choice. */
  adsWithdrawalScope: 'none' | 'sale-sharing-targeting' | 'all-ad-personal-data';
  /** True only for a verified activation under the current disclosed configuration. */
  quebecAdsFunctionsActivated: boolean;
  quebecAnalyticsFunctionsActivated: boolean;
};

/** Transient, purpose-specific scope assessment; residence alone establishes none of these facts. */
export type NewYorkApplicabilityEvidence =
  | { status: 'unknown' }
  | { status: 'applies'; basis: 'in-state-activity' | 'covered-data-history' }
  | {
      status: 'wholly-outside';
      collectedOutsideNewYork: boolean;
      noUseInNewYork: boolean;
      noNewYorkCollectedDataUsed: boolean;
    };

export type RegionalPolicyInputs = {
  /** ISO country code, not locale, timezone, or an inference from age API availability. */
  country: string | null;
  /** State/province code, or explicit CA-NON-QC: user-confirmed Canada outside Quebec. No address/GPS needed. */
  subdivision: string | null;
  /** Read in memory only. Never copy raw Apple bounds into the result or storage. */
  age: AgeEvidence;
  /** Not persisted or inferred from country/state, storefront, locale, or a UMP section. */
  newYorkApplicability?: Partial<Record<'ads' | 'analytics', NewYorkApplicabilityEvidence>>;
  flows: { ads: RegionalAdsChecks; analytics: RegionalAnalyticsChecks };
  choices: RegionalChoices;
};

export type RegionalMissingFact = 'country' | 'quebec-status' | 'state' | 'age' | 'age-at-least-14' | 'new-york-applicability';
export type RegionalPolicyReason =
  | 'country-unconfirmed' | 'quebec-status-unconfirmed' | 'state-unconfirmed'
  | 'worldwide-not-cleared' | 'age-unresolved' | 'outside-audience'
  | 'parent-permission-required' | 'age-14-unresolved'
  | 'data-flow-not-cleared' | 'quebec-functions-unassessed'
  | 'quebec-function-activation-required' | 'quebec-functions-activated'
  | 'new-york-minor-express-consent'
  | 'new-york-applicability-unresolved'
  | 'connecticut-necessity-not-verified'
  | 'connecticut-necessary-contextual-delivery'
  | 'connecticut-strict-internal-reporting'
  | 'verified-contextual-ads' | 'verified-processor-reporting'
  | 'ad-personal-data-withdrawn' | 'requested-competition-service';

export type RegionalUnresolvedCondition =
  | RegionalMissingFact | 'worldwide-scope'
  | 'outside-audience' | 'parent-permission'
  | 'provider-only-processing' | 'notice-before-collection'
  | 'advertising-route-not-verified' | 'google-only-demand-not-verified'
  | 'ad-third-party-recipients-not-disclosed' | 'ad-bid-data-not-minimized'
  | 'ad-creative-processing-not-restricted' | 'ad-sale-sharing-restrictions-not-verified'
  | 'ad-contractual-purpose-retention-not-verified'
  | 'non-sensitive-data-assessment' | 'purpose-and-retention-limits'
  | 'non-personalized-ads' | 'restricted-data-processing'
  | 'quebec-function-assessment'
  | 'connecticut-contextual-delivery-necessity'
  | 'connecticut-strict-internal-necessity'
  | 'ad-personal-data-withdrawn';

export type RegionalPolicyResolution = {
  region: PrivacyRegion;
  requirements: Record<Purpose, PurposeRequirement>;
  reasons: Record<Purpose, RegionalPolicyReason>;
  unresolvedConditions: Record<Purpose, RegionalUnresolvedCondition[]>;
  missingFacts: RegionalMissingFact[];
};

const US_STATES = new Set(
  'AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC'.split(' '),
);
const CA_PROVINCES = new Set('AB BC MB NB NL NS NT NU ON PE QC SK YT'.split(' '));
const purposes: Purpose[] = ['ads', 'analytics', 'competition'];

function normalizeSubdivision(country: string, subdivision: string | null): string {
  const value = subdivision?.trim().toUpperCase() ?? '';
  return value.startsWith(country + '-') ? value.slice(country.length + 1) : value;
}

function validAge(age: AgeEvidence): boolean {
  if (age.status !== 'shared' || age.source === 'none' ||
      (age.lowerBound === null && age.upperBound === null)) return false;
  if (age.lowerBound !== null &&
      (!Number.isSafeInteger(age.lowerBound) || age.lowerBound < 0)) return false;
  return age.upperBound === null ||
    (Number.isSafeInteger(age.upperBound) && age.upperBound >= (age.lowerBound ?? 0));
}

function initialResolution(region: PrivacyRegion): RegionalPolicyResolution {
  return {
    region,
    requirements: { ads: 'unresolved', analytics: 'unresolved', competition: 'unresolved' },
    reasons: { ads: 'data-flow-not-cleared', analytics: 'data-flow-not-cleared', competition: 'data-flow-not-cleared' },
    unresolvedConditions: { ads: [], analytics: [], competition: [] },
    missingFacts: [],
  };
}

function unresolvedAll(
  region: PrivacyRegion, reason: RegionalPolicyReason,
  conditions: RegionalUnresolvedCondition[], missingFacts: RegionalMissingFact[] = [],
): RegionalPolicyResolution {
  const result = initialResolution(region);
  for (const purpose of purposes) {
    result.reasons[purpose] = reason;
    result.unresolvedConditions[purpose] = [...conditions];
  }
  result.missingFacts = [...missingFacts];
  return result;
}

function flowConditions(flow: RegionalFlowChecks, requireProviderOnly = true): RegionalUnresolvedCondition[] {
  const conditions: RegionalUnresolvedCondition[] = [];
  if (requireProviderOnly && flow.providerOnly !== true) conditions.push('provider-only-processing');
  if (flow.disclosed !== true) conditions.push('notice-before-collection');
  if (flow.nonSensitive !== true) conditions.push('non-sensitive-data-assessment');
  if (flow.purposeLimited !== true) conditions.push('purpose-and-retention-limits');
  return conditions;
}

function advertisingRouteConditions(flow: RegionalAdsChecks): RegionalUnresolvedCondition[] {
  // Preserve the existing reviewed processor route. The alternative is specific to ads.
  if (flow.providerOnly === true) return [];
  const route = flow.routeVerification;
  if (!route || (route.kind !== 'google-only' && route.kind !== 'restricted-demand')) {
    return ['advertising-route-not-verified'];
  }
  const conditions: RegionalUnresolvedCondition[] = [];
  if (route.kind === 'google-only') {
    if (route.demandRestrictedToGoogle !== true) conditions.push('google-only-demand-not-verified');
    if (route.thirdPartyCreativeVendorsExcluded !== true) conditions.push('ad-creative-processing-not-restricted');
  } else {
    if (route.thirdPartyRecipientsDisclosed !== true) conditions.push('ad-third-party-recipients-not-disclosed');
    if (route.bidRequestDataMinimized !== true) conditions.push('ad-bid-data-not-minimized');
    if (route.creativeProcessingRestricted !== true) conditions.push('ad-creative-processing-not-restricted');
  }
  if (route.noSaleSharingOrCrossContext !== true) conditions.push('ad-sale-sharing-restrictions-not-verified');
  if (route.contractualPurposeAndRetentionLimits !== true) conditions.push('ad-contractual-purpose-retention-not-verified');
  return conditions;
}

function newYorkApplies(evidence: NewYorkApplicabilityEvidence | undefined): boolean | null {
  if (evidence?.status === 'applies' &&
      (evidence.basis === 'in-state-activity' || evidence.basis === 'covered-data-history')) return true;
  if (evidence?.status === 'wholly-outside' && evidence.collectedOutsideNewYork === true &&
      evidence.noUseInNewYork === true && evidence.noNewYorkCollectedDataUsed === true) return false;
  return null;
}

/**
 * Resolves a requirement, not permission to start an SDK. The central processing
 * policy still enforces Apple requirements, notice versions and independent choices.
 * A successful resolution is not consent, proof of SDK configuration, or legal certification.
 */
export function resolveRegionalPolicy(input: RegionalPolicyInputs): RegionalPolicyResolution {
  const country = input.country?.trim().toUpperCase() ?? '';
  if (!country || country === 'UNKNOWN') {
    return unresolvedAll('unknown', 'country-unconfirmed', ['country'], ['country']);
  }
  if (country !== 'US' && country !== 'CA') {
    return unresolvedAll('other', 'worldwide-not-cleared', ['worldwide-scope']);
  }

  const subdivision = normalizeSubdivision(country, input.subdivision);
  // NON-QC is an explicit coarse answer, never an inferred or fabricated province.
  if (country === 'CA' && !CA_PROVINCES.has(subdivision) && subdivision !== 'NON-QC') {
    return unresolvedAll('unknown', 'quebec-status-unconfirmed', ['quebec-status'], ['quebec-status']);
  }
  const region: PrivacyRegion = country === 'US' ? 'us' :
    subdivision === 'QC' ? 'ca-quebec' : 'ca-other';

  if (!validAge(input.age)) {
    return unresolvedAll(region, 'age-unresolved', ['age'], ['age']);
  }
  const lower = input.age.lowerBound ?? 0;
  const upper = input.age.upperBound;
  if (upper !== null && upper < 13) {
    return unresolvedAll(region, 'outside-audience', ['outside-audience']);
  }
  if (lower < 13) {
    return unresolvedAll(region, 'age-unresolved', ['age'], ['age']);
  }
  if (region === 'ca-quebec' && lower < 14) {
    return upper !== null && upper < 14
      ? unresolvedAll(region, 'parent-permission-required', ['parent-permission'])
      : unresolvedAll(region, 'age-14-unresolved', ['age-at-least-14'], ['age-at-least-14']);
  }

  // A range crossing 18 still receives the minor rules. Only lower >=18 proves adult.
  const protectedMinor = lower < 18;
  const result = initialResolution(region);
  result.requirements.competition = 'requested-service';
  result.reasons.competition = 'requested-competition-service';

  if (country === 'US' && protectedMinor && !US_STATES.has(subdivision)) {
    for (const purpose of ['ads', 'analytics'] as const) {
      result.reasons[purpose] = 'state-unconfirmed';
      result.unresolvedConditions[purpose] = ['state'];
    }
    result.missingFacts = ['state'];
    return result;
  }

  const adsConditions = [
    ...advertisingRouteConditions(input.flows.ads),
    ...flowConditions(input.flows.ads, false),
  ];
  if (input.flows.ads.nonPersonalized !== true) adsConditions.push('non-personalized-ads');
  if (input.flows.ads.restrictedDataProcessing !== true) adsConditions.push('restricted-data-processing');
  result.unresolvedConditions.ads = adsConditions;
  result.unresolvedConditions.analytics = flowConditions(input.flows.analytics);

  for (const purpose of ['ads', 'analytics'] as const) {
    if (purpose === 'ads' && input.choices.adsWithdrawalScope === 'all-ad-personal-data') {
      // RDP/NPA and Google's limited ads are not proof of zero personal-data processing.
      result.reasons.ads = 'ad-personal-data-withdrawn';
      result.unresolvedConditions.ads = ['ad-personal-data-withdrawn'];
      continue;
    }
    if (result.unresolvedConditions[purpose].length > 0) continue;

    let requirement: PurposeRequirement = 'notice-and-opt-out';
    let reason: RegionalPolicyReason = purpose === 'ads'
      ? 'verified-contextual-ads' : 'verified-processor-reporting';
    if (country === 'US' && protectedMinor && subdivision === 'CT') {
      const cleared = purpose === 'ads'
        ? input.flows.ads.connecticutNecessaryContextualDelivery === true
        : input.flows.analytics.connecticutStrictInternalNecessity === true;
      if (!cleared) {
        result.reasons[purpose] = 'connecticut-necessity-not-verified';
        result.unresolvedConditions[purpose] = [purpose === 'ads'
          ? 'connecticut-contextual-delivery-necessity'
          : 'connecticut-strict-internal-necessity'];
        continue;
      }
      reason = purpose === 'ads'
        ? 'connecticut-necessary-contextual-delivery' : 'connecticut-strict-internal-reporting';
    }

    if (region === 'ca-quebec') {
      const functions = input.flows[purpose].quebecFunctions;
      if (functions !== 'not-present' && functions !== 'activation-required') {
        result.reasons[purpose] = 'quebec-functions-unassessed';
        result.unresolvedConditions[purpose] = ['quebec-function-assessment'];
        continue;
      }
      if (functions === 'activation-required') {
        const activated = purpose === 'ads'
          ? input.choices.quebecAdsFunctionsActivated === true
          : input.choices.quebecAnalyticsFunctionsActivated === true;
        requirement = activated ? 'notice-and-opt-out' : 'express-consent';
        reason = activated
          ? 'quebec-functions-activated' : 'quebec-function-activation-required';
      }
    }

    if (protectedMinor) {
      const applies = newYorkApplies(input.newYorkApplicability?.[purpose]);
      if (applies === null) {
        result.reasons[purpose] = 'new-york-applicability-unresolved';
        result.unresolvedConditions[purpose] = ['new-york-applicability'];
        if (!result.missingFacts.includes('new-york-applicability')) {
          result.missingFacts.push('new-york-applicability');
        }
        continue;
      }
      if (applies) {
        // In-state activity/history can apply regardless of the residence field.
        requirement = 'express-consent';
        reason = 'new-york-minor-express-consent';
      }
    }
    result.requirements[purpose] = requirement;
    result.reasons[purpose] = reason;
  }
  return result;
}
