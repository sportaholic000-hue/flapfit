# iOS TestFlight candidate - October 8, 2026

The owner authorized one production iOS cloud build for testing before any App Review resubmission. No App Review submission, public release or OTA publication is authorized by this step. The owner deferred the navigation redesign: retain the white bar, original gray inactive icons/labels and orange selected state, matching the existing screenshots. The navy preview remains backed up at `c1336c9514b92f7335362f782b9f6bca1f6f02bb`.

## Included application source

Application source and assets otherwise match the owner-tested OTA source `229b6ae855b2e931889ac5925de2dc75a5390e7f`: camera Continue/denied Settings handling, neutral microphone first request with silent continuation after denial, Info camera/microphone settings wording, recording-only branding, all six refined calibration guides, approved pushup entry geometry, focused iOS screen-awake protection, centered Home evolution text, and accepted onboarding copy/order. The microphone recording expression, other exercises, ads/results and gameplay loops are unchanged in this preparation.

The production tracker approval marker now matches `2026-10-08.3-pushup-body-entry`, based on the owner's physical test and explicit approval to lock the pushup correction in. The same marker was saved in the remote EAS production environment. This records acceptance of existing source; it does not alter tracking thresholds or disable validation.

Production retains live advertising and its existing iOS IDs, independent privacy/eligibility rules, manual OTA with fingerprint compatibility protection, and the four-country initial release policy (CA/US/AU/MX). Prepared European processing stays disabled. Main, the submitted build-8 release tag and Android branches remain protected.

## Verification and build receipt

The full run covered 79 suites / 1,938 tests: 78 suites and 1,937 tests passed; one startup test exceeded its 30-second limit on the Windows computer. The entire affected startup suite then passed all 40 tests unchanged in an isolated rerun. This is not represented as one wholly passing full-suite invocation. TypeScript, lint, production release/OTA validation, fingerprint discovery normalization, SDK patch/bridge checks and calibration-guide layout/transition checks passed. One RevenueCat patch-test invocation omitted its required cached-source argument; the corrected invocation against the locked official 5.88.0 source passed without app changes. Native Apple-toolchain test harnesses were skipped on Windows; source checks are not claimed as native execution or device traffic verification. [Detailed verification](ios-testflight-11-2026-10-08/verification-summary.json).

The production environment was read back and validated before requesting the build. The source checkout was clean, pushed, and checked against the owner's tested OTA: only the production tracker approval setting differs in application/configuration files. Live ads use app ID `ca-app-pub-5933597810180440~5139925774` and interstitial `ca-app-pub-5933597810180440/2284241303`. [Exact preflight evidence](ios-testflight-11-2026-10-08/preflight.json).

One cloud production build was requested from `fcbf4e0c4bb2b5bdb07d85e5630f173786a72718`: version 1.0.0 (11), build ID `90abaf28-65cd-43e5-b542-70a49c56c68d`. [Expo build](https://expo.dev/accounts/flapfitapp/projects/flapfit/builds/90abaf28-65cd-43e5-b542-70a49c56c68d). The source archive was uploaded successfully. Compilation/TestFlight completion will be added below when confirmed. No native compilation runs on the owner's computer.

## Owner acceptance after installation

Install the new TestFlight build and test its embedded version before using Check for updates. Check camera Continue and native denial/Settings recovery, microphone Continue and denied sound recording without repeated prompts, a normal pushup calibration/run with the approved artwork, exported recording branding/sound, white navigation and onboarding/Info text, normal result actions and saved progress. A denied microphone should allow silent recording; granting it in Settings should restore sound. The owner already approved pushup calibration, pullup artwork, recording branding and a full 60-pipe awake run; no additional pullup calibration retesting is imposed here. Live ad fill remains subject to AdMob readiness and inventory.

## Optional App Store header

Apple's creative assets, including the product page header, are optional and can be submitted separately from a new app version. No header image or screenshot/listing edits are part of this build. Source: https://developer.apple.com/help/app-store-connect/manage-app-information/manage-your-app-store-assets .

## Completed cloud build and TestFlight upload

Build 11 finished successfully on Expo at `2026-10-09T00:15:15.694Z`. The cloud post-install production validation and CONFIGURE_EXPO_UPDATES phase passed; the latter sets the production update channel. EAS records native fingerprint `13f3cdc16a6f972c6de512a40c7ef2652bdbc9b6`. Keep normal fingerprint checks for any future OTA targeting build 11; do not assume build 10's earlier fingerprint remains applicable. The IPA and retained Xcode archive/evidence were produced. [Completion receipt](ios-testflight-11-2026-10-08/completed-build.json).

The exact build was uploaded successfully to App Store Connect using the existing production upload credentials, requesting the existing internal group `Flap Fit Testing` with new-group creation disabled. EAS upload `b93b0341-b1be-471f-9c75-0061c4d06de2` completed successfully. Apple processing was pending at the upload receipt and is now independently confirmed complete: `VALID`, with `IN_BETA_TESTING` for internal testing. [Upload receipt](ios-testflight-11-2026-10-08/testflight-upload.json).

Exactly one new build was requested in this step. No OTA publication, App Review submission, public release, store availability or screenshot change occurred. Device acceptance is the owner's next step; none is claimed for build 11 yet.

### Final Apple read-back

Apple reports version 1.0.0 (11) as `VALID` and `IN_BETA_TESTING`, not expired, associated with the exact EAS build/upload above. Runtime version and fingerprint are both `13f3cdc16a6f972c6de512a40c7ef2652bdbc9b6`. [Apple TestFlight status](ios-testflight-11-2026-10-08/apple-testflight-status.json). The owner can install build 11 and test the embedded candidate before any manual update. App Review resubmission remains unauthorized until the owner tests and approves it.
