# Pushup artwork OTA preview - October 7, 2026

## Scope and approval

The owner requested an OTA preview on installed TestFlight build 10 before committing to another native build, and explicitly approved local image-processing tools after generated transparent images retained noisy edge pixels. This change replaces only the two iOS pushup calibration figures. No build or App Review submission is authorized by this preview.

## Artwork and transparency

The approved detailed two-pose preview came from the owner's ChatGPT reference `Downloads/pushup`, edited with built-in image generation. Local cleanup removed external fringe and detached pixels, kept the blue figure detail and hands, rebuilt a thin yellow contour, and split the poses. The body alpha is 0.32 and outline alpha is 0.88, matching the existing guide's transparency levels. The assets contain real alpha transparency, not a background-colored rectangle.

Bundled assets: `apps/mobile/assets/images/calibration/pushup-top-preview.webp` and `pushup-bottom-preview.webp` (119,702 bytes combined). `pushupGuideImageData.ts` embeds their exact bytes for the existing offline WebView HTML, avoiding extra network requests, asynchronous game-entry preparation or native dependencies. To regenerate the module, encode each WebP's bytes as base64 under its existing `top` / `bottom` key; do not change the artwork's baked alpha.

The SVG images use the previous artwork's bounds and the existing calibration markup, lifecycle, transitions and fades. Android markup and the other five exercise guides remain unchanged. Tracking measurements, thresholds, gameplay, camera/microphone permissions, recording branding, advertising and regional policies are untouched.

## Image prompt used for the approved detailed preview

Edit target: the supplied two blue push-up figure cutouts. Targeted cleanup only: preserve both figures' blue shaded rendering, anatomy, hands, five digits per hand, poses, relative positions, clothing, thin yellow contours and subtle white INTERNAL clothing detail. Remove every stray white/gray/yellow/green speck, white ragged halo, cloudy patch, detached mark and noisy residue OUTSIDE the actual human silhouettes. The space between arms and torso and around shoes must be perfectly clean transparent alpha. The outer yellow contour must be smooth, continuous and tightly hug each figure, with only a crisp 1-to-2-pixel antialiased edge, no outer white glow, no fuzzy background remnants. Add generous transparent padding on all four edges so hands never approach the image boundary; preserve full hands and all fingertips. Maintain both figures side by side at their existing scale relative to each other and matching hand-ground baseline. Do not redraw as flat vectors, do not simplify hands, do not alter the exercise poses. No background, floor, ground line, shadow, checkerboard, text, labels or watermark. This should be a clean professional transparent game overlay asset, not a messy background-removed cutout.

The generated output still had fringe; it was subsequently cleaned locally with the owner's explicit authorization. The later single-figure generation was not used.

## Verification and delivery

Production remote environment comparison, existing calibration lifecycle verification (36 excluded configurations, 12 enabled configurations), 52 iPhone/iPad calibration layouts, eight recording layouts and focused lint passed. The iPad pushup preview was visually inspected. Device appearance over the real camera is for owner acceptance; browser renders do not prove native-device appearance.

The official Expo fingerprint generator returned `469f66ace28d0ea7661bb8681b0239739f8b3955`, exactly matching build 10. No native compatibility protection was bypassed. TypeScript also passed. Source commit and OTA publication details will be recorded after publication.

The existing production channel is shared with compatible older iOS installations. Updates are manual through Info -> Check for updates -> Update now. This is not a private channel for one tester. No Android update is intended. If the owner rejects the artwork, restore only these artwork changes on the current candidate or publish the build-10 baseline `6f62f4f0bb9da83939f8ba3c69870157adb9c481` as a newer compatible update; do not reset unrelated work or change native compatibility settings. The prior channel update was September group `ff026750-f9cf-45ef-bdf9-9ebb1fa82ec3` from `805c6c6` (test ads retained). Do not use that old channel update as the restoration target: it predates the current release fixes and live-ad configuration.
