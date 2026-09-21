# Apple-first completion tracker

## Current audit gate — September 21

The owner requires an independent inspection before any final app build. Source fixes, full checks and the website update are recorded in [the audit handoff](third-party-audit-2026-09-21.md). **67 suites / 1,400 tests**, TypeScript, strict lint and release validation pass. The unapproved general ads-off controls are removed; regression tests cover eligible adults across all four launch countries. Website version 35 is published with the corresponding wording corrected. No mobile build, Apple upload, metadata edit or submission occurred. Wait for the owner’s explicit build instruction after the audit. This supersedes earlier build-preparation wording below.


## September 21 owner correction — regional advertising only

Regional gameplay exclusions were not authorized. Current source separates game access from advertising and reporting, removes the first-run quota and notice requirement, and saves both New York answers without automatic re-questioning. Camera permission is required for all gameplay; recording and microphone audio remain optional. Existing privacy withdrawals, competition controls and ad cadence are retained. See **evidence/regional-advertising-correction-2026-09-21.md** for current checks and publication status. The exclusion-based Apple review-note draft is cancelled; the saved Apple notes were checked read-only and do not contain those bans. No native build, Apple edit, upload or submission is part of this correction.

## Older-iOS eligibility fallback — verified source, BUILD HELD

The existing Info/results panel now provides a local age-range answer only when Apple's service is unsupported on iOS. It restores successful answers, preserves purpose refusals, retains truthful save/read retry, and never substitutes for an available/required Apple check. Actual four-country adult ad initialization and independent RevenueCat refusal/restart are verified. **63 suites / 1,335 tests**, TypeScript, strict lint, release/privacy checks and the actual local package (**792 files / 291 matching required inputs**) pass. Website version 31 has the matching disclosure and verified public readback.

Evidence: **evidence/local-age-fallback-2026-09-21.md** and its checks/package/website JSON. This supersedes the older statement that every pre-iOS-26 user has no eligibility route. Regional monetization, unresolved/current-system age cases and the NY fallback remain open source decisions. It does not clear a build, device acceptance, provider receipt or submission. Existing work and unrelated local changes remain preserved.

## September 21 source recovery — regional monetization NOT complete

The advertising-withdrawal controls, truthful save/retry state, orphan-recording cleanup,
and Yes/No-only regional answers are verified in **evidence/source-recovery-2026-09-21.md**
and its adjacent checks/package records. Current results: **62 suites / 1305 tests**,
TypeScript, strict lint and release/privacy validators pass. Actual local EAS package:
**785 files / 289 required inputs**, all byte-matched; inside-package validator and exclusions pass.

Website follow-through: policy version 30 is published with accurate cleanup retry and Yes/No wording; exact source/archive/deployment evidence is in **evidence/policy-copy-publication-2026-09-21.json**. This changes no application eligibility or Apple field. Fresh direct HTTP readback also passed for all six public routes against version-30 source; **evidence/policy-copy-live-readback-2026-09-21.json** records the exact comparisons.

These results do not meet the latest no-discretionary-ad-free requirement. Unanswered
region, required refusal and unavailable age evidence still leave affected ads paused;
the worldwide NY teen fallback is not resolved. An age/region-wide availability decision
is pending, separately from consent. No new restriction, paywall, limited-ad mode, native
build, upload or Apple submission is claimed. Complete source fixes are backed up for review,
not offered as an acceptance candidate. The owner must test before submission.

This section supersedes older readiness wording only for the identified source corrections.
Prior account work and unrelated local evidence are preserved. Source tests, package,
future signed artifact, installed-device outcomes and genuine provider receipt remain separate.


## Regional behavior and competition Stop successor — BUILD HELD

Preserves the Canada Quebec / established non-Quebec / unresolved distinction from 14863f8 and adds direct ad-request/presentation plus fresh rendered-control proof: non-Quebec Canadian adults receive restricted result-exit ads without a discretionary advertising-off switch, while reporting refusal stays independent. Quebec remains available with required choices; no province-only exclusion is claimed. Unknown US state is not Connecticut. Unproved New York processing scope is now explicitly distinct from confirmed NY activity; the teen consent fallback remains because the territorial/data-history exemption is not established. **That narrowing remains open, not a device-test task.**

The separately reported competition Stop/accept/Stop race is reproduced and fixed through real Compete acceptance, durable restart and actual API gates on both Apple paths. Prior privacy/deletion, gameplay/calibration and full-run recording behavior is preserved. **60 suites / 1272 tests**, TypeScript, strict lint, production privacy/release checks and actual local package validation pass (**778 files / 285 matching required inputs**).

Evidence and full country/age/region table: **evidence/regional-stop-correction-2026-09-20.md**, with adjacent checks/package JSON. Native providers are mocked in source tests. No compiled candidate, device acceptance, provider receipt or submission readiness is claimed. No build, upload, deployment or Apple edit. Older sections below retain their original evidence scope.


## Regional assumption correction — BUILD HELD

Unknown Canadian province no longer becomes Quebec-specific consent. A local Quebec/outside-Quebec answer in existing Info/result privacy selects the actual branch without erasing refusals; outside-Quebec adults use permitted notice-based ads without a new ad switch. Unknown US state is distinguished from confirmed Connecticut restrictions. **The separate worldwide New York teen-consent fallback remains an unresolved source/design release blocker**, including its effect outside the US. AU/MX national age/authority handling is not a province/state guess. No complete four-country monetization or release readiness claim.

Evidence: **evidence/regional-assumption-correction-2026-09-20.md** with checks/package JSON. Both original regional assertions reproduced, then corrected. **60 suites / 1254 tests**, TypeScript, strict lint, production privacy/release validation and local package validation pass. Canadian rendered controls, retry/races and actual Google/RevenueCat configuration through restart are covered. No new build/upload, device request, account edit or deployment.


## Prior three-finding account-audit successor — BUILD HELD

All three reproduced source findings are corrected in the commit containing **evidence/audit-three-findings-2026-09-20.md**: unreadable saved refusal (retained from b2916d0), stale Allow overriding newer Stop, and Apple-required competition bypassing pending deletion. The latter two had eight failing regressions plus seven passing controls before correction on b2916d0. Final actual configuration/rendered/dispatcher regressions cover refusal recovery/restart, remount and delayed writes, all Apple/session combinations, deletion during preparation, deletion retry/support, and no revival of an old request after cleanup.

Final checks: **60 suites / 1171 tests**, TypeScript, strict lint and production manifest/release validators pass. Actual local EAS package: **772 files / 285 matching required inputs**; inside-package validator and exclusions pass. New source and package fingerprints are recorded beside the report. Prior authenticated RevenueCat Ads chart access and checklist/account corrections are retained. Genuine provider receipt, corrected artifact, device acceptance and Apple submission readiness remain open. **No build or upload is authorized or started.**


## Prior privacy-choice read-recovery checkpoint

The account audit's failed/invalid choices-read finding is **REPRODUCED AND FIXED** in the commit containing this section. Before correction, 14 configuration-boundary regressions failed (RC initialized after unknown saved choices; unrelated save erased refusal; retry did not reread). After correction: actual US/AU/MX notice/launch-policy/monetization tests preserve refusal, block overwrites, recover through the real notice entry, keep RC unconfigured after restart, and restore independently permitted Google ads. The existing Info panel retains a failure-only load retry. No new consent, data collection, permissions, native configuration or gameplay change.

Evidence: **evidence/privacy-choice-read-recovery-2026-09-20.md** and adjacent checks/package JSON. All **60 suites / 1154 tests**, TypeScript, strict lint and production release/manifest validators pass. Local EAS package **769 files / 285 matching inputs** and its inside-package validator pass; private/signing/web/backup exclusions verified. The original four mixed-ending package hashes were already reconciled at f9ff7cf; that completed result is preserved, not reopened.

RevenueCat **Ad Revenue / Impressions** charts are accessible in authenticated project a58d3dbd with Charts v3 enabled and no feature-access gate. Genuine installed-event receipt remains open. Supplied audit PG-ceiling/reviewer-note corrections are retained. submission-gates.md, the held device introduction and Shipaton screenshot instruction now agree with current evidence. Organizer PDF remains not generated/deferred. This batch performs **no build, upload, Apple edit, privacy publication or device-testing request**. Older checkpoint counts below retain their original source scope; they do not clear this new successor's artifact/device/provider/Apple gates.


## Current package and authenticated provider reconciliation

Source 30dffe412a08d13a8e836d7b8abd19eac24470ef: all 284 recorded inputs reconciled, 246 raw Git matches and 38 CRLF/LF-only differences; zero content differences. Four mixed-ending files were normalized to their existing Git bytes and pinned to LF. Fresh local EAS archive inspection and the validator inside it passed. Existing 59-suite/1133-test, TypeScript and strict-lint coverage remains applicable; no application-logic change or build.

The current authenticated audit is recorded in **evidence/package-provider-audit-2026-09-20.md**. Apple saved listing, declarations, four-country free pricing/release choice and twelve-category privacy answers remain verified; completed reviewer-contact and upload-authentication evidence is preserved. Both screenshot sets are empty and TestFlight has No Builds. Privacy publication is not independently established by the Publish button. RevenueCat is connected to the matching AdMob account but sandbox/production dashboards contain no receipt evidence. AdMob has the correct iOS interstitial and published consent messages; no policy violations or disapproved apps, but store linkage/readiness approval and the five-month inactivity warning remain open. These exact facts supersede contradictory older checkpoint summaries below without reopening resolved source findings. Final artifact/device/provider/Apple evidence remains distinct. Xcode Organizer PDF stays not generated/deferred. No build, upload, console setting change, privacy publication or submission occurred.


## Current supplied-review reconciliation

The supplied review has been reconciled against the current successor. See evidence/review-successor-resolution-2026-09-20.md for each finding, scoped competition corrections, full source/package results and exact remaining artifact/device/provider/Apple actions. Earlier checkpoints below retain their dated source scope; they are not current submission clearance. No new build or Apple upload was launched during this correction.

Current checkpoint: September 20, 2026. This is the current release sheet; older counts, territory selections and build evidence remain in Git history and their dated evidence files, not current clearance.

## Assigned manifest verification batch

Tasks 1 and 2 are COMPLETE for application source f168286d9058093a42da8e96f02f53a82365a7e6. The full 58-suite / 1,117-test exact-source run, fresh TypeScript/strict lint/source validators and actual EAS package verification passed. All 283 required inputs match; the packaged validator passed. Evidence: evidence/privacy-manifest-batch-completion-2026-09-20.md. This source/package checkpoint supersedes earlier manifest-completeness wording only; it does not clear a build, device test or submission. Build 4 lacks this correction. No other checklist task is advanced.

## Candidate and owner boundaries

- Latest corrected app source: `0cea7e3f3ba4f43081573c25301e8a3c5cc0b3d5`, branch `wip/crash-protection-20260920`, pushed to GitHub and full remote SHA verified.
- Previous builds **FINISHED**, version **1.0.0 (3)**, source `20921889c3dda24d790b9f1e5ab4706c77a77c45` (three focused fixes present; latest regional corrections absent; not final acceptance candidates): STORE `f0870fe0-c332-4c12-b0f8-bc8a9492a105` and INTERNAL/test-ad `a4091cca-d32e-4856-8d32-cf3b7fccec68`. Both signed artifacts inspected. Historical upload stop: credentials were missing then. Task4 later completed secure setup/read-only authentication; no binary upload occurred.
- Previous finished Ad Hoc build `d19e5b3f-1c09-4e96-9d01-c1706493c5ad`, version 1.0.0 (2), source `1a276dd8f5930cd16f4447f738ee69e21701ee4e`, lacks the three focused corrections. Do not use it for final acceptance. Its iPad installation remains unconfirmed.
- Finish independent code, build and Apple preparation before another owner testing request. Then consolidate the owner's iPad (A16), iPadOS 26.5 acceptance; send the remote brother one essentially finished iPhone 16 Pro candidate after fixes. No renewed pull-up testing.
- Preserve onboarding/design, accepted calibration `2026-09-18.9-foot-return`, full-length video/audio sharing, free pricing and initial AU/CA/MX/US scope. Owner-completed App Store name, subtitle, description and keywords are preserved.
- Permanent choices: Info → Privacy & choices. Optional setup follows a claimed result exit, not first gameplay. Reporting refusal leaves independently permitted Google advertising and competition enabled.
- Ads: first session exit free, every second eligible exit, at least 90 seconds between opened ads; Done / Try Again / Next Level only. Sharing, result arrival and foreground do not trigger ads. One selected action once; no-fill continues.
- Automatic release after approval remains saved. Final owner review precedes Submit for Review. No submission or public app release has occurred.

## Corrected Store artifact checkpoint

Store build **1.0.0 (4)**, **103c8936-9447-4190-a45b-6912b1027c69**, is finished and artifact-inspected from **c05f497180c89af21ddb9b9fe014e97e2a23b80a**. It includes the regional successor. Native/archive evidence and remaining gates: `evidence/regional-store-artifact-2026-09-20.md`. That earlier registered-device attempt was blocked. Later authorized device build04cf2e97 completed and has now been inspected; it lacks the latest competition wiring. No final-source build or Apple upload is claimed.

## Focused review disposition

1. **Reproduced and fixed:** unrelated failed save no longer removes earlier stored refusal. Exact refusal → acknowledged notice → failed competition write → restart → adult eligibility regression verifies RevenueCat is not loaded/configured and separate ads/competition remain allowed.
2. **Reproduced and fixed:** both unconfirmed save and unconfirmed native stop keep a rendered Retry stopping reporting action through remount/retry. Actual confirmation state is shown; JavaScript denial alone does not claim native stop. Independent ads remain enabled.
3. **Source/component race reproduced and fixed; physical verification open:** iOS continuation waits for actual native onDismiss. Tests cover Close, Save, exactly-once, background/return, cancellation, close-before-show, replacement, late completion and unmount. No blind native-dismissal timeout. The iPad sheet → required Google form → selected result action still needs physical verification.

Evidence: `evidence/focused-privacy-review-2026-09-20.md` and machine-readable regression/package summary beside it.

## Release checklist

| Item | Status | Evidence / remaining verification |
| --- | --- | --- |
| A1 candidate source/backup | Source verified; BUILD HELD | Current regional access and consent/withdrawal successor: evidence/release-eligibility-2026-09-21.md. Source findings and explicit limitations reconciled; remote successor recorded by the commit containing this evidence. |
| A2 actual upload contents | COMPLETE for current source | Actual local EAS archive: 805 files / 300 matching required inputs; packaged validator and exclusions pass. No cloud build/upload. |
| A3 ad resources | Source verified; device open | Existing lifecycle regressions pass. No new native lifecycle changes in this focused correction. Native terminal behavior still included in consolidated C4. |
| A4 permission refresh | Source verified; device open | Existing Settings-return and foreground regressions pass; C5 remains. |
| A5 accepted instructions/calibration | Complete in source | Preserved accepted onboarding and tracker; no threshold or exercise redesign. |
| A6 unlock/Daily Challenge | Complete in source | Existing hydration/unlock/Daily Challenge regressions pass. |
| B1 final automated checks | COMPLETE for current source | 67 suites / 1383 tests, zero failed/pending; TypeScript, strict lint, production release/privacy/required-reason validators pass. Exact source unchanged during checks. |
| B2 scoped integrity | Changed source and actual package verified; corrected binary open | Locked dependencies/resolutions/three patches unchanged; actual package required inputs and secret/signing-file exclusions verified. Earlier full credential-scan evidence retains its dated scope. New signed artifact remains open. |
| B3 signed corrected iOS builds | Final successor artifact OPEN; BUILD HELD | Existing 04cf2e97 / f4b191d lacks later competition wiring, the three account-audit corrections and the latest regional correction. It remains inspected historical evidence, not final acceptance. No new build/upload. |
| B4 native privacy/permissions | Existing artifact checks passed; final artifact still required; PDF DEFERRED | Actual 04cf2e97 has nine corrected app types/fourteen SDK manifests, required reasons, camera/mic descriptions, age entitlement, native fences and tracking assets. Final successor needs its own artifact checks. Organizer PDF not generated/deferred by owner. |
| B5 installed artifact identity | Open | No corrected installed-device result. Expo build success is not installation success. |
| C1 startup/play | Open; no testing request yet | Squats/Sky without Metro; existing onboarding, calibration/countdown, all result actions, saved progress after restart and bundled tracking. Source regressions do not close installed checks. |
| C2 full video/audio recipient | Open | Full composed clip with audible microphone recording must be received and played on the receiving device through the supported system/Messages path; record actual duration and inspect metadata. Source-app or Files-only playback does not close C2. |
| C3 sharing/return/cancel | Open | Cancel, external-app return, failed share and re-share preserve the same result/ready clip; temporary cleanup does not invalidate an active share; no automatic ad. |
| C4 privacy/result ads | Open | iPad native dismissal → required Google form → chosen result action; Close/Save, repeated taps, background, no-fill/failure, actual native close and withdrawal during presentation. Once-only continuation, no late ad, no waiting for unready ad. Repeated cycles also close A3 resource/lifecycle evidence; record any case that cannot be exercised. |
| C5 permissions/interruptions | Open | Camera and microphone denial → Settings grant → return; ordinary Play without mic and permitted silent recording; short auto-lock/interruption, camera/mic stop after leaving. OS process-death recovery stays untested unless observed. |
| C6 online features | Partial backend proof; native rights and real Apple proof open | Clearly temporary authenticated identity: terms/name validation, legitimate single-run submission/read, report/block, authenticated deletion, local progress retained, no replacement guest and support/deletion reachable with participation off. Reuse unchanged backend evidence. Genuine Apple transaction linkage/rescission is separate from successful Sandbox TEST delivery. |
| C7 iPhone/iPad layouts | Open | Existing registered iPad then one essentially finished iPhone 16 Pro session: onboarding/setup, camera, privacy controls, result/share, safe areas and enlarged text. Record physical versus simulated observations. No renewed pull-up tests. |
| D1 served pages | Current copy SAVED; publication BLOCKED | Version 32 privacy/terms source 18957f759a7133c8cc21f936d592cf1d704e592b validated, pushed and saved. Automatic approval review rejected deployment under earlier instruction; owner approval requested. Live version 31 is predecessor copy. |
| D2 data disclosures | Source/inspected predecessor reconciled; final artifact and publication open | Twelve-category answers retained; actual 04cf2e97 corrected manifest confirmed. No new collected data in competition wiring. Final compiled/configured-flow comparison and current publication verification remain distinct. |
| D3 provider consent configuration | Source/config verified; installed/provider proof open | Availability independent of consent; excluded QC/CT/NY cohorts cannot initialize providers. Included adult ad route has no fresh discretionary ads-off switch; reporting/competition remain separate. Precise cohort and history limits documented. |
| D4 support/deletion/moderation | Independent operations verified; native rights open | Prior support receive/reply and deletion evidence retained. Authenticated dashboard dismissed exactly the known temporary test report with both account links null; independent read-only query confirmed at 2026-09-20 07:30:54.336501+00. No real user data deleted. Runbook records retained reports/provider rights/lost-session limits. Native rights access without rejoining remains C6. |
| D5 genuine RevenueCat receipt | Feature access COMPLETE; installed receipt OPEN | Authenticated Ad Revenue/Impressions charts available with Charts v3; existing SDK keys/AdMob connection/ILAR On remain established. Real permitted installed events and withdrawal/relaunch still require provider evidence. Neither chart access nor Connected proves receipt. |
| E1 listing/category | Complete saved/readback | Owner wording preserved; Health & Fitness / Games / Action retained. |
| E2 genuine screenshots | Required iPhone/iPad sets empty; capture plan preserved | Read-only ASC: iPhone 6.5-inch, iPhone 6.9-inch Media Manager, and iPad 13-inch each 0 of 10. Supply a supported 6.9-inch OR 6.5-inch phone set and a 13-inch iPad set. Existing genuine A16 iPad / 16 Pro production route remains in store-screenshot-production-plan.md; accepted captures and uploads still open. Evidence: tasks-5-6-reconciliation-2026-09-20.md. |
| E3 App Privacy | Twelve-category answers saved; current publication not independently verified | Saved purposes/linkage and policy/choices URLs retained. Prior draft history remains, but a visible Publish button alone does not establish current publication. Actual final native/runtime reconciliation and authoritative publication verification remain. No publication performed. |
| E4 declarations | Content Rights COMPLETE; other artifact-dependent declarations remain | Owner confirmed original artwork and authorized AdMob account. Necessary-third-party-rights answer saved, then reloaded and read back in ASC app 6813280704. Existing 13+ / non-medical declarations unchanged. Final build export-compliance result remains. Evidence: tasks-3-4-completion-2026-09-20.md. |
| E5 reviewer notes/contact | Contacts COMPLETE; narrow note alignment PREPARED | Existing contact reload evidence preserved. The old local-play fallback in notes conflicts with new eligibility; exact replacement paragraph prepared in current evidence, no console edit made. |
| E6 pricing/territory/release | Complete saved selection | Free; exactly AU/CA/MX/US available at release; future-country automatic availability unchecked; automatic release after approval retained. Earlier 172-country selection is superseded. |
| E7 Apple upload/processing/attachment | Authentication COMPLETE; no Apple builds or selected build | Task 4 secure credential/authentication results preserved unchanged. Current TestFlight explicitly shows No Builds; version 1.0 has no selected build and no processing row or build-specific compliance prompt. Final binary transfer, Apple validation/processing and version attachment await separate authorization. Evidence: tasks-5-6-reconciliation-2026-09-20.md; tasks-3-4-completion-2026-09-20.md. |
| F1 evidence sheet/backups | Current scoped source/evidence backed up | Current commit contains source checks, package hashes/Git reconciliation, saved website source and explicit remaining authorization/artifact/device/provider/Apple actions. Unrelated local work preserved. |
| F2 readiness | NOT acceptance- or submission-ready | Regional advertising-only source correction is verified in the current correction evidence. Use its website publication result. The exclusion-based Apple-note draft is cancelled; a read-only check confirmed it was never saved. Signed artifact, consolidated devices, genuine receipts, screenshots and final Apple actions remain distinct. Organizer PDF deferred, not required/completed. |
| F3 Submit for Review | Not performed | Owner reviews concrete completed submission before final send. |


## Reconciled country and prerequisite ledger

The original handoff/checklist and available focused reviews were reread. The current implementation was compared first; existing repairs were retained rather than reset or repeated. The latest Fable report was not supplied or found, and the accessible GPT review also states it has not seen it. Its unknown contents are not marked fixed or not reproduced.

| Country | Verified independent outcome | Legitimate later verification / restriction |
| --- | --- | --- |
| Australia | Reproduced/fixed 13-14 personal grants incorrectly enabling processing. 15-17 separate choices and adult routes exercised through the production coordinator, including independent refusal/restart. | No verified parent/capacity workflow is collected; affected 13-14 optional processing remains restricted. Device-returned age, provider and native behavior remain unverified. |
| Mexico | Adult notice and separate RC refusal with ads/competition/restart tested. Under-18 personal choice is not represented as parent authority; misleading Allow controls removed. | Representative-authority workflow is not provided. Its absent capability is an explicit supported-user restriction, not a fabricated parent checkbox or a test for the owner to implement. Installed adult behavior remains open. |
| United States | Reproduced/fixed missing non-CT teen path using a minimal local residency answer in existing Info/result privacy sheet. Saved No clears only CT uncertainty, retains separate NY-compatible consents and Apple/Google requirements; Yes/Not sure stay restricted. Failure/retry/restart and closing-without-reprompt tested. | Actual multi-buyer route does not establish the special CT minor necessity/retention exception. No necessity flag or residence inferred. Physical transition and returned-age/provider behavior remain open. |
| Canada | Not reproduced as missing 14+ activation: country-wide possible-QC independent purpose controls already connected. Production coordinator verifies grants/refusals/restart; no unnecessary province question added. | Valid Apple 14/16/18 response below 14 does not establish 13+ or parent authority. That restriction is explicit. Device-returned age/native flows remain open. |

Evidence: regional-production-closure-2026-09-20.md (primary legal/provider basis and limitations), country-policy-reproduction-2026-09-20.json (executed before/after), regional-final-verification.json (named rendered/coordinator results).

The older focused competition findings are **already fixed**: concurrent first-use requests share one anonymous identity/token; failed signup remains retryable; withdrawal cannot revive stale work; deliberate local-only results never show an attempted-upload failure. The unchanged competition-processing-access suite passed these named cases in the latest complete run. Authenticated deletion/support remain available without rejoining. These are source results, not claimed physical-device observations.

| Remaining category | Exact dependency and next action |
| --- | --- |
| Compiled artifact | Existing 04cf2e97 artifact inspected and includes the native manifest correction; it lacks the latest competition wiring. Final signed candidate/Store counterpart and their artifact checks remain. No new build authorized by this evidence. Organizer PDF deferred, not complete. |
| Installed iPad, then iPhone | Only after independent work and artifact checks: one consolidated pass covering native presentation/ads, full received video/audio, permission recovery, temporary-account rights and layouts. No renewed pull-up tests. |
| Provider receipt | Match real permitted test-ad events to a fresh RC ID, then verify actual withdrawal/background/relaunch while independent permitted Google ads continue. Connection badges and source mocks do not establish this. |
| Apple platform/owner | API agreement, secure credential authentication, Content Rights and reviewer contacts are complete. Genuine screenshots, final privacy reconciliation/publication, accepted Store binary transfer/processing/compliance/attachment and authorized submission remain. |
| Review coverage | Supplied September20 review against f39190d and earlier three focused findings reconciled in review-successor-resolution-2026-09-20.md. No claim is made about another unpublished review. |

Screenshot requirements checked September 20: [Apple screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/). Do not assume physical-device screenshots satisfy a different required size automatically.

Android store work, contest media, cosmetic changes and additional calibration are deferred. The original handoff was reread in full after the focused corrections; execution remains finish → verify → save/read back → backup → check off.

Production notification follow-through: genuine Sandbox TEST success is retained. Pre-release Production 401 is consistent with Apple's documented staff explanation of production API access, not a successful delivery or proof credentials cannot fail. See `evidence/production-notification-follow-through-2026-09-20.md`; no extra device session is needed for the later server TEST.

The complete held device procedure and prepared-case limits are saved in `consolidated-device-acceptance-2026-09-20.md`. Unsupported physical fault injection, unavailable Google forms and genuine Apple-account prerequisites are identified before the session; none is silently treated as passed.
