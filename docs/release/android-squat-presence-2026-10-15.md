# Android squat presence and calibration follow-up

Branch: codex/android-design-integration. Preview marker: 2026-10-15.5-squat-presence.

The owner rejected 001a823: step one completed while leaving the camera and straight-leg movement still sustained flight. This follow-up is a testing candidate, not physical-device sign-off.

## Demonstrated defects and changes

- Squats counted rendering frames of a stale pose toward the hold. Require fresh camera timestamps, as the existing pullup/pushup paths already do.
- Empty detector results left the previous person active. Squat empty results and detector errors now immediately clear the calibration hold/current raw tracking; existing gameplay tracking-loss grace remains.
- The latest trace accepted a laterally moving, edge-of-frame standing reference. Require a broadly centered, camera-facing pose and horizontal as well as vertical stability. A held deep crouch cannot supply the standing reference.
- Calibration used one final pose for leg references but averaged shoulder observations for flight. Both now use the same stable observations.
- The old 45% shoulder gate and 40% leg mismatch allowance ignored the latest partial-range straight-leg run. Check beyond 30% with a 30-percentage-point allowance. Retain fresh-observation evidence accumulation, noise recovery, 600 ms latch and existing fatal/gravity handling. A tighter 20% allowance falsely rejected an earlier close squat trace and was not retained.

Flight remains shoulder-controlled. Ankles/feet are unused. Hands have no prescribed position; hips and knees still supply independent leg evidence. This is a 2D camera estimate, not proof of anatomical knee flexion. Real-device testing with hands in front and feet cropped remains necessary.

## Verification

192 regression cases passed, including actual tracking-loop empty detections, stale renders, returning after absence, walking/edge framing, crouched start, averaged references, legitimate squats and straight-leg partial-range movement. Lint and whitespace checks passed.

Offline replays: both earlier normal squat traces calibrate and remain in play. The previous straight-leg trace produces a form failure. The latest trace's original edge calibration is rejected. Because new cues change when a person should stand/crouch, its full replay cannot prove subsequent gameplay correctness. A separate gameplay-only replay supplies the last observed original top/bottom references: the new leg check detects sustained mismatch at camera time 25.2565 s (play began about 21.22 s). That reference injection is only in the local replay, never the app. Raw measurements and replay files remain local.

No iOS checkout, main, submitted release tag, dependencies, recording behavior, build or OTA was changed. Reload Expo Go and start a fresh run to test this candidate.
