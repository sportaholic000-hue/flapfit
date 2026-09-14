# Flap Fit store assets

Keep genuine final-build captures here so GitHub backs up the launch materials. This directory is
excluded from EAS uploads because store-listing media is not part of the app binary.

Required paths:

- `app-store/iphone-6.9/`: 1 to 10 genuine App Store screenshots at an accepted 6.9-inch size.
- `google-play/icon-512.png`: 512 x 512, 32-bit RGBA PNG, at most 1 MB.
- `google-play/feature-graphic-1024x500.png`: 1024 x 500, 24-bit RGB PNG, no alpha.
- `google-play/phone/`: 4 to 8 genuine phone screenshots, preferably 1080 x 1920 portrait, no
  alpha, at most 8 MB each.

Run:

```powershell
corepack yarn workspace mobile release:assets
```

Capture screenshots from the exact production candidate. Show real app/game screens, keep overlays
truthful and small, remove personal notifications from the status bar, and use only fictional
competition identities. Do not use store badges, rankings, awards, prices, calls to action, or
fabricated live-usage claims.

Suggested first four screens:

1. Exercise selection with the six muscular exercise birds.
2. Live Camera gameplay with the player, bird, pipes, and score.
3. Bird evolution with early, middle, and Legend stages.
4. Sky gameplay or the Compete leaderboard with Report / Block visible.

Add concise alt text for every asset in the store consoles. Keep each description under 140
characters and describe the visible feature rather than starting with “image of” or “photo of.”
