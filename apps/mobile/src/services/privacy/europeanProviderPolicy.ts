/** Review scope: installed iOS, Google-only NPA/RDP/PG requests, published European
 * CMP and declared ad partners, programmatic limited ads enabled. Google chooses
 * the most restrictive eligible delivery. This is not worldwide legal clearance.
 * https://support.google.com/admob/answer/10105530
 * https://support.google.com/admob/answer/9760862
 * Publisher purposes require their own notice/configuration:
 * https://support.google.com/admob/answer/10305345 */
export const EUROPEAN_PROVIDER_POLICY = Object.freeze({
  // Current launch scope is Canada, US, Australia and Mexico. No European flow is mounted.
  enabled: false,
  revision: 'european-ios-google-routes-v1',
  googleNonPersonalizedRouteReviewed: true,
  googleLimitedAdsRouteReviewed: true,
  // Account publisher P1/P7 are not configured; never infer them from Google vendor consent.
  revenueCatPublisherNoticeReviewed: false,
  // Requested online competition requires its own assessed service/notice basis.
  competitionRequestedServiceReviewed: false,
});
