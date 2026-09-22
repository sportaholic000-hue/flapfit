# Leaderboard attestation rollback — September 22, 2026

**Current submission flow — September 22:** The subsequent [single-step leaderboard update](single-step-leaderboard-2026-09-22.md) is deployed as API version 11. New games make no run-ticket request; completed scores use POST /leaderboard. Unique names, RLS, ownership and body limits remain. Earlier two-request/attestation descriptions below are historical.


The owner rejected the attestation change and any increased operating costs, explicitly requested rollback, and confirmed that unique player names must remain. This instruction supersedes the previous attestation report's no-rollback recommendation.

## Current implementation

Production flapfit-game version 10 restores the API implementation from 57f995b. The mobile implementation also matches 57f995b. Apple App Attest enrollment, result signing, extra integrity requests, key/challenge storage, native entitlement/framework additions, verifier dependencies and proof columns are removed. No replacement anti-cheat service or extra recurring requests were added. The existing backend still has its ordinary usage; this does not promise unlimited free hosting.

The unique player-name fix remains in the database, API, app Save flow and queued-result handling. Existing request-body limits, authentication, ownership, expiry, rate limits, timing/plausibility and replay checks remain. These checks do not independently prove a physical camera exercise run, and the leaderboard is not described as cheat-proof. Advertising and local gameplay were not changed.

## Deployment and verification

- Local migration: 20260922062925_remove_score_attestation.sql. Production migration: 20260922063434_remove_score_attestation.
- Original forward migration files remain as history. A fresh database applies the forward migration followed by this removal migration. Do not reapply either solely because local and MCP-generated timestamps differ.
- The previous attempt to deploy without an import map was refused because Supabase retained the version-9 path. A minimal deno.json replaces that path; it contains no attestation imports. The subsequent deployment succeeded as version 10. All three returned source/config files match the rollback payload.
- Eight existing PostgreSQL tests passed. The new migration-cycle test passed after correcting the test to check duplicate names through the scoring RPC instead of a direct profile write under the test fixture's service role. It verifies preserved scores/profiles, removal of attestation objects, restored service-only RPC access, denied client writes, successful finalization, rejected changed replay/impossible duration, and retained name uniqueness.
- Four focused mobile suites / 175 tests passed. Mobile TypeScript and restored API Deno type checks passed.
- Nine live HTTP checks passed: startup, unauthorized rejection, leaderboard reading, duplicate-name rejection, removed integrity endpoint, successful run creation without attestation, retained timing rejection, closed legacy direct-score endpoint, and temporary identity/run deletion. No score was published by this check.
- Final production counts remain four Auth users, three profiles, seven scores and 146 runs. The unique-name index is valid. Integrity tables and columns are gone. Only the service role can invoke the restored run RPCs.
- Database advisors were rerun and retained in the evidence. Pre-existing cron/schema and password-setting notices were not altered by this rollback; the removed integrity tables no longer generate their previous notices.

[Verification evidence](evidence/leaderboard-rollback-2026-09-22/verification.json) contains the deployment identity, source readback, grants, counts and live results. Earlier attestation/activation reports are historical, not the current release implementation. No mobile build was created.
