# Validation and device handoff

This preparation is based on the submitted iOS build 11 source, not a new build. The branch has not been installed on an iPhone or iPad, published through OTA, or submitted to Apple.

## Automated checks

The final full suite passed 1,955 tests in 81 suites. Final results are recorded in validation-summary.json. Checks were run with the existing production profile environment and locked dependencies. No dependency manifests, lockfile, native plugins, signing, build profiles or update configuration were changed.

- Production release and manual OTA configuration validation.
- TypeScript and repository lint.
- AdMob SDK privacy patch and RevenueCat processing bridge checks.
- Full Jest regression suite, including permission states, saved-data recovery, age/country/consent rules, result-action/ad timing, recording, championship/evolution and gameplay-work deferral.
- Calibration browser harness: 36 excluded configurations remain identical apart from the approved card color; all 12 enabled platform/exercise configurations, success fades, pull-up reach/floor/unverified paths, rejection, cancellation and countdown checks pass.
- iOS JavaScript/asset export. This produces a local bundle for validation; it does not create or upload a native build.
- Scoped source/asset comparison against immutable Git snapshots. All seven victory PNGs match the design commit exactly; all 13 submitted calibration pose images and their manifest are unchanged. Calibration source differences are only the approved card colors.
- Headless browser comparison of the two extracted navigation glyphs with the source Ionicons font: both overlap by more than 99.99%, avoiding a new dependency or font-loading path.

Initial full-suite failures exposed test adapters still targeting the old direct Record button or lacking the shared modal/background/router mocks. The adapters now exercise the intended chooser while retaining the production behavior assertions. A subsequent run had one 30-second startup-test timeout while the web preview was running. The preview was stopped, and the final full suite passed without changing that timeout or weakening assertions.

## Visual verification limits

The attempted full-app browser preview timed out loading its root page. It is not counted as successful phone/tablet layout validation, and no production startup or privacy gates were bypassed to make it pass. The preview server has been stopped.

The design source was identified by the owner as tested on iPad on October 13. That is source-design evidence, not a claim that this integrated production candidate has been device-tested. Native layout, accessibility text sizing and camera/recording behavior still need the checks below when an update or build is separately authorized.

## Focused device checks before release

1. On iPhone and iPad, inspect all five tabs, their fixed clouds and scrolling content, navigation selected states, safe areas and larger accessibility text. Check long level/player names, dropdowns, time labels and the compact results layout.
2. Check fresh and existing saved progress: locked levels, unlocked levels, completed levels, Endless locked/unlocked, completed Daily Challenge, achievements, champion badge and bird evolution. Existing scores, training time and identity must remain intact.
3. Launch standard, Endless and Daily runs from Home and Levels. Sky should launch directly. Live Camera should offer Play / Record & Play, and Cancel/backdrop should return without starting a run. Test camera first request, denial, previously granted access and Settings recovery; microphone refusal must continue silently without repeated prompts.
4. Confirm all six existing camera calibration guides, including the pull-up reach stage before bar grab and success-driven fades. Check push-up rejection while standing and valid top/bottom positions; complete a long run to confirm the screen remains awake.
5. Record, save and share a run with and without microphone permission; confirm recording-only Flap Fit branding. Re-enable the microphone through Settings and verify audio returns.
6. Check uncleared results use the earned bird stage and cleared results use the selected skin's victory bird. Confirm unlock headings, championship and coincident evolution celebrations, and all existing result actions.
7. Verify competition terms acceptance and reopening from Compete/Info, Done returning correctly, real name saving, moderation controls and retained identity. Reading terms alone must not grant privacy consent.
8. Check privacy/location correction and restricted-region behavior, results-before-ad placement, Share exclusion and immediate exit when no ad is ready. Automated integration tests do not prove current live inventory or provider delivery.
9. Check Info help, external policy/support links, camera/microphone Settings and manual Check for updates. No update is published by this preparation.

Review contrast-review.md before choosing any palette adjustments. New screenshots and review notes belong to the eventual release. Localization remains a separate, later decision and commit.
