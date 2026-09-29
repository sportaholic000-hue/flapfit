# Android build 4 failure and compatible compiler repair

## Approved attempt

- EAS build: https://expo.dev/accounts/flapfitapp/projects/flapfit/builds/b91fc89c-0177-46e8-a739-99dec5f8af15
- Source: d06b63e5b38ac6236dbc5249a7a1249e3cb43c93 on codex/android-closed-testing.
- Profile: android-closed-testing; store AAB; app 1.0.0; version code 4; official Google test ads.
- Result: ERRORED. This is the third approved Android cloud attempt, not a fourth attempt.
- Gradle could not resolve io.github.lukmccall.pika:pika-compiler:0.3.2-2.3.21 for :expo:kotlinCompilerPluginClasspathRelease. It stopped during dependency resolution, before Google Ads compilation in this attempt.
- No AAB was produced or uploaded to Google Play. The existing private release draft now has the matching name 1.0.0 (4) - Android internal test, with no bundle or rollout.
- Expo billing after failure: Android 3/15 used, 12 remaining; iOS 15/15; waived 2/10; estimated bill USD 0. No fourth cloud attempt is authorized or started.

## Source correction

Only apps/mobile/app.json changes in application source: expo-build-properties.android.kotlinVersion goes from 2.3.21 to 2.3.20. The existing Android-only root compiler pin continues to derive its version from that setting. Maven Central publishes Pika 0.3.2's compiler for 2.3.20 but not 2.3.21; installed Expo modules core explicitly uses Pika 0.3.2. No compiler metadata validation is bypassed and no SDK dependency, lockfile, gameplay or ad-rule change is made.

Source evidence: https://repo.maven.apache.org/maven2/io/github/lukmccall/pika/pika-compiler/maven-metadata.xml and installed node_modules/expo-modules-core/expo-module-gradle-plugin/build.gradle.kts. The original root compiler selection issue is https://github.com/expo/expo/issues/49668.

## Local verification

- Real Gradle 9.3.1 fixture with Java 17, installed React Native Gradle plugin 0.86.3 and the actual root pin function resolved Kotlin compiler 2.3.20, Pika compiler 0.3.2-2.3.20, Compose compiler 2.3.20 and KSP API 2.3.7.
- Google Ads 25.4.0 API source compiled successfully with the real Ads and Ads API jars.
- Pika and Compose compiled together with Google's published Compose runtime 1.7.6 (repository checksum verified). The fixture then ran generated Pika introspection successfully: PIKA_GENERATED_INTROSPECTION=PASS; BUILD SUCCESSFUL; exit 0.
- KSP plugin/dependency resolution passed. This fixture has no KSP processors; it does not establish processor execution or the complete app build.
- The first broader fixture omitted Compose runtime and failed locally for that test setup omission. Adding the official runtime to the temporary fixture corrected it; the app dependencies were not altered.
- Actual Expo Android native generation passed in a separate temporary folder. Root build.gradle and gradle.properties both use 2.3.20. Its candidate app.json exactly matches the final source file. No iOS native folder was generated.
- Strict release validation passed. Three focused suites / 18 tests passed, covering Android testing configuration, native AdMob privacy patch and compiler pin behavior. The full JavaScript suite was not repeated for this one native compiler setting; the previous full source check was 77 suites / 1729 tests.

Machine-readable evidence is in android-build-4-compiler-compatibility-2026-09-28.json. Local detailed logs and temporary fixtures are under the chat's outputs/android-internal-compiler-fixed-2026-09-28 and work/expo-compiler-compatibility directories.

## Preserved scope and remaining gate

The iOS main checkout remains clean at 0041d2680bd2db652dd26813c96e5489b5bc1dac and release/ios-1.0.0-build-8-submitted still points there. The iOS OTA channel, shared production services/settings and existing production profile are unchanged. Android RevenueCat remains off and the internal owner tester configuration is preserved.

The complete Android app, compiled AAB/manifest/16 KB libraries and real-device behavior remain unverified. Obtain explicit approval before using another cloud build allowance. If approved and successful, inspect the AAB before uploading it to the existing private internal release. Do not automatically retry, publish an OTA or roll out public/closed testing.
