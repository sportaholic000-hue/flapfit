# Android curl lower-half experiment and results colors

**REJECTED by owner testing:** no-weight flight was terrible. The lower-only filter was fully removed in rules 2026-10-17.7-curl-lower-filter-reverted. Tracking is identical to a63d86b / 270ce1b except the rules identifier. No replacement filter was added. The following documents the rejected experiment, not the current behavior.

The orange goal/progress panel and navy text were also restored. The outer results card remains navy; Share Video stays white/navy. Done was still its original very pale #F1F5F9, but now uses #D1D5DB on Android to visibly distinguish it from white Share Video. iOS colors are unchanged.

Branch: codex/android-design-integration. Rules: 2026-10-17.6-curl-lower-only.

Owner direction: use the 270ce1b version from the test where middle-to-top was best and lower-half movement remained jittery. Do not tune the whole movement again.

The median image-hand measurement, calibration, both-arm validation, 0.55 input smoother and elapsed-time render response remain unchanged from that baseline. A separate output-only filter applies below the calibrated midpoint. It blends at most 20% of the previous baseline output into small steps, fades out toward the midpoint, bypasses steps of 6% of calibrated range or greater and caps the adjustment at 1% of calibrated range. It never feeds back into the baseline smoother. Either hand, the baseline output or the previous baseline reaching midpoint disables the extra filter. This is a modest noise/response tradeoff, not a proven physical fix or an occlusion detector.

The extra filter only runs under the existing Android development curl flag. Both-arm failure rules, missing tracking, partial movements, continuous pipes/collisions, recording and squat tracking are unchanged. No shoulder or head coordinate was introduced into flight. Diagnostics retain the baseline smooth field and add output plus bounded-lower-only-1 identification.

Android results card: navy surface and goal inset, white non-button headings and supporting labels, existing orange values retained. Share gameplay video becomes white with navy text, icon and spinner. Other result actions retain their colors/behavior. iOS palette branches retain their prior values.

Validation: 264 focused tracking checks pass, including lower small-step attenuation, quick changes, no dead zone, exact upper-half target equality after lower excursions, bilateral failures and other-exercise regressions. TypeScript and lint pass. The live Android Expo bundle returned HTTP 200 with the new rules, lower-filter marker and result palette. Local numeric traces and failed candidate analyses remain outside Git. Device weighted-curl acceptance is still pending. No build or OTA.
