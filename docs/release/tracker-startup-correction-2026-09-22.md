# Bundled camera tracker startup correction — September 22, 2026

The owner's iPad failed before camera calibration after selecting Squats / Sky / Daily Challenge in signed build 8391a757-6092-49c1-b7f6-ecd82e90c4c2. The screen reported: “The on-device camera tracker did not load.” That build must not be treated as device-ready.

## Confirmed defect

EAS's Windows Git source copy used core.autocrlf=true. Three JavaScript files stored with the opaque .mpasset extension were converted from LF to CRLF. The runtime loader correctly rejects any file whose size differs from its explicit expected byte count.

| Embedded file | Required bytes | Failed IPA bytes |
| --- | ---: | ---: |
| vision_bundle.mjs.mpasset | 136870 | 136872 |
| vision_wasm_internal.js.mpasset | 209826 | 209846 |
| vision_wasm_nosimd_internal.js.mpasset | 209735 | 209755 |

Both WASM files and the model match their expected sizes. The earlier artifact inspection incorrectly accepted normalized JavaScript equivalence despite the runtime's exact-size requirement. Its tracker acceptance conclusion is superseded by this record.

## Correction and scope

- Git attributes mark all six bundled tracker assets as -text so packaging preserves their original bytes.
- A new build validator reads the runtime's literal asset declarations and rejects missing or incorrectly sized assets. It runs in the existing post-install hook for every EAS profile, including ios-device-check.
- Five regression tests cover correct assets, the three exact CRLF failures, missing/truncated resources, unsupported declarations and execution before production-only checks. The focused tracker/release set passed: 3 suites, 14 tests.
- An execution harness using the actual transpiled loader and bytes extracted from the failed IPA reproduces the exact integrity error. The same unchanged loader accepts the original source assets, replaces the stale invalid cached file, and reads both SIMD variants. Expo native filesystem/asset APIs are local test doubles in this harness; this is not an iPad execution.

No runtime tracker, calibration, exercise, age, advertising, leaderboard, dependency, website or provider configuration is changed. Runtime integrity checks remain in place. The replacement uses the existing signed test profile and free build allowance; no paid service or billing change is authorized.

## Replacement acceptance

Before cloud upload, inspect an actual fresh EAS Git source copy and compare all six resources byte-for-byte with the committed Git blobs. Then inspect the completed IPA with the same strict comparison and runtime byte requirements. Do not normalize line endings in either check.

Physical-device acceptance remains pending: update the existing install and retry Squats / Sky / Daily Challenge, then calibration and a complete game. This source fix alone does not prove physical camera tracking.

## Completed replacement artifact

- Replacement [c3a053bb-eaf4-4b25-a57b-641c9022ae9c](https://expo.dev/accounts/flapfitapp/projects/flapfit/builds/c3a053bb-eaf4-4b25-a57b-641c9022ae9c) finished from source e4a7f03b885f0de88bbc22c90c4999b3a11eb16a, version 1.0.0 (4), using the existing ios-device-check profile and registered devices.
- The actual EAS Windows source copy preserves all six Git blobs exactly. Its test-profile hook and the production-profile hook pass. Focused tests: 3 suites / 14 tests; strict lint and TypeScript checks pass. The release validator passes with the production profile environment.
- The cloud worker ran the new asset-size gate successfully. All six files extracted from the finished IPA match both their committed SHA-256 and literal runtime byte count. No normalization was accepted.
- The loader harness reproduces the failure with the old IPA and then recovers with this replacement IPA's actual asset bytes, retaining the stale invalid cache between attempts. Native filesystem calls are mocked; device camera execution remains for the owner to confirm.
- Native SDK checks, signed identity/profile, privacy declarations, camera/microphone wording and test-ad markers pass artifact inspection. Xcode archive completed with zero compiler errors; general upstream warnings remain recorded.
- Expo Doctor remains 20/21: the same seven Expo patch recommendations from the earlier build. This is retained separately from the repaired security advisories; it is not an all-checks-pass result.
- Account readback: Free plan, 10/15 iOS builds used, $0.00 build overage. No billing settings changed.
- IPA SHA-256: ff6299d316664802568dfce39f8c976e7c3f419395d979128ecd8c3565a8862f.

[Source packaging](evidence/tracker-startup-correction-2026-09-22/source-package-verification.json), [runtime reproduction](evidence/tracker-startup-correction-2026-09-22/runtime-reproduction.json), [strict IPA inspection](evidence/tracker-startup-correction-2026-09-22/signed-artifact-verification.json), and [build results](evidence/tracker-startup-correction-2026-09-22/build-verification.json) are retained. The IPA and temporary signed provider URLs remain outside Git.

Install this replacement over the existing app and retry Squats / Sky / Daily Challenge. Calibration and a complete game still require physical-device acceptance. No Apple review submission occurred.
