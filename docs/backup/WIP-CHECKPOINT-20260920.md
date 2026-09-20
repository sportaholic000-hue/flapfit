# Work-in-progress crash-protection checkpoint

This branch preserves the current project, including unfinished privacy work. It is not a tested release candidate and does not claim launch readiness. No implementation was reset, discarded or refactored for this backup.

Includes every current Git-visible app/backend/docs change, required source/assets and dependency patches, five original/recovery image assets, local development configuration, and full tracked source snapshots of both website checkouts. The newer website snapshot is identified by source commit 229fb8f5f8a00b2ce6147ccfd124f868670e3d97.

See wip-crash-protection-20260920.json for the explicit exclusions. Credentials, private signing files, dependencies and generated caches are not uploaded. The existing .easignore excludes archive/ snapshots from native app packaging. Tests were not a prerequisite for this backup.
