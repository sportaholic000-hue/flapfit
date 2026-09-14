# Flap Fit competition moderation runbook

This operational control is required before enabling Compete in production. Code-level report and
block buttons do not replace active moderation.

## Ownership

- Primary moderator: [REQUIRED: name]
- Backup moderator: [REQUIRED: name]
- Monitored inbox: [REQUIRED: public support email]
- Routine report target: acknowledge within 24 hours and decide within 72 hours.
- Credible threat, exploitation, or illegal-content target: review immediately and escalate under
  the applicable law and platform policy.

## Review procedure

1. Review pending `content_reports` in oldest-first order at least once each business day.
2. Verify the referenced leaderboard or challenge-attempt row and the reported player profile.
3. Classify the report as dismissed, reviewed, or actioned, and record a concise internal reason.
4. For a violating player name, replace or remove the public profile and associated public results.
5. For cheating or score manipulation, remove the result and restrict online access when warranted.
6. Preserve only the minimum evidence needed for safety, repeat-abuse, or legal obligations.
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
