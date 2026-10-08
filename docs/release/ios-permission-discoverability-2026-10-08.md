# Permission discoverability and owner feedback - October 8, 2026

The owner installed the latest update and reported that the pullup bars look much better. After declining microphone access, the additional custom prompts are gone. Preserve the repaired artwork, the approved pushup calibration and the working audio capture/share behavior.

The owner also reported that their first Record & Play attempt showed camera permission but did not show microphone permission before they closed out. The microphone option appeared on their second entry. It is not yet known whether the first attempt entered calibration/gameplay, remained on the camera explanation, or showed a loading/blank view; that distinction was requested. Do not claim a cause or native-device fix without evidence.

## Narrow copy change

The existing Info row already calls Linking.openSettings(), opening Flap Fit's system settings. Rename it from "Camera permission settings" to "Camera & microphone settings", with "Change camera or microphone access in your device settings" underneath. Keep the action, layout and audio functionality unchanged. Its existing flexible text container permits wrapping.

## Investigation

Read the actual Home Record & Play route, the game permission gates, Expo's permission hook and the bundled native camera/microphone requester. A first recording with both permissions undetermined should show the camera explanation, then the microphone explanation after camera approval; it should not enter the WebView before the microphone choice. Add integration coverage for both grant and denial after that combined sequence, using the real Home -> Game navigation. These tests simulate the native permission boundary and cannot establish what happened on the physical iPad.

All 40 permission/entry integration tests passed, including the two combined first-request cases, and targeted lint passed. TypeScript also passed. The first-attempt iPad observation was not reproduced by these automated checks; it remains unresolved pending the owner's description of the intervening screen. No game.tsx, recording implementation, calibration rules, artwork, SDK, dependency, or native configuration changes are made for this follow-up. The Info text change is a candidate for the next update/build, not a claim that it is already on the owner's iPad. No build, OTA or Apple submission has been started for this follow-up.
