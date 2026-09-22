# Dependency remediation — September 22, 2026

All 18 previously recorded security advisories are resolved in the installed and locked Yarn dependency graph. The all-workspace recursive audit now contains **zero security advisories**. This supersedes the September 21 deferral decisions.

| Package | Before | Repaired version | Compatibility boundary |
| --- | --- | --- | --- |
| @xmldom/xmldom | 0.8.13 / 0.9.10 | 0.8.15 / 0.9.12 | Both existing plist consumers retain their minor release line. |
| js-yaml | 3.15.1 / 4.3.1 | 3.15.2 / 4.3.2 | Coverage and ESLint consumers retain their major release line. |
| PostCSS | Direct 8.5.12 | Direct 8.5.28 | The existing Tailwind/Autoprefixer pipeline passes. Other already-patched 8.5.26/8.5.28 consumers remain. |
| uuid | 3.4.0 / 7.0.3 | 11.1.1 | CommonJS is retained. Actual xcode ID generation and mocked ngrok connect paths pass; no tunnel is opened. |

Root resolutions target only the affected dependency descriptors. Expo SDK 57, React Native 0.86.3, camera/tracker, advertising SDKs and all other runtime versions are retained. No force-upgrade or advisory suppression was used. The uuid version crosses major versions because the publisher's repaired release is 11.1.1; tests exercise both real consumers and invalid v3/v5 output buffers.

## Verification

- 68 app test suites, **1,448 tests passed**, zero failures.
- TypeScript, strict Oxlint and production release configuration validation passed.
- Nine consumer checks passed: two plist round trips, two YAML loaders, actual PostCSS/Tailwind/Autoprefixer processing, both CommonJS UUID resolutions, xcode project parse/write and 1,000 generated project IDs, and the ngrok connect path with process/network mocked.
- AdMob native patch checks and RevenueCat checks against pinned 5.88.0 upstream source passed.
- Yarn immutable install passed; no unrelated package upgrades occurred.
- All 315 baseline app/native/patch/backend files other than the mobile package manifest retain their pre-repair SHA-256. The only added executable source is the standalone tooling verification script.

Run the consumer checks from the repository root with:

    node apps/mobile/scripts/test-dependency-tooling.cjs

Audit commands:

    yarn npm audit --all --recursive --json
    yarn npm audit --all --recursive --no-deprecations --json

The first command still exits 1 solely for six upstream deprecation notices (abab, domexception, eslint, glob, inflight, whatwg-encoding). The security-only command exits 0. These are not six unresolved security advisories. The full unfiltered audit is retained so those notices are visible.

[Machine-readable results and all 18 resolved advisory IDs](evidence/dependency-remediation-2026-09-22/verification.json), [unfiltered after-audit](evidence/dependency-remediation-2026-09-22/audit-after.jsonl), and [before-audit](evidence/dependency-remediation-2026-09-22/audit-before.jsonl) are retained.

## Build authorization and limits

The owner explicitly authorized starting the test build after repairs and checks finish. The authenticated Expo account readback shows the Free plan with 8 of 15 iOS builds used and no overage. Use the existing signed ios-device-check profile for registered physical devices, with test advertising. No subscription, paid build, new service, additional per-run requests, website change or provider setting change is part of this repair. The production advertising configuration is unchanged.

An iOS bundle export and the subsequent signed build have separate results recorded below when completed. Source tests do not replace the owner's physical-device acceptance. Apple review submission remains after that testing.
