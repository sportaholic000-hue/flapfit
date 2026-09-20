# Regional production reconciliation — September 20

This successor follows d2f85fd6e2fa685421d59cabf4da1df0ec742741. No new build or
tester request was made while these independent corrections were completed.
Builds f0870fe0 and a4091cca contain the three focused fixes at 2092188, but do
not contain this successor's regional controls, capacity correction or archive hook.

## Concrete findings and disposition

| Finding | Disposition and evidence |
| --- | --- |
| Prior reporting refusal erased by unrelated save failure | Already fixed at 2092188; exact restart/RC-not-loaded regression retained and passed in the full successor suite. Independent ads/competition remain allowed. |
| Failed reporting withdrawal loses retry | Already fixed at 2092188; both rendered failure/retry cases now also use the production launch plan and explicit acknowledged notice. All original assertions retained, including independent ads. |
| Sheet completion precedes native dismissal | Already fixed in source at 2092188; actual iOS onDismiss, cancellation/replacement/unmount regressions retained. Physical iPad transition remains unverified. |
| US country-only teen path cannot reach permitted processing | Reproduced and fixed for an established non-Connecticut residence: the existing Info/result sheet now accepts a minimal local residency answer. A successful saved No resolves only CT applicability; independent NY-compatible purpose consents, Apple verification and Google consent remain mandatory. Yes/Not sure do not fabricate a necessity exception. See isolated before/after JSON, regionalClarification tests, rendered controls and production coordinator integration. |
| Australian 13–14 personal consent wrongly treated as capacity | Reproduced and fixed: the previous resolver allowed all purposes with personal grants despite having only CHILD/under-consent-age tags. The successor requires verified authority for affected purposes; the current app does not collect it. Age 15–17 retains its separately permitted teen path. Before/after executed against the untouched prior Git source; see reproduction JSON and production coordinator tests. |
| Canadian province helper has no production caller | Not reproduced as a missing activation path for established age 14+: country-wide possible-QC separate activation is connected and independently tested for ads/reporting/refusal/restart. No province is inferred. Below-14 returned evidence cannot establish the 13+ threshold with the valid 14/16/18 Apple request; it does not authorize optional processing. No unnecessary province question added. |
| Mexico has no production verified-parent input | Confirmed restriction, not a pretend parent workflow: under-18 personal grants cannot authorize any affected processing; no guardian checkbox or download grant is substituted. Adult notice/ads/reporting and independent refusal/restart paths are connected and tested. Info explicitly states that verified parental permission is not collected and offers no misleading Allow control. |
| Info can offer Allow where it cannot clear eligibility | Fixed: available actions respect the actual launch plan; blocked users see the applicable reason. Required withdrawal retry remains available regardless of that eligibility. Rendered AU/MX/CA cases verify this distinction. |
| Public policy omits Apple authorization records and local regional answer | Corrected in existing site source; publishing/readback recorded separately. No raw age, birthday or local residency answer is added to provider payloads. |

The latest Fable review text was not supplied or found. The accessible GPT review
also states it has not seen that report. Its unseen contents are not marked
not reproduced or reconciled. Available concrete reviews and the original A1–F3
checklist are reconciled here without claiming access to unavailable evidence.

## Why the remaining age restrictions are real

Australia: [OAIC capacity guidance B.59–61](https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-b-key-concepts)
does not establish capacity below 15 without an individual assessment. No such
assessment or verified parent collection exists in this product. A Google age tag
is a provider setting, not that authority. At 15+, ordinary separate teen choices
remain connected; this is not an Australian-wide advertising block.

Canada: [Quebec ss4.1 and 14](https://www.legisquebec.gouv.qc.ca/fr/document/lc/p-39.1)
and [regulator guidance](https://www.cai.gouv.qc.ca/protection-renseignements-personnels/information-entreprises-privees/consentement-personnes-entreprises)
require parent/tutor authority for the relevant below-14 consent. Apple's valid
14/16/18 result below 14 cannot distinguish an eligible 13-year-old from younger
children. [Apple's two-year interval contract](https://developer.apple.com/documentation/declaredagerange/requesting-people-share-their-age-range-with-your-app)
precludes simply adding adjacent 13/14 thresholds to the same request. No exact
birthday, province guess, extra onboarding, or unsupported parent attestation is
introduced. Canada 14+ function activation is available without a province claim.

Mexico: [private-sector regulation](https://www.diputados.gob.mx/LeyesBiblio/regley/Reg_LFPDPPP.pdf)
and [civil capacity rules](https://www.diputados.gob.mx/LeyesBiblio/pdf/CCF.pdf)
do not turn a minor's own optional-processing choice into representative authority.
The actual adult route works; the unsupported minor authority route stays closed
and is described honestly. These are source-policy interpretations, not a claim
of legal certification or physical testing in each country.

Connecticut: [2026 ss42-529a/d](https://prdext2.cga.ct.gov/2026/sup/chap_743jj.htm)
do not let an ordinary teen consent override necessity, purpose and retention
constraints. The actual multi-buyer advertising route does not establish the
extra minor-specific necessity/retention exception, and independent RevenueCat
measurement is not treated as necessary. No reviewed flag is fabricated. A
nonresident answer clears only that unresolved fact, never NY duties or refusal.

## Provider configuration disposition

The actual AdMob route is restricted multi-buyer demand. Google-only was never
established. The production source sends NPA and RDP for every ad request, uses
PG plus actual age treatment, disables publisher first-party ID, and sends no
exercise/pose/video payload. The existing Google network is retained.

The winning-creative question is resolved at the documented configuration/purpose
level: [Authorized Buyers Data Restrictions](https://www.google.com/intl/en/authorizedbuyers/guidelines/)
cover data obtained in connection with the program by buyers, advertisers and
their agents/vendors, prohibit sale, restrict use to disclosed advertising
purposes, and prohibit profiling where the publisher disallows it. The
[bid-request guide](https://developers.google.com/authorized-buyers/rtb/build-profiles-with-bid-requests)
requires both personalized-request eligibility and publisher permission. The
dashboard's general Allowed label does not override NPA. This supports the
configured no-profile route; it is an inference from published restrictions,
not an audit of each creative or proof of actual provider behavior.

[Google's creative guidance](https://support.google.com/admob/answer/14323214?hl=en)
still permits third-party creative vendors on some non-Google demand; neither
NPA nor RDP is misrepresented as excluding them or extending Google's contracts
to every recipient. They remain subject to the buyer-program restrictions.
Necessary retention with an 18-month ceiling does not establish CT minor
necessity. No blanket buyer block, CHILD-for-everyone setting, new ATT request,
or additional discretionary ads-off option was introduced.

September 20 RevenueCat readback: project a58d3dbd has Google AdMob Connected,
publisher pub-5933597810180440, admob.readonly and admob.report scopes. The Ads
sandbox page still shows the initial tracking view, not matched received events.
This closes the connection identity check only. The real fresh-ID ad-event
receipt without customer-info GET remains a separate installed integration test.

## Backend operation completed

The known September 16 temporary moderation report
6bf9e3d4-452f-4a03-87ca-3221e42780a3, context ef3409ae-cc16-419d-99bc-6cf3509e4888,
was dismissed through the authenticated Supabase SQL editor using exact ID,
context, pending-status and both-null-account guards. Exactly one row returned.
Independent read-only MCP query confirmed dismissed at
2026-09-20 07:30:54.336501+00, with both deleted account links still null.
No real player account or report was deleted. Existing 180-day resolved-report
retention applies. Reason: self-created release test; no violation to action.

## Build evidence preparation

Existing signed profiles now retain the actual worker xcarchive ZIP and checksum
as separate EAS build artifacts. The hook validates bundle identity and rejects
ambiguous archive selection. It neither changes signing nor starts a build.
Actual macOS hook execution/archive retrieval and Xcode Organizer's generated
privacy report remain artifact-dependent. A local manifest summary is not an
Xcode report. [EAS hook/artifact order](https://docs.expo.dev/build-reference/ios-builds/)
places extra-artifact upload after the success hook.
