# Updated account audit: three reproduced source findings

Branch: `wip/crash-protection-20260920`. The commit containing this evidence is the
combined corrected successor. **Build remains held.** No native/cloud build, binary upload,
Apple edit, deployment, privacy publication or device-acceptance request occurred.

The updated supplied account audit was reviewed against the current workspace, not reset to
its historical target. Finding 1 was already corrected and remotely verified at
`b2916d0eb218823dc8edac88ad6bf7fddf8d9429`; findings 2 and 3 reproduced on that successor.
Prior fixes, RevenueCat feature-access evidence, checklist reconciliation and unrelated local
work remain preserved. Exact input hashes and check results accompany this report.

## Finding 1 — saved refusal lost when choices cannot be read

**REPRODUCED AND FIXED; retained and revalidated in this successor.** See
[the first correction record](privacy-choice-read-recovery-2026-09-20.md).
The original production-boundary reproduction on f9ff7cf had 14 failing cases and six
passing controls. Failed/invalid non-null reads no longer become first-run defaults:
processing stays closed, bytes are untouched, and unrelated choice/region saves cannot
overwrite the unread record. Real notice restoration and the existing Info retry reread it.
Pending immediate refusals override older stored grants. Recovery and restart retain reporting
refusal while independently permitted Google ads initialize. A genuinely absent first-run
record still works through the reviewed notice route.

The real processing-access, notice, launch-policy and monetization modules are exercised for
US/AU/MX with rejected read, invalid JSON, invalid record, empty string, successful refusal
read, recovery/unrelated save/restart and genuine first-run controls. RevenueCat configure
and module-load counts remain **0** when refused; permitted Google initialize is **1** after
recovery. The rendered load retry remains reachable after failure. The complete final suite
reruns these tests rather than relying only on their earlier result.

## Finding 2 — older Allow overwrites newer Stop

**REPRODUCED AND FIXED.** At b2916d0, an older Allow waiting on notice restoration ended
with reporting **granted** after Stop had completed. This reproduced both through the real
Canadian startup/Compete/monetization coordinator and in the rendered privacy component after
unmount/remount. The original audit's UI reachability risk is now also a rendered regression.

An Allow action now reserves its per-purpose revision synchronously, before its first await.
It must still be current before saving a grant, entering the notice-write queue, updating the
activation state, or handling a failed write. A newer Stop invalidates the old action across
those boundaries. Withdrawal deduplication only reuses a pending confirmation when its choice
revision is still current; an intervening Allow requires a new Stop save/confirmation.

| Regression | Final corrected result |
| --- | --- |
| Allow only, delayed notice | Granted; actual RC configure stub called once |
| Stop only, same delayed notice | Denied; RC configure 0 |
| Earlier Allow, then completed Stop, then notice resumes | Runtime and saved choice denied; RC configure 0 |
| Collapse/unmount/remount before Stop | Saved denial and completed stop status retained after the old Allow resumes |
| Old Allow delayed at choice write or notice write | Newer denial remains in runtime/storage; RC configure 0 |
| Later explicit Allow after completed Stop | Still works; the fix does not permanently disable reporting |
| Repeated Stop without an intervening action | Retains the existing shared pending withdrawal |
| Stop after an intervening Allow intention | New save/confirmation; cannot reuse an older Stop result |

Separately allowed advertising and competition remain allowed throughout the applicable
controls; permitted Google initialization is still verified through the actual coordinator.

## Finding 3 — Apple-required competition bypasses pending deletion

**REPRODUCED AND FIXED.** At b2916d0, required-Apple ordinary requests passed the pending
marker with both existing and absent sessions. A real deletion call receiving a simulated
503 left deletion pending, yet the subsequent begin-run reached the network. Deletion during
Apple status, session lookup and account linking also let stale preparation continue.

Ordinary requests now check pending deletion before identity lookup/signup or Apple linkage,
even when they later pass an existing session to the dispatcher. The dispatcher independently
checks before ordinary identity use and game dispatch. Starting deletion immediately closes
ordinary access and advances a deletion revision before waiting for the outbox, storage or
Auth. Active operations are invalidated; late preparation must match the original revision.
The guard remains after failure and clears only after successful local deletion cleanup.

| Regression | Final corrected result |
| --- | --- |
| Pending marker × Apple required/not required × session present/missing | Auth lookup/signup 0; Apple link 0; ordinary game dispatch 0 |
| Real delete returns 503 and existing-user Auth check succeeds | Pending marker retained; subsequent POST /runs blocked before ordinary Auth/link/dispatch |
| Deletion begins during Apple status, session read, or Apple link | No later ordinary identity/signup/link/game step proceeds; late results cannot reopen access |
| Deletion completes while old preparation waits; new terms then accepted | Old operation remains invalidated; only a fresh request may create/link a new profile |
| Explicit support lookup and deletion retry while blocked | Remain available through the independent rights client; successful retry clears marker and signs out |
| Existing deletion ambiguity, lost acknowledgement, missing-session and timeout cases | Retained and passing; no replacement anonymous profile or fabricated deletion success |

This is a client-boundary correction. It does not claim a live backend deletion or a physical
Apple-account result. The hosted database, policies, credentials and APIs were not changed.
The locked Supabase client remains unchanged; official changelog and
[session](https://supabase.com/docs/reference/javascript/auth-getsession)/
[anonymous sign-in](https://supabase.com/docs/reference/javascript/auth-signinanonymously)
references were checked for the existing Auth calls.

## Independent verification evidence

- Before the two additional production corrections: **8 new regressions failed, 7 controls
  passed** on b2916d0. The targeted name filter deliberately excluded unrelated tests; it was
  not a full-suite run. Exact case names/failures are in the accompanying JSON.
- Final complete suite: **60 suites / 1171 tests passed; no pending tests**.
  TypeScript, strict applicable lint, collected-data/required-reason checks and production release
  validation passed using the locked dependencies. No tests were removed or assertions weakened.
- The outbox suite now creates a fresh service per independent test because pending deletion is
  intentionally process-wide. All previous assertions remain; clearing only fake storage no
  longer leaks an earlier test's unresolved deletion into the next fixture.
- Actual local EAS archive: **772 files / 285 required inputs** match the checked
  source. The release validator ran **inside the packaged copy** and passed. Credentials/signing,
  backup/web and dependency/cache exclusions passed. This was packaging inspection, not a build.
- Check summaries, before/after cases, source SHA-256 values, exact reproduction commands and
  audit-file fingerprint: `audit-three-findings-checks-2026-09-20.json`.
  Package/input evidence: `audit-three-findings-package-2026-09-20.json`.

The genuine RevenueCat **Ad Revenue** and **Impressions** charts were already accessed in
authenticated project `a58d3dbd`, with Charts v3 enabled and no feature gate. That evidence
remains in the first correction record. SDK keys, AdMob ILAR On, Published consent messages,
PG ceiling and completed Apple fields have not been reopened or changed.

**Still not claimed:** a corrected compiled artifact, installation/device acceptance, genuine
RevenueCat event receipt, live Apple authorization/rescission, authoritative App Privacy
publication, Store binary processing/attachment, screenshots or submission readiness.
The separate Xcode Organizer PDF remains not generated/deferred. Those distinctions and the
reconciled checklist remain in force. This successor is supplied for independent verification;
it does not authorize a build.
