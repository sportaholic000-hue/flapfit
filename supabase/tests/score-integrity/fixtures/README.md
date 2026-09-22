The two attestation fixtures and the real assertion in `../integrity.test.ts`
come from the MIT-licensed node-app-attest tests:
https://github.com/uebelack/node-app-attest/tree/main/test (retrieved 2026-09-22).
The license is included here. These are public example credentials, not FlapFit
credentials. Tests validate the old attestations at their issuance date and
separately verify that the production validator rejects them as expired today.
Synthetic signatures exercise FlapFit payload binding; they do not replace the
real Apple vectors or the pending real-device verification.
