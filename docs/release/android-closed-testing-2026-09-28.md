# iOS preservation and Android closed-test preparation

Date: September 28, 2026. Source-only preparation; no build, upload, OTA publication or store submission was started.

## Preserved iOS release

- Source commit: 0041d2680bd2db652dd26813c96e5489b5bc1dac.
- GitHub annotated tag: release/ios-1.0.0-build-8-submitted.
- Expo build: 12ea424d-e4d4-47ce-a45d-455b649c829a; version 1.0.0, build 8, production profile, iOS store distribution, FINISHED. Current EAS readback matches the commit above.
- Apple app: 6813280704; saved build resource: 3a688b18-6ba2-4874-a977-108e3871dbe3; submission: 5e2ee5b1-42bd-4bc8-899a-6e1874d3c99a.
- Evidence limit: saved Apple submission evidence identifies build 8. Today's live Apple assignment could not be refreshed because the owner session was signed out and browser control timed out. The tag identifies source/build provenance and does not claim Apple approval.
- Before the tag push, authenticated GitHub checks returned zero Actions workflows and no repository webhooks. Expo returned no GitHub build or workflow-job triggers. The tracked Apple device-registration workflow is manual only. The tag push completed without starting a build or deployment.
- The original main checkout remains clean at the preserved commit. No existing work was reset, discarded or folded into this Android branch.

## iOS OTA route, unchanged

- Project/update URL: https://u.expo.dev/bbbfea4f-3047-46f6-a5ba-6286356e4718.
- Channel and linked branch: production / production.
- Build 8 native runtime: 469f66ace28d0ea7661bb8681b0239739f8b3955.
- Embedded update: 06f75d0d-246b-46b5-83b0-d844ce2374f5, created 2026-09-26T04:57:31.407Z.
- Matching server response checked September 28: 01a0d78c-8073-79eb-8934-8943a50f6365; group ff026750-f9cf-45ef-bdf9-9ebb1fa82ec3, created 2026-09-25T07:51:44.499Z. This is the older build-7-era championship/test-ad update.
- The server update is older than build 8's embedded app. Native update selection should reject that older update. This readback is not a new on-device update acceptance test.
- OTA support is already embedded in build 8. Publishing an OTA before App Store submission is not required to enable future updates. A future approved iOS publication must be newer and match this channel, platform, environment and native runtime. Native compatibility checks must not be bypassed.
- Automatic update checks remain NEVER, launch wait remains zero, and embedded startup/recovery remains enabled. The existing Info update flow is unchanged.
- A Git tag freezes source, not the mutable Expo channel. No channel, branch mapping, update or shared environment was changed here.

## Android isolation and decisions

- Branch: codex/android-closed-testing, created directly from the preserved commit.
- Worktree: C:/Users/money/Documents/Codex/flapfit-android-closed-testing.
- Separate local dependency installation; no link or shared writable node_modules with the iOS checkout.
- New standalone EAS profile: android-closed-testing; store-distribution Android App Bundle, environment preview, version-code auto-increment, separate channel android-closed-testing. It cannot pass release validation for iOS.
- Official Google test interstitials are selected through the existing test-ad mode for the closed test. The original production profile remains live and unchanged. There is no build-number-specific ad override.
- Android package: com.flapfit.game. Existing Android AdMob app ID: ca-app-pub-5933597810180440~7891791204. Existing production Android interstitial ID remains ca-app-pub-5933597810180440/4539316666; test mode uses Google's official test unit instead.
- Owner clarified RevenueCat was included for the iOS competition and is not needed for Android. Android RevenueCat remains uninitialized under the existing native guard; no Android native reporting port was added. AdMob can operate independently. iOS RevenueCat source, project/settings and native patches are unchanged.
- Existing dependencies and lockfile, game/pose tracking, exercise rules, championship flow, result handling, ad timing/frequency, backend code and production settings are unchanged.

## Android source changes

1. Enable the existing neutral, locally saved age answer on Android. It is never treated as Apple verification. Preserve the existing country, age, province/state, notice and refusal rules.
2. Restore Android's age/location setup before monetization and apply the existing setup checks before repeat runs. Checks are before camera/gameplay admission; there is no new work in the pose loop.
3. Enable the existing native Google UMP privacy-options and stored-signal reader on Android. Missing/malformed provider values stay unknown.
4. Add a version- and hash-pinned patch for two existing Android Google Mobile Ads bridge files. It exposes only reduced, presence-aware UMP signals and disables Google's publisher first-party ID after initialization, before declaring ads ready. Drift causes a failure instead of silently weakening the privacy settings.
5. Normalize that patch's final native contents for fingerprints before/after native generation and retain the platform path/line-ending protections. Native compatibility protection remains enabled.
6. Apply existing strict release/tracker/monetization validation to the separate Android test profile. Enforce a separate channel, test ads and store AAB format. No release profile was replaced or relaxed.

## Local verification

Validation results are recorded in the companion android-closed-testing-2026-09-28-checks.json. Configuration introspection verifies the Android app ID, delayed measurement initialization, blocked advertising-ID permissions, disabled backup/cleartext traffic, portrait/share-return configuration and manual-only OTA settings. This is not a compiled merged-manifest or device verification.

Tests cover Android local age setup, restart restoration, province corrections, refusal handling, UMP signals, native patch drift/idempotence, fingerprint normalization, setup dismissal, uninterrupted admitted gameplay and ads working while RevenueCat stays off. Existing iOS and gameplay regressions remain in the full suite.

## Account checks before upload and tester distribution

- Regain a working authenticated browser and verify the Play Console app/account state, package, closed-testing availability, relevant countries and tester setup. No testers or Play settings were changed here.
- Read back the Android AdMob application's status and verify that its applicable UMP messages cover this Android app. Do not change the iOS app or shared production messages/settings as an incidental step.
- Review Android-specific Data Safety, ads, target audience, app access, wellness/UGC declarations, support/privacy links and Android screenshots/store assets. iOS answers must not simply be copied: Android RevenueCat is off and the age flow is local rather than Apple's age service.
- Confirm the new EAS profile resolves the intended preview environment without changing shared environment values. The validator rejects configuration differences. No remote Android channel has been created or linked yet.
These account checks do not block source preparation and do not require any Apple account changes. Obtain the owner's approval before any cloud/native app build, upload, publication or submission.

After an approved Android build, verify the compiled manifest/SDK settings and 16 KB native-library compatibility, then install it on real Android devices. Test camera/microphone denial and recovery, offline startup, all exercise modes, immediate result exits, test ads and regional switching, recording/share return, achievements/championships and the manual update screen. Source tests/export alone cannot establish these device behaviors.

Google's qualifying closed-test requirement for affected new personal accounts is at least 12 testers continuously opted in for 14 days, followed by applying for production access. An internal test is a different track. The account's exact requirement still needs Console verification: https://support.google.com/googleplay/android-developer/answer/14151465?hl=en.

If Apple requests an iOS source repair, start from the preserved tag in a separate checkout. Do not merge this Android branch into main or publish an all-platform update as part of Android work.
