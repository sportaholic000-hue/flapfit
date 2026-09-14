# Flap Fit locked dependency audit

Audit date: 2026-09-14

Command: `corepack yarn npm audit --recursive --all`

The registry reported no critical advisories. It reported high and moderate advisories in the locked
graph. This file records reachability so a generic audit result is not confused with code that ships
and handles untrusted data on the phone.

## Findings and exposure

| Package | Dependency path | Current exposure assessment | Release action |
| --- | --- | --- | --- |
| `@xmldom/xmldom` | Expo config plugins, Xcode/plist tooling, and the native configuration side of `expo-sharing` | Used to generate or configure native projects. Flap Fit does not parse user XML in the app. | Monitor the Expo SDK 57 patch line and update through Expo compatibility guidance, not an untested lockfile override. |
| `js-yaml` | Jest coverage and Expo CLI/Xcode formatting tools | Build/test tooling. Flap Fit does not parse user YAML at runtime. | Monitor upstream. Do not feed untrusted YAML to local build commands. |
| `postcss` | Direct unused development dependency plus Metro/Tailwind tooling | Not imported by app source and not part of native gameplay. The direct Tailwind/PostCSS scaffold is a removable development-only cleanup. | Remove only with explicit dependency-change approval; it is not a store-binary blocker. |
| `uuid` | Optional `@expo/ngrok` development tunnel and Xcode tooling | The affected buffer API is not called by Flap Fit runtime code. | Keep the locked Expo-compatible toolchain until an upstream-compatible patch is available. |
| `decode-uri-component` | `expo-router` through `query-string` | Reachable through Expo Router link parsing, but Flap Fit does not accept a user data payload or privileged action from a URL. The advisory is denial of service for pathological malformed input, not data access. | Monitor Expo Router updates and keep all URL-driven actions non-privileged. Reassess before adding deep-link challenge actions. |

Deprecated Jest transitive packages were also reported. They are test-only and do not enter the
native application bundle.

## Decision

Do not force transitive resolutions or broadly upgrade the SDK immediately before submission. Expo's
native packages are version-coupled, and an untested override presents greater camera, recording,
and build risk than the current non-critical, mostly build-time findings. Re-run this audit before
each release and apply Expo-supported patch updates when available.

