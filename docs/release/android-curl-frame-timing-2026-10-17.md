# Android curl follow-timing refinement — 2026-10-17

Owner reported the best combined no-weight/weighted/hammer runs so far on f339040, with some remaining jitter and possible slight hammer-curl delay. Preserve that hand controller as the baseline. This change remains an Android development-preview experiment; real-device acceptance is pending.

## Evidence and chosen change

The latest three owner-labeled runs contained 1,018, 604 and 540 sampled gameplay observations. None reported an invalid form check. GPU pose inference medians were 34.4, 34.4 and 34.5 ms. Render intervals reached 50.7 ms, with approximately 18–19% exceeding 50 ms. The numeric logs are local only.

The existing game loop caps its simulation dt at 35 ms. Bird follow also used that capped dt, so an approximately 50 ms render interval advanced follow by only the 35 ms coefficient. Furthermore, its linear per-frame easing produces different follow behavior at different render cadences.

For experimental curls only, replace the existing follow coefficient with an elapsed-time exponential equivalent of the existing 30 fps follow response:

    gain = 1 - (1 - 16/30) ^ (boundedElapsedMs / (1000/30))

Elapsed time is bounded to 0–100 ms; non-finite input uses one nominal 60 fps frame. This replaces the existing follow gain in countdown and active play. It does not stack another filter, predict motion, overshoot the measured target, freeze control, or change loss-of-tracking behavior. A 50 ms frame follows approximately 68.1% toward the target instead of 56%; at 30 fps the gain is unchanged. Equal elapsed time produces equal convergence to a stationary target across 30 fps, 60 fps and mixed 16.7/50 ms intervals.

Keep the median wrist/index/pinky/thumb controller, both-arm normalization and checks, eye-only TOP reference, calibration, per-observation 0.55 smoothing, camera/model, pipes, collision processing, crash falling, recording and other exercises unchanged. The existing Android AND __DEV__ flag gates the behavior. iOS and production still use the previous path.

## Rejected alternatives

Offline per-point range normalization and shared-hand-motion fusion did not show consistent improvement across the three recorded signals, so neither was added to the application. Numeric signal roughness is not ground-truth jitter: intended movements and reversals also affect it. No claim is made that the hand tracker itself is now more accurate or that the remaining jitter is eliminated.

## Validation and limitations

Focused regressions cover both-arm enforcement, partial holds, rapid changes, isolated hand-point errors, missing points, head/shoulder independence and other exercises. Added tests verify timing invariance, 30 fps equivalence, bounded response and actual gameplay convergence across render schedules. The three latest sampled attempts are also replayed before/after to check identical calibration, hand input and form-check results using a distant test pipe. Saved samples omit some camera observations, so they cannot reproduce the original run exactly or establish physical latency.

Rules version: 2026-10-17.3-curl-frame-timing. Diagnostic controller remains hand-image-1; response is elapsed-follow-1. Owner should reload Expo and begin a fresh run. Phone testing must establish whether the timing correction helps the slight delay and overall feel. No build or OTA was started.
