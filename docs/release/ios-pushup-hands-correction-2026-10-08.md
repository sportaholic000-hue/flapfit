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
