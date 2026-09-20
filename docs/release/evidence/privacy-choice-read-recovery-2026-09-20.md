# Privacy-choice read failure: corrected successor and verification

Reviewed base: `f9ff7cfb029242652d1e231dfe35ce8e313cf48c` on
`wip/crash-protection-20260920`. The correction and this evidence are committed together;
the containing commit is the corrected successor. The supplied **FlapFit Account Audit,
September 20** is review evidence, not authority to resume a build. No build, upload,
deployment, credential change, Apple edit or privacy publication was performed here.

## Finding and correction

**REPRODUCED AND FIXED.** Before changing production code, the new regression suite had
14 failures and 6 passing controls. In US, AU and MX, each rejected read, malformed JSON,
invalid non-null record and empty-string record caused the real monetization module to call
the RevenueCat configure stub once after adult/notice resolution. The unrelated competition
save replaced the stored reporting refusal with unset; failed-read recovery did not reread.
This is distinct from the earlier corrected unrelated-write-failure/delete-record issue.

The corrected behavior is:

- Only a genuinely absent (`null`) record is treated as first run. Failed/invalid non-null
  reads leave hydration incomplete, preserve stored bytes and keep affected processing closed.
- Shared choice and region saves first obtain a valid original record. A failed read rejects
  the save without any storage set/remove call; an unrelated retry merges its change with the
  original saved reporting refusal instead of defaults.
- Concurrent readers share an in-flight read; only successful hydration is cached. The real
  notice-restoration entry retries choices even when the separate notice is already restored.
- An immediate refusal remains effective while a read is pending/unavailable. When that read
  recovers, it overrides an older saved grant without erasing other saved choices. Existing
  per-purpose write sequencing and failed-write refusal protection remain intact.
- The existing Info privacy panel shows a failure-only **Retry loading privacy choices**
  action and truthful unavailable state. It remains reachable after a failed retry, hides
  Allow reporting while saved choices are unknown, and restores the saved refusal on success.
  Existing native-stop/save retry controls remain independent. No new consent interface,
  pre-game prompt, permission, collection or native configuration was introduced.

## Verification at the actual configuration boundary

`processingHydrationIntegration.test.ts` loads the real processing-access, notice,
launch-policy and monetization modules. Only storage, native Apple/provider interfaces and
SDK calls are test doubles. It neither contacts RevenueCat/Google nor proves physical behavior.

| Scenario | Corrected source result |
| --- | --- |
| Saved refusal, readable record, adult US/AU/MX, acknowledged notice | RC module load/configure 0; permitted Google initialize 1 |
| Read rejects / invalid JSON / invalid record / empty string, each country | Hydrated false; RC load/configure 0; Google initialize 0; no write/remove; saved bytes unchanged |
| Unrelated competition grant and region save during those failures | Both reject; saved reporting refusal cannot be replaced |
| Storage recovers, real notice retry, subsequent competition save, restart | New choices read; reporting refusal restored and saved; RC load/configure 0 before and after restart; separately permitted Google initialize 1 |
| Unrelated save is itself the first action after storage recovery | Original reporting refusal read before merging/saving the competition choice; RC configure 0, Google initialize 1 |
| New refusal during unreadable storage, then an older stored grant is recovered | Refusal stays effective; no RC configure; permitted Google ads recover; explicit refusal retry saves |
| Truly empty first run | Hydrates normally; neither SDK initializes before notice; after the reviewed notice route both initialize for eligible adults |
| Rendered Info retry fails, then succeeds | Retry remains reachable on failure; no Allow reporting while unknown; successful recovery shows refusal and preserves independently allowed ads |
| Late read versus immediate refusal / region selection | No write before original read; current refusal/selected region wins; unrelated stored refusal remains |

All **60 suites / 1,154 tests pass**, with no pending tests. Focused run: **4 suites /
120 tests pass**, including the new 20-case configuration suite, rendered retry and existing
refusal/write/native-stop/launch regressions. TypeScript, strict applicable lint and production
release validation (including collected-data and required-reason checks) pass. Tests were not
removed and dependencies/assertions were not weakened. The old unreadable-storage assertion
was corrected from hydrated=true to false and extended with a real recovery read. Existing
late-read tests now await the safe read-before-write ordering and retain/add final-state checks.

Machine-readable check results, behavioral test names and exact source-file hashes are in
`privacy-choice-read-recovery-checks-2026-09-20.json`. The actual local EAS archive and its
inside-package validator result are in `privacy-choice-read-recovery-package-2026-09-20.json`.
All **285 required runtime/model/asset/patch/config/validator inputs** in the **769-file** package match the verified checkout.
Credential/signing, backup/web and dependency/cache exclusions are checked. This is local
packaging inspection, not a native build or upload.

## Authenticated RevenueCat feature access

On September 20, the existing signed-in **Flap Fit** project `a58d3dbd` opened both
[Ad Revenue](https://app.revenuecat.com/projects/a58d3dbd/charts/ad_revenue_v3) and
[Impressions](https://app.revenuecat.com/projects/a58d3dbd/charts/ad_impressions_v3).
Their chart headings and Summary panels rendered; **Charts v3** was checked. On these
v3-only charts the switch is disabled/checked, not an access-denied feature. No Request
Access, upgrade or permission gate appeared. **Ads chart/feature access is confirmed.**
No account setting was changed. Empty/zero charts do not establish ad-event receipt.
This checks the access distinction in [RevenueCat's ad-chart documentation](https://www.revenuecat.com/docs/dashboard-and-metrics/charts/ads).

The supplied audit's newer saved/reloaded **PG** AdMob ceiling and Apple reviewer-note
additions supersede older console descriptions; they were not reverted or repeated. Existing
matching public SDK keys, valid app credentials, AdMob connection, impression-level revenue
On and Published European/US messages remain evidenced and were not reopened as missing.

## Conflicting checklist instructions reconciled

- `submission-gates.md` now describes current completed configuration and actual remaining
  artifact/device/provider/Apple actions. Historical calibration failures, unavailable credentials,
  draft-only consent messages, no-ad website copy and seller-file 404 are no longer current tasks.
- `consolidated-device-acceptance-2026-09-20.md` identifies the existing artifact's source
  limitations, completed credentials, optional TestFlight route and the one-iPad-then-one-iPhone
  sequence. Calibration remains accepted. The Xcode Organizer PDF is **not generated/deferred**;
  actual final-artifact manifests/reasons/permissions/flows/App Privacy checks remain mandatory.
- `shipaton-submission.md` now requires a separate **exact 1179 × 2556** frameless contest
  screenshot. A 1320 × 2868 Apple image does not satisfy that size. This matches the
  [official contest rules](https://revenuecat-shipaton-2026.devpost.com/rules); contest media
  remains separately deferred and is not permission to build or reopen gameplay work.

## Still distinct and open

1. A newly authorized, corrected signed artifact and its native/privacy/configuration inspection.
   Existing device artifact `04cf2e97` / source `f4b191d` lacks both later competition wiring and
   this read-recovery correction. It is not final acceptance.
2. The consolidated iPad acceptance and essentially finished iPhone pass, including real native
   dismissal, full recipient video/audio and independent reporting withdrawal/relaunch.
3. Genuine RevenueCat event receipt and actual Apple authorization/rescission/production delivery
   follow-through. Source tests and feature access cannot substitute for these.
4. Genuine Apple screenshots, authoritative App Privacy publication verification after artifact
   reconciliation, an authorized Store upload/processing/selected build, actual compliance prompts,
   and owner-approved review submission. Existing listing/contacts/Content Rights/13+/non-medical/
   free four-country availability/release settings remain complete and unchanged.
5. Public-listing-dependent AdMob linkage/readiness/any seller-file verification and legitimate
   serving follow-through on the inactivity warning. No fake events or live-ad test clicks.

These are not unfinished privacy-read implementation. No build or device acceptance is claimed.
