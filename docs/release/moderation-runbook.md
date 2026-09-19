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
