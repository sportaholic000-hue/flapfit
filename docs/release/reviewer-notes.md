# Store reviewer notes

Use this as the factual base for both review teams. Replace bracketed values and verify every step on
the exact production build before submission.

## Apple App Review notes

Flap Fit is a portrait fitness game in which front-camera pose estimation controls an animated bird.
The app is usable without registration or login.

Camera processing:

1. Choose an exercise and either Sky or Live Camera mode.
2. Tap Play or Record & Play.
3. Grant camera access.
4. Hold the two displayed calibration poses.
5. Complete the countdown and move through the calibrated range to control the bird.

Pose estimation runs on-device using a bundled MediaPipe model. Normal Play does not record or upload
camera video. Record & Play creates a temporary, silent, composed gameplay video in the app cache and
shows the iOS share sheet only when the user chooses Share. Flap Fit never receives the video.

Compete is optional and uses an anonymous Supabase account. Before publishing a name, score,
challenge, or attempt, the player must accept the current Terms and community rules. Public
competition rows have a clearly labeled Report / Block control. The in-app deletion path is
Info > Delete online profile. No reviewer credentials are required.

Flap Fit 1.0 has no ads, purchases, subscriptions, analytics, HealthKit access, microphone access,
location access, or contact access. Fitness and score estimates are not medical measurements. The
fitness safety notice is available at Info > Fitness safety.

Support: **Troy Reardon, awesome-eh@hotmail.com; [REQUIRED INPUT: review phone number]**

Privacy policy: **[REQUIRED INPUT: public HTTPS URL]**

Terms: **[REQUIRED INPUT: public HTTPS URL]**

## Google Play App access and review notes

All gameplay can be reviewed without login credentials. Compete automatically creates a pseudonymous
anonymous account only when its online API is used; it does not request email, phone number, or a
password.

The camera, calibration, gameplay, and Record & Play test steps are the same as the Apple steps
above. The Android manifest requests CAMERA, INTERNET, and VIBRATE only. Microphone, external
storage, contacts, calendar, location, and overlay permissions are explicitly blocked.

Health declaration: Activity and Fitness. Flap Fit records exercise routines and tracked in-game
training time, but is not a medical app and does not access Health Connect.

UGC test:

1. Open Compete.
2. Review and accept Online Competition Terms.
3. Set a player name.
4. View leaderboards or create/find a challenge.
5. Use Report / Block beside another player's leaderboard result, challenge, or challenge attempt.
6. Use Info > Delete online profile to remove the anonymous account and associated competition data.

Flap Fit 1.0 contains no ads or in-app purchases.

Public account-deletion page: **[REQUIRED INPUT: public HTTPS URL]**

Privacy policy: **[REQUIRED INPUT: public HTTPS URL]**

Support contact: **awesome-eh@hotmail.com**
