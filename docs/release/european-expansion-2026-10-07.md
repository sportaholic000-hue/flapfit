# European iOS expansion candidate â€” October 7, 2026

> **Superseded launch decision:** The owner deferred European public availability until after initial Apple approval. See [the four-country candidate handoff](four-country-ios-candidate-2026-10-07.md). European source remains prepared, but the shipping provider switch is OFF. The European readiness questions below are future launch tasks, not blockers for the initial four-country build. The 35-storefront screenshot below is historical and does not represent the current owner-restored selection.

## Status and scope

Branch: `codex/ios-camera-permission-review`. Parent: `04e85bad978374c2cdfba329afeb00d63b0a7fe4`, containing camera correction `4d29c0401e62ef99c7c4fc27c0150fde922543dc` and the existing recording branding / six calibration guides. This is a prepared source candidate, **not a completed European public-launch readiness determination**. No EAS build, TestFlight upload, OTA publication, App Review submission or release was started in this expansion step.

Material readiness question remains open: owner confirmation of EU/EEA and UK representative arrangements or a documented applicable exemption. The public privacy page still describes four launch countries. Its European supplement is drafted separately and must be completed/published before this candidate is treated as ready to build for the intended European release. Do not assume accepted Apple trader status resolves GDPR representation.

The owner authorizes one production iOS build and upload after work/verification is complete and material blockers are resolved, using existing allowance only. That authorization has not been consumed.

## Country scope

The catalog is centralized in `launchCountries.ts`; expanding it later does not require restructuring the UI or duplicating a four-country allowlist. It defines supported **current network countries**, not saved residency or store-account country.

| Group | Countries and ISO codes |
| --- | --- |
| EU (27) | Austria AT; Belgium BE; Bulgaria BG; Croatia HR; Cyprus CY; Czechia CZ; Denmark DK; Estonia EE; Finland FI; France FR; Germany DE; Greece GR; Hungary HU; Ireland IE; Italy IT; Latvia LV; Lithuania LT; Luxembourg LU; Malta MT; Netherlands NL; Poland PL; Portugal PT; Romania RO; Slovakia SK; Slovenia SI; Spain ES; Sweden SE |
| Additional Europe (5) | Iceland IS; Liechtenstein LI; Norway NO; United Kingdom GB; Switzerland CH |
| Preserved (4) | Canada CA; United States US; Australia AU; Mexico MX |

36 supported source codes: `AT AU BE BG CA CH CY CZ DE DK EE ES FI FR GB GR HR HU IE IS IT LI LT LU LV MT MX NL NO PL PT RO SE SI SK US`.

### Actual Apple account observations

Saved and read back **35 storefronts**, all marked **Available on App Release**: all countries above except LI. Apple's 175-territory selector did not contain a separate Liechtenstein option. LI is supported in the app; no claim is made that an unobserved LI storefront was enabled or that it maps to another storefront. Other storefronts and automatic future-territory expansion remain unselected.

Digital Services Act Compliance: **Active**, 27 countries, dated September 19. Free Apps Agreement: Active. Existing automatic release-after-approval setting, screenshots, marketing URL, review information and selected rejected build 8 were not changed. No resubmission occurred. Availability evidence was saved locally as `outputs/european-expansion-2026-10-07/availability.png` in the task workspace.

## Connected behavior

- Country: existing bounded Cloudflare trace, discard IP/body, fresh session/app-state generation, no locale/storefront/residency inference. Unsupported/unresolved country never grants provider permission.
- Saved data: existing notice and choice keys retained. Old generic reporting grants do not become a European RevenueCat opt-in. A new boolean records the explicitly disclosed European reporting activation; refusal and failed writes remain effective. Province/state labels, game progress and competition identity keys are unchanged.
- Age: existing 13+ game audience retained. Apple's available age service and mandatory authorization checks remain authoritative; a decline/error cannot fall back to a local self-declaration. Older iOS with an unsupported API retains the existing local-age UI, with appropriate new bands.
- Consent-age groups govern optional consent-based processing, not admission to the 13+ game. Below the boundary, gameplay stays available; the implementation has no verified parental-authority route for optional providers and does not invent one.
- Google: existing restricted non-personalized / restricted-data-processing / PG ad configuration, native UMP refresh/form, `canRequestAds`, and native privacy-options row remain in place. Google vendor consent is never a RevenueCat or leaderboard permission. Declining personalized advertising does not inherently prohibit Google's eligible limited-ad route. A false `canRequestAds` or failed request does not manufacture consent or block an otherwise eligible workout.
- RevenueCat: European processing requires independent explicit Allow in the existing Ad performance reporting controls, with named provider/data/purpose disclosure. It remains optional, off without that activation, and can be stopped independently of Google ads. Setup acknowledgement alone is not consent; leaving this optional choice unset does not cause repeated setup prompts on every run. Existing original-country behavior is retained.
- Competition: existing requested-service choice and competition terms remain separate; only anonymous profile/session identity, public name, exercise category, score and necessary operation data enter the existing service. Google/RevenueCat choices do not activate it. Report, Block, Delete, uniqueness, RLS/ownership and single post-run score submission are untouched. Technical assessment confirms service necessity and separation; this does not certify every national minor-contract/notice requirement.
- SDK initializations remain in the existing permitted menu/result contexts. No gameplay preloading, new network schedule, ad-frequency change, result wait, result-action change or Share ad trigger was introduced. Pending SDK setup cannot complete into gameplay.
- Camera correction, microphone handling, recorded-frame-only white branding, all six guides/artwork and measurement/acceptance/gameplay code are unchanged from the parent.

## Consent ages and evidence

| Boundary | Network countries |
| --- | --- |
| 13 | BE EE FI LV MT PT SE IS NO GB |
| 14 | AT BG CY IT LT ES |
| 15 | CZ DK FR GR SI |
| 16 | HR DE HU IE LU NL PL RO SK LI |
| CH | Switzerland uses capacity of judgement, not a fixed Article 8 age. The simple independent opt-in is implemented for the existing 13+ audience. Do not describe 13 as a Swiss statutory threshold or blanket legal clearance. |

Apple accepts at most three thresholds and requires at least two years between adjacent thresholds. Thus 14-boundary countries request 13/15/18; an Apple 13â€“14 range is insufficient to establish 14 and optional consent-based processing remains restricted. The app never invents an exact age or stores raw Apple ranges. Countries at 15 request 13/15/18; those at 16 request 13/16/18. Existing 13-boundary countries use 13/16/18. Local older-iOS bands can distinguish 13 from 14â€“17 where applicable.

Primary sources checked:
- [FRA country table, 2020](https://fra.europa.eu/sites/default/files/fra_uploads/fra-2020-fundamental-rights-report-2020_en.pdf), supplemented for subsequent changes below.
- [Danish enacted change](https://www.retsinformation.dk/eli/ft/A20230178330) and [Datatilsynet confirmation of 15](https://www.datatilsynet.dk/Media/638501550348383386/Brev%20til%20b%C3%B8rns%20vilk%C3%A5r.pdf).
- [Slovenian regulator: Article 8 ZVOP-2, 15](https://www.ip-rs.si/mnenja-zvop-2/uporaba-dru%C5%BEbenega-omre%C5%BEja-s-strani-mladoletne-osebe-1698050415).
- [Iceland Act 90/2018](https://www.althingi.is/lagas/155/2018090.html).
- [Norwegian government: current 13](https://www.regjeringen.no/en/documents/meld.-st.-32-20242025/id3108037/?ch=2); [proposed increase to 15 remained a consultation](https://www.regjeringen.no/no/dokumenter/horing-endringer-i-personopplysningsloven-aldersgrense-for-barns-samtykke-ved-bruk-av-informasjonssamfunnstjenester-sosiale-medier-mv/id3114264/). Do not treat a proposal as enacted law.
- [Liechtenstein regulator](https://www.datenschutzstelle.li/datenschutz/fuer-buergerinnen-und-buerger).
- [ICO ISS consent guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/children-and-the-uk-gdpr/what-are-the-rules-about-an-iss-and-consent/).
- [Swiss FDPIC cookie guidance, October 2025](https://www.edoeb.admin.ch/dam/en/sd-web/brLL9rM3ny9d/Leitfaden%20des%20ED%C3%96B%20betreffend%20Datenbearbeitungen%20mittels%20Cookies%20und%20%C3%A4hnlichen%20Technologien%20V.%201.1%20vom%2006.10.2025_EN.pdf).

## Provider flag assessment and actual account observations

`enabled` now selects the reviewed technical routes in the active launch coordinator; it is **not** a global compliance/launch-ready assertion. Previously the active coordinator rejected every country except CA/US/AU/MX, independently of the older European provider helper.

| Flag | Requirement / verified evidence |
| --- | --- |
| Google non-personalized route | Existing native restrictions + UMP current result and purpose/vendor choice handling. Account has published **Flap Fit European Privacy**, dated Sept 19, associated with Flap Fit iOS (and existing Android app), correct privacy URL, Consent / Do not consent / Manage options. Common 198 ad partners configured. No unrelated SDK mediation added. |
| Google limited-ad route | Existing Google UMP authorization still decisive; account Programmatic limited ads is **On**. No home-grown substitute for native CMP, no forced `canRequestAds`, no all-Europe ad-free mode. |
| RC publisher notice | Remains **false**: account shows zero publisher purposes. Google vendor consent cannot establish a publisher P1/P7 reporting basis. |
| RC explicit consent | New route uses specific in-app provider disclosure, separate voluntary choice, durable activation provenance, withdrawal and existing native ad-only fence. Integration tests assert no RC configure until explicit activation. |
| Competition requested service | Existing explicit competition terms/participation choice and necessary service fields inspected. No advertising/reporting grant authorizes competition. Backend and identity contract unchanged. Production backend traffic and country-by-country legal sufficiency have not been independently verified in this task. |

AdMob European message is published in **English**; additional translations were not enabled. It is a shared iOS/Android message, and no changes were published to it. Account Open; app remains unlinked to a public App Store listing / Requires review with limited serving. UMP/configuration/source tests are not evidence of a live European impression. After public release, link the existing AdMob app, check crawler/verification/readiness, and verify real impressions and permitted RevenueCat events without clicking own ads or generating artificial traffic.

Relevant official provider references:
- https://developers.google.com/admob/ios/privacy
- https://developers.google.com/admob/ios/privacy/gdpr
- https://support.google.com/admob/answer/9760862
- https://support.google.com/admob/answer/10105530
- https://support.google.com/admob/answer/10305345
- https://www.revenuecat.com/dpa

Google's limited-ad documentation says its invalid-traffic-only storage does not require consent under Google's implementation; the publisher must assess its applicable legal basis. No claim is made that a Google SDK flag establishes all legal requirements.

## Remaining public notice / representation requirement

The current site still names only Canada, US, Australia and Mexico. A proposed supplement is in `european-privacy-supplement-draft-2026-10-07.md`; it has not been published. Confirm EU/EEA and UK Article 27 representation or an applicable exemption, add the correct contact information, finish the purpose/basis/transfer disclosures, and publish the completed notice before treating this as release-ready. This is separate from Apple's accepted Digital Services Act trader entry. No representative has been appointed, no contract accepted and no new paid service purchased by the agent.

Sources: [EDPB territorial-scope guidelines](https://www.edpb.europa.eu/sites/default/files/files/file1/edpb_guidelines_3_2018_territorial_scope_after_public_consultation_en_1.pdf), [ICO overseas-controller guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/international-transfers/receiving-personal-information-from-the-eea/). They describe the representative requirement and narrow occasional-processing exemption. The owner's circumstances remain unconfirmed; this report does not claim a final legal exemption determination.

## Verification

- Full mobile suite: 76 suites / 1,801 tests passed before final additional transition/recovery tests. Final added transition/recovery checks: 2 suites / 159 tests passed (includes 14 new tests); final TypeScript and lint reruns also passed. The two counts overlap and must not be added as independent tests.
- TypeScript: passed. Oxlint with warnings denied: passed. Production release validation: passed.
- OTA configuration: passed; `expo-updates`, project URL, production channel/environment, manual Info update check, fingerprint runtime, embedded offline bundle and anti-bricking remain present. No OTA published.
- AdMob/UMP source patch: passed locked-source application, idempotence and drift/tamper rejection. RevenueCat source patch: passed against ten SHA-256-verified official 5.88.0 files, including ad-only routing, no unrelated startup, withdrawal, cache migration and tamper rejection.
- Windows cannot execute the Swift native harnesses: they explicitly reported skipped. Native/device behavior and real Google/RevenueCat delivery have not been verified here.
- Initial test expectation failures (old unsupported DE/GB assumptions and an invalid 13/14 Apple gate proposal) were corrected before the full passing suite. An added transition fixture initially supplied an invalid content-length header and was corrected. A subsequent test invocation from the repository root failed Babel alias resolution; rerun from `apps/mobile` is the authoritative check. No implementation was relaxed to mask those failures.
- No changes to dependencies, native configuration, gameplay scripts, assets, microphone handling, main, build-8 tag or Android branches are included in this expansion.

## Native acceptance after a future authorized build

1. Fresh install, no OTA: first camera explanatory Continue, native grant/deny, denied Settings recovery, granted-camera repeat runs; optional microphone refusal unchanged.
2. iPhone/iPad: all six silhouette stages, progress/text clearance, accepted-pose fades, recordings with branding below target/endless score, ordinary live gameplay without branding.
3. Germany/European UMP: native message, accept and decline/manage choices, return via Info privacy options, report refusal independent of ads, no setup loop; eligible exits preserve results-first/no wait/Share exclusion. Real European geographic testing is still needed, not inferred from mocks.
4. Existing CA province switch QC â†’ NB/other actual province, US protected teens and ordinary eligible adults; correct saved names and no provider restart during a workout.
5. Age-service unavailable/declined, offline/unresolved lookup, failed request/no fill and later recovery; Apple available denial must not be bypassed by a local answer.
6. Competition entry/name/score/report/block/delete, preserved identity/progress; optional reporting allow then stop. No camera, age range or workout history should reach ad/reporting endpoints.
7. Manual Info â†’ Check for updates remains available; do not publish a test update without separate authorization.
