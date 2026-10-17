# Android curl experiment: forearm control, eye-line top reference

Status: implemented for Android development preview; owner acceptance pending. Not a release-ready claim. Version 2026-10-17.1-curl-forearm-experiment. Branch codex/android-design-integration.

## Owner-approved experiment

The owner explicitly requested no shoulder dependence for curls. Head/eyes establish only the TOP calibration reference and must not control flight. Both arms still participate. Preserve partial holds and quick changes, calibration UI/fades, other exercises, the accepted squat fix and iOS. No freezing, single-arm fallback, missing-forearm midpoint assumption, build, OTA or model/dependency changes.

## Implementation

Opt-in configuration curlForearmControl is enabled only by __DEV__ && Platform.OS === 'android'. One flag disables the experiment. Production and iOS use the existing controller until this experiment is physically accepted and explicitly promoted.

The experimental collector reads each elbow and wrist in the image and the existing detector's 3D output. It never reads shoulders or requires hips. Each forearm signal is (elbow.y - wrist.y) / 3D forearm length. This cancels common position and scale changes. It still depends on hand/wrist estimates as endpoints; it is not a separate forearm detector.

During calibration, combined controller Y is 0.5 - 0.125 * (leftLift + rightLift). Existing median/adaptive calibration-only filtering, fresh-pose hold timing (1,300 ms, at least eight observations), drift tolerance, progress UI, fades and countdown remain. Gameplay retains the original 0.55 response and bird easing, without the rejected adaptive gameplay filter.

TOP: both eyes establish a personal reference (visibility >=0.5). Each elbow/hand requires >=0.24 visibility and in-frame image coordinates plus finite 3D endpoints. Each hand must be above its elbow by at least 20% of the eye-to-elbow image gap, no more than 0.03 image heights above the eye line, with forearm lift >=0.15. Eye-to-elbow gap must exceed 0.06. This qualifies an actual raised forearm without requiring hands at eye height. Either hanging arm fails. The main instruction reads: Curl BOTH hands to the TOP / Keep elbows near your sides / Hold still.

BOTTOM: both forearms point down (lift <=-0.65) and both hands are at least 0.02 image heights below their elbows. Each wrist must travel at least the existing 0.05 from its top position; each forearm lift must change by at least 0.5. Each elbow remains within 0.13 image-coordinate distance of its own top reference. Existing fully extended bottom instruction remains. No face observation is required for bottom calibration.

PLAY: each arm is normalized separately against its own calibrated forearm range, clamped to 0..1, then the two progress values contribute equally to flight. Head/eyes are not consulted at all. Preserve the 0.30 bilateral disagreement threshold and existing fatal confirmation. Missing either forearm is a both-arm failure, not permission to use one arm. Per-arm elbow anchors use the average of accepted top/bottom elbow positions and retain the 0.13 limit to reject lifting whole arms. The shoulder-dependent angle and torso checks are bypassed completely for the experiment; they remain in the inactive legacy path.

This is an experimental replacement of the curl measurement and associated calibration rules, not a proven solution to weighted-curl jitter. In particular, the new forearm signal still comes from estimated elbow/hand coordinates, and owner testing must establish whether weighted and hammer curls improve.

## Diagnostics and verification

Development traces identify controller forearm-eye-top-1, calibration eye-top-forearm-bottom-1, and geometry shoulder-free-forearm-1. They include eye points, per-arm forearm lifts/progress, exact calibration references and existing numeric timing data. No photos, video, audio or extra service. Old traces lack eyes, so do not claim an exact replay of the new face-referenced calibration. The captured no-weight TOP forearm lifts were approximately 0.64/0.71 and BOTTOM -0.83/-0.78, supporting the proposed direction/range, not proving gameplay quality.

251 focused tests passed, including 20 experiment tests: absent shoulders/hips throughout calibration and play; changing head/eye/shoulder estimates does not change flight; no face requirement after TOP; head movement cannot calibrate hanging arms; each arm required at both endpoints; partial holds around 90 degrees; quick transitions; small adjustments; unilateral/alternating failures; missing forearm failure; per-arm elbow-anchor rejection; common 3D scale/translation invariance; individually normalized ranges; fresh-camera-only calibration; diagnostic equivalence; and Android development-only opt-in. Existing squat/other-exercise regressions also pass. Typecheck, changed-file lint and generated-script parsing are checked before handoff.

Test with a fresh Expo reload and a new curl run. The owner normally tests without weights first, then weighted curls. No requirement for steady full repetitions: assess the normal game's partial movements, holds and quick transitions. Weighted and hammer physical acceptance is still required before release. Do not port this experiment to iOS as an accepted fix.
