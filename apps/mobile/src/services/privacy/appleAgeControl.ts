import { Platform } from 'react-native';
import {
  AppleAgeRangeResult, AppleAgeRequirements,
  getAppleAgeRequirements, requestAppleAgeRange, DEFAULT_APPLE_AGE_GATES, validateAppleAgeGates,
} from '../../../modules/flap-fit-age-range';
import {
  getProcessingAccess, getProcessingInputs, getAgeVerificationRevision, hydrateProcessingAccess,
  clearAgeVerification, verifyTransientAgeEvidence, setAppleAgeRequirement,
} from './processingAccess';
import { AgeEvidence, AppleRequirement, ProcessingAccess } from './processingPolicy';
import { resolveRegionalPolicy, RegionalPolicyInputs, RegionalPolicyResolution } from './regionalPolicy';

export type AppleAgeVerificationContext = Omit<RegionalPolicyInputs, 'age'>;
export type AppleAgeVerificationResult = {
  status: 'processed' | 'stale' | 'unavailable';
  access: ProcessingAccess;
  regional: RegionalPolicyResolution | null;
};

let generation = 0;
let preparation: Promise<AppleRequirement> | null = null;
let request: Promise<AppleAgeVerificationResult> | null = null;
let requestGatesKey: string | null = null;

/** This checks API availability and duties, never permission to use personal data. */
export function interpretAppleRequirements(
  value: AppleAgeRequirements, platform: string, majorVersion: number,
): AppleRequirement {
  if (platform !== 'ios') return 'unsupported';
  if (value.status === 'unsupported' && majorVersion < 26) return 'unsupported';
  if (value.status !== 'available' || !value.ageRangeSupported ||
      !value.compiledCapabilities.ageRange || value.regulatoryFeatures.includes('unknown')) return 'error';
  if (value.regulatoryFeatures.includes('declaredAgeRangeRequired') || value.eligibility === true) return 'required';
  if ((value.regulatoryFeaturesSupported && value.compiledCapabilities.regulatoryFeatures) ||
      (value.compiledCapabilities.regionalEligibility && value.eligibility === false)) return 'not-required';
  // A basic age API without a usable regional duty check does not prove exemption.
  return 'error';
}
export function prepareAppleAgeControl(): Promise<AppleRequirement> {
  if (preparation) return preparation;
  const token = ++generation;
  preparation = (async () => {
    await hydrateProcessingAccess();
    if (token !== generation) return getProcessingInputs().appleRequirement;
    setAppleAgeRequirement('pending');
    const verificationToken = getAgeVerificationRevision();
    let value: AppleAgeRequirements;
    try { value = await getAppleAgeRequirements(); }
    catch {
      if (token === generation && verificationToken === getAgeVerificationRevision()) setAppleAgeRequirement('error');
      return getProcessingInputs().appleRequirement;
    }
    const requirement = interpretAppleRequirements(value, Platform.OS, Number.parseInt(String(Platform.Version), 10));
    if (token === generation && verificationToken === getAgeVerificationRevision()) {
      setAppleAgeRequirement(requirement);
      return requirement;
    }
    return getProcessingInputs().appleRequirement;
  })().finally(() => { preparation = null; });
  return preparation;
}
/** Called at the reviewed privacy entry point, after the coarse jurisdiction is known.
 * Apple's own sheet may appear. A response is synchronously reduced to purpose decisions
 * and ad protections, then discarded. Neither this promise nor runtime snapshots retain it. */
export function requestAppleAgeEvidence(
  context: AppleAgeVerificationContext,
  ageGates?: readonly number[],
): Promise<AppleAgeVerificationResult> {
  if (ageGates !== undefined && !validateAppleAgeGates(ageGates)) {
    clearAgeVerification();
    return Promise.resolve({ status: 'unavailable', access: getProcessingAccess(), regional: null });
  }
  const gates = [...(ageGates ?? DEFAULT_APPLE_AGE_GATES)];
  const gatesKey = gates.join(',');
  if (request) {
    if (gatesKey === requestGatesKey) return request;
    // Do not reuse a response requested for different distinctions or present two sheets.
    clearAgeVerification();
    return Promise.resolve({ status: 'unavailable', access: getProcessingAccess(), regional: null });
  }
  const coarse = resolveRegionalPolicy({
    ...context, age: { source: 'none', status: 'unknown', lowerBound: null, upperBound: null },
  }).region;
  if (coarse === 'unknown' || coarse !== getProcessingInputs().region) {
    clearAgeVerification();
    return Promise.resolve({ status: 'unavailable', access: getProcessingAccess(), regional: null });
  }
  clearAgeVerification();
  const token = generation;
  const verificationToken = getAgeVerificationRevision();
  // Snapshot only non-Apple policy facts. A caller changing them must invalidate/reverify.
  const policy = {
    ...context,
    flows: { ads: { ...context.flows.ads }, analytics: { ...context.flows.analytics } },
    choices: { ...context.choices },
  };
  requestGatesKey = gatesKey;
  request = (async (): Promise<AppleAgeVerificationResult> => {
    let response: AppleAgeRangeResult | null = null;
    let age: AgeEvidence | null = null;
    try {
      response = ageGates === undefined
        ? await requestAppleAgeRange() : await requestAppleAgeRange(gates);
      if (token !== generation || verificationToken !== getAgeVerificationRevision()) {
        return { status: 'stale', access: getProcessingAccess(), regional: null };
      }
      age = {
        source: response.status === 'shared' ? 'apple' : 'none',
        status: response.status,
        lowerBound: response.status === 'shared' ? response.lowerBound : null,
        upperBound: response.status === 'shared' ? response.upperBound : null,
      };
      const regional = resolveRegionalPolicy({ ...policy, age });
      if (regional.region !== getProcessingInputs().region || regional.region === 'unknown') {
        clearAgeVerification();
        return { status: 'unavailable', access: getProcessingAccess(), regional: null };
      }
      const accepted = verifyTransientAgeEvidence(
        age, response.status === 'shared', verificationToken, regional.requirements,
      );
      return {
        status: accepted ? 'processed' : 'stale', access: getProcessingAccess(),
        regional: accepted ? regional : null,
      };
    } catch {
      if (token === generation && verificationToken === getAgeVerificationRevision()) clearAgeVerification();
      return { status: 'unavailable', access: getProcessingAccess(), regional: null };
    } finally {
      // Deliberately drop the raw response, including assurance/communication fields.
      // No range/source/band is written to shared state, storage, logs, or return values.
      response = null;
      age = null;
    }
  })().finally(() => { request = null; requestGatesKey = null; });
  return request;
}
/** Invalidate a late system response before rechecking a changed account or region. */
export function invalidateAppleAgeEvidence(): void {
  ++generation;
  setAppleAgeRequirement('pending');
}
