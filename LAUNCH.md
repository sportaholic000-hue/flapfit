# Flap Fit website launch handoff

Owner-only deployment: https://flap-fit.sportaholic000.chatgpt.site

The website is a separate static project. No mobile app source, manifest, lockfile, or dependencies were edited. No website backend, analytics, signup, payment, database, or app-owned authentication was added. Owner-only access is supplied by Sites.

## Exact details required before public launch

- Legal postal address for store records and any region that requires it publicly.
- Final support domain/email if it changes from `awesome-eh@hotmail.com`.
- Confirm the production Supabase region, service-log retention, and backup retention after provisioning.
- Confirm all release-build service providers, analytics/crash reporting, account, advertising, and purchase behavior, then align the policy and store disclosures with that actual build.
- Approved release status and real App Store / Google Play listing URLs. The site currently says the app is in development and offers no false store links.
- Public canonical domain, if different from the private Sites address. Public publishing requires a separately authorized audience change.

## Configuration and source

Edit `dist/site-config.js` for the developer name, contact emails, effective date, release status, and official store URLs. Empty contact values show clear draft notices. Store buttons appear only when releaseStatus is available and URLs use the official Apple or Google store hosts.

Before public release, update availability copy in the homepage FAQ and hero, add the official store URLs, and remove noindex/nofollow and robots.txt Disallow only when public indexing is intended. The current owner-only Sites access must be explicitly changed to public before any store can use these URLs.

Authored public source is in dist/ with /, /privacy/, /terms/, /delete-account/, /support/, and a custom 404 page. There is no build dependency. Website scripts and styles are local.

## Artwork provenance

The six PNG exercise illustrations are byte-for-byte copies of the current app's assets/images/exercises/ images. The ten Sunny evolution PNGs shown on the homepage are byte-for-byte copies of the current in-app stage artwork. The homepage header uses the exact current splash-screen logo. The gameplay illustration uses the same stage-6 Sunny PNG that the app uses for both showcase and flying contexts. No substitute or newly generated mascot art was used. The gameplay illustration reuses the app's drawBackground and drawPipes routines, with the canonical flying sprite. It is labelled as an illustration, not a recording or playable camera demo.

The hero and exercise section retain the yellow mascot throughout. The evolution gallery keeps Sunny consistent across all ten stages.

## Verified product basis

- src/utils/game/store.ts: tracked active gameplay time; exact stage names and thresholds; exercise-to-morphology mapping; inactivity stage adjustment.
- src/utils/game/birdVisual.ts and birds.ts: canonical bird rendering and skin colors.
- src/utils/game/exerciseImages.ts: six artwork mappings.
- src/utils/game/html/scriptCore.ts: front camera, bundled on-device MediaPipe pose tracking, and calibration.
- src/app/game.tsx and src/app/(tabs)/compete.tsx: score submissions, exercise leaderboards, challenge code flow.
- src/utils/game/levels.ts: levels, Daily Challenge, Endless unlock.
- src/app/(tabs)/info.tsx: camera and local/online data explanation, real contact configuration requirement.

## Comparable sites reviewed

- [Quell](https://playquell.com/): short explanation connecting physical activity to a game objective.
- [Nex Playground](https://www.nexplayground.com/): prominent visual catalog that makes the play options tangible.
- [Brawl Stars](https://supercell.com/en/games/brawlstars/): character-first art direction and concise game positioning.

These informed presentation patterns only. No wording, artwork, or page layout was copied.

## Validation

Run `node scripts/validate-site.cjs` before publishing. It checks JavaScript syntax, local links and assets, route entrypoints, navigation anchors, unique HTML IDs, canonical URLs, legal-page content, launch configuration, and owner-only indexing controls.

