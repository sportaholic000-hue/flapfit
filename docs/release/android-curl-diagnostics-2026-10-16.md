# Android weighted-curl investigation: diagnostics first

Branch: codex/android-design-integration. Trace version: curl-trace-1.

## Owner report and current findings

The owner reports severe curl-flight jitter with dumbbells, especially hammer curls; earlier testing mostly used small weights or no weights. The provided Claude recommendation is a diagnostic plan, not evidence identifying a cause. Existing Metro logs have squat traces, but no curl landmarks from the reported weighted runs. Dark weights, grip and background may affect the pose estimate, but none has been confirmed as the cause.

The current curl controller averages the two wrist Y coordinates, applies 0.55 smoothing per camera observation, then eases the bird at dt * 16. It requires both arms, allows 30 percentage points difference between their separately calibrated progress, and checks elbow angle against calibrated progress with 55 degrees tolerance. Missing either arm or failed synchrony has a 350 ms fatal confirmation; other tracking/form interruptions have the existing 1600 ms grace. These rules are unchanged, as are calibration thresholds and FORM_TRACKING_RULES_VERSION.

## Diagnostics implemented

- Android development preview only: curlDiagnostics is __DEV__ AND Platform.OS === android. No opt-in on iOS or production builds.
- Curl-only numeric observations at most once per 40 ms, bounded to 60 rows, sent through the existing local WebView bridge every 2 seconds. No images, audio, new service or external upload.
- Each row includes fresh-camera timing, state, shoulders/elbows/wrists/hips with confidence and in-frame flags; both elbow angles; wrist progress and difference; observed raw controller, retained controller, smoothed controller, bird position and calibration endpoints; current rule result and crash reason.
- Empty detector observations are recorded separately without altering existing curl tracking state. The distinction between missing current evidence and a retained controller value is explicit.
- End-of-run flush includes the fatal check key. Android development results show that key below the existing run-ended explanation when applicable. Plain pipe collisions do not receive a misleading fatal reason.
- No change to the accepted squat implementation or another exercise's tracking rules. No iOS branch, main, release tag, build, OTA, recording or dependency change.

## Owner test when ready

Use Android Expo Go, the phone on a chair, and the normal camera distance (roughly 3-6 feet, keeping torso and both full arm movements in view). Use Sky background consistently for comparison. Reload the preview first, select Bicep Curls, and start a NEW run with fresh normal two-arm calibration for each condition:

A. No weights, palms-up curls.
B. Light dumbbells, palms-up curls.
C. The same dumbbells, hammer grip.
D. Repeat B one step farther from the phone, with both arms still visible.

For each, aim for up to 30 seconds of steady simultaneous curls, then about 5 seconds holding arms down and 5 seconds holding the curled position, if the game allows. A pipe collision or early tracking failure is useful evidence; no need to force a 40-second run or repeat until it succeeds. Tell the agent the A/B/C/D order, any skipped runs and which run felt jittery or ended unexpectedly. The agent collects local Metro logs; the owner does not need to copy JSON or files. Do not change lighting/background between A-C; a separate brighter-background comparison can follow if useful.

## Analysis and fix boundaries

Replay captured observations through the real tracking, calibration and game loop. For each wrist/run report confidence minimum and fifth percentile, Y jump magnitudes, in-frame losses, calibrated range, still-hold bird spread, left/right order changes and check-failure frequency. Distinguish normal collision, gradual model jitter, missing landmarks and a confirmed form-related fall.

Do not automatically implement every proposed fix. Crossing wrists is not proof of a left/right label swap. Freezing flight on missing evidence changes gameplay and must be evaluated against the existing continuous-game behavior. Choose filtering or outlier handling only from measured evidence and compare before/after against normal motion. Do not loosen two-arm synchrony, elbow checks or calibration range without owner approval. Alternating/unilateral curls must continue failing. Preserve the accepted squat baseline a1701e3 and its acceptance record 5e97a4f.

Diagnosis of the physical weighted-curl problem is pending these captures; diagnostics alone are not a jitter fix.

## Verification

The focused tracking runner passed all 203 cases (including 11 new diagnostic cases). Tests compare actual calibration, bird positions and end timing with diagnostics enabled/disabled; unilateral input still ends the run. Empty camera observations do not alter existing tracking. Other exercises never emit curl traces. TypeScript checking, lint and whitespace checks passed. Full Jest suite status is recorded separately when complete.
