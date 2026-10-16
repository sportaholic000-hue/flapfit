# Android curl control correction — phone evidence and verification

Branch: codex/android-design-integration. Rules version: 2026-10-16.1-curl-control.
Status: implemented for Android preview; physical owner acceptance is still required.

## Owner observations

No-weight curls became jittery as wrists rose, especially beyond roughly 90 degrees. Normal weighted curls were very jittery. Hammer curls repeatedly failed Step 1. The owner clarified that the hands were NOT wandering: fluctuating recorded wrist coordinates must not be described as actual hand movement. The owner deliberately allowed both playable runs to collide, so those endings do not diagnose the jitter.

The three chronological curl-trace-1 sessions were mapped to those A/B/C attempts. Raw numeric captures and replay output are preserved locally under the task's work directory and are not committed. No images or video were collected for this investigation.

## Captured evidence

| Attempt | Captured rows | Gameplay rows | Original top/bottom Y | Range |
| --- | ---: | ---: | --- | ---: |
| A, no weight | 1034 | 713 | .3413 / .5427 | .2014 |
| B, normal dumbbells | 415 | 186 | .3455 / .5694 | .2239 |
| C, hammer attempt | 362 | 0 | Step 1 never accepted | n/a |

Gameplay wrist confidence (minimum / fifth percentile):

| Attempt | Left wrist | Right wrist | Below .24 / out of image |
| --- | --- | --- | --- |
| A | .9024 / .9281 | .8448 / .8656 | 0 / 0 for each wrist |
| B | .7846 / .8055 | .6040 / .6342 | 0 / 0 for each wrist |

C across the entire abandoned calibration attempt: left .4813 / .5348; right .0887 / .0971. The right wrist was below .24 in 66 rows and outside the image in one. More importantly, there was an 8.62-second stretch (camera timestamps 5241.6–13861.7 ms) with passing pose checks but repeated hold resets. In its middle, the right wrist estimate varied by .0535–.1128 within individual one-second intervals, while the left varied much less. The averaging controller exceeded the .028 calibration drift limit despite the owner's steady hands. Late visibility failures are a separate observation, not an explanation for that valid-pose stretch.

A had no bilateral failures, and only one elbow-angle mismatch out of 713 gameplay observations. B had no failed gameplay checks. Neither crossed left/right wrist order relative to shoulders during play. C had two relative-order crossings late in the abandoned attempt, after the long passing-pose segment. There is no evidence supporting automatic hand-label swapping.

For counting brief reversals, a wrist must move at least .01 of image height and reverse by at least .01 on the very next captured observation. A had zero left / one right (the right event was near the deliberate ending). B had zero left / six right. At B timestamp 20590.8 ms, the right wrist jumped upward .0535 in 46.9 ms and reversed .0428 in the next 54.6 ms; the left moved only .0005 and .0017 in those intervals. Confidence was still high enough to pass every visibility rule. Therefore a higher/lower confidence threshold or additional tracking-loss grace does not address these recorded fluctuations.

The traces cannot establish why the pose estimator mislocated a wrist (grip, weight appearance, camera angle, overlap or background). They do establish false position changes entering control, corroborated by the owner's steady-hands report. An elbow-angle controller was not substituted: those angle estimates also jump when a wrist is misplaced.

## Correction

Only biceps control opts into scriptCurlTracking.ts. A median of three fresh observations per wrist suppresses short reversals, followed by a time-based low-pass filter. Its time constant varies from 160 ms toward 35 ms as corroborating movement in both hands increases; a 100 ms speed average avoids dropping responsiveness immediately after a quick transition. A single jumping wrist cannot request the fast response by itself. There is no movement dead zone, prediction, pose lock, new tracking-loss hold or pause of the game loop. Both-arm partial movements, small adjustments, sustained holds and quick reversals remain inputs.

Calibration evaluates stability using the same filtered controller as flight. Its .028 drift limit, 1300 ms hold, minimum range, elbow rules and both-arm visibility requirements are unchanged. It counts fresh camera observations rather than repeated display frames; empty detections clear a calibration hold. Calibration reference landmarks are averaged from the same accepted camera window, rather than taking the final potentially noisy frame.

Raw landmarks still drive the existing 30-percentage-point bilateral check, 55-degree elbow check and elbow-position rule. Neither their tolerances nor fatal/grace durations were relaxed. The accepted squat implementation and other exercise controllers are unchanged. No instruction copy, design, recording, dependencies, iOS branch, main, release tag, build or OTA changed.

## Replay results and limitations

All three captures were replayed through the real calibration, tracking and game loop, with render frames between original camera timestamps. Pipes were placed outside collision range for comparing control; this does not infer that the owner should have survived the original level. Traces were throttled to 40 ms and rounded to four decimals, so replay calibration timing/endpoints differ slightly from the phone's original run.

The previous implementation never advanced C beyond Step 1. With the correction, it advances at camera timestamp 6897.8 ms, about 4.53 seconds after that trace begins. This is evidence about Step 1 only: the owner abandoned that attempt, so there is no completed hammer calibration/gameplay recording to validate.

Selected comparison windows use the same captured timestamps, not a claim that the owner deliberately held still for a prescribed interval. Bird spread is peak-to-peak normalized flight range; accumulated travel includes intentional movement as well as jitter.

| Attempt/window, camera ms | Previous bird spread | Updated bird spread | Reduction in accumulated travel |
| --- | ---: | ---: | ---: |
| A, 24000–29000 | 3.62% | 3.72% | 29% |
| A, 30000–33000 | 3.34% | 2.91% | 37% |
| A, 46000–49000 | 2.72% | 2.16% | 36% |
| A, 54000–55000 | 2.45% | 1.93% | 50% |
| B, 17000–19000 | 5.77% | 4.96% | 54% |
| B, 20450–21300 | 11.26% | 5.98% | 57% |

The results are not zero jitter, and smoothing trades some responsiveness for stability. One A window has slightly greater total spread despite less back-and-forth travel. Do not present replay as physical acceptance. Synthetic checks require a rapid two-hand partial change to reach 90% of controller displacement within 200 ms at 20 Hz, and verify that tiny sustained adjustments are not suppressed.

## Validation and next phone test

The focused runner passes 212 checks: nine new curl-control regressions plus the existing 203 diagnostic/tracking cases. They cover noisy calibration, fresh-camera sampling, leaving the camera, either missing wrist, tiny partial changes, quick reversals, continuous pipe movement, and unilateral/alternating rejection. No new test requires full repetitions during gameplay. TypeScript and lint passed. The running Android Expo server returned HTTP 200 for its 19,831,488-character bundle containing both 2026-10-16.1-curl-control and curl-filter-1. Whitespace checks passed; scriptSquatTracking.ts and scriptGame.ts have no diff. The earlier full Jest attempt had unrelated existing screen-render failures, documented in android-curl-diagnostics-2026-10-16.md; this is not a claim that the broad suite is green.

Reload Expo Go and start a fresh Bicep Curls run so calibration uses the new controller. Play normally using partial curls, holds at the heights the pipes need and quick transitions; there is no steady-full-repetition or Sky-background requirement. Compare no weights and normal dumbbells, then hammer grip when practical. Check whether hammer Step 1 now completes and whether control feels smooth without sluggishness. Current development traces include controller: curl-filter-1, which lets the agent verify the loaded version. Owner acceptance remains pending.
