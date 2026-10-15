# Android squat shoulder control — phone verification pending

Branch: codex/android-design-integration. Rules/preview marker: 2026-10-15.3-shoulder-squats.

## Evidence and change

The owner's close and far phone runs produced 800 and 678 gameplay samples. All sampled gameplay form checks passed. Camera intervals were similar (median about 50 ms). The close run showed repeated hip direction reversals while shoulders were relatively steady or moving continuously. Hip visibility remained above 0.994, so a higher visibility threshold would not address these estimates. The traces do not prove hand occlusion: the earlier diagnostic version did not sample wrists. Keep raw phone traces local.

Squat flight now uses the average vertical position of both shoulders for calibration and gameplay. It never switches to the hip midpoint or to one shoulder. The existing smoothing, full-range mapping, physics and missing-tracking grace remain unchanged. Ankles and feet still do not participate.

Standing and bottom calibration continue to verify an upright torso and hip descent/upper-leg shortening, rejecting a waist-only bend and translation of an unchanged standing pose. Bottom calibration also requires sufficient shoulder travel. The same two steps, text, artwork, hold progress, fades and countdown remain.

During gameplay only shoulder and knee visibility are checked for squats. Hip visibility, hip height and thigh shortening no longer steer the bird or invalidate flight when hands cover the waist. This deliberately relaxes continuous form enforcement: calibration checks a squat, but gameplay no longer independently rejects a later waist bend using hip/thigh measurements. This is a tradeoff for reliable control under hip occlusion, not stronger exercise verification. Other exercises retain their validation.

Preview numeric diagnostics now also include elbows/wrists to investigate any remaining hand-related issue. The flag is still Android development only, with bounded batches and no image/audio capture or new external service. The rules marker identifies the new version.

## Verification

- 178 tracking/gameplay regression cases pass, including the existing other-exercise suites.
- Actual calibration and bird-loop tests at three camera scales produce identical flight with hips absent for five seconds, hips oscillating between extreme positions, hands across the body, and feet cropped. Full flight range remains available.
- Missing shoulders still hold the previous input rather than switch sides. Calibration still rejects missing/malformed hips and insufficient shoulder movement. Lower-leg landmarks remain unread.
- Both complete numeric phone traces were replayed through real calibration and game-loop scripts, with render steps between pose updates. Both completed calibration and remained in play without a form crash using shoulder control. This replay excludes real collisions and does not certify physical responsiveness or camera accuracy.

## Required owner test

Reload the Android preview and start a NEW squat run so both endpoints are calibrated with shoulder height. Phone on chair, shoulders and knees visible, feet cropped; use the normal hands-in-front pose shown by the silhouette. Compare hands in front versus at sides, mid-squat holds and repeated squats. Then compare farther framing. Physical approval is still pending; do not call this fixed or release-ready from automated results alone.

No iOS checkout/branch, main, release tag, dependency, recording pipeline, build or OTA was changed. Do not port this to the submitted Apple release. Any later iOS port needs separate authorization and iPhone/iPad verification.

## Owner retest: smooth flight, insufficient exercise validation

The owner confirmed the shoulder controller removed jitter, but could fly without bending the knees. The shoulder-only gameplay validation is rejected. See android-squat-leg-evidence-2026-10-15.md for its replacement; do not ship db21dcf as a completed squat fix.
