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

## Owner test when ready — corrected to actual gameplay

The owner clarified that gameplay consists of partial movements, holds and quick changes of direction, and rarely needs a full curl. The earlier steady-curl/full-endpoint test protocol was inappropriate and is superseded here.

Reload Android Expo Go, choose Bicep Curls, use the owner's usual background and phone position, and calibrate normally. Diagnostics work with both Live Camera and Sky; there is no requirement to switch to Sky. Play the actual level normally, following the pipes with simultaneous partial curls, holds at whatever height the game needs, and quick transitions. Do not force full repetitions, a steady tempo, timed endpoint holds or a specified run length.

For useful comparisons, use separate freshly calibrated runs with no weights, normal-grip dumbbells, and hammer-grip dumbbells when practical. Keep other conditions similar to help comparison. A farther-distance or different-background run is optional follow-up if the evidence calls for it, not a prerequisite to investigating the normal setup. Tell the agent which grip/weights were used in each run and which felt jittery or ended unexpectedly. Early failure is useful evidence; no need to retry until successful. The agent collects local Metro logs; the owner does not need to copy files.

## Analysis and fix boundaries

Replay captured observations through the real tracking, calibration and game loop. For each wrist/run report confidence minimum and fifth percentile, Y jump magnitudes, in-frame losses, calibrated range, still-hold bird spread, left/right order changes and check-failure frequency. Distinguish normal collision, gradual model jitter, missing landmarks and a confirmed form-related fall.

Do not automatically implement every proposed fix. Crossing wrists is not proof of a left/right label swap. The owner explicitly rejects freezing the bird as a tracking-loss or jitter fix. Do not add freeze/pause behavior or stop pipes/collision processing to mask tracking problems. Choose filtering or outlier handling only from measured evidence and compare before/after against real gameplay, including partial-range movement, holds and rapid transitions. A rapid legitimate movement must not be treated as noise merely because it is faster than steady full repetitions. Do not loosen two-arm synchrony, elbow checks or calibration range without owner approval. Alternating/unilateral curls must continue failing. Preserve the accepted squat baseline a1701e3 and its acceptance record 5e97a4f.

Diagnosis of the physical weighted-curl problem is pending these captures; diagnostics alone are not a jitter fix.

## Verification

The focused tracking runner passed all 203 cases (including 11 new diagnostic cases). Tests compare actual calibration, bird positions and end timing with diagnostics enabled/disabled; unilateral input still ends the run. Empty camera observations do not alter existing tracking. Other exercises never emit curl traces. TypeScript checking, lint and whitespace checks passed. The full Jest run was attempted but was not green: src/services/privacy/__tests__/startupGameEntry.test.tsx and src/components/__tests__/GameStartOptions.test.tsx failed while rendering existing screens (undefined component errors). Those screen/test files were not modified. The new curl diagnostics suite and the squat suite also passed under Jest. The broader run was stopped after these failures rather than expanding this task into unrelated screen-test repairs; no claim that the entire suite passed.

## Follow-up after the owner captures

The captures were analyzed and a curl-only control correction is documented in [android-curl-control-2026-10-16.md](android-curl-control-2026-10-16.md). Physical acceptance of that correction remains pending. The owner clarified that the hands were not wandering; fluctuating landmark estimates must not be described as actual hand movement.
