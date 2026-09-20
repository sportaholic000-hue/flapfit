# Apple-first completion tracker

Current checkpoint: September 20, 2026. This is the current release sheet; older counts, territory selections and build evidence remain in Git history and their dated evidence files, not current clearance.

## Candidate and owner boundaries

- Corrected app source: `20921889c3dda24d790b9f1e5ab4706c77a77c45`, branch `wip/crash-protection-20260920`, pushed to GitHub and full remote SHA verified.
- Both corrected builds **FINISHED**, version **1.0.0 (3)**, exact app source SHA above: STORE `f0870fe0-c332-4c12-b0f8-bc8a9492a105` and INTERNAL/test-ad `a4091cca-d32e-4856-8d32-cf3b7fccec68`. Both signed artifacts inspected. App Store upload has not occurred: EAS stopped at missing upload API credentials; Apple API-access agreement is awaiting owner decision.
- Previous finished Ad Hoc build `d19e5b3f-1c09-4e96-9d01-c1706493c5ad`, version 1.0.0 (2), source `1a276dd8f5930cd16f4447f738ee69e21701ee4e`, lacks the three focused corrections. Do not use it for final acceptance. Its iPad installation remains unconfirmed.
- Finish independent code, build and Apple preparation before another owner testing request. Then consolidate the owner's iPad (A16), iPadOS 26.5 acceptance; send the remote brother one essentially finished iPhone 16 Pro candidate after fixes. No renewed pull-up testing.
- Preserve onboarding/design, accepted calibration `2026-09-18.9-foot-return`, full-length video/audio sharing, free pricing and initial AU/CA/MX/US scope. Owner-completed App Store name, subtitle, description and keywords are preserved.
- Permanent choices: Info → Privacy & choices. Optional setup follows a claimed result exit, not first gameplay. Reporting refusal leaves independently permitted Google advertising and competition enabled.
- Ads: first session exit free, every second eligible exit, at least 90 seconds between opened ads; Done / Try Again / Next Level only. Sharing, result arrival and foreground do not trigger ads. One selected action once; no-fill continues.
- Automatic release after approval remains saved. Final owner review precedes Submit for Review. No submission or public app release has occurred.

## Focused review disposition

1. **Reproduced and fixed:** unrelated failed save no longer removes earlier stored refusal. Exact refusal → acknowledged notice → failed competition write → restart → adult eligibility regression verifies RevenueCat is not loaded/configured and separate ads/competition remain allowed.
2. **Reproduced and fixed:** both unconfirmed save and unconfirmed native stop keep a rendered Retry stopping reporting action through remount/retry. Actual confirmation state is shown; JavaScript denial alone does not claim native stop. Independent ads remain enabled.
3. **Source/component race reproduced and fixed; physical verification open:** iOS continuation waits for actual native onDismiss. Tests cover Close, Save, exactly-once, background/return, cancellation, close-before-show, replacement, late completion and unmount. No blind native-dismissal timeout. The iPad sheet → required Google form → selected result action still needs physical verification.

Evidence: `evidence/focused-privacy-review-2026-09-20.md` and machine-readable regression/package summary beside it.

## Release checklist

| Item | Status | Evidence / remaining verification |
| --- | --- | --- |
| A1 candidate source/backup | Complete for corrected source | Full local and remote SHA match above; clean tree at source freeze. Documentation commits can follow without changing runtime source. |
| A2 actual upload contents | Complete for corrected source | EAS upload-stage copy: 717 files; 229 runtime/asset/patch files and 10 configuration files byte-equal. No signing/private environment files; archive/web files excluded. Packaged production validator passed. |
| A3 ad resources | Source verified; device open | Existing lifecycle regressions pass. No new native lifecycle changes in this focused correction. Native terminal behavior still included in consolidated C4. |
| A4 permission refresh | Source verified; device open | Existing Settings-return and foreground regressions pass; C5 remains. |
| A5 accepted instructions/calibration | Complete in source | Preserved accepted onboarding and tracker; no threshold or exercise redesign. |
| A6 unlock/Daily Challenge | Complete in source | Existing hydration/unlock/Daily Challenge regressions pass. |
| B1 final automated checks | Complete for corrected source | 55 suites / 1,074 tests passed; TypeScript, strict scoped oxlint, source and actual packaged production configuration passed. |
| B2 scoped integrity | Complete for corrected scope | Changed-source credential scan and diff check passed. Protected assets/native/game/recorder/ad-scheduler/config comparison unchanged. Existing URI-decoder security backport retained; prior advisory analysis remains historical evidence. |
| B3 signed corrected iOS builds | Complete built/artifact-inspected | Both builds above FINISHED, same corrected source and 1.0.0 (3). Store profile has no registered-device restriction; Ad Hoc profile includes both test devices. See evidence/corrected-ios-builds-2026-09-20.json. This is not device acceptance. |
| B4 native privacy/permissions | Signed artifacts inspected; final runtime/upload reconciliation open | Correct bundle/version, iPhone+iPad families, age-range entitlement in binary/profile, camera/microphone purpose text, non-exempt encryption false, delayed Google measurement and native RevenueCat fence marker verified. Fifteen actual bundled manifests extracted; this is not an Xcode-generated aggregate report or network trace. Stock RevenueCat Purchase History declaration remains conservative; hash-pinned ads-only source blocks those startup/routes, as described in four-country-app-privacy-answers.md. |
| B5 installed artifact identity | Open | No corrected installed-device result. Expo build success is not installation success. |
| C1 startup/play | Open; owner handoff deferred until preparation complete | Equipment-free Squats/Sky; no repeated pull-up calibration session. |
| C2 full video/audio recipient | Open | Verify complete received signed-candidate clip with audio/duration. Prior Expo Go evidence is not sufficient. |
| C3 sharing/return/cancel | Open | Same result/clip survives cancel/return; no automatic ad. |
| C4 privacy/result ads | Open | Corrected iPad native dismissal → required Google form → selected result action; once only, no overlap/late ad/no-fill delay. Test-ad mode for deliberate ad checks. |
| C5 permissions/interruptions | Open | Deny → Settings grant → return, interruption/background and subsequent run. |
| C6 online features | Partial historical backend evidence; native open | Existing backend checks/deletion evidence retained; verify native terms/report/block/deletion without deleting real players. Actual Apple rescission/linkage receipt remains distinct from successful Sandbox TEST delivery. |
| C7 iPhone/iPad layouts | Open | iPad owner session, then one essentially finished remote iPhone 16 Pro session. |
| D1 served pages | Complete published/readback | Site version 28 published successfully; custom-domain privacy, terms and deletion HTTP 200. New privacy controls and ads-only RevenueCat wording read back. Full site source backed up to GitHub branch backup/flapfit-website at 43fb70fa2074e2d61fb177f59f6c2ba3645d24f6; remote SHA verified. |
| D2 data disclosures | Draft/source aligned; final reconciliation open | Local camera/temporary video/audio only; separate AdMob/RevenueCat/competition. Reconcile successor artifact and final published labels. |
| D3 provider consent configuration | Source/config verified; native open | Existing Google messages/UMP/no-IDFA/nonpersonalized configuration retained. Native eligibility and form transitions await C4. |
| D4 support/deletion/moderation | Partial verified evidence | Owner previously confirmed support email works; deletion guidance and historical backend cleanup evidence retained. Do not invent ownership proof or delete a real customer. |
| D5 genuine RevenueCat receipt | Open | Source/mock tests and Connected dashboard status are not a genuine ad-event receipt. Last checked sandbox dashboard showed no data. Separate provider store activation/contest work is not a new Apple blocker. |
| E1 listing/category | Complete saved/readback | Owner wording preserved; Health & Fitness / Games / Action retained. |
| E2 genuine screenshots | Open | Apple iPhone/iPad screenshot slots empty; need real completed-candidate captures. |
| E3 App Privacy | Saved draft; not published | All 12 owner-approved categories entered and read back; no Set Up entries. Both policy/choices URLs saved. Final native/runtime reconciliation and publication remain. |
| E4 declarations | Partial | 13+ rating and non-medical declaration saved; membership/agreements previously verified. Content Rights remains unanswered: owner's statement was no music and artwork from their ideas, not an invented third-party-rights attestation. Final build export-compliance result remains. |
| E5 reviewer notes/contact | Complete saved/readback | No-login reviewer flow and private contact retained; notes now accurately describe result-exit setup and independent reporting refusal. No private contact committed. |
| E6 pricing/territory/release | Complete saved selection | Free; exactly AU/CA/MX/US available at release; future-country automatic availability unchecked; automatic release after approval retained. Earlier 172-country selection is superseded. |
| E7 Apple upload/processing/attachment | Blocked on upload access; nothing uploaded | Correct STORE build finished and inspected. Submission-only EAS configuration now names existing app 6813280704; no build profile/runtime change. Apple API access is not enabled, and accepting its agreement/creating upload credentials requires owner decision. No build attached, review submitted or testers invited. |
| F1 evidence sheet/backups | Current sheet maintained | Correction source and regression evidence pushed with full remote SHA verification. Complete website history separately backed up on GitHub. This artifact checkpoint must also be pushed/read back before handoff. |
| F2 readiness | Not ready for review submission | Source fixes, automated checks, corrected signed builds and artifact inspection complete. Remaining: Apple upload access/processing, final fields/label publication, physical acceptance, genuine screenshots, genuine RevenueCat requirement and final owner review. |
| F3 Submit for Review | Not performed | Owner reviews concrete completed submission before final send. |

Android store work, contest media, cosmetic changes and additional calibration are deferred. The original handoff was reread in full after the focused corrections; execution remains finish → verify → save/read back → backup → check off.
