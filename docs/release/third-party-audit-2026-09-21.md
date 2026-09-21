# Flap Fit source audit handoff — September 21, 2026

Status: source corrections and automated checks complete; independent audit must precede any new app build. No mobile build, binary upload, TestFlight upload, App Store submission, or production-account mutation was performed in this correction. The public website privacy update was published separately.

## Review scope and owner boundaries

- Keep the existing 13+ audience: known under-13 users remain blocked. Required Apple age/access controls remain separate.
- No Quebec, Connecticut, New York, Australian or Mexican regional gameplay bans. No one-game quota or gameplay gate tied to the advertising notice or optional regional answers.
- Both New York answers persist locally. Foreground/restart does not re-ask; Info provides manual Update. Previously unsaved legacy No answers cannot be recovered. Saved No is not a live travel/location check.
- Owner reaffirmed the approved release decision: disable advertising for Australia ages 13–14 and Mexico ages 13–17 while keeping local gameplay available. These advertising exclusions are accepted release scope, not unfinished monetization work or a reason to delay the source audit.
- Advertising is the business model. Eligible advertising remains enabled by default subject to the disclosed processing requirements. Reporting refusal does not disable separately permitted Google ads. A user's advertising-data withdrawal stops future ad requests and is not a paid remove-ads product.
- Camera is required for every game; recording and microphone permission are optional. Do not add payments, subscriptions, mandatory online competition, or new regional gameplay restrictions.
- Build and upload are expressly held for independent inspection. Do not treat passing source tests or this document as authorization to build or submit.

## Changes to inspect

The baseline for this task is `bb12be76639c4cfeb1a130767555979fd697f244` on `wip/crash-protection-20260920`. Inspect the final pushed commit, including its untracked-at-start new `regionalAdvertising.ts`, rather than an older binary.

1. `releaseEligibility.ts`, `gameEntry.ts`, `GameEligibilityGate.tsx`, `game.tsx`: separate gameplay from regional advertising and remove the first-run quota. Known under-13 and required Apple access gates remain. An admitted game is not interrupted by a background refresh.
2. `regionalAdvertising.ts`, `processingPolicy.ts`, `launchProcessingPolicy.ts`, `processingNotice.ts`, `postGamePrivacy.ts`: regional provider gates are independent of gameplay. Old saved grants cannot reopen a disabled regional provider. Existing purpose refusals are retained.
3. `newYorkClarification.ts`, `processingAccess.ts`, `PrivacyChoices.tsx`: durable Yes/No, migration of legacy Yes, no automatic No invalidation, clear saved status and manual Update, honest failed-write retry.
4. `PrivacyChoices.tsx`: a notice-based user can now select **Withdraw advertising data consent**, not just users whose earlier choice was an explicit grant. That right remains reachable after age/country evidence expires. The existing synchronous deny, persisted refusal and retry mechanism is reused. The disclosure explains that this stops new Google ad requests, not deletion of already received data or a global Google SDK shutdown.
5. `info.tsx`: **Report an inappropriate ad** opens an email draft addressed to the established support mailbox with optional advertiser/time/reason information. It does not auto-send, capture a screenshot, attach camera footage, or transmit the competition identity. Failure to open mail displays the support address.
6. Website privacy policy: provider-protection requirement, usable withdrawal instructions, inappropriate-ad reporting route, accurate required-camera description. Current source and live website are aligned. Superseded exclusion-based Apple review-note draft remains cancelled.

## Current four-country behavior

| Audience | Local gameplay | Advertising / ad-event reporting |
| --- | --- | --- |
| Canada outside Quebec, 13+ | Available | Eligible, subject to purpose/privacy checks |
| Quebec, 13+ | Available | Off |
| US, 18+, including CT and NY | Available | Eligible; no minor state questions |
| US, 13–17, Connecticut resident | Available | Off |
| Under 18 with established NY protection/history | Available | Off, including after leaving NY |
| US, 13–17, CT No and NY No | Available | Eligible |
| Australia, 15+ | Available | Eligible |
| Australia, 13–14 | Available | Off — owner-approved release decision |
| Mexico, 18+ | Available | Eligible |
| Mexico, 13–17 | Available | Off — owner-approved release decision |
| Known under 13 | Blocked by the retained minimum-age rule | Off |
| Missing optional answers, notice or country lookup | Available unless separately age/Apple-restricted | Affected providers paused |
| Required Apple check incomplete or app-access consent revoked | Next game blocked by the separate access gate | Off |

Eligible does not guarantee an impression. The first result exit is free; ads are attempted every second eligible Done/Retry/Next exit with at least 90 seconds between opened ads. No-fill continues the selected action. A saved NY-protection history can override a teenage eligible row. Ads and RevenueCat have separate choices. Compete has separate eligibility and is not included in this local-gameplay table.

**Approved advertising exclusions:** The owner reaffirmed on September 21, 2026 that Australia ages 13–14 and Mexico ages 13–17 should receive no advertising, in addition to the listed Quebec and CT/NY minor exclusions. The implemented advertising and ad-event reporting gates already enforce this decision, while local gameplay remains available for ages 13+. These AU/MX exclusions are resolved release decisions, not outstanding requirements to enable ads or add guardian consent. The existing implementation uses its parental-authority gates to enforce them; this does not establish a blanket legal or Apple prohibition on advertising to these audiences. No runtime change is required for this clarification. The independent audit and no-build hold remain in effect.

## Automated verification

- Full mobile Jest run: **67 suites / 1,392 tests passed**, zero failures. Focused privacy UI run: **41 tests passed**.
- TypeScript `tsc --noEmit`, strict Oxlint, production-profile release configuration, and source diff checks passed.
- Website validation: five routes, links, scripts/assets and public-site controls passed. Static archive validated by the Sites packaging helper: 41 files.
- Machine-readable evidence: `evidence/review-correction-checks-2026-09-21.json`. It records checks and hashes of the changed source inputs; no account secrets are included.
- Rendered withdrawal tests exercise default ad eligibility, refusal persistence through panel remount, explicit later re-allow, expired-age withdrawal access, and independently refused reporting. Older tests separately exercise storage restoration, provider invalidation, and lifecycle behavior. These are not physical-device or provider-receipt results.

## Browser observations — read-only

- Apple App Information: 13+ in the main displayed regions; Health & Fitness / Games / Action; standard license; not a regulated medical device. Existing authorization-notification URLs remain present.
- Apple App Privacy: twelve saved categories, matching the existing four-country worksheet; policy and privacy-choice URLs are `https://flapfitapp.com/privacy/`. Preview shows linked and unlinked data and no tracking section. A Publish button alone is not proof of publication state. No Apple answer or review instruction was edited.
- Prior same-day version inspection: 1.0 Prepare for Submission, no selected build, displayed 6.5-inch iPhone screenshot slot empty. Final screenshot sets, compiled-artifact reconciliation, privacy publication and owner-approved submission remain later work.
- AdMob Flap Fit iOS: matching app/publisher identifier; **Requires review**, no store details; verification currently **Not required**. The account warns of more than five months' inactivity and possible automatic deactivation after six months. No fake activity or live-ad test clicks were generated.
- AdMob Privacy & messaging: European regulations **1 active**, US state regulations **1 active**. US message **Flap Fit US Privacy** shows Published and two assigned apps. No ATT explainer was created.
- AdMob app-specific content rating: **Parental Guidance**, with **T and MA blocked**. This matches the source PG ceiling. Save and Cancel were disabled; no setting was changed.
- RevenueCat: Google AdMob integration **Connected**, matching publisher; existing read-only/report scopes. It is the only active integration listed; no new tracking/attribution integration was enabled. Empty ad charts are not evidence of successful event delivery.

## Remaining audit and release evidence

1. Review the full source diff, particularly privacy restoration, failed writes, stale asynchronous actions, no pre-consent ad initialization, cached-ad invalidation, game-entry checks, and native-dismissal sequencing.
2. Audit the existing patched Google/RevenueCat native paths and twelve-category privacy disclosures against the later exact compiled artifact. NPA/RDP and absence of ATT alone do not prove absence of cross-company tracking.
3. Validate the once-only NY declaration's limits and confirm that the approved AU/MX advertising exclusions prevent ad-provider processing while preserving local gameplay. Enabling advertising for these AU/MX ages or adding a guardian-consent route is outside the approved release scope. Local answers do not establish location continuously or settle every applicable legal question.
4. After separate build approval, test camera denial/recovery, normal Play vs Record & Play, optional microphone, sharing return, real ad close/info/report controls, withdrawal/background/relaunch, competition deletion/report/block, applicable Apple authorization, and network/IPv6 failure. No device result is claimed here.
5. Correlate genuine permitted installed-app ad events with RevenueCat receipt. AdMob payment/serving and RevenueCat receipt are distinct. The app must continue when either provider fails or has no fill.
6. Link the public App Store listing in AdMob when available; complete its readiness/seller-file requirements and legitimate inactivity follow-through. Google approval timing is separate from Apple review and cannot be guaranteed for the same afternoon.
7. Review and respond to inappropriate-ad reports, block offending creatives/advertisers where appropriate, and handle data-rights requests. The new report button does not automate moderation.
8. Confirm final screenshots, privacy-label publication and exact version/build attachment before the owner authorizes submission. There is no new build, upload or submission authorization in this handoff.

## Policy references and limits

- Apple 5.1.1: privacy-policy contents and accessible consent withdrawal; Apple 2.5.18: age-appropriate advertising and inappropriate-ad reporting. https://developer.apple.com/app-store/review/guidelines/
- Apple tracking definition: https://developer.apple.com/app-store/user-privacy-and-data-use/
- Apple age assurance: https://developer.apple.com/support/age-assurance/
- Provider safeguards reviewed: https://supabase.com/legal/dpa ; https://business.safety.google/adsprocessorterms/ ; https://www.revenuecat.com/dpa ; https://www.revenuecat.com/terms
- Australian consent capacity is contextual, not a universal under-15 advertising ban: https://www.oaic.gov.au/privacy/your-privacy-rights/more-privacy-rights/children-and-young-people
- AdMob inactivity: https://support.google.com/admob/answer/10491752

The public provider documents support the stated protection requirements and describe provider safeguards; this is not a representation that a bespoke contract was signed, an independent provider audit was completed, every possible creative was reviewed, or every regional legal obligation was certified. Automated checks establish source behavior, not guaranteed Apple approval or revenue.

## Website release

Privacy source commit `9137dd210a7f89e49c487f73e002e59799d9f4da`, website version **34**, was pushed and published successfully at `2026-09-21T17:22:09.262719+00:00`. Site `appgprj_6aa368d995348191b4206fa03f951b3a`; deployment `appgdep_6ab167bc2bd081918cb4e68b7bd75384`; version `appgprj_6aa368d995348191b4206fa03f951b3a~appgver_06c524807b848191b166edae57924d2d`. Production URL returned by Sites: https://flap-fit.sportaholic000.chatgpt.site . The public audience and existing custom domain are unchanged.

Website source copies of the changed privacy/terms pages are retained under `evidence/website-review-2026-09-21/` so an auditor of the app repository can read the exact text without needing access to the separate website repository. They are evidence copies, not a second deployment source.
