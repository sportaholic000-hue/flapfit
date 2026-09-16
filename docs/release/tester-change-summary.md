# Flap Fit current candidate change summary

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
- Form Test evaluates both pull-up feet separately, permits bent knees and a slight elbow bend,
  distinguishes brief wrist/foot occlusion from a visible bar release, detects planted support, and
  ends protected runs after sustained unverifiable tracking.
- Added protected Push-up checks for hand support/head bobbing and Squat checks for waist-only
  bending while preserving reasonable movement ranges.
- Kept all form checks invisible. No skeleton or landmark overlay is shown.
- Production builds fail closed until the physically approved tracker is deliberately promoted and
  its exact rules version is recorded.

## Recording and sharing

- Added Record & Play to Live Camera mode.
- Recording starts with the playable countdown, captures the camera/game composition, stops at the
  result, and opens the native share sheet only when the player chooses Share.
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
- Current automated result is 74 of 74 tests passing, plus TypeScript and repository lint.
  This includes real empty-storage and low-frame-rate training-time regressions.

## Deliberately not complete yet

- AdMob and RevenueCat Ads are not installed in the Expo checkpoint. They require explicit
  dependency approval after gameplay testing and must be tested in signed native builds, not Expo
  Go.
- The hardened Form Test tracker is not yet the production tracker. Physical approval comes first.
- The optional recorded top-five leaderboard celebration is not implemented. Recording and sharing
  are implemented; changing recording finalization this close to release is intentionally deferred.
- A real signed-out send-and-reply test of support@flapfitapp.com is still required.
- Genuine store screenshots are not fabricated. They will be captured from the exact approved signed
  candidate, then framed and validated for Apple and Google.
- No App Store or Google Play submission has been made.
