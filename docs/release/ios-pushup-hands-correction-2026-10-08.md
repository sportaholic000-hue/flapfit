# iOS pushup hands correction — 2026-10-08

Prepared for owner review. No OTA publication, native build, upload or Apple submission in this revision.

## Source and scope

The owner accepted the other five exercise guides and requested the hands from the exact single-figure image supplied in chat. The published guide used a different two-figure source; its blue-only extraction also removed bright finger detail. This revision replaces both pushup poses’ hands with the owner-selected palms, thumbs and fingers, retains source RGB/highlights, and changes alpha for the established translucent rendering. Only the short forearms are aligned to the existing wrists. The source hands are uniformly scaled, not redrawn or generated again.

- Exact owner reference: [owner-selected-reference.png](pushup-hands-2026-10-08/owner-selected-reference.png).
- Reference SHA-256: `b8f697566d49f4f553d82b76c14a1acb67f8182f8d96182ae9fe23dc79ca1b47`.
- [Offline reproduction recipe](pushup-hands-2026-10-08/prepare-hands.py) reads the unchanged body assets from source commit `34ba0d5205d133f07ee973734fe2397c05d49e88`; requires existing Pillow/NumPy and Git, no model/API/network call.
- [Hand close-ups](pushup-hands-2026-10-08/hands-review.png) use the bundled assets at their actual transparency on a neutral background. These are local previews, not iPad screenshots.

Only `pushupTop.webp`, `pushupBottom.webp`, their manifest provenance and corresponding embedded image-data entries change. The accepted body pixels outside the hand/wrist patches remain exact. The other eleven pose image files are byte-for-byte unchanged. Existing placement, guide transitions, calibration text/progress bar and alpha style remain. Body alpha remains approximately 0.32 and yellow detail up to 0.88. The original selected yellow finger outlines are retained rather than replacing them with traced finger paths.

## Verification

- Exact embedded/file bytes and lossless WebP: existing 19 artwork tests pass.
- Existing guide verification: 36 excluded configurations identical; 12 enabled configurations; all six exercise fade/lifecycle checks pass.
- Browser layout checks: 52 layouts at 375×667, 430×932, 820×1180 and 1024×1366; plus 8 recording-branding layouts pass. Pushup top/bottom iPad and iPhone captures visually inspected.
- Other eleven pose hashes, body pixels outside the patch and asset dimensions preserved.
- No dependency, native configuration, permission, ad, camera, microphone or Android branch changes.

The source artwork and reproduction recipe are included so the correction is recoverable from GitHub. Owner still needs to inspect it on the iPad before another build. Do not confuse the published OTA `c2016486-88a3-43cf-a85d-ca208d28876c` with this unpublished revision.

## Publication follow-up

The owner confirmed this correction should be delivered to the iPad through the already-authorized OTA. Published successfully on October 8, 2026 at 04:08 Halifax time (07:08 UTC), from clean pushed source **64a32f6a2689a0874d49444b35b40bc79574838d**. EAS exited 0 and returned:

- iOS update group: **794e8fd8-a5de-4cee-b222-bb19af129243**
- iOS update ID: **01a11a57-3399-72ba-8089-c2030365da0b**
- Runtime: **469f66ace28d0ea7661bb8681b0239739f8b3955**, matching TestFlight build 10; no compatibility override.
- Branch/channel/environment: **production**; platform **iOS only**; existing live-ad configuration preserved.
- [Expo publication](https://expo.dev/accounts/flapfitapp/projects/flapfit/updates/794e8fd8-a5de-4cee-b222-bb19af129243).

Production environment validation passed before publication. Export produced the 10,104,864-byte Hermes bundle `index-a8258a477a860e5b1f02783f1a9fa51e.hbc` and 107 assets. The exported bytecode was checked for both exact replacement image data URIs and the new posture-check string (stored in UTF-16 by Hermes). Thus these changes are present in the exported update, not only in source files or preview images.

Installation remains manual: **Info → Check for updates → Update now**. Owner device acceptance remains pending; the new tracking rules are not marked physically approved. No native build, Android update, App Review submission or public release was started. Main, the release tag and Android branches are unchanged. The source/reference artwork and calibration tests were already backed up; this follow-up records publication only.
