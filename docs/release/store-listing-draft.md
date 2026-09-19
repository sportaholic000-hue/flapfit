# Flap Fit store listing draft

Use the same factual claims on Apple and Google. Do not claim medically verified exercise, calorie
accuracy, guaranteed results, or live global usage numbers without evidence.

## Name and positioning

- Installed app name and brand: Flap Fit
- Apple App Store listing title: Flap Fit Workout Game (21/30 characters)
- Apple app ID: 6813280704; bundle ID: com.flapfit.game; SKU: flapfit-ios
- Apple record: https://appstoreconnect.apple.com/apps/6813280704/distribution/ios/version/inflight
- Apple status when created: Prepare for Submission, version 1.0; no build uploaded or submitted
- Google listing name remains Flap Fit
- Apple subtitle: Home Fitness & Tracking (23/30 characters)
- Apple promotional text: Turn exercise into a flying game, build tracked training time, and evolve
  the bird you control. (95/170 characters)
- Apple keywords:
  `workout,exercise,bodyweight,training,avatar,gamified,pushup,squat,pullup,camera,motion,fitness,game`
  (99/100 bytes)
- Google short description: Move your body, guide your bird, and make workout progress visible.
  (67/80 characters)
- Primary category: Health & Fitness
- Secondary Apple category: Games, Action (saved by owner in App Store Connect)
- Google tags: Fitness, Exercise, Casual

## Description

Your body is the controller.

Flap Fit turns bodyweight and weighted exercises into a camera-controlled flying game. Pick an exercise, calibrate
two positions, and move through your range to guide your bird between the pipes.

Train with push-ups, squats, pull-ups, bicep curls, lateral raises, and shoulder press. Build tracked
training time, unlock levels, and watch your chosen bird evolve through ten increasingly powerful
stages. Your evolution bird is also the bird you fly.

Choose the colorful Sky game or place the pipes and bird over your live camera view. Record & Play
can create a temporary gameplay video on your phone, including your voice and workout sounds when
you allow microphone access, so you can share a run using your normal system share sheet.

Compete is optional. Accept the community rules to post a chosen player name and score, climb
bodyweight-exercise leaderboards, and compare your best Endless runs. No email or password is
required, and the main game works without Compete. Share a complete gameplay video with friends
and invite them to beat your run. Daily Challenge remains available on Home.

Camera pose estimation runs on your device. Normal Play does not record video, and Flap Fit does not
upload Record & Play videos.

Flap Fit is free to play with occasional ads after you choose to leave a completed run.
There are no in-app purchases or subscriptions.

Flap Fit is a fitness game, not a medical device. Tracking, scores, and training-time totals are
estimates. Train safely and consult a qualified health professional when appropriate.

## Screenshot sequence

1. Home: Flap Fit logo, selected bird, background choices, and "Your body is the controller"
2. Exercises: all six muscular exercise birds, including Lateral Raise and Shoulder Press
3. Sky gameplay: selected evolution bird, pipes, and visible score during a real run
4. Live Camera gameplay: consenting adult, selected evolution bird, and pipe overlay
5. Evolution: genuine early, middle, and Legend stages from one bird color
6. Stats: attributable daily/monthly training charts with no calorie or repetition claim
7. Compete: global leaderboard with Report / Block visible
8. Record & Play result: real Share video action

Use genuine captures from the final production build. Do not put fabricated usernames or scores in
screenshots represented as real live activity; seed clearly marked demo/reviewer data if a populated
competition screen is required.

Use the exact filenames, dimensions, scene order, headlines, and capture rules in
`store-screenshot-production-plan.md`. Apple and Google should tell the same eight-screen story;
recompose each frame for its required dimensions rather than stretching or cropping it.

Store-listing media belongs in `apps/mobile/store-assets`. Run
`corepack yarn workspace mobile release:assets` before either submission. The source iOS icon is
1024 x 1024 and has no transparent pixels; the Google Play store icon and feature graphic remain
separate deliverables.

The advertising wording above describes the implemented native integration. Verify it against the
signed release build and the final privacy policy; Expo Go does not load the native ad SDKs.

## Required links and contacts

- Marketing URL: https://flapfitapp.com/
- Support URL: https://flapfitapp.com/support/
- Privacy Policy URL: https://flapfitapp.com/privacy/
- Terms URL: https://flapfitapp.com/terms/
- Account and data deletion URL: https://flapfitapp.com/delete-account/
- Support email: support@flapfitapp.com
- Copyright and legal seller/developer name: Troy Reardon
