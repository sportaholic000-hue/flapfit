# Store reviewer notes

Use this as the factual base for both review teams. Replace bracketed values and verify every step on
the exact production build before submission.

## Apple App Review notes

Flap Fit is a portrait fitness game in which front-camera pose estimation controls an animated bird.
The app is usable without registration or login.

Fast equipment-free review path:

1. On Home, select Squats and Sky.
2. Tap Play and grant camera access.
3. Place the phone upright on the floor or a stable chair about 1.5 to 2 metres away so the full body
   is visible.
4. The first two seconds are a reading/setup buffer. Stand comfortably for the top calibration,
   then use a comfortable squat for the lower calibration.
5. After the 3-2-1 countdown, alternate between those calibrated positions to move the bird.

No weights or pull-up bar are required for this review path. Live Camera changes only the game
background. Record & Play is optional and adds the temporary video/share flow described below.

Camera processing:

1. Choose an exercise and either Sky or Live Camera mode.
2. Tap Play or Record & Play.
3. Grant camera access.
4. Hold the two displayed calibration poses.
5. Complete the countdown and move through the calibrated range to control the bird.

Pose estimation runs on-device using a bundled MediaPipe model. Normal Play does not record or upload
camera video or request microphone access. Record & Play requests microphone access so the temporary
composed gameplay video can include the user's voice and workout sounds. The file remains in the app
cache, and the iOS share sheet appears only when the user chooses Share. Flap Fit never receives the
video or audio.

Compete is optional and uses an anonymous Supabase account. Before publishing a name, score,
challenge, or attempt, the player must accept the current Terms and community rules. Public
competition rows have a clearly labeled Report / Block control. The in-app deletion path is
Info > Delete online profile. No reviewer credentials are required.

The app has no HealthKit, location, or contact access. Microphone access is optional and used only
for Record & Play. Fitness and score estimates are not medical measurements. The fitness safety
notice is available at Info > Fitness safety. Replace this paragraph with the exact final ads,
purchases, subscriptions, consent, and analytics disclosure after monetization is integrated.

Support: **Troy Reardon, support@flapfitapp.com; [REQUIRED INPUT: review phone number]**

Privacy policy: **https://flapfitapp.com/privacy/**

Terms: **https://flapfitapp.com/terms/**

## Google Play App access and review notes

All gameplay can be reviewed without login credentials. Compete automatically creates a pseudonymous
anonymous account only when its online API is used; it does not request email, phone number, or a
password.

The camera, calibration, gameplay, and Record & Play test steps are the same as the Apple steps
above. The Android manifest requests CAMERA, RECORD_AUDIO, INTERNET, and VIBRATE. Microphone access
is requested only after the user selects Record & Play. External storage, contacts, calendar,
location, and overlay permissions remain explicitly blocked.

Health declaration: Activity and Fitness. Flap Fit records exercise routines and tracked in-game
training time, but is not a medical app and does not access Health Connect.

UGC test:

1. Open Compete.
2. Review and accept Online Competition Terms.
3. Set a player name.
4. View leaderboards or create/find a challenge.
5. Use Report / Block beside another player's leaderboard result, challenge, or challenge attempt.
6. Use Info > Delete online profile to remove the anonymous account and associated competition data.

Before submission, add the exact final ads and in-app-purchase disclosure from the tested production
build.

Public account-deletion page: **https://flapfitapp.com/delete-account/**

Privacy policy: **https://flapfitapp.com/privacy/**

Support contact: **support@flapfitapp.com**
