# Apple consent rescission receiver

Source and live deployment checkpoint: both migrations applied, Production receiver version 1 and Sandbox receiver version 4 active, and flapfit-game version 8 active after explicit owner deployment approval. Live malformed-signature/status checks return 400, missing link/game authentication returns 401. Genuine Apple TEST delivery FAILED on the hosted Deno runtime; see the runtime blocker below. Installed linkage remains unverified.
This records Apple's `RESCIND_CONSENT` independently of age, parental permission, advertising,
RevenueCat and competition decisions. A valid download or absence of a denial never grants consent.
Local gameplay, accepted calibration, recording, sharing and result-exit ad placement are unchanged.

## Fixed routes and native contract

| Environment | Function | Gateway JWT |
| --- | --- | --- |
| Production | `flapfit-apple-consent` | false; Apple signed-message verification is mandatory |
| Sandbox | `flapfit-apple-consent-sandbox` | false; independently fixed Sandbox verifier |
| Launch competition | `flapfit-game` | true; its denial check is fixed to Production |

Production/Sandbox entrypoints pass literal environments to the shared runtime. Neither a request
header, payload preference, failed request nor a project-wide environment toggle selects another
verifier. Native verified `AppTransaction.environment` selects the client endpoint; the server
independently verifies it. Do not retry a failed Production check against Sandbox.

Both consent functions accept these JSON POST routes, with a 64 KiB body limit and no-store responses:

- `/notifications`: `{signedPayload}`. Verify the outer Apple JWS and, for `RESCIND_CONSENT`,
  `appData.signedAppTransactionInfo`. Commit denial and notification UUID atomically before HTTP 200.
- `/status`: `{signedAppTransaction}`. Independently verify the native transaction; return
  `{status:'revoked'|'no-revocation-recorded', checkedAt:ISO}`. No authentication account or identity
  mapping is created. A public project API key is permitted; no user bearer token is required.
- `/link`: same body plus an existing user bearer token. Live `auth.getUser(token)` supplies the
  user ID; caller-supplied IDs are ignored. Never creates or refreshes a competition account.

The native wrapper is `getVerifiedAppleAppTransaction()` in
`apps/mobile/modules/flap-fit-age-range/app-transaction`. Do not decode the JWS to infer authority
in JavaScript, persist/log it, or send it or its identifiers to RevenueCat/AdMob.
There is intentionally no un-revoke/reset endpoint. A new download, JWT, or age response does not
erase a recorded rescission; reinstatement needs separately verified explicit authority.

## Verification and stable secret

Apple's official verifier is pinned to 3.1.0 and Supabase JS to 2.109.0 with a Deno dependency lock.
Bundled public Apple G2/G3 roots were downloaded from Apple's PKI site; SHA256 fingerprints are
recorded beside their bytes. Online certificate revocation/current-expiration checks are enabled.
Bundle `com.flapfit.game`, app ID `6813280704`, and the fixed environment are checked for outer and
nested messages. Production requires the app ID; Sandbox rejects it if present and mismatched.
Xcode/local-testing signature bypass modes are never used.

Read-only inspection confirmed the existing project has `supabase_vault 0.3.1`,
`pgcrypto 1.3`, `vault.decrypted_secrets` and `extensions.gen_random_bytes(integer)`.
No secret value was queried or output.

The second migration generates 32 random bytes inside Postgres and stores their hex encoding in
Vault under the fixed name `flapfit_apple_consent_hmac_v1`, **only if absent**. It never returns,
logs, hardcodes or overwrites the value. If consent records already exist but the key is missing,
migration fails and requires restoration instead of silently creating an incompatible key.

At Edge cold start, the existing service-role client calls `get_apple_consent_hmac_key()`.
A private SECURITY DEFINER helper reads only this named Vault secret, verifies the actual invoking
Postgres role is service_role and `auth.uid()` is null, and validates its format. The public wrapper
is SECURITY INVOKER; both functions deny PUBLIC/anon/authenticated execution. No broad service-role
grant on Vault tables/views is added. The secret remains in isolate memory and is never included in
responses or logs. Failed initialization remains retryable and fails closed. No additional CLI
login, environment secret or Apple .p8 is required by this design.

Do not rotate/delete this key without a denial-preserving migration: it anchors all persisted
transaction hashes. HMAC-SHA256 includes a version prefix and environment, separating Sandbox
identities from Production identities.

## Persistence and account controls

The private schema uses RLS, no anon/authenticated access, and service-only invoker RPCs for
revocations/status/linkage. It stores keyed transaction hashes, notification UUID/times,
environment, and optional auth-user links; no raw transaction/Apple identifiers, JWS or age data.
UUID replay is idempotent; a conflicting UUID/payload is rejected. Failed persistence rolls back
the UUID so Apple can retry safely. Verification/network/DB failures never return cleared status.

Linked Production competition requests check denial before leaderboard access, run start or
result submission. Authenticated account deletion and safety/reporting remain accessible.
Deleting an auth user removes its link while preserving the minimal denial for subsequent
verified reinstalls. A Sandbox client/status test plus SQL environment isolation is **not** proof
of Sandbox server-side competition blocking: that requires a separately isolated game test endpoint,
which is intentionally not added to the launch game handler.

## Verification and deployment

Dedicated tests: `supabase/tests/apple-consent`; Node 24, `npm ci`, `npm test`.
They use the actual pinned Apple verifier for forgery rejection and local PGlite for running the
actual SQL privilege/atomicity logic. Vault-specific tests use a clearly synthetic Vault interface;
they do not claim to test Vault encryption. Installed Vault availability was checked read-only.

Type-check each consent function from its directory with `deno check index.ts`; lint shared
runtime/core/verifier and entrypoints. No successful real Apple-signed delivery/device integration
is claimed by these local tests.

Deployment order:

1. Apply `20260919185246_apple_consent_rescission.sql`, then
   `20260919194303_apple_consent_vault.sql`. The latter creates the Vault key without exposing it.
2. Deploy both fixed consent functions, including shared runtime, public roots, import maps and
   dependency lock. Deploy updated `flapfit-game` with JWT verification still enabled.
3. Configure App Store Connect V2 Production/Sandbox notification URLs ending in
   `/flapfit-apple-consent/notifications` and `/flapfit-apple-consent-sandbox/notifications`.
4. Verify hosted cold-start Vault access and OCSP, genuine signed native status/linkage, actual
   Apple notifications, foreground/relaunch/queued-work refusal, and account deletion.
   Do not query or display the key RPC result using management tools.
5. Reconcile missed notifications through Apple's supported history route where available.
   A history client or automatic reinstatement mechanism is not included here.

An AppTransaction signature proves Apple signed the transaction, not possession of the original
device by an arbitrary HTTP caller. The signed transaction is treated as bearer proof exposing only
denial status. Do not describe it as device attestation or parental consent. Unlinked Apple identities
are not discoverable from a competition JWT; client linkage and any stronger ownership requirements
remain integration responsibilities. Local-app restrictions following rescission must follow the
app's separate Apple/legal policy; this backend does not make that worldwide decision.

## Official references

- [Apple official verifier](https://github.com/apple/app-store-server-library-node)
- [Apple AppData/nested transaction](https://developer.apple.com/documentation/appstoreservernotifications/appdata)
- [Apple notification types](https://developer.apple.com/documentation/appstoreservernotifications/notificationtype)
- [Apple public certificate authorities](https://www.apple.com/certificateauthority/)
- [Supabase Vault](https://supabase.com/docs/guides/database/vault)
- [Supabase authentication headers](https://supabase.com/docs/guides/functions/auth-headers)
- [Supabase changelog](https://supabase.com/changelog.md), checked September 19, 2026.

## Hosted runtime blocker discovered by genuine delivery

Both App Store notification URLs are saved. Official Sandbox TEST delivery failed despite local signature verification succeeding. The hosted runtime is compatible with Deno 2.1.4 and lacks required X509Certificate APIs. Temporary redacted diagnostics were removed; current Sandbox version 4 has the original reviewed source hash. The current endpoint fails closed but cannot yet verify genuine notifications. This is a release blocker. See services/apple-verifier for the locally tested, undeployed Node execution option. Do not claim that 400/401 rejection checks established valid delivery.
