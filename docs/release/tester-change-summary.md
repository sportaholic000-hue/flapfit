# Flap Fit current candidate change summary

> **Latest physical result: FAILED.** After testing Form Test `2026-09-17.3-floor-reference`, the owner could still plant toes and continue playing. New logs confirm that version, a retained floor reference, and visible high-confidence feet misclassified as airborne. Earlier automated passes and pending-acceptance notes below do not approve this candidate. See `docs/release/pullup-floor-reference-failure-2026-09-17.md` for the evidence. No replacement runtime patch has been applied.

## Current pull-up candidate — September 17

Development Form Test **2026-09-17.3-floor-reference** is installed and awaits physical acceptance.
The previous .2 rules failed. Stand under the bar with flat feet and relaxed arms to capture the
floor, then jump/grip if needed and settle into a hang. The usual top-first and bottom-second
positions follow. A fixed body/bar reference checks actual shoulder rise, and fresh camera poses
check the demonstrated floor through countdown and gameplay. Confirmed contact causes normal
fall-to-collision with pipes and recording continuing. Straight/bent suspended legs, narrow grips
and full lockout remain supported. Cropped-foot setups explicitly cannot check floor contact.

The clean automated rerun reports 28 suites / 267 tests passed; TypeScript and lint pass.
This does not establish phone correctness. Production remains original and the physical-approval
marker remains unset. Use `physical-test-matrix.md` and
`pullup-floor-reference-2026-09-17.md` for the current test sequence and limitations.

## September 17 launch scope: friend codes retired

The owner removed friend challenge codes from the launch app. Daily Challenge, its local completion
and achievement, top-50 bodyweight leaderboards, complete gameplay video sharing and the approved
result-action ad sequence remain. Create/join/compare screens, friend-code helpers, friend game mode
and Duelist achievement are removed. The implementation is preserved under
`archive/friend-challenges/2026-09-17/`, outside the app and excluded from EAS uploads.
Older dated code-binding and friend-code test entries below are historical, not launch requirements.
No database records are purged: existing retention, moderation and account deletion remain supported.
Verification for this revision is recorded in `friend-code-retirement-2026-09-17.md`; older export
hashes and test totals do not describe this revised source. Physical calibration approval and the
other native/account/store gates remain outstanding.


Prepared September 15, 2026. This is the tester-facing summary for the current private `main`
branch. It describes implemented behavior, not planned marketing claims.

## Branding and interface

- Renamed the product to Flap Fit and removed user-facing Flappy Push branding.
- Rebuilt the splash presentation around the approved muscular bird logo and matching solid navy
  background so no contrasting square appears around the logo.
- Reworked the iOS, Android adaptive, and Google Play icons with safe spacing around the approved
  muscular bird and Flap Fit wordmark.
- Centered exercise selection and enlarged the exercise artwork throughout the app.
- Added distinct muscular artwork for Push-ups, Squats, Pull-ups, Bicep Curls, Lateral Raise, and
  Shoulder Press.
- Improved the Home clouds, changed “Your body is the controller” to navy, removed the arm emoji,
  and standardized Sky and Live Camera selection highlights to blue.
- Added Onyx as the black starting bird. The blue bird is Jay and the green bird is Booger.
- Added an Info tab with camera setup, evolution thresholds, privacy, Terms, fitness safety,
  support, bug reporting, sharing, system camera settings, public deletion access, and in-app online
  profile deletion.
- Added Info > View introduction again so an existing tester can replay onboarding without erasing
  progress.
- Replaced the blank post-splash state during saved-progress hydration with branded loading and a
  delayed retry button. A rejected hydration now exits the loading gate instead of spinning forever.

## Gameplay and levels

- Fixed random early level exits. A normal pipe collision is still an immediate full game over.
- Enforced each finite level's configured target and the intended 60-pipe maximum; the final and
  Endless experiences remain exceptions where configured.
- Added Next Level to the level-cleared result alongside Try Again and Done.
- Preserved the selected exercise, game background, recording choice, and development Form Test
  choice when continuing to the next level.
- Enlarged the actual in-flight evolution bird and used the same approved bird art on Home, Stats,
  evolution previews, and gameplay.
- Added reliable local bird-asset handling so a transient image failure cannot silently strand the
  player on “Your bird did not load.”

## Camera, calibration, and exercise tracking

- Removed the motion-sensor control option. Flap Fit is camera controlled.
- Added a two-second reading and setup buffer before calibration can begin for every exercise.
- Aligned onboarding, Info, exercise cards, and calibration instructions around practical phone
  placement: floor for Push-ups, floor or chair for Squats, and chair or higher for the other four
  exercises.
- Preserved the standard Sky background and added a full-screen Live Camera background with the
  bird, pipes, and game UI overlaid.
- Added an isolated development Form Test tracker for physical anti-cheat testing without replacing
  the known baseline tracker prematurely.
- Current Form Test compares visible heel/toe observations with the floor demonstrated during
  setup. It does not infer ground contact merely from stationary feet or knee angle. Both bent and
  straight suspended legs and a comfortable bottom are supported; physical acceptance remains open.
  Confirmed contact or sustained unverifiable tracking releases the bird into normal fall and
  collision. Missing feet in a cropped setup cannot establish ground-contact verification.
- The game-over card now names an unverified-form or lost-camera ending so it does not look like an
  unexplained pipe collision.
- Added protected Push-up checks for hand support/head bobbing and Squat checks for waist-only
  bending while preserving reasonable movement ranges.
- Kept all form checks invisible. No skeleton or landmark overlay is shown.
- Production builds fail closed until the physically approved tracker is deliberately promoted and
  its exact rules version is recorded.

## Recording and sharing

- Added Record & Play to Live Camera mode.
- Recording begins after 3-2-1 and before gameplay, captures the full camera/game composition, and
  ends at collision or level completion. Countdown and result overlays are excluded. The native
  share sheet opens only when the player chooses Share.
- Added optional microphone sound with a clear Continue without sound path after denial.
- Added a persistent red RECORDING indicator while capture is active.
- Kept videos temporary and local. Flap Fit has no video upload or in-app recording library.
- Hardened recording chunks, stale-session cleanup, camera/microphone shutdown, pose-loop shutdown,
  sharing cancellation, and failure recovery so the game result is still saved.

## Bird evolution

- Replaced the childlike placeholder evolution birds with ten progressively stronger muscular bird
  stages for all seven bird colors.
- The selected evolution bird is also the flying bird.
- Current lifetime tracked-training thresholds are 0, 2, 10, 30, and 60 minutes, then 2, 4, 8, 15,
  and 30 hours.
- Push-up, Squat, Pull-up, Bicep Curl, Lateral Raise, and Shoulder Press training contributes to the
  corresponding morphology emphasis.
- After five inactive days the displayed stage drops by one; after seven days it drops by two.
  Earned training time is not erased and the full stage returns after training resumes.
- Added a full-screen evolution ceremony with the stronger bird and tracked-time stat.

## Stats and local progress

- Removed estimated calories and misleading full-repetition totals from current UI.
- Reframed the metric as tracked active gameplay/training time rather than a medical or verified
  physiological measurement.
- Fixed daily and monthly history so All Exercises is the combined total while each exercise reads
  only its own stored history.
- Changed the main Flying Time chart and saved-session training text from purple to blue while
  retaining distinct colors in the per-exercise breakdown.
- Added safe recovery for older saved sessions without guessing an exercise or double counting.
- Added automated regression coverage for chart separation, history recovery, evolution, bird art,
  level rules, challenge input, form tracking, monetization release guards, and profile deletion.

## Compete, leaderboards, and player codes

- Added optional anonymous Supabase competition. Main gameplay remains usable without registration,
  email, password, or Compete.
- Added persistent player names with shared client/server validation and clear rejected-name errors.
- Added global Endless leaderboards for Push-ups, Squats, and Pull-ups with true global ranks.
- Added six-character friend challenge codes for all six exercises, including create, share, find,
  play, and refresh flows.
- Added versioned Competition Terms acceptance before any name, score, challenge, or attempt can be
  published.
- Added visible Report and Block controls and preserved real global rank after personal filtering.
- Added in-app online-profile deletion and a public deletion-page link. Successful deletion clears
  queued results, cached competition screens, player name, and prior Terms acceptance while keeping
  bird and workout progress.
- Replaced trusted client score claims with server-issued runs, authenticated ownership, server
  timing, rules versions, plausibility limits, one-time finalization, replay rejection, and
  idempotent retry.
- Added a bounded persistent result outbox and request timeouts so eligible results can recover after
  a temporary connection failure without duplicate credit.
- A full offline queue now keeps all 25 pending results intact instead of silently discarding the oldest;
  a new result is visibly rejected until space is available, and retries cannot create duplicates.
- Added run/challenge abuse limits, row-level security, service-only protected writes, database
  indexes, retention cleanup, and a dedicated Flap Fit Supabase project.

## Privacy, safety, and launch hardening

- Added accurate camera, optional microphone, local recording, anonymous competition, retention,
  moderation, deletion, and fitness-safety explanations in the app and release drafts.
- Added injury and exercise-risk language without removing non-waivable consumer rights.
- Restricted release WebView navigation and cleartext traffic, disabled Android cloud backup, and
  limited native permissions to the features currently used.
- Added Apple privacy-manifest declarations, Apple and Google privacy worksheets, age-rating and
  reviewer notes, moderation procedures, store listing copy, screenshot specifications, physical
  test matrix, Shipaton requirements, and fail-closed release validation.
- Upgraded and aligned the existing project to Expo SDK 57 while preserving Expo Go testing.
- Added reliable LAN/tunnel Expo scripts and documented the direct deep-link QR workflow.
- Copied the project to a local development folder and synchronized the private GitHub repository.
- Verified no targeted private credentials exist in the current tree or any reachable Git commit.
- Public marketing, Privacy, Terms, and deletion pages now load signed out over HTTPS.
- Current September 17 automated result is 267 tests in 28 suites passing, plus TypeScript and
  strict lint. The earlier six-exercise friend-code API audit is historical; friend codes have
  since been removed from launch. Automated tracker checks do not replace physical acceptance.

## Deliberately not complete yet

- The approved AdMob and RevenueCat packages are installed and the ad/result flow is implemented.
  Expo Go safely skips these SDKs. Native ad tests, RevenueCat event evidence, iOS credentials, and
  matching public disclosures remain; see `launch-audit-2026-09-17.md`.
- The hardened Form Test tracker is not yet the production tracker. Physical approval comes first.
- The optional recorded top-five leaderboard celebration is not implemented. Recording and sharing
  are implemented; changing recording finalization this close to release is intentionally deferred.
- A real signed-out send-and-reply test of support@flapfitapp.com is still required.
- Genuine store screenshots are not fabricated. They will be captured from the exact approved signed
  candidate, then framed and validated for Apple and Google.
- No App Store or Google Play submission has been made.
