# EAS project and artifact evidence

Verified: 2026-09-15

This file records non-secret release evidence for the active Flap Fit mobile app. Re-run the checks
immediately before producing the final store artifacts.

September 16 update: the same EAS project ID was transferred from `sportaholic` to the
`flapfitapp` organization. The current `app.json` owner and release validator both use
`@flapfitapp/flapfit`. The September 15 account listing below is historical evidence,
not the current owner.

## Linked project

- Expo account: `sportaholic`
- EAS project: `@sportaholic/flapfit`
- EAS project ID: `bbbfea4f-3047-46f6-a5ba-6286356e4718`
- The ID matches `apps/mobile/app.json`.
- The EAS `production` environment currently has no separate server-side variables configured.
- All seven validated public release values are now present directly in the checked-in development,
  preview, and production build profiles. The additional `EXPO_USE_PRECOMPILED_MODULES=0` build
  control is also explicit. No Supabase service-role secret is present.
- The installed EAS CLI successfully resolves both production profiles without queuing a build:
  iOS uses store distribution, automatic build-number incrementing, the production environment, and
  the `m-medium` resource class; Android uses store distribution, automatic version-code
  incrementing, the production environment, and the `app-bundle` build type.

Read-only `eas config` checks on September 15 resolved both current production profiles successfully:
iOS uses store distribution, remote credentials, automatic build-number increments, the production
environment, and the `m-medium` resource class; Android uses store distribution, remote credentials,
automatic version-code increments, the production environment, and `app-bundle`. Both resolved all
seven public release values from the checked-in profile. This does not establish that the public
website paths are live; link verification remains a separate hard gate before a production build.

## Existing artifacts

The linked project still has no iOS build and no production-distribution build as of the September 15
read-only EAS build listing.

| Build ID                               | Platform | Profile | Distribution | Status   | Created (UTC)           | Assessment                                       |
| -------------------------------------- | -------- | ------- | ------------ | -------- | ----------------------- | ------------------------------------------------ |
| `92d7a239-5b89-4c88-9891-54b2ce20a145` | Android  | preview | internal     | finished | 2026-09-13 07:10:37 UTC | Expiring APK; not a Google Play release artifact |
| `fb8822a8-d254-4dd1-8a46-a248987cdaa4` | Android  | preview | internal     | errored  | 2026-09-13 06:58:32 UTC | Failed preview; not releasable                   |

The successful preview APK was built from older source and expires on 2026-09-27. It cannot stand in
for either the final Android AAB or the iOS App Store archive.

## Current local export evidence

On September 15, source commit `b08fb1d` completed fresh production-mode Expo exports for both
platforms without changing dependencies or the lockfile:

- iOS bundled 3,561 modules, a 7 MB Hermes bundle, and 106 assets.
- Android bundled 3,655 modules, a 7.2 MB Hermes bundle, and 110 assets.
- Both exports included all six exercise images, all 70 bird-evolution images, the splash logo, the
  bundled pose model, and the SIMD plus non-SIMD tracker runtimes.

These exports prove the current JavaScript and asset graph bundles for both platforms. They are not
signed native artifacts and do not replace TestFlight or Play internal testing.

## Generated native configuration evidence

A read-only Expo config-plugin introspection on September 15 produced the following native values
without generating iOS or Android project folders:

- App name `Flap Fit`, version `1.0.0`, URL scheme `flapfit`, and package/bundle ID
  `com.flapfit.game` on both platforms.
- The splash uses the transparent approved Flap Fit logo at 340 px over native `#0F172A` navy.
  Corner and exposed-background pixel checks match that color exactly, so no embedded logo square
  appears. The app icon and Android adaptive foreground are separately locked by release validation.
- iOS contains the full camera and optional Record & Play microphone usage descriptions, declares
  no non-exempt encryption, disallows arbitrary network loads, declares no tracking, and includes
  four collected-data plus four required-reason API categories.
- Android requests only INTERNET, VIBRATE, CAMERA, and RECORD_AUDIO, disables cleartext traffic, and
  disables backup. Overlay, location, calendar, contacts, and external-storage permission entries
  are present only as `tools:node="remove"` manifest directives and are not requested capabilities.

Inspect the final signed artifacts again because native AdMob and RevenueCat plugins will intentionally
change the generated manifests after monetization is approved and integrated.

## Current toolchain requirements

- Apple has required App Store uploads to use Xcode 26 and an iOS 26 SDK since 2026-04-28.
- EAS's current `auto` / `sdk-57` iOS image uses Xcode 26.6. The production profile leaves the image
  on `auto`, so Expo SDK 57 selects that compatible image.
- Google Play requires new phone apps and updates submitted after 2026-08-31 to target Android API
  36 or newer. Flap Fit explicitly compiles and targets API 36.
- Google Play production delivery requires an AAB. The production profile explicitly uses
  `app-bundle`.

Official sources:

- https://developer.apple.com/news/upcoming-requirements/
- https://docs.expo.dev/build-reference/infrastructure/
- https://support.google.com/googleplay/android-developer/answer/11926878

## September 16 current-source iOS and Android JavaScript exports

Commit `207a685` completed an offline `expo export --platform ios --max-workers 1` with the
existing locked dependencies. Metro bundled 3,562 modules in 179,806 ms and emitted 106 assets,
one 7,011,070-byte Hermes bundle, and `metadata.json` (108 files total). The bundle SHA-256 was
`23A0C34FEA2B72957FFC2F1FB0922C6B582E14424EC8249675362EE10F3E4872`.
The exported assets included all six exercise illustrations, 70 evolution-stage images, the
pose model, and both local MediaPipe Wasm variants. The verified temporary output was removed
after inspection and can be regenerated from the committed source.

The same commit completed an offline Android export with one Metro worker. Metro bundled 3,656
modules in 528,654 ms and emitted 110 assets, one 7,240,408-byte Hermes bundle, and metadata
(112 files total). The Android bundle SHA-256 was
`E190E66C984C96AD5704EE3F1F1EAC79C54EF4B50EB1DE679F6F93CC58F46DAF`.

This proves current-source JavaScript packaging only. It does not prove signed native startup,
camera/microphone permissions, offline tracker loading, recording, or store acceptance.
Native ad dependencies and production tracker approval remain separate gates.

## Required final evidence

- A production iOS build generated from the final release commit, processed by App Store Connect,
  installed through TestFlight, and exercised on a physical iPhone.
- A production Android AAB generated from the same final release commit, uploaded to Play internal
  testing, reviewed through the pre-launch report, and exercised on a physical Android device.
- Build logs showing the release validator passed and the iOS build used Xcode 26 or newer.
- Exact build IDs, source commit, version/build numbers, test devices, test date, and tester results.
