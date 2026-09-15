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
