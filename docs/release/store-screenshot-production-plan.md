# Flap Fit store screenshot production plan

Create these images only from the exact signed candidate that passes the physical release matrix.
Marketing frames may add Flap Fit colors and short headlines around the capture, but the app UI,
scores, camera behavior, and feature state shown inside the capture must be genuine.

## Output sets

### Apple App Store

- Produce eight portrait PNG or JPEG images at `1320 x 2868` with no transparency.
- Save them under `apps/mobile/store-assets/app-store/iphone-6.9`.
- Use the same approved iPhone build and visual sequence for every image.
- Flap Fit 1.0 supports both iPhone and iPad. Produce a separate set of eight genuine iPad
  screenshots at `2064 x 2752`, with no transparency, under
  `apps/mobile/store-assets/app-store/ipad-13`. Use the same eight filenames and visual sequence.
  Capture the native iPad build; do not stretch iPhone captures into tablet screenshots.
- Apple requires the 13-inch iPad screenshot slot for apps supporting iPad. The selected
  `2064 x 2752` portrait size is accepted by the current screenshot specifications:
  https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/
- Apple permits 1 to 10 screenshots. The eight-image set below tells the complete Flap Fit story
  while keeping the first three focused on the core product.

### Google Play

- Produce the matching eight portrait PNG or JPEG images at `1440 x 2560` with no transparency.
- Save them under `apps/mobile/store-assets/google-play/phone`.
- Keep every file below 8 MB.
- Recompose the marketing frame for Android instead of stretching or cropping the Apple output.

## Approved visual sequence and copy

| Order | Headline                    | Genuine app scene             | Capture requirements                                                                                                                                                           |
| ----- | --------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1     | YOUR BODY IS THE CONTROLLER | Home and exercise selection   | Flap Fit logo, improved clouds, selected bird, Sky and Live Camera choices, and all six muscular exercise birds must be legible. This is the most important acquisition image. |
| 2     | PICK YOUR EXERCISE          | Exercise selection close view | Show Push-ups, Squats, Pull-ups, Bicep Curls, Lateral Raise, and Shoulder Press with the real approved artwork. Do not hide or crop Shoulder Press.                            |
| 3     | TURN MOVEMENT INTO FLIGHT   | Active Sky gameplay           | Show the player's actual selected evolution bird, pipes, score, and clean sky background during a real run. Do not imply automatic full-repetition counting.                   |
| 4     | PLAY IN THE REAL WORLD      | Active Live Camera gameplay   | Show a consenting adult exercising behind the genuine bird and pipe overlay. Use a neutral private background and show no skeleton overlay.                                    |
| 5     | MAKE PROGRESS VISIBLE       | Bird evolution                | Show genuine early, middle, and Legend stages from the same bird color. Legend must be the strongest and most visually distinct stage.                                         |
| 6     | TRACK TIME UNDER TENSION    | Stats                         | Show attributable daily/monthly exercise data and total flying time. Do not show calories or misleading repetition totals.                                                     |
| 7     | CLIMB THE GLOBAL RANKS      | Compete leaderboard           | Use clearly controlled reviewer/demo player data with believable scores. Show Report and Block access. Do not present fabricated data as real public usage.                    |
| 8     | RECORD. PLAY. SHARE.        | Record & Play result          | Show the real Share video action after a completed or crashed recorded run. Do not imply that Flap Fit uploads or stores the video.                                            |

## Art direction

- Use the splash-screen navy, sky blue, warm yellow, white, and existing gameplay colors.
- Do not introduce purple outside existing pipe/gameplay art.
- Use the actual splash logo. Do not redraw or substitute another bird logo.
- Keep headlines short, large, high contrast, and outside critical app controls.
- Use the same rounded, playful, muscular visual character as the app's exercise birds.
- Keep every phone capture large enough to read at store-thumbnail size.
- Do not use em dashes in screenshot copy.
- Do not add awards, medical claims, guaranteed fitness outcomes, fake star ratings, fake reviews,
  unverified user counts, or competitor branding.

## Capture preparation

1. Install the approved signed build cleanly on the capture device.
2. Enable Do Not Disturb and remove personal notifications, contact names, photos, location clues,
   and unrelated status-bar indicators.
3. Use a dedicated reviewer/demo competition identity. If seeded leaderboard data is used, record
   the seed values and remove them after capture.
4. Select a bird color and evolution stage that make the bird readable against both Sky and Live
   Camera backgrounds.
5. Capture the raw screens first. Preserve untouched originals in a private, date-stamped evidence
   folder before adding marketing frames.
6. Verify every final image against the exact build. Text, buttons, screenshots, scores, and states
   must not advertise a feature absent from that binary.

## Final validation

- Run `corepack yarn workspace mobile release:assets` after the iPhone, iPad and Android image sets are saved.
- Review the first three images at small thumbnail size. The logo, exercise birds, core mechanic,
  and live-camera difference must still be immediately understandable.
- Verify no image includes private notifications, unrelated apps, temporary developer controls,
  Expo Go chrome, debug labels, the Form Test selector, or test-server URLs.
- Archive the approved raw captures and final images with the tested commit hash.


## September 20 preparation for the two registered devices

The owner's iPad A16 and brother's iPhone 16 Pro are the native capture devices.
Their raw capture sizes need not be stretched to the store canvas. Use the
existing marketing-frame plan: place the genuine, complete native capture in a
1320 x 2868 iPhone or 2064 x 2752 iPad canvas at its original aspect ratio, with
plain Flap Fit background/headline space around it. Keep iPad captures in the
iPad set and phone captures in the phone set. Do not create a fake larger-device
UI, fabricate gameplay/metrics or claim these are 13-inch physical-device tests.

This is the production route, not completed images or proof Apple accepted them.
Apple [guideline 2.3.3](https://developer.apple.com/app-store/review/guidelines/#accurate-metadata)
permits overlays while requiring the real app in use. The required output pixel
dimensions still apply. Preserve raw images, exact installed build ID and visible
content; inspect final readability, no alpha and actual upload acceptance.
The eight-scene marketing set above is optional scope, not eight new acceptance
tests or a requirement to unlock/fabricate all progression. One to ten genuine
images per required set satisfy the count requirement; select representative
real screens available during the already planned acceptance pass. Final image
creation and upload remain after accepted-device captures; no extra device,
simulator build, paid service or pull-up test is required by this preparation.
