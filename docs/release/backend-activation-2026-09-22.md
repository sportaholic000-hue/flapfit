# Production backend activation — September 22, 2026

**Superseded by owner-requested rollback — September 22:** Production API version 10 and the app source have returned to the implementation with unique names and no score attestation. The additional attestation requests and dependencies are removed. The unique-name fix remains. See the [current rollback record](leaderboard-rollback-2026-09-22.md). Earlier activation plans and no-rollback recommendations below are historical and superseded by the owner's explicit instruction.


The owner authorized the backend update after asking why the saved fixes were not active. The source from GitHub main commit f360385b545b4a664da5a41d0c0430df792ef88c is now deployed to Supabase project yhrleungvipsqlmayrfg. Only the two prepared database migrations and flapfit-game were deployed.

## Live state

- flapfit-game is ACTIVE version 9 with gateway JWT verification enabled.
- The name-uniqueness migration is recorded remotely as 20260922060854_unique_player_names (local file 20260922042503_unique_player_names.sql).
- The result-attestation migration is recorded remotely as 20260922060909_attest_leaderboard_results (local file 20260922050821_attest_leaderboard_results.sql).
- These migrations are already applied; do not apply them again based solely on the different local timestamps. This project already uses different local and MCP-generated migration versions. Match the recorded names and SQL before any future migration push.
- The API now includes the bounded request reader, unique-name error handling, enrollment and signed-result verification. The old unsigned SQL finalizer is private, and the old run-start RPC is no longer callable by the service role.

## Verified live

The [deployment evidence](evidence/backend-activation-2026-09-22/verification.json) records 17 passing HTTP checks. These include function startup, authenticated leaderboard reading, duplicate-name rejection (409 PLAYER_NAME_TAKEN), unsigned/unregistered run rejection (422 INTEGRITY_REQUIRED), fabricated attestation rejection, unsigned invented result rejection, direct table/RPC denial (403), and oversized-body rejection (413). Enrollment challenge creation and retry succeeded. No test score was published.

One temporary anonymous identity was created for these checks and deleted using the app's deletion endpoint. Final counts match the baseline: four Auth users, three profiles, seven scores and 146 runs. No test keys or challenges remain. The initially attempted rolled-back SQL collision check was refused by the SQL tool's read-only transaction; the successful API collision check replaced it.

All seven executable/configuration files returned by deployed-source readback match the saved source after line-ending normalization. The lockfile and MIT license were supplied in the deployment payload but are not included in Supabase's source readback. Their uploaded hashes are recorded; remote readback is not evidence of a byte-for-byte match for those two omitted files.

Database readback confirms a valid unique-name index; RLS on the new tables; no anonymous/authenticated table-write or public-function execution rights; and service-role-only entry to the new integrity RPCs. Other public score tables also deny direct client writes. The other two Edge Functions retain their previous versions.

## Remaining trust boundary

This is protection against bare API submissions and modification/replay of signed results. It is not complete gameplay verification. The current native signCompetitionResult bridge accepts score and duration supplied by JavaScript, checks basic bounds, and signs them. The gameover WebView message supplies those values. The backend validates the signature, ownership, nonce/counter, timing and plausibility; it does not independently reconstruct the game or verify camera movement.

Consequently, these checks do not demonstrate resistance to manipulation before signing in a compromised/instrumented app, or to camera spoofing. No such signed bypass was reproduced during this deployment check, and the source limitation must not be described as proof that an ordinary remote caller can currently forge an accepted score. Do not call the overall leaderboard cheating problem fully solved.

Successful enrollment and publication from the matching signed native app still require real-device verification. Older binaries cannot publish through the new API because they lack its native signing bridge. Existing published scores were retained, not retroactively verified.

## Advisors and recovery

The security advisor's no-policy notices for the integrity tables are expected: they are private to the service role, have RLS enabled, and explicitly deny client grants. The cron-policy warnings remain inaccessible to client roles because they have no cron schema USAGE. The previously recorded password-protection setting was not changed. Performance notices concern unused indexes; the new foreign-key/user lookup indexes are retained for their intended operations. These results do not establish that the separate mobile/build dependency advisories are resolved.

Advisor references: [RLS enabled without policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [anonymous access policies](https://supabase.com/docs/guides/database/database-advisors?queryGroups=lint&lint=0012_auth_allow_anonymous_sign_ins), [password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), [unused indexes](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).

If further correction is needed, preserve the restricted grants and repair the attested API. Do not restore the unsigned finalizer. No native build was created during this activation.
