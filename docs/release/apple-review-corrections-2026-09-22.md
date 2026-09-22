# Apple review corrections — September 22, 2026

Follow-up to the [readiness audit](apple-readiness-2026-09-22.md), starting from `7919aa8`. The owner authorized the corrections and explicitly retained ordinary advertising. No subagents, cloud build, submission, provider configuration change or new paid service was used.

## Applied corrections

- App privacy status now says “Review your setup below” instead of declaring gameplay available without checking unfinished setup. The shared older-system message points to Info and accurately preserves local progress, including when shown in Compete.
- The public privacy policy and terms now describe unfinished age/location setup and notice acknowledgement before a repeat run. They retain required camera access, optional microphone access and separate provider/reporting choices. No list of advertising-exempt regions/ages was added.
- Privacy/deletion pages identify old run-verification records as legacy. Current one-step leaderboard submissions do not create those records or send active-run duration.
- Apple reviewer Notes were saved and independently reread after a page reload. Only the setup/repeat-game explanation and older-system age fallback were changed (3,558 characters total). Camera/calibration, recording, leaderboard/deletion, support, safety and ad-cadence instructions were preserved. No build was submitted or attached.
- Info > Privacy requests provides the scoped completion mechanism from the earlier withdrawal assessment. Contact opens a user-controlled email draft with a random local request ID. It does not change advertising. Only an operator-signed, unexpired response for that device can invoke the existing durable Google-processing refusal, after the user confirms its scope. This is separate from age/location answers and does not change other users' advertising.

The support path is an implemented mechanism, not an automatic determination that every request is valid, a promise of provider deletion or a blanket Apple/legal approval. The requester must restart after a saved refusal to terminate any existing Google SDK session. Prior provider records need separate handling. Physical-device confirmation remains necessary. The [operator procedure](moderation-runbook.md#device-specific-privacy-response--september-22) covers scope, signing, failed saves, restart and private-key custody.

## Monetization and cost boundaries

Regional eligibility, under-13 exclusion, required Apple checks, setup-dismissal protection, ad cadence, UMP behavior, independent reporting, purchases and leaderboard/backend logic are unchanged. There is no general ads-off button, no regional ad-outcome hint and no automatic refusal triggered by contacting support. Existing refusal restoration and explicit re-allow behavior remain.

The only dependency additions are pinned MIT-licensed `@noble/ed25519` and `@noble/hashes` for local verification. The already-installed `expo-modules-core` 57.0.18 is now explicitly declared for its native UUID generator; its version did not change. No native plugin/service was added. There are no new backend requests, per-run calls, recurring cloud storage, subscriptions or billing changes. The signing key is local outside Git/build inputs; only its public key ships.

## Verification

- Full mobile run plus reruns of affected suites after updating stale copy expectations: **71 suites, 1,530 tests passed, zero remaining failures or pending tests**. This is an aggregate of the latest result per suite, not a claim that the first run had no failures. The first run identified outdated expected copy in two component suites. Their updated tests still assert actual regional ad decisions, answer persistence and absence of advertising hints/general opt-out controls.
- New service/UI tests exercise real Ed25519 signatures, wrong signer/scope/device, tampering, expiry, unchanged choices on contact, independent reporting/competition, durable refusal after restart, later affirmative choice (including a newer intent with a save still pending), invalid/corrupt storage, failed-save retry and explicit response confirmation.
- The actual offline operator key was tested against the production public verifier without printing/sending either the private key or generated test response. A response for another request ID was rejected.
- TypeScript, strict Oxlint, production release configuration and Git whitespace checks passed. Recursive security-only dependency audit passed with **zero advisories** after the dependency additions.
- Local Expo iOS export and Hermes bytecode compilation passed, including the new verification code and bundled tracker assets. This is local JavaScript validation, not a signed native build or physical-device result.
- Site validation passed for five routes, links, scripts, assets and policy consistency.

Detailed test provenance and deployment IDs are in [the evidence](evidence/apple-review-corrections-2026-09-22/checks.json). Full local test outputs and the export are retained in the task workspace's `work/apple-review-corrections` directory.

## Published site

Sites source `52375219e347e5f93fb14f587a35599a536e7160`, version **38**, deployment `appgdep_6ab3044fe7a881919c41c3ba1e3c53c5`: **succeeded**, preserving the public audience. Native returned URL: https://flap-fit.sportaholic000.chatgpt.site. Existing app links use https://flapfitapp.com.

The official workflow completed the source push but its Bash packager failed on a Windows path. Packaging then used the same bundled static preparer and Windows tar in a fresh, explicitly bounded task staging directory. The native save accepted the exact pushed commit and archive before deployment. No site content changed during that workaround. No homepage, visual design, ad-exemption list or provider/account settings were changed.

## Remaining approval and device boundary

App Store Connect still holds the twelve reviewed privacy categories. Its final Publish dialog says that publishing agrees the responses are accurate, comply with the guidelines and applicable law, and will be kept updated. The owner's confirmation was requested for this legal statement; the final button has not been clicked. The existence of that button/dialog alone is not used to claim the prior responses were unpublished.

Source corrections are not in the already-installed `f0cf64c3-04c1-43fe-97d9-44f409e2f809` ad-hoc build. Continue the iPad/iPhone testing already underway; the final native candidate must include the approved source and production configuration. Confirm the support mail/paste/restart path and native SDK behavior on that candidate. The previously documented AdMob store-link/readiness step remains a launch step. No Apple approval or guaranteed ad fill is claimed.
