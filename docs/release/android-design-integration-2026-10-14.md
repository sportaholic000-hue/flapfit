# Android design integration - 2026-10-14

## Source and scope

- Android baseline: ec4624aae26794df7463a0956a036a8dc592d62d (iOS build 11 parity candidate).
- Design source: sportaholic000-hue/flap-fit-nav-design at 30e54a90331b9472452633e4ea9da4123e8ed5eb.
- Integration branch: codex/android-design-integration in sportaholic000-hue/flapfit.
- Applied the final design delta from the independent sandbox's initial snapshot (9926274) to its tested design commit. No sandbox initialization changes were copied.

Includes all five tabs, navigation, sky backgrounds, headings, selection cards, charts, achievement styling, Info sections, game-start chooser, terms review navigation, calibration card colors, results and celebrations, plus all seven skin-specific flexing-bird assets. English wording matches the design; translations are deferred.

## Preserved production behavior

The 18 source differences introduced to disconnect the sandbox were excluded. Production configuration, real competition services, privacy/advertising decisions, purchases, update service, original storage keys and game-entry gates remain on the Android baseline. Native identifiers, app/EAS configuration, compiler versions, backend files and release scripts are unchanged. The only package addition is the design's exact @expo/vector-icons 15.0.2 dependency and its lockfile entry.

Android silhouette artwork, pull-up reach/grab sequence, fades, movement tracking and recording branding are retained. The game HTML and calibration guide changes are solely their navy card backgrounds, with opacity preserved. Shared UI code exists only on this Android integration branch; no iOS release branch or tag is updated.

## Verification

- Exact Git blob comparison: all transferred source/artwork files match the tested design commit.
- Package comparison: original production scripts/dependencies retained apart from the icon dependency above.
- Changed-file allowlist and whitespace checks pass.
- Automated check results are recorded below once completed.
- No native build, submission, deployment or OTA has been started.

## Android device check

Before release, test on a physical Android phone:

1. Home, Levels, Compete, Stats and Info: sizing, scrolling, active tab and selected states.
2. Sky launches directly; camera offers Play / Record & Play for level, Endless and daily games; Cancel and Android back dismiss correctly.
3. Locked levels and Endless remain locked; completed Daily cannot start again; scores and progress retain their original keys.
4. First-time competition consent, returning-player terms review, Info Done navigation and real saved player name.
5. All six calibrations, including pull-up reach, success fades and no bird before gameplay; specifically recheck squat/curl tracking in the user's setup.
6. Failed-run normal bird, successful-run flexing bird in each chosen color, championship result, video sharing, Retry/Next/Done and production setup/ad behavior.

Expo Go cannot validate native advertising, purchases or the eventual signed Android build. Existing contrast concerns (small orange text on white and white text on sky) are retained from the approved design for a separate focused review.
