# Android internal test: first build and compiler correction

## Attempted build

- Owner approved exactly one Android build and delivery to their private internal test, at $0 within the free allowance.
- EAS build: https://expo.dev/accounts/flapfitapp/projects/flapfit/builds/9612aad0-d5f1-463a-ab76-0a2b1fb6d000
- Source: `89c61524bacb0caaa7501aa17c6a3997117a1732`, branch `codex/android-closed-testing`.
- Profile: `android-closed-testing`; Android store AAB; version 1.0.0, version code 2; official Google test ads.
- Result: ERRORED at `:react-native-google-mobile-ads:compileReleaseKotlin`. Google Ads 25.4.0 contains Kotlin metadata 2.3.0; the default Kotlin compiler 2.1.20 expected metadata 2.1.0.
- EAS post-install release/tracker checks and JavaScript bundling completed. No AAB was produced or uploaded to Google Play.
- The existing Android keystore was reused with frozen credentials. EAS created only the isolated Android channel/branch `android-closed-testing`; no OTA was published.
- Expo billing readback after failure: Free plan, 1/15 Android builds used, 15/15 iOS builds used, 2 waived builds, estimated bill $0. A retry still needs the owner's approval because it uses another build allowance.

## First correction (insufficient by itself)

The only app configuration change after this failure is `expo-build-properties.android.kotlinVersion = "2.3.21"` in `apps/mobile/app.json`. The installed Expo tooling supports this property and selects its Kotlin 2.3-compatible KSP 2.3.7 path. No ad SDK downgrade, metadata-check bypass, dependency/lockfile change, gameplay change, or iOS setting change was made.

References: [Expo build properties](https://docs.expo.dev/versions/latest/sdk/build-properties/), [Kotlin Gradle compatibility](https://kotlinlang.org/docs/gradle-configure-project.html). Kotlin's published 2.3.21 compatibility table includes AGP 8.12.0 and Gradle 9.3; the failed EAS build used Gradle 9.3.1. These declarations do not establish a successful full application build.

## Local evidence after correction

- Downloaded the exact Google Ads and Ads API 25.4.0 AARs from Google's Maven repository and Kotlin compilers from Maven Central; verified repository checksums and recorded SHA-256 hashes.
- A small Kotlin source using the real Google `RequestConfiguration`, PG rating and `AgeRestrictedTreatment` APIs reproduced the same metadata mismatch with 2.1.20 and compiled successfully with 2.3.21. This is an isolated compiler/API check, not a complete Android app build.
- Expo native configuration introspection generated `android.kotlinVersion=2.3.21`. Other generated Android Gradle properties, the Android manifest and iOS Expo configuration compare unchanged with the pre-build record.
- Strict Android release validation passed. Five affected configuration/native-privacy suites passed: 38 tests. The earlier complete source verification remains 77 suites / 1,729 tests; the full suite was not rerun for this one-property native compiler change.
- No Android SDK is installed locally, so a full Gradle/native application build and final 16 KB ELF/manifest inspection remain unverified. No replacement cloud build was started.
- Local evidence: `C:/Users/money/Documents/Codex/2026-09-23/critical-architectural-context-repair-directive-read/outputs/android-internal-build-2026-09-28/` (compiler probe logs/result, native config comparison, focused tests and EAS logs). The probe source is in the sibling `work/probe-admob-kotlin.cjs` file.

## Google Play preparation, preserved

- Draft app: Flap Fit Workout Game, app ID `4976401729260557866`, package `com.flapfit.game`.
- Internal tester list `Flap Fit Owner Test` contains the owner's signed-in Google address and is selected/saved.
- A draft internal release named `1.0.0 (2) - Android internal test` and English (Canada) notes are saved. It has no bundle attached and has not been rolled out. Update the release name if a replacement build receives another version code.
- The internal opt-in link is not installable until a successful bundle has been inspected, uploaded and the internal release completed. This track does not begin the separate qualifying closed test.

## Isolation and next action

The iOS release remains `0041d2680bd2db652dd26813c96e5489b5bc1dac`, tagged `release/ios-1.0.0-build-8-submitted`. Main, iOS production OTA, shared environments/services and RevenueCat settings were not changed. Android RevenueCat remains off. Existing production profiles are unchanged.

Obtain approval for one replacement Android build before retrying. After success, validate the compiled AAB (package/version/permissions/SDK settings/16 KB native libraries), finish the private internal release and provide the owner's install link. Do not start an iOS build, publish an OTA or roll out closed/public testing as part of this step.

## Replacement attempt and root compiler pin

- Owner approved one replacement from `7b2d43ef5067a3cf2ba95b7c687c95ff13ccf1ca`: https://expo.dev/accounts/flapfitapp/projects/flapfit/builds/ac210475-c0c1-405c-b3eb-c1caa3c4ab37; version 1.0.0, Android version code 3, same isolated testing profile.
- It failed again at the Google Ads Kotlin compilation. Expo printed Kotlin 2.3.21 / KSP 2.3.7, but the compiler still expected metadata 2.1.0. No AAB was produced or uploaded.
- Installed React Native source brings Kotlin Gradle plugin 2.1.20 onto the root buildscript classpath, whose compiler declaration is unversioned. The Expo property alone does not replace the loaded compiler. This matches the first-hand SDK 57 report at https://github.com/expo/expo/issues/49668.
- The additional Android-only config plugin `withAndroidKotlinCompiler.cjs` pins the root compiler dependency to the explicit version already in expo-build-properties. It rejects missing/duplicate declarations, a conflicting pin, dynamic versions or an unexpected template language. It registers only an Android Gradle mod.
- Actual Expo Android native generation in a separate local fixture passed: generated root build.gradle has the explicit 2.3.21 compiler classpath and gradle.properties retains android.kotlinVersion=2.3.21. No iOS native directory was generated.
- Three affected suites passed, 18 tests (including seven new compiler-pin/template-drift tests). Strict release validation and lint for the changed files passed.
- Actual compiler selection is being checked with Gradle 9.3.1, the installed React Native Gradle plugin source and real Google Ads 25.4.0 jars in a local fixture. PASSED: Gradle reported ACTUAL_COMPILER=2.3.21 and completed :ads:compileKotlin with BUILD SUCCESSFUL. The initial local baseline runs were stopped while slow; the two cloud failures supply the failure evidence. This verifies the real compiler selection and Google Ads API compilation, not the complete Android application.
- The Google Play internal release draft now says 1.0.0 (3) - Android internal test. It has no bundle attached and has not been rolled out. The owner remains the sole selected internal tester.
- Expo billing after this attempt shows 2/15 Android builds used, 13 remaining, estimated bill $0. No third cloud build is authorized or started.
- Evidence is saved under C:/Users/money/Documents/Codex/2026-09-23/critical-architectural-context-repair-directive-read/outputs/android-internal-replacement-2026-09-28/. Local diagnostic runners and generated Android fixture are in the sibling work directory.
- No dependency versions, lockfile, ad rules, gameplay, iOS source/release/OTA, main branch or shared service settings were changed by this additional correction.
