import type {
  AppleAgeAssurance,
  AppleAgeRangeResult,
  AppleAgeRequirements,
  AppleAgeStatus,
  AppleRegulatoryFeature,
} from './types';

const failureStatuses: readonly AppleAgeStatus[] = [
  'unsupported', 'unavailable', 'error', 'unknown',
];
const features: readonly AppleRegulatoryFeature[] = [
  'declaredAgeRangeRequired',
  'significantAppChangeRequiresParentalConsent',
  'significantAppChangeRequiresAdultNotification',
  'unknown',
];
const assurances: readonly AppleAgeAssurance[] = [
  'selfDeclared', 'guardianDeclared', 'confirmed', 'unknown',
];

export function emptyAppleRequirements(
  status: AppleAgeStatus,
): AppleAgeRequirements {
  return {
    status,
    compiledCapabilities: {
      ageRange: false, regionalEligibility: false,
      regulatoryFeatures: false, confirmedAssurance: false,
    },
    ageRangeSupported: false,
    eligibility: null,
    regulatoryFeaturesSupported: false,
    regulatoryFeatures: [],
  };
}

export function emptyAppleAgeRange(
  status: AppleAgeStatus | 'declined',
): AppleAgeRangeResult {
  return {
    status,
    lowerBound: null,
    upperBound: null,
    assurance: 'unknown',
    communicationLimits: null,
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function nullableBoolean(value: unknown): value is boolean | null {
  return value === null || typeof value === 'boolean';
}

function nullableAge(value: unknown): value is number | null {
  return value === null ||
    (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0);
}

/** Allow-list the bridge response: no native error strings, account data, or extras escape. */
export function normalizeAppleRequirements(value: unknown): AppleAgeRequirements {
  if (!isObject(value)) return emptyAppleRequirements('unknown');
  const status = value.status;
  if (status !== 'available' && !failureStatuses.includes(status as AppleAgeStatus)) {
    return emptyAppleRequirements('unknown');
  }
  const capabilities = value.compiledCapabilities;
  if (
    !isObject(capabilities) ||
    !['ageRange', 'regionalEligibility', 'regulatoryFeatures', 'confirmedAssurance']
      .every((key) => typeof capabilities[key] === 'boolean') ||
    typeof value.ageRangeSupported !== 'boolean' ||
    !nullableBoolean(value.eligibility) ||
    typeof value.regulatoryFeaturesSupported !== 'boolean' ||
    !Array.isArray(value.regulatoryFeatures) ||
    !value.regulatoryFeatures.every((feature) => typeof feature === 'string')
  ) return emptyAppleRequirements('unknown');

  const normalizedFeatures = Array.from(new Set(
    value.regulatoryFeatures.map((feature) =>
      features.includes(feature as AppleRegulatoryFeature)
        ? feature as AppleRegulatoryFeature : 'unknown' as const),
  ));
  // A failure must not turn a missing regional lookup into an affirmative exemption.
  return {
    status: status as AppleAgeRequirements['status'],
    compiledCapabilities: {
      ageRange: capabilities.ageRange as boolean,
      regionalEligibility: capabilities.regionalEligibility as boolean,
      regulatoryFeatures: capabilities.regulatoryFeatures as boolean,
      confirmedAssurance: capabilities.confirmedAssurance as boolean,
    },
    ageRangeSupported: value.ageRangeSupported,
    eligibility: status === 'available' ? value.eligibility :
      value.eligibility === true ? true : null,
    regulatoryFeaturesSupported: status === 'available' &&
      value.regulatoryFeaturesSupported,
    regulatoryFeatures: normalizedFeatures,
  };
}

export function normalizeAppleAgeRange(value: unknown): AppleAgeRangeResult {
  if (!isObject(value)) return emptyAppleAgeRange('unknown');
  if (value.status === 'declined') return emptyAppleAgeRange('declined');
  if (failureStatuses.includes(value.status as AppleAgeStatus)) {
    return emptyAppleAgeRange(value.status as AppleAgeStatus);
  }
  if (
    value.status !== 'shared' ||
    !nullableAge(value.lowerBound) ||
    !nullableAge(value.upperBound) ||
    (value.lowerBound === null && value.upperBound === null) ||
    (value.lowerBound !== null && value.upperBound !== null &&
      value.lowerBound > value.upperBound) ||
    !nullableBoolean(value.communicationLimits)
  ) return emptyAppleAgeRange('unknown');

  return {
    status: 'shared',
    lowerBound: value.lowerBound,
    upperBound: value.upperBound,
    assurance: assurances.includes(value.assurance as AppleAgeAssurance)
      ? value.assurance as AppleAgeAssurance : 'unknown',
    communicationLimits: value.communicationLimits,
  };
}
