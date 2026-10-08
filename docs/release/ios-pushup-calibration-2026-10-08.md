# iOS pushup calibration correction — October 8, 2026

## Why this changed

Owner reproduced step-one acceptance before taking a pushup position, including standing and bending over to adjust an iPad. Owner explicitly requires both arms to be relatively straight before step one starts calibrating. The old implementation could use one visible arm, or an average that hid one bent arm. Its buffer also counted render iterations of previously observed landmarks.

## Focused change

- Step one now requires an in-frame shoulder, elbow and wrist on EACH side, using the existing 0.24 visibility threshold.
- Each elbow must independently meet the existing 125-degree straightness threshold. The threshold itself was not increased.
- Pushup calibration now uses the existing fresh-observation stability mechanism already used for pullups: at least eight distinct camera observations across the same nominal 1.3-second hold. Repeated renders do not count as new observations.
- Stale pushup tracking clears progress and the stability buffer. Bending either arm or losing an arm during step one also resets the hold through the existing invalid-form path.
- The existing two-second camera-start preparation delay, 0.028 stability drift tolerance, endpoint travel requirement and bottom-position angle limits remain unchanged.
- Gameplay validation, scoring, failure rules, rendering, ads, permissions and calibration artwork are unchanged by this correction.
- Rules marker is `2026-10-08.1-pushup-calibration`. The production profile still carries the earlier owner-tested marker. The existing production validator intentionally reports that mismatch until physical testing/owner approval is resolved. Do not silently mark the new rules as physically approved.

## Verification and limits

The new 18-case test file exercises actual production measurement/validation/stability/state-machine code with synthetic camera observations. Before correction, 15 cases failed and three valid-pose timing cases passed. After correction, all 18 pass. Combined with existing form-tracking and pullup step-one suites, 94 tests pass.

This does NOT establish floor contact or eliminate every false standing/leaning calibration. A standing person with both estimated arms straight can still satisfy these arm checks. Camera estimates can be wrong, particularly with occlusion or poor lighting. No device pose stream from the owner's failed run was available. Do not claim the synthetic tests are physical iPad/iPhone verification.

## Required device checks before accepting this correction

1. With either arm bent or hidden, step-one progress must remain empty.
2. Begin a proper front-facing top pushup with both arms visible and relatively straight; hold and complete calibration normally. Both endpoints must still support a playable run.
3. Bend/hide an arm during the hold: progress must restart. Move out of frame and return: a fresh hold is required.
4. Check the usual iPad floor placement and an iPhone, normal room lighting, normal and recorded runs.

## Android handoff

Work is saved on `codex/ios-camera-permission-review`; no Android branch was changed. Port the focused changes in:

- `apps/mobile/src/utils/game/html/scriptFormTracking.ts`
- `apps/mobile/src/utils/game/html/scriptCore.ts`
- `apps/mobile/src/utils/game/html/scriptGame.ts`
- `apps/mobile/src/utils/game/__tests__/pushup-top-entry.test.ts`

Inspect the Android branch's current tracking changes before applying; do not replace whole files or overwrite its experiment work. Rerun the tests and Android device calibration checks. Follow the owner-approved release workflow for the version marker.
