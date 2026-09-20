# Assigned privacy-manifest verification batch

Task 1: COMPLETE. Task 2: COMPLETE.

Verified application source: f168286d9058093a42da8e96f02f53a82365a7e6, branch wip/crash-protection-20260920.
This evidence-only successor changes no application, test, dependency or build configuration inputs.

Task 1 used the completed exact-source full run: all 58 tracked mobile suites and 1,117 tests passed, including all eleven manifest regressions. Current HEAD and the absence of any runtime/test/configuration/index diff establish reuse coverage. TypeScript, strict applicable oxlint, and production source release validation were freshly rerun and exited 0. The release validator includes manifest, monetization and accepted-tracker checks. Locked dependencies and patches were retained.

The nine app-owned declarations match the existing reviewed practices:

| Declaration | Existing practice | Purpose |
| --- | --- | --- |
| User ID | Competition identity and independently permitted anonymous RevenueCat events | App functionality; analytics |
| Gameplay Content | Optional competition results | App functionality |
| Fitness | Online exercise category and duration | App functionality |
| Other User Content | Player names, reports and blocks | App functionality |
| Other Data Types | Apple authorization status, hashed linkage and notification records | App functionality |
| Other Diagnostic Data | Backend operational and security diagnostics | App functionality |
| Coarse Location | Existing country lookup | App functionality |
| Advertising Data | Permitted RevenueCat ad-event reporting | Analytics |
| Product Interaction | Permitted RevenueCat ad interaction events | Analytics |

All nine retain linked=true and tracking=false for the reviewed configured handling. Google/UMP keep their SDK declarations. No camera/video/audio upload, permission, collection, feature or consent interface was added. Actual build-4 root-manifest reproduction records six coverage failures before the correction and zero after. The existing signed build does not contain this correction.

Task 2 reverified the retained actual EAS archive from the completed local build:inspect upload-stage workflow. It contains 746 files. All 283 required tracked mobile/build/backend-validator inputs byte-match source, including models/assets, native modules, plugins/polyfills, patches, test/configuration files and corrected manifest/validator inputs. Per-file SHA-256 values are in the JSON evidence. The production release validator ran from the packaged mobile directory and exited 0.

Only intended non-build mobile files were absent: Codex editor environment, .gitignore, READMEs and excluded store artwork. Private/signing filename checks and backup/web/generated/dependency exclusions passed. The retained scoped content scan found no known credential signatures or service-role JWTs in the actual package; no exhaustive security claim is made.

The initial completed full run had one 20-second withdrawal-retry timeout; that unchanged case passed alone in 2.7 seconds, and the complete repeat passed. Earlier failures are retained, not presented as initial success. The first expanded package inventory mistakenly included excluded editor metadata and stopped; correcting that inventory required no package or source changes.

Machine-readable evidence: privacy-manifest-batch-verification-2026-09-20.json.
Before/after evidence: privacy-manifest-reproduction-2026-09-20.json.

Unresolved dependencies within these two tasks: none. Signed-native artifacts, device/provider verification and release readiness are outside this batch. No build, upload, submission, deployment, credential change or App Store edit was performed or authorized.
