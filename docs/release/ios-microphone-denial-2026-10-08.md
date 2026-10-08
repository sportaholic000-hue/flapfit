# iOS optional microphone denial - October 8, 2026

## Owner report and cause

After declining Apple's microphone request, the owner was returned to Open settings / Continue without sound / Go back. That custom screen returned on every recording entry. The previous correction stopped repeated native permission requests but retained a per-run silent-recording choice, so returning Home or starting a new route reset that choice. Previous tests explicitly accepted the custom screen and therefore missed this user-experience failure.

## Focused correction

Use the existing iOS `denied` microphone permission as a complete decision. Derive silent recording directly from that status, without another saved preference, effect, timer, SDK call or support workflow. The first native denial now proceeds directly into calibration/gameplay with `recordAudio:false`. Later recording entries do the same without the microphone custom screen or another native request, even if `canAskAgain` is true. First-time undetermined permission retains one neutral Continue followed by the native request. Granted permission records audio. Returning Home and starting a new recording after changing the OS permission picks up the new status.

Only iOS adopts automatic silent continuation; Android prompt actions and Settings recovery remain unchanged. Camera permission handling is unchanged. No new calibration text, posture checks, artwork, advertising behavior or gameplay tracking changes.

Apple's [pre-alert guidance](https://developer.apple.com/design/human-interface-guidelines/privacy#Requesting-permission) concerns the custom explanation before the native request. It does not require the repeated post-denial choice screen. This correction removes unnecessary repeated confirmation of optional sound.

## Verification and Android adoption

The actual Root -> Home -> Game startup tests now require immediate silent entry after first denial and no custom microphone prompt on repeated entries. They also cover already-denied `canAskAgain` values, granted audio, new entry after enabling sound in OS Settings, unchanged Android Settings recovery and the existing camera flow. Final verification: all 38 startup/permission integration tests passed, TypeScript passed, and targeted lint passed. The initial cold test run timed out in an existing startup test; the unchanged warm rerun passed the full affected suite. The owner separately confirmed silent recording and enabling sound in device Settings already work. Those recording options were preserved verbatim. The revised automatic continuation still requires the owner's iPad check after installing this update.

Relevant files: `apps/mobile/src/app/game.tsx` and `apps/mobile/src/services/privacy/__tests__/startupGameEntry.test.tsx`. The source change is a derived permission decision used only by entry gates; the existing recordAudio expression, its memo dependency, and the capture/share implementation remain unchanged, not a new architecture. Later Android adoption must be deliberate; do not copy the iOS guard as though it already enables Android behavior. No Android branch was changed.

This document describes a candidate correction. Publication receipt will be recorded separately if/when published. No new native build or App Review submission has been started for it.
