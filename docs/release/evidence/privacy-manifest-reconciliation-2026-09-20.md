# Native privacy manifest reconciliation - September 20, 2026

Historical September 20 checkpoint, retained during the September 21 source cleanup. Test/package counts below apply to source f168286d, not the current candidate. Status at that checkpoint: reproduced in the signed build-4 artifact and corrected in source; not yet verified in a successor binary.

Source correction: f168286d9058093a42da8e96f02f53a82365a7e6. Commit and full GitHub remote SHA verified on wip/crash-protection-20260920.

Build 4 (103c8936-9447-4190-a45b-6912b1027c69, source c05f497) has four app-owned collection declarations. Its actual extracted PrivacyInfo.xcprivacy matches the old source. The new validator rejects six coverage omissions in that actual manifest; corrected source produces no errors. The earlier comparison against build 3 only proved unchanged semantics, not completeness. Build 4 is superseded for final acceptance and submission.

The nine corrected app-owned declarations describe existing handling already reflected in the twelve-category App Privacy draft:

| Type | Existing use and purpose |
| --- | --- |
| User ID | Optional competition/backend functionality plus permitted anonymous RevenueCat analytics; analytics purpose added. |
| Gameplay Content | Existing optional competition results; app functionality. |
| Fitness | Existing optional exercise results; app functionality. |
| Other User Content | Existing optional competition content; app functionality. |
| Other Data Types | Existing Apple authorization state, hashed transaction linkage and notification records; app functionality. |
| Other Diagnostic Data | Existing backend operational/security diagnostics; app functionality. Raw signed Apple payloads are not stored or logged. |
| Coarse Location | Existing country lookup; app functionality. No GPS permission or new location collection. |
| Advertising Data | Existing independently permitted ads-only RevenueCat event reporting; analytics. |
| Product Interaction | Existing independently permitted ads-only RevenueCat event reporting; analytics. |

These declarations remain linked and non-tracking, matching the disclosed configured behavior. Google/UMP supply their own SDK declarations, including device identifiers, crash and performance categories. This app-owned supplement does not remove or rewrite SDK manifests. The generic RevenueCat purchase capability does not establish actual purchases in the patched ads-only app; the existing no-purchase questionnaire rationale remains.

No UI, runtime collection, SDK patch, onboarding, calibration, exercise behavior, recording/share flow, ad placements or privacy choices changed. No camera/video/audio upload was added. Only app.json metadata and its release validation/regressions changed.

Verification so far:

- Exact signed-artifact before/corrected-source after reproduction: six failures before, zero after.
- All eleven dedicated Jest manifest regressions passed, including individual missing types, purposes and linkage/tracking flags.
- Production source release validation, TypeScript and strict lint passed.
- All 58 suites / 1117 tests passed in the completed direct run.
- Actual EAS package verified: 746 files; 235 runtime/asset/patch files and ten configurations byte-matched; packaged production validator passed; private-file exclusions checked.
- The new code is backed up with full remote SHA verification.
- No successor binary, installed-device result, genuine RevenueCat receipt or Xcode aggregate report is established by these source checks.

Apple requires the app manifest to describe its collected types, purposes, linkage and tracking. App code does not need to duplicate every SDK manifest, but its own collection must be covered: [Apple manifest guidance](https://developer.apple.com/documentation/BundleResources/describing-data-use-in-privacy-manifests), [TN3184](https://developer.apple.com/documentation/technotes/tn3184-adding-data-collection-details-to-your-privacy-manifest).

Keep acceptance on hold until independent checks finish and matching artifacts are verified. No Apple upload, submission or tester request has occurred.

No corrected signed binary exists yet. Build 4 contains the three focused fixes and regional successor, but lacks this metadata correction. Its earlier manifest comparison proved unchanged SDK/app semantics, not completeness. The next Store and registered-device candidates must include f168286d9058093a42da8e96f02f53a82365a7e6.

The first completed full run had 1,116 passing tests and one 20-second timeout in the first rendered save-withdrawal retry case (29,508ms recorded). That exact case then passed alone in 2,700ms with unchanged assertions and timeout. The complete repeat is recorded separately above; the earlier failure is retained. The exact blocked setup step was not instrumented, so no definitive cause is asserted. Named behavior results, including the three focused findings and country/competition/ad controls, are recorded in privacy-manifest-source-checks-2026-09-20.json.

Scoped integrity scan: 564 tracked files and all 746 actual package files had no known credential-signature or service-role JWT matches. Dependency graph, resolutions and all three patches are unchanged. This is not an exhaustive security/history audit.
