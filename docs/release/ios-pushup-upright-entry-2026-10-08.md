# iOS pushup step-one upright entry — 2026-10-08

Prepared for owner review/device testing. No OTA publication, native build, upload or Apple submission in this revision.

## Reproduced defect

The owner reported standing upright while the pushup first-step bar filled. Published source `34ba0d5205d133f07ee973734fe2397c05d49e88` required bilateral straight elbows and wrists below shoulders, but these also describe standing with arms down. The 2-second preparation and 1.3-second stable hold still existed; they cannot reject a consistently wrong posture. The preceding arm-only fix was insufficient.

A replay through the actual calibration/stability loop reproduces acceptance of upright arms-down observations. These observations came from the existing bundled MediaPipe Lite model running locally on static illustrations, not video of the owner or physical-device testing. The same observed upright fixture now stays at zero progress; the observed top-pushup fixture still completes step one. The illustrated bottom pose had no model detection in this static experiment and is not claimed as a successful test.

## Focused correction

`pushupTopTorsoRecedesFromCamera` uses the normalized depth already present in MediaPipe landmarks. Both visible shoulder-to-hip sides must extend away from the camera more than vertically; normalized depth is converted from image-width scale to image-height scale using actual video dimensions. Missing/nonfinite depth, unknown video dimensions or off-image torso landmarks cannot fill the hold. Both existing straight-arm checks and the existing preparation/fresh-observation/stability rules remain.

The geometry boundary is over 45 degrees from upright in the camera frame, with a small minimum depth separation. It is a conservative candidate entry heuristic, **not proof of hands touching the floor**. Camera tilt, occlusion and depth-estimation errors still require native testing; a deeply bent-over person can still resemble a prone torso. Do not claim every invalid posture is eliminated or change broader gameplay rules without owner testing.

Only pushup top calibration calls the helper. Pushup bottom checks, every exercise’s gameplay validation, other-exercise calibration, timing, scoring, ads, permissions, microphone behavior, recording and guide stage transitions remain unchanged. No second model, dependency, inference pass, networking or SDK work was added.

Reference for landmark scale: [Google Pose Landmarker for Web](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js).

## Verification and limits

- 122 affected checks pass: original bilateral-arm/hold tests, upright entry, invalid depth, camera aspect ratios, recovery after standing, actual bundled-model illustration observations, existing form/gameplay cases and artwork tests.
- Full suite: 79 suites / 1,911 tests attempted; 1,910 passed, one startup lifecycle test exceeded 30 seconds. The unchanged startup suite then passed all 29 tests in an isolated rerun with the original timeout. Both results retained; no test timeout or production behavior relaxed.
- TypeScript and lint pass. Test-only fixture types now explicitly include optional depth; non-pushup fixture camera behavior is preserved.
- Verified other-exercise calibration and the entire gameplay-validation section are identical to prior source.
- Official iOS runtime fingerprint remains `469f66ace28d0ea7661bb8681b0239739f8b3955`, matching TestFlight build 10, without bypassing compatibility checks.
- Rules marker becomes `2026-10-08.2-pushup-entry-posture`. Production’s physically-approved marker is deliberately unchanged; this revision is **not** marked physically approved.

## Required owner device check before building

Once an owner-approved preview is installed: (1) stand upright with arms down and adjust the iPad—step-one progress must remain zero while upright; (2) enter a proper top pushup with both arms straight—the existing hold should fill; (3) bend an arm or stand up during the hold—it must reset; (4) complete the bottom step and play normally; (5) inspect both hands and transparency. Test normal floor-level camera placement and lighting. Do not treat the local illustration replays as acceptance of these checks.

Protected branches `main`, Android branches and submitted build-8 tag remain unchanged. No publication is authorized by this document.
