import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';
import {
  emptyAppleAgeRange,
  emptyAppleRequirements,
  normalizeAppleAgeRange,
  normalizeAppleRequirements,
} from './src/normalize';
import type { AppleAgeNativeModule, AppleAgeRangeResult, AppleAgeRequirements } from './src/types';
import { DEFAULT_APPLE_AGE_GATES, validateAppleAgeGates } from './src/gates';
export { DEFAULT_APPLE_AGE_GATES, validateAppleAgeGates } from './src/gates';

export type {
  AppleAgeAssurance,
  AppleAgeCompiledCapabilities,
  AppleAgeRangeResult,
  AppleAgeRequirements,
  AppleRegulatoryFeature,
} from './src/types';

function nativeModule(): AppleAgeNativeModule | null {
  if (Platform.OS !== 'ios') return null;
  try {
    return requireOptionalNativeModule<AppleAgeNativeModule>('FlapFitAgeRange');
  } catch {
    return null;
  }
}

/** Read-only regional capability query. Never presents Apple's age-sharing sheet. */
export async function getAppleAgeRequirements(): Promise<AppleAgeRequirements> {
  const native = nativeModule();
  if (!native) return emptyAppleRequirements('unsupported');
  try {
    return normalizeAppleRequirements(await native.getRequirements());
  } catch {
    return emptyAppleRequirements('error');
  }
}

/** May present Apple's own sheet. Optional gates request only relevant distinctions.
 * Default remains 13/16/18; Apple can override them in regulated regions. */
export async function requestAppleAgeRange(ageGates?: readonly number[]): Promise<AppleAgeRangeResult> {
  if (ageGates !== undefined && !validateAppleAgeGates(ageGates)) return emptyAppleAgeRange('error');
  const gates = ageGates === undefined ? null : [...ageGates];
  const native = nativeModule();
  if (!native) return emptyAppleAgeRange('unsupported');
  try {
    if (gates === null) return normalizeAppleAgeRange(await native.requestAgeRange());
    if (native.requestAgeRangeWithGates) {
      return normalizeAppleAgeRange(await native.requestAgeRangeWithGates(gates));
    }
    if (gates.length === DEFAULT_APPLE_AGE_GATES.length &&
        gates.every((gate, index) => gate === DEFAULT_APPLE_AGE_GATES[index])) {
      return normalizeAppleAgeRange(await native.requestAgeRange());
    }
    return emptyAppleAgeRange('unsupported');
  } catch {
    return emptyAppleAgeRange('error');
  }
}
