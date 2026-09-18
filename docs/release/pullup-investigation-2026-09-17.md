# Pull-up calibration investigation — September 17, 2026

> Historical record of the failed .2 rules and the rejected first offline candidate. The development app now runs Form Test **2026-09-17.3-floor-reference**, whose physical acceptance is still pending. See [the floor-reference candidate report](pullup-floor-reference-2026-09-17.md) for current behavior, software evidence and device acceptance gates. Statements below about unchanged rules or an uninstalled candidate describe the earlier investigation, not the current development build.

**Physical status: failed.** The owner reported that merely holding the bar filled step 1 without pulling, then explicitly asked to stop presenting quick fixes after repeated failed candidates. The earlier 98 passing synthetic tests did not establish real-device correctness.

## Phone version during the failed .2 investigation

Form Test **2026-09-17.2-diagnostics** retains the failed .2 acceptance and gameplay rules. Only temporary development instrumentation has been added. It captures numeric landmarks, confidence, timestamps, camera dimensions, preparation timing and the reference at acceptance. It does not record images or video. Every inference before top acceptance is captured in bounded batches (240-frame maximum between exports), tagged by session and sent through the existing development log. Full camera reset discards in-memory data. The source is still development-only; production tracker selection is original.

No new behavior candidate was installed, promoted, committed, pushed or submitted. Daily Challenge, sharing services, recording, ads, core game loop and existing staging match their pre-investigation hashes. A later explicit UI correction removed the separate Mail shortcut from the result card; the regular complete-video share sheet remains.

## Evidence and confirmed software defects

The two latest accepted-top summaries show eye-to-grip -0.035/-0.039, shoulder-to-grip 0.027/0.025, remembered starting gaps 0.092/0.101, and no retained support contacts. The owner supplied ground truth: no pull-up occurred. Those summaries do not include the earlier individual wrists/shoulders, so they cannot establish whether the phone mislocalized the grip, produced a shoulder outlier, or both.

The new pullup-top-entry.test.ts executes the real SCRIPT_GAME calibration loop with SCRIPT_CORE stability/progress logic. It reproduces four false completions in the current rules:

1. Two stationary-body / moving-wrist sequences consistent with the logged relative gaps fill the bar and enter waitBottom.
2. Moving hands down after a genuine starting hang counts as shoulder rise because the current rule compares changing shoulder-to-wrist gaps.
3. One low-shoulder outlier can establish a permanent maximum-gap reference and permit a later stationary pose to complete step 1.

These are reproducible software failures. The reconstructed sequences are not claimed to be recordings of the user's frames.

## Wider path inspected

- Pose landmark indices match the model's documented eye, shoulder, elbow, wrist and foot indices. Raw camera coordinates are passed directly to the shared form tracker. Mirroring/cropping affects drawing only, not the incoming landmark coordinates.
- Reference learning currently accepts a single eligible observation and does not fix each grip before comparing body movement. This is the principal reproduced logic defect.
- Top validation and bottom validation share support evidence, but bottom checks cannot undo an already falsely accepted top. Gameplay still uses the same saved calibration and continuous collision loop.
- The existing stability buffer counts render-loop observations; repeated use of a recent camera pose can count more than once. The missing-tracking branch does not explicitly clear that buffer. This warrants trace-based timing tests; it is not established as the cause of the reported phone failure.
- Joint angles currently use normalized x/y directly. MediaPipe normalizes them by different image dimensions, so aspect ratio can affect inferred angles. Camera dimensions are now logged to investigate this instead of changing all exercises speculatively. [MediaPipe Web output documentation](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js).
- The detector provides estimated body landmarks, not a measurement of the physical bar or floor. Retained foot support is inferred from motion; it must be checked against actual suspended and grounded device sequences.

## Isolated investigation candidate

An offline candidate in the Codex task's work/pullup-top-investigation.ts requires a short observed hang, preserves individual grip/shoulder positions, and checks actual shoulder rise with bilateral elbow change. It is loaded only by an offline Jest module override. It has not replaced Expo diagnostics.

Several older gameplay fixtures used a single preparation frame, or a multi-second gap with no camera observations. Those fixtures now supply preparation frames while preserving every expected gameplay/calibration outcome. This does not certify the new reference requirement on a phone.

Verification:

- Failed .2 rules: four new actual-loop cases fail, as expected.
- Current .2-diagnostics: **103 tests pass / 4 known false-top tests fail** across six focused suites. The suite is intentionally red until the defect is actually resolved; it is not launch approval.
- Isolated candidate: **76 form/calibration tests pass** (two suites), including the four newly reproduced failures and previous straight-leg/foot-support regressions. This is synthetic coverage only.
- TypeScript and strict lint passed for the diagnostic/test changes; generated JavaScript syntax was checked again after the final trace instrumentation update.
- Protected files and pre-existing staged patch were verified unchanged.

## Next required observation and acceptance

Eight device traces have now arrived and were replayed. The findings below supersede the earlier waiting-for-capture checkpoint. The owner has been asked whether those eight attempts included genuine pull-ups or were all no-pull grip tests. That ground-truth answer is pending; detected body movement must not be relabeled as a successful physical pull-up without it.

Then verify the complete sequence: empty step-1 bar while merely gripping; legitimate top reached and held; legitimate bottom held; continuous gameplay with straight or bent suspended legs; grounded feet and calf raises rejected; feet outside view handled according to existing scope; no lockout penalty; no pipe freeze, recovery countdown or recording interruption. Phone/iPad acceptance remains necessary and cannot be replaced by synthetic test totals.

Task-local evidence: before-pullup-top-entry-2026-09-17 (original source and preservation hashes), pullup-top-entry-before.json, pullup-diagnostic-current-result.json, pullup-top-investigation-result.json. inspect-pullup-traces.cjs extracts future device traces into task-local JSON without publishing them.

## Device traces received and replayed

All eight sessions saved step 1 on the phone. The actual-loop replay reproduces the same acceptance timestamp in seven. The sixth session did not quite complete with the rounded trace points and inference-only replay timing. The capture ends at top acceptance, so this data does not constitute a replay of bottom calibration or gameplay.

| Session prefix | Shoulder rise from old reference to saved top | Wrist estimate downward shift | Interpretation |
| --- | ---: | ---: | --- |
| 1789673008978 | 0.0065 | 0.0745 | Wrist change supplies nearly all of the old gap-based lift |
| 1789673030761 | 0.0061 | 0.0632 | Same false-lift mechanism |
| 1789673195521 | 0.0122 | 0.0948 | Same false-lift mechanism |
| 1789673384644 | 0.0117 | 0.0685 | Same mechanism in phone endpoint; exact acceptance not reproduced |

Coordinates are normalized image height. The first two endpoint wrists have high reported visibility, so increasing the visibility threshold alone does not address this bug. These are changes in estimated landmarks, not proof that the person's physical wrists moved. Four other traces contain larger estimated shoulder rises (about 0.055 to 0.093); their physical labels remain unconfirmed.

The original isolated .3-investigation candidate rejected all eight sessions and never learned a starting reference. Its synthetic 76/76 result is therefore insufficient evidence of usability. The 140-degree starting-arm requirement conflicts with these actual camera projections. Two offline ablations removed that starting-angle requirement and then the bend-delta requirement; both still failed to complete every session because the remaining reference/visibility/grip/foot conditions interrupt acceptance. None was installed in Expo. This finding rules out presenting an angle-threshold adjustment as a complete correction.

The actual camera frames are 480 x 640. Pixel-space angle reconstruction changes measured elbow angles, but does not cure the false relative-gap interpretation or establish ground contact.

The foot code has a separate structural ambiguity: a foot held stationary while a suspended player bends a leg can satisfy the same motion condition used to infer floor contact. The implementation then persists that point as support, even if it is airborne. In other traces no support is learned, leaving a later stationary planted foot undetected. Existing gameplay summaries report height but omit the horizontal differences that can reset support timers; their exact contribution cannot yet be determined from captured data.

An offline check for a visible standing setup before gripping found that 7 of eight entire pre-top traces had fewer than 300 ms of bilateral feet, straight knees and lowered hands together (only one exceeded one second; another had 254 ms). Most early frames omit the feet. Automatically assuming a reliable floor reference was captured during the existing two-second preparation would therefore be unjustified. No new mandatory preparation step or speculative floor rule was installed.

## Mail result-card correction

Removed only the standalone Mail button in game.tsx after the owner identified it as redundant. The regular Share gameplay video action still opens the system share sheet, including its email destinations. The native Messages shortcut and sharing service are unchanged. Mobile typecheck and all six existing videoSharing tests pass. This small UI correction does not validate pull-up behavior.

Evidence is task-local: pullup-device-traces/*.json, pullup-device-replay-results.json, pullup-reference-model-comparison.json, pullup-preparation-analysis.json and the corresponding inspect/replay/compare scripts. Numeric device traces are not published or committed. Protected-file hashes and the original staged patch were checked again, with game.tsx explicitly exempted only for the verified shortcut-block removal.
