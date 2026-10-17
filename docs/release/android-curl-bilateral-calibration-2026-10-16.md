# Curl calibration: require each arm, retire the failed model trial

Branch: codex/android-design-integration. Version: 2026-10-16.3-curl-bilateral-calibration.
Status: a confirmed calibration bug is corrected; weighted flight jitter remains unresolved.

## Latest owner report

The Full-model preview still felt bad with weights. Removing the extra gameplay filter reduced the lag without weights. Step 1 also accepted one curled arm and one straight arm. The owner asked which of Claude's recommendations had actually been implemented.

The implementation followed the numeric diagnostics and replay portions, then trialed a three-observation median plus adaptive low-pass filter. It did NOT implement the exact proposed maximum-speed outlier rule: the landmark records do not establish the fastest true physical movement, and rejecting legitimate quick partial movements would be harmful. The owner rejected freezing the bird, so that recommendation was not used. No label-swapping heuristic or weakened both-arm/angle/range rule was added. Full-model selection was an additional agent experiment, not Claude's recommendation; it failed the owner test and is now removed.

## Confirmed calibration defect

Step 1 used averaged elbow angle <=135 degrees. Consequently a folded elbow could offset a straight elbow. This predates the smoothing/model trials. In the second of the five latest traces, the final top-hold window had median angles approximately 179.65 and 15.77 degrees; all 23 observations passed the old check. The game then advanced to Step 2.

The new calibration stores and validates both angles separately. Each must meet the existing <=135-degree top condition. At the bottom, each must independently extend by the existing minimum 20 degrees from its own calibrated top. Existing bilateral wrist travel, overall range, visibility, hold duration and stability requirements remain. Instructions explicitly say BOTH hands / BOTH elbows when either arm fails. This closes the averaging loophole without changing gameplay tolerances.

Replaying that exact second trace through the actual tracking/calibration/game-loop scripts now remains at Step 1 with progress zero throughout the rejected hold. Regression cases cover the straight arm on either side, switching which arm is curled, either missing wrist, and lowering a wrist without extending that elbow in Step 2.

The other captured sequences are not controlled repeats after this change: the owner moved in response to the previous implementation's prompts. If a replay now stays in Step 1 longer, subsequent recorded movements cannot be interpreted as a valid test of the new Step 2. Do not claim physical weighted-calibration acceptance from those divergent sequences.

## Latest model-trial measurements

Five curl sessions reported model full and delegate GPU, confirming the intended experiment actually ran. Their chronological session IDs were:

1. 1792199687551-2936.9000000003725
2. 1792199710068-2583.399999999907
3. 1792199729110-2711.7000000001863
4. 1792199759083-2656.2000000001863
5. 1792199790861-2463.5

The owner has been asked which involved weights and which was the deliberate one-arm test; do not invent that mapping. The second trace itself contains the unambiguous one-straight-arm acceptance. Sessions 1 and 3 ended with form / biceps-both-arms, session 2 stopped in calibration, and 4/5 had ordinary collision terminal messages. The earlier clarification about deliberately crashing earlier runs must not be generalized to these new attempts.

During gameplay, median inference was 50.6–51.2 ms; median camera intervals were 55.8–56.9 ms. Of 613 measured render intervals, 604 exceeded 50 ms. This confirms slow rendering during the Full trial, but does not establish that it caused all wrist jitter or prove what Lite's inference duration was (that measurement was added only for Full). The owner reports no weighted accuracy benefit. Full is therefore removed entirely from the selector and Android preview config; the existing Lite asset/runtime is restored. No production model assets or dependencies were changed.

## Remaining work

Gameplay retains its original 0.55 smoothing, with no median/adaptive gameplay filter, freeze, pause, prediction or one-arm fallback. Calibration retains its filtered stability input. Squat tracking is untouched.

Existing numeric diagnostics now also include the neighboring pinky, index and thumb estimates (17–22), plus the already-computed 3D shoulder/elbow/wrist estimates, preserving the existing tuple layout and bounded sampling. No additional detector runs are performed. This supplies evidence for whether a hand-position signal can be more stable than the wrist during weighted curls. No hand-point or 3D controller has been selected without those measurements, and those points currently do not influence control or rule checks. In the fifth Full-model attempt, the median projected elbow-to-wrist length was only about 18/22 pixels; 37 of 83 play observations failed the angle-consistency check. This makes projected arm geometry another concrete measurement to investigate, not proof of the physical cause. No images/audio/new upload are collected.

The next useful normal-weight capture must contain calibration each-arm-1 and model lite. It is diagnostic, not a claim that weighted flight is fixed. No requirement to repeat hammer curls, use Sky, perform full repetitions or maintain a steady tempo. Partial movements and quick transitions remain required gameplay.

## Verification

All 223 focused tracking regressions pass. TypeScript, lint, whitespace and combined WebView-script parsing passed. The Android server returned HTTP 200 for the 19,834,237-character bundle, containing the per-arm calibration version and extended numeric diagnostics, with the Full-model URL absent. New cases test each arm independently and ensure neighboring-hand telemetry is behavior-neutral. The broad Jest suite's earlier unrelated screen-mock failures remain documented in android-curl-diagnostics-2026-10-16.md.

No iOS/main/release changes, build, OTA, recording change, threshold relaxation or service cost. Raw traces and replay output are preserved locally outside Git under work/curl-phone-traces-full-model-20261016.json and work/curl-replay-per-arm-calibration.json. Commit source, tests and reports on the Android branch; never label weighted curls release-ready on the strength of these tests alone.
