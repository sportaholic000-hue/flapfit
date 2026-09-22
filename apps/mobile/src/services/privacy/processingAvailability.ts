import { getProcessingInputs } from './processingAccess';
import { hasLaunchAgeVerification } from './processingPolicy';

/** Availability explanation only; this never supplies age evidence or grants access. */
export function ageProcessingAvailability(): string | null {
  const input = getProcessingInputs();
  if (hasLaunchAgeVerification(input)) return null;
  if (input.appleRequirement === 'unsupported') {
    return 'This system cannot provide the age check used by Flap Fit. Choose your age range in Info > Privacy & choices. Your answer stays on this device. Camera-based local gameplay and saved progress remain available.';
  }
  if (!input.verification?.mandatoryCheckSatisfied &&
      input.appleRequirement !== 'pending' && input.appleRequirement !== 'error') {
    return 'Age eligibility has not been confirmed. Review your age information in Info > Privacy & choices. Camera-based local gameplay and saved progress remain available, subject to any required Apple access check.';
  }
  return null;
}
