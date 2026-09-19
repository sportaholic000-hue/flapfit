# Flap Fit age and processing policy — proposal, September 19, 2026

## Owner scope and status

The owner reaffirmed the 13+ audience. Canada and the USA, especially the USA, are priority 1. This is not approval to exclude other countries, select worldwide availability, or make all minors/unknown-age users permanently ad-free. The final list selected in App Store Connect could not be read: browser control timed out before providing a page state. No territories were changed. Prior release documents recorded CA/US as a proposed minimum, not a completed decision.

This document proposes independent permission handling; it is not a deployed policy or a certification of all countries' requirements. No gameplay, calibration, recording, sharing or result-ad placement was changed. The current native compile is a simulator verification build, not a production release. Do not release the current SDK initialization path as age-cleared.

## Direct answer and current implementation

Eligible teenagers can receive appropriately restricted AdMob ads with RevenueCat completely uninitialized. Neither SDK requires the other to initialize. RevenueCat is not categorically prohibited for teen end users: its website's minors provision is not an SDK-wide age limit. Processing still needs its own lawful basis and any required consent under the developer's responsibilities. [RevenueCat privacy policy](https://www.revenuecat.com/privacy), [RevenueCat DPA](https://www.revenuecat.com/dpa).

Current source findings:

- `apps/mobile/src/services/monetization/index.ts`: both successful UMP initialization paths call RevenueCat configuration before Google Mobile Ads initialization. `track()` already does nothing when the RevenueCat tracker is absent. This makes separation small and feasible, but it is not yet implemented.
- Google requests use NPA and PG filtering; neither initialization path sets age treatment. UMP currently receives no age parameter.
- RevenueCat disables automatic device identifier collection and diagnostics, but creates its own pseudonymous identity and receives ad events. This is not proof of zero personal-data processing.
- `apps/mobile/src/services/competitionApi.ts`: community-terms acceptance is checked before anonymous authentication. This is useful existing feature opt-in, not verified age or parental privacy consent. Protection must cover authentication, reads, score submission, outbox retries and refreshes.
- Competition stores an authenticated ID, name, exercise, score and duration; public leaderboard entries include profile ID, name, exercise and score. Camera frames and gameplay video do not go to competition or monetization.

## Three independent decisions

1. `adsAllowed`: applicable age eligibility, permitted ad-data processing, applicable consent/opt-outs, supported SDK treatment, then UMP `canRequestAds`.
2. `revenueAnalyticsAllowed`: separately established permission/basis for the actual RevenueCat processing, never inferred from `adsAllowed`, Apple download permission or UMP.
3. `competitionAllowed`: the user requests online competition and its necessary processing is permitted, with required notice/consent. It is independent of monetization permission.

Unknown/failed/declined age is not adult. A decision applies only to its purpose: refusing analytics does not disable an otherwise permitted ad or competition. Unresolved processing stays off pending resolution, not as a permanent product restriction. Local gameplay remains available wherever lawful. No permission dialogs should interrupt a run, and no change is proposed to recording/sharing or the approved result-exit ad schedule.

## Canada/USA decision matrix

The following states describe eligibility after the stated conditions are satisfied, not proof that the current source already satisfies them. Applicable jurisdiction is not reliably determined by the storefront alone.

| Evidence | AdMob treatment and consent | RevenueCat | Online competition |
| --- | --- | --- | --- |
| Known under 13 | Outside intended audience. Do not automatically initialize; any child-processing route requires its own established parental permission or lawful exception. No under-13 product expansion approved. | Off absent an independently established permitted route. | Do not create an online identity absent a permitted route. Preserve local use only where lawful. |
| Known 13 | Restricted teen ads may be eligible in the US and Canada where permitted. Quebec under-14 parental/tutor consent remains necessary absent a demonstrated exception. Apply TEEN/NPA when sufficient; CHILD when under-consent treatment is applicable. | May initialize only when its distinct processing is cleared; otherwise off while permitted AdMob can operate. | Requested service may initialize when its necessary processing is cleared. Quebec's parent/tutor requirement is not met by ordinary Terms acceptance. |
| Known 14–15 | TEEN/NPA with applicable consent, opt-outs and data restrictions; CHILD if regional under-consent treatment requires it. No universal ban. | Same independent gate, not automatic approval because ads are allowed. | User-requested necessary service with appropriate notice and consent; no advertising-data reuse. |
| Known 16–17 | TEEN/NPA; New York optional-processing consent still applies. No universal ban. | Same independent gate. | Same independent service gate. |
| Established 18+ | Existing NPA/PG, applicable UMP choices, data-use permission and opt-outs. Adult age is not consent. | Its own notice/basis/consent determination still required. | Existing service opt-in plus applicable privacy obligations. |
| Apple returns only 13–15 and a 14 threshold matters | Do not infer 14+. Resolve only the missing threshold when necessary and permitted; otherwise hold the affected processing. | Independent unresolved permission remains off. | Same: no inferred Quebec eligibility. |
| Age unavailable, declined, failed, or absent | Never map to adult. A documented restricted-ads route may be possible; its full data/consent conditions are not yet proven here. Keep this affected processing off until that route or a permitted minimal age fallback is established. | Off until its own processing is cleared; not a permanent age-based ban. | No new identity/background processing until its service eligibility/basis is established. Do not automatically erase an existing profile. |
| Required permission refused/revoked | Stop only the affected processing; dispose of stale/preloaded ads before another request. Do not punish refusal through degraded local gameplay. | Stop event sending and address SDK background processing/retained data where required; merely setting a JS tracker to null is not sufficient proof. | Handle the relevant service withdrawal and deletion separately from ad/analytics refusal. |

Google supports TEEN protections independently of CHILD treatment; CHILD is stricter, including advertising-identifier and third-party-vendor restrictions. Configure before SDK initialization. PG is a creative rating, not age assurance. [Google age treatment](https://support.google.com/admob/answer/6219315), [iOS configuration](https://developers.google.com/admob/ios/targeting).

UMP's under-consent flag suppresses its consent request and does not propagate age treatment into GMA. Do not use it as blanket consent bypass. [UMP US guidance](https://developers.google.com/admob/ios/privacy/us-iab-support).

## Specific remaining obstacles

**New York:** known teen optional data processing needs informed consent; advertising is excluded from the internal-business-operations exception. A compliant request must be separate, optional, refusal-prominent and revocable. Refusal/revocation also limits re-prompting. Necessary processing for a feature the user actually requests can qualify separately. [Statute §899-FF](https://www.nysenate.gov/legislation/laws/GBS/899-FF), [AG explanation](https://ag.ny.gov/child-data-protection-act-guidance).

**UMP coverage:** Google's consent solution does not collect `KnownChildSensitiveDataConsents`. `canRequestAds` therefore does not prove every youth-processing permission. A narrowly scoped supplemental purpose-consent mechanism may be needed where the existing message does not cover the applicable requirement. [Google GPP support](https://support.google.com/admob/answer/14126918).

**Quebec:** under-14 collection generally needs parental/tutor consent unless clearly for the minor's benefit. Advertising and revenue analytics have not been established as that exception; neither has our current leaderboard entry flow. At 14+, a minor may give the required consent. [Sections 4.1 and 14](https://www.legisquebec.gouv.qc.ca/en/pdf/cs/P-39.1.pdf).

**Actual ad data path:** NPA and age tags still do not mean no personal data. GMA documents IP-derived location, identifiers and interaction/diagnostic processing. RDP does not disable mediation or extend Google's contractual promises to all third-party data. Actual partners, request signals and native behavior still need verification. [GMA disclosure](https://developers.google.com/admob/ios/privacy/data-disclosure), [RDP limits](https://support.google.com/admob/answer/14125907).

**RevenueCat:** the blocker is absent independent purpose clearance and lifecycle control, not a documented universal prohibition on minors. The consent flow must govern configure-time and later background/event processing, not only callbacks. No age, exercise, fitness or competition attributes should be sent to RevenueCat for targeting. Existing pseudonymous user-event reporting cannot be assumed to fit a narrow contextual-ad exception.

**Unknown-age route:** COPPA does not mandate age questions for every general-audience service. Its persistent-identifier/internal-operations exception is conditional, not approval for arbitrary linked analytics or public profiles. Canadian guidance also permits protective defaults as an alternative to unnecessary age collection. These sources support assessing a no-question route, but do not prove our complete data flow qualifies. [FTC FAQ](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions), [Canadian guidance](https://www.priv.gc.ca/en/privacy-topics/age-assurance/aa-gd-web/).

## Apple and minimal fallback

Texas currently requires the store-derived age check and applicable parental-consent handling; a custom dropdown cannot replace it. Apple resumed affected new-account handling June 4, 2026. [Texas law](https://capitol.texas.gov/tlodocs/89R/billtext/html/SB02420F.htm), [Apple update](https://developer.apple.com/news/?id=sg176nne).

Add the DAR entitlement/native bridge. Use 26.4 regulatory-feature checks and supported 26.2 eligibility handling; availability-guard older OS. Request only needed age thresholds; a usable Apple response avoids a duplicate questionnaire. Apple may show its system sheet. Unknown or unavailable is not adult. Handle applicable revocations; significant-update consent is for actual qualifying changes, not a fictional initial-release update. Do not retain/forward raw Apple age data unnecessarily. [Apple Q&A](https://developer.apple.com/support/age-assurance/), [API workflow](https://developer.apple.com/documentation/declaredagerange/requesting-people-share-their-age-range-with-your-app).

Only propose a local age-range fallback if Apple cannot resolve a necessary distinction and self-declaration is permitted. Examples: a 14 threshold relevant to Quebec, or absent information on an older OS outside a mandatory store-verification route. No exact birthday, no identity documents, no repeated full questionnaire. An optional teen purpose-consent prompt is distinct from an age question.

## Worldwide implications and decisions not authorized

Worldwide availability is possible, not yet cleared. Europe adds country-dependent 13–16 parental-consent thresholds where consent is the basis, plus applicable device-storage consent even for NPA. Existing European UMP configuration is a start, not proof of full coverage for RevenueCat/competition. Brazil and other regions need their own scope checks. No territory change is proposed as an automatic fix. [EU explanation](https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/legal-grounds-processing-data/are-there-any-specific-safeguards-data-about-children_en), [Google NPA](https://support.google.com/admob/answer/7676680).

Mandatory: honor applicable Apple signals, legal age/consent duties, purpose limitations and withdrawal; keep uncleared processing off. Optional conservative product decisions requiring owner approval: permanent ad-free minors/unknowns, all users treated as CHILD, a nationwide teen opt-in where not legally required, raising the app audience age, or limiting store countries. None is approved by this document.

Before final policy implementation: settle launch scope, verify current console partners/territories, select a justified regional or uniformly protective consent design, and make the three independent decisions explicit. Validate known13/14–15/16–17/adult, ambiguous/unknown/error, refusal/revocation and stale-background paths on iPhone/iPad. Do not reopen accepted calibration.

## Shipaton constraint — owner reaffirmed

RevenueCat must remain an active, working integration in the released app for users whose processing is cleared. Per-user consent protection must not become a global SDK shutdown. Official rules permit the RevenueCat Ads path and require US availability. They do not state that SDK processing must run for every user despite privacy restrictions; that absence is not an eligibility guarantee. [Controlling rules, Project Requirements](https://revenuecat-shipaton-2026.devpost.com/rules).

Acceptance requires the actual installable candidate to initialize RevenueCat for a cleared test user, deliver genuine ad lifecycle/impression/revenue callbacks, and produce matching dashboard evidence. Also prove the RC-denied/AdMob-permitted case creates no RC customer/events while ads remain eligible, and test withdrawal/background behavior. Use supported test ads/devices during verification; no fabricated revenue or artificial live-ad clicks. A package entry, dashboard account link, Expo Go preview or simulator compile alone does not establish this. RevenueCat ad monetization adds event reporting to the ad SDK rather than replacing it. [RevenueCat integration](https://www.revenuecat.com/docs/ad-monetization).

## Additional worldwide and competition checks

Brazil's ECA Digital may apply to a 13+ service likely accessed by minors; review age-appropriate duties and restrictions on profiling-based advertising before marking Brazil cleared. It is broader than Apple's 18+ download restriction. [Brazil statute](https://planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/l15211.htm). UK protective defaults can be applied to all users without an age question, but do not waive other consent duties. [ICO guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/3-age-appropriate-application/).

For competition, document whether linked exercise/performance data falls within applicable consumer-health-data laws. If Washington's law applies, collection/sharing needs the requested-service necessity basis or required specified-purpose consents; sharing consent is separate where that route is used. Do not presume every game score automatically qualifies, nor that community Terms alone resolve it. [RCW19.373.030](https://app.leg.wa.gov/RCW/default.aspx?cite=19.373.030).