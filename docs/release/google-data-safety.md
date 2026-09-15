# Google Play declarations worksheet

Last source review: 2026-09-15

This worksheet covers the current Flap Fit 1.0 source and must be checked against the exact AAB and
live Supabase configuration before the Play Console forms are submitted.

Official references:

- https://support.google.com/googleplay/android-developer/answer/10787469
- https://support.google.com/googleplay/android-developer/answer/14738291
- https://support.google.com/googleplay/android-developer/answer/13327111
- https://support.google.com/googleplay/android-developer/answer/9876937
- https://support.google.com/googleplay/android-developer/answer/11926878

## Data Safety top-level answers

- Does the app collect or share required user data types? **Collects**
- Is data shared with third parties? **No**, provided Supabase is used only as Flap Fit's contracted
  service provider. User-directed OS sharing is not Flap Fit collection or third-party sharing.
- Is collected data encrypted in transit? **Yes**, after the live API is verified to use HTTPS/TLS.
- Can users request deletion? **Yes only after both deletion paths are live and tested.**
- Is all collection optional? **Yes.** Online competition can be avoided while the rest of the game
  remains usable.
- Is any data used for advertising or marketing? **No**
- Is any data sold? **No**

## Data types to select

For every row below select **Collected**, **Not shared**, **Not processed ephemerally**, and
**Users can choose whether this data is collected**.

| Google category and data type               | What is sent                                                                 | Purpose                                                 |
| ------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------- |
| Personal info > Name                        | User-chosen player nickname                                                  | App functionality, Account management                   |
| Personal info > User IDs                    | Supabase anonymous account ID                                                | App functionality, Account management                   |
| Health and fitness > Fitness info           | Exercise category and active run duration associated with online competition | App functionality                                       |
| App activity > Other actions                | Leaderboard scores, challenge targets, codes, and attempts                   | App functionality                                       |
| App activity > Other user-generated content | Player names plus report/block submissions                                   | App functionality, Fraud prevention/security/compliance |

Before the final form, inspect the live Supabase logging configuration. Add **App info and
performance > Diagnostics** only if request/error telemetry is retained beyond short-lived request
processing. Declare **Approximate location** only if IP addresses are actually used to infer
location. The current app does not request Android location permissions and does not perform that
inference.

## Data not collected by Flap Fit

- Camera images: on-device pose processing only.
- Record & Play video: temporary local cache only, then a user-directed system share sheet.
- Audio: Record & Play can request microphone permission and add sound to the temporary local video,
  but Flap Fit does not transmit or collect the audio.
- Local training history, bird/evolution state, and level progress: device-only.
- Contacts, location, calendar, external storage, payments, purchase history, advertising IDs,
  analytics, and Health Connect data: not used by the current source.

## Health apps declaration

Every Play app must complete the declaration. For Flap Fit select:

- **Health and fitness > Activity and Fitness**
- The app monitors/records exercise routines and tracked in-game training time.
- It is a fitness game, not a medical device.
- It does not diagnose, treat, cure, or prevent a condition.
- It does not read or write Health Connect data.
- It does not request body sensors, activity recognition, or location permissions.

Do not select “My app doesn't provide any health features.”

## Account and data deletion

Using Compete creates a Supabase anonymous account even though no email or password is requested.
Treat Google Play's account-deletion rule as applicable.

- In-app deletion path exists: Info > Delete online profile.
- It deletes the Supabase auth user and cascades through the public profile, scores, challenges,
  attempts, and blocks. A minimized moderation report can remain until review and for up to 180 days
  after resolution, with the deleted account's user identifier removed.
- A public web deletion resource is still required:
  **https://flapfitapp.com/delete-account/**
- The production build requires this URL as `EXPO_PUBLIC_ACCOUNT_DELETION_URL`, and the same page is
  linked from Info > Account & data deletion.
- The page must name Flap Fit, make the request path prominent, work without reinstalling the app,
  explain what is deleted/retained, and provide a functional support email or form.

## UGC and moderation

- Versioned Terms acceptance is required before the app publishes a player name, score, challenge,
  or challenge attempt.
- The API rejects protected publishing requests without the current Terms version.
- Terms prohibit obscene/sexual content, hate/discrimination, threats, harassment, bullying,
  impersonation, fraud, spam, unlawful content, cheating, score manipulation, and service abuse.
- Server-side name filtering runs before publication.
- Report / Block is clearly labeled beside public leaderboard results, challenges, and challenge
  attempts.
- Reports are persisted for moderation and blocked users are hidden from the reporter.
- The Flap Fit operator monitors support@flapfitapp.com. Response targets, takedown decisions, and
  urgent escalation are documented in `moderation-runbook.md`.

## Other Play Console declarations

- Ads and SDK data collection: **Do not submit these answers yet. Re-evaluate from the exact
  monetized build after the approved AdMob and RevenueCat integration.**
- In-app purchases: **No for Flap Fit 1.0.** There is no product, subscription, paywall, purchase,
  restore, or remove-ads feature. RevenueCat is used only for ad-event reporting.
- App access: no login credentials required. Explain the optional anonymous Compete profile.
- Target audience: **13 and older**. Do not select children under 13 unless the app and website are
  intentionally brought into full Families-policy compliance.
- Content rating: answer Yes for user-generated content and answer the fitness/exercise questions
  accurately. Do not claim medical treatment functionality.
- Target API: Android 16 / API 36 is configured, satisfying the requirement effective
  August 31, 2026.
- Release artifact: production must be an AAB.
- Store listing: privacy policy URL, support contact, screenshots, phone/tablet declarations as
  applicable, and a 1024 x 500 feature graphic are required.
