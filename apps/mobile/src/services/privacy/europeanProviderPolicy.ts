import { europeanConsentAge } from './launchCountries';

/** Review scope: installed iOS, Google-only NPA/RDP/PG requests, published European
 * CMP and declared ad partners, programmatic limited ads enabled. Google chooses
 * the most restrictive eligible delivery. This is not worldwide legal clearance.
 * https://support.google.com/admob/answer/10105530
 * https://support.google.com/admob/answer/9760862
 * Publisher purposes require their own notice/configuration:
 * https://support.google.com/admob/answer/10305345 */
export const EUROPEAN_PROVIDER_POLICY = Object.freeze({
  // The active launch coordinator enforces country/age and then native Google UMP.
  // Evidence: docs/release/european-expansion-2026-10-07.md.
  // Prepared for a later European launch. Store availability alone must not
  // activate providers, including for existing users travelling there.
  enabled: false,
  revision: 'european-ios-prepared-deferred-v3',
  googleNonPersonalizedRouteReviewed: true,
  googleLimitedAdsRouteReviewed: true,
  // Account publisher P1/P7 are not configured; never infer them from Google vendor consent.
  revenueCatPublisherNoticeReviewed: false,
  // Separate in-app opt-in with provider-specific disclosure and durable provenance.
  revenueCatExplicitConsentReviewed: true,
  // Requested online competition requires its own assessed service/notice basis.
  competitionRequestedServiceReviewed: true,
});

/** Current network location controls this release restriction, not saved residency. */
export function isEuropeanProcessingDeferred(country: string | null | undefined): boolean {
  return !EUROPEAN_PROVIDER_POLICY.enabled && europeanConsentAge(country) !== null;
}
