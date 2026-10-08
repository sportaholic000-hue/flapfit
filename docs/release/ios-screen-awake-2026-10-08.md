# iOS screen-sleep correction — October 8, 2026

Owner confirmed that the entire device slept and showed its lock screen, rather than only the camera/WebView turning black. Owner reports this was the first iPad occurrence despite extensive earlier testing.

## Findings

Neither build-8 submitted source (`0041d268...`) nor the build-10/artwork-preview source explicitly prevented idle screen sleep during gameplay. No keep-awake protection was removed by the artwork update. Expo's installed development wrapper enables keep-awake, but production registration excludes that wrapper. That can explain differences from development installs; it does not establish why this particular iPad incident happened for the first time now. Exact device settings/time-to-lock were not captured.

## Correction

- `GameScreenAwake` activates the existing Expo keep-awake native module only on iOS, while the eligible game WebView is mounted and there is no result. This covers calibration, countdown and the run.
- Navigation blur, result display, error/removal of the game view and unmount release the lock. Retry/refocus acquires a new tag. Cleanup of a delayed old activation cannot release the newer run's tag.
- Expo's existing native module releases the system idle-timer override in the background and restores it in the foreground when a tag is active.
- No timers, polling, network requests, ad preparation or per-frame work were added. Saved device Auto-Lock settings are not modified, and manually locking the device is still possible.
- Android/web activation is explicitly disabled in this iOS candidate.
- `expo-keep-awake ~57.0.2` was already installed and resolved transitively through Expo. The app now declares that same version as a direct dependency. The baseline runtime fingerprint already lists its iOS native directory. This is evidence of the existing native dependency, NOT a substitute for verifying a new candidate's OTA runtime compatibility.

## Validation and required physical check

Five focused lifecycle tests cover rerenders, result/retry, navigation blur/refocus, unmount, late asynchronous activation, and Android/web non-activation. Real Auto-Lock behavior still needs iPhone/iPad testing after an authorized installation: set a short existing Auto-Lock interval, leave the screen untouched through calibration/play for longer than that interval, then verify normal auto-lock resumes outside the run. Test returning from background and manual lock as well.

## Android handoff

Review `GameScreenAwake.tsx`, its test, the two-line integration in `game.tsx`, and the dependency declaration. Do not copy the iOS platform guard as an Android fix: the Android agent must deliberately adapt the lifecycle behavior and test Android screen timeout/background/manual-lock behavior on its own branch. Native implementation is already provided by Expo; do not add an unrelated wake-lock library or background service.

No build, OTA publication or Apple submission was started for this correction.
