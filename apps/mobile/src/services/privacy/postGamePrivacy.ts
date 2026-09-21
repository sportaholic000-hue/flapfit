import { Alert } from 'react-native';
import { needsConnecticutClarification, needsQuebecClarification } from './regionalClarification';
import { needsLocalAgeAnswer } from './localAgeAnswer';
import { needsNewYorkClarification } from './newYorkClarification';
import { getProcessingInputs } from './processingAccess';
import { isRegionalAdvertisingDisabled } from './regionalAdvertising';
import { isMonetizationPrepared, prepareMonetization } from '../monetization';
import {
  acknowledgeProcessingNotice, AD_PROCESSING_DISCLOSURE, canPresentProcessingNotice,
  isProcessingNoticeAcknowledged, needsSeparatePurposeChoice, restoreProcessingNotice,
} from './processingNotice';

/** Called only for a claimed Done/Retry/Next action after a completed game.
 * Sharing, result appearance and foreground events never invoke this. */
export async function preparePostGamePrivacy(
  canPresent: () => boolean,
  openChoices: () => Promise<void>,
): Promise<void> {
  await restoreProcessingNotice();
  if (!canPresent()) return;
  // Do not begin a new consent refresh or discard a ready result ad merely
  // because another eligible exit was tapped. Explicit privacy refreshes retain
  // their existing invalidation/race handling in the monetization adapter.
  if (isMonetizationPrepared() && isProcessingNoticeAcknowledged() &&
      !needsNewYorkClarification() && !needsLocalAgeAnswer() && !needsConnecticutClarification() && !needsQuebecClarification() && !needsSeparatePurposeChoice('ads') && !needsSeparatePurposeChoice('analytics')) return;
  await prepareMonetization(canPresent);
  await restoreProcessingNotice();
  // Regional restrictions disable providers, never the next workout. Existing
  // withdrawal controls remain accessible in Info; do not solicit new consent.
  if (isRegionalAdvertisingDisabled(getProcessingInputs())) return;
  if (!canPresent() || (!canPresentProcessingNotice() && !needsNewYorkClarification() && !needsLocalAgeAnswer() && !needsConnecticutClarification() && !needsQuebecClarification())) return;
  const requiredChoices = needsNewYorkClarification() || needsLocalAgeAnswer() || needsConnecticutClarification() || needsQuebecClarification() || needsSeparatePurposeChoice('ads') || needsSeparatePurposeChoice('analytics');
  if (!isProcessingNoticeAcknowledged() || requiredChoices) {
    if (requiredChoices) {
      await openChoices();
      // Dismissal is neither a regional answer nor a purpose choice. Explicit
      // Yes/No, Allow and Stop actions alone persist their respective decisions.
      // An unanswered clarification remains pending, including after restart.
    } else {
      const action = await new Promise<'continue' | 'choices' | 'cancel'>(resolve => {
        Alert.alert('Ads keep Flap Fit free', AD_PROCESSING_DISCLOSURE +
          '\n\nContinue with these uses, or review them in Privacy & choices. You can withdraw advertising data consent there at any time. Stopping RevenueCat reporting separately leaves permitted Google ads enabled.', [
          { text: 'Privacy & choices', onPress: () => resolve('choices') },
          { text: 'Continue', onPress: () => resolve('continue') },
        ], { cancelable: true, onDismiss: () => resolve('cancel') });
      });
      if (!canPresent()) return;
      if (action === 'choices') await openChoices();
      else if (action === 'continue') await acknowledgeProcessingNotice();
    }
  }
  if (canPresent() && !isMonetizationPrepared()) await prepareMonetization(canPresent);
}
