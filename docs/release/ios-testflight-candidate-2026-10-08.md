# iOS TestFlight candidate - October 8, 2026

The owner authorized one production iOS cloud build for testing before any App Review resubmission. No App Review submission, public release or OTA publication is authorized by this step. The owner deferred the navigation redesign: retain the white bar, original gray inactive icons/labels and orange selected state, matching the existing screenshots. The navy preview remains backed up at `c1336c9514b92f7335362f782b9f6bca1f6f02bb`.

## Included application source

Application source and assets otherwise match the owner-tested OTA source `229b6ae855b2e931889ac5925de2dc75a5390e7f`: camera Continue/denied Settings handling, neutral microphone first request with silent continuation after denial, Info camera/microphone settings wording, recording-only branding, all six refined calibration guides, approved pushup entry geometry, focused iOS screen-awake protection, centered Home evolution text, and accepted onboarding copy/order. The microphone recording expression, other exercises, ads/results and gameplay loops are unchanged in this preparation.

The production tracker approval marker now matches `2026-10-08.3-pushup-body-entry`, based on the owner's physical test and explicit approval to lock the pushup correction in. The same marker was saved in the remote EAS production environment. This records acceptance of existing source; it does not alter tracking thresholds or disable validation.

Production retains live advertising and its existing iOS IDs, independent privacy/eligibility rules, manual OTA with fingerprint compatibility protection, and the four-country initial release policy (CA/US/AU/MX). Prepared European processing stays disabled. Main, the submitted build-8 release tag and Android branches remain protected.

## Verification and build receipt

Full tests, TypeScript, lint, production release/OTA validation and native SDK patch checks are being run before the build request. The exact pushed commit, results and cloud build/TestFlight upload receipt will be recorded after completion. No native compilation runs on the owner's computer.

## Owner acceptance after installation

Install the new TestFlight build and test its embedded version before using Check for updates. Check camera Continue and native denial/Settings recovery, microphone Continue and denied sound recording without repeated prompts, a normal pushup calibration/run with the approved artwork, exported recording branding/sound, white navigation and onboarding/Info text, normal result actions and saved progress. A denied microphone should allow silent recording; granting it in Settings should restore sound. The owner already approved pushup calibration, pullup artwork, recording branding and a full 60-pipe awake run; no additional pullup calibration retesting is imposed here. Live ad fill remains subject to AdMob readiness and inventory.

## Optional App Store header

Apple's creative assets, including the product page header, are optional and can be submitted separately from a new app version. No header image or screenshot/listing edits are part of this build. Source: https://developer.apple.com/help/app-store-connect/manage-app-information/manage-your-app-store-assets .
