import { getProcessingInputs } from './processingAccess';
import { hasLaunchAgeVerification } from './processingPolicy';

/** Availability explanation only; this never supplies age evidence or grants access. */
export function ageProcessingAvailability(): string | null {
  const input = getProcessingInputs();
  if (hasLaunchAgeVerification(input)) return null;
  if (input.appleRequirement === 'unsupported') {
    return 'This system cannot provide the age check used by Flap Fit. Choose your age range in Info > Privacy & choices to check optional features. Your answer stays on this device and does not grant advertising, reporting or competition permission. Camera-based local gameplay and saved progress remain available.';
  }
  if (!input.verification?.mandatoryCheckSatisfied &&
      input.appleRequirement !== 'pending' && input.appleRequirement !== 'error') {
    return 'Age eligibility has not been confirmed. Advertising, ad reporting and online competition remain unavailable. Camera-based local gameplay and saved progress remain available, subject to any required Apple access check.';
  }
  return null;
}
