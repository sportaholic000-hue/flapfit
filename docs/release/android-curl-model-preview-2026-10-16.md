# Curl follow-up: remove added flight lag and compare the Full pose model

Branch: codex/android-design-integration. Rules marker: 2026-10-16.2-curl-model-preview.
Status: REJECTED by the owner after testing: no weighted-curl improvement. The Full-model experiment was removed. See android-curl-bilateral-calibration-2026-10-16.md for the separate confirmed calibration bug and remaining investigation. Do not port either rejected experiment as an accepted fix.

## Owner test and evidence

The owner confirmed three runs on curl-filter-1: first without weights, then two with ordinary dumbbells. No hammer run was attempted. The first felt delayed; weighted play was still jittery. The first filter experiment therefore failed physical acceptance despite reducing selected replay metrics.

| Session suffix | Setup | Play rows | Wrist confidence minima L / R | Largest adjacent Y jump L / R | Median / 95th-percentile camera interval |
| --- | --- | ---: | --- | --- | --- |
| 3695.5 | no weight | 185 | .9564 / .8925 | .0164 / .0297 | 50.4 / 57.5 ms |
| 2410.1999999955297 | weighted | 709 | .8911 / .7683 | .0424 / .0481 | 50.5 / 57.7 ms |
| 4262.89999999851 | weighted | 79 | .7426 / .4789 | .0096 / .1028 | 68.1 / 83.1 ms |

In the last weighted run the right wrist estimate remained above the visibility threshold yet made very large jumps. The left wrist was substantially steadier. Its six bilateral-check failures and one elbow mismatch did not produce a form crash; all three terminal messages had empty reasons. The owner previously clarified that collisions were deliberate. Neither terminal collisions nor fluctuating landmark positions should be described as evidence of incorrect physical movement.

The observed camera interval includes more than model inference and is not sufficient to diagnose rendering stalls. Previously, those timings were not separated. Stronger temporal smoothing is not justified: the owner already rejected its delay, and sustained localization errors are not removed by a short median window.

Raw batches are preserved locally in work/curl-phone-traces-after-filter-20261016.json. That file includes the earlier captures as well; controller metadata distinguishes them. Raw personal observations remain outside Git.

## Changes

- Gameplay and countdown use the original 0.55-per-observation smoothing again. A regression compares actual game-loop outputs against that exact recurrence for several partial movements and direction changes.
- Keep the filter only for the calibration hold, with the existing pose requirements, fresh-camera sampling and averaged references. No requirement to use full curls during gameplay.
- Add curlFullModelPreview, enabled only by the Android development screen using the existing remote Expo tracker. The model selector additionally requires biceps plus remote mode plus explicit opt-in. Other exercises, iOS and bundled builds still use Lite. No production asset or dependency is replaced.
- For that preview, use Google's official Full model URL through the same runtime and Google model host already used by the Expo preview. The MediaPipe runtime stays at 0.10.14. No new service, paid API, build or OTA.
- Add numeric inference duration, actual GPU/CPU delegate, model identity, and bounded render count/total/max/over-50-ms statistics to the existing development-only local curl traces. This can reveal whether model processing slows the preview. No camera frames, images, audio or new upload are recorded.
- Keep both-arm synchrony, elbow checks, calibration range, form/tracking grace, collisions and pipe movement unchanged. No freeze, prediction or one-arm fallback.

Official model options: https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker#models
Official Web behavior and synchronous detection caveat: https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js

Full is an alternative supplied by the same tracker, not a proven cure for this owner's weights/hand occlusion. A heavier model may be slower; the new timing observations are necessary to judge that tradeoff. Old Lite landmark traces cannot simulate what Full would have detected from the original camera frames.

The public Full model request returned HTTP 200, 9,398,198 bytes, SHA-256 4eaa5eb7a98365221087693fcc286334cf0858e2eb6e15b506aa4a7ecdcec4ad. This verifies the download, not initialization or accuracy on the owner's Android device. The remote loader retains its existing GPU-to-CPU fallback; the actual delegate is now reported. A model-load failure does not silently switch the experiment back to Lite.

## Verification / owner test

215 focused tracking checks pass, including original flight response, Full selector isolation, timing diagnostics, both-arm rejection and the accepted squat regressions. TypeScript, lint, whitespace checks and parsing the combined WebView JavaScript passed. The Android server returned HTTP 200 for its 19,833,673-character bundle containing the new version, Full URL and restored-flight marker. The first manifest request timed out; a retry succeeded without restarting the server. The previously documented unrelated full-Jest screen-render failures are not represented as fixed.

Reload Expo Go and start a NEW curl run. A short ordinary weighted run with the owner's usual partial movements, holds and quick transitions is enough to compare; no requirement to try hammer grip before ordinary weighted control is usable. The existing QR/server remains valid. Logs must report model full, controller curl-cal-filter-flight-original and an actual delegate after loading. Until the owner tests, do not claim the model is faster, more accurate on these runs, or that weighted curls are fixed.
