# Flap Fit launch monetization integration plan

Status: approved product strategy, implementation intentionally waits for the current gameplay and
Form Test candidate to pass the morning Expo Go test. Do not add packages or change the lockfile
without the user's explicit approval.

## Smallest package set

Install only:

- `react-native-google-mobile-ads` for iOS and Android AdMob interstitials, UMP privacy choices, and
  impression-level revenue callbacks; and
- `react-native-purchases` version 10.2.0 or newer for RevenueCat configuration and ad-event tracking.

Do not add `react-native-purchases-ui` for the first ad-funded candidate. A paywall and paid ad-free
entitlement are a later product step, so its native UI package is unnecessary now.

These are native packages. AdMob cannot function inside Expo Go. RevenueCat has an Expo Go preview
mode, but real RevenueCat and AdMob behavior must be tested in a newly built native candidate. The
app must keep an Expo Go no-op adapter so installing the packages does not break ordinary gameplay
testing there.

## Values required before implementation

- AdMob account approved for the app.
- iOS AdMob app ID for bundle `com.flapfit.game`.
- Android AdMob app ID for package `com.flapfit.game`.
- One iOS interstitial ad-unit ID.
- One Android interstitial ad-unit ID.
- UMP privacy messages configured in AdMob for applicable regions.
- RevenueCat project with Ad Monetization enabled.
- RevenueCat iOS and Android public SDK keys.
- AdMob impression-level revenue enabled and the AdMob account connected to RevenueCat.

App IDs, ad-unit IDs, and RevenueCat public SDK keys may be present in the built client. AdMob or
RevenueCat account credentials, service-account files, private keys, and store shared secrets must
never be committed or bundled.

## Runtime design

Create one typed monetization service with these behaviors:

1. In Expo Go and web, expose safe no-op methods. Gameplay, recording, sharing, and navigation must
   behave exactly as if no ad is available.
2. In a signed iOS or Android build, request current UMP consent information at launch and present a
   required message before the first ad request.
3. Delay AdMob measurement initialization until the privacy flow permits an ad request.
4. Request non-personalized ads only for launch. Do not request IDFA or add an ATT prompt.
5. Never pass exercise, camera, recording, player name, score, training time, evolution, challenge,
   location, contacts, or other health/gameplay attributes to AdMob or RevenueCat.
6. Initialize RevenueCat independently. An AdMob or RevenueCat error must resolve to a no-ad path and
   must never block app launch, calibration, play, result saving, recording, sharing, or navigation.
7. Track only the ad lifecycle and impression-level fields RevenueCat requires: mediator, format,
   placement, ad-unit ID, impression ID, network, revenue micros, currency, and precision.
8. Keep the RevenueCat anonymous identifier separate from the Supabase competition player ID.

## Approved placement state machine

An interstitial is eligible only after the player deliberately taps Done, Try Again, or Next Level on
a result screen. Never show an ad automatically when the result appears.

- Normal run: action tap -> show a ready eligible ad -> ad close/failure -> perform the action once.
- Record & Play run: share flow -> return to Flap Fit -> action tap -> show a ready eligible ad -> ad
  close/failure -> perform the action once.
- No ready ad, no consent, offline, SDK error, timeout, or remove-ads entitlement: perform the action
  immediately.

Use a single completion guard so close, dismissal, timeout, error, and component cleanup cannot run
the selected action twice. Clear the pending action when the result screen unmounts. An ad loaded for
an obsolete result must never appear on a later run.

Do not show ads:

- during the countdown, calibration, gameplay, recording, or native share sheet;
- when opening the app or returning from the background;
- before a player has completed a first run;
- from onboarding, camera/microphone permission, Terms, Privacy, deletion, report, or safety flows;
- after an ad-free entitlement becomes active; or
- to recover from an earlier failed ad request.

The final frequency cap must be selected before implementation. Recommended launch default: at most
one interstitial after every two eligible result exits and never more than one within 90 seconds.
This recommendation reduces accidental repetitive ads during short failed runs without changing
unlimited free play.

## Privacy and user control

- Add an Info-screen Privacy and cookie settings row whenever UMP reports that a privacy-options entry
  point is required.
- The control must reopen the current UMP privacy form without resetting game data.
- Update the public Privacy Policy, in-app privacy explanation, Apple App Privacy, and Google Data
  Safety from observed network behavior in the exact signed build.
- Mark Google Play's Ads declaration as Yes only after the SDK is present in the submitted AAB.
- Keep ads clearly identifiable and rely only on the SDK's visible close/skip and inappropriate-ad
  reporting controls.

## Required verification

Use Google test ad-unit IDs until the complete flow passes. Never click live ads during testing.

- Expo Go opens and all gameplay paths work with the no-op adapter.
- TestFlight and Play internal candidates initialize without an ad available.
- UMP required, not-required, accepted, declined, and privacy-options reopening paths work.
- A result never triggers an ad until the player taps an eligible action.
- Record & Play never shows an ad before the share sheet returns.
- Ad close, load failure, show failure, offline state, backgrounding, and timeout perform the selected
  action exactly once.
- First run and the final frequency cap behave as specified.
- RevenueCat sandbox data receives loaded, displayed, opened, failed, and paid-impression events with
  the same unique impression ID and correct revenue-micros conversion.
- No exercise, score, training, camera, recording, player, or challenge value appears in the ad or
  RevenueCat event payloads.
- Cold start, camera calibration, recording, and local result saving still work if both SDKs fail.
- The final App Store and Play declarations match the exact tested binaries.

## Implementation authorization checkpoint

Before changing dependencies, present the package names, resolved versions, lockfile diff, required
AdMob/RevenueCat values, and the chosen frequency cap to the user. Proceed only after approval.
