# iOS onboarding and settings copy OTA - October 8, 2026

Published on the owner's explicit request to inspect the reordered onboarding before considering another native build.

- App source: `229b6ae855b2e931889ac5925de2dc75a5390e7f` on `codex/ios-camera-permission-review`, committed and pushed before export.
- Group: `1a07489a-fdcb-447b-94f4-462792b83945`; iOS update: `01a11d69-8d9a-799b-9014-57706b998425`.
- Created: `2026-10-08T21:26:59.226Z`.
- Channel/environment: production; existing live-ad configuration retained.
- Runtime: `469f66ace28d0ea7661bb8681b0239739f8b3955`, exactly matching TestFlight build 10 using the official 109-source fingerprint, without override.
- [Expo publication](https://expo.dev/accounts/flapfitapp/projects/flapfit/updates/1a07489a-fdcb-447b-94f4-462792b83945).

## Exact changes since the previous OTA

Only two application screens changed relative to `212141964722dbac79f94905b48fe36585215ea2`:

- Calibration onboarding introduction: "Follow the on-screen instructions to get into position. In Camera mode, silhouettes also show you each pose."
- Move the unchanged pullup preparation paragraph below the numbered 1, 2 and 3 instructions, directly above the Normal Play note. Its wording, styling and the numbered steps are unchanged.
- Info's existing system-settings row now reads "Camera & microphone settings", with "Change camera or microphone access in your device settings" underneath. The action is unchanged.

The additional changes outside those two screens are integration test coverage and release evidence. Actual gameplay/calibration, all artwork, microphone capture, permission gating, results/ad actions and timing, branding, manual updates and native configuration are unchanged from the previous OTA. Main, submitted build-8 tag and Android refs were checked and preserved.

## Verification

- Targeted lint and diff checks passed. The existing permission/entry checks passed all 40 tests and TypeScript at the earlier Info-label checkpoint; no behavior test was added or rerun for the subsequent paragraph-only edits.
- Clean source, pushed commit, narrow file scope and production environment validator passed before export.
- The official fingerprint matched build 10 before publication. The standard Expo iOS export ran under the real EAS production environment with its existing cache retained. Its actual onboarding, Info, Home and Game source maps matched committed source. The requested paragraph order was checked in that package, and all 13 embedded silhouette payloads matched the committed assets byte-for-byte.
- Published that freshly generated and verified package using EAS's supported `--skip-bundler` option to avoid regenerating it. This does not disable EAS's native fingerprint calculation; publication independently returned the same required runtime.
- Receipt and actual exported bundle verified after publication. [Evidence](ios-onboarding-ota-2026-10-08/).

## Owner feedback and inspection

The owner has approved pushup calibration and the repaired pullup bar appearance. They reported correct video branding, no repeated microphone-denial prompts, a successful first microphone prompt on a delete/reinstall retry, and a full 60-pipe run with the screen awake. The earlier missing first-prompt observation has no established cause; do not claim it was reproduced or fixed. The owner expressly chose to leave pullup calibration alone.

Install through Info -> Check for updates -> Update now. Then use Info -> View introduction again to inspect the text order, and check the renamed settings row. No reinstall is needed. A fresh build 10 installation initially contains its original embedded source until the manual update is installed.

No native build, App Review submission or public release was started. A later owner-approved native build should embed these accepted changes and synchronize the already-approved pushup tracker marker in both the build profile and matching production environment; neither marker was changed for this compatible OTA.
