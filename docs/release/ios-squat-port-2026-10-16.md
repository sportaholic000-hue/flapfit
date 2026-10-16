# iOS accepted squat port — October 16, 2026

Preparation branch: `codex/ios-design-update-2026-10-14`. Starting commit: `75574c92af60211e707c5a1d28c6ad784c0f0471`. This prepares a future update; it does not alter the submitted build 11 source or authorize a build, OTA, upload or submission.

## Provenance and boundary

- Accepted Android implementation: [a1701e36990f73e7b170ab5951821a31d819cc4f](https://github.com/sportaholic000-hue/flapfit/commit/a1701e36990f73e7b170ab5951821a31d819cc4f).
- Owner acceptance: [5e97a4fb2bff610ec2b46537cbb00dc6a74d2f22](https://github.com/sportaholic000-hue/flapfit/blob/5e97a4fb2bff610ec2b46537cbb00dc6a74d2f22/docs/release/android-squat-presence-2026-10-15.md).
- The final snapshot incorporates the earlier ankle-independent tracking (c830f02), shoulder control (db21dcf), independent leg evidence (001a823), and final presence/partial-range corrections (a1701e3). Intermediate rejected versions were not cherry-picked as standalone fixes.
- Compared the complete accepted files with iOS, then applied only the squat-related hunks. The Android game screen contains different platform permission, recording-branding and wake-error handling; none of those differences were ported.
- Omitted preview-only squat trace collection, its config flag and React Native message handler. Accepted tracking/control/calibration functions, thresholds, smoothing and instructions are unchanged. Existing pullup diagnostics are untouched.
- This supersedes the October 15 handoff's squat exclusion for this preparation branch only. The submitted release remains unchanged.

## Prepared behavior

1. Squat flight uses the same two-shoulder midpoint throughout the run. It never switches to hips or one shoulder; hand placement is not a control input. Feet, ankles, heels and toes are not used by the form-aware squat tracker.
2. Standing and bottom calibration require shoulders, hips and knee evidence, a broadly centered camera-facing pose, and a stable hold. Step 2 rejects waist folding, insufficient shoulder/hip travel and unchanged standing-leg geometry.
3. Holds count fresh camera observations, including horizontal stability. Empty detections, detector errors and invalid shoulder observations discard squat hold/raw tracking evidence. Existing gameplay visibility-loss grace remains.
4. Shoulder flight and leg references use the same averaged hold samples. In gameplay, leg evidence checks beyond 30% shoulder progress allow a 30-percentage-point difference, tolerate brief noise, and latch after 600 ms accumulated mismatch. Existing fatal confirmation, gravity/collision ending and result handling remain.
5. Home and squat setup instructions explain that shoulders, hips and knees must remain visible while feet may be outside the frame. Other exercise instructions are unchanged.

## Preservation

- All other exercise tracking branches retain their behavior, including both-arm requirements for biceps, lateral raises, shoulder presses and pushup entry. Pullup support/reference logic is unchanged; its averaging helper only gains an optional explicit history for squat reuse.
- Working iOS calibration silhouettes, stage transitions/fades, camera and microphone flows, screen-awake handling, recording/share/branding, result-first ad handling, consent/eligibility, manual OTA configuration, saved progress and leaderboards are unchanged.
- No native, dependency, build-profile, country, backend or storage change. No Android branch, main or submitted release ref is changed.
- The shared game test harness gains the accepted real camera-loop adapter and a test-only detector-error injection. Existing recording-boundary observations and pullup fixtures are retained.

## Verification

**434/434 tests passed across 26 game suites**, including 40 squat cases, all existing bilateral-arm/other-exercise regressions, real tracking-loop calibration loss/error cases, recording boundaries/branding/MP4 and iOS artwork tests. The existing Expo/Jest preset ran them in one clean invocation without timeout overrides. TypeScript, lint, manual OTA configuration and the source-scope audit passed. See [verification details](ios-squat-port-verification-2026-10-16.json).

Production release validation has exactly one pending condition: the unchanged production approval marker still identifies the previous physically tested tracker (2026-10-08.3-pushup-body-entry), while this port correctly identifies 2026-10-15.5-squat-presence. No validator was disabled and no approval was fabricated. After the owner accepts iPhone testing, update that existing marker and rerun release validation before an authorized production build. The current submission is unaffected.

Android physical acceptance is evidence for the source implementation, not iPhone acceptance of this port. No new native dependency is required by these source changes; any future OTA delivery still requires runtime/environment verification and separate authorization.

## iPhone acceptance before a release build/submission

When a testing delivery is separately authorized, start a fresh squat calibration and check:

- Feet visible, cropped and moving in/out of frame: smooth flight with usual hand positions; no sudden switch in height.
- Leave view during each calibration step: progress stops; returning requires a fresh stable hold.
- Standing reference is not accepted while walking past the edge or already crouched; Step 2 rejects folding without a squat and accepts a normal deep squat.
- Head-only and sustained straight-leg attempts cannot sustain the run; ordinary squats remain playable.
- A short smoke test of the other exercises confirms bilateral-arm behavior, existing silhouettes, recording/share and normal result navigation.

No iPhone/iPad install or physical acceptance is claimed in this preparation. Contrast review and multilingual work remain separate.
