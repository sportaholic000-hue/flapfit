# Owner requirements

- Get the owner's explicit approval before introducing or increasing any monetary cost. Explain the expected cost and usage first; if the impact is unknown, say so. This includes paid services, plan upgrades, backend usage, additional recurring requests, storage, and build services. Approval to fix a bug or deploy is not approval for added spending.
- Preserve unique leaderboard player names. The owner explicitly retained that fix when rejecting score attestation.
- Do not reintroduce the rejected App Attest leaderboard system or add a replacement anti-cheat service without the owner's explicit instruction and cost approval.
- New leaderboard results use one score submission after gameplay. Do not reintroduce pre-play server run tickets. Preserve RLS, verified-session ownership, normalized unique names, request-size limits and the single-step client/backend contract.

- Do not use subagents. The owner explicitly requires this work to be completed by the primary agent.

- Age and location questions, explanatory copy, saved-answer labels, status messages and errors must not reveal or hint which age/location answers enable or disable advertising. Use neutral factual questions and confirmations across every country. Preserve the approved advertising eligibility rules; do not add a general advertising opt-out. Verify both rendered copy and actual advertising decisions when changing these flows.

- Closing or backing out of unfinished age/location setup or its notice must not allow unlimited repeat runs. Use existing local completed-run history to check unfinished setup at new-game entry; preserve approved regional exceptions and independent optional reporting/Google choices. Do not treat dismissal as an answer or acknowledgement.

- Done must allow leaving a completed result even when setup is dismissed or fails. Retry, Next level and later game entry remain subject to unfinished setup. Preserve the existing eligible result-ad opportunity for Done; do not turn the exit fix into an advertising bypass.

- Google advertising privacy controls use the single **Manage Privacy Choices** row in Info and Google UMP’s native privacy-options form, with visibility based on the SDK requirement state. Do not reintroduce the rejected privacy-support email/request-ID/response-code/signing workflow. Preserve existing regional ad eligibility and keep saved residency labels factual, without advertising outcomes.

- Display the actual locally saved province/state name after a picker selection. Do not replace it with Quebec/non-Quebec or Connecticut/non-Connecticut categories. Legacy binary answers cannot reveal a previously discarded exact selection; retain their eligibility without inventing a province/state.
- Results appear before interstitial ads. A saved location correction must restart permitted SDK preparation and refresh an existing result ad reference. Preserve the existing ad frequency and immediate result-action behavior; do not add loading waits or change scheduling to repair location state.
