> Rejected after owner testing: no-weight run felt great, but normal weighted curls regained bad middle-to-top jitter. Input timing change rolled back; retain this note as experiment history. Current preview restores the 270ce1b input behavior and retains its render-follow correction.

# Android curl input timing — 2026-10-17

Owner tested 270ce1b in this order: no weights, normal weighted curls, hammer curls, another normal weighted curl run. Upper/middle-to-top movement was reported as strongest now; remaining jitter was lower down and movement felt somewhat slow/static. Preserve the successful median-hand controller and avoid a new smoothing layer.

## Observed evidence

Latest four sessions: 467, 714, 734 and 695 sampled observations. Median fresh-pose intervals: 63.5, 66.3, 50.0 and 51.2 ms. Inference medians: 56.4, 58.9, 45.5 and 45.5 ms. These were slower than the earlier approximately 34 ms inference measurements; the cause of the device timing change is not established.

The first two runs had no sampled invalid form checks. The hammer and final weighted runs had checks only near the end; the final run ended with biceps-both-arms. Do not infer that those were unintended deaths or blame actual arm movement from landmark estimates.

Previous change corrected render follow timing. A separate existing input smoothing stage still advanced by fixed gain 0.55 per fresh pose, so its elapsed response slowed as camera updates became less frequent.

## Narrow correction

For the Android development-only curl flag, replace that existing input gain with:

    gain = 1 - (1 - 0.55) ^ (boundedElapsedMs / (1000/30))

Use the time since the last valid hand observation; bound to 0–100 ms. First/non-finite input uses nominal 30 fps. Calibration keeps its existing filter and timing. At 30 fps response is exactly unchanged. At roughly 66 ms an observation advances about 79% toward its measured target, rather than only 55%. No new temporal filter, prediction, dead zone or freezing is introduced.

Median wrist/index/pinky/thumb measurement, individual arm calibration, both-arm enforcement, eye-only TOP reference, elbow anchors, render-follow correction, camera/model, pipes/collisions, recording, other exercises, iOS and production behavior remain unchanged. No new model or dependencies, build or OTA. Controller hand-image-1; response elapsed-input-follow-1; rules version 2026-10-17.4-curl-input-timing.

## Verification

262 focused tests pass, including actual input equivalence at equal elapsed camera time, 30 fps equivalence, bounded sparse-frame response, partial changes, quick reversals, hand-point robustness and other-exercise regressions.

Before/after replay of the four saved sampled attempts produced identical hand metrics at every sample and identical calibration endpoints. The 95th-percentile absolute gap between the measured normalized hand target and filtered input decreased as follows:

| Attempt | Previous gap | New gap |
| --- | ---: | ---: |
| No weights | 0.01587 | 0.00800 |
| Weighted curls | 0.02162 | 0.00729 |
| Hammer curls | 0.02288 | 0.01254 |
| Weighted curls again | 0.02140 | 0.01049 |

These are distances to the estimated hand target, not physical latency measurements or proof of jitter removal. Recorded observations are sampled; replay does not reproduce camera inference or actual obstacles. Stronger response to sparse observations can also expose more landmark noise. Physical acceptance of responsiveness and the remaining lower-range jitter is pending. Raw personal traces remain local outside Git.
