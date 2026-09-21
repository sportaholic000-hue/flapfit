import { getProcessingInputs } from './processingAccess';
import { hasLaunchAgeVerification } from './processingPolicy';

/** Availability explanation only; this never supplies age evidence or grants access. */
export function ageProcessingAvailability(): string | null {
  const input = getProcessingInputs();
  if (hasLaunchAgeVerification(input)) return null;
  if (input.appleRequirement === 'unsupported') {
    return 'This system cannot provide the age check used by Flap Fit. Choose your age range in Info > Privacy & choices before another game. Your answer stays on this device and does not grant advertising, reporting or competition permission. Saved progress is unchanged.';
  }
  if (!input.verification?.mandatoryCheckSatisfied &&
      input.appleRequirement !== 'pending' && input.appleRequirement !== 'error') {
    return 'Age eligibility has not been confirmed. Retry the availability check before another game. Advertising, ad reporting and online competition remain unavailable. Saved progress is unchanged.';
  }
  return null;
}
