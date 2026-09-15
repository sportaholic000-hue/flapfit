# Apple App Privacy worksheet

Last source review: 2026-09-15

This worksheet describes the current Flap Fit 1.0 source. Re-check it against the exact production
binary and live Supabase configuration before publishing the App Privacy answers.

Official references:

- https://developer.apple.com/app-store/review/guidelines/
- https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy
- https://developer.apple.com/documentation/bundleresources/app-privacy-configuration/nsprivacycollecteddatatypes/nsprivacycollecteddatatype

## Top-level answer

Select **Yes, we collect data from this app** because the optional online competition feature sends
data to the Flap Fit Supabase service. The camera and normal training history remain on-device.

## Data types to declare

| Apple data type       | Current source behavior                                                                                                         | Linked to user?                           | Tracking? | Apple purpose     |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | --------- | ----------------- |
| User ID               | Supabase anonymous user ID and player screen name/handle                                                                        | Yes, to the anonymous competition profile | No        | App Functionality |
| Gameplay Content      | Exercise category, leaderboard score, active run duration, challenge target/code, and challenge attempts                        | Yes                                       | No        | App Functionality |
| Fitness               | Exercise category and active run duration attached to an online score or challenge result                                       | Yes                                       | No        | App Functionality |
| Other User Content    | Player-entered competition content plus reports and blocks                                                                      | Yes                                       | No        | App Functionality |
| Other Diagnostic Data | Ordinary request, error, and security logs retained by the production service provider, if the final Supabase plan retains them | Confirm after provisioning                | No        | App Functionality |

Apple's privacy taxonomy places account management, fraud prevention, and security needed to run
the feature under **App Functionality**. Do not enter the Google Data Safety purpose labels in App
Store Connect.

All online categories are optional because a user can play levels, Endless, use camera tracking,
record locally, and retain local progress without using Compete.

## Do not declare as collected by Flap Fit

- Photos or Videos: camera frames are processed live on-device. Record & Play produces a temporary
  local composed video. Flap Fit does not upload it.
- Audio Data: Record & Play can request microphone access and add sound to the temporary local
  video, but Flap Fit does not upload or receive that audio. It is not collected by Flap Fit.
- Precise or Approximate Location: the app does not request location and does not use IP addresses
  to infer location.
- Contacts, email, phone number, payment information, purchases, advertising data, or browsing
  history: not collected by the current source.
- Local bird choice, level progress, training history, and tracked training time: stored only in
  AsyncStorage on the device.

The operating system share sheet is user-directed. The destination selected by the user receives the
video or message under that destination's terms; Flap Fit does not receive a copy.

## Required App Store Connect answers

- Privacy Policy URL: **https://flapfitapp.com/privacy/**
- User Privacy Choices URL: use the public deletion/privacy-controls page once live.
- Data used for tracking: **No**
- Third-party advertising, analytics, purchases, and subscriptions: **Do not submit these answers
  yet. Re-evaluate from the exact monetized build after the approved ad and RevenueCat integration.**
- HealthKit: **Not used**

## Apple review-specific checks

- In-app privacy summary: Info > Privacy & camera data.
- Public privacy policy link: Info > Full privacy policy.
- In-app account deletion: Info > Delete online profile.
- UGC filtering: server-side player-name validation and moderation filter.
- UGC reporting/blocking: clearly labeled Report / Block action on public leaderboard results,
  challenges, and challenge attempts.
- UGC contact information: **support@flapfitapp.com**
- Timely moderation: **Flap Fit operator; targets and urgent escalation are documented in
  `moderation-runbook.md`.**
- Fitness disclaimer: Info > Fitness safety.
- Camera and microphone permission text explains on-device tracking and optional local recording.

## App privacy manifest

`apps/mobile/app.json` now generates an app-level `PrivacyInfo.xcprivacy` with:

- tracking disabled and no tracking domains;
- the User ID, Gameplay Content, Fitness, and Other User Content collected-data declarations above;
- File Timestamp, Disk Space, User Defaults, and System Boot Time required-reason API declarations;
  and
- the exact reason codes shipped by the locked React Native, AsyncStorage, Expo Constants, and Expo
  FileSystem packages.

Expo warns that privacy manifests inside static CocoaPods are not always combined reliably, so these
SDK reasons are repeated at the app target. Inspect the generated privacy report from the final Xcode
26 build and reconcile it with App Store Connect before submission.

## Privacy-policy facts that must match the live service

The public policy must identify the legal operator, support contact, Supabase as a service provider,
the exact data above, purposes, retention periods, deletion process, international transfers if
applicable, and the rights available in each launch region. It must state that health/fitness data is
not used for advertising, marketing profiles, or data brokerage.
