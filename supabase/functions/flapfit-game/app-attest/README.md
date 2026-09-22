Verifier source from node-app-attest 1.0.1 (MIT, license included):
https://github.com/uebelack/node-app-attest/tree/main/src

The two verifier files retain upstream validation. Their only adaptations are
explicit `node:buffer` imports and reading crypto functions from the default
`node:crypto` object. This allows the existing Deno 2.1.4 X509 compatibility layer
to take effect. Named ESM imports retain the original, incomplete X509 class.
The enclosing `../integrity.ts` supplies strict bounds, certificate date/CA
checks, CBOR validation, distribution checks and a fixed FlapFit App ID.
Counter ordering and one-time challenge consumption are enforced atomically in SQL.
