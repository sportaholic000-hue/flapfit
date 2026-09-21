import { Alert } from 'react-native';
import { needsConnecticutClarification, saveConnecticutResidency, needsQuebecClarification, saveQuebecResidency } from './regionalClarification';
import { isMonetizationPrepared, prepareMonetization } from '../monetization';
import {
  acknowledgeProcessingNotice, AD_PROCESSING_DISCLOSURE, canPresentProcessingNotice,
  isProcessingNoticeAcknowledged, needsSeparatePurposeChoice, restoreProcessingNotice,
  refuseProcessingPurpose,
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
      !needsConnecticutClarification() && !needsQuebecClarification() && !needsSeparatePurposeChoice('ads') && !needsSeparatePurposeChoice('analytics')) return;
  await prepareMonetization(canPresent);
  await restoreProcessingNotice();
  if (!canPresent() || (!canPresentProcessingNotice() && !needsConnecticutClarification() && !needsQuebecClarification())) return;
  const requiredChoices = needsConnecticutClarification() || needsQuebecClarification() || needsSeparatePurposeChoice('ads') || needsSeparatePurposeChoice('analytics');
  if (!isProcessingNoticeAcknowledged() || requiredChoices) {
    if (requiredChoices) {
      await openChoices();
      // Closing an explicit-permission request grants nothing and must not
      // repeatedly reopen the same request on subsequent result exits.
      if (canPresent()) {
        if (needsQuebecClarification()) await saveQuebecResidency('unknown').catch(() => undefined);
        if (needsConnecticutClarification()) await saveConnecticutResidency('unknown').catch(() => undefined);
        if (needsSeparatePurposeChoice('analytics')) await refuseProcessingPurpose('analytics');
        if (needsSeparatePurposeChoice('ads')) await refuseProcessingPurpose('ads');
      }
    } else {
      const action = await new Promise<'continue' | 'choices' | 'cancel'>(resolve => {
        Alert.alert('Ads keep Flap Fit free', AD_PROCESSING_DISCLOSURE +
          '\n\nContinue with these uses, or review them in Privacy & choices. You can stop RevenueCat reporting separately from ads.', [
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
