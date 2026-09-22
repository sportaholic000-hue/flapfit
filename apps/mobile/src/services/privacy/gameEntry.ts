import { getProcessingInputs } from './processingAccess';
import { hasSavedUnder13Answer } from './localAgeAnswer';
import { resolveReleaseEligibility, type ReleaseEligibility } from './releaseEligibility';

import { needsGameSetup, restoreGameSetup } from './gameSetup';

export type GameEntryDecision = ReleaseEligibility | { status: 'setup-required' };

/** Restore the existing
 * local audience answer before admitting a new game, independently of country
 * lookup. Current verified Apple evidence takes precedence over an older local
 * answer; the local answer can never satisfy a required Apple check. */
async function authorizeAudience(): Promise<ReleaseEligibility> {
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

/** Completed-run history already lives in the game store. Recheck at every new
 * run, including Home/deep links and relaunch; never interrupt an active game. */
export async function authorizeGameEntry(afterCompletedRun = false): Promise<GameEntryDecision> {
  const audience = await authorizeAudience();
  if (audience.status !== 'available' || !afterCompletedRun) return audience;
  await restoreGameSetup();
  const current = resolveReleaseEligibility(getProcessingInputs());
  if (current.status !== 'available') return current;
  return needsGameSetup() ? { status: 'setup-required' } : current;
}
