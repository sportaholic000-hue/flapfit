# Friend challenge codes removed from launch

Friend-code creation, joining, comparisons, requests, game mode, local win counter and Duelist achievement are removed. Retired or malformed game-mode links return Home before gameplay mounts.

Daily Challenge, its completion history and Daily Grinder achievement remain. The three bodyweight leaderboards retain 50 entries each. Existing gameplay video sharing is unchanged by this commit.

The live competition backend was already deployed as version 7 and verified: retired code creation, lookup and attempts return HTTP 410; new friend run tickets return HTTP 400; verified leaderboard runs still work. Historical records and migrations remain for retention, moderation and account deletion; no user data is purged.

The implementation is preserved in 37 checksummed pre-removal snapshots under archive/friend-challenges/2026-09-17. The archive is excluded from EAS uploads and has no app imports. It includes historical uncommitted work for recovery, not active launch code.

This commit isolates completed friend-code retirement and the approved top-50 leaderboards from the ongoing local pull-up, recording and monetization changes. It does not approve pull-up tracking, create a native build, or submit to a store. Validation evidence for this exact isolated tree is recorded after checks complete.

Validation of the isolated commit: 16 Jest suites / 86 tests passed; TypeScript and strict lint passed. All 37 archive hashes match. Protected gameplay, recording and Daily Challenge sources match the base revision. The existing staged patch is preserved.
