# iOS fixes and later Android handoff - October 8, 2026

Branch: `codex/ios-camera-permission-review`. Android branches remain untouched. This is the current adoption index; the historical snapshot below records earlier work and does not describe the latest candidate.

## Current changes to consider for Android

1. **Home evolution label:** `1d998df9b6b425cee3e63931a51bb445683c65ab` removes only the decorative emoji beside the current stage name on Home and centers the existing stage/progress text. File: `apps/mobile/src/app/(tabs)/index.tsx`. Preserve the bird artwork, stage names, percentage calculation, progress bar and all evolution thresholds. The shared emoji array remains available to other existing screens. Targeted lint and diff checks passed. This Home change is now published in iOS update group `81cd3d99-5fa7-41ed-91e8-1d90305abfaf`. [Receipt and verification](ios-home-label-ota-2026-10-08.md).
2. **Latest pushup entry correction:** `e79814244cc8fb839986c87320faa13d2f933a3d` supersedes the arm-only and torso-only entry attempts. It retains both-arm visibility/straightness, preparation, stable hold and fresh-observation rules, and adds aligned shoulder/hip/knee geometry for at least one visible upper leg. No feet requirement. Any other observed leg must agree. Original short calibration instructions are restored; do not port the removed extra coaching text. Active gameplay and other exercise calibration were preserved. Rules marker: `2026-10-08.3-pushup-body-entry`. The owner tested the updated iPad calibration and explicitly approved it: "pushup calibration is defintely improved! lock it in". Preserve this exact implementation. The production-profile approval marker still needs to be synchronized with the matching production environment before the later authorized native build; no build is started here.
3. **Latest guide artwork:** the same `e798142` commit contains the corrected bottom-pushup ear/neck contours with approved hands preserved, source-restored first pullup hand details, and standing-guide leg-gap artifact repairs. Start from the latest committed active assets/manifest, not the old unpublished candidate folder or an intermediate cleanup. The earlier active transparent-guide baseline is `34ba0d52`; approved pushup hands are preserved from `00b70a38`. [Repair recipe, preserved pixels and screenshots](calibration-detail-repairs-2026-10-08/) and [complete current change/verification notes](ios-morning-corrections-2026-10-08.md). Android should preserve its own applicable image wiring instead of blindly importing the iOS-only embedded module.
4. **Microphone flow:** `a008816` supersedes the earlier per-run three-choice denial screen. On iOS, native denial immediately proceeds silently, and subsequent recording entries skip that custom screen. First request still uses Continue followed by Apple's prompt. The recordAudio expression and actual capture/share logic are unchanged. All 38 permission/entry tests, typecheck and targeted lint pass. Android behavior is intentionally unchanged; adapt only with separate owner authorization. [Details](ios-microphone-denial-2026-10-08.md).
5. **Screen awake:** `c17ed1a434e3b42ca807785d451e3654b339af38` remains the iOS focus/lifecycle fix. [Android adaptation notes](ios-screen-awake-2026-10-08.md). It intentionally runs only on iOS; Android needs its own adaptation and physical lock-timeout test, not an indiscriminate dependency/config merge.

## Latest owner feedback and settings discoverability

The owner reported that the repaired pullup bars look much better and the extra microphone prompts after denial are gone. Preserve those published changes and the already-approved pushup calibration. A first-recording prompt report remains under investigation: the owner confirmed the game opened after camera approval, without the microphone screen. The native permission state/recording flag from that attempt were not captured; which installed update was tested was not captured. On a subsequent delete/reinstall retest, the owner reported that the microphone prompt appeared on the first attempt. The earlier observation remains unexplained, not a confirmed ongoing failure. The existing Info settings action is relabeled "Camera & microphone settings" with a clearer subtitle. That label is saved for the next update/build, not part of the previously published OTA. No capture or permission decision logic is changed for this follow-up. [Scope, feedback and test coverage](ios-permission-discoverability-2026-10-08.md).

## Calibration onboarding copy and device feedback

The owner corrected the proposed silhouette wording because Sky mode has no silhouette, and the numbered steps already explain the progress bar. Only the introductory paragraph in `apps/mobile/src/app/onboarding.tsx` now reads: "Follow the on-screen instructions to get into position. In Camera mode, silhouettes also show you each pose." The owner also requested moving the unchanged pullup preparation paragraph below steps 1, 2 and 3, directly above the Normal Play privacy note. Preserve the numbered instructions and all calibration timing/logic. No silhouette is added to Sky mode or to the onboarding page. This copy change is now published in the iOS OTA recorded below; Android may adopt the relevant paragraph later without merging iOS configuration.

Owner device feedback: Flap Fit recording branding appears correctly, and the screen stayed awake for an entire 60-pipe run. Pullup calibration is intentionally left as-is at the owner's request. [Full feedback and scope](ios-permission-discoverability-2026-10-08.md).

## Latest permission and artwork follow-ups

- `a008816`: iOS denied microphone permission now proceeds silently on this and later recording entries, without another custom prompt. The existing recording/audio/share options are unchanged. All 38 entry/permission tests, typecheck and targeted lint passed. This supersedes the earlier three-choice denial behavior described in the historical index.
- [Pullup bar repair](ios-pullup-bar-repair-2026-10-08.md) restores neutral gray bar pixels from the original reference in the two hold poses; outside the local strips all pixels are identical. No tracking changes. Use the final committed assets after owner acceptance when adapting Android later.

## Subsequent testing clarification and microphone follow-up

The owner clarified their initial upright-calibration report came from a deleted/reinstalled build 10 before applying the manual OTA. Do not attribute that old embedded-build result to the latest correction; the owner subsequently tested the updated iPad version and explicitly approved locking it in. The owner then confirmed repeated custom microphone screens after declining optional sound. [The focused follow-up](ios-microphone-denial-2026-10-08.md) supersedes the three-choice iOS denial flow above; Android adaptation remains a separate owner-authorized task.

## Unpublished navigation color candidate

A later owner-requested [navy/white tab-bar preview](ios-navy-tab-preview-2026-10-08.md) is saved separately from the published onboarding OTA. The latest revision preserves the existing orange selected icon/label and removes the earlier square-highlight proposal; only the bar background and inactive control colors change. It is iOS-only, preserves icons/layout and awaits the owner's decision before publication or resubmission inclusion. Do not treat it as already device-approved or copy its iOS guard into Android without adapting deliberately.

## Published iOS state and verification

Latest publication: `229b6ae855b2e931889ac5925de2dc75a5390e7f`, group `1a07489a-fdcb-447b-94f4-462792b83945`, created `2026-10-08T21:26:59.226Z`. This adds only the onboarding introduction/order and Info settings copy to the previously tested OTA. It preserves the approved calibration, artwork, capture and permission behavior. [Receipt and verification](ios-onboarding-ota-2026-10-08.md).

Previous publication checkpoint:

The previous published iOS source was `212141964722dbac79f94905b48fe36585215ea2`, update group `617283a4-b4bb-489c-af81-368bb4ab35f3`, created `2026-10-08T18:51:11.073Z`. It retains the approved pushup calibration and Home label change, and adds automatic silent iOS entry after microphone denial plus two repaired pullup bar assets. Runtime `469f66ace28d0ea7661bb8681b0239739f8b3955` matches TestFlight build 10. [Publication and verification](ios-mic-pullup-ota-2026-10-08.md). The owner has since reported improved pullup bars and no repeated microphone prompts after denial; the first-prompt retest is recorded above. This does not establish acceptance of every device scenario.

The final affected run passed 138 tests; 37 startup/permission tests, TypeScript, lint and layout checks also passed. The full run passed 78 other suites before a new test-file quote typo was corrected and its affected tests rerun successfully; do not describe that as one wholly passing full-suite invocation. The owner has since approved the updated iPad pushup calibration; this is not a claim that every exercise/device scenario was physically tested. The owner has since accepted the repaired pullup bar appearance and confirmed the repeated microphone prompts are gone. The owner subsequently reported correct recording branding and an entire 60-pipe run without screen sleep. The owner declines repeating pullup calibration and wants it preserved. Do not keep treating another pullup test as a required next step; no new pullup test is claimed as passed. Android behavior and compatibility are not verified by these iOS results.

Port only owner-approved changes after comparing against the Android branch's newer work. Do not blindly replace shared files or merge iOS build configuration. This handoff authorizes no Android build or publication. Preserve unrelated gameplay, ads/results, privacy, recording branding and progress.

## Historical snapshot from before the subsequent corrections

The following is retained for traceability only. Statements about pending microphone/artwork work, arm-only checks, publication status and earlier test totals applied to that earlier checkpoint; use the current index above for adoption.

### Saved changes

1. **Calibration correction:** `670ab25878b02fc8ce9279740ac8e9f10c5d762b` — require both visible, individually straight arms for pushup step one; count distinct camera observations through the existing hold; reset stale tracking. [Detailed behavior, limits and Android port notes](ios-pushup-calibration-2026-10-08.md).
2. **iOS automatic screen-sleep protection:** `c17ed1a434e3b42ca807785d451e3654b339af38` — scoped to focused calibration/gameplay, released for results/exit, with safe cleanup after quick navigation. Uses the already-resolved Expo module. [Details and Android adaptation notes](ios-screen-awake-2026-10-08.md).
3. **Unpublished artwork backup:** [smooth pushup candidate assets and comparisons](pushup-artwork-candidate-2026-10-08/README.md). These are not active app assets and must not be shipped automatically.

Only the iOS candidate branch was modified. `main`, all local Android branches, and the submitted build-8 release tag retain their prior references. No Android agent was contacted and no subagents were used.

### Automated verification

- Final full Jest run: **78 suites / 1,874 tests passed**, 300.515 seconds.
- TypeScript: passed.
- Repository lint: passed, zero warnings/errors.
- Yarn immutable dependency validation, skipping build scripts: passed. No resolved package version changed; `expo-keep-awake ~57.0.2` is now a direct app dependency as well as the existing Expo dependency.
- New calibration regression tests: 15 of 18 failed against the old behavior; all 18 pass after correction. They use synthetic joint streams and the real calibration state machine, not physical device recordings.
- Screen-awake lifecycle and actual game-entry integration tests: passed. A missing native-module mock in the first full test run was corrected in the test setup; the final full run passes.
- Existing production release validation: all reported checks pass EXCEPT the pre-existing physically-approved tracker-version check. The changed rules have a new marker, `2026-10-08.1-pushup-calibration`; the production profile deliberately retains the older owner-tested marker. New rules have NOT been declared physically approved.

### Remaining review/testing

- Owner must physically test bilateral-arm calibration, interruption/reset and normal front-facing pushup gameplay on iPad/iPhone.
- The arm checks still do not prove floor contact. Standing with both estimated arms straight can still satisfy them. Do not claim all incorrect calibrations or all camera-estimation errors have been eliminated.
- Owner must verify automatic screen lock is prevented past the usual timeout during calibration/play, and normal sleep resumes after results/exit. Exact cause of the first reported iPad occurrence cannot be reconstructed; no keep-awake protection was removed from the submitted source.
- Smoother pushup artwork awaits owner visual approval/device preview. Other silhouettes have not been redrawn or replaced.
- The previously discussed microphone permission-flow correction remains pending. Existing camera correction, microphone behavior, recording branding, other guides, ad rules and manual OTA behavior were preserved in this work.
- Before any later OTA, verify the completed candidate against the installed runtime and the applicable validation/approval path. Baseline native fingerprint already contains ExpoKeepAwake, but that fact alone is not a runtime-compatibility check. Do not bypass compatibility protection or assume either a native build or OTA is automatically appropriate.

**No build, OTA publication, TestFlight upload, App Review submission or public release was started in this work.** Current devices still have their existing installed code.

### Android agent

Inspect the two source commits independently; port only the requested fixes after checking your branch's newer work. Preserve its calibration experiments and do not blindly replace shared files. The wake component intentionally runs only on iOS, so Android needs an explicit adaptation and its own screen-timeout tests. Use the saved artwork only after owner acceptance. This handoff does not authorize an Android build or publication.
