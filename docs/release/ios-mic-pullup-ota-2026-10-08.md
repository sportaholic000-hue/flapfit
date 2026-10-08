# iOS microphone and pullup artwork OTA - October 8, 2026

Published after the owner's ongoing authorization to test these iOS corrections by OTA before another native build.

- Source: `212141964722dbac79f94905b48fe36585215ea2` on `codex/ios-camera-permission-review`.
- iOS update group: `617283a4-b4bb-489c-af81-368bb4ab35f3`; update ID: `01a11cda-e961-7c94-8425-56f8173df4e6`.
- Created: `2026-10-08T18:51:11.073Z`.
- Production channel/environment, existing live advertising configuration.
- Runtime: `469f66ace28d0ea7661bb8681b0239739f8b3955`, matching installed TestFlight build 10 using the official 109-source fingerprint. No compatibility override.
- [Expo publication](https://expo.dev/accounts/flapfitapp/projects/flapfit/updates/617283a4-b4bb-489c-af81-368bb4ab35f3).

## Included and verified

`a008816` removes the repeated iOS microphone-denial choice screen. First native denial and later recording entries proceed silently. The original recordAudio expression, its dependencies and capture/share implementation are unchanged. First permission explanation still has Continue. Enabling microphone permission in Settings restores audio on subsequent recording entry, as the integration test covers; the owner already verified audio capture works that way before this entry-gate correction.

`2121419` restores the two pullup bars from the original gray reference pixels. Only 33-row strips of the top/hang assets changed. Other decoded pixels, all other eleven guide assets, all placement bounds, stages and calibration measurements are unchanged. The raised pose retains the reference's eye-level bar.

The earlier centered Home text and `2026-10-08.3-pushup-body-entry` calibration remain intact. The owner tested the updated iPad calibration and said to lock it in; [acceptance record](ios-pushup-owner-acceptance-2026-10-08.md).

Verification: 38 permission/entry tests plus 19 artwork/stage tests passed; microphone changes passed TypeScript and targeted lint. Exact published Home and Game sources were compared with committed source maps. All thirteen complete WebP payloads were found byte-for-byte in the exported iOS bundle, including the repaired bars. The unchanged posture helper and short calibration wording are present. Production environment validation, clean source/scope checks and official runtime matching passed before publication.

## Owner device checks still needed

Install through Info -> Check for updates -> Update now. Check both pullup hold images for a smooth consistent bar and transparency. With microphone access off, start a recording, return Home and start another: neither should show the three-choice microphone screen. Recording should remain silent. The owner already confirmed silent recording and enabling sound in Settings; the capture functionality was preserved.

The OTA does not change the app's embedded TestFlight binary. Deleting/reinstalling build 10 restores that older embedded version until the manual update is installed again. A later owner-approved native build must embed the approved source and synchronize the approved tracker marker in the production profile and matching EAS environment. No native build or Apple submission was started during this update. Android branches, main and the submitted build-8 tag were preserved.
