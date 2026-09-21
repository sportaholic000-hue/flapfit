# Current Flap Fit source and recovery map — September 21, 2026

The authoritative app source is the GitHub repository sportaholic000-hue/flapfit, branch **main**, in C:/Users/money/Projects/flapfit/anything. This cleanup advances main from f39190d to the current corrected app and the commit containing this record. It preserves the 37 intervening commits; it does not merge old candidate code back into the app.

The authoritative website source remains C:/Users/money/Documents/Codex/2026-09-16/g/work/flapfit-site-apple, commit 560bfae47fa6b526ca0d5eb33aa9a5acda692a0f, published version 36. The Sites remote has that same commit. The local origin/main tracking ref is refreshed separately. No website content or Apple reviewer instructions are part of this cleanup.

## Build inputs

- EAS cli.requireCommit is true. The actual installed EAS Git client was checked to require a commit while the checkout was dirty. With this setting, the source copy comes from committed files instead of overlaying local untracked content.
- The repository-root .easignore excludes apps/mobile/dist, web-build, .metro-virtual and nested Yarn install-state files. All 332 historical export files (approximately 151 MiB) and the nested publisher install-state file identified in the audit are excluded. They are retained locally for recovery.
- The nested apps/mobile/.easignore now documents the root file's authority; its ignored duplicate rules were removed.
- The production validator rejects disabling requireCommit or removing any of the four new exclusions. Six direct validator cases passed, including all five failure cases. Production configuration, strict lint and whitespace checks passed.
- App runtime, native modules/plugins, models/assets, dependencies, lockfile, privacy/ad rules and backend source remain identical to 1233dfdd45f980d9ac43f9f183d7ca2f1fb2d01e. The earlier 67-suite/1,400-test application result is historical evidence for unchanged behavior; it was not represented as a newly run application suite.
- Before a future authorized build, confirm main is clean and matches the expected remote commit. Use normal Git-backed EAS operation; EAS_NO_VCS bypasses the committed-source protection and must not be used for this release. A clean package/source verification receipt is recorded separately after the cleanup commit.

## Reconciled documentation

The two existing modified release documents and four previously untracked privacy-manifest evidence files are included in this cleanup commit. The manifest evidence retains its original f168286d source identity and September 20 results; it is not current-build evidence. The current README now links here and to the latest behavior audit instead of presenting the September 19 / 406-test checkpoint as current. Current tracker and handoff entries identify website version 36. Earlier documents and counts remain historical evidence.

## Historical copies

All 22 obsolete app/package/website checkouts were moved intact to C:/Users/money/Documents/Codex/FlapFit-archive/2026-09-21. Every move was verified by comparing HEAD and the full Git status before and after. Their dirty files and Git histories are preserved. The old locations have sibling .ARCHIVED.md pointers and no longer contain buildable source directories.

The complete mapping is [source-archive-relocation-2026-09-21.json](evidence/source-archive-relocation-2026-09-21.json). The archive's README identifies these as historical recovery copies. The two active checkouts were excluded from relocation.

## Historical branch preservation

The following immutable names preserve all nine pre-cleanup local branch tips and the previously unreachable candidate variant. These tags are pushed with main. Main is the active branch; historical branch names and these tags are recovery references, not release sources. No force push, history rewrite or object deletion is needed.

| Archival tag | Preserved commit |
| --- | --- |
| `archive/2026-09-21/experiment/form-tracking-v2` | `1cf6d138c825ad0d41024e546d5e70ca3f0200db` |
| `archive/2026-09-21/fix/apple-record-2026-09-17` | `2b949ef415044dbac25e6e0b1950bb5140854977` |
| `archive/2026-09-21/fix/confirmed-video-sharing-2026-09-16` | `0974a3b97f1e046bbc0aedbd48712622982a902d` |
| `archive/2026-09-21/fix/iphone-ipad-revenuecat-2026-09-17` | `84404b9cbb2808106c6960f95586caf8c6736609` |
| `archive/2026-09-21/fix/retire-friend-codes-2026-09-17` | `6b261a4f8443e05e4496f66f7f2df7ebbeaa3cc1` |
| `archive/2026-09-21/main` | `f39190d6ae2a84c8ba97624b5c917295f0b1ec7d` |
| `archive/2026-09-21/release/app-store-48h` | `c55f903c190f366578d45229f4539b9803b8ad9a` |
| `archive/2026-09-21/release/launch-candidate-2026-09-18` | `d517a9ce8f85a611dde5e81c94f9a13b6ee9e96c` |
| `archive/2026-09-21/wip/crash-protection-20260920` | `1233dfdd45f980d9ac43f9f183d7ca2f1fb2d01e` |
| `archive/2026-09-21/superseded-candidate-49e136a` | `49e136af922ac43bdcd1a20fb7b40e46b2f712e7` |

The d517a9c candidate is preserved rather than automatically reapplied. Its key service repairs are present in the later 20eeda9 consolidation; blindly applying its older 78-file snapshot could regress today's source. The separate 0974a3b video repair module/tests/fixtures are byte-identical to current files. The unreachable 49e136a variant differs from d517a9c only in 18 archived snapshots; tagging retains it without changing runtime source.

## Evidence

[source-organization-checks-2026-09-21.json](evidence/source-organization-checks-2026-09-21.json) records the six validator cases, actual EAS dirty-source rejection, all 333 generated-file exclusions, unchanged runtime/dependency inputs and all 22 verified relocations. Build/physical-device/provider verification remain separate tasks. This record authorizes no compilation or submission.
