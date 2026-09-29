# Android AGP / D8 / R8 verification — September 29, 2026

The generated application selected AGP 8.12.0 / D8 and R8 8.12.14 before this fix. This is below Google's documented Kotlin 2.3 support requirement. The Android config plugin now explicitly selects AGP 8.13.2, which resolves its bundled D8/R8 8.13.19. Kotlin remains 2.3.20, matching Expo's published Pika compiler plugin. No dependency lockfile, gameplay, SDK runtime behavior, ad settings, iOS release, OTA channel or production service changed.

## Actual application evidence

- Baseline: 8788f109f22ca30856da2f06f7568ae7069807a9 on codex/android-closed-testing.
- Generated Android from the actual apps/mobile project using its android-closed-testing profile; no copied compiler-only fixture.
- Gradle recorded the root AGP/Kotlin dependencies before and after, plus the selected builder JAR after the correction. Executed D8 and R8 with --version from the baseline builder JAR matching the resolved AGP dependency and from the fixed builder JAR captured in the actual classpath. Versions, evidence scope and checksums are in the companion JSON.
- Existing Expo Gradle wrapper 9.3.1 and Java 17.0.18 were used. Kotlin's compatibility table lists Gradle through 9.3.0 for KGP 2.3.20–2.3.21; the template's 9.3.1 patch version was retained, not independently certified by that table. AGP 8.13.2 is within its supported AGP range.
- Android native generation passed before and after; strict Android release validation and 24 tests across 3 suites passed. Conflicting/missing/duplicate AGP declarations fail rather than silently changing the template; repeated generation preserves the same pin.

## Local release attempt and remaining limit

The initial dependency check stopped because the verification JVM tried to write Android settings under C:\.android. The release attempt used a writable verification-specific Android user home and a 1 GiB JVM metaspace limit. These are local command options only, not application changes.

Attempted the actual application's :app:bundleRelease with automatic Android SDK downloads disabled. The task stopped during configuration because this computer has no configured Android SDK. SDK paths are unset and the usual local SDK installations are absent. Java alone is insufficient; the Android SDK, build tools, platform and native tools are also required.

**No complete AAB was produced. Application dexing, packaging, native binary compatibility and device behavior remain unverified. This correction is not evidence that another cloud build will certainly succeed.** A complete local release requires an Android development environment, or a separately authorized cloud build. No new cloud build is authorized or started here.

## Why the earlier Android test worked

EAS confirms successful Android preview build 92d7a239-5b89-4c88-9891-54b2ce20a145 from f2894715ee84cf1154d3370af95dbeda3afbce15 on September 13. Its log records react-native-google-mobile-ads 15.8.3 and Kotlin 2.1.20. The current source uses react-native-google-mobile-ads 16.5.0 with Google Ads 25.4.0 containing Kotlin 2.3 metadata. The old installation working does not establish that today's changed native dependencies can compile together.

The three recent cloud failures occurred earlier than dexing: two at Kotlin compilation, followed by a missing Pika 0.3.2-2.3.21 artifact. The previous change to 2.3.20 addressed the available compiler-plugin pairing. The AGP/R8 mismatch fixed here is an additional demonstrated compatibility gap, not a claim that it caused those earlier task failures.

## Isolation and publication

Protected iOS main and release/ios-1.0.0-build-8-submitted remain at 0041d2680bd2db652dd26813c96e5489b5bc1dac. No Apple, Google Play, RevenueCat, AdMob or OTA settings changed. No build credit used, artifact uploaded, or OTA published. The generated Android directory is verification output and is kept outside the worktree after the check, preserving Expo native generation for the next authorized build.

References: [Google Kotlin support](https://developer.android.com/build/kotlin-support), [AGP 8.13.2 release notes](https://developer.android.com/build/releases/agp-8-13-0-release-notes), [Kotlin Gradle compatibility](https://kotlinlang.org/docs/gradle-configure-project.html).
