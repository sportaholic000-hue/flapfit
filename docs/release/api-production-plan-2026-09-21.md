# Prepared API production correction

September 21, 2026. **Prepared only; deployment is not authorized and was not performed.**

Target: project `yhrleungvipsqlmayrfg`, function `flapfit-game`. Fresh authenticated readback still shows ACTIVE version **8**, gateway JWT verification **true**, and source matching baseline `368f829e671a39aed32cd3bfb5debbf82e3ba916`. Production therefore still contains the old body-reading defect.

## Exact change

Deploy `supabase/functions/flapfit-game/index.ts` from tested code revision `2f9b8a33404c9ed2eb809d03e41cbff8055e6a01`, together with its unchanged relative dependency `supabase/functions/_shared/apple-consent-competition.ts`. The entrypoint's LF-normalized SHA-256 is `ce5ad11ef513d786914b16e4d5b3e7767f5f44346e704c96d02317f6f14cc1c0`; the shared file is `9471e0e00c6239275420d66dbce22a1b48e053f8cde6b6483e26ce12b346800f`.

The change enforces 4,096 bytes while consuming the request stream, rejects a declared oversize before reading, cancels on overflow and preserves JSON-object validation. It also adds three query-result TypeScript annotations with no emitted-JavaScript behavior change. Tested failures include an oversized stream, early declared oversize and multibyte input that exceeded the byte limit but not the old character limit.

No migration, secret rotation, configuration change, new provider, client update or deployment of either Apple function is needed. Preserve `verify_jwt: true`. Existing Supabase URL/service-role environment values and database functions remain dependencies; do not print or copy their values. The imported Supabase SDK remains pinned at `2.109.0`. There is no function-specific deno.json/import map in this payload.

Existing clients' small JSON bodies and successful response shapes stay compatible. Previously accepted over-limit multibyte bodies now receive 413. Invalid smaller JSON remains 400. Existing Auth, ownership, terms, revocation, deletion and support behavior remains unchanged. This is a body-size limit, not a new global traffic limit or complete slow-request defense.

## Deployment transaction after explicit authorization

1. Re-read the live function and compare its version/files with the retained rollback record. Stop for review if production has changed; never overwrite an unknown later fix.
2. Verify the two tested file hashes, passing handler/type evidence and `verify_jwt: true`.
3. Call the Supabase single-function deployment tool with the prepared `api-deployment-payload.json`: project/name as above, entrypoint `flapfit-game/index.ts`, exactly these two files, JWT verification true. Do not call a deploy-all operation or apply migrations. The structured payload is retained in the audit evidence for review; it has not been sent to the deployment tool.
4. Record the new version, then retrieve its source and configuration. Verify normalized source hashes and JWT configuration against the approved payload.
5. Apply the bounded post-deployment checks below. Keep signed-in account credentials and test tokens out of reports.

## Safe verification

- Readback/version/hash/config comparison is the primary check that the tested correction actually reached production.
- Make one OPTIONS request and one unauthenticated ordinary API request; confirm CORS behavior and rejection without creating a profile or gameplay data. These requests alone do not exercise the authenticated parser.
- If authorization includes use of an existing controlled test identity, send at most three authenticated POST `/runs` requests with the current terms header: one tiny invalid-kind JSON object (400), one 4,097-byte object (413), and one multibyte object over 4,096 bytes but below 4,096 characters (413). Use invalid run kinds so the small request cannot create a run. Validate expected status/body; do not benchmark or load-test production.
- Do not create an anonymous identity, publish a score, submit a report, or delete any customer record solely to verify this deployment. If no controlled identity is available, record the authenticated checks as not run; local 21-handler regression coverage and deployed-source readback remain distinct evidence.
- Review the function's short post-change error window for unexpected failures without exporting customer payloads.

## Rollback

`live-game-rollback.json` retains the actual version-8 entrypoint and shared file fetched during this continuation; `api-plan-evidence.json` contains their hashes and baseline comparison. If the correction causes a regression, redeploy those exact files to the same function with JWT verification true. Supabase creates a new version; do not claim that the numeric version becomes 8 again. Retrieve and compare the rollback source and perform the same non-mutating health/auth checks. No schema rollback is needed.

Rollback restores the known unbounded-read defect, so use it only to recover from a demonstrated regression and record that tradeoff. Do not reset the repository or undo the unrelated mobile fixes. Current production remains version 8 until a separately authorized deployment occurs.
