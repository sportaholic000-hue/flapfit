import { getProcessingInputs } from './processingAccess';
import { resolveReleaseEligibility, type ReleaseEligibility } from './releaseEligibility';

export type GameEntryDecision = ReleaseEligibility;

/** No trial quota or advertising-storage dependency. The former first-run marker
 * is deliberately ignored, including for existing installations. */
export async function authorizeGameEntry(): Promise<GameEntryDecision> {
  return resolveReleaseEligibility(getProcessingInputs());
}
