# EAS project and artifact evidence

Verified: 2026-09-14

This file records non-secret release evidence for the active Flap Fit mobile app. Re-run the checks
immediately before producing the final store artifacts.

## Linked project

- Expo account: `sportaholic`
- EAS project: `@sportaholic/flapfit`
- EAS project ID: `bbbfea4f-3047-46f6-a5ba-6286356e4718`
- The ID matches `apps/mobile/app.json`.
- The EAS `production` environment currently has no variables configured.

The missing production variables are an intentional hard stop. The EAS post-install hook must reject
a production build until all public legal/support links and the dedicated Supabase project values are
live.

## Existing artifacts

The linked project currently has no iOS build and no production-distribution build.

| Build ID                               | Platform | Profile | Distribution | Status   | Created (UTC)           | Assessment                                       |
| -------------------------------------- | -------- | ------- | ------------ | -------- | ----------------------- | ------------------------------------------------ |
| `92d7a239-5b89-4c88-9891-54b2ce20a145` | Android  | preview | internal     | finished | 2026-09-13 07:10:37 UTC | Expiring APK; not a Google Play release artifact |
| `fb8822a8-d254-4dd1-8a46-a248987cdaa4` | Android  | preview | internal     | errored  | 2026-09-13 06:58:32 UTC | Failed preview; not releasable                   |

The successful preview APK was built from older source and expires on 2026-09-27. It cannot stand in
for either the final Android AAB or the iOS App Store archive.

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

## Required final evidence

- A production iOS build generated from the final release commit, processed by App Store Connect,
  installed through TestFlight, and exercised on a physical iPhone.
- A production Android AAB generated from the same final release commit, uploaded to Play internal
  testing, reviewed through the pre-launch report, and exercised on a physical Android device.
- Build logs showing the release validator passed and the iOS build used Xcode 26 or newer.
- Exact build IDs, source commit, version/build numbers, test devices, test date, and tester results.
