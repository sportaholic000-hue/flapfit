export type AppleAgeAssurance = 'selfDeclared' | 'guardianDeclared' | 'confirmed' | 'unknown';

export type AppleRegulatoryFeature =
  | 'declaredAgeRangeRequired'
  | 'significantAppChangeRequiresParentalConsent'
  | 'significantAppChangeRequiresAdultNotification'
  | 'unknown';

export type AppleAgeStatus = 'unsupported' | 'unavailable' | 'error' | 'unknown';

export type AppleAgeCompiledCapabilities = {
  ageRange: boolean;
  regionalEligibility: boolean;
  regulatoryFeatures: boolean;
  confirmedAssurance: boolean;
};

export type AppleAgeRequirements = {
  compiledCapabilities: AppleAgeCompiledCapabilities;
  status: 'available' | AppleAgeStatus;
  ageRangeSupported: boolean;
  eligibility: boolean | null;
  regulatoryFeaturesSupported: boolean;
  regulatoryFeatures: AppleRegulatoryFeature[];
};

export type AppleAgeRangeResult = {
  status: 'shared' | 'declined' | AppleAgeStatus;
  /** Exact Apple bounds, inclusive. null is an open end, never an adult default. */
  lowerBound: number | null;
  upperBound: number | null;
  assurance: AppleAgeAssurance;
  communicationLimits: boolean | null;
};

export type AppleAgeNativeModule = {
  getRequirements(): Promise<unknown>;
  /** Legacy no-argument request remains compatible with already-built native clients. */
  requestAgeRange(): Promise<unknown>;
  /** Absent in older native clients; custom gates must never silently fall back. */
  requestAgeRangeWithGates?(ageGates: number[]): Promise<unknown>;
};
