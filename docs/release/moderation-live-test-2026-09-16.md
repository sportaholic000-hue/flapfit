# Live moderation check — 2026-09-16

Production project: `yhrleungvipsqlmayrfg`. Two temporary anonymous accounts were used.

- A verified push-up score was accepted; an invalid player name was rejected with HTTP 400.
- B opened A's challenge through its six-character code.
- B reported A's leaderboard result (HTTP 201), then blocked A (HTTP 201).
- A's result and challenge disappeared for B. Other visible global ranks stayed unchanged.
- A could still open their own challenge. Both temporary accounts were deleted through `/me` (HTTP 200).
- Post-test SQL showed zero `FFReviewA`/`FFReviewB` profiles and zero surviving test score rows.
- The retained report has both player identifiers null, as required by the deletion policy.

Test report ID: `6bf9e3d4-452f-4a03-87ca-3221e42780a3`.
Test score/context ID: `ef3409ae-cc16-419d-99bc-6cf3509e4888`.

Operational follow-up: the report is still `pending`. The connected SQL tool rejected the
status update because its transaction is read-only, and both available browser-control helpers
failed before opening the dashboard. A moderator should mark only this report `dismissed` and
confirm `resolved_at` is set. Reason: self-created temporary release test, no violation.

Support inbox send/reply and physical in-app report/block presentation remain unverified.
