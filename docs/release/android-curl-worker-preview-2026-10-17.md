# Android curl render-thread investigation — 2026-10-17

Owner rejected the lower-half filter and reported that current curls remained worse. Do not treat the rollback as a complete fix.

## Baseline and evidence

The exact owner reference is the four-run test after 270ce1b: no weights, normal weighted curls, hammer curls, then another normal curl run. The owner described middle-to-top as strongest/least jittery, with remaining lower-range jitter. Full repository comparison after 2196422 found only result styling, documentation and the rules label different from 270ce1b; no hidden controller change remained.

Latest three saved sessions showed zero hand-point membership changes at the 0.24 visibility threshold. Dropout-based explanations are not supported for those samples. An offline elbow-relative lower measurement made some saved traces worse and was rejected without being enabled.

Recorded GPU inference medians ranged about 34–59 ms. Many gameplay render intervals were 50–67 ms (and longer in earlier runs). Existing detectForVideo executes synchronously on the same main thread as game drawing. Google documents this behavior and recommends workers for camera processing: https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js . This establishes a render-blocking problem, not proof that every hand-target jump is a rendering problem.

## Preview change

Rules 2026-10-17.8-curl-worker-preview. Only Android development curls with remote tracker assets use a dedicated classic worker, dynamic-importing the same MediaPipe 0.10.14 runtime and Lite model with the same GPU delegate, VIDEO mode and single-pose settings. No dependency, model, camera-resolution or control-coefficient changes.

The worker receives one ImageBitmap at a time and returns numeric landmarks. Frames are processed locally; images are not sent to a service or stored. Pending frames are never queued. Capture timestamps, rather than completion times, feed freshness and calibration. Closing terminates the worker, revokes its URL and discards late results. Startup errors or unsupported APIs fall back to the existing tracker before calibration. Runtime loss uses the existing tracking-loss behavior; bird, pipes and collisions are never frozen.

The original curl hand measurement, calibration, bilateral checks, 0.55 smoother and elapsed render response remain identical to 270ce1b. There is no lower-half filter. Main-thread/other-exercise pose handling retains its existing timestamp calls. iOS and production do not enable the worker flag. Recording behavior and accepted squat tracking are unchanged.

Diagnostics add trackingThread (worker/main-fallback/main) and frameAgeMs. Device testing must confirm worker activation, improved render cadence, and acceptable no-weight/weighted/hammer control. This is an evidence-based performance experiment, not a claim that weighted tracking is solved. No cloud build or OTA.

## Verification

260 existing tracking regressions and 12 new asynchronous worker/gating/fallback tests pass. The unchanged 0.10.14 GPU worker also completed real headless-browser inference with 200 canvas frames rendered during that operation and capture timestamps preserved. This desktop used software GPU rendering, so its slow inference timings are not phone-performance predictions. The initial remote-download integration attempt timed out at startup; repeating with the exact existing local runtime/model assets passed. Device logs must show worker (rather than main-fallback) before evaluating the performance change.

TypeScript, lint and diff checks pass. The Android Expo bundle returned HTTP 200 with the worker preview marker and the rejected lower filter absent. A new camera frame starts immediately after a result when available, avoiding an extra render-frame wait between detections.
