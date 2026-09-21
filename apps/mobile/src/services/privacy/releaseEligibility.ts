import type { ProcessingRuntimeInputs } from './processingPolicy';

export type ReleaseEligibility =
  | { status: 'available' }
  | { status: 'unanswered'; reason: 'country' | 'age' | 'province' | 'state' | 'new-york' | 'saved-status' | 'notice' }
  | { status: 'unavailable'; reason: 'country' | 'age' | 'quebec' | 'connecticut-minor' | 'new-york-minor' | 'apple' };

/** Commercial release availability, independent of every consent/refusal and of
 * ad fill. Never use a provider permission or a purpose choice to gate a game. */
export function resolveReleaseEligibility(input: ProcessingRuntimeInputs): ReleaseEligibility {
  if (input.appleAccessRestricted) return { status: 'unavailable', reason: 'apple' };
  const launch = input.launch;
  if (!launch?.current || !launch.country) return { status: 'unanswered', reason: 'country' };
  if (!['AU', 'CA', 'MX', 'US'].includes(launch.country)) return { status: 'unavailable', reason: 'country' };
  const plan = launch.plan;
  if (!input.hydrated) return { status: 'unanswered', reason: 'saved-status' };
  if (!plan || plan.ageEligibility === 'age-unresolved' || input.appleRequirement === 'error' ||
      input.appleRequirement === 'pending' || (input.appleRequirement === 'required' &&
      (!input.verification?.mandatoryCheckSatisfied || input.appleRescissionPending))) return { status: 'unanswered', reason: 'age' };
  if (plan.ageEligibility === 'outside-audience' || plan.parentalAuthorityRequired.ads) return { status: 'unavailable', reason: 'age' };
  if (plan.treatment !== 'unspecified' && (launch.options.newYorkProtectedHistory || plan.newYorkKnownContext)) return { status: 'unavailable', reason: 'new-york-minor' };
  if (launch.country === 'CA') {
    if (plan.quebecActivationRequired.ads || launch.options.quebecResidency === 'resident') return { status: 'unavailable', reason: 'quebec' };
    if (plan.missingFacts.ads.includes('province')) return { status: 'unanswered', reason: 'province' };
  }
  if (plan.treatment !== 'unspecified') {
    if (launch.options.newYorkHistoryReadConfirmed === false) return { status: 'unanswered', reason: 'saved-status' };
    if (launch.options.newYorkProtectedHistory || plan.reasons.ads === 'new-york-express-consent-required') return { status: 'unavailable', reason: 'new-york-minor' };
    if (launch.country === 'US') {
      if (launch.options.connecticutResidency === 'resident' || plan.reasons.ads === 'connecticut-ad-necessity-unresolved') return { status: 'unavailable', reason: 'connecticut-minor' };
      if (plan.missingFacts.ads.includes('state')) return { status: 'unanswered', reason: 'state' };
      if (plan.missingFacts.ads.includes('new-york-location')) return { status: 'unanswered', reason: 'new-york' };
    }
  }
  return { status: 'available' };
}

export function releaseEligibilityMessage(value: ReleaseEligibility): string {
  if (value.status === 'available') return 'Available with ads. Reporting and competition choices remain separate.';
  if (value.status === 'unavailable') {
    if (value.reason === 'quebec') return 'Flap Fit is not available in Quebec for this release.';
    if (value.reason === 'connecticut-minor') return 'Flap Fit is not available to Connecticut residents under 18 for this release.';
    if (value.reason === 'new-york-minor') return 'Flap Fit is not available for this release while your under-18 New York protections apply.';
    if (value.reason === 'apple') return 'Apple account access must be restored before another game.';
    if (value.reason === 'country') return 'Flap Fit is not available in this country for this release.';
    return 'Flap Fit is not available for this age group in your region for this release.';
  }
  if (value.reason === 'country') return 'Connect to the internet to confirm availability before another game.';
  if (value.reason === 'age') return 'Confirm your age range before another game. This is separate from permission for advertising or reporting.';
  if (value.reason === 'saved-status') return 'Your saved eligibility information could not be confirmed. Retry loading it before another game.';
  if (value.reason === 'notice') return 'Review how ads support Flap Fit in Info, then choose Save & continue before another game. Reporting remains optional.';
  return 'Answer the regional question before another game. Close or Back leaves it unanswered; it does not select a region or change your privacy choices.';
}
