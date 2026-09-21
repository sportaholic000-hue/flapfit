import { getProcessingInputs } from './processingAccess';

/** Availability explanation only; this never supplies age evidence or grants access. */
export function ageProcessingAvailability(): string | null {
  const input = getProcessingInputs();
  if (input.appleRequirement === 'unsupported') {
    return 'This system cannot provide the age check used by Flap Fit. Advertising, ad reporting and online competition are unavailable here. Local play, recordings and saved progress remain available.';
  }
  if (!input.verification?.mandatoryCheckSatisfied &&
      input.appleRequirement !== 'pending' && input.appleRequirement !== 'error') {
    return 'Age eligibility has not been confirmed. Advertising, ad reporting and online competition remain unavailable. Local play, recordings and saved progress remain available.';
  }
  return null;
}
