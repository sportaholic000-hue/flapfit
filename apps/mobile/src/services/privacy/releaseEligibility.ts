import type { ProcessingRuntimeInputs } from './processingPolicy';

export type ReleaseEligibility =
  | { status: 'available' }
  | { status: 'unanswered'; reason: 'age' }
  | { status: 'unavailable'; reason: 'age' | 'apple' };

/** Gameplay is independent of regional advertising, notices, saved purpose choices
 * and country lookups. Retain only known audience and required Apple access checks. */
export function resolveReleaseEligibility(input: ProcessingRuntimeInputs): ReleaseEligibility {
  if (input.appleAccessRestricted) return { status: 'unavailable', reason: 'apple' };
  if (input.launch?.plan?.ageEligibility === 'outside-audience' ||
      input.verification?.eligibility === 'outside-audience') return { status: 'unavailable', reason: 'age' };
  if (input.appleRequirement === 'required' &&
      (!input.verification?.mandatoryCheckSatisfied || input.appleRescissionPending)) return { status: 'unanswered', reason: 'age' };
  return { status: 'available' };
}

export function releaseEligibilityMessage(value: ReleaseEligibility): string {
  if (value.status === 'available') return 'Gameplay is available.';
  if (value.status === 'unavailable') {
    return value.reason === 'apple'
      ? 'Apple account access must be restored before another game.'
      : 'Flap Fit is for ages 13 and older.';
  }
  return 'Complete the required Apple age check before another game.';
}
