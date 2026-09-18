# Flap Fit regression candidate — September 16, 2026

Status: local candidate for phone testing. Recording/sharing and pull-ups remain launch blockers until the physical acceptance checks below pass.

## Project and preservation

Worked directly in C:\Users\money\Projects\flapfit\anything, on local main at 089bcd2. No commits, pushes, website edits, dependency changes, lockfile changes, tracker promotion, or store submission. Existing staged release documents remain staged; pre-existing unstaged work was retained. Backups of the affected original files are in this task's work/flapfit-before directory.

Production tracking remains original. Development Form Test rules are now 2026-09-16.5.

## What was reproduced

The two stale recording tests failed at the beginning: 27 passed, 2 failed. They expected the reverted one-second-chunk experiment. They were reconciled with the complete-recording path before further changes.

A synthetic recording using the exact local recorder in Windows Edge/Chromium 153 reproduced complete footage with incorrect MP4 track-duration headers:

- Silent baseline: about 3.837 seconds of video samples; mdhd header reported 0.1279 seconds.
- Thirty-second audio/video run: video header initially reported 0.9846 seconds for 29.537833 seconds of video; audio header initially reported 0.623542 seconds for 29.929458 seconds of audio.
- The candidate corrected both track headers using their recorded sample timelines and individual timescales.
- Complete transfer of the 30-second candidate: 2,704,117 bytes in 14 bridge messages.
- Independent browser playback of that transferred file reported 29.929458 seconds, decoded a frame after seeking to 29.229458 seconds (readyState 4), and reached the natural end at 29.929458 seconds.

These are generated animation/tone tests, not the user's phone recording, camera, microphone, Snapchat, or another receiving phone. No original phone clip was requested or inspected. Earlier headless AudioContext probes stalled because of the diagnostic audio-device path; the successful test used generated audio frames. An initial playback harness required a content-type correction and a fresh isolated browser profile before it ran successfully.

The user's physical reports remain: full local/OneDrive playback; a one-second displayed duration; shortened sends from the saved copy; and Snapchat reporting “failed to send” and remaining open.

## Recording candidate

- New scriptRecordingMp4.ts reads MP4 timing boxes and fragment tables locally.
- It repairs only the recognized defect in which track duration was written in milliseconds instead of the track's timescale, with corroborating movie/track timing.
- Handles multiple fragments and Chromium's empty trailing audio fragment without discarding earlier audio timing.
- Keeps forward timestamp gaps and encoded media bytes intact. It does not transcode, upload, or trim footage.
- Leaves unfamiliar layouts, edited timelines, and unsupported timing patterns unchanged and reports them as unverified in development diagnostics. This is a guarded metadata correction, not a general MP4 remuxer or a universal compatibility guarantee.
- Prefers H.264/AAC MP4 where the platform supports it; retains the existing platform fallbacks.
- Uses the actual base64 data marker so codec-list commas cannot corrupt bridge extraction.
- Collects all recorder Blob events before finalization, sends bounded bridge messages, and checks the completed native file's exact byte count.
- Repaints the first gameplay frame after 3-2-1 before capture and freezes the terminal gameplay frame on collision/completion. Result screens do not enter the video. The existing 50 ms encoder-stop deferral remains.
- Recordings remain temporary, local, and available through the system share sheet. Microphone permission and silent recording remain supported.

## Pull-up candidate

Three additional failing regression scenarios were reproduced before changes: knee occlusion bypassing cross-calibration support detection, horizontal airborne foot motion being mistaken for a planted foot, and slow supported movement being forgotten by the short evidence window.

The development-only candidate now checks foot movement in both image axes, retains short and six-second observation windows, does not require knee landmarks to evaluate visible foot anchoring across calibration, and excludes off-image foot estimates. It removes the unused knee-change argument rather than treating knee bending alone as evidence of suspension.

Two previous “suspended” test fixture sections had almost stationary feet while shoulders moved, with no knee landmarks. Their foot positions were adjusted to describe feet moving with the suspended body; the new tests separately verify rejection of the stationary-foot case.

Top-first calibration, the two-second buffer, upper-body-only framing, and bent-knee support remain. No skeleton overlay or rest mechanism was added. The production tracker was not promoted.

Limit: a monocular pose model cannot directly establish floor or bar contact. Motionless supported and suspended poses can be ambiguous; the reported .006 shoulder movement remains below the movement threshold. This candidate does not claim to solve every such case, nor does a passing synthetic pose test establish that the user's bent-to-straight movement is safe from false rejection. Physical tests must cover it.

## Validation

From apps/mobile:

- node ../../node_modules/jest/bin/jest.js --runInBand: 17 suites, 98 tests passed.
- node ../../node_modules/typescript/bin/tsc --noEmit: passed.
- ../../node_modules/.bin/oxlint.cmd --no-ignore --deny-warnings src scripts: passed.

A first full-suite invocation from the repository root could not resolve the mobile @/ aliases in two competition suites; rerunning from the mobile workspace resolved that invocation issue without changing competition code.

New media tests exercise real synthetic browser fixtures, audio/video timescales, multiple fragments, empty audio fragments, unchanged encoded bytes, malformed files, unsupported layouts, complete bridge transfer, codec-list commas, countdown exclusion, crash frames, and level-completion scores. The fixtures are generated data and contain no user footage.

## Required physical acceptance

Reload the existing Expo Go app from this exact project. The existing Metro server on port 8081 was confirmed to run from it.

1. Record a fresh approximately 30-second run, speaking near the beginning and end. Confirm the first frame follows 3-2-1 and the last frame shows the crash or completed level.
2. Check the displayed duration and playback/seek behavior after saving locally.
3. Share from Flap Fit to Snapchat; verify successful sending, return behavior, the recipient's full duration, beginning/end footage, and sound.
4. Send the saved file independently. Verify the recipient gets the complete run.
5. Repeat with text/message and email, then the other social destinations needed for launch. File-size limits and destination behavior must be tested rather than assuming one destination certifies all others.
6. Repeat on Android and iPhone, with microphone granted/denied, an early crash, a longer run, cancellation, retry, and navigation.
7. In Form Test, confirm genuine top-first pull-ups with bent knees, feet out of frame, and bent-to-straight suspended transitions. Verify rejection of visibly planted feet, one-foot support, tiptoes/head tilt, and bar grabs without real shoulder lift.
8. Do not promote the tracker or clear either launch blocker until the physical results are approved.

Development console output prefixed “Video finalization:” reports the actual phone's format, original track-header durations, sample durations, and repair status without storing or uploading footage.

## References

- W3C MediaStream Recording: https://www.w3.org/TR/mediastream-recording/
- Chromium muxer documentation: https://chromium.googlesource.com/chromium/src/+/HEAD/media/muxers/
- Original supplied diagnostic reports: C:\Users\money\Downloads\REPORT.md and C:\Users\money\Downloads\CODEX_READ_ONLY_HANDOFF.md. Their Linux/Chromium evidence remains separate from this Windows synthetic test and from required phone tests.


## Final control and concurrent copy edits

The short silent control completed with a 21,595-byte MP4 and corrected its header to the actual 0.4961-second encoded timeline. It requested one second after recorder setup, so this exposes headless startup/frame-delivery latency rather than proving an exact one-second capture. The earlier short probe included setup in its timer and produced no usable media; it failed visibly instead of marking an empty file ready. Real-device first-frame timing and early-crash capture therefore remain explicit acceptance checks.

Another existing Codex task, authorized by Troy, updated only phone-distance copy in onboarding, Home, Info, and scriptGame.ts while this work was in progress. Those changes are already in the same local folder and were preserved: push-ups 3 ft; squats/curls 3–6 ft; pull-ups/lateral raise/shoulder press 4–6 ft. That task reported its own TypeScript check passing.

## Phone follow-up: Snapchat split of a 25-second run

The user reports improvement: a 25-second Flap Fit run now produces three Snapchat videos, 10 seconds + 10 seconds + 5 seconds. This accounts for the reported duration but does not yet establish uninterrupted recipient playback, sound, return-to-app behavior, or compatibility with other destinations.

The current native share handler passes one recordedVideo.uri to Sharing.shareAsync. The installed Android expo-sharing implementation uses ACTION_SEND with one EXTRA_STREAM URI; Flap Fit does not create three video attachments.

Snap's current Creative Kit media specifications explicitly state that videos longer than 10 seconds are split into multiple Snaps of 10 seconds or less: https://developers.snap.com/snap-kit/creative-kit/overview . Flap Fit uses the system share sheet rather than Creative Kit, so this is strong supporting evidence for destination segmentation, not direct proof of the exact share route on this phone.

No recorder or share-code change was made in response to this observation. The remaining comparison is a fresh exported file played/sent as a single attachment outside Snapchat, and (if necessary) an ordinary phone-camera video over 10 seconds shared through the same Snapchat route. Clarify whether the three pieces appear in the editor, as separate recipient messages, or both. Keep physical acceptance open; do not promise that Flap Fit can override a recipient app's segmentation rules.

Phone clarification: Snapchat showed one video before sending; the chat then contained three separate videos. This locates the observed split after Snapchat accepted the single item. The documented 10-second Snap segmentation remains the leading explanation. A continuous full-length attachment outside Snapchat has not yet been confirmed by the user.

## Phone acceptance update: text delivery and return after sharing

The user confirmed the full video sent properly through text. Snapchat previously accepted one 25-second video before delivering it as 10 + 10 + 5-second items. TikTok posts, Instagram Reels, and Facebook Reels are now the priority social acceptance destinations, with full duration, beginning/end footage, and audio to be checked on the physical devices.

The user reports that both text and Snapchat leave the receiving app foregrounded after sending. Tapping Expo Go reopened Snapchat. Return behavior remains unresolved and is material to the post-game ad strategy. Asked whether Android Back restores the Flap Fit result screen; awaiting the physical observation.

Inspected the installed expo-sharing implementation: Android opens a chooser with startActivityForResult and resolves its pending Promise on the activity result, without a verified send outcome. The outbound share contains one file URI and a read grant. There is no JS option for a guaranteed return after the target sends. The app's handler only clears shareBusy in finally; it does not relaunch Snapchat or navigate away from results. Android can restore the top external activity in the originating task when the launcher icon is selected. That is a supported explanation for the Expo Go observation, not a confirmed device trace. Reference: https://developer.android.com/guide/components/activities/tasks-and-back-stack .

A resolved share Promise must not be treated as proof of delivery or as a cross-platform foreground signal. Preserve the intended order: finish run and recording, share, return to the Flap Fit result screen, then Done/Try Again/Next Level and an eligible ad. Ad packages are not installed. Do not claim automatic return is fixed, add a timed forced foreground, or show an ad while the user is still sharing. Native task behavior needs verification in the actual standalone Android/iOS candidate as well as Expo Go.

The pull-up test candidate remains Form Test rules 2026-09-16.5. Normal gameplay remains on the original tracker. No tracker or recording source changes were made during this share-return investigation, so the current physical calibration test stays on the same candidate.

## Confirmed Android video results and ad paths

The user confirmed full-video delivery through text, that sound works perfectly in the video, and that the displayed video duration is now correct. The earlier share tests were on Android; the user does not recall the Back-button behavior. Return after sharing remains unresolved. TikTok, Instagram, Facebook, and physical iPhone verification remain pending.

The user reaffirmed the ad sequence: when sharing, return to Flap Fit first, then Done/Try Again/Next Level, then an eligible ad before completing that action. Without recording or sharing, go directly from the result-action tap to the eligible ad and then complete the action. Recording does not require sharing; skipped sharing uses the same direct result-action path. This confirms product behavior only; ad dependencies are still not installed.

## September 16 follow-up: Form Test 2026-09-16.6

The user physically tested the pull-up candidate and could put their feet on the floor after calibration while gameplay continued. This is a failed physical acceptance result. The current pose-only support check requires stationary visible feet plus sufficient shoulder movement; it cannot establish floor contact from a motionless pose without a floor reference. Asked whether the feet remained visible and whether the user held still or continued moving. No new pull-up cutoff was applied on this incomplete observation, and the production tracker remains unpromoted.

The new 2026-09-16.6 candidate changes shoulder press only. It measures both upper arms relative to their own shoulders for calibration and gameplay, so overhead wrists may leave the image without losing the controller or jumping when they reappear. Both shoulders and elbows must remain visible. Hands must be visible near shoulder height in the lowered calibration position. When wrists are visible, elbow-bend checks still apply; when cropped, upper-arm elevation is a proxy and cannot prove the exact elbow angle. Hip landmarks are optional for this closer framing. One-arm presses, missing elbows, lateral raises in place of a press, and whole-body vertical motion have regression coverage. In-game Form Test instructions reflect this framing; the original production tracker is unchanged.

Six closer-framing tests were added. Four reproduced the old calibration failure before the source change; all six now pass, together with the existing form tests (29 targeted tests). TypeScript and strict lint pass. Full-suite validation is being completed separately. Reload Expo Go and select shoulder press in Form Test for the physical test.

Automatic return after a completed social share remains unresolved. The installed generic sharing API cannot confirm delivery or require the receiving app to finish its activity. No forced foreground timer, native dependency change, ad SDK, or change to the now-working video export was introduced. Android standalone return/navigation behavior still needs a physical test; Expo Go cannot change its compiled native task behavior through a JavaScript update.

Validation completed for Form Test 2026-09-16.6: all 17 mobile suites / 104 tests passed, TypeScript passed, strict lint passed, and git diff --check passed. Six closer shoulder-press tests were added; the recorded full-video fixture and boundary checks still pass. Physical shoulder-press approval, pull-up support rejection, and return after sharing remain open.

## Shoulder-press lockout and continuous gameplay: Form Test 2026-09-16.7

The user preferred the closer shoulder-press framing but reported a lockout-related message and a mid-game pause. No runtime message literally says arms locked out; the existing tracking recovery path displays "Locked on! Resuming..." after entering a frozen lost/resume state. The exact phone trigger was not captured.

Seven new regression failures were reproduced before the fix: straight arms below the calibrated bottom were rejected; contradictory wrist estimates rejected a valid overhead elbow position; different calibrated arm ranges rejected bilateral full extension; and the real game loop froze pipes or prevented collisions during transient and sustained interruptions.

The candidate now validates shoulder-press gameplay using the calibrated shoulders/elbows, without requiring a wrist angle or wrist visibility during the run. The lowered calibration position still requires hands near the shoulders. Arm progress is clamped at the same endpoints as the bird controller so full extension beyond slightly different left/right calibration ranges is accepted. A full lockout at either extreme remains playable input: it holds the bird at that end of the range and ordinary pipe collisions can end the run. It does not directly force a game-over merely for locking out.

Form Test now keeps pipes, collision checks, and recording frames moving through brief landmark/form interruptions, with no lost/resume pause or recovery countdown. Existing confirmation limits still end sustained tracking/form failure, and bilateral arm checks remain. This applies to the development candidate; the original production tracker is not promoted or changed.

Ten behavior tests were added, including actual-loop movement, recording frames, collision at both endpoints, immediate recovery without a frozen state, sustained failure, and preservation of original-tracker behavior. The targeted four suites / 52 tests pass; strict lint passes. Full-suite and TypeScript results are recorded below when complete. Reload Expo Go and start a new shoulder-press Form Test run for physical acceptance.

Final validation for Form Test 2026-09-16.7: all 18 suites / 114 tests passed; TypeScript and strict lint passed. The lockout fix is ready for a new physical Form Test run. Pull-up feet-down rejection and automatic return after sharing remain unresolved. No dependencies, production-tracker promotion, or push were made.


## All-exercise lockout and collision-only gameplay: 2026-09-16.8

The user clarified that full lockout in every exercise is ordinary endpoint input, and that nothing during gameplay may freeze pipes or introduce a recovery countdown. A run ends by collision or normal level completion.

The candidate accepts joint motion continuing beyond either calibrated endpoint while preserving the existing middle-range form checks. Bilateral wrist progress is clamped like the game controller so different left/right calibration ranges do not reject both arms reaching the same endpoint. Actual pose fixtures calibrate and then fully extend each of push-ups, curls, lateral raises, shoulder press, squats, and pull-ups.

The lost/resume branches and recovery countdown were removed from the shared gameplay loop in both Original and Form Test. Brief missing/invalid tracking does not stop pipe movement, collision checks, or recording. Confirmed form failure or sustained tracking loss releases the bird into a latched fall, and the actual pipe/playfield collision ends the run. There is no direct timed form/tracking game-over. Normal controlled endpoints remain inside the playfield. Initial calibration and the initial 3-2-1 remain. The production tracking selector stays on Original; this is an authorized shared gameplay change, not promotion of the experimental form tracker.

Before changing the sources, nine tests reproduced endpoint rejections, immediate non-collision endings, and the remaining Original-mode freeze. Those failures now pass. Added a separate confirmed-form-failure test that verifies continuing pipe/recording movement until floor impact. The full verification result follows. Physical acceptance still requires a fresh run after reloading Expo Go; this is automated evidence, not a new phone observation.

Pull-up feet-down rejection and return after sharing remain unresolved. These changes do not clear either acceptance failure. No recording/share implementation, dependency, production tracker selection, or remote branch was changed in this follow-up.

Final validation for 2026-09-16.8: all 18 mobile suites / 125 tests passed, including actual-loop collision behavior and MP4/recording boundaries. TypeScript and strict lint passed. Physical no-pause/full-extension acceptance remains pending.


## Snapchat return observation: two Back steps

The user shared another video to Snapchat. The first Android Back action returned to Snapchat's video screen; the second returned to Flap Fit. Manual return is now confirmed for this path, but the user finds it annoying. This does not establish automatic return, state persistence after a cold restart, or behavior in a standalone build.

Re-inspected the installed expo-sharing Android implementation and the game's share handler: one video URI is passed to a standard ACTION_SEND chooser launched for an activity result. The implementation resolves on its activity-result callback without a verified send outcome. Its exposed options have no return-after-send control. The reported two-step return is consistent with Android back-stack navigation; the exact Snapchat activity stack has not been captured. No runtime patch was applied from this observation.

Snap's documented direct Creative Kit route was also reviewed. It is a separate native integration with registration/approval requirements; its documentation does not establish guaranteed return after the recipient actually sends. Do not describe switching libraries, task flags, or making a standalone build as an automatic-return fix without physical evidence. The next acceptance step is the same send/cancel/Back/launcher test in a standalone Android build, retaining the same run result. Preserve the user's monetization order: actual return to Flap Fit, then Done/Try Again/Next Level, then an eligible ad; never trigger an ad merely because a share promise resolves.

Sources checked: https://docs.expo.dev/versions/latest/sdk/sharing/ ; https://developer.android.com/guide/components/activities/tasks-and-back-stack ; https://github.com/Snapchat/creative-kit .


## Pull-up calf raises and Android launcher return: 2026-09-16.9

The user reported a further physical failure: the pull-up game accepted planted feet and calf raises with the head nowhere near the bar. Testing includes Android and an iPad, with remote iPhone testing planned. The exact tracking mode for this failing run was asked but not yet confirmed; a development-only tracker/version label has now been added to the game screen. It is outside the recorded canvas and absent from production.

Seven new failing regressions were reproduced before modifying the source. The prior code averaged foot landmarks, allowing the rising heel/ankle to conceal a stationary toe; required almost half the calibrated shoulder range to establish foot support; accepted weak eye estimates, averaged contradictory eye heights, and used off-image hand estimates as the bar reference. Averaged hand positions also let opposite movements cancel out. These are reproduced code weaknesses, not captured landmark traces from the user's latest phone test.

The .9 candidate now accumulates toe, heel, and aggregate-foot evidence independently. A small supported shoulder movement can establish contact, while the permitted landmark noise is tightened relative to that movement. Top calibration requires both eyes at sufficient confidence, both hands in-frame, and both eyes near the line between the grips. Bottom calibration and gameplay test each hand's anchor independently. Tests preserve bent knees, cropped feet, airborne leg changes, and all-six full extension. No mid-run warning pause or countdown is reintroduced: confirmed invalid form releases the bird into the existing fall/collision path. Pose landmarks still infer support; do not claim direct bar/floor object detection or acceptance without a real device run.

A dependency-free Expo config plugin prepares Android MainActivity with clearTaskOnLaunch=true and singleTask. This targets the separate reported problem where reopening the app icon surfaces the external share activity. Expo config introspection generated the intended manifest, and the plugin test preserves iOS settings, other activities, and permissions. It requires a newly installed standalone Android build. It does not change Expo Go's native binary, cannot remove Snapchat's own screens after Send through JavaScript, and is not evidence of automatic return. Installed expo-sharing iOS already uses the system activity controller's completion handler and iPad presentation; iPad/iPhone sharing remains on that path.

No new dependencies, lockfile changes, tracker promotion, recording changes, or website edits were made. The user authorized pushing confirmed fixes: commit 0974a3b97f1e046bbc0aedbd48712622982a902d was pushed to fix/confirmed-video-sharing-2026-09-16. It contains the confirmed video fixes and phone-placement copy, with 21 tests run against the exact selected checkpoint. Main and the user's staged files were preserved. The .9 pull-up candidate and native launcher-return change remain local for physical testing.

Final validation for 2026-09-16.9: 19 suites / 135 tests passed; TypeScript, strict lint (including the new plugin), and git diff --check passed. Expo config introspection generated the Android launcher-return attributes. The recording/game loop and core are byte-for-byte unchanged from the saved .8 checkpoint. Remote branch verification returned commit 0974a3b97f1e046bbc0aedbd48712622982a902d. Physical acceptance of .9 and the installed Android launcher behavior is the next verification step.

## September 17 — 50-player leaderboards and Sky preview

User reports the brother successfully opened the temporary tunnel on iPhone, and challenge code exchange works between their separate Flap Fit profiles while using the same Expo login. Current friend challenges remain Level 3 target-score runs, capped at 60 pipes, and do not store an exercise. No challenge behavior changed in this update.

Each existing exercise leaderboard now allows up to 50 visible players. The mobile rendering cap and server response cap both changed from 20 to 50; fetching, ranking, blocked-player filtering, and score validation remain unchanged. Supabase project yhrleungvipsqlmayrfg function flapfit-game deployed as version 5 with verify_jwt=true. The deployed source was checked against the exact requested one-line change from version 4. Handler tests with 75 fixture players and 3 blocked profiles returned exactly 50 entries for each exercise with original ranks preserved.

In Sky mode the mini camera and its toggle disappear immediately when the second calibration bar completes, before 3-2-1. The existing invisible video-surface technique keeps the tracking source attached and active. The toggle cannot restore a thumbnail during countdown/play. Incomplete or rejected calibration keeps the preview available. Full-screen Camera mode uses the same hidden video source and visible canvas composition as before.

Validation: 4 targeted suites / 26 tests passed (camera preview lifecycle, continuous gameplay, level rules, recording boundaries); TypeScript, strict lint, and diff whitespace checks passed. Physical Sky-mode acceptance is pending on Android/iPhone/iPad. Reload Expo Go and begin a fresh Sky run to verify both calibration steps show the thumbnail and countdown/gameplay hide it while the bird still responds.

New physical sharing evidence: the brother's iPhone sent 25-second and over-30-second Snapchat clips without splitting them. The owner's earlier Android Snapchat delivery split a 25-second clip into 10+10+5-second items. Preserve these as device/recipient-flow observations, not a universal Snapchat duration rule. The brother also needed to manually leave recipient apps to return to Flap Fit. Automatic post-send return is not demonstrated or fixed by this update. Recording/export/share code was not changed.

Local sources were backed up before this change in work/before-top50-sky-preview in the Codex task workspace. No GitHub push, dependency change, schema migration, or website change was made for this update.
