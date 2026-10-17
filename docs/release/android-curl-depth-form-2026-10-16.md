# Android curl front-camera form rejection — 2026-10-16

Status: targeted false-death correction; physical acceptance pending. Curl flight jitter, especially weighted/hammer curls, remains unresolved and is NOT release-ready.

Branch: codex/android-design-integration. Rules version: 2026-10-16.4-curl-depth-form. No build or OTA. No iOS branch, main, release tag, squat logic, recording, model/dependency, or other exercise rule changes.

## Owner report and captured evidence

The owner reported an unintended death without weights, without hitting a pipe, and poor control above a 90-degree arm bend. This run must not be labeled an intentional crash. Standing test order is no weights first, then weights; extra calibration-only attempts remain unlabeled.

Session 1792201496735-3795.399999999441 ran Lite with each-arm-1 calibration: 652 recorded observations, 515 in play. Terminal reason was form (no fatal bilateral key). Of play observations, 45 failed the projected elbow consistency check. From roughly 46,234 to 47,768 ms it remained invalid across the 1,600 ms interruption grace. The first sampled crashReason=form appeared at 47,842 ms; the forced fall then ended the run.

Before the forced fall, wrist confidence never dropped below 0.9461 left / 0.9216 right. Maximum bilateral progress difference was 0.1472, below the existing 0.30 threshold. This was not a missing-wrist or unilateral failure. Near the death, projected elbow angles were about 143/170 degrees while the existing model's 3D estimates were around 136/138. These are model estimates, not measurements of the owner's actual joint angles.

## Demonstrated geometry problem

The old game check compared the front-camera 2D elbow angle to the interpolated calibration angles. A forearm pointing into camera depth can project to almost no length or look aligned with the upper arm. Even ideal, noiseless front-facing curls then report nearly 0/180 degrees instead of a smoothly changing bend. Added a regression that reproduces the false rejection with ideal 3D anatomy projected into the image, and tests above, exactly at, and below 90 degrees.

## Correction

- Keep wrist-Y control, its original 0.55 response, bird easing, partial movements, holds, and reversals unchanged.
- Store the detector's existing 3D elbow angles in curl calibration references, independently of development diagnostics. No extra inference or model download.
- When both calibration references have valid 3D angles, verify bend in that same 3D coordinate system. A degenerate 2D projection no longer incorrectly counts as a missing arm.
- Preserve the 55-degree cap and the old check's fractional strictness across calibration ranges: tolerance is min(55, 55 * worldAngleSpan / projectedAngleSpan). A smaller 3D span must not make straight-arm lifting easier.
- Keep 0.30 bilateral progress, wrist visibility, elbow-anchor, calibration acceptance, and existing confirmation/grace durations. No freezing or paused world/collisions.
- Missing 3D evidence during a run calibrated with 3D is invalid; it does not silently switch to 2D or carry a previous angle. Legacy calibration references without 3D retain the existing projected check.
- Numeric local diagnostics now identify world-when-calibrated-1, include 3D angles and exact saved calibration references. This makes subsequent replay less sensitive to reconstructing calibration from throttled observations. Traces remain Android development only.

## Validation and limits

231 focused tracking tests passed, including front-facing partial holds at 65/80/85/90/100/115 degrees, quick transitions, unilateral/alternating failures, missing depth, straight-arm lifting, compressed 3D calibration range, and diagnostics on/off equivalence. Existing squat and other exercise regressions passed. Typecheck, changed-file lint, generated-script parse, and patch checks passed.

Replay of the new capture through the revised real calibration/game-loop code had zero bend-check failures. The old-code replay had 18 failures, but did NOT reproduce the exact terminal death: throttled/rounded pose samples produced slightly different calibration references (top 0.42476 vs captured 0.4266). The actual terminal log establishes the death. Do not claim exact replay reproduction or physical acceptance from this comparison. Pipes were placed away from the bird for controller comparison.

Replayed controller norm and bird position were identical between the old and revised code where neither replay crashed. This explicitly does not establish a jitter fix. Neighboring hand-point averaging also did not demonstrate a decisive improvement in this no-weight capture. Do not replace the controller, claim hand movement, or tune another filter from this alone.

Raw owner traces and replay outputs remain local under the task work directory, outside Git. Preserve them. The Full-model trial and adaptive gameplay smoothing remain rejected and removed.
