# iOS design follow-ups — October 15, 2026

Preparation branch: `codex/ios-design-update-2026-10-14`. This continues `a070de99bfe55672d5c0e5e6296f8e0d4a5a385f`, which was based on submitted build 11 source `fcbf4e0c4bb2b5bdb07d85e5630f173786a72718`. No build, OTA, App Store submission, release, merge to main or Android branch update is authorized by this change.

Implementation commit: [069548199dadefae0203ef960a13f334ffbe36a0](https://github.com/sportaholic000-hue/flapfit/commit/069548199dadefae0203ef960a13f334ffbe36a0). The subsequent verification commit also includes the chart test fixture setup refinement; app source is unchanged by that follow-up.

## Source boundary

- Pinned owner handoff and companion patch: [a5c0d7ba049b90fbba463c9c03dc4471f18868ae](https://github.com/sportaholic000-hue/flapfit/blob/a5c0d7ba049b90fbba463c9c03dc4471f18868ae/docs/release/ios-design-followups-2026-10-15.md).
- Android follow-up baseline: `d837f37dde39d2b5c10a3258c963dbfc5214b14c`.
- Final approved source snapshot: `00d32d8ca063d0f7dbe8c8d6c404a7255fb87165`.
- Companion patch Git blob: `d9a808a381b539713fe945f25ed9f3729aa4d9aa`.
- Combined final patch applied as six reviewed file hunks after `git apply --check`; no branch merge, whole-file replacement or intermediate experiment replay.
- Normalized source diff is exactly the supplied patch. Five resulting UI files match the approved Android snapshot; game.tsx deliberately retains the existing iOS differences outside the reviewed display hunks.

## Implemented scope

| File | Change | Preserved |
| --- | --- | --- |
| `apps/mobile/src/app/(tabs)/stats.tsx` | 7d/30d headline sums the filtered visible chart days; concise period subtitle; obsolete development preview link removed | Lifetime Training time, exercise totals, progression, achievements, local-day boundaries, session history and real championship ceremony |
| `apps/mobile/src/app/(tabs)/index.tsx` | Approved inactivity reminder; navy exercise/background cards; sky outer edge, orange inner ring; sky/orange/navy check; compact background cards and final subtitle | Warning condition, evolution/inactivity calculations, exercise/background choice and game-start gates |
| `apps/mobile/src/app/(tabs)/levels.tsx` | Matching background selections; 64-unit side columns with grouped Best score/star | Centered titles, single-line score fitting, saved best scores, locked/unlocked behavior and launch actions |
| `apps/mobile/src/app/game.tsx` | Keep going / So close headings and finite-target progress panel using current-run score; correct PIPE/PIPES wording | Success/victory birds, championships, Endless, camera/microphone, recording/share, Retry/Next/Done, results-first ads and setup scheduling |
| `apps/mobile/src/app/onboarding.tsx` | Navy text/icons on existing orange actions | Actions, order and permission flow |
| `apps/mobile/src/components/RunCelebrations.tsx` | Sky lifetime-summary card with navy captions and existing white total | Animation, timing, calculations and dismissal |

The decorative inner rings remain non-interactive and are not separate accessibility elements. The result progress value and fill are clamped; Endless and successful clears do not show a finite-target panel.

## Explicit exclusions

- No later squat changes, squat framing copy, ankle-dependency changes or diagnostics from `c830f02`, `cca4421` or `d98a47e`. The physical squat issue remains unresolved; this change does not claim to fix it.
- No recording implementation changes. The one-second-clip report is not treated as a reproduced defect.
- Working iOS calibration images, steps, measurements, thresholds and fades are unchanged.
- No dependencies, native configuration, release identifiers, storage keys, migration, backend, consent, provider, ad-frequency or gameplay-loading changes.
- Info body text and unrelated selectors are unchanged.
- The optional Expo Go public-link fallback is not ported: the same missing-variable failure has not been established on this iOS candidate. Existing production-profile links remain configured and validated; this is not a claim that Expo Go without those variables works.
- Contrast testing is deferred to the owner’s planned review. Only the approved follow-up colors are applied; the October 14 contrast document is a prior snapshot. Translation work remains separate.

## Acceptance and testing

Automated results and the scope audit are recorded in `ios-design-followups-verification-2026-10-15.json`.

Final verification: **1965 tests passed across 82 suites** using separate test processes, with TypeScript, lint, production release configuration, manual OTA configuration and the exact-patch scope audit passing. Repository time limits were unchanged. The unmodified keep-awake suite used a 30-second local runner limit instead of the default five seconds. Initial local startup/time-limit failures and the completed offline test adapter are documented in the verification file.

New rendered-screen regressions cover:

- No activity within seven days but activity within thirty days, plus older excluded activity: zero 7d chart, matching positive 30d headline/bars and unchanged 14-minute lifetime total.
- All Exercises, Push-ups and Bicep Curls; repeated 7d/30d and exercise changes; empty history.
- Today, the oldest included 7d/30d dates, first excluded dates and legacy unattributed sessions, using local dates late in the evening. Lifetime/evolution/achievement inputs and saved history remain unchanged.
- Current-run results at 0, below 80%, exactly 80%, one pipe remaining, success and above target; singular/plural text, accessible progress value, navy fill/white track, success bird and existing exit controls.
- Endless retains its result bird and has no finite-target panel.

The existing game-entry integration fixture now accepts a test score/level and an actual Home Endless action for those assertions. Its offline competition adapter now includes the existing player-name validator boundary and uses the actual boolean shape for the configured flag; production competition code is untouched. Existing permission, ad/setup, keep-awake and gameplay-pause assertions remain. The existing chooser fixture only gains the SVG Circle adapter required by the new checkmark.

## Remaining native checks

This preparation has not been installed on a new iPhone/iPad build or OTA. Automated rendering and Android testing are not proof of native iOS layout. When the owner authorizes a testing delivery, inspect:

1. Best 9/10/99, completed stars, New and locked rows on iPhone/iPad, including larger text and centered titles.
2. All six exercise selections, both background options on Home/Levels, ring/checkmark appearance and tap behavior; existing saved inactivity/evolution screens.
3. The result-panel cases above, live recording/share and existing result/ad exits; onboarding actions and Info links.
4. The owner’s contrast review. No additional palette change is included here.
