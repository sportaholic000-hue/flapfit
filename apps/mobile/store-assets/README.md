# Flap Fit store assets

Keep genuine final-build captures here so GitHub backs up the launch materials. This directory is
excluded from EAS uploads because store-listing media is not part of the app binary.

Required paths:

- `app-store/iphone-6.9/`: eight genuine App Store screenshots at 1320 x 2868.
- `google-play/icon-512.png`: 512 x 512, 32-bit RGBA PNG, at most 1 MB.
- `google-play/feature-graphic-1024x500.png`: 1024 x 500, 24-bit RGB PNG, no alpha.
- `google-play/phone/`: eight matching genuine phone screenshots at 1440 x 2560, named in the same
  sequence, with no alpha and at most 8 MB each.

Use these filenames in both screenshot folders: `01-home.png`, `02-exercises.png`,
`03-sky-gameplay.png`, `04-live-camera.png`, `05-evolution.png`, `06-stats.png`,
`07-compete.png`, and `08-record-share.png`.

Run:

```powershell
corepack yarn workspace mobile release:assets
```

Capture screenshots from the exact production candidate. Show real app/game screens, keep overlays
truthful and small, remove personal notifications from the status bar, and use only fictional
competition identities. Do not use store badges, rankings, awards, prices, calls to action, or
fabricated live-usage claims.

Use the exact eight-screen order, capture requirements, headlines, and art direction in
[`docs/release/store-screenshot-production-plan.md`](../../../docs/release/store-screenshot-production-plan.md).
Do not substitute a different scene order between Apple and Google.

Add concise alt text for every asset in the store consoles. Keep each description under 140
characters and describe the visible feature rather than starting with “image of” or “photo of.”
