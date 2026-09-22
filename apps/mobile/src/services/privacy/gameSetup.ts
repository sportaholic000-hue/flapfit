import { getProcessingInputs } from './processingAccess';
import { hasLaunchAgeVerification } from './processingPolicy';
import { isRegionalAdvertisingDisabled } from './regionalAdvertising';
import { needsLocalAgeAnswer, restoreLocalAgeAnswer } from './localAgeAnswer';
import { needsConnecticutClarification, needsQuebecClarification, restoreRegionalClarification } from './regionalClarification';
import { needsNewYorkClarification, restoreNewYorkClarification } from './newYorkClarification';
import { isProcessingNoticeAcknowledged, restoreProcessingNotice } from './processingNotice';

/** Restore facts and the notice only. This never grants permission or calls a provider. */
export async function restoreGameSetup(): Promise<void> {
  await restoreRegionalClarification();
  await restoreNewYorkClarification();
  await restoreLocalAgeAnswer();
  await restoreProcessingNotice();
}

/** Required after the initial completed run. A privacy refusal, Google choice,
 * reporting preference or missing ad inventory is never a gameplay prerequisite. */
export function needsGameSetup(): boolean {
  const input = getProcessingInputs();
  // A country-service outage does not create a new offline gameplay ban. It
  // grants no answer or notice; once country resolution returns, recheck them.
  if (!input.launch?.current || !input.launch.country) return false;
  if (!input.hydrated || !hasLaunchAgeVerification(input)) return true;
  if (needsLocalAgeAnswer() || needsQuebecClarification() || needsConnecticutClarification() || needsNewYorkClarification()) return true;
  // Known protected audiences need no advertising notice to continue playing.
  if (isRegionalAdvertisingDisabled(input)) return false;
  return !isProcessingNoticeAcknowledged();
}
