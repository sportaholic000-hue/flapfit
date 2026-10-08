# iOS overnight corrections — October 8, 2026

Owner scope: correct pushup entry and excessive instructions; preserve approved pushup hands; repair bottom-pose ear/neck contours, first pullup hands and standing-guide aperture artifacts; finish microphone permission wording; deliver an iOS OTA for TestFlight build 10. No native build, App Review submission or Android publication authorized for this step.

## Pushup entry

Previous published source `64a32f6a2689a0874d49444b35b40bc79574838d` used straight bilateral arms plus shoulder-to-hip depth. Bending forward can satisfy both conditions while the upper legs remain upright. The timing buffer was still present; holding the wrong pose long enough bypassed the incomplete posture condition.

The top-calibration check now also requires a visible upper leg extending away from the camera, aligned with its shoulder-to-hip segment (shoulder–hip–knee angle at least 145 degrees). At least one knee must be observed in frame with sufficient visibility and finite depth; every other observable leg must agree. No average can hide an upright thigh. Unknown lower-body geometry cannot fill the bar. Both straight-arm requirements, the 2-second preparation, 1.3-second stable hold and fresh-camera-observation requirements remain. A failed posture clears the hold.

This uses the existing MediaPipe landmarks. No new model, camera acquisition, inference pass, networking or SDK initialization. Only top calibration checks this posture. Pushup gameplay validation, other exercise calibration, scoring, recording, ads and guide transitions retain their existing behavior. Source preservation checks compare those sections directly with the preceding commit.

Both calibration steps now display the original short top/bottom instruction and a visible bar, empty while the posture is invalid. Removed the added “body extended behind you” coaching. No new instruction screen.

The observed native failure motivated this change, but the owner’s camera stream was not captured. Automated cases represent upright/hip-hinged geometry, valid prone entry, one hidden knee, contradicting knees, missing/invalid depth, aspect ratios and interrupted holds; static bundled-model illustration observations are complementary, not native acceptance. Camera angle and pose-estimation errors still require the owner’s iPad test. This does not prove physical floor contact. The physically-approved release marker is intentionally unchanged; no test approval has been invented.

Reference: [MediaPipe normalized landmark coordinates and depth](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js).

## Artwork

- Bottom pushup: restore the source’s original smooth ear/head/neck/shoulder contours locally. The approved hand/wrist pixel region (rows 331 onward) is exactly unchanged. The top pushup file is wholly unchanged.
- Pullups: restore the original source finger contours for the preparatory overhead reach and the first top-hold grip. Later-pose hands are unchanged.
- Standing guides: restore the narrow original aperture between the legs, removing the separate dark dot/outline bridge created by the earlier mask cleanup. This includes press, lateral raise, curls, standing squat and pullup guides. Deep squat is unchanged.
- Existing layout bounds, translucent body opacity, yellow accents and lossless WebP embedding remain. No new outline was drawn in the repaired regions. Exact asset bytes are regenerated into the WebView’s embedded artwork module.

[Before/after detail sheet](calibration-detail-repairs-2026-10-08/before-after.png) boosts opacity for inspection; it is not the displayed app opacity. [Local repair recipe](calibration-detail-repairs-2026-10-08/repair-artwork.py) restores original reference pixels from preserved Android artwork commit `dc4b47056ac9a9864f435c2025bff9022c56473d` and the included aligned generated bottom-pose reference. It writes to a separate `--output` folder; it does not automatically overwrite application assets. Base files are pinned to `29d378f949bd4a54e88a29ac595a1b0e83c7df71`.

## Microphone

For iOS Record & Play with undetermined microphone permission, the custom explanation now has one neutral **Continue** action and proceeds to Apple’s native request. Previously granted access proceeds directly. Previously denied access presents the existing **Open settings**, **Continue without sound** and **Go back** choices, never another native request, including when the permission API reports `canAskAgain=true`. Returning from Settings rechecks permission. Silent recording uses `recordAudio:false`; ordinary gameplay never requests microphone access. Camera behavior and Android prompt actions are retained. No new saved preference or support workflow.

## Verification / delivery

- Full automated run: 78 suites passed; the newly extended calibration test file initially failed to parse because of a quote in its test harness. That test-only typo was corrected. The final affected rerun passes all 138 tests across calibration/form tracking and embedded artwork. No remaining failed test is left unresolved; the initial log is retained locally.
- All 37 startup/permission tests pass, including first request, granted/denied microphone, repeated entry, silent recording, Settings recovery, ordinary non-recording play, the unchanged camera flow and existing result-ad behavior.
- TypeScript and lint pass.
- Guide checks: 36 excluded configurations identical, 12 enabled configurations, all six exercise fades, pullup reach transitions, cancellation and countdown checks pass.
- Layout checks: 52 calibration layouts and 8 recording layouts at compact/large iPhone and 11/13-inch iPad viewport sizes pass. Representative exact-app markup renders are saved beside the repair recipe. These are desktop layout checks, not physical iPad camera tests.
- Pixel/source checks confirm the approved pushup hands, top pushup file, deep squat file, active gameplay validator and other-exercise calibration are unchanged.

Official Expo fingerprint passed: `469f66ace28d0ea7661bb8681b0239739f8b3955`, matching TestFlight build 10 with no compatibility override. Remote production-environment validation also passed, including the existing live-ad configuration. The owner-authorized iOS update was published successfully at **2026-10-08 09:23:55 UTC / 06:23:55 Halifax ADT** from source commit [`e79814244cc8fb839986c87320faa13d2f933a3d`](https://github.com/sportaholic000-hue/flapfit/commit/e79814244cc8fb839986c87320faa13d2f933a3d). It uses the production channel/environment and existing live-ad configuration. The existing manual Info update flow remains. No native build or App Review submission was started.

- Update group: `3bccd61a-259a-43b8-a57e-90baf1da5639`
- iOS update: `01a11ad3-915e-7988-b801-d63a2305bfea`
- Native runtime: `469f66ace28d0ea7661bb8681b0239739f8b3955` (TestFlight build 10; no override).
- [Expo update](https://expo.dev/accounts/flapfitapp/projects/flapfit/updates/3bccd61a-259a-43b8-a57e-90baf1da5639)
- [Publication receipt](calibration-detail-repairs-2026-10-08/published-update.json)

Post-publication verification confirms the receipt points to the exact source commit and iOS runtime. The exported 10,108,572-byte Hermes bundle contains the revised pushup entry check, corrected microphone copy and all 13 exact committed WebP image payloads. The removed long calibration instruction is absent. Physical iPad acceptance remains pending. This receipt-only documentation commit does not change the published app source.

## Owner acceptance before any native build

1. Install through **Info → Check for updates → Update now**.
2. Standing and bending to adjust the iPad must not fill pushup step one. A genuine top pushup should fill the existing hold; bending an arm or leaving the posture during the hold must reset it. Complete bottom calibration and play normally.
3. Inspect bottom-pushup ears/neck, unchanged approved hands, first pullup hands and the standing-guide gaps over the live camera.
4. Record with microphone permission denied, continue without sound, and verify the recording/share flow. A granted microphone should still record audio.

All work stays on `codex/ios-camera-permission-review`. Main, submitted build-8 tag and Android branches remain unchanged. The source and recipe provide a later Android handoff without applying Android changes now.
