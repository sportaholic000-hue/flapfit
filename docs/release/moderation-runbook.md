# Flap Fit competition moderation runbook

This operational control is required before enabling Compete in production. Code-level report and
block buttons do not replace active moderation.

## Ownership

- Primary moderator: Flap Fit operator.
- Backup moderator: Flap Fit operator until another trusted moderator is designated.
- Monitored inbox: support@flapfitapp.com.
- Routine report target: acknowledge within 24 hours and decide within 72 hours.
- Credible threat, exploitation, child-safety, imminent-harm, or illegal-content target: review as
  soon as practical and target initial action within 24 hours.

## Review procedure

1. Review pending `content_reports` in oldest-first order at least once each business day.
2. Verify the referenced leaderboard, challenge, or challenge-attempt row, relevant server run
   metadata, and the reported player profile. Do not request camera images or workout recordings.
3. Classify the report as dismissed, reviewed, or actioned, and record a concise internal reason.
4. For a violating player name, replace or remove the public profile and associated public results.
5. For cheating or score manipulation, remove the result and restrict online access when warranted.
6. Preserve only the minimum evidence needed for safety, repeat abuse, or legal obligations.
7. Reply through the support channel when a reporter supplied a reachable address. The app itself
   does not collect an email address.

Changing a report from `pending` to `reviewed`, `actioned`, or `dismissed` automatically records its
resolution time. The daily retention job removes resolved reports after 180 days. Account deletion
nulls the deleted party's identifier without erasing still-needed moderation evidence. Never copy
player identifiers into free-text notes.

## Escalation

- Credible imminent harm: contact local emergency services or the legally appropriate authority.
- Child-safety concern: preserve minimum necessary evidence, restrict access, and follow mandatory
  reporting requirements for the operator's jurisdiction.
- Repeated evasion or automated abuse: revoke affected anonymous users, tighten Auth/API limits, and
  review CAPTCHA or other abuse controls before reopening access.
- Service or data incident: disable Compete if needed, preserve logs, assess notification duties, and
  document the incident and resolution.

## Launch evidence

Before submission, save screenshots or a short test record showing Terms acceptance, a rejected
unsafe name, report submission, immediate local block behavior, moderation queue visibility, content
removal, and full online-profile deletion. Test the published support and deletion pages from a
signed-out browser.

Use two clearly temporary player names such as `FFReviewA` and `FFReviewB` for the release test.
Have A complete an eligible Endless run and locate A's result on B's exercise leaderboard.
From B, submit one report against A's leaderboard result and block A. Confirm the report appears in the moderator queue and the blocked content disappears
without changing surviving global ranks. Mark the test report `dismissed`, record the resolution
evidence, then delete both temporary online profiles from the app. Confirm their public competition
rows are gone; retain only the minimized resolved test report under the normal 180-day policy.

## Remote deletion ownership check (September 18, 2026)

The Info support ID equals the public leaderboard profile_id. It is a lookup reference only.
Never delete or disclose data on the strength of that ID, a name, a score or a screenshot.
Verification uses the authenticated DELETE /me action from the original app installation; guide
the requester to Info > Delete online profile. Never ask users to send auth tokens or sensitive
identity/workout documents. If the original anonymous session is lost, explain that ownership
cannot currently be established from public details and escalate the request; do not improvise
an administrative deletion. The website deletion-page draft describes this limitation explicitly.


## Support and separate advertising-data requests

Use support@flapfitapp.com for requests. First identify the requested action:
competition profile removal, stopping future reporting/ads processing, or access
to/deletion of provider-held records. These are different operations. Record only
the minimum request/status information needed; avoid copying fitness records,
recordings, credentials or public player IDs into free-text case notes.

- Competition: guide the original installation to Info > Delete online profile.
  The authenticated /me route is the ownership check. Local training progress
  remains; retained minimized safety/legal records follow their stated retention.
  A public support ID, player name, score or screenshot proves no ownership.
- Lost original session: explain that public details cannot establish control of
  the anonymous account. Escalate the rights request for a verified route; do not
  invent an admin deletion or request passwords, JWTs or identity documents.
- Future RevenueCat reporting: Info > Privacy & choices > Stop reporting. If the
  app says saving or native stopping is unconfirmed, use Retry stopping reporting.
  Do not tell the person to allow reporting first. Independently permitted ads
  remain separate. This cannot retract information already sent.
- Provider records: online-profile deletion does not delete Google/RevenueCat
  records. Direct Google requests to its privacy controls and request process
  linked from the policy. For RevenueCat, verify the actual app-scoped customer
  identifier and permitted requester-control route before any provider deletion.
  A competition profile ID does not identify the separate RevenueCat account.
  Never promise provider deletion, receipt or completion without its readback.
  If control cannot yet be verified, acknowledge/escalate and record the pending
  action without deleting a guessed record.
- Reply with the actions actually confirmed, any retained categories and reason,
  and outstanding provider steps. Do not call withdrawal, transport cancellation
  and server-record deletion interchangeable. Do not send messages automatically;
  outbound support communication requires the owner's authorization.

## September 20 temporary moderation follow-up

Readback of the exact September 16 test report confirmed both test-account IDs
remain null, status pending and resolved_at null. A guarded update targeting only
that report and its known test context was rejected with PostgreSQL 25006
(read-only transaction), so no row changed. The dashboard requires sign-in.
The row remains open until an authorized write and independent readback confirm
dismissed and a resolution timestamp. No customer complaint or player account
was modified, and no deletion was attempted. See moderation-live-test-2026-09-16.md
for the exact historical test identifiers.


### September 20 test-report closure

The previously pending FFReview release test report was dismissed, not deleted.
Exact guarded update returned one row; independent database readback confirms
`dismissed`, resolved at `2026-09-20 07:30:54.336501+00`, both deleted account links
null. Full identifiers and guard evidence are recorded in
`evidence/regional-production-closure-2026-09-20.md`. Existing retention applies.


## Specific advertising withdrawal handling — September 21 review

Use the completed [assessment](privacy-withdrawal-assessment-2026-09-21.md) to distinguish an actual applicable Google processing-withdrawal request from targeting preferences, RevenueCat reporting, historical deletion and commercial ad removal. The September 22 source adds a device-specific support response route described below. Installed older builds do not have it. Do not report completion merely because support received a request, prescribe online-profile deletion, change the user's region, or promise that NPA/RDP stops all collection. Existing reporting/Google-form/saved-refusal procedures remain effective in their own scope. Do not send support correspondence or modify provider records without the owner's authorization.

## Device-specific privacy response — September 22

This is an offline completion mechanism for a valid request requiring Google processing withdrawal when its form is unavailable. It is not a commercial ad-removal offer, an automatic response to all email, or a new eligibility rule. Handle applicable rights promptly; do not impose identity-document requirements or arbitrary barriers. The request ID proves neither an online-account identity nor ownership of historical Google/RevenueCat records.

1. Direct the requester to Info > Privacy requests > Contact privacy support. The app saves a random request ID locally and opens an email draft. It sends no age, location, workouts, competition ID or credentials. The user sends the draft themselves. Creating the request changes no processing choice.
2. Establish the actual request scope. Use Google's existing privacy form when it fulfills the request. If the request instead requires withdrawing Google processing that this integration cannot separate, issue a signed response for the supplied device request ID. Reporting-only withdrawal uses the existing reporting control; historical deletion requires separate provider procedures.
3. From `apps/mobile`, run `node scripts/privacy-support-response.cjs --scope google-processing-withdrawal --request <request-id> --key <private-key-path>`. The default expiry is seven days; `--days` accepts 1–30. The tool refuses a key that does not match the app. It does not send the response or contact any service. Send the resulting response in the authorized support reply and explain its exact scope.
4. The requester pastes the response in Info > Privacy requests and explicitly confirms Apply response. The app checks the signature, scope, device request and expiry locally before invoking the existing durable advertising refusal. Another device cannot reuse the response; a newer affirmative advertising choice invalidates it. An invalid response does not change any setting. A failed save is shown as unconfirmed and can be retried.
5. After the saved confirmation, the requester must close and reopen Flap Fit to end any already-initialized Google SDK session. The saved refusal prevents new ad work immediately and prevents Google initialization on subsequent startup. Do not equate this with a global native SDK shutdown or deletion of historical records. Confirm restart and the requested provider actions before describing the whole request as complete.

The signing key is local at `C:/Users/money/Projects/flapfit-private/privacy-response-key.pem`, restricted to the owner Windows account and SYSTEM. It is outside the repository and build inputs; never paste it into email, Git, task logs or a provider dashboard. Only the public key ships. The owner must retain a secure private backup outside Git; losing the key requires a new app verification key/build. No automatic key backup or third-party storage was configured. Response verification uses pinned MIT-licensed JavaScript libraries and the existing Expo UUID generator. There are no new services, per-game calls, backend requests, recurring storage or billing changes.

Source tests cover signature tampering, wrong scope/device, expiry, saved refusals after restart, changed choices, failed storage, and separation from reporting/competition. Physical-device mail/paste/restart and native traffic remain release-candidate checks. Passing source tests is not an Apple approval or legal certification.
