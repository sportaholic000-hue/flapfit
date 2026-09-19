# Friend challenge codes retired — September 17, 2026

Completed at the owner's request. Daily Challenge remains a separate local game mode. The launch app retains its top-50 bodyweight leaderboards, complete gameplay video sharing and existing result-action ad sequence.

- Removed create/find/share-code/comparison UI, client code requests, friend game mode, Duelist achievement and unused local counter/actions. Retired/unknown game-mode links redirect Home before gameplay or consent preparation.
- Preserved exact pre-removal working copies in archive/friend-challenges/2026-09-17, with 37 checksummed snapshots, a manifest and restoration notes. No archive modules are imported into the app. The entire archive is excluded from EAS uploads.
- Updated in-app help/terms copy and local store/reviewer/privacy/contest/testing drafts. The public website was not edited or published.
- Deployed flapfit-game version 7 to the existing project yhrleungvipsqlmayrfg, retaining JWT verification. Readback matches the reviewed local source. Code endpoints now return 410 before handler authentication/database work; new run tickets allow leaderboards only.
- Existing tables, account deletion and moderation remain. No user data was purged. Previously issued tickets retain their existing short expiry and finalization compatibility; new friend tickets cannot be created. Direct challenge RPC execution remains denied to both anon and authenticated roles.

Verification at completion of this change:

- Mobile Jest: 24 suites, 174 tests passed. TypeScript and strict oxlint passed.
- Real API: Terms 428, leaderboard read 200, verified run creation 201, finalize and exact retry 200, changed replay 409, implausible result 422, retired code create/read/attempt routes 410, retired run kind 400.
- The disposable online leaderboard profile named LaunchTest and its test records were deleted through /me (200). This profile was unrelated to local calibration, Form Test, or the user's saved progress.
- Archive hashes and EAS exclusions passed; pre-existing staged Git work was unchanged. Nine protected source files (Daily Challenge, recording/sharing, ad sequence and tracking) were byte-identical immediately after this removal.
- Local production-environment iOS and Android JavaScript exports passed with unchanged source fingerprints. iOS 3,723 modules / 106 assets; Android 3,817 modules / 110 assets. No native binary was compiled or uploaded. Artifacts:
  - ios: index-b50b5dd56f239e638d03d499cccb28d6.hbc; SHA-256 452c5966ad42f28221152dbdb0a3c2576a510e5d01dc67edb64643bca9ffcd6e; friend-code UI strings absent: true
  - android: index-393a438c3771c179dcad6c347b8a9ffa.hbc; SHA-256 489f7ad9b3c33bbf8053dc5a19722cf72dc7bb5dfbddab73c060fd20376dca3e; friend-code UI strings absent: true

Subsequent work is separate: the owner then reported a legitimate straight-leg pull-up rejected by Form Test. A new 2026-09-17.1 form-tracking candidate was applied after these exports completed; those exports do not certify that later tracker revision. The new candidate must pass its own checks and physical testing. Production tracker selection remains unchanged pending acceptance.
