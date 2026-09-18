# Friend challenge codes — archived September 17, 2026

Removed from the launch app at the owner's request. Daily Challenge is a separate local mode and remains available. Global leaderboards and complete gameplay video sharing remain active.

The snapshot directory preserves exact pre-removal working files, including uncommitted exercise-binding fixes. The manifest records SHA-256 hashes and the base Git commit. Files use a .snapshot suffix so they cannot be discovered as routes, modules or tests; the entire archive is excluded from EAS uploads.

Preserved: code creation/lookup/sharing/results UI; exercise and input helpers and tests; game integration; achievements and local counters; competition API; backend implementation and migration context; live verification script. Shared files also contain unrelated code: never restore game.tsx or the whole snapshot over newer work. Extract only the feature if it is reconsidered.

Launch behavior: no create/join/compare UI, friend-code requests, friend game mode, or Duelist achievement. Unknown/retired game modes return Home. Daily Challenge generation, completion and Daily Grinder achievement remain. Existing local training history is retained. Public code routes return HTTP 410; new server run creation accepts leaderboards only. Already-issued short-lived verified run tickets may finish through the existing finalizer, so old queued results are not silently lost; no new friend tickets can be issued. Historical tables and migrations stay in place for retention, moderation and account deletion, with no database purge.

Before restoring: require an actual completed creator run if targets are represented as proof; implement reliable issuer/recipient result refresh; decide expiry, cost and moderation requirements; port changes into the current source; restore/update tests; re-review API and schema. The previous manual target was not proof of an achieved result.
