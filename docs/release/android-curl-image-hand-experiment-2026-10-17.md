# Android curl image-hand experiment — 2026-10-17

Owner approved testing combined hand points after three forearm-controller attempts (no weights, weighted curls, hammer curls). The prior experiment remained jumpy near the middle. This supersedes the Android development-preview controller in 91d33f8; it is not physically accepted or enabled in production.

## Scope and behavior

- Existing curlForearmControl flag remains Android AND __DEV__ only. Disable the flag to return to the legacy controller. No iOS, squat, model, dependency, recording, release, OTA, or build changes.
- Each hand uses the coordinate-wise median of available wrist, pinky, index and thumb image points, requiring at least two in-frame points with visibility >= 0.24. Both elbows and both hands remain required. A single isolated endpoint outlier cannot dominate a fully observed hand; correlated errors across multiple hand points can still affect it.
- No world/depth, shoulder, hip or face coordinates enter flight. Eyes are used only to qualify TOP calibration. Hand height in the image controls flight, normalized separately to each hand's demonstrated top/bottom range and then equally averaged.
- Existing per-frame gameplay smoothing (0.55), bird easing, fresh-camera calibration hold/progress/fades and bilateral grace/failure timing remain. No added delay filter, full-repetition requirement, tracking-loss freeze or single-arm fallback.
- TOP: both hands above their own elbows by >= 20% of eye-to-elbow height; eye-to-elbow height >= 0.06 image heights; hands no more than 0.03 above eye line. BOTTOM: each hand >= 0.08 below its elbow and >= 0.12 travel from its accepted top. Each elbow must stay within 0.13 of its top reference while calibrating bottom. These image-space checks replace the experiment's 3D direction thresholds.
- Gameplay keeps the 0.30 per-arm normalized progress discrepancy limit and independent elbow anchors (0.13). Missing hands cannot be replaced by an invented center or the other arm.
- Existing leftWrist/rightWrist metric slots hold the combined hand centers for this experiment only; legacy exercises still use actual wrists. This preserves calibration aggregation/filter interfaces.
- Telemetry identifies controller hand-image-1, calibration eye-top-hand-bottom-1, geometry shoulder-free-image-hand-1. New handPosition field contains combined centers. Rules version 2026-10-17.2-curl-image-hand-experiment. Numeric diagnostic logs remain local, outside Git.

## Verification

256 focused tests pass, including original other-exercise regressions and 25 experimental curl checks. New checks cover isolated wrist/finger outliers, finger-only control when wrists are unavailable, rejecting a sole remaining hand point, and independence from arbitrary/missing world coordinates. Existing tests cover both-arm enforcement, no-shoulder calibration, head independence, partial holds, quick changes and small adjustments.

Saved owner observations were replayed through the actual calibration/gameplay harness. All three reached play. Maximum per-sample normalized controller change (previous recorded -> candidate replay):

| Owner attempt | Previous | Candidate |
| --- | ---: | ---: |
| No weights | 0.0723 | 0.0534 |
| Weighted curls | 0.0698 | 0.0465 |
| Hammer curls | 0.0829 | 0.0447 |

These are signal-change measurements, not proven jitter reductions: intended movement also changes the signal. Replays use sampled numeric observations and a distant test pipe; they do not recreate camera inference, actual obstacle placement, or real-device latency. Physical acceptance, especially middle-range weighted and hammer curls, remains pending. No recording changes or requests for steady full repetitions.
