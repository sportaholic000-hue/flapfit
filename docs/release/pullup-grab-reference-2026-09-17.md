# Pull-up Form Test .4 — candidate changes and remaining blocker

Version: `2026-09-17.4-grab-reference`. This remains the developer-only Form Test tracker. It is not physical acceptance, a production-tracker promotion, or evidence that pull-ups are solved.

The floor reference now uses the overhead posture: grab the bar with both feet flat and visible, or reach both hands up before jumping to a high bar. There is no arms-at-sides setup step. After setup, lift the feet or jump, settle into a hang, then complete step 1 at the top and step 2 at the bottom. The Info instructions match that sequence.

Calibration and gameplay now share one support acceptance check. In floor-reference mode, visible contact is invalid immediately in both phases. Both heel and toe must show clearance for each foot to be classified AIR. Missing landmarks and the uncertainty band remain UNKNOWN and invalid; they cannot establish takeoff or silently clear confirmed contact. The existing explicitly unverified upper-body-only route is retained and does not claim to check floor contact.

Fresh observed contact intervals provide one 350 ms confirmation. Confirmed gameplay contact is marked `contactConfirmed` so the game starts its normal fall without another 350 ms fatal timer. That run violation remains latched. UNKNOWN uses the existing 1.6-second invalid-tracking grace; persistent uncertainty also leads to the normal fall and collision. Pipes never freeze, no recovery countdown is added, and recording continues through the fall until the normal collision boundary. Level-completion recording behavior is unchanged.

Saving the bottom position preserves the current support classification and accumulated evidence through countdown. The phase reset clears only the run latch. Actual retries and next levels remount the WebView; camera initialization performs the full reference reset, clearing prior-run contact and floor state. Hang acquisition is gated by the same support check, with positive floor-contact evidence distinguished from unconfirmed UNKNOWN observations.

## Recorded failure remains unresolved

Offline replay tried 39 overhead-reference windows and still produced **zero contact confirmations across the 769 recorded gameplay frames**. Moving the setup to an overhead posture has not demonstrated a fix for the reported physical planted-feet run. Passing synthetic tests proves the specified state transitions, not that the landmark estimates correctly identify planted versus suspended feet in that recording.

The user's label for the accepted bottom-calibration position is still pending. The existing approximately 18-second gameplay clip is needed to identify when the feet were actually planted and when they were airborne, then align those events with the numeric trace. Do not classify an unlabeled frame as physical ground contact solely from the model's output, widen thresholds to force this recording to fail, or declare the launch blocker cleared without that evidence and physical acceptance.

Final validation: **304 tests across 28 suites passed; mobile typecheck and strict lint passed. The live iOS Expo bundle returned HTTP 200 with the .4 version, grab-bar setup, and shared support check. All nine installed files match the reviewed candidate hashes, and existing Git staging is unchanged. The physical planted-toe failure remains unresolved.**. Installed locally after these checks. No push, production build, or store submission was performed.

## Scoped files

Runtime and instructions:

- `apps/mobile/src/utils/game/html/scriptPullupSupport.ts`
- `apps/mobile/src/utils/game/html/scriptFormTracking.ts`
- `apps/mobile/src/utils/game/html/scriptGame.ts`
- `apps/mobile/src/app/(tabs)/info.tsx`

Tests and harness:

- `apps/mobile/src/utils/game/__tests__/form-tracking.test.ts`
- `apps/mobile/src/utils/game/__tests__/pullup-support-reference.test.ts`
- `apps/mobile/src/utils/game/__tests__/pullup-top-reference.test.ts`
- `apps/mobile/src/utils/game/__tests__/pullup-gameplay-flow.test.js`
- `apps/mobile/src/utils/game/testUtils/pullupGameplayHarness.js`

No store submission or publication is authorized by these changes. Existing recording, sharing, advertising, daily-challenge, leaderboard, and other exercise behavior is outside this change's runtime scope.
