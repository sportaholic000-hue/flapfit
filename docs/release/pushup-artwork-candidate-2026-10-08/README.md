# Unpublished pushup artwork candidate — October 8, 2026

These are backups of the smooth-outline preview shown to the owner, not active app assets. Do not ship them automatically. Owner visual acceptance and device preview remain pending.

- `pushup-top-smooth-candidate.webp` and `pushup-bottom-smooth-candidate.webp`: transparent, lossless candidate assets; body opacity 32%, yellow maximum opacity 88%.
- `pushup-top-comparison.png` and `pushup-bottom-comparison.png`: installed artwork on the left, local candidate on the right, with background stripes demonstrating transparency. Comparison images are not app assets.
- Existing bundled artwork and `pushupGuideImageData.ts` are unchanged.

The candidate uses the same improved-hand generated source recorded in `../pushup-artwork-preview-2026-10-07.md`. Local edge cleanup was explicitly authorized by the owner. The new preview smooths the extracted contour with antialiasing, closes interior transparency cracks beneath the jaw and preserves the source's internal yellow lines independently of body translucency. Both poses were inspected at full size, but not installed on a physical iPad/iPhone.

For an eventual Android port, use the transparent assets only after owner approval, keep the established guide placement/stages/fades, and verify device rendering. The current iOS artwork path embeds image bytes into the WebView; replacing files alone does not change that embedded data. Do not publish an OTA or build as part of transferring this backup.
