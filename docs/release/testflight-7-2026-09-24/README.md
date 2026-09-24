# Flap Fit 1.0.0 (7) — TestFlight candidate

The iOS production build completed successfully from commit **52fa8e96444aadbca49c403a9d32df6a9a84f2c6**, which is backed up on GitHub. Build ID: **a67cc3d3-4400-4898-b949-242a6c8ec04b**.

[Expo build](https://expo.dev/accounts/flapfitapp/projects/flapfit/builds/a67cc3d3-4400-4898-b949-242a6c8ec04b) · [Source commit](https://github.com/sportaholic000-hue/flapfit/commit/52fa8e96444aadbca49c403a9d32df6a9a84f2c6)

## What changed for this retry

Only the upload exclusion changed: `/README.md` now excludes the root README while preserving nested native-module documentation. The previous broad rule omitted a file that Expo included in the local runtime fingerprint. Reproducing that omission yielded the exact failed cloud hash. The successful build now confirms the same runtime on Windows, Linux and Expo's macOS worker:

`469f66ace28d0ea7661bb8681b0239739f8b3955`

No gameplay, ad scheduling, regional eligibility, native module, dependency, SDK patch or fingerprint compatibility rule changed in this retry. The failed build 6 was explicitly marked by Expo as not counting against build usage.

## Completed verification

- All **72 mobile test suites / 1,598 tests passed** after the upload correction.
- OTA configuration, platform-path discovery and production release checks passed.
- Actual EAS upload filters retain all 34 app-owned fingerprint file leaves; 14 app-owned sources were rehashed and match the audited input.
- The cloud passed runtime comparison, bundled tracker byte checks, production validation, native Google consent checks and RevenueCat's ten-file native patch/lifecycle checks.
- Signed IPA SHA-256: `6866cd36606431af17fe4a4caf20f9e4a7ed6a515c7e1c0c4097476df63ad3a2`.
- The signed app is `com.flapfit.game`, version 1.0.0 (7), for iPhone and iPad, minimum iOS 16.4, using App Store distribution signing. Declared Age Range entitlement exists in both the signed binary and its provisioning profile.
- Embedded OTA is enabled on the production channel with the matching runtime, automatic checks **NEVER**, launch wait **0**, an embedded update and anti-bricking protection. Updates remain initiated through Info > Check for updates.
- The signed artifact contains **16 privacy manifests**, all ten required app-owned collected-data declarations, and Device ID for App Functionality. Delayed Google measurement is enabled; no tracking-permission usage string is present.
- The twelve saved App Store Connect categories match the reviewed data map, including the OTA purpose correction. The public OTA policy supplement is already live. The agent has not clicked the final privacy Publish confirmation; publication has not been independently confirmed.

The generic RevenueCat SDK manifest still declares purchase capability. This release's verified native patch blocks purchase/receipt/customer routes while retaining permitted ad reporting; the questionnaire reflects that configured behavior. Native manifest inspection and isolated lifecycle checks are not a live provider traffic trace or physical-device acceptance.

## Warnings retained, not hidden

Expo Doctor passed 20 of 21 checks. Its remaining finding is five September 24 patch releases newer than the audited lockfile. Each official changelog describes the new patch as having no user-facing changes, so the tested versions were retained. Exact versions are in `build-notes.json`. EAS CLI itself still emits Node `punycode` and `url.parse` deprecation messages; the app-test punycode warning remains fixed.

## Distribution and acceptance

The exact inspected build has been scheduled for standard TestFlight upload. No Enterprise changelog option, paid upgrade, additional native build, public App Store review submission or OTA publication was used.

The owner will test first. The existing internal group is **Flap Fit Testing**. A separate **Family Testing** external group has a public link limited to one tester, with no testers or builds added and no email invitation sent. Hold external build distribution until the owner has tested. First external availability still requires Apple's beta approval.

On the installed candidate, prioritize normal/offline launch; Info > Check for updates and return; exact saved region names and repeated region switches; first free completed run and later eligible ads only after leaving results; camera tracking, recording, sharing and returning from the background. Screenshots and final App Store submission follow the owner's acceptance.


## Submission checkpoint

Standard TestFlight submission **eb147687-ec99-43c5-977f-5515dcc3e2d1** is queued in Expo's Free Tier Queue. It is the only pending submission; yesterday's submission succeeded. [Submission status](https://expo.dev/accounts/flapfitapp/projects/flapfit/submissions/eb147687-ec99-43c5-977f-5515dcc3e2d1). Do not start another upload or native build merely because this job is queued. After Apple processes build 7, add it to the existing internal Flap Fit Testing group and save the prepared testing notes. The owner explicitly wants to test first; keep the external Family Testing group without builds until that acceptance. The compiled production AdMob application ID was also verified against the production profile.
