# Home evolution label OTA - October 8, 2026

Owner requested the saved Home emoji removal as an iOS OTA while testing the prior correction.

- Home source commit: `1d998df9b6b425cee3e63931a51bb445683c65ab`.
- Published source: `b472e7f827f54947fc5e476a683f94ab60a055e1`.
- Published at `2026-10-08T17:35:24.087Z` (14:35:24 Halifax ADT).
- iOS update `01a11c95-87b7-7b16-b666-c58a0accf894`, group `81cd3d99-5fa7-41ed-91e8-1d90305abfaf`.
- [Expo update](https://expo.dev/accounts/flapfitapp/projects/flapfit/updates/81cd3d99-5fa7-41ed-91e8-1d90305abfaf).
- Production channel/environment, live ads, native runtime `469f66ace28d0ea7661bb8681b0239739f8b3955` matching TestFlight build 10 without override.

Only the Home application source changed relative to the morning OTA: remove its evolution emoji and center the existing stage/progress text. Bird artwork, progress calculation, thresholds, calibration and other behavior were preserved. The official native fingerprint (109 sources), remote production environment and clean source checks passed before publication. The receipt and exported source map identify the exact committed Home source; exported guide bytes match all 13 committed WebP files. Earlier calibration and microphone code remain in this package. No native build, Android publication or App Review submission was started.

## Device testing clarification

The owner initially reported standing-upright pushup calibration, then clarified they had deleted the app, reinstalled build 10 and tested before applying the OTA. The old silhouettes revealed the embedded version; they then downloaded updates to retest. The earlier observation is not evidence that the morning calibration correction failed. Updated physical acceptance remains pending; do not mark it passed or failed based on that earlier embedded-build test. The approved tracker marker remains unchanged.

## Microphone follow-up

The owner then observed the three-option microphone-denial screen on every recording attempt, regardless of choosing Go back or Continue without sound. This is a separate confirmed UI problem in the published microphone flow. The Home OTA does not fix it. The focused follow-up is documented in [microphone denial correction](ios-microphone-denial-2026-10-08.md).

Manual OTA installation remains Info -> Check for updates -> Update now. Reinstalling build 10 restores its original embedded code until a manual update is applied again. The eventual replacement native build must embed the approved changes.
