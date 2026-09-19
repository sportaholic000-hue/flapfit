# Pull-up floor-reference candidate — September 17, 2026

> **Latest physical result: FAILED.** After testing Form Test `2026-09-17.3-floor-reference`, the owner could still plant toes and continue playing. New logs confirm that version, a retained floor reference, and visible high-confidence feet misclassified as airborne. Earlier automated passes and pending-acceptance notes below do not approve this candidate. See `docs/release/pullup-floor-reference-failure-2026-09-17.md` for the evidence. No replacement runtime patch has been applied.

**Installed development candidate: Form Test 2026-09-17.3-floor-reference. Physical acceptance is pending.** The previous .2 rules failed the owner's real-device tests. This candidate replaces those rules; it has not yet been accepted on a phone or iPad. Production still selects the original tracker, and the physical-approval marker remains unset. This is not launch approval.

## Why the earlier rules failed

- Top calibration compared a changing shoulder-to-wrist gap with a maximum single-frame reference. A downward wrist estimate could therefore count as an upward pull even when the shoulders barely moved. One distorted reference frame could affect the rest of calibration. Raising visibility thresholds did not solve this: some misleading wrist estimates had high reported visibility.
- The foot detector treated a stationary foot while the shoulders moved as proof of floor contact. A suspended person changing leg position can produce the same image motion. Conversely, a person who puts both feet down and then stands still may produce no motion evidence at all. The old rule could therefore reject suspended feet and accept planted feet.
- Saved support positions moved with the current wrist estimate. Wrist noise could move the supposed floor and interrupt contact timers. Calibration and gameplay did not have a directly demonstrated floor reference.
- Foot observation was tied to validation calls rather than every fresh camera pose. The three-second start countdown did not evaluate those checks, leaving a gap exactly when the player could put their feet down.
- Calibration stability could reuse one pose on multiple render frames. Saved joint references also came from a single final frame while the controller used an average. Fixed time windows with minimum sample counts could never complete on slower fresh camera streams.
- Pull-up angles used normalized x/y without accounting for the camera's aspect ratio. The correction is limited to pull-ups; it is not a speculative change to every exercise.

The failed .2 investigation and rejected offline candidate remain documented in [pullup-investigation-2026-09-17.md](pullup-investigation-2026-09-17.md). Earlier synthetic pass counts do not establish physical correctness.

## Current setup and calibration sequence

1. Before the two exercise positions, stand under the bar with feet flat on the floor and arms relaxed. Keep both feet visible and hold still while the app records the floor reference. Reaching the bar is not required for this observation.
2. After the reference is saved, grip the bar; jumping to a high bar is allowed. Settle into a comfortable hang. The existing preparation delay remains, and the starting body reference also requires fresh, sustained observations. A slight elbow bend is allowed. Narrow neutral grips do not require an arbitrary minimum projected wrist width.
3. **Step 1 remains the top position:** pull until the eye line reaches the observed bar height, then hold until the first bar fills. Merely changing grip or lowering the estimated wrists cannot supply the required bilateral shoulder rise. Jumping directly into a top-like pose without a starting hang observation cannot complete this step.
4. **Step 2 remains the bottom position:** lower into a comfortable hang, keep feet clear of the floor, and hold until the second bar fills. Full lockout is not required.
5. The normal 3–2–1 countdown starts the run. There is no recovery countdown during play. Recording begins after this countdown and continues until the normal run end.

The top reference uses sustained median observations, checks actual rise of both shoulders, and retains the initially observed bar height. It does not require a 140-degree starting elbow angle or a fixed grip width. The reference does not follow the shoulders upward during a slow pull. Fresh observations at 2, 4 and 5 FPS are covered by regressions; sparse repeated render frames cannot substitute for camera observations.

## Floor checks during the run

The demonstrated heel/toe reference is retained for the current camera/calibration session. It is not relearned from airborne feet, knee angle, shoulder motion, or changing wrists. A full camera/calibration reset clears it and requires a new setup observation.

Floor observations update on the camera clock throughout setup, top and bottom calibration, the start countdown, and gameplay. A planted toe can be detected while the heel rises. Returning a foot to the demonstrated floor does not require another shoulder movement. Contact confirmation uses observed intervals, not render counts or time hidden inside a camera gap. A single suspect frame cannot supply the preceding airborne interval as contact evidence.

Confirmed contact in an active run is retained so that a subsequent occlusion or pose gap cannot erase the failure before the game consumes it. The game releases bird control into its existing fall-to-collision behavior. Pipes and recording continue; the detector does not freeze gameplay, insert a recovery countdown, or trigger an ad. Full arm extension remains a normal control endpoint.

Calibration reference snapshots now use the same fresh stable observations as the calibrated controller range. The tracker handles a real camera gap as unverified tracking; it does not quietly count the missing interval as a successful hold.

## What these checks can and cannot establish

This remains a camera estimate against the setup the player demonstrated. It does not measure weight bearing, reconstruct a three-dimensional floor, or independently identify the physical bar. Keep the camera fixed and exercise over the same floor area used for setup. Moving nearer to or farther from the camera, moving the camera, or using a different support height can change image coordinates; this reference does not prove contact in those conditions. Reset calibration after moving the camera.

Straight and bent suspended legs are both supported. Stationary airborne feet are not treated as grounded merely because the shoulders move. Very small apparent clearance can still be uncertain at the model's image resolution and must be checked physically.

The existing upper-body-only route remains available when feet have not been observed in view from the start. It explicitly reports that floor contact cannot be checked. Once visible feet have been consistently observed during setup, cropping them out does not silently bypass the pending floor setup. Missing feet later in a run are not proof that they are airborne; a confirmed planted-foot failure is not erased by hiding them. No claim of planted-foot prevention is made for an unverified, cropped-foot setup.

## Evidence and verification

- Ten recorded numeric pre-top captures were examined. In the isolated top-rule replay, four sequences with negligible estimated shoulder rise are blocked. Five sequences with larger estimated rise complete top calibration. The sixth larger-rise capture ends with a valid top at 98.15% progress because the old phone capture stops at its own saved-top timestamp; a synthetic continuation of the final pose completes the hold.
- Those are observed landmark patterns, not owner-confirmed physical labels for every attempt. The isolated replay disables the retired foot inference to examine the top rule. It does not replay the new standing-floor setup or verify .3 bottom calibration and gameplay on a device. The synthetic continuation is not recorded evidence.
- Compact recorded endpoint geometries are distinguished from complete timestamped replays in the tests. Device traces contain numeric landmarks rather than images; full recordings of those numeric sequences remain task-local.
- The final combined source passed 67 form cases and 19 top-reference cases in the task-local runner. Retired motion-only support expectations were replaced with separate known-floor-contact and stationary-airborne cases; no tests were skipped. Other exercise and lockout assertions remain covered.
- The clean repository Jest rerun reports **28 suites passed, 267 tests passed** (117.793 seconds). The extracted helper was moved outside test discovery; the rerun contains no empty extra suite. The report is retained in the task's `work/pullup-full-redesign/installed-jest-result.json`.
- Mobile TypeScript and strict lint exited successfully. These checks are software evidence, not physical acceptance or a native build.

## Required physical acceptance

Record the device, camera placement, exact Form Test version and result for each relevant case. Use iPhone/iPad and Android; do not infer one platform's physical result from another's synthetic tests. All .3 outcomes below are pending.

| Case | Required outcome |
| --- | --- |
| Arms-relaxed floor setup, then jump to a high bar | Floor is captured before reaching; jumping is allowed; top still requires a settled starting observation and a real pull |
| Merely grip the bar, including narrow neutral and wider grips | Step 1 does not fill without actual body rise |
| Real top and comfortable bottom with straight suspended legs | Both positions calibrate without requiring bent knees |
| Real top and bottom with bent suspended legs | Both positions calibrate without a false planted-foot warning |
| Switch between bent and straight legs; briefly hold an airborne foot still | No floor failure merely from knee changes or stationary airborne feet |
| Put feet down during the start countdown or immediately as play begins | Confirmed contact releases bird control into a normal crash; standing cannot sustain the run |
| Put one or both feet down later, then keep the shoulders still | Contact is detected without requiring new shoulder movement |
| Keep toes planted while raising heels; small or slow calf raises | Toe contact prevents calibration or causes the active run to fall and crash |
| Brief bad estimate, short occlusion, slower camera, then genuine return to floor | A single estimate is not fatal; missing time is not credited; sustained observed contact is detected |
| Full elbow extension while suspended | Bird reaches its control endpoint; no form pause or recovery countdown |
| Release the bar or lose usable upper-body tracking | Sustained failure produces normal fall-to-collision; pipes and recording keep running |
| Begin with feet genuinely outside the camera view | Upper-body route clearly reports that floor contact is unverified |
| Move the camera, then restart calibration | Old floor/body references are discarded and setup is performed again |
| Repeat a run, and smoke-test another exercise plus recorded sharing | Calibration does not leak between sessions; recording includes the complete gameplay interval; the existing sharing flow remains usable |

The last four physical regressions to clear explicitly are: grip-only false top, straight-leg false rejection, suspended bent-leg false floor warning, and standing/calf-raise gameplay after calibration. Until the owner accepts the new behavior, keep this as an unapproved development candidate.

## Release boundary

Production tracker selection remains `original`; the approval marker is not set. No production promotion, GitHub push, native release build, Apple/Google submission, contest submission, or website publication is authorized by this report. Complete-video sharing, the approved result-exit ad sequence, Daily Challenge, and leaderboards are retained. The separate Mail result-card shortcut stays removed; email remains in the regular system share sheet. Existing native/account/store readiness gates remain separate and outstanding.

## Expo handoff verification — September 17, 18:25 Halifax

The complete iOS development bundle returned HTTP 200 and contains Form Test `2026-09-17.3-floor-reference`, the floor module, arms-relaxed setup, and high-bar instructions. Bundle SHA-256: `e0e91cf3cea9c5a20fe179e150c748dd3a5bb3614214a33abbe5bd2fc1bb50fd`. The public iOS manifest returned 200; the launch link redirected to `exp://bcvv0gu-sportaholic-8082.exp.direct`; the Expo Go landing page returned 200. The existing QR remains valid. This confirms served source, not physical tracking acceptance.

The Expo helper was restarted after bundle timeouts. Its forced single-worker configuration runs transforms inside the HTTP process, and the first complete rebuild took several minutes. It finished successfully. Current helper PID: `575124`; current Metro PID at verification: `572804`. New device diagnostics are in `C:\Users\money\Documents\Codex\2026-09-16\g\work\remote-iphone\floor-20260917-181243.stdout.log` (stderr: `C:\Users\money\Documents\Codex\2026-09-16\g\work\remote-iphone\floor-20260917-181243.stderr.log`). Earlier captures remain in the previous log. The active-server record is `work/pullup-full-redesign/active-test-server.json`.
