# Android calibration artwork experiment

Branch: codex/android-lateral-calibration-guide. Android with Camera background only.

The app consumes committed vector paths in ../../src/utils/game/calibrationGuideArtwork.ts. These have no dependency on Downloads, local preview servers, generated outputs, or the original task folder.

All nine owner-provided reference images are retained in references/. The three *-dumbbells.png files supply shoulder press, lateral raise, and biceps poses. The original shoulder-press.png still supplies the empty-hand pull-up reach before grabbing the bar. Squat, push-up and pull-up bar poses are unchanged. Original unweighted curl/lateral sheets are retained as source history.

After installing the repository's existing dependencies, regenerate from any checkout with:

    node apps/mobile/artwork/calibration/generate.cjs

Verify platform isolation, success-only fades, rejected holds, cleanup, and pull-up setup with:

    node apps/mobile/scripts/verify-calibration-guides.cjs

Verification compares excluded HTML with base commit 3892565; fetch that commit/history if using a shallow clone. Generated diagnostic files are ignored under .generated/. No extra dependencies or backend services are added.

Start the tested Expo Go workflow from the repository root with node apps/mobile/scripts/start-android-experiment.cjs. This loads the existing android-closed-testing public environment settings and starts the tunnel on port 8081 with two Metro workers. Optional flags (such as --lan) are forwarded to the existing start:expo-go launcher. The Android-only local runtime override avoids expensive native fingerprinting and is disabled for EAS builds. No cloud build or OTA is performed by these artwork scripts.

Design invariants: front-facing figures, natural foot placement; fill #67E8F9 at 0.32; outline #FFE44D at 0.88, width 2.6; existing placement, instructions, progress bars and calibration/fade logic remain unchanged.

Recovery: this branch contains the earlier Android compiler fixes and recorded-video branding as well as all silhouette experiment commits. Main and the submitted iOS tag are protected and are not part of this experiment.

Optional visual QA: after verify-calibration-guides.cjs, run node apps/mobile/artwork/calibration/preview.cjs using an existing Playwright installation (PLAYWRIGHT_MODULE can name its module path). CALIBRATION_BROWSER_CHANNEL selects an installed browser; defaults to msedge. This does not install dependencies or start a build. The committed preview.png shows the latest artwork.
