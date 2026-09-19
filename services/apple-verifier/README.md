**Superseded for launch:** the owner rejected adding a backend/hosting bill. The compatibility correction now runs successfully inside the existing Supabase receivers. This service remains undeployed and is not required. See docs/release/apple-consent-receiver-2026-09-19.md.

# Apple signature verification on Node

Prepared locally; **not deployed or connected to the app**. The approved Supabase
receiver's hosted runtime reports Deno 2.1.4 compatibility and lacks X509 methods
required by Apple's official verifier. Node 24 passes the genuine Apple TEST.
This service preserves Apple's pinned 3.1.0 verification library and online OCSP;
it does not replace signature verification with custom cryptography.

This stateless service needs only `APPLE_VERIFIER_SHARED_KEY` (at least 32 random
bytes, encoded as hex) and `PORT`. It does not need an Apple private key, a
Supabase service key, database access, or RevenueCat credentials. It receives
Apple-signed notification/AppTransaction data, verifies it, and returns only fields
needed by the existing consent receiver. It does not log bodies, keep records,
grant processing permission, or change revocations.

Authentication is required on `/production/notification`,
`/production/app-transaction`, `/sandbox/notification`, and
`/sandbox/app-transaction`. Bodies are JSON `{ "signedPayload": "..." }`.
Environment is fixed by the route; failure never retries the other environment.
`GET /health` returns readiness without user data. Run behind HTTPS with the
shared key stored as a secret; it must not be shipped in the mobile app.

Verification performed September 19, 2026:

- Six local HTTP boundary tests passed: authentication, paths, size limits,
  redacted failures, fail-closed signature rejection and environment isolation.
- A genuine Apple-signed Sandbox TEST returned 200/TEST/2.0 through this exact
  local HTTP handler using the actual pinned verifier and online checks.
- Signature tampering and sending Sandbox data to Production each returned 400;
  missing valid service authentication returned 401.
- Container deployment and hosted TLS/OCSP behavior have not been tested.

Deployment requires approval of the hosting/data destination and any cost. The
only existing Railway project found belongs to another app and was left alone.
No service, project, domain, secret or subscription was created. After approval,
deploy a separate service, establish its shared secret with the Supabase receiver,
and require authenticated HTTPS verification before existing database operations.
No secret may be exposed in logs, response data or Git. Supabase remains the
authority for denial storage, account authentication and competition checks.

Hosted verification must be proven with a new Apple TEST, including rejection of
tampered/wrong-environment inputs, before claiming repair. A TEST does not prove
real RESCIND_CONSENT persistence, app linkage, installed-app gating, or RevenueCat
event receipt.
