# Corrected Store artifact evidence - September 20, 2026

Store build 103c8936-9447-4190-a45b-6912b1027c69 is FINISHED, version 1.0.0 (4),
compiled from c05f497180c89af21ddb9b9fe014e97e2a23b80a. That source includes the
three focused privacy fixes and implementation 0cea7e3's regional corrections.
The registered-device successor has not started: automatic approval review
required explicit authorization for the source/signing upload to existing Expo.
The owner question is pending. No existing build was cancelled.

## Verified artifact and native build

- Signed IPA SHA-256: ff972e71d5cd69538410e43bb11b2dea22cefc6526109ea393bd0b3a1d40c4e4.
- Bundle com.flapfit.game; iPhone/iPad families; minimum iOS 16.4; build 4;
  Store distribution profile; declared-age entitlement in binary and profile;
  accurate camera/microphone text; Google measurement delayed; no ATT description;
  non-exempt encryption false; native RevenueCat processing bridge present.
- Actual Xcode 26.6 (17F113), production profile/live-ad mode, production validator
  passed, Validate invoked, ARCHIVE SUCCEEDED, zero compiler error diagnostics.
- The ten-file RevenueCat 5.88.0 consent fence was verified on the worker.
  Isolated native cold-start, cancellation, purge, stale-generation and fresh-grant
  checks passed, including separate-process relaunch. These are not device results.
- All 15 embedded privacy manifests were read; their semantics match the already
  reviewed build-3 manifests. They also match the retained archive. The generic
  RevenueCat Purchase History declaration remains; actual ads-only restrictions
  and the existing questionnaire rationale are unchanged. No purchase path added.
- The archive's JavaScript is byte-identical to the IPA; regional persistence,
  reporting Retry and protected calibration markers are in the compiled bundle.
  MediaPipe WASM/model resources are bundled. Known-credential/service-role scans
  covered all 164 uncompressed IPA files with no findings; not a history or
  exhaustive security audit.
- The actual worker xcarchive was retrieved. Its SHA-256 matches worker metadata:
  ad7345b7ccc04325a3f1ee10b802d6eb4329c469e835903f6a397a11c3393442.
  All retained ZIP CRCs passed. Worker build ID/source, archive and IPA identities
  agree. Archive retention is proven; an Xcode aggregate privacy report is not.

Evidence: regional-store-ipa-check.json, regional-store-verification.json,
regional-store-native-evidence.json and regional-store-privacy-manifests.json.
Large binaries, signing material, raw console logs and signed download URLs are
not committed. Existing EAS artifact retention is finite; the retained archive
also exists locally under the task's work directory.

## Exact remaining dependencies

| Gate | State, responsible dependency and next action |
| --- | --- |
| Registered-device artifact | Owner authorization is pending only because automatic approval review blocked the upload to existing Expo. After approval, build with the existing two-device/test-ad profile and inspect that artifact before any testing request. |
| Xcode aggregate privacy report | Actual xcarchive is retained and verified; generating the genuine report requires Xcode/macOS tooling access. Windows manifest inspection does not close this item. |
| Apple console preparation | Browser control repeatedly timed out. Already-saved fields remain evidenced; no new console action is claimed. Restore tool access, finish concrete credential setup with required security confirmation, and resolve the owner's factual content-rights answer. |
| Genuine screenshots | Final device captures are required; native-aspect-ratio production canvases and accepted dimensions are prepared. No fabricated images or extra device pool. |
| Device and provider proof | One consolidated iPad pass followed by essentially finished iPhone candidate. Match real RC event receipt and withdrawal/relaunch separately from mocks and native harnesses. |
| Apple upload/submission | Nothing uploaded, processed, attached or submitted. Finish declarations/privacy publication, final reconciliation and owner review before submission. |
| Unavailable review | Latest Fable report was neither supplied nor found; its unknown contents are not claimed reconciled. |

All available concrete source findings retain their named dispositions in
regional-production-closure-2026-09-20.md and regional-final-verification.json.
No unfinished known implementation is assigned to a tester. No acceptance or
submission clearance is inferred from this completed Store artifact.
