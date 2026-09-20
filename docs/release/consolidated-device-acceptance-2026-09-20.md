# Flap Fit — consolidated device acceptance (held)

**Do not start yet.** Finish/dispose the source/configuration and store-preparation gaps in the current Apple-first tracker, prepare all cases below, and identify the final candidate before sending installation instructions. This restores the original acceptance requirements; it is not a testing request.

Prior test-ad build (superseded; do not install for final acceptance): [a4091cca](https://expo.dev/accounts/flapfitapp/projects/flapfit/builds/a4091cca-d32e-4856-8d32-cf3b7fccec68), source `20921889c3dda24d790b9f1e5ab4706c77a77c45`, version **1.0.0 (3)**. It is built and artifact-inspected, but lacks implementation successor `0cea7e3f3ba4f43081573c25301e8a3c5cc0b3d5`. It is not the final acceptance candidate. The matching prior Store build is `f0870fe0-c332-4c12-b0f8-bc8a9492a105`. The earlier version (2) lacks the three corrections and cannot establish final acceptance. Runtime changes would require an identified successor and only affected rechecks.

The corrected Store build is now **1.0.0 (4)** / **103c8936**, source **c05f497**, with signed/native/archive inspection complete. The matching registered-device test-ad build is not started: explicit Expo source/signing upload authorization is pending after automatic approval review. The Store artifact is not an Ad Hoc installation link. No testing request is made.

The earlier Safari attempt never produced an app icon. Resolve and supply one working delivery route when the candidate is ready. TestFlight is optional for registered Ad Hoc devices; neither successful compilation nor an install-page success message proves installation. Apple API access is approved, but no upload key is configured and no build has reached Apple.

Use the owner's iPad A16 / iPadOS 26.5 first, then one essentially finished iPhone 16 Pro session after any iPad fixes. Squats / Sky supplies ordinary gameplay checks; do not repeat accepted pull-up experiments. Record model/OS, actual installed version/build, candidate ID/source, test-ad configuration and observations. A test cannot be marked passed because it was skipped.

## Part 1 — play, permissions and layouts (C1/C5/C7, A4)

- Cold launch without Metro. Check existing onboarding, Home, camera startup, accepted calibration/countdown, Squats/Sky, results and Done / Try Again / Next Level. Verify progress after closing/reopening and no external tracking-code download. Check Stats, Daily Challenge and unlock behavior without changing saved progress to manufacture a pass.
- Normal Play works without microphone permission. Exercise camera denial → Settings grant → return, microphone denial and permitted silent Record & Play. Include a short auto-lock and background/return interruption, then another run. Camera/microphone capture must stop after leaving their flow. Record OS process-death recovery as untested unless actually observed.
- On each device inspect onboarding/setup, camera, consent/privacy controls, results/share, safe areas and enlarged text. Capture real useful screens with no private notifications/data and permission for any visible person. Required store-size production is the agent's separate prepared task; raw A16/16 Pro captures alone do not fill all mandatory display classes.

## Part 2 — recording and actual recipient playback (C2/C3)

- Record one full composed gameplay/camera run with permitted microphone audio. Share through the supported system/Messages path to a user-chosen receiving device. Verify complete visible duration and audible playback **on the recipient device**. Source-app or Files-only playback is insufficient. Agent inspects the received clip's duration metadata against the observed run; no recording is uploaded to an app server for this check.
- Cancel sharing, return from an external app and re-share the same ready clip. Verify result/clip survives; check a failed or cancelled share without losing the clip. Active sharing must not be invalidated by temporary cleanup. No ad may appear merely from result arrival, sharing or foregrounding.

## Part 3 — native privacy, ads and temporary competition (C4/C6/D3/D5, A3)

- First claimed result exit stays ad-free. Any required Apple/notice/choice UI appears at the applicable point; optional ad/reporting setup does not interrupt first play. Privacy sheet → required Google form → selected result action must wait for actual dismissal. Exercise Close, Save & continue, repeated taps and background/return. Verify one continuation and no overlapping/late presentation.
- Use only supported test ads for deliberate ad checks. Later Done / Try Again / Next Level exits obey every-second-eligible-exit and at least 90 seconds since last opened ad. Check real close controls, ready-ad close, unready/no-fill/failure continuation, repeated cycles and withdrawal during presentation. The prepared-case table below distinguishes controllable checks from unavailable failure/withdrawal conditions; do not claim an unavailable case passed. No artificial live-ad clicks.
- For a fresh permitted RC identity, agent correlates a genuine installed ad event with existing RC backend/dashboard evidence, without unrelated customer-info retrieval. Then stop reporting in Info → Privacy & choices. Confirm independently allowed Google ads continue, refusal persists after cold launch, and background/relaunch produces no new disallowed RC traffic/events. UI text or a Connected badge alone does not prove native stop/receipt. Source tests for failed save/native stop remain separately labeled; never re-enable reporting merely to retry stopping it.
- Prepare a clearly temporary authenticated online identity. Verify terms and name validation, a legitimate eligible single-run submission/read, report/block, authenticated deletion, preserved local progress, no replacement guest and reachable support/deletion with participation/reporting off. Agent reuses valid unchanged backend/moderation evidence and handles only identified temporary test data. Merely declining Compete does not close this test; no real customer deletion or fake live leaderboard score.
- Use the completed production-coordinator country matrix and the actual Apple-account conditions described below for native linkage/rescission verification. Keep simulated fixtures separate from actual tester location and genuine Apple delivery. A Sandbox TEST success is not real rescission. Unsupported or unavailable cases require an explicit recorded disposition and cannot be silently checked off by adult gameplay.

For each case record **pass / fail / untested**, build/device, a short observation and relevant times/event evidence. Resolve a failure narrowly and repeat affected checks on a successor if needed; do not restart the entire physical session or add spaced-out brother tests by default.

Submission additionally requires final accepted source/configuration pairing, aggregate/native/upload reconciliation, genuine correctly sized store assets, published accurate privacy details, content-rights/export/account declarations, processed attached Store build, and final owner review. The current tracker owns closure; this sheet only supplies the consolidated device procedure.


## Prepared cases and evidence limits for the single session

Use the identified test-ad artifact only. The agent records the version/source,
start time and actual country/Apple response before interpreting a result.
Do not spoof residence/age, erase existing progress to manufacture a fresh ID,
fill the device's disk, or add developer controls to the release.

| Case | Concrete setup and what may be concluded |
| --- | --- |
| No optional pregame interruption | First ordinary Squats/Sky run; record any system sheet and its actual requirement. Optional Info/result choices must not become new onboarding. |
| Native handoff | At the applicable result exit, exercise the existing sheet's Close and Save paths, then background/return while a sheet is visible. Record the chosen action and visible presentations. If Google requires no form for this device, record that fact; do not claim the Google-form transition was physically exercised. |
| Ad timing and empty readiness | Record eligible exit counts and times of actual ad openings across the session. Confirm first exit free, every-second eligibility and 90-second spacing. If no ad is ready, the action must continue immediately and no later ad may cover gameplay. Do not force live ad clicks. |
| Offline continuation | Temporarily disconnect network for a local run/result exit, then restore it. This proves that local continuation survives unavailable networking; it does not reproduce a specific Google no-fill/failure callback. A provider failure not actually observed stays untested physically, with source/native evidence separate. |
| Reporting receipt and withdrawal | Record a fresh installed RC ID when genuinely created and its permitted event/impression ID, placement and UTC times from available SDK/provider evidence. Match that exact event in the existing RC account. Stop reporting in Info, then background and cold-launch while independently permitted Google ads remain. If the provider view exposes insufficient evidence, keep receipt open; do not use customer-info GET or a connection badge as a substitute. |
| Failure-specific Retry controls | The two rendered failure/retry regressions already passed. No storage/native failure is manufactured on the owner's device. Any physical failure observed must retain Retry; absent one, these failure cases retain their source-test evidence and are not called physical passes. |
| Withdrawal while native ad is open | There is no pretend in-ad Info control. Only a genuine applicable external authorization change could exercise this physically. If unavailable, retain the source and worker native cancellation evidence and explicitly leave the physical scenario unexercised. |
| Country/age and Apple rescission | The production-coordinator matrix for AU/CA/MX/US already passed. Physical observations describe only the actual device/account/region. Genuine Apple linkage/rescission requires an applicable Apple-authorized account flow; adult gameplay and Sandbox TEST delivery cannot prove it. No extra child account, altered residence or tester pool is requested. |
| Online rights | Use only a clearly temporary authenticated identity and a legitimate eligible run; retain local progress after deletion. Existing unchanged backend deletion/moderation proof is reused. A missing installed step is recorded, not replaced with a fake leaderboard score or real-account deletion. |

These preparations define what can be exercised and what evidence each case
establishes. They do not close physical, provider or Apple service gates before
the session. The iPhone pass follows correction of any iPad failures.
