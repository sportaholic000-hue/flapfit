# Android squat tracking without feet in frame

Branch: codex/android-design-integration. Parent commit: 00d32d8.
Scope: squat tracking and its framing copy in the Android checkout. No iOS branch, main, release tag, native dependency, recording, build, or OTA change.

## Reproduced defect

The owner can complete calibration with feet outside a phone camera image, but gameplay becomes erratic. Old squat calibration and gameplay use hip-knee-ankle angles. formPoint accepts confidence-qualified positions even outside image bounds. Therefore an inferred off-image ankle can pass calibration and later disappear or change angle.

Replayed the actual pre-change script: both top and bottom calibration accepted ankle y=1.3 (outside the normalized image), then gameplay became invalid with identical torso/upper-leg movement when ankle confidence disappeared. The updated script accepts that same movement without consulting lower-leg landmarks.

This confirms an ankle-dependent failure, not every source of physical-device jitter. Existing game logic tolerates invalid form briefly, then releases control after 1600 ms of sustained failure. It does not oscillate flight on every invalid frame. Hip estimation noise can independently change the control signal.

## Implementation

- scriptSquatTracking.ts collects only shoulders, hips, and knees. It never reads ankles, heels, or toes, even when those points are present.
- Hip height remains the controller, with unchanged smoothing, calibrated range mapping, bird physics, and tracking-loss grace.
- Both hips must be observed in frame to use their midpoint. Brief loss holds the previous input instead of changing from a midpoint to one hip. Both shoulders and at least one observed knee are needed for form validation.
- Standing calibration checks an upright torso with hips above knees. Bottom calibration checks hip descent toward the knees and shoulder descent, rejecting a chest-only waist bend or translation of an unchanged standing pose. The existing 0.06 image-height range requirement remains.
- Gameplay compares upper-leg vertical shortening with the calibrated endpoints using matching current observations, rather than an ankle angle compared with a delayed control signal. Natural lean and movement beyond endpoints remain supported.
- Instructions explicitly allow feet out of frame. Two calibration steps, hold timing, progress bars, artwork, fades and countdown are unchanged.
- Other exercises retain their existing tracking paths, including pull-up floor/support checks.

## Verification

Run from repository root:

    node apps/mobile/scripts/test-squat-tracking.cjs

172 synchronous assertions/test cases passed across the new squat suite, existing form tracking, continuous gameplay, push-up entry and pull-up gameplay suites. The lightweight runner executes the existing test bodies with Node type stripping and Jest expect; it does not load Expo's native preset. A standard Jest invocation stalled without output and was stopped; no native build was attempted.

The 17 new cases cover hidden/visible/off-image feet; identical full calibration and bird trajectories at three camera scales with lower-leg estimates changing; no lower-leg reads (throwing getters); head/hand movement; torso occlusion and malformed/off-image points; upper-leg visibility; waist-bend and standing-translation rejection; natural lean; endpoint extension; reset/recalibration.

Changed source/test lint and git diff --check passed. Synthetic pose results do not establish real camera-model accuracy.

## Phone acceptance test still required

1. Reload the Android Expo preview and start a fresh squat run with the phone on a chair. Keep shoulders, hips and knees visible; crop feet/ankles out.
2. Complete standing/deep-squat holds, then test slow squats, faster squats and holding mid-height. Compare with the old problematic setup.
3. Try hands together and apart, plus the clothing that previously caused problems. These may still affect actual hip visibility; hands are not control landmarks.
4. Compare a run with feet visible. Foot visibility should not change control behavior.
5. Recheck another exercise and Record & Play normally. Recording code is unchanged.

## iOS handoff

Do not modify the submitted Apple release. Once authorized, port scriptSquatTracking.ts, its import/injection and squat dispatches in scriptFormTracking.ts, the squat framing copy in scriptGame.ts and Home, and the regression suite. Confirm the target Apple checkout's tracking implementation before applying. Do not copy the entire Android branch or its native configuration. Run the same regressions and physically test on iPhone as well as iPad. App review timing/expedited review eligibility has not been evaluated here.

## Physical retest outcome and next investigation

The owner retested after the change: close/chair framing is still very jittery, while backing away until the full body is visible remains smooth. The user-visible defect is NOT resolved by removing ankle validation. Do not treat the synthetic results above as a release sign-off.

Added Android-development-only numeric pose diagnostics (squatDiagnostics = __DEV__ && Platform.OS === android). They report bounded batches of shoulder/hip/knee coordinates, confidence, camera intervals, calibration range, control signal, bird height and validation outcomes to the existing local Expo console. No images or audio are captured by diagnostics, no new service is called, and release builds disable it. Diagnostics do not change control behavior. The purpose is to compare actual close/framed pose instability before selecting a further fix. Runtime traces must stay local and are not committed to GitHub.

Diagnostics validation: 174 regression cases passed, including disabled-by-default behavior, bounded batches and identical control with diagnostics enabled/disabled. Expo served the Android bundle successfully with diagnostic version 2026-10-15.2-squat-trace. Awaiting the actual close-framing phone run before changing the control algorithm again.
