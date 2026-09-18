# Pull-up floor-reference physical failure — September 17, 2026

**Acceptance result: FAILED.** The owner reports that toes could be planted after calibration and gameplay continued on the installed .3-floor-reference candidate. Do not promote this candidate or treat the earlier 267 passing software tests as physical acceptance.

## Evidence from the new device logs

- All three captured sessions identify version 2026-09-17.3-floor-reference and record floor-reference-saved. The first recorded run has a confirmed-ground-contact event; its exact physical circumstances are not labeled. The following two runs continue for captured gameplay spans of roughly 12 and 17 seconds without confirmed contact.
- Latest session: 1789680788022-051025. It contains 769 gameplay frames across 17.072 seconds. All four heel/toe landmarks meet the existing visibility threshold throughout those frames. The saved floor reference remains present, and streamUnverified stays false.
- Saved left/right toe image heights are about .90022/.90254. During gameplay, both estimated toe locations stay higher in the image; their median apparent clearance is about 15.3/12.8 pixels in the 640-pixel image. Toe visibility remains high (left at least .874, right at least .894). No captured sole point reaches its saved contact threshold. Both feet are classified AIR by the existing comparison.
- The owner supplies the physical ground truth that toes were planted. Exact planted intervals within each run are not annotated. Numeric logs cannot determine whether the mismatch comes from foot orientation, foot position/depth, landmark bias, or another geometric change. This is not evidence that the owner used the wrong version or that the floor reference reset.

## Why the software tests passed

The earlier contact fixtures assumed a planted foot returns to the same heel/toe image height learned while standing flat. That assumption is not established for the real movement. Correctly testing the timer and latch around that assumption cannot validate it. Widening a tolerance based only on this failure would risk rejecting genuinely suspended feet again. No threshold or runtime patch was made in response to this report.

## Additional reproduced weaknesses

A read-only replay of the installed complete game loop showed control continuing for six seconds with missing sole landmarks, visible-foot estimates below the .35 contact confidence cutoff, and visible points in the UNKNOWN band between contact and clearance. A raised heel can also classify a foot AIR while its planted toe is missing. The explicitly permitted cropped-foot mode cannot verify floor contact. These are separate code-level weaknesses; missing or low-confidence landmarks do not explain the latest recorded run.

## Feasibility and release decision

MediaPipe outputs estimated body landmarks, including heel and foot-index points. It does not output measured support force or a detected sole/floor contact plane. Its official output description is at https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker . Interpreting a higher estimated foot-index point as proven suspension is an application inference.

Motion-range calibration can still be useful. Perfect proof of unassisted pull-ups across arbitrary camera positions, toe contact, and hidden feet is not a defensible promise from the present observations. Stronger verification needs an explicitly constrained visible setup and independently labeled grounded/airborne evidence before acceptance. The owner has explicitly rejected deferring or removing pull-ups: they remain a required launch feature and a central gameplay-video marketing use case. Continue improving calibration and gameplay enforcement within that scope. Do not remove the exercise, omit it from launch, or silently relax the planted-foot requirement. No exercise, leaderboard, Daily Challenge, recording or sharing feature was changed here.

Production tracker selection and approval marker remain unchanged. No push, native build, store submission, or contest submission was performed.

Numeric captures and analysis are retained task-locally in C:/Users/money/Documents/Codex/2026-09-16/g/work/pullup-floor-failure. The source log is work/remote-iphone/floor-20260917-181243.stdout.log. These are landmark traces, not recorded images.
