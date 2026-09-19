# Pull-up support handoff correction — September 17, 2026

Current Expo Form Test: **2026-09-17.2**. Device acceptance is pending; the production tracker remains original.

The owner reported the calibration warning to lift feet, followed by successful calibration and gameplay that still accepted planted feet. The current Expo log confirms that calibration observed right-toe support at image y=0.879 (release clearance 0.014), then saved elevated feet at top/bottom. Later gameplay showed shoulders approximately 0.426–0.429 with both feet approximately 0.859–0.872, but no anchored contact was reported. These are diagnostic summaries, not a recording of every landmark; synthetic tests reproduce the condition rather than claiming to replay the exact camera frames.

Cause: the calibration warning latch forgot the support reference after takeoff. Gameplay only retained a moving window that needed shoulder travel to identify stationary feet. Putting feet down and holding the upper body still could remain valid indefinitely.

Correction:

- Preserve each observed ankle, heel and toe support location from calibration into gameplay. A reference is learned only when existing motion evidence identifies an anchored contact. Never infer the floor from knee extension, the lowest calibrated feet, or an average whose landmark composition can change.
- Use the fixed hand position as the coordinate reference. A return to the same observed support area must persist through 500 ms of camera poses; the existing 350 ms fatal-form confirmation then releases bird control. The game still ends only on collision, with pipes and recording continuing.
- Keep the same check active during calibration. Retain the previous torso-scaled takeoff clearance and straight-leg acceptance. Disappearance and pose gaps reset pending contact time; full calibration reset discards all support references.
- Keep the motion-based check for new contacts where no support reference exists. This correction does not invent ground contact for feet outside the image or replace real-device testing.
- Log retained support heights, current individual contact heights and the evidence source so another failure can be diagnosed directly.

Verification:

- Before correction, five new assertions failed: stationary grounded feet at three camera scales, a single planted toe with raised heels, and reacquired sustained contact after occlusion. Four negative cases passed.
- After correction: **5 suites / 98 tests passed**. This includes all nine new regressions, straight-leg calibration, suspended straight-leg gameplay below tucked calibration feet, planted toes/calf raises, lockout endpoints, continuous pipe/collision behavior, and recording boundaries/MP4 handling.
- Mobile TypeScript, repository strict lint and diff whitespace checks passed.
- Protected gameplay, recording, sharing, Daily Challenge/lobby source and the pre-existing staged patch retain their pre-fix hashes.

Physical retest: reload Expo and confirm Form Test 2026-09-17.2. Check a legitimate straight-leg calibration/run, then repeat the reported sequence of lifting feet for calibration and putting them down during play while holding still. The latter should release the bird into a normal fall after sustained contact, without an overlay, pipe freeze or recovery countdown. Test actual feet/toe visibility and both mobile platforms before promoting this tracker or calling pull-ups solved.

No commit/push, native build, store submission, or tracker promotion was performed for this candidate. Source backup and preservation hashes are under the task's work/before-planted-return-2026-09-17 folder; Jest JSON is work/planted-return-jest-result.json.
