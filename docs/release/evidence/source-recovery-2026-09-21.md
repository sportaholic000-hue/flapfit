# Source corrections verified; regional monetization remains unresolved

Subsequent website-only follow-through: policy version 30 is published and the two outdated copy points below are corrected. See `policy-copy-publication-2026-09-21.json`. Application source and the regional monetization blocker remain unchanged.

Base: `52f4e70c1a6edd89f65b10b0a999176dfd3ee597`. Branch: `wip/crash-protection-20260920`. The commit containing this record identifies the successor. This record does **not** clear a build, device acceptance, genuine RevenueCat receipt, or submission.

The latest objective is free access funded by ads without an optional ad-free tier. The current behavior does **not yet meet that objective**. Saving these completed fixes must not be interpreted as accepting the remaining paused-ad paths.

## Corrected findings

| Finding | Result | Evidence |
|---|---|---|
| Existing advertising consent loses its Stop control when country/age/Apple eligibility becomes unavailable | Reproduced and fixed | Rendered controls retain withdrawal independently of permission to grant. Fresh notice-route adults retain no discretionary ads-off control. |
| Failed advertising withdrawal loses retry or claims success | Reproduced and fixed | Separate pending/saved/unconfirmed state; retry remains after panel close/reopen. Runtime denial is immediate. Successful retry persists across restart; a failed write is never described as durable. |
| Withdrawal and unrelated-save interference | Fixed and verified through actual configuration boundary | Real processing/notice/coordinator/monetization modules with mocked native transports: Quebec grant, eligibility loss, Stop, recovery/restart; preloads invalidated and no later ad load/show. Unrelated failure cannot erase saved refusal. Reporting and competition remain separate. |
| Crash-orphan temporary recordings contradict deletion promise | Reproduced and fixed at source | Root mount/foreground/next allocation remove only unowned recorder-namespaced files. Active recording/share ownership survives foreground and root remount. Deletion errors retry. Encoder, full-run/audio paths and calibration unchanged. |
| Older OS/unknown age described misleadingly | Explanation corrected, monetization availability unresolved | Unsupported native age service is not called. Actual coordinator and rendered screens explain current limitation. This does not supply a missing age route or solve advertising availability. |
| Discretionary Not sure regional answer / dismissal invents an answer or refusal | Yes/No correction verified; monetization consequence unresolved | Both rendered regional questions have Yes/No only. Dismissal writes no region, consent or refusal and restart stays unanswered. Existing old unknown records stay unanswered. Current dismissal still continues play with affected ads paused; this is rejected behavior awaiting the release decision, not a completed monetization fix. |
| NY uncertainty treated as confirmed worldwide coverage | Diagnostics corrected; policy decision unresolved | Coverage and territorial facts remain distinct even after consent. The worldwide teen fallback remains in current code; it is not established as an Apple requirement or a universal legal obligation. |

The five retained before-fix failures concern disappearing withdrawal controls, failed-save UI and root orphan cleanup. The latest two rendered test failures were stale button labels after the requested Yes/No change; only those selectors were corrected. No test was deleted and no behavioral assertion was relaxed.

## Prior audit findings retained

The independently reviewed baseline already contains failed/malformed choice-read recovery and unrelated-write protection (`b2916d0`), stale Allow/newer Stop and both Apple-required/non-required pending-deletion guards (`269b6b3`), and competition Stop/accept/Stop ordering (`52f4e70`). Those production paths are unchanged and their full-suite regressions passed again. Native dismissal ownership, full-run recording/audio, accepted calibration, result-exit-only ad cadence, separate reporting and competition controls remain preserved.

Retained account evidence establishes RevenueCat Ads chart access and Charts v3, AdMob ILAR On and PG, and completed Apple listing/contact/rights/13+/four-country/free-price/upload-credential setup. None was reset or relabelled missing. Genuine provider receipt remains unproved. The separate Xcode Organizer PDF is still not generated/deferred.

Existing backend/security findings retain their earlier scoped dispositions: authenticated server-issued runs and single-use finalization mitigate score injection but cannot prove physical exercise; anonymous-account abuse and free-plan backup/availability remain operational limitations; RLS and privileged RPC restrictions are retained; password-protection warnings do not apply to an anonymous-only login; provider logs/backups and lost-session identity verification limit deletion promises; dependency advisory exceptions retain their recorded exposure analysis. No backend or dependency change occurred, and no fresh hosted/backend audit is claimed. References: `audit-reconciliation-2026-09-15.md`, `launch-audit-response-2026-09-18.md`, `review-successor-resolution-2026-09-20.md`, `audit-three-findings-2026-09-20.md`, `regional-stop-correction-2026-09-20.md`.

## Actual verification

- Complete locked-dependency suite: **62 suites / 1305 tests passed**, zero failed/pending.
- Focused rendered/processing regressions: **122 passed**.
- TypeScript, strict source/scripts lint, production iOS release configuration and privacy/required-reason validators: exit 0.
- Actual local EAS archive-stage package: **785 files / 289 required inputs** matched working source byte-for-byte. The release validator ran inside that copy and passed. Credentials/signing files, web/backups and dependency/cache content excluded.
- The adjacent JSON binds changed source, exact package inputs, named regressions and logs. LF-normalized hashes distinguish Windows line endings from content. Protected configuration, native modules/patches, assets, lockfile and completed core privacy/competition code match the reviewed baseline.

These are source/rendered/provider-mock results and local packaging, not a compiled binary, installed-device result or live provider event.

## Decisions that cannot be relabelled device tests

1. Current unresolved Canadian province/US teen state, existing advertising refusal, unsupported age service and unknown-age paths permit local play with ads unavailable. That fails the owner's monetization requirement; it is not cleared by passing the suite.
2. Quebec remains included. A Canadian adult dismissing its Yes/No question remains unanswered and currently gets no affected ads. No fabricated Quebec/non-Quebec answer, forced consent or new paywall has been added.
3. Current broad NY teen fallback is not the final resolved policy. Covered-user status and territorial scope require separate reasoning for the actual provider flow.
4. Google documents a limited-ad mode enabled through `gad_has_consent_for_cookies=0`, including requests outside Europe. It still uses IP transmission data and, with the account's programmatic setting, fraud-related storage. The current bridge does not enable it. The documentation does not establish blanket clearance under Quebec section 8.1 or NY/CT minor-necessity rules. No unverified switch or rewritten refusal was shipped. [Google limited ads](https://support.google.com/admob/answer/10105530?hl=en), [iOS setting](https://developers.google.com/admob/ios/global-settings).
5. A question asking whether necessary age/region-wide eligibility exclusions are permitted is pending. This is distinct from blocking someone for refusing optional consent. No exclusion has been introduced pending that decision.
6. Live website readback still contains Not sure and an unconditional normal-cleanup sentence. The targeted retention correction is prepared in the local draft; the old whole-policy draft must not replace the current website. Final regional/availability wording depends on the release decision. No deployment or Apple edit is claimed.

## Later verification, separately

Corrected signed artifact and embedded manifest/permission/patch/configuration inspection; consolidated iPad then essentially finished iPhone acceptance; genuine permitted RevenueCat receipt; actual native presentation, recording sharing and Apple authorization/rescission integration; genuine screenshots; final App Privacy reconciliation/publication; accepted Store binary processing and owner-approved submission. The owner must test before submission. No native/cloud build, binary upload, provider mutation, credential change or submission occurred in this source-recovery batch.
