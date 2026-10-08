# iOS fixes and later Android handoff — October 8, 2026

Branch: `codex/ios-camera-permission-review`.

## Saved changes

1. **Calibration correction:** `670ab25878b02fc8ce9279740ac8e9f10c5d762b` — require both visible, individually straight arms for pushup step one; count distinct camera observations through the existing hold; reset stale tracking. [Detailed behavior, limits and Android port notes](ios-pushup-calibration-2026-10-08.md).
2. **iOS automatic screen-sleep protection:** `c17ed1a434e3b42ca807785d451e3654b339af38` — scoped to focused calibration/gameplay, released for results/exit, with safe cleanup after quick navigation. Uses the already-resolved Expo module. [Details and Android adaptation notes](ios-screen-awake-2026-10-08.md).
3. **Unpublished artwork backup:** [smooth pushup candidate assets and comparisons](pushup-artwork-candidate-2026-10-08/README.md). These are not active app assets and must not be shipped automatically.

Only the iOS candidate branch was modified. `main`, all local Android branches, and the submitted build-8 release tag retain their prior references. No Android agent was contacted and no subagents were used.

## Automated verification

- Final full Jest run: **78 suites / 1,874 tests passed**, 300.515 seconds.
- TypeScript: passed.
- Repository lint: passed, zero warnings/errors.
- Yarn immutable dependency validation, skipping build scripts: passed. No resolved package version changed; `expo-keep-awake ~57.0.2` is now a direct app dependency as well as the existing Expo dependency.
- New calibration regression tests: 15 of 18 failed against the old behavior; all 18 pass after correction. They use synthetic joint streams and the real calibration state machine, not physical device recordings.
- Screen-awake lifecycle and actual game-entry integration tests: passed. A missing native-module mock in the first full test run was corrected in the test setup; the final full run passes.
- Existing production release validation: all reported checks pass EXCEPT the pre-existing physically-approved tracker-version check. The changed rules have a new marker, `2026-10-08.1-pushup-calibration`; the production profile deliberately retains the older owner-tested marker. New rules have NOT been declared physically approved.

## Remaining review/testing

- Owner must physically test bilateral-arm calibration, interruption/reset and normal front-facing pushup gameplay on iPad/iPhone.
- The arm checks still do not prove floor contact. Standing with both estimated arms straight can still satisfy them. Do not claim all incorrect calibrations or all camera-estimation errors have been eliminated.
- Owner must verify automatic screen lock is prevented past the usual timeout during calibration/play, and normal sleep resumes after results/exit. Exact cause of the first reported iPad occurrence cannot be reconstructed; no keep-awake protection was removed from the submitted source.
- Smoother pushup artwork awaits owner visual approval/device preview. Other silhouettes have not been redrawn or replaced.
- The previously discussed microphone permission-flow correction remains pending. Existing camera correction, microphone behavior, recording branding, other guides, ad rules and manual OTA behavior were preserved in this work.
- Before any later OTA, verify the completed candidate against the installed runtime and the applicable validation/approval path. Baseline native fingerprint already contains ExpoKeepAwake, but that fact alone is not a runtime-compatibility check. Do not bypass compatibility protection or assume either a native build or OTA is automatically appropriate.

**No build, OTA publication, TestFlight upload, App Review submission or public release was started in this work.** Current devices still have their existing installed code.

## Android agent

Inspect the two source commits independently; port only the requested fixes after checking your branch's newer work. Preserve its calibration experiments and do not blindly replace shared files. The wake component intentionally runs only on iOS, so Android needs an explicit adaptation and its own screen-timeout tests. Use the saved artwork only after owner acceptance. This handoff does not authorize an Android build or publication.
