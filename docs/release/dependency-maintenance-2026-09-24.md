# Dependency maintenance — September 24, 2026

The six npm deprecation notices from the previous audit are resolved. The complete audit includes every workspace and transitive dependency, with deprecation reporting enabled and no package/advisory exclusions. It exits 0 and reports no notices or security advisories.

Tested source commit: **6502189b3bf3f281dbc32d83cefbdb6b813f9758**. Baseline: **10cda46a789c35ebf581ecb65bbd8175fd591e77**. All 14 recorded verification commands passed on this exact source commit. Native/device acceptance remains pending the owner's next authorized build.

## Changes

| Previous warning | Resolution |
| --- | --- |
| ESLint 9.39.5 | Removed unused ESLint and typescript-eslint development dependencies and the obsolete ignore-all ESLint file. The existing strict Oxlint command is unchanged. |
| glob 7.2.3 | Jest's file-matching dependency is pinned to glob 13.0.6, already used by Expo's build tooling. |
| inflight 1.0.6 | Removed with the old glob dependency; no inflight entry remains in the lockfile. |
| abab 2.0.6 | Removed by updating the test-only jsdom dependency from 20.0.3 to 27.4.0. |
| domexception 4.0.0 | Removed by the same jsdom update. |
| whatwg-encoding 2.0.0 | Removed by the same jsdom update, which uses the maintainer's replacement encoding implementation. |

Expo SDK 57's current jest-expo 57.0.5 still depends on Jest 29. The Jest/Expo/React Native versions stay unchanged. Narrow Yarn resolutions update jsdom and test-exclude (6.0.0 to 8.0.0) instead of forcing an unsupported test-runner upgrade.

Two small, committed Yarn patches adapt Jest 29 to the replacement helpers: jsdom's renamed console-forwarding API, and the coverage reporter's named glob export with Windows path normalization. These changes are confined to test tooling. The new compatibility check executes real Jest DOM tests, modern and legacy fake timers, console forwarding, Babel coverage, synchronous/asynchronous file discovery, exclusions, and an intentional uncovered-file failure to prove that coverage thresholds still work.

Upstream references: [Expo preset package](https://github.com/expo/expo/blob/c300d2cc60c9e684e64f48d9bc90ea18a571d01d/packages/jest-expo/package.json), [jsdom 27 console API change](https://github.com/jsdom/jsdom/releases/tag/27.0.0), [jsdom 27.4 encoding replacement](https://github.com/jsdom/jsdom/releases/tag/27.4.0). Revisit these scoped overrides when Expo supports a newer Jest preset; do not delete the compatibility patches independently of their dependency resolutions.

## Scope protection

The app's source, camera/gameplay, recording, ad scheduling, privacy/location rules, native modules/plugins, assets, app manifest and EAS configuration are unchanged. AGENTS.md is unchanged.

The locked production dependency closure is identical to the baseline: **662 packages**, including matching versions and checksums. Its comparison hash is recorded in scope-check.json.

Local production iOS JavaScript/Hermes export passed. The embedded JavaScript source hash is unchanged. A complete binary comparison confirms that only Expo's randomized temporary source filename, its length fields and the derived file checksum differ; every other byte matches. Raw and normalized hashes are retained in ios-packaging.json. This is JavaScript packaging only, not a signed native build.

## Verification

- Immutable Yarn installation: passed; lockfile unchanged.
- Full dependency audit, including deprecations: passed, zero findings, no exclusions.
- All 70 mobile test suites / 1,579 tests: passed, no skipped tests.
- Apple verifier: all 6 tests passed.
- Existing dependency compatibility checks: 8 passed.
- New Jest/helper compatibility checks: 5 passed, including intentionally failing coverage as an expected assertion.
- TypeScript and strict Oxlint: passed.
- Production configuration and all six exact tracker assets: passed.
- Existing AdMob and RevenueCat source-patch/bridge checks: passed.
- Local iOS JavaScript/Hermes export: passed.

The existing Node DEP0040/punycode warning is still emitted by the test process and is also present in the baseline test log. It is a separate Node API warning, not one of the six npm package deprecations. It has not been hidden, and this tooling change does not alter application runtime dependencies to silence it. See the raw Jest log.

## Reproduce

Run from the repository root:

    yarn install --immutable
    yarn npm audit --all --recursive --json
    node apps/mobile/scripts/test-dependency-tooling.cjs
    node apps/mobile/scripts/test-jest-tooling.cjs
    yarn workspace mobile typecheck
    yarn lint
    yarn workspace mobile test

Full command records and log hashes are in [verification evidence](evidence/dependency-maintenance-2026-09-24/verification.json). The earlier audit's device checklist and submission prerequisites still apply. No EAS/native build, TestFlight upload, OTA update, deployment, or submission was run. Zero build credits were used. The only repository EAS workflow is manually dispatched device registration; no push-triggered build workflow was added or enabled.
