# Android build-11 parity candidate — 2026-10-09

Android checkout: `C:\Users\money\Documents\Codex\flapfit-android-closed-testing`
Branch: `codex/android-lateral-calibration-guide`
Starting HEAD: `dc4b47056ac9a9864f435c2025bff9022c56473d` (clean before edits).

Authoritative application source: **`fcbf4e0c4bb2b5bdb07d85e5630f173786a72718`**, the source packaged in iOS build 11. Read the iOS handoff, TestFlight candidate and October 9 resubmission documents on `codex/ios-camera-permission-review`; the final application snapshot supersedes their intermediate history. This is a selected Android port, not a merge of the iOS branch.

## Adoption checklist

| Item | Status | Result / affected files |
|---|---|---|
| Final pushup entry gate | Ported | `apps/mobile/src/utils/game/html/{scriptCore,scriptFormTracking,scriptGame}.ts`; pushup-entry/form-tracking tests and landmark fixture. Exact final implementation: each arm visible and straight, fresh stable observations, shoulder/hip/knee depth alignment, at least one observed upper leg and agreement from any other observed leg. Tracking loss resets the hold. Feet are not required. Original short instructions retained. |
| All six exercises / 13 artwork poses | Ported | All files in `apps/mobile/assets/images/calibration/` are byte-identical to build 11. New `androidCalibrationImageData.ts`, adapted `experimentalCalibrationGuide.ts`/`gameHtml.ts`, embed script and artwork test. Original manifest filename retained for provenance. Existing vector/reference files remain as history/fallback. Android Camera-only guard, placement, stages, reach preparation and success fades retained. |
| Camera permission | Ported for Android | `apps/mobile/src/app/game.tsx`: neutral Continue before first native request; denied camera access offers Settings/back without repeated requests. |
| Optional microphone | Ported for Android | Same screen plus Android entry tests: first Continue invokes native permission; denial goes directly to silent recording and later entries honor it; a Settings grant restores sound on subsequent entry. Normal Play never requests microphone access. Recording/capture/share implementation preserved. |
| Keep-awake | Ported for Android | New `GameScreenAwake.tsx` and lifecycle tests; focused calibration/countdown/play, release on results/navigation/errors/unmount/background, unique tags prevent late cleanup from releasing another run. Existing `expo-keep-awake` 57.0.2 declared directly; already present in the lockfile and installed runtime. No library/version upgrade, service, polling or saved timeout change. |
| Home / onboarding / Info copy | Ported | `(tabs)/index.tsx`, `onboarding.tsx`, `(tabs)/info.tsx`: centered existing stage label without emoji; exact silhouette instructions; pullup paragraph below steps 1–3; Camera & microphone settings row uses existing Android Settings destination. |
| Recorded-only Flap Fit branding | Already present, preserved | Existing Android `recordingBranding` guard and composed recording implementation untouched; added final source's branding regression tests. Not drawn on ordinary gameplay frames. |
| White navigation / progression / results-first ads | Already present, preserved | Navigation, scoring, difficulty, achievements, evolution, identity, result coordinator, ad cadence and Share exclusion unchanged. Android ad IDs/modes and Android privacy/RevenueCat platform guards retained. |
| Deferred European processing / travel | Ported, disabled | `services/privacy/{launchCountries,launchProcessingPolicy,europeanProviderPolicy,privacyCountry,postGamePrivacy,regionalAdvertising,processingNotice}.ts`, `PrivacyChoices.tsx`, related tests. Initial launch stays CA/US/AU/MX; European providers remain disabled, including travel with saved grants. Network country does not overwrite residency. Android tests prohibit Apple age API calls and preserve Android's disabled native RevenueCat path. |
| Manual OTA / fingerprint protections | Preserved and strengthened | `scripts/{validate-update-config,test-update-config}.cjs`: reject external linked dependency roots. Android fingerprint configuration and EAS profiles unchanged; no iOS runtime hash copied. |
| Android physical acceptance / release approval | Blocked pending owner device testing | No attached Android test runtime was available: adb not installed on PATH or at the standard SDK location and no SDK environment configured. Desktop-render/Jest success is not Android physical acceptance. Release validation intentionally rejects the old Android approval marker for the changed pushup rules. Marker left unchanged. |

Relevant history (all implementations taken from the final snapshot above): pushups `670ab25`, `64a32f6`, `e798142`; artwork `34ba0d5`, `00b70a3`, `e798142`, `2121419`; microphone `a008816`; screen awake `c17ed1a`; Home `1d998df`; onboarding `944cb97`, `229b6ae`; Info `9621a8c`; prepared/deferred European support `7ba5b40`, `8e9241b`; dependency-root safeguard `5a5307e`.

## Verification

- TypeScript (`tsc --noEmit -p apps/mobile/tsconfig.json`) and repository lint (`yarn lint`, deny warnings) passed. Full Jest: 82 suites / 2,006 tests; 81 suites and 2,005 tests passed in the full invocation, with one 30-second entry-test timeout. Rerunning the complete unchanged entry file passed all 43 tests. All test cases therefore have passing coverage, but the full invocation was not a clean single-pass run. No assertions or timeout limits were relaxed.
- Locked dependency installation: `corepack yarn install --immutable --mode=skip-build` passed with Yarn 4.12.0; no dependency build scripts executed.
- Android autolinking resolves `expo-keep-awake`; dependency root resolves inside this checkout, not an external junction. This does **not** establish compatibility with any previously installed Android binary. No build/fingerprint override/OTA publication performed.
- `verify-calibration-guides.cjs`: 42 excluded configurations unchanged, six enabled exercises passed success fades, rejected holds, cleanup, countdown and pullup reach/floor/unverified routes.
- `verify-android-calibration-render.cjs`: loads the complete generated Android WebView HTML, exercises the real guide lifecycle in desktop Chromium, checks 39 phone layouts, decodes all 13 poses with transparent and translucent pixels, and rejects page errors. It uses a simulated camera background and does not claim native Android verification. Generated screenshots are ignored diagnostic output; approved source images are never processed.
- All 13 WebP assets plus their manifest compared byte-for-byte against the exact build-11 Git objects.
- `test-update-config.cjs` and Android-profile OTA configuration validation passed. Manual/native safeguards retained.
- Android-profile release validation has one deliberate blocker: `FLAPFIT_APPROVED_TRACKER_RULES_VERSION` does not match `2026-10-08.3-pushup-body-entry`. The unchanged Android marker is `2026-09-18.9-foot-return`. Physical acceptance must precede updating it; iOS approval is not Android approval.
- Applicable Android/compiler, Android AdMob privacy patch, release-validation, results/ads, sharing and recording script tests all passed through the full Jest runner.
- Initial targeted run exposed two missing pushup display/reset changes in `scriptGame.ts`; corrected to final source without weakening tests. One entry test timed out during cold/contended runs; the same test passed unchanged in isolation (15.878 seconds for the test, within its original 30-second limit). Earlier direct invocations of Jest-owned script tests were rejected by the wrong runner; the full Jest invocation includes those tests correctly. Initial logs retained separately.

## Required Android device checks

1. Pushup calibration accepts the normal front-camera top/bottom posture; rejects upright standing, simple hip hinge, one hidden/bent arm and tracking loss; does not require feet. Confirm preparation/stable-hold timing and original instructions.
2. Actual camera view: all 13 silhouettes show smooth transparency and correct hands, fingers, dumbbells and continuous pullup bars. Reach appears before bar grab. Progress and success fades still align; no silhouette in Sky mode and no bird before calibration completes.
3. Fresh camera request uses Continue/native prompt; denial offers Settings/back and recovers after permission grant.
4. First Record & Play microphone denial immediately records silently. Repeat entries do not re-prompt. Enable sound in Settings and verify the next recording includes it. Normal Play does not ask for microphone access.
5. Shared recorded video alone includes small outlined white Flap Fit branding below target/endless score; normal gameplay has no watermark. Confirm audio/video sharing.
6. Run calibration and gameplay longer than the phone's screen timeout. Confirm no sleep, then release on results, navigation, background, errors and retry. Test rapid background/foreground and repeated runs.
7. Regression: results-first ads, no-fill continuation, eligible Done/Retry/Next behavior, Share exclusion, region recovery, progress/identity preservation. European handling remains disabled; no change to external production settings.
8. Previously reported Android squat/curl jitter remains a separate investigation. Their tracking thresholds, camera inference and gameplay loops are deliberately unchanged by this parity request.

## Release isolation

Baseline protected remote refs: `codex/ios-camera-permission-review` = `f2b8131326d33c3e38d9db8814be777d7b31ad25`; `main` = `0041d2680bd2db652dd26813c96e5489b5bc1dac`; build-8 submitted tag object = `ad5d08d0f3aadf0497f3452f0a12e241e352fbfe`, peeled target = `0041d2680bd2db652dd26813c96e5489b5bc1dac`.

No iOS checkout, signing/configuration, submitted review, shared EAS variables/channels, Supabase deployment/schema, AdMob/RevenueCat settings, Cloudflare or public policies were changed. No build, OTA, store upload or submission was started. Only this Android experimental branch is authorized for commit/push.

## Changed file inventory

- `apps/mobile/artwork/calibration/README.md`
- `apps/mobile/assets/images/calibration/curlBottom.webp`
- `apps/mobile/assets/images/calibration/curlTop.webp`
- `apps/mobile/assets/images/calibration/ios-artwork-manifest.json`
- `apps/mobile/assets/images/calibration/lateralBottom.webp`
- `apps/mobile/assets/images/calibration/lateralTop.webp`
- `apps/mobile/assets/images/calibration/pressBottom.webp`
- `apps/mobile/assets/images/calibration/pressTop.webp`
- `apps/mobile/assets/images/calibration/pullupBottom.webp`
- `apps/mobile/assets/images/calibration/pullupReach.webp`
- `apps/mobile/assets/images/calibration/pullupTop.webp`
- `apps/mobile/assets/images/calibration/pushupBottom.webp`
- `apps/mobile/assets/images/calibration/pushupTop.webp`
- `apps/mobile/assets/images/calibration/squatBottom.webp`
- `apps/mobile/assets/images/calibration/squatTop.webp`
- `apps/mobile/jest.setup.cjs`
- `apps/mobile/package.json`
- `apps/mobile/scripts/embed-calibration-artwork.cjs`
- `apps/mobile/scripts/test-update-config.cjs`
- `apps/mobile/scripts/validate-update-config.cjs`
- `apps/mobile/scripts/verify-android-calibration-render.cjs`
- `apps/mobile/src/app/(tabs)/index.tsx`
- `apps/mobile/src/app/(tabs)/info.tsx`
- `apps/mobile/src/app/game.tsx`
- `apps/mobile/src/app/onboarding.tsx`
- `apps/mobile/src/components/GameScreenAwake.tsx`
- `apps/mobile/src/components/PrivacyChoices.tsx`
- `apps/mobile/src/components/__tests__/GameScreenAwake.test.tsx`
- `apps/mobile/src/services/privacy/__tests__/europeanProviderProcessing.test.ts`
- `apps/mobile/src/services/privacy/__tests__/launchProcessingIntegration.test.ts`
- `apps/mobile/src/services/privacy/__tests__/launchProcessingPolicy.test.ts`
- `apps/mobile/src/services/privacy/__tests__/privacyCountry.test.ts`
- `apps/mobile/src/services/privacy/__tests__/startupGameEntry.test.tsx`
- `apps/mobile/src/services/privacy/europeanProviderPolicy.ts`
- `apps/mobile/src/services/privacy/launchCountries.ts`
- `apps/mobile/src/services/privacy/launchProcessingPolicy.ts`
- `apps/mobile/src/services/privacy/postGamePrivacy.ts`
- `apps/mobile/src/services/privacy/privacyCountry.ts`
- `apps/mobile/src/services/privacy/processingNotice.ts`
- `apps/mobile/src/services/privacy/regionalAdvertising.ts`
- `apps/mobile/src/utils/game/__tests__/android-calibration-artwork.test.ts`
- `apps/mobile/src/utils/game/__tests__/fixtures/pushup-entry-illustration-landmarks.json`
- `apps/mobile/src/utils/game/__tests__/form-tracking.test.ts`
- `apps/mobile/src/utils/game/__tests__/pushup-top-entry.test.ts`
- `apps/mobile/src/utils/game/__tests__/recording-branding.test.ts`
- `apps/mobile/src/utils/game/androidCalibrationImageData.ts`
- `apps/mobile/src/utils/game/experimentalCalibrationGuide.ts`
- `apps/mobile/src/utils/game/gameHtml.ts`
- `apps/mobile/src/utils/game/html/scriptCore.ts`
- `apps/mobile/src/utils/game/html/scriptFormTracking.ts`
- `apps/mobile/src/utils/game/html/scriptGame.ts`
- `docs/release/android-build11-parity-2026-10-09.md`
- `yarn.lock`
