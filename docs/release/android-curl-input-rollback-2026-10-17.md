# Android curl input response rollback — 2026-10-17

Owner reported no-weight curls were great on 9febb31, but weighted curls regained unacceptable middle-to-top jitter. Hammer curls were not attempted. Revert the elapsed-camera-time input gain added in that commit. Preserve the successful image-space median hand controller and 270ce1b render-follow timing.

Runtime scripts are verified identical to 270ce1b after allowing only the diagnostic rules-version change to 2026-10-17.5-curl-input-rollback. Calibration, per-arm normalization and bilateral checks remain unchanged. Input gain is again 0.55 per observation. Earlier no-shoulder/no-head-flight rules remain. No iOS, squat, recording, model/dependency, build or OTA changes.

Two gameplay sessions were captured on elapsed-input-follow-1 in the owner-reported order; an earlier calibration-only session is preserved but is not counted as a gameplay attempt. Weighted-run upper-half hand estimates contain short reversals. For three example reversals the rejected gain was approximately 0.59–0.64 compared with the restored 0.55, passing more of each fluctuation through. This does not establish the owner's physical hand motion or prove every perceived jitter event's cause. The regression report is the reason to roll back; a smaller estimated-target gap was insufficient evidence of a better physical experience.

260 focused tests pass. Preserve the rejected input-timing handoff note with its rejection clearly marked, and all raw traces locally outside Git. The lower-half tracking issue and responsiveness tradeoff remain unresolved; this rollback restores the better baseline rather than claiming a complete curl fix.
