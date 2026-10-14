# iOS design preparation — October 14, 2026

Status: preparation branch only. No native build, OTA, Apple submission, release, backend deployment, or Android changes are part of this work.

## Source and isolation

- Preparation branch: codex/ios-design-update-2026-10-14.
- Exact submitted baseline: fcbf4e0c4bb2b5bdb07d85e5630f173786a72718 (iOS 1.0.0 build 11).
- Apple read-only verification on October 14: build 11 VALID; version and review WAITING_FOR_REVIEW. This check did not change the review, selected build, or release option.
- Submitted runtime: 13f3cdc16a6f972c6de512a40c7ef2652bdbc9b6.
- Design source: sportaholic000-hue/flap-fit-nav-design at 30e54a90331b9472452633e4ea9da4123e8ed5eb.
- Design initial snapshot used to inventory the final changes: 99262746621669361441b24817e385b4c2c4d841.
- The final scoped source/assets diff was applied to a new worktree from the exact submitted commit. Experimental intermediate commits were not replayed.
- main, codex/ios-camera-permission-review, the submitted build-8 tag, and Android branches are not integration targets.

## Screen-by-screen migration

| Area | Transferred design and English wording | Production behavior retained |
| --- | --- | --- |
| Navigation | Navy bar; orange active state; Home, Levels, Compete, Stats, Info icons, labels and underline | Same five routes and safe-area handling |
| Home | Fixed clouds, headings, exercise cards/check marks, Sky/Live Camera choice, compact level/endless buttons, Play triangles, Daily Challenge styling and camera Play/Record & Play chooser | Saved progress hydration/recovery, menu-only monetization preparation and production game-entry checks; original route parameters |
| Levels | Fixed clouds, centered names, completed outlines, locked gray cards, aligned Best scores, orange Best/New labels, equal columns and endless treatment | Original levels, unlock requirements, best scores and mode routing |
| Compete | Fixed clouds, headings, selectors, leaderboard rows, rank medals, player-name state and terms link | Real API, unique-name protection, consent, moderation actions, eligibility and native modal-dismissal sequencing |
| Competition terms | Shared terms modal and post-acceptance access through Info; Done returns to the originating screen | Actual terms content/acceptance and privacy choices remain separate; reading terms does not grant processing consent |
| Stats | Stage/progress card, four summary cards, filters, period selector, rounded display durations, chart dates/colors, exercise breakdown, sessions and achievement presentation | Stored values, evolution thresholds, level/achievement criteria, champion state and persisted data schema |
| Info | Fixed background, headings/underlines, revised setup/help text, evolution previews, tips and warnings | Privacy choices, disclosures, camera/microphone Settings, support and manual update action |
| Calibration | Navy cards with the existing transparency and progress styles | All 13 submitted iOS poses, six exercises, iOS enablement, pull-up reach stage, success-driven fades, measurements, acceptance thresholds and gameplay scripts |
| Results | Compact centered time/pipes, revised buttons/text, one unlock heading, current-stage bird for uncleared runs and seven skin-matched victory poses for cleared runs | Championship sequencing, recording/share path, eligibility, results-first ads, frequency and immediate result actions |
| Celebrations and other surfaces | Approved palette changes in evolution celebration, onboarding, setup, error, privacy and manual-update surfaces | Existing state machines, permission behavior and OTA configuration |

## Deliberate integration adaptations

1. Preserved iOS-specific code where the design snapshot differs: the iOS silhouette platform gate, production game handling and eligibility correction.
2. The design adds @expo/vector-icons, which is not a submitted dependency. Home and Info instead reuse that package's exact Ionicons TrueType contour points as SVG paths through the existing react-native-svg dependency. The other three icons retain the design's SVG implementation. See apps/mobile/artwork/navigation/README.md and the retained licenses. No package, lockfile, font-loading step or native configuration was added.
3. Corrected a transferred test's sandbox privacy-storage namespace to the existing production key.
4. The historical calibration HTML comparison now normalizes only the approved navy card color before comparing excluded configurations. Pose, timing, transition and generated-HTML checks remain intact.
5. Added result-bird regression tests for the current earned stage on uncleared runs and all seven selected skins on clears.
6. Updated the existing startup/game-entry regression harness to click the real camera chooser and provide Modal/Pressable/font-scale adapters. Its camera, microphone, age, keep-awake, gameplay-pause and SDK-entry assertions are retained.
7. Added the background and router adapters required by the existing competition-terms action test; its persistence, refusal-race and unique-name assertions are unchanged.

## Excluded sandbox changes

No sandbox service stubs, fixture leaderboard, disabled Supabase/AdMob/RevenueCat/country/OTA behavior, setup bypass, gameplay bypass, sandbox identifiers, build tooling, package versions or Android configuration were imported. The scope inventory and preservation report are recorded in design-transfer-audit.json.

The production ad strategy remains results first, ads only on the established eligible exit actions, Share excluded, and immediate continuation when no ad is ready. No gameplay preloading, new wait or scheduling change is introduced.

The existing four-country launch policy, age/residency rules, required Apple checks and dormant future-European restrictions remain in production code. The manual Info → Check for updates flow and native compatibility protection are retained.

## Validation

See validation-and-device-checks.md and validation-summary.json for automated results, browser limitations and the native acceptance checklist.

## Review items before an eventual build

- See contrast-review.md for focused readability findings. Approved colors were not silently changed.
- Inspect the candidate on real iPhone and iPad when a build/OTA is separately authorized. Browser and unit checks cannot establish native camera, recording, permission, ad delivery or large-text behavior.
- Capture accurate replacement screenshots and update review notes for the eventual design release.
- Localization is deliberately deferred until the owner and iOS agent agree the languages and scope. This preparation keeps the revised English copy; it does not add translations, native language declarations or listing localization.
