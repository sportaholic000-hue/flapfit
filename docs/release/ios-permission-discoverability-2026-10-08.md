# Permission discoverability and owner feedback - October 8, 2026

The owner installed the latest update and reported that the pullup bars look much better. After declining microphone access, the additional custom prompts are gone. Preserve the repaired artwork, the approved pushup calibration and the working audio capture/share behavior.

The owner also reported that their first Record & Play attempt showed camera permission but did not show microphone permission before they closed out. The microphone option appeared on their second entry. The owner then clarified: "ya the game opend properly". This rules out a stuck camera explanation or loading screen in that report. It does not establish the recording route flag or native microphone status returned on that first entry. The owner has been asked whether the latest manual OTA was already installed for that attempt, because a fresh TestFlight install initially contains the older embedded source. Do not claim a cause or native-device fix without evidence.

## Narrow copy change

The existing Info row already calls Linking.openSettings(), opening Flap Fit's system settings. Rename it from "Camera permission settings" to "Camera & microphone settings", with "Change camera or microphone access in your device settings" underneath. Keep the action, layout and audio functionality unchanged. Its existing flexible text container permits wrapping.

## Investigation

Read the actual Home Record & Play route, the game permission gates, Expo's permission hook and the bundled native camera/microphone requester. A first recording with both permissions undetermined should show the camera explanation, then the microphone explanation after camera approval; it should not enter the WebView before the microphone choice. Add integration coverage for both grant and denial after that combined sequence, using the real Home -> Game navigation. These tests simulate the native permission boundary and cannot establish what happened on the physical iPad.

All 40 permission/entry integration tests passed, including the two combined first-request cases, and targeted lint passed. TypeScript also passed. The first-attempt iPad observation was not reproduced by these automated checks; it remains unresolved: the game opened, but the first entry's native permission state and installed update have not been captured. No game.tsx, recording implementation, calibration rules, artwork, SDK, dependency, or native configuration changes are made for this follow-up. The Info text change is a candidate for the next update/build, not a claim that it is already on the owner's iPad. No build, OTA or Apple submission has been started for this follow-up.

## Read-only trace after the clarification

The existing Home Record & Play action passes `record: '1'` with the camera background. The recording entry gate waits when microphone status is null or undetermined; previously granted access enables sound and previously denied iOS access continues silently. Both camera and microphone use separate native Expo requesters backed by their corresponding AVFoundation media types. Camera approval does not intentionally grant microphone access, and the inspected code contains no first-run rule that skips microphone choice. The entry gate remains latched through ordinary app-state changes; no source evidence was found that explains this particular device observation.

Do not label this a reproduced defect or assume a stale native status, lost route flag, or user button error as the cause. Preserve the approved calibration, artwork and audio implementation. No app code changed during this additional trace.
