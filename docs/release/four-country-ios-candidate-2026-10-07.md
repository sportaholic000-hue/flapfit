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

TypeScript, lint, production release validation and OTA configuration validation passed for source commit `8e9241b524729bee7f203317c76376e8dce67237`. The full run covered 76 suites and 1,851 tests: 1,850 passed and one startup test exceeded its 30-second limit. Its entire 29-test suite then passed unchanged in an isolated rerun. The earlier interrupted run is not counted as a completed check. Separate tests exercise the prepared future enabled state without enabling Europe in the shipping configuration. Shipping integration tests cover every European code and travel from each of the four original countries to Germany and back.

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

- Pushed source: `8e9241b524729bee7f203317c76376e8dce67237`, branch `codex/ios-camera-permission-review`.
- One production CLOUD build was requested: version 1.0.0 (9), ID `19263f36-6286-4ece-a134-c06c9e76f975`, [Expo build record](https://expo.dev/accounts/flapfitapp/projects/flapfit/builds/19263f36-6286-4ece-a134-c06c9e76f975).
- It failed at CONFIGURE_EXPO_UPDATES before producing an IPA. Local runtime was `28e9acc121c7bfb988d68fead3b6132369c7fae9`; EAS runtime was `469f66ace28d0ea7661bb8681b0239739f8b3955`. No TestFlight upload, OTA publication or App Review submission occurred.
- Diagnosis: this checkout used a root node_modules junction to the main checkout's dependencies. Its external physical path appeared in 90 fingerprint sources and both native-autolinking configurations, while EAS installed dependencies at the normal project-relative path. Both autolinking configurations are otherwise equal after correcting that prefix. Directory hashes also include their child paths; they must be recomputed, not overridden. The additional EAS `ios` source has a null hash.
- The junction was removed WITHOUT removing or changing its shared target. The same locked dependencies were successfully installed directly in this checkout with Yarn 4.12.0 `install --immutable`; the package manifest and lockfile were unchanged. Release/OTA validation now rejects such linked dependency roots before another request. Its filesystem test exercises a real external junction and a normal directory.
- Cloud logs and extracted fingerprint differences are preserved under the task workspace's `outputs/european-expansion-2026-10-07/` directory. No compatibility check or native-content hashing has been disabled.
- Corrected-install verification PASSED: the official expo-updates fingerprint generator produced `469f66ace28d0ea7661bb8681b0239739f8b3955`, exactly equal to the EAS server result, retaining 109 native sources. No runtime hash, source skip, fingerprint transform or compatibility rule was changed. The real external-junction regression test, existing Windows/Linux/macOS discovery test, native bridge drift checks, production validation and lint all passed. No application source changed after the full app-test run. The owner subsequently approved one replacement cloud build and TestFlight upload after being informed of the failure and repair.
- App Review submission remains prohibited until the owner's testing and explicit approval.

The release-tooling correction changes only `validate-update-config.cjs`, its existing test script and this handoff. It rejects linked dependency roots during the existing release/OTA preflight, before any future upload is requested through the verified workflow. The missing release-evidence artifact in the failed cloud log followed the early stop; there was no completed native archive to retain.

## Authorized replacement: build 10

- Exact pushed build source: `5a5307e9eb44f6d12d8280cb8807f8dfeda3b465` on `codex/ios-camera-permission-review`. The checkout was clean before the request. Subsequent handoff-only commits are not part of the binary.
- Version 1.0.0 (10), production profile, production update channel, store distribution, bundle `com.flapfit.game`.
- [Expo build 10](https://expo.dev/accounts/flapfitapp/projects/flapfit/builds/0fc6eaf0-2dda-48a6-988e-07168f366e80) finished successfully at 2026-10-08 00:53:27 UTC (October 7, 21:53 ADT). All iOS compilation ran on Expo's cloud Mac, not the owner's computer.
- EAS reports runtime and fingerprint `469f66ace28d0ea7661bb8681b0239739f8b3955`. CONFIGURE_EXPO_UPDATES succeeded; the native archive and release-evidence artifacts were produced successfully.
- The exact successful build was uploaded to App Store Connect successfully using the production submission profile, with existing internal group `Flap Fit Testing` requested and automatic creation of a different group disabled. [EAS upload receipt](https://expo.dev/accounts/flapfitapp/projects/flapfit/submissions/44cf8c85-499a-4073-8b2e-a147c40d5321). The upload command exited successfully; Apple processing was pending in its final response. Completed Apple processing and actual group assignment have not been independently verified because the browser connection is unavailable. This upload is not an App Review submission.
- Availability remains owner-confirmed CA, US, AU and MX; the signed-in browser connection timed out again. This is not an independent read-back of Apple's saved availability.
- Prepared European processing remains disabled. Production live-ad configuration, manual OTA, camera correction, recording-only branding, six calibration guides and unchanged microphone handling are preserved.
- No additional app-code changes, OTA publication, App Review submission or public release were performed. The owner's native-device acceptance checks above remain required before any review submission.
