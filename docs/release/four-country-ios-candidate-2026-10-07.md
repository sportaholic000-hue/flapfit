# Four-country iOS candidate - October 7, 2026

## Release decision and authority

The initial release is Canada (CA), United States (US), Australia (AU) and Mexico (MX). The owner reports saving those four in App Store Connect after removing the European selections. Independent browser read-back remains unavailable because the local browser runtime fails during Windows sandbox setup; do not describe that owner confirmation as a fresh automated verification.

One production iOS EAS build and the resulting TestFlight binary upload are authorized within the existing allowance. No paid capacity, OTA publication, App Review submission or public release is authorized. The owner must personally test the candidate and explicitly approve any later App Review submission. EAS Submit is used only to upload a binary to App Store Connect/TestFlight; it is not permission to submit an App Review request.

## Candidate behavior

- The prepared European implementation and 36-country catalog remain in source. The 32 European countries and their future consent handling are documented in the superseded expansion report.
- `EUROPEAN_PROVIDER_POLICY.enabled` is false. Active European network location blocks Google advertising, RevenueCat reporting and online competition, even with saved grants from an original country. Returning to an eligible original country can restore permitted processing through existing verification and setup.
- The deferred European state does not offer ad/reporting activation or demand acknowledgement of an inactive provider notice before another workout. Existing required Apple authorization, age checks, local gameplay, calibration and recording/share behavior remain intact. Unresolved country never authorizes providers; saved residency is not overwritten by network country.
- Camera correction `4d29c04` and recording branding/six-guide port `04e85ba` are preserved through parent `7ba5b40`. No microphone, gameplay scheduling, ad frequency, results-action or Share behavior is changed in this deferral step.
- Production uses live ad IDs and retains the existing manual Info -> Check for updates path, production channel, embedded bundle and fingerprint runtime protection. No update is published here.
- Main, the submitted build-8 release tag and the Android experimental branches are preserved.

## Verification record

TypeScript, lint, production release validation and OTA configuration validation passed for the deferred candidate. Full tests are being completed before committing and building; record the final results and exact build source in the completion handoff. Separate tests exercise the prepared future enabled state without enabling Europe in the shipping configuration. Shipping integration tests cover every European code and travel from each of the four original countries to Germany and back.

No real-device camera, recording, European advertising or provider traffic has been verified by these automated checks. Live ad delivery remains subject to Google's app readiness and inventory.

## Later European activation

1. After the initial Apple approval, complete the European privacy assessment and public notices: controller/contact information, EU/EEA and UK representative arrangements or documented applicable exemptions, applicable provider bases/transfers, age/capacity requirements and independent reporting/competition disclosures. The existing European supplement remains a draft. Apple trader acceptance is a separate matter.
2. Recheck the published Google European message, declared partners, relevant consent choices and languages. Preserve independent RevenueCat consent and the assessed basis for the requested competition service. Google consent does not authorize unrelated processing.
3. Enable the prepared JavaScript policy only after those requirements are resolved; rerun country, age, consent, saved-data, travel and original-country regression checks. Store selection alone cannot enable the code.
4. A compatible JavaScript/asset OTA may activate the prepared routes without another native build, provided the runtime fingerprint and production environment match the installed binary and no native API, dependency, permission or entitlement change is needed. Do not bypass compatibility validation. Store availability changes alone do not require a native build.
5. Manual updates remain manual. Existing users AND fresh installations of this embedded candidate retain the disabled European policy until they use Info -> Check for updates. An OTA does not replace the embedded App Store binary. A later native release may be useful for seamless first-install behavior, but is not automatically required for a compatible OTA.
6. Save the intended European storefront selection when ready, preserving the original four. The prior Apple selector showed 31 separately selectable European storefronts; Liechtenstein was not separately listed. Its LI code remains supported in source. Do not invent a storefront mapping.
7. Follow Apple's applicable update/review rules. After public release, link the existing AdMob iOS app to the public listing, verify app-ads.txt/readiness and actual live impressions, then separately verify permitted RevenueCat ad-revenue events. Prepared integration does not prove live delivery.

## Owner's TestFlight acceptance checks

- Fresh install before any manual update: camera Continue requests the native permission; denial exits safely with Settings recovery; granted-camera repeat runs do not re-prompt.
- On iPhone and iPad, inspect the six calibration guides through their stages, instruction/progress-bar clearance and fades. Confirm normal calibration and gameplay.
- Record/share: white outlined Flap Fit branding appears below the target or endless score in the exported video, and never in ordinary gameplay. Optional microphone behavior is unchanged.
- Normal results and immediate Done/Retry/Next actions, Share exclusion, saved progress/championship/leaderboard identity, offline play and denied-permission recovery.
- Actual province display and Quebec-to-eligible-province recovery; existing restricted US teen behavior where applicable. Lack of live fill is not proof of a failed integration.
- Manual update entry remains available; no OTA publication is authorized by this checklist.

## Completion evidence

Pending the final test results, pushed commit, one build's number/link and TestFlight upload status. App Review submission remains prohibited until the owner's testing and explicit approval.
