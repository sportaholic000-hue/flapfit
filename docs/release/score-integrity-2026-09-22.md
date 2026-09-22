# Leaderboard score integrity — 2026-09-22

**Superseded by owner-requested rollback — September 22:** Production API version 10 and the app source have returned to the implementation with unique names and no score attestation. The additional attestation requests and dependencies are removed. The unique-name fix remains. See the [current rollback record](leaderboard-rollback-2026-09-22.md). Earlier activation plans and no-rollback recommendations below are historical and superseded by the owner's explicit instruction.


## Status

Implemented in source; **not deployed and not device-verified**. The six previously
local commits through `57f995b` were pushed to GitHub main before this work began.
This change is being committed and pushed with its verification evidence.

The previous API accepted a guest-authenticated run ID plus client-supplied score
and duration. Server elapsed-time and plausibility checks did not establish that
the genuine app produced the result. A script could wait and submit an invented,
plausible score. Earlier statements that those timing checks fully resolved score
forgery were incorrect.

## Protection implemented

- The existing iOS native module generates an Apple App Attest key per local
  online identity. Its private key stays in the Secure Enclave. The identifier
  uses non-synced, device-only Keychain storage. A pending attestation is retained
  only until registration is confirmed, for recovery from a lost acknowledgment.
- The API issues an expiring random enrollment challenge. It checks the Apple
  certificate chain, nonce, key identifier, production environment and the fixed
  FlapFit App ID `KM48R8T97P.com.flapfit.game`. The prefix was verified against an
  existing signed provisioning profile. Clients cannot supply a different App ID.
- On iOS 27, provided distribution extensions must identify TestFlight, App Store,
  or enterprise/ad-hoc distribution. Development/re-signed/unknown categories
  reject. Earlier iOS authenticator formats remain supported.
- Each server run binds an owned registered key and fresh random nonce. After the
  existing game-over flow supplies the result, native code signs the run ID,
  nonce, score and duration. The app stores the completed signature with the
  result. Retry never signs editable queue contents.
- The API verifies that signature before calling the new SQL finalization RPC.
  The database locks the key/run and atomically commits counter advancement,
  score publication and the proof receipt. A lost acknowledgment can retry the
  identical proof even after a newer result. Altered results and counter replays
  reject. Existing timing, ownership, expiry and name-uniqueness checks remain.
- A conflicting name does not consume the proof/counter. Later queue entries
  wait so the same signed score can be published after the name is corrected.
- The old unsigned finalizer is renamed and its API-role grant removed. Direct
  client access to the new tables/functions is denied. The new RPC is restricted
  to the service role, which is never present in the app. Deletion cascades the
  backend keys/challenges and removes the local key identifier.

No camera frames, recordings or pose landmarks are uploaded for this protection.
This does not independently prove a human exercised, prevent camera spoofing, or
guarantee security on a fully compromised device. It closes the demonstrated
bare-API score fabrication route and binds scores to a genuine app installation.
Local gameplay and advertising behavior are unchanged. Unsupported verification
or a verification failure prevents leaderboard publication, not local play.

## Verification

Evidence is in `evidence/score-integrity-2026-09-22/verification.json` and the
associated logs. Checks include real Apple production attestation/assertion
fixtures, wrong app/nonce/signature, modified scores/durations/run IDs, expired
certificates, development distribution, bounded CBOR, PostgreSQL permissions,
service-role operation, counter replay, atomic rollback, exact retries, old RPC
closure and deletion. The native bridge/queue/API tests, existing native bridge
tests, existing competition/privacy integration tests, TypeScript, lint and
production configuration checks were run.

The crypto suite also runs through the existing Supabase Deno 2.1.4 compatibility
branch under the local Deno runtime. This is not an actual hosted-runtime or
device test. Windows cannot compile the iOS frameworks. A real device must still
confirm enrollment, successful game-over publication, offline retry, and profile
deletion with the signed App Attest entitlement.

The verifier is a vendored copy of node-app-attest 1.0.1 with its MIT license.
Only its crypto/Buffer imports were adapted so the existing X509 compatibility
layer is used on Supabase's older runtime. The enclosing validator adds bounds,
certificate validity/CA checks and extension checks. Exact dependencies and
integrities are locked in `supabase/functions/flapfit-game/deno.lock`; the final
55-package backend graph returned no npm advisories on 2026-09-22. This does not
resolve or reclassify advisories in other application/build dependency graphs.

## Activation and compatibility

Production writes require the separate authorization retained in the user's
pre-build instructions. No mobile build or production write was performed here.

1. Apply the pending name-uniqueness migration
   `20260922042503_unique_player_names.sql`, then
   `20260922050821_attest_leaderboard_results.sql`.
2. Deploy `flapfit-game` with `verify_jwt=true`, its `deno.json`/lockfile,
   `integrity.ts`, `app-attest/*.js`, shared competition authorization helper and
   existing `flapfit-apple-consent/crypto-compat.ts`. No new backend secret is used.
   The deployment includes the previously tested bounded-body correction.
3. The matching native app requires the production App Attest entitlement on its
   App ID/provisioning profile. The existing config plugin declares it to Expo/EAS.
   Provisioning/capability synchronization and the actual signed entitlement must
   be checked when a native build is authorized. An OTA JavaScript update cannot
   supply the new DeviceCheck bridge.
4. Verify an unauthenticated call is rejected, an authenticated unsigned result
   is rejected with `INTEGRITY_REQUIRED`, registered-key enrollment succeeds on a
   real device, normal results publish, and modified/replayed results do not.

Applying the migration closes the old unsigned API immediately. Older installed
builds cannot publish new leaderboard scores after activation; their local game
still works. Existing unsigned queue entries are not upgraded into signed scores.
Existing published scores are not deleted or retroactively certified by this
change.

Rollback must not restore the unsigned score-writing route. If activation fails,
retain the restricted SQL grants and repair the attested API/client; leaderboard
publication remains closed while local gameplay continues. Do not revert to the
old API and regrant the old finalizer as a routine rollback.

Primary references:
- https://developer.apple.com/documentation/devicecheck/validating-apps-that-connect-to-your-server
- https://developer.apple.com/documentation/devicecheck/establishing-your-app-s-integrity
- https://developer.apple.com/documentation/devicecheck/preparing-to-use-the-app-attest-service
- https://developer.apple.com/videos/play/wwdc2026/201/
