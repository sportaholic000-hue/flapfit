# Flap Fit audit reconciliation - September 15, 2026

This document reconciles the source audit pinned to commit `70c43b4` with the hardened pre-test
candidate beginning at `c0a20e8`. It distinguishes implemented corrections from work that still
requires physical or signed-build evidence. It is not a guarantee of store approval.

## Finding dispositions

| Audit finding                                                                        | Current disposition                                                                                                                                                                                                                                                                           | Remaining evidence or action                                                                                                                                                                  |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R01: ad-free release/contest mismatch                                                | Deliberately deferred until the current gameplay candidate passes the morning Expo test. The checklist now records the approved post-result placement, no-health-data targeting rule, consent, failure isolation, and RevenueCat requirement.                                                 | Add the approved ad and RevenueCat dependencies only after approval, then retest in signed builds and update both stores' declarations from the exact binary.                                 |
| R02: server accepted a claimed score without a completed run                         | Corrected. Eligible submissions now require a server-issued run, rules version, server timing, one-time finalization, authenticated owner, supported context, and plausibility checks. Legacy claimed-score endpoints return 410.                                                             | Repeat finalization and replay checks against the release backend from the signed candidates. Client compromise cannot prove physical form perfectly and must not be described as impossible. |
| R03: one grounded foot could pass pull-up checks                                     | Corrected in Form Test. Left and right feet are evaluated separately, and missing supporting-foot evidence cannot be hidden by averaging. Tests cover one-foot-down and hidden-foot cases.                                                                                                    | Physically approve genuine bent-knee pull-ups, one-foot support, camera distance, and brief occlusion on Android, iPhone, and iPad before promoting Form Test.                                |
| R04: wrist occlusion was treated as bar release                                      | Corrected in Form Test. Brief missing wrist evidence pauses with a neutral tracking message; sustained missing evidence ends an unverifiable run. Visible movement away from the calibrated bar remains a release.                                                                            | Physically test real release, brief occlusion, and safe reacquisition.                                                                                                                        |
| R05: experimental checks were not enabled in production and Next Level lost the mode | Partly corrected. Next Level now preserves Form Test during development. Production still intentionally uses the original tracker until physical approval.                                                                                                                                    | This is a hard release gate: promote the approved tracker, remove or hide the development comparison control, then rebuild and retest the signed candidate.                                   |
| R06: failed online submissions were discarded                                        | Corrected. A bounded persistent outbox retries eligible results, removes expired/permanently invalid entries, preserves retryable failures, and clears after online identity deletion. Requests have a timeout.                                                                               | Test game-over while offline, reconnect, exact-once appearance, and deletion with queued data.                                                                                                |
| R07: avoidable writes and broad abuse surface                                        | Materially hardened. Per-user run creation limits are 30 per 10 minutes and 500 per day; challenge creation is atomic and limited to 10 per day; result finalization is one-time and idempotent. Reads remain viewer-specific and uncached so blocks and `is_me` are not leaked across users. | Observe real launch traffic and cost before adding shared ranking caches or changing retention. Supabase Pro remains recommended for production backups and availability.                     |
| R08: client accepted names the server rejected                                       | Corrected. Client and server share the same normalization/validation contract; one-character, overlength, unsupported-character, and moderated names fail before publication.                                                                                                                 | Test valid persistence and representative rejected names on two devices.                                                                                                                      |
| R09: blocking renumbered a filtered list as global rank                              | Corrected. The service calculates global rank before viewer-specific filtering, and the client displays that rank.                                                                                                                                                                            | Test report/block and confirm surviving rows retain their original global rank.                                                                                                               |
| R10: recording, permissions, privacy, and release docs disagreed                     | Corrected for the current pre-monetization candidate. Camera plus optional microphone, local temporary recording, voice/audio sharing, Supabase competition data, retention, deletion, and current Free-plan limitations are aligned in source-controlled drafts.                             | Publish and verify the final HTTPS pages, then recheck all declarations after ads and RevenueCat are present.                                                                                 |

## Additional observations

- Camera and microphone tracks now stop at game end; the pose loop terminates, landmarker resources
  close, video sources clear, and temporary object URLs are revoked on end or page exit.
- The game WebView now allows only the expected local HTTPS and blob navigation paths, disables
  mixed content, and no longer uses a wildcard navigation policy.
- Missing Terms acceptance, invalid input, oversized bodies, replays, expired runs, and implausible
  results return purposeful HTTP statuses instead of a generic server failure.
- Live Supabase migrations, RLS, service-only score writes, retention jobs, Edge Function version 3,
  and the verification suite were exercised against the dedicated Flap Fit project. Test rows were
  removed afterward.
- Production-style iOS and Android Expo exports included all six exercises, 60 evolution sprites,
  the pose model, and both WASM runtimes. Signed offline/native testing is still required.

## Remaining release blockers

1. Complete the physical matrix in `physical-test-matrix.md`, especially Form Test calibration and
   anti-cheat behavior for all six exercises.
2. Promote the approved tracker to production and rerun automated, export, and physical checks.
3. Integrate and test the approved ad/RevenueCat design with consent and purchase restoration.
4. Publish and verify the support, Privacy, Terms, deletion, and marketing pages at the final domain.
5. Build and test the exact signed TestFlight and Play internal candidates.
6. Capture genuine screenshots from those approved candidates and complete the current store forms.
7. Supply the private Apple review phone number and complete store-account agreements/compliance.
