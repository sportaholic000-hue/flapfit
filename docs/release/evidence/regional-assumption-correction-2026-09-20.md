# Regional assumption correction — build held

Source predecessor: `269b6b320b533a4f070c4ff1156b2f5271a6c07b`.
Branch: `wip/crash-protection-20260920`. The commit containing this record is the
corrected successor. Existing work is preserved; no native/cloud build, upload,
deployment, Apple edit, publication or device test was performed.

## Reproduced behavior and corrections

**Canada — reproduced and corrected.** Missing Canadian province previously set
Quebec activation requirements for advertising/reporting. The active coordinator
passed no subdivision and the refinement helper had no caller. Therefore ordinary
Canadian startup reached that branch; this was not an occasional location failure.

Unknown province now remains `province-unresolved`, with no Quebec activation flag
or regional ad-consent buttons. The existing Info / post-result Privacy & choices
component provides a local Quebec / outside-Quebec / unknown answer. Outside-Quebec
adults use the existing notice-based, non-personalized advertising route without a
new ad Allow/Stop switch. Confirmed Quebec retains its specific function controls.
An existing explicit advertising refusal remains honored; geography does not erase it.

The local answer survives restart; failed saves retain reachable answer controls.
Read failure remains unknown and can retry. Stale saves cannot override a newer answer
or apply to another country. No address, GPS, birthday, Apple raw range or provider
identity is added. The answer is stored only on the device, separately from consent.
Closing without answering records unknown, not an advertising refusal. Ads remain
unavailable until missing eligibility is established; this does not create an
ad-free entitlement or infer permission. No question was added before first play.

**United States — reproduced and corrected distinction.** An unknown state previously
reported the Connecticut contextual-ad-necessity reason. It now reports the actual
missing state fact. Confirmed Connecticut still applies its teen rules; the existing
local Connecticut question resolves that uncertainty. A separately verified contextual
route remains independently usable. Known non-Connecticut states do not inherit that rule.

**Australia / Mexico — scoped source inspection.** Neither selects a particular state
from a missing subdivision. Adults use the existing notice route. Australia's under-15
capacity handling and Mexico's minor-authority handling are national rules in this
implementation, not province/state guesses; they have not been removed or certified
anew as a complete legal assessment.

## Explicit remaining regional issue

**NOT CLOSED:** the existing New York teenage-purpose consent fallback is still applied
when purpose-specific New York applicability is unknown, including outside the US.
That affects Canadian teens after an outside-Quebec answer and eligible Australian teens;
Mexico's independent authority restriction may already block the route. The new Canadian
answer does not eliminate this separate fallback. No claim of fully corrected four-country
monetization, readiness or universal ad delivery is made.

The existing code has no established runtime evidence for the location/use/history
conditions needed to replace that fallback. A residence answer alone must not be
fabricated into provider data-flow or history evidence. The replacement needs an
evidenced applicability mechanism and retained-data treatment; this remains a source/design
release blocker, not a physical-device test. The build stays held.

Primary sources checked for scope:
- [Apple Storefront](https://developer.apple.com/documentation/storekit/storefront/)
  exposes the storefront country, not a province/state or home address.
- [Apple Core Location](https://developer.apple.com/documentation/corelocation/configuring-your-app-to-use-location-services/)
  requires authorization for device location; no location permission was added here.
- [Quebec CAI identification/location/profiling guidance](https://www.cai.gouv.qc.ca/protection-renseignements-personnels/sujets-et-domaines-dinteret/principaux-changements-loi-25).
- [Connecticut 2026 chapter 743jj](https://prdext2.cga.ct.gov/2026/sup/chap_743jj.htm)
  defines consumer by residence and retains specific minor restrictions.
- [NY covered-user definition](https://www.nysenate.gov/legislation/laws/GBS/899-EE)
  and [territorial/data-history scope](https://www.nysenate.gov/legislation/laws/GBS/899-LL).
- [OAIC capacity guidance](https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-b-key-concepts).
No legal clearance is inferred from passing software tests.

## Verification

Two focused regression assertions reproduced on the predecessor: unknown Canada set
Quebec activation flags; unknown US state reported Connecticut necessity. Both fail before
the correction and pass afterward. The before run deliberately selected these two cases;
its skipped unrelated cases were subsequently included in the complete run.

| Required behavior | Verified result |
| --- | --- |
| All non-Quebec Canadian province/territory codes plus explicit outside-Quebec | No Quebec activation; adult notice-based ads remain allowed while reporting refusal remains denied |
| Every non-Connecticut US state plus DC | No Connecticut-specific reason when the relevant location is supplied |
| Unknown Canada or US | Missing fact remains distinct from confirmed Quebec/Connecticut; cannot be cleared by an old generic grant |
| Rendered Canadian controls | Unknown has regional answer controls; outside-Quebec adult has no new Allow/Stop advertising switch; confirmed Quebec retains its controls |
| Failed read/save, retry, newer answer, country change | Recoverable controls, no stale permissive revival, no unrelated consent overwrite |
| Actual Canadian startup/result/monetization boundary + restart | Google initialize 1; refused RevenueCat configure 0; no ad consent grant fabricated |
| Closing unanswered Canadian sheet | Unknown saved; ad choice remains unset; no SDK initialization; no repeated result prompt |
| Previous three audit fixes | Included unchanged in complete regression run |

**60 suites / 1,254 tests passed, zero pending.** TypeScript, strict applicable lint,
production release validation and app-owned/SDK privacy-manifest checks passed with locked
dependencies. Runtime/native/provider boundaries are mocked in source tests; this does not
prove an installed result or genuine RevenueCat receipt.

Actual local EAS archive-only packaging was checked separately. The exact file count,
required-input hashes, exclusions and successful validator executed from the packaged copy
are in `regional-assumption-package-2026-09-20.json`. This is not a native/cloud build.

Check commands, before/after cases, source fingerprints and actual results are in
`regional-assumption-checks-2026-09-20.json`. The completed privacy-manifest correction,
account evidence, source/package predecessor records and deferred Organizer-PDF disposition
remain intact. Final artifact, physical-device and provider-receipt verification remain open.
