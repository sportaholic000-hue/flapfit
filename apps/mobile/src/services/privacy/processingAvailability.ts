import { getProcessingInputs } from './processingAccess';
import { hasLaunchAgeVerification } from './processingPolicy';

/** Availability explanation only; this never supplies age evidence or grants access. */
export function ageProcessingAvailability(): string | null {
  const input = getProcessingInputs();
  if (hasLaunchAgeVerification(input)) return null;
  if (input.appleRequirement === 'unsupported') {
    return 'This system cannot provide the age check used by Flap Fit. When requested, choose your age range in Info > Privacy & choices. Your answer stays on this device, and your saved progress is retained.';
  }
  if (!input.verification?.mandatoryCheckSatisfied &&
      input.appleRequirement !== 'pending' && input.appleRequirement !== 'error') {
    return 'Age eligibility has not been confirmed. Review your age information in Info > Privacy & choices. Your saved progress is retained. Any required Apple access check still applies.';
  }
  return null;
}
