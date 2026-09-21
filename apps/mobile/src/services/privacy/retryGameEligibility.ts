import { getProcessingInputs } from './processingAccess';
import { invalidatePrivacyCountry, refreshPrivacyCountry } from './privacyCountry';
import { preparePrivacyStartup } from './privacyStartup';
import { retryLaunchAgeCheck } from './launchProcessingControl';
import { prepareMonetization } from '../monetization';

/** Explicit retry only. It can present Apple's age service, never Google ads or
 * reporting setup, and does not manufacture a local replacement for Apple. */
export async function retryGameEligibility(canPresent: () => boolean): Promise<void> {
  if (!canPresent()) return;
  if (!getProcessingInputs().launch?.current) {
    invalidatePrivacyCountry();
    await refreshPrivacyCountry();
  }
  if (!canPresent()) return;
  const input = getProcessingInputs();
  if (input.appleRequirement === 'pending' || input.appleRequirement === 'error') await preparePrivacyStartup();
  if (!canPresent()) return;
  retryLaunchAgeCheck();
  await prepareMonetization(canPresent, { eligibilityOnly: true });
}
