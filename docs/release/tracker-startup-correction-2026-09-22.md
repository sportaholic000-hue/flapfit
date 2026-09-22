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
