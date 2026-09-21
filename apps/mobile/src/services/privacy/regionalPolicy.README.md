# Regional processing requirement resolver

Current release behavior (September 21 owner correction): `regionalAdvertising.ts` disables advertising and ad-event reporting for Quebec, CT/NY minors, Australian ages 13–14 and Mexican minors even if a lower-level resolver could permit a purpose. `releaseEligibility.ts` keeps these regional decisions separate from gameplay. Both New York answers persist locally; foreground refresh does not require a new answer. The resolver rows below describe processing prerequisites, not gameplay exclusions or permission to bypass the release advertising policy.

Owner advertising constraint (September 21): do not add a general ads-off switch or convert the advertising notice into one. Eligible adults outside Quebec receive advertising under the existing privacy/provider checks. This includes older saved grants and users who restore a prior refusal. The explicit release exclusions above remain approved. Preserve real saved refusals, Google privacy controls and independent reporting choices; do not reinterpret a sale/sharing/targeting opt-out as a blanket ad-removal entitlement. The prior general withdrawal-button implementation was removed. Known under-13 users remain excluded by the owner-confirmed 13+ minimum.

This pure resolver covers the reviewed Canada/US launch scope. It does not start an SDK, present UI, persist age evidence, change app availability, or replace the central processing policy. No policy is selected from locale, timezone, missing age, a privacy-policy link alone, or an Apple API failure.

Import resolveRegionalPolicy from ./regionalPolicy. Supply verified country/state codes and Quebec status (QC or explicit CA-NON-QC; exact province is unnecessary), ephemeral age evidence, purpose-specific New York applicability evidence, explicit data-flow assessments and purpose-specific signals. Pass the returned region/requirements to the central processing policy; keep reasons/unresolvedConditions for implementation diagnostics, not analytics. That policy still checks the Apple age requirement, current notice version and independent choices.

## Required assessments before integration

All providerOnly/disclosed/nonSensitive/purposeLimited and routeVerification flags require review of actual payloads, contracts, partners and retention. True is not a convenient default. Pseudonymous IDs remain personal data. No exercise, pose, health inferences or recording payload is authorized by this resolver. NPA is not proof of non-sensitive data or provider-only use. Advertising also requires verified NPA and RDP settings. RevenueCat reporting still requires its own providerOnly assessment; an advertising route never clears analytics.

Canada's reviewed route permits meaningful notice/implied consent where appropriate; it does not declare sensitive or unexpected processing lawful. Quebec section 8.1 must explicitly be assessed per purpose as not-present, activation-required, or unresolved. A true activation choice means the function was actually enabled under the current disclosed configuration; a generic old consent or Apple download approval does not satisfy it.

CT minors: disclosure alone does not establish necessary contextual ad delivery. Set connecticutNecessaryContextualDelivery only after a documented assessment supports that precise delivery route. Optional RevenueCat cross-session analytics remains unresolved unless connecticutStrictInternalNecessity independently verifies the narrow internal-operation/necessity route. Neither flag may be derived from a generic teen consent. No current SDK/contract flow is declared verified by adding this file.

New York scope is not a residence test. Section 899-ee covers users in New York; section 899-ll covers conduct occurring wholly or partly there. For each teenage advertising/reporting purpose, newYorkApplicability must identify assessed in-state activity or covered-data history, or verify all three wholly-outside conditions: collection outside New York, no use in New York, and no use of data collected in New York. These transient facts must account for relevant processing location and data history; a country/state answer, storefront or UMP section cannot substitute. Missing or partial evidence leaves that purpose unresolved, regardless of residence. No location history is collected or persisted by this resolver. Requested competition and independently assessed purposes remain separate. CT necessity and Quebec function requirements still apply when NY also applies.

## Advertising route verification

The existing providerOnly field remains supported. Alternatively, ads may supply routeVerification with kind google-only or restricted-demand. Neither kind enables an actual account setting. Both require a verified absence of sale/sharing/cross-context use under the applicable rules, and contractual purpose/necessary-retention limits. The shared disclosed, nonSensitive, purposeLimited, NPA and RDP checks still apply. This does not demand that every advertising recipient be Flap Fit's processor when an independently lawful, bounded recipient route is established.

- google-only additionally verifies that effective demand is restricted to Google and third-party creative vendors are excluded. A default AdMob mediation group is not proof of either fact. Google-only demand is not itself a finding that all processing is necessary or consent-free.
- restricted-demand additionally verifies disclosed third-party recipients, minimized bid-request data, and restricted winning-creative processing. Public bid redaction and NPA contracts provide evidence for parts of this assessment, not an automatic true value for the whole route.

Google documents removal of IP addresses, advertising/buyer/first-party IDs and generalized user agents from NPA bids. Its binding buyer rules prohibit NPA profiling, sale of Program Data, and use outside disclosed purposes. The 18-month maximum retention in those rules is a ceiling, not proof that this app's retention is necessary. Reduced bid data is not declared legally anonymous here.

The concrete remaining creative gap is separate: NPA/RDP disallows third-party ad-serving/tracking vendors for Google demand, but does not generally exclude those vendors from non-Google demand. Google's optional RTB creative-consent checking is documented for EEA/UK/Switzerland/Brazil, not as a Canada/US restriction. Therefore the current flags alone cannot verify the restricted-demand route. For a Google-only alternative, standard AdMob ad-network blocking is account-level, while US partner selection applies only to supported US regions. No per-app/per-request Google-only selector is established by this resolver. Do not apply CHILD treatment as a substitute or silently change account-wide settings.

An assessed route can permit eligible US/Canadian notice-based advertising without RevenueCat. NY minor express consent, CT necessity, Quebec function activation and full advertising-personal-data withdrawal remain separate checks. Missing recipient/purpose/retention evidence must stay unresolved for its affected route; generic consent cannot override a legal prohibition. No production flow is marked verified by these types or tests.

## Resolver rows

| Region and age | Ads | RevenueCat reporting |
| --- | --- | --- |
| US adult with verified flows | Notice and opt-out | Notice and opt-out |
| Canada outside Quebec, age 13+ with verified flows and, for teens, NY scope resolved | Notice and opt-out | Notice and opt-out |
| Quebec age 14+ with verified flows | Notice and opt-out unless applicable functions still need activation | Independently assessed activation/notice route |
| Teen with established NY applicability | Separate express processing consent | Separate express processing consent |
| CT teen | Unresolved until necessary contextual delivery is verified | Unresolved until strict internal necessity is verified |
| Other reviewed US state, teen with verified flows and NY wholly-outside evidence | Notice and opt-out for non-sale contextual route | Notice and opt-out for purpose-limited processor reporting |
| Unknown/unreviewed region or unresolved age | Unresolved | Unresolved |
| Under 13 / Quebec known-under 14 | Outside audience / parent-permission stop | Same |

Competition is only a requested-service requirement after the common age/region eligibility checks; it does not automatically authorize leaderboard submissions. The existing central policy still requires that purpose's user action/choice. Missing US teen state or purpose-specific NY applicability blocks only the affected ads/reporting requirements in this resolver.

## Integration boundaries

Use available Apple system age information and required regional features before considering a custom question. A suitable Apple threshold-14 request can refine Quebec eligibility when the system shares sufficient bounds; errors, refusal and cached broad ranges remain unresolved. UMP manages its configured messages before ad initialization, but does not establish age, every applicable jurisdiction or RevenueCat permission. Existing onboarding/Info can provide the required notice. This resolver does not itself authorize a new disclosure screen or questionnaire. The current release UI and owner advertising constraints are documented above. A new discretionary ads-off switch is not authorized.

Resolve each actual missing applicability or processing fact before proposing a fallback. In particular, a residence question alone cannot resolve NY scope. Honor purpose-specific refusal/withdrawal, UMP and central-policy denials independently. Generic consent cannot establish CT necessity; analytics refusal does not disable separately permitted ads. These requirements do not select a worldwide production policy.

Unknown is not an adult classification. An age interval crossing 18 receives minor rules; a lower bound of 18 or higher is required for the adult route. Returned objects contain no original age bounds, birthdate or Apple account data.

## Sources and scope, reviewed September 19, 2026

- OPC meaningful consent: https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/p_principle/principles/p_consent/
- OPC transfers for processing: https://www.priv.gc.ca/en/privacy-topics/airports-and-borders/gl_dab_090127/
- Quebec private-sector law sections 4.1, 8.1, 12–14, 18.3: https://www.legisquebec.gouv.qc.ca/en/document/cs/p-39.1
- Quebec consent guidance: https://www.cai.gouv.qc.ca/uploads/pdfs/CAI_Criteres_Validite_Consentement.pdf
- New York covered-user definition: https://www.nysenate.gov/legislation/laws/GBS/899-EE
- New York territorial scope: https://www.nysenate.gov/legislation/laws/GBS/899-LL
- New York processing requirements: https://www.nysenate.gov/legislation/laws/GBS/899-FF
- Connecticut 2026 supplement sections 42-515 and 42-529a–d, including July 1, 2026 amendments: https://www.cga.ct.gov/2026/sup/chap_743jj.htm
- Colorado enacted minor protections: https://leg.colorado.gov/sites/default/files/documents/2024A/bills/2024a_041_enr.pdf
- Montana enacted SB297 sections 9–11: https://archive.legmt.gov/content/Sessions/69th/Contractor_index/CH0567.pdf
- Maryland non-targeted advertising definition: https://mgaleg.maryland.gov/2026RS/Statute_Web/gcl/14-4701.pdf
- Google RDP limits and partners: https://support.google.com/admob/answer/14125907?hl=en

This is an implementation boundary, not a worldwide legal certification. Confirm legal scope, applicable location/residence signals and business thresholds before clearing each flow. Do not add a new question or SDK permission merely because an assessment is missing.

Advertising route sources, reviewed September 19, 2026:

- NPA/RDP bid redaction and regional recipient controls: https://support.google.com/authorizedbuyers/answer/11121285?hl=en
- NPA profile prohibition: https://developers.google.com/authorized-buyers/rtb/build-profiles-with-bid-requests
- Binding buyer purpose, sale, profile and retention restrictions: https://www.google.com/intl/en/authorizedbuyers/guidelines/
- Google versus non-Google creative vendor behavior under NPA/RDP: https://support.google.com/admob/answer/14323214?hl=en
- Geographic scope of optional RTB creative checking: https://support.google.com/admob/answer/10285218?hl=en
- Account-level ad-network blocking: https://support.google.com/admob/answer/6067448?hl=en
- US partner-control scope: https://support.google.com/admob/answer/10860309?hl=en
