# Production Apple notification follow-through

Checked September 20, 2026. Existing receiver versions and the 39-test backend
result are unchanged. Genuine Sandbox TEST delivery succeeded. Production TEST
returned 401 and delivery remains unverified.

An [Apple App Store Commerce Engineer](https://developer.apple.com/forums/thread/806452)
states production App Store Server API access is unavailable before a production
release. The observed pre-release response is consistent with that restriction;
this does not exclude every credential issue or prove future delivery.
[Request a Test Notification](https://developer.apple.com/documentation/appstoreserverapi/request-a-test-notification)
also documents invalid JWT as a 401 cause.

Keep signature and fixed-environment verification intact. Do not add purchases,
regenerate credentials, or route failed Production verification to Sandbox.
After the first production release, request a Production TEST with the existing
approved server-API credentials, then retrieve its actual delivery status.
If it remains unauthorized, investigate issuer, key, bundle and JWT validity.
This server check needs no additional physical-device session. Genuine native
transaction linkage and actual rescission remain separate installed-flow proof.
No new Production TEST or successful Production receipt is claimed here.
