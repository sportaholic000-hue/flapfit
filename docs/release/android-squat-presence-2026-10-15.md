# Android squat presence and calibration follow-up

Branch: codex/android-design-integration. Preview marker: 2026-10-15.5-squat-presence.

The owner rejected 001a823: step one completed while leaving the camera and straight-leg movement still sustained flight. This follow-up was initially a testing candidate. The owner accepted the Android squat behavior after physical phone testing on October 16, 2026; see the acceptance record below.

## Demonstrated defects and changes

- Squats counted rendering frames of a stale pose toward the hold. Require fresh camera timestamps, as the existing pullup/pushup paths already do.
- Empty detector results left the previous person active. Squat empty results and detector errors now immediately clear the calibration hold/current raw tracking; existing gameplay tracking-loss grace remains.
- The latest trace accepted a laterally moving, edge-of-frame standing reference. Require a broadly centered, camera-facing pose and horizontal as well as vertical stability. A held deep crouch cannot supply the standing reference.
- Calibration used one final pose for leg references but averaged shoulder observations for flight. Both now use the same stable observations.
- The old 45% shoulder gate and 40% leg mismatch allowance ignored the latest partial-range straight-leg run. Check beyond 30% with a 30-percentage-point allowance. Retain fresh-observation evidence accumulation, noise recovery, 600 ms latch and existing fatal/gravity handling. A tighter 20% allowance falsely rejected an earlier close squat trace and was not retained.

Flight remains shoulder-controlled. Ankles/feet are unused. Hands have no prescribed position; hips and knees still supply independent leg evidence. This is a 2D camera estimate, not proof of anatomical knee flexion. Physical phone testing is recorded below; the camera estimate is not a guarantee against every possible false movement.

## Verification

192 regression cases passed, including actual tracking-loop empty detections, stale renders, returning after absence, walking/edge framing, crouched start, averaged references, legitimate squats and straight-leg partial-range movement. Lint and whitespace checks passed.

Offline replays: both earlier normal squat traces calibrate and remain in play. The previous straight-leg trace produces a form failure. The latest trace's original edge calibration is rejected. Because new cues change when a person should stand/crouch, its full replay cannot prove subsequent gameplay correctness. A separate gameplay-only replay supplies the last observed original top/bottom references: the new leg check detects sustained mismatch at camera time 25.2565 s (play began about 21.22 s). That reference injection is only in the local replay, never the app. Raw measurements and replay files remain local.

No iOS checkout, main, submitted release tag, dependencies, recording behavior, build or OTA was changed. The accepted tracking implementation remains unchanged at a1701e36990f73e7b170ab5951821a31d819cc4f.

## Owner acceptance — October 16, 2026

Accepted Android implementation: [a1701e3](https://github.com/sportaholic000-hue/flapfit/commit/a1701e36990f73e7b170ab5951821a31d819cc4f), preview marker 2026-10-15.5-squat-presence, on codex/android-design-integration.

The owner reported physical phone testing confirmed:

- Deliberately leaving the camera stopped calibration.
- Head-only movement ended both attempted runs.
- Real squats flew smoothly on the phone.
- Different hand movements and placements that previously caused jitter remained smooth.

The owner explicitly instructed: “lock it in, were keeping it like this”. Retain this implementation as the accepted Android squat baseline. Do not retune it as part of unrelated design or exercise changes. This acceptance records the tested squat behavior, not a claim that every possible cheating motion is prevented or that the entire app is release-approved.

This acceptance update changes documentation only. It does not port the fix to iOS, change main or a submitted release, start a build, or publish an OTA.
