# Straight-leg pull-up calibration candidate — September 17, 2026

Current Expo Form Test version: **2026-09-17.1**. Physical acceptance is still pending.

The owner reported being suspended with both feet off the floor and the head at the bar, yet receiving the planted-feet calibration warning. Bending the knees helped. The temporary LaunchTest online profile used for leaderboard verification had no connection to calibration and did not remove or alter Form Test.

Reproduced defect: after initial grounded setup, the calibration support latch required a fixed 0.08 lift in image coordinates to clear. A legitimate straight-leg takeoff with smaller image displacement stayed blocked indefinitely; additional knee lift cleared it. Synthetic landmark sequences reproduced rejection at camera scales 0.65, 1 and 1.1 with knee angles approximately 180 degrees.

Correction: scale release clearance to the observed torso (8%, bounded to 0.012–0.03 image units), retain the existing 700 ms confirmation and require that no visible foot/heel/toe currently meets the planted-contact rule. This changes calibration latch release only. Straight knees are accepted. The existing checks against stationary toes, calf raises, head-only movement and planted-foot gameplay remain. The new diagnostic records the chosen contact and required clearance for subsequent physical debugging.

Verification:

- Old source rejected all three straight-leg fixtures; corrected source accepts them.
- Nine new regression cases cover straight-leg takeoff, stationary toes with rising heels, and small landmark jitter across the three camera scales.
- Focused regression run: **5 suites / 89 tests passed**, including form tracking, continuous gameplay, level rules, recording boundaries and MP4 handling.
- TypeScript and strict oxlint passed after the correction. Diff whitespace check passed.
- Earlier friend-code removal checks (24 suites / 174 tests and iOS/Android exports) completed before this tracker change; those artifacts do not certify the new tracker revision.
- Production tracker selection remains original. No store submission or tracker promotion was performed. Physical testing must confirm both top and bottom calibration with straight legs, a complete legitimate run, and rejection of clearly planted feet/calf raises. Pipes must keep moving during gameplay; invalid support must release the bird into normal gameplay rather than pause it.

Source backup and before/after reproduction evidence are in the current Codex task's work folder: before-straight-leg-calibration-2026-09-17 and straight-leg-reproduction.json. Shared recording, ad and Daily Challenge code were not changed by this correction.
