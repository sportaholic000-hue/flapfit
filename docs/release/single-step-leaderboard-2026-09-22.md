# Single-step leaderboard submission — September 22, 2026

The earlier attestation rollback restored the previous two-request flow. The owner subsequently required removal of that unnecessary per-run flow while preserving access controls, unique names and request-size protection. This report is the current submission/deployment record.

## Matching client and production API

Production flapfit-game version 11 is ACTIVE with JWT verification enabled. New gameplay prepares only local queue metadata: no anonymous session lookup, signup or leaderboard request is needed to obtain a run ticket. After an eligible game finishes, the client sends one score POST to /leaderboard containing playerName, exercise and score. The live endpoint returns 200 for that payload; it no longer returns the old 410 response. Existing first-use identity and participation checks still apply when publishing. This is one score request, not a claim that all first-use Auth activity disappears.

POST /runs is retired before Auth/database work and returns 410 to obsolete callers. The service role no longer has permission to create run tickets. Existing game_runs records and their RLS remain; new submissions create no rows there. Results already queued by previous clients can still use /runs/finalize until their existing expiry. This is compatibility for old results only; new gameplay does not enter that path.

## Preserved protections

- The API derives ownership from the verified anonymous session and ignores caller-supplied user identifiers.
- RLS and direct-client table/RPC denials remain. The new SQL function is callable only by the service role, with an empty search path.
- The existing database index enforces normalized unique names. Name and score changes commit together, so a collision cannot partly overwrite a profile or score. Name Save and conflict/retry handling remain.
- Request bodies remain bounded to 4096 bytes while reading, and names/exercises/integer score bounds are validated.
- Repeated or lower score submissions cannot duplicate a leaderboard row, lower the best score, or change its existing score timestamp on a tie. This uses the existing best-score operation, without a per-run receipt table.
- Existing terms, participation, deletion and moderation behavior remain. New submissions are claimed game results, not proof of physical exercise; no replacement anti-cheat service was introduced.

The change removes a pre-play Edge request, server run insertion and run-finalization bookkeeping for new results. It adds no paid service, plan upgrade, attestation call or recurring verification request. Existing hosting still has its normal usage; no unlimited-free-hosting claim is made. Advertising and gameplay/calibration are unchanged.

## Verification and deployment

The [evidence](evidence/single-step-leaderboard-2026-09-22/verification.json) records 15 successful live checks, including successful one-step score publication, reading back the correct owner, duplicate-name rejection, repeat/lower score preservation, direct-client denials and 413 for an oversized body. The temporary verification user and score were deleted. Final counts remain four Auth users, three profiles, seven scores and 146 game_runs rows.

A real PostgreSQL/PGlite test checks the new transaction, revoked run-start privilege, normalized uniqueness, atomic conflict rollback, client-role denials, preserved RLS, best-score retries and zero run rows. The four focused app/API suites passed 178 tests in their initial run; two outdated transport fixtures were corrected and both remaining tests then passed, covering all 180 cases. TypeScript, strict lint and Deno type checking passed. No production change was needed to fix those two test fixtures.

Local migration 20260922064932_single_step_leaderboard_submission.sql is applied remotely as 20260922065835_single_step_leaderboard_submission. All three deployed source/configuration files match the tested payload after line-ending normalization. Database advisors were recorded; existing unrelated notices were not altered. The migration preserves existing table policies and data.

The current source still needs its separately authorized native test build. Existing installed binaries do not acquire this JavaScript change automatically. No build was started. Do not deploy the older version-10 two-request API or restore run-start grants as a routine rollback; correct the single-step implementation while retaining the owner's stated request/cost limits.
