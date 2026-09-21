import { getProcessingInputs } from './processingAccess';
import { hasSavedUnder13Answer } from './localAgeAnswer';
import { resolveReleaseEligibility, type ReleaseEligibility } from './releaseEligibility';

export type GameEntryDecision = ReleaseEligibility;

/** No trial quota or optional advertising prerequisite. Restore the existing
 * local audience answer before admitting a new game, independently of country
 * lookup. Current verified Apple evidence takes precedence over an older local
 * answer; the local answer can never satisfy a required Apple check. */
export async function authorizeGameEntry(): Promise<GameEntryDecision> {
  const initial = getProcessingInputs();
  if (initial.appleAccessRestricted || initial.verification?.mandatoryCheckSatisfied) {
    return resolveReleaseEligibility(initial);
  }
  const savedUnder13 = await hasSavedUnder13Answer();
  const current = getProcessingInputs();
  const decision = resolveReleaseEligibility(current);
  // Re-read after storage: an Apple check/restriction or local correction may
  // have completed during restoration. No unknown/failed read becomes a ban.
  if (savedUnder13 && !current.appleAccessRestricted && !current.verification?.mandatoryCheckSatisfied) {
    return { status: 'unavailable', reason: 'age' };
  }
  return decision;
}
