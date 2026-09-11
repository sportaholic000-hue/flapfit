# Flap Fit website launch handoff

Private draft: https://flap-fit.sportaholic000.chatgpt.site

The website is a separate static project. No mobile app source, manifest, lockfile, or dependencies were edited. No website backend, analytics, signup, payment, database, or app-owned authentication was added. Owner-only access is supplied by Sites.

## Exact details required before public launch

- Legal developer/operator name and business jurisdiction; legal contact address if applicable to the final policy.
- Real support email and privacy-request email (they may be the same monitored mailbox).
- Approved final privacy policy and effective date, intended age audience, data retention periods, and deletion/request process for server-held leaderboard and challenge data.
- Confirm all release-build service providers, analytics/crash reporting, account, advertising, and purchase behavior, then align the policy and store disclosures with that actual build.
- Approved release status and real App Store / Google Play listing URLs. The site currently says the app is in development and offers no false store links.
- Public canonical domain, if different from the private Sites address. Public publishing requires a separately authorized audience change.

## Configuration and source

Edit `dist/site-config.js` for the developer name, contact emails, effective date, release status, and official store URLs. Empty contact values show clear draft notices. Store buttons appear only when releaseStatus is available and URLs use the official Apple or Google store hosts.

Before public release, revise the draft notices, finalize `dist/privacy/index.html`, update availability copy in the homepage FAQ and hero, update canonical and Open Graph URLs on every route, and remove noindex/nofollow and robots.txt Disallow only when public indexing is intended.

Authored public source is in dist/ with /, /privacy/, /support/, and a custom 404 page. There is no build dependency. Website scripts and styles are local.

## Artwork provenance

The six PNG exercise illustrations are byte-for-byte copies of the current app's assets/images/exercises/ images. All ten Sunny SVG stages and the Athlete flying pose were exported from the app's existing createBirdSvg renderer with its Sunny palette. No substitute or newly generated mascot art was used. The gameplay illustration reuses the app's drawBackground and drawPipes routines, with the canonical flying sprite. It is labelled as an illustration, not a recording or playable camera demo.

The hero and exercise section retain the yellow mascot throughout. The evolution gallery keeps Sunny consistent across all ten stages.

## Verified product basis

- src/utils/game/store.ts: tracked active gameplay time; exact stage names and thresholds; exercise-to-morphology mapping; inactivity stage adjustment.
- src/utils/game/birdVisual.ts and birds.ts: canonical bird rendering and skin colors.
- src/utils/game/exerciseImages.ts: six artwork mappings.
- src/utils/game/html/scriptCore.ts: front camera, on-device MediaPipe, remote model downloads and calibration.
- src/app/game.tsx and src/app/(tabs)/compete.tsx: score submissions, exercise leaderboards, challenge code flow.
- src/utils/game/levels.ts: levels, Daily Challenge, Endless unlock.
- src/app/(tabs)/info.tsx: camera and local/online data explanation, real contact configuration requirement.

## Comparable sites reviewed

- [Quell](https://playquell.com/): short explanation connecting physical activity to a game objective.
- [Nex Playground](https://www.nexplayground.com/): prominent visual catalog that makes the play options tangible.
- [Brawl Stars](https://supercell.com/en/games/brawlstars/): character-first art direction and concise game positioning.

These informed presentation patterns only. No wording, artwork, or page layout was copied.

## Validation

JavaScript syntax, all local assets, requested route entrypoints, navigation anchors, unique HTML IDs, accessible image labels, exact six-artwork hashes, and ten-stage assets checked. Browser testing was not requested; Sites workflow does not allow additional browser QA without that request. As a delegated background task, no user-facing local browser handoff was opened.

