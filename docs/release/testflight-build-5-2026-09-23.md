# TestFlight build 5 — September 23, 2026

The owner authorized an App Store-signed build and TestFlight upload for morning testing, then instructed work to stop after that upload. Final App Store review submission is not authorized in this batch.

## Build and upload

- Source: `a453c1916a01903b88b783209d62c2b750363150` (`Shorten onboarding and use Agree & Play`), clean and synchronized with `origin/main` when submitted to EAS.
- Version: **1.0.0 (5)**; bundle: `com.flapfit.game`; profile: `production`; distribution: `STORE`.
- [EAS build 78cee246](https://expo.dev/accounts/flapfitapp/projects/flapfit/builds/78cee246-fea8-497e-94b7-d56b8df642cd) finished successfully at 08:32 UTC.
- [EAS submission 505ccc95](https://expo.dev/accounts/flapfitapp/projects/flapfit/submissions/505ccc95-a5d1-4a19-a29e-913e545ffc0b) successfully uploaded that exact build to App Store Connect app `6813280704`.
- Signed IPA SHA-256: `04f559a3f8d1a99b07ec526d54a60968f38a8c685eaef08206ff0ad3a5a16630`.
- Expo Free iOS allowance changed from 12/15 to 13/15. Reported overage and estimated charges were both zero. No plan or paid service was added.

## Verification

Cloud Expo Doctor passed **21/21**. The production release validation passed, as did the post-install check of all six tracker assets.

The completed signed IPA was inspected before upload. All six tracker assets matched their exact source Git blobs and runtime byte counts. ZIP integrity, iPhone/iPad device support, store provisioning, signed Declared Age Range entitlement, privacy manifest declarations, camera/microphone descriptions, native privacy controls, production ad identifiers, and the approved `Agree & Play` text passed inspection. Device acceptance remains for the owner's physical-device testing.

No application source, dependency, gameplay, advertising eligibility, backend, or website changes were made during this build/upload task. The focused source verification and copy changes are recorded in [short-onboarding-2026-09-23.md](short-onboarding-2026-09-23.md).

## TestFlight status

Apple marked the upload **Complete**. Build 5 was assigned to the internal `Flap Fit Testing` group, containing the account owner as its one tester; automatic distribution is disabled. Apple confirmed **1 Tester / 1 Build** and the owner's tester status **Invited** on September 23. The build's external-test status is `Ready to Submit`, which does not mean App Store review was submitted. No external tester invitation or beta review submission has been made. No final App Store review submission has been made.

The optional `What to Test` field was left unchanged. Automatic approval review rejected saving optional notes as outside the owner's instruction to stop after upload; the unsaved draft was cleared, with Save disabled afterward. No alternate save path was attempted.

## Submission retry

The first EAS submission scheduling attempt included optional release-note automation. Expo rejected that request before creating a submission because the `changelog` parameter requires an Enterprise plan. The retry removed optional automation and used the standard submission path with the same finished build. No second build, upgrade, or charge was incurred. The successful submission is linked above.
