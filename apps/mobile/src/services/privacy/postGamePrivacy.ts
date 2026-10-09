import { Alert } from 'react-native';
import { needsGameSetup } from './gameSetup';
import { needsConnecticutClarification, needsQuebecClarification } from './regionalClarification';
import { needsLocalAgeAnswer } from './localAgeAnswer';
import { needsNewYorkClarification } from './newYorkClarification';
import { getProcessingInputs } from './processingAccess';
import { isRegionalAdvertisingDisabled } from './regionalAdvertising';
import { isMonetizationPrepared, prepareMonetization } from '../monetization';
import {
  acknowledgeProcessingNotice, AD_PROCESSING_SUMMARY, canPresentProcessingNotice,
  isProcessingNoticeAcknowledged, needsSeparatePurposeChoice, restoreProcessingNotice,
} from './processingNotice';

/** Called only for a claimed Done/Retry/Next action after a completed game.
 * Sharing, result appearance and foreground events never invoke this. */
function needsReportingPrompt(): boolean {
  // Optional European reporting can remain unset. Acknowledging setup is not
  // consent and must not nag players on every subsequent result action.
  return needsSeparatePurposeChoice('analytics') &&
    (!getProcessingInputs().launch?.plan?.europeanReportingActivationRequired || !isProcessingNoticeAcknowledged());
}
export async function preparePostGamePrivacy(
  canPresent: () => boolean,
  openChoices: (showDetails?: boolean) => Promise<void>,
): Promise<boolean> {
  await restoreProcessingNotice();
  if (!canPresent()) return false;
  // Do not begin a new consent refresh or discard a ready result ad merely
  // because another eligible exit was tapped. Explicit privacy refreshes retain
  // their existing invalidation/race handling in the monetization adapter.
  if (isMonetizationPrepared() && isProcessingNoticeAcknowledged() &&
      !needsNewYorkClarification() && !needsLocalAgeAnswer() && !needsConnecticutClarification() && !needsQuebecClarification() && !needsSeparatePurposeChoice('ads') && !needsReportingPrompt() && !needsGameSetup()) return true;
  await prepareMonetization(canPresent);
  await restoreProcessingNotice();
  // Regional restrictions disable providers, never the next workout. Existing
  // Google privacy options remain managed by UMP; do not solicit new consent.
  if (isRegionalAdvertisingDisabled(getProcessingInputs()) && !needsGameSetup()) return true;
  if (!canPresent()) return false;
  if (!canPresentProcessingNotice() && !needsNewYorkClarification() && !needsLocalAgeAnswer() && !needsConnecticutClarification() && !needsQuebecClarification()) return !needsGameSetup();
  const requiredChoices = needsNewYorkClarification() || needsLocalAgeAnswer() || needsConnecticutClarification() || needsQuebecClarification() || needsSeparatePurposeChoice('ads') || needsReportingPrompt();
  if (!isProcessingNoticeAcknowledged() || requiredChoices) {
    if (requiredChoices) {
      await openChoices();
      // Dismissal is neither a regional answer nor a purpose choice. Explicit
      // Yes/No, Allow and Stop actions alone persist their respective decisions.
      // An unanswered clarification remains pending, including after restart.
    } else {
      const action = await new Promise<'continue' | 'choices' | 'cancel'>(resolve => {
        Alert.alert('Ads support Flap Fit', AD_PROCESSING_SUMMARY, [
          { text: 'Privacy & choices', onPress: () => resolve('choices') },
          { text: 'Continue', onPress: () => resolve('continue') },
        ], { cancelable: true, onDismiss: () => resolve('cancel') });
      });
      if (!canPresent()) return false;
      if (action === 'choices') await openChoices(true);
      else if (action === 'continue') await acknowledgeProcessingNotice();
    }
  }
  if (canPresent() && !isMonetizationPrepared()) await prepareMonetization(canPresent);
  return canPresent() && !needsGameSetup();
}
