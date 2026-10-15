# iOS handoff: latest Android design follow-ups and chart bug

Prepared October 15, 2026, for the follow-ups tested October 14–15.

## Source and exact boundary

Repository: https://github.com/sportaholic000-hue/flapfit
Source branch: codex/android-design-integration
Prior full design integration: ece2c8b; its validation/handoff baseline is d837f37.
Final source snapshot for THIS handoff: **00d32d8**.
Compare **d837f37..00d32d8**. Use the final combined diff, not each intermediate color experiment.

The companion file **ios-design-followups-2026-10-15.patch** contains only the six UI/chart source files below, exported at that boundary. It excludes release configuration and all later squat changes. Review/adapt its hunks to the current iOS update branch; do not overwrite whole iOS files or blindly merge/cherry-pick the Android branch.

If the earlier full redesign has not yet been ported, its context is documented in [android-design-integration-2026-10-14.md](android-design-integration-2026-10-14.md). The independent design source is sportaholic000-hue/flap-fit-nav-design at 30e54a90331b9472452633e4ea9da4123e8ed5eb. That sandbox deliberately disconnected production services; do not copy its initialization/configuration changes into iOS.

## Scope and preserved behavior

Apply to the intended next iOS update branch. Preserve the submitted iOS release and its tags. Do not build, submit, publish an OTA, merge to main or change release identifiers as part of this handoff.

Keep existing iOS native configuration, dependencies, purchases, ad/privacy/age-location behavior, leaderboard services, saved data keys, navigation and game-entry gates. Preserve iOS recording and calibration. Do not port Android compiler fixes, Android-only flags or diagnostic logging. Translation work is deferred.

Palette: navy **#06223D**, sky blue **#4AABDE**, orange **#F59E0B**, white **#FFFFFF**. Info body text may remain gray; no additional Info recoloring was approved in this follow-up.

## 1. Stats: fix the 7-day / 30-day chart total

File: apps/mobile/src/app/(tabs)/stats.tsx. Isolated fix: **86c1005**.

Bug: the chart's columns correctly used the selected date range, but its headline used lifetime training time. For example, a player inactive for seven days could see no columns yet a 14-minute total. The same mismatch affected individual exercise filters and All exercises.

Replace the headline total calculation:

    const selectedTut = exerciseFilter === 'global' ? totalTut : (exerciseTut[exerciseFilter] ?? 0);

with:

    const selectedTut = chartDays.reduce((total, day) => total + day.tut, 0);

Use the same already-filtered chartDays data as the visible bars. Do not change lifetime Training Time, evolution, achievements, stored session history or the selected date range boundaries. Those lifetime totals should remain lifetime totals.

Also simplify the chart subtitle to only **Last 7 days** or **Last 30 days**. Remove redundant All exercises combined / [exercise] sessions only wording. Remove the development-only Preview championship & achievements link at the bottom of Stats if present, including its now-unused router import/variable. Keep the real championship celebration intact.

## 2. Home: inactivity reminder

File: apps/mobile/src/app/(tabs)/index.tsx. Commits **266ca57**, **1f29735**.

- Keep the warning emoji.
- Center the uppercase heading **YOUR BIRD IS GETTING SOFT!**, in navy, with a navy underline.
- Orange card background and navy outline.
- Center the inactivity sentence in navy.
- Put **Fly today to keep them!** in white on a navy inset strip. White is the final approved color for this line.
- Preserve its existing appearance condition and inactivity/evolution logic.

## 3. Evolution celebration: readable training summary

File: apps/mobile/src/components/RunCelebrations.tsx. Commits **eb7b381**, **c0e5de8**.

Keep the full-screen navy celebration. Change its inner lifetime-training summary card to sky blue. Make **LIFETIME TRACKED TRAINING** and **+Xs this run** navy; retain the large total's existing white treatment. Preserve animation, timing, evolution calculations and dismissal behavior.

## 4. Levels: Best score and completion-star alignment

File: apps/mobile/src/app/(tabs)/levels.tsx. Final adjustment included in **3193751**.

Keep Best 9 and Best 99 on one line, with the B aligned down the list. Group the orange completion star over the score instead of leaving a large unrelated gap. Move the group slightly right without shifting centered level titles or changing locked/unlocked behavior.

Final source uses equal 64-unit outer side columns and a 52-unit inner score group with translateX: 10. Retain single-line fitting. Confirm appearance on iPhone and iPad; adapt spacing if iOS font metrics require it while preserving that alignment.

## 5. Incomplete-run result: motivating target panel

File: apps/mobile/src/app/game.tsx. Original behavior **7a73537**; final colors **3a6962b** + **6f3c236**.

- Replace the unsuccessful Run over heading with **So close!** when at least 80% of the target was reached; otherwise **Keep going!**.
- For incomplete non-Endless runs with a positive target, replace the tiny Target line with an orange panel and navy text.
- At 80% or more, show **N MORE PIPE/PIPES TO CLEAR!**, with correct singular/plural. Otherwise show **GOAL: N PIPES**.
- Progress bar: **white track, navy fill**. No sky-blue fill.
- Beneath it: **This run: score / target pipes**, in navy.
- Clamp progress to 0–100%; retain its accessibility progressbar label/value.
- Endless has no finite-target panel. Cleared runs retain their successful treatment and flexing bird.
- Keep the navy Share gameplay video card, recording, Retry/Next/Done behavior, ads and setup gates unchanged.

This is calculated from the current run's existing result and target. No new storage, backend call, service or per-run fee is introduced.

## 6. Final selected exercise/background style

Files: apps/mobile/src/app/(tabs)/index.tsx and levels.tsx. Final Home style **695611c**; Levels parity **d3b84f6**.

Apply to Home exercise cards and the Sky Background / Live Camera cards on both Home and Levels:

- Selected AND unselected card backgrounds remain navy. Selection no longer turns the whole card sky blue.
- Titles stay white; supporting text stays sky blue.
- Selected border: **sky-blue outer edge, orange inner ring**. This is the final approved order.
- Top-right check: **sky-blue-filled circle, orange circle outline, navy check**.
- Inner ring is decorative and must not intercept taps or become a separate accessibility element.
- Keep centered background-card text. Live Camera subtitle becomes **You are the background**. Sky subtitle remains **Classic game view**.
- Compact the background cards: final source minHeight 84, padding 10, paddingTop 28.
- Preserve selection state, actual background switching, game-start flow and checkmark placement. Do not extend this change to unrelated selectors.

## 7. Onboarding orange buttons

File: apps/mobile/src/app/onboarding.tsx. Commit **48b41d1**.

Use navy text and icons on the orange Next and final ready/Return to Info buttons. Keep button backgrounds, actions, camera permissions and onboarding order unchanged.

## 8. Optional Expo Go preview link fix

File: apps/mobile/src/config/release.ts. Commit **00d32d8**. This is intentionally separate from the companion UI patch.

Full privacy policy / Full terms produced missing-link errors in Expo Go because EAS profile environment variables were absent locally. Configured environment values still take priority. Development-only fallbacks use the existing public values:

- support@flapfitapp.com
- https://flapfitapp.com/privacy/
- https://flapfitapp.com/terms/
- https://flapfitapp.com/delete-account/
- https://flapfitapp.com/

Port this only if the iOS preview has the same missing-variable problem. Production still requires its existing environment configuration. Do not change policy wording, destinations, consents or advertising logic. The owner confirmed the links worked after this fix.

## Explicit exclusions: unresolved squats and recording

Do NOT port **c830f02**, **cca4421**, **d98a47e**, scriptSquatTracking.ts or the squat diagnostic changes as a completed fix. They are later than this handoff's 00d32d8 cutoff.

The Android ankle-dependency change passed synthetic tests but FAILED the owner's physical retest: close/chair framing remains jittery; backing away to show the full body is smooth. That investigation is still open. Do not claim it fixes iPhone and do not use it as a release-ready bug fix yet. Squat framing text added during that investigation is also excluded from this handoff.

No recording implementation was changed in the latest testing session. A reported one-second clip was not reproduced in subsequent successful recordings, and the owner explicitly requested leaving recording alone for now. Do not add a recording fix as part of this port.

## Acceptance checks for the iOS port

1. Chart history: no sessions within seven days but older activity within 30 days must show 0 for 7d, a positive total for 30d, and the same values as the bars. Activity older than 30 days must not appear in either period total. Test All exercises and at least two individual exercise filters. Lifetime totals remain unchanged.
2. Include today, the oldest included date, and the first excluded date; preserve the app's existing local-day handling. Check empty history and switching 7d/30d repeatedly.
3. Verify inactivity and evolution screens with existing saved state; no resets/migrations.
4. Check Best 9 / Best 10 / Best 99, completed stars, New and locked rows on iPhone and iPad; level titles remain centered.
5. Check failed results at 0%, below 80%, exactly 80%, one pipe remaining, success and Endless. Confirm current-run values and no new requests/storage.
6. Check every Home exercise selection and both background options on Home/Levels; ring order, text, checkmark, tap targets and actual choices all agree.
7. Verify onboarding buttons and Info links. Run applicable lint/tests and inspect actual iPhone/iPad layouts; Android testing is not proof of iOS rendering.
8. Commit/push the intended iOS update branch and report its link, changed files and any remaining test limits. Do not submit or publish as part of this handoff.
