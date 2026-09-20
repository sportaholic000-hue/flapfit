# Flap Fit locked dependency audit

Audit date: 2026-09-15

Command: `corepack yarn npm audit --recursive --all`

The fresh registry check returned a nonzero status with no critical advisories. It reported high and
moderate advisories plus deprecation notices in the locked graph. This file records reachability so
a generic audit result is not confused with code that ships and handles untrusted data on the phone.

## Findings and exposure

| Package                | Dependency path                                                                               | Current exposure assessment                                                                                                                                                                                                         | Release action                                                                                                                  |
| ---------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `@xmldom/xmldom`       | Expo config plugins, Xcode/plist tooling, and the native configuration side of `expo-sharing` | The reported invalid-name/serialization and malformed-input resource-exhaustion cases are in native project generation. Flap Fit does not parse user XML in the installed app or build from user-supplied XML.                      | Monitor the Expo SDK 57 patch line and update through Expo compatibility guidance, not an untested lockfile override.           |
| `js-yaml`              | Jest coverage and ESLint configuration tooling                                                | The reported merge-source CPU issue is in build/test tooling. Flap Fit does not parse user YAML at runtime or accept YAML in its release workflow.                                                                                  | Monitor upstream. Do not feed untrusted YAML to local build commands.                                                           |
| `postcss`              | Direct development dependency plus the checked-in web styling scaffold                        | The reported source-map file-read/path-traversal cases require attacker-controlled CSS/sourceMappingURL input during a build. Native gameplay does not run PostCSS, and the release build processes only checked-in project styles. | Remove or update only with explicit dependency-change approval; it is not a shipped native-runtime path.                        |
| `uuid`                 | Optional `@expo/ngrok` development tunnel and Xcode tooling                                   | The affected buffer API is not called by Flap Fit runtime code.                                                                                                                                                                     | Keep the locked Expo-compatible toolchain until an upstream-compatible patch is available.                                      |
| `decode-uri-component` | `expo-router` through `query-string`                                                          | Reachable through Expo Router link parsing, but Flap Fit does not accept a user data payload or privileged action from a URL. The advisory is denial of service for pathological malformed input, not data access.                  | Monitor Expo Router updates and keep all URL-driven actions non-privileged. Reassess before adding deep-link challenge actions. |

Deprecated `abab`, `domexception`, `glob`, `inflight`, `whatwg-encoding`, and ESLint notices were
also reported through Jest/jsdom or local lint tooling. They are not native app runtime modules.

The September 15 audit added multiple new 2026 advisories for the same `@xmldom/xmldom` build-time
path and current `js-yaml`/`postcss` versions. That changes the registry count and severity labels,
but not the reachability conclusion above. The locked app still completed production-mode iOS and
Android exports after the audit.

## Decision

Do not force transitive resolutions or broadly upgrade the SDK immediately before submission. Expo's
native packages are version-coupled, and an untested override presents greater camera, recording,
and build risk than the current non-critical, mostly build-time findings. Re-run this audit before
each release and apply Expo-supported patch updates when available.

## September 19 candidate recheck

Fresh locked-graph registry check: 29 advisory rows and 6 deprecation rows; no critical severity. Exit status 1 is retained, not described as a clean dependency audit. All affected package families and exposure paths match the earlier assessment. The moderate decode-uri-component malformed-URL denial-of-service remains reachable through Expo Router and is not claimed fixed. No blanket upgrades or forced transitive major-version changes were made. Detailed scope is in evidence/dependency-audit-2026-09-19.json.


## URI decoder backport completed — September 19, 2026

The previously recorded runtime malformed-URL DoS is now mitigated by a narrow, verified Yarn backport of the official fixed scanner. See uri-decoder-backport-2026-09-19.md and evidence/uri-decoder-verification-2026-09-19.json. The package version stays 0.2.2 to preserve the CommonJS consumer contract; version-only registry alerts may remain. Other advisories are not claimed fixed.

## September 20 signed-candidate recheck

The fresh locked-graph query returned exit 1: **28 security rows (22 high, 6 moderate,
0 critical), plus 6 deprecation rows**. These are rows, not 28 distinct packages.
Affected package families are @xmldom/xmldom, js-yaml, postcss and uuid, with the
same build/tooling exposure described above. No blanket update or resolution was
introduced. The prior URI-decoder advisory is absent in this response; both the
backport and installed decoder hashes still match the verified repair.

package.json, yarn.lock, mobile/package.json and the backport are byte-equal to
compiled source 20921889c3dda24d790b9f1e5ab4706c77a77c45. Known credential signatures
and decoded service-role JWTs were checked in 541 tracked files, 717 actual EAS
upload files and 164 uncompressed entries of the signed Store IPA, including
binary bytes: no matches. This is current-tree/archive/artifact coverage, not a
Git-history scan, exhaustive entropy scan or a claim of zero vulnerabilities.
The prior referenced-asset, production-entry, native-patch and packaged-validator
evidence remains applicable to the unchanged compiled source. Full current
results: evidence/current-release-integrity-2026-09-20.json.
