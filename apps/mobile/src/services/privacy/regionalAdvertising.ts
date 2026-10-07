import type { ProcessingRuntimeInputs } from './processingPolicy';
import { isEuropeanProcessingDeferred } from './europeanProviderPolicy';

/** Release advertising policy only. These audiences can play without advertising
 * or ad-performance reporting, even if a legacy purpose grant is still saved. */
export function isRegionalAdvertisingDisabled(input: ProcessingRuntimeInputs): boolean {
  const launch = input.launch;
  // This release defers European providers, but local workouts remain usable.
  // Also prevents offering an advertising/reporting activation in Info there.
  if (isEuropeanProcessingDeferred(launch?.country)) return true;
  const plan = launch?.plan;
  if (!launch || !plan) return false;
  if (plan.parentalAuthorityRequired.ads) return true;
  if (launch.country === 'CA' &&
      (launch.options.quebecResidency === 'resident' || plan.quebecActivationRequired.ads)) return true;
  if (plan.treatment === 'unspecified') return false;
  if (launch.options.newYorkProtectedHistory || plan.newYorkKnownContext ||
      plan.reasons.ads === 'new-york-express-consent-required') return true;
  return launch.country === 'US' && (launch.options.connecticutResidency === 'resident' ||
    plan.reasons.ads === 'connecticut-ad-necessity-unresolved');
}
