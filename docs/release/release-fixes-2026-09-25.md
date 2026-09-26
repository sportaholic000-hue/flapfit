# Flap Fit release readiness fixes — September 25, 2026

Base app commit: `805c6c67d10f10aa16c8004e74cf32cd62b7107d` on `codex/championship-achievements`. This report accompanies the follow-up repair commit.

## Changes

- Strengthened the existing public-name filter in both the mobile client and the existing `flapfit-game` Edge Function. Added the demonstrated missing profanity and folded common Unicode lookalikes for moderation only. Actual saved names, Unicode display, unique-name keys, verified ownership, authentication, RLS, and score submission routes remain unchanged.
- Removed `build7AdTest.ts` and its override from the monetization adapter. Production live mode now uses the configured live interstitial ID on every native build, including build 7. Explicit preview/test mode still uses Google's test interstitial. Existing build-7 redacted in-memory diagnostics remain.
- Added shared rejected/accepted name fixtures and client/backend regression coverage, plus live/test ad-selection checks. Existing late-load, immediate exit, privacy denial and gameplay protection tests remain.
- Corrected the website's exercise-specific bird-body claims: training contributes to evolution through ten stages; exercise text now describes tracked exercise time contributing to evolution. Updated the Athlete description to cumulative tracked training time and corrected two exercise muscle labels. Website source commit: `acac97e3432b4cdccad7ec977a6239e7e274e221`; saved Sites version 41. The previously published OTA privacy supplement is preserved.
- App Store description: an initial replacement was saved, then the owner revised it to avoid repetition. The owner's final wording takes precedence and has not been overwritten.
- App Review contact information was visually verified. The owner's phone number was already present; earlier blank-field claims came from an unreliable automation readout. This was not an app defect. No personal contact values are included in this report.

No game loop, championship feature, ad frequency, consent eligibility, location rule, result-action handling, results timing, native SDK, dependency, or lockfile changes are included. No preload or results-screen wait was added.

## Verification

- Full Jest suite: **1,705 tests passed, 75 suites passed, zero failures**.
- Typecheck, lint, production release configuration and `git diff --check`: passed.
- AdMob privacy source patch and UMP source isolation: passed. The native Swift execution portion is unavailable on Windows and was not run.
- RevenueCat processing patch against the pinned official iOS SDK 5.88.0 source, processing bridge, OTA configuration and fingerprint-discovery checks: passed. An initial SDK check lacked its source-directory argument; the final check supplied the pinned source and passed.
- Local production-environment iOS JavaScript/asset export: passed. This was not an EAS/native build, upload or OTA publication.
- Existing Edge Function deployed as version 12, retaining JWT verification. Readback of all three deployed source files exactly matched the intended local files.
- Live backend checks passed: unauthenticated and unacknowledged-terms requests remain rejected; demonstrated bad names are blocked; legitimate accented/Greek/CJK names pass name validation. Valid-name probes used an invalid score and made **zero profile or leaderboard writes**. The temporary anonymous identity was deleted.
- Website validation passed with the latest already-published privacy supplement retained. The Windows-incompatible Sites archive helper was replaced for packaging only by Git's archive of the exact pushed commit; Sites accepted that archive as version 41. Deployment `appgdep_6ab733658a2081919e67b7743d8d28c9` succeeded; the public audience and domain settings were preserved.

## Remaining release work

- No new native build, OTA publication or App Store review submission was started for these fixes. The currently installed build-7 test-ad OTA remains as previously published; source changes do not change installed apps by themselves.
- App Privacy answers were not changed or published in this work. Final publication awaits the owner's explicit approval of Apple's accuracy/compliance declaration.
- Complete and validate the owner's iPhone and iPad screenshot exports, then upload the appropriate sets. The owner reported that Apple rejected some files for size; files had not yet been supplied when this report was prepared.
- With owner approval, create the final native candidate containing the championship features and final live-ad configuration, then test a fresh installation before applying any manual update. Select that intended build for submission.
- Device acceptance still includes permission denial/retry, offline startup, optional microphone denial, recording/sharing and ad/no-fill continuation. Automated/source checks do not prove real device traffic, native execution or live creative behavior.
- After public App Store availability, link the existing iOS AdMob app to its listing, recheck app-ads.txt association/readiness and normal serving, and verify a permitted ad-revenue event in the intended RevenueCat project. Test-ad success does not establish live inventory availability or revenue-event delivery.

The approved scope did not add a new service, name-moderation dependency, attestation system, manual privacy workflow, or paid infrastructure.
