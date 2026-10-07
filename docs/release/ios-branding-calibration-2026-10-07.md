# iOS recording branding and calibration guides

Prepared October 7, 2026 on `codex/ios-camera-permission-review`, after camera-fix commit `4d29c0401e62ef99c7c4fc27c0150fde922543dc`.

## Source provenance

- Recording branding: `codex/android-recording-branding`, `3892565d7bf7f8916f86aca22cb71951e4f50a65`.
- Latest fetched/pushed calibration implementation and runtime vector artwork: `codex/android-lateral-calibration-guide`, `dc4b47056ac9a9864f435c2025bff9022c56473d`.
- Updated dumbbells included from `50bed76a160d746e5e6cc111a3ef94ee7722d2ea`.
- `scriptGame.ts` is identical to both branding source and latest guide source. `calibrationGuideArtwork.ts` is byte-identical to the latest guide source; artwork was not regenerated.
- `gameHtml.ts` reuses the latest guide source. The guide module differs only in enabling iOS alongside Android and updating two comments. The game screen passes the existing branding/guide configuration into the HTML.

## Behavior

White 16px Flap Fit text with a dark outline is drawn only on the hidden recording canvas, below the target (y=122) or endless score (y=100). The live canvas is unchanged. Existing recording admission, dimensions, scaling, throttling and stop behavior remain intact.

The six camera-background calibration guides reuse shoulder press, lateral raise, bicep curl, squat, push-up and pull-up poses. This includes updated dumbbells, translucent light-blue fill, yellow outlines, adaptive placement above instructions, progress bars, accepted-pose fades and the pull-up reach stage. Sky-background behavior remains unchanged, matching the Android implementation. The existing bird-hiding and countdown-presentation wrappers are reused; no calibration measurements, acceptance thresholds or gameplay deadlines were changed.

No Android native configuration, build tooling, dependencies or asset generators were ported. Camera-fix and microphone blocks, tracking scripts, native configuration and lockfile were compared with the camera-fix parent and remain unchanged. Ads, results and privacy behavior were not modified.

## Verification

- Mobile TypeScript check passed.
- Targeted recording branding, recording boundaries, MP4, startup game-entry and Settings permission-recovery tests: all 48 tests passed across the initial run and an unchanged startup-suite rerun. Initial combined run had two existing startup tests exceed 30 seconds (46 passed); the isolated rerun passed all 29 startup tests. No test timeout or app logic was changed to obtain the pass.
- Calibration verification: 12 enabled configurations; 36 excluded configurations generate identical HTML to the pre-guide baseline. All six exercise success transitions, rejection/cancellation, pull-up setup paths, countdown hiding, bird visibility and teardown checks passed.
- Browser layout verification: 52 calibration views (13 poses at four sizes), long-instruction reflow and countdown hiding; eight recording HUD layouts. Sizes: 375x667, 430x932, 820x1180 and 1024x1366. Text and progress bars remain in bounds and clear of the figures.
- Actual compositor execution verified live canvas pixels stay unchanged while recorded pixels receive branding. Representative phone/tablet screenshots, all-pose contact sheet and live/recorded HUD pairs were visually inspected.
- Layout tooling uses an already-installed Chromium browser, not native iOS WebKit. No browser/dependency installation was needed. An initial preview-loader error was fixed in the QA script before the successful layout run.

## Reproduce local checks

From the checkout root, with Node and Git on PATH:

```sh
node apps/mobile/scripts/verify-calibration-guides.cjs
node apps/mobile/scripts/preview-calibration-guides.cjs
```

The second script needs an existing Playwright module and installed Edge. `PLAYWRIGHT_MODULE` can point to an existing Playwright installation; `CALIBRATION_BROWSER_CHANNEL` can select another already-installed Chromium channel. Both scripts accept `FLAPFIT_CALIBRATION_QA_DIR`; default output is ignored `test-results/calibration-guides`.

## Device acceptance still required

On the next authorized iPhone/iPad build, check all six camera calibration flows, native safe areas, actual pose acceptance, fades/retries, ordinary unbranded gameplay, and saved/shared level and endless videos with branding. Confirm video playback and microphone-granted/denied behavior on device. Browser fixtures do not establish native WebKit performance, camera accuracy or encoded-video correctness.

No build, OTA publication or Apple submission was performed for this integration. Europe availability is outside this change. Main, the submitted build-8 tag and Android branches must remain untouched.
