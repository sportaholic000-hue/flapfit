/** Supported network countries, not a saved residency declaration or storefront.
 * Consent thresholds apply only to optional consent-based processing, never gameplay.
 * Evidence and provider limits: docs/release/european-expansion-2026-10-07.md.
 */
export const EUROPEAN_COUNTRIES = {
  AT: { name: 'Austria', consentAge: 14 }, BE: { name: 'Belgium', consentAge: 13 },
  BG: { name: 'Bulgaria', consentAge: 14 }, HR: { name: 'Croatia', consentAge: 16 },
  CY: { name: 'Cyprus', consentAge: 14 }, CZ: { name: 'Czechia', consentAge: 15 },
  DK: { name: 'Denmark', consentAge: 15 }, EE: { name: 'Estonia', consentAge: 13 },
  FI: { name: 'Finland', consentAge: 13 }, FR: { name: 'France', consentAge: 15 },
  DE: { name: 'Germany', consentAge: 16 }, GR: { name: 'Greece', consentAge: 15 },
  HU: { name: 'Hungary', consentAge: 16 }, IE: { name: 'Ireland', consentAge: 16 },
  IT: { name: 'Italy', consentAge: 14 }, LV: { name: 'Latvia', consentAge: 13 },
  LT: { name: 'Lithuania', consentAge: 14 }, LU: { name: 'Luxembourg', consentAge: 16 },
  MT: { name: 'Malta', consentAge: 13 }, NL: { name: 'Netherlands', consentAge: 16 },
  PL: { name: 'Poland', consentAge: 16 }, PT: { name: 'Portugal', consentAge: 13 },
  RO: { name: 'Romania', consentAge: 16 }, SK: { name: 'Slovakia', consentAge: 16 },
  SI: { name: 'Slovenia', consentAge: 15 }, ES: { name: 'Spain', consentAge: 14 },
  SE: { name: 'Sweden', consentAge: 13 }, IS: { name: 'Iceland', consentAge: 13 },
  LI: { name: 'Liechtenstein', consentAge: 16 }, NO: { name: 'Norway', consentAge: 13 },
  GB: { name: 'United Kingdom', consentAge: 13 },
  // Switzerland uses capacity of judgement, not an Article 8 statutory age.
  // This simple, separately explained opt-in uses the app's existing 13+ audience.
  CH: { name: 'Switzerland', consentAge: 13 },
} as const;
export const LAUNCH_COUNTRIES = {
  CA: { name: 'Canada' }, US: { name: 'United States' },
  AU: { name: 'Australia' }, MX: { name: 'Mexico' }, ...EUROPEAN_COUNTRIES,
} as const;
export type LaunchCountry = keyof typeof LAUNCH_COUNTRIES;
export function isLaunchCountry(country: string): country is LaunchCountry {
  return Object.prototype.hasOwnProperty.call(LAUNCH_COUNTRIES, country);
}
export function europeanConsentAge(country: string | null | undefined): 13 | 14 | 15 | 16 | null {
  const code = country?.trim().toUpperCase() ?? '';
  return Object.prototype.hasOwnProperty.call(EUROPEAN_COUNTRIES, code)
    ? EUROPEAN_COUNTRIES[code as keyof typeof EUROPEAN_COUNTRIES].consentAge : null;
}
