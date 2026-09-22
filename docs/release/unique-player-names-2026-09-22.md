# Unique leaderboard player names — September 22, 2026

Update: commit `57f995b` containing this correction is now pushed to GitHub main.
The subsequent [score-integrity change](score-integrity-2026-09-22.md) supersedes
the API deployment/rollback instructions below. Activate the combined migrations
and API; do not restore the unsigned finalizer when rolling back.

Implemented locally after the owner requested that multiple players must not share the same leaderboard name. The starting commit was c9ff1b8d24ae68d3d854eb1ffe48f523db4704c8; the commit containing this report is the saved candidate. Production is unchanged pending the separately reserved production-write authorization.

- A database unique index compares NFKC-normalized, lowercase names with whitespace collapsed and trimmed. Original display spelling remains intact. The database arbitrates concurrent claims; UI availability checks alone are insufficient.
- The existing authenticated, participation-gated API now provides POST /profile. The Save action confirms the name before replacing the local saved name. A conflict returns HTTP 409 and PLAYER_NAME_TAKEN with a clear name-taken message. Failures preserve the previous name. Saving before online participation remains a local draft, explicitly described as not yet checked online.
- New online run requests check saved names before issuing the run. The index also protects score finalization and older clients that do not send a name at run creation. Ownership checks, replay protections and existing rules remain in place.
- A name-conflicted queued result is retained until its existing expiry, with automatic retries paused until the player saves a different name. Refresh then retries the same run and score. Successful renames update older queued entries so they cannot later restore an old profile name. Profile deletion releases the name.
- Live read-only inspection found three profiles and three distinct normalized names. No existing profile needs a rename based on that snapshot. Migration refuses any newly introduced collision rather than silently changing or deleting a profile.

## Verification

All 68 mobile suites have passing evidence across bounded runs; eight actual PostgreSQL/PGlite tests pass. The original full attempt hit a five-minute command limit, and its initial two missing-name integration failures were corrected without weakening their assertions. The remaining suites and final integration/outbox checks passed. TypeScript, strict lint, production configuration and the changed Edge Function type check passed. Details and per-suite provenance are in evidence/unique-player-names-2026-09-22/verification.json.

The database tests reproduce duplicates on the previous schema, reject case/spacing/Unicode-equivalent names, preserve an existing name after a rejected rename, confirm one winner for queued competing claims, verify rollback and same-run retry after a collision, preserve cross-exercise ownership, and verify name release on deletion. The queued-claim test uses one PGlite connection; cross-connection arbitration relies on PostgreSQL's unique-index guarantee.

## Activation and rollback

1. Obtain the production-write authorization reserved by the attached pre-build instructions. Read back the current API and keep its exact rollback files. Recheck the normalized-name counts and migration/index state.
2. Deploy the tested flapfit-game/index.ts and _shared/apple-consent-competition.ts with verify_jwt=true. This full function also includes the previously tested, still-local bounded request-body correction. No other function, secret or setting is part of this deployment.
3. Apply supabase/migrations/20260922042503_unique_player_names.sql. Recheck the index expression and unchanged profile count. If collisions appeared since inspection, migration fails without changing names; do not rename real profiles automatically.
4. Verify API source readback and unauthorized-request rejection. Test collision behavior within an explicitly rolled-back database transaction against existing profiles, without publishing invented scores or creating real Auth identities. Recheck existing RLS/grants and database advisors.
5. A later authorized mobile build is needed for the updated Save/queued-result interface. Database enforcement works for older clients too; their existing error handling may be generic.

Rollback restores the exact prior function files. The name index can be retained for protection; removing it requires an explicit corrective decision because that reopens duplicate names. No existing scores, profiles or names are modified by the migration. No mobile build or production change occurred in this task's local implementation.

This correction concerns name ownership. It does not supply proof that a submitted score came from physical gameplay.
