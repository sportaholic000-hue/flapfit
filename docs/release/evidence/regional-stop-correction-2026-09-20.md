# Regional applicability and competition Stop successor — build held

## Source and scope

Base: **14863f823384774e8dea693716bbcb32ffb046af**, branch **wip/crash-protection-20260920**. The commit containing this report is the corrected successor. Adjacent checks and package JSON bind the results to exact input hashes.

The prior Quebec/non-Quebec/unresolved implementation is preserved, not repeated. This successor fixes the competition Stop race, separates confirmed New York applicability from an unproved territorial exemption, and strengthens source evidence from Google initialization to the actual restricted interstitial request/presentation and result-exit continuation. No native/cloud build, upload, provider/account change, deployment or device acceptance occurred.

## Findings and concrete evidence

| Finding | Disposition | Evidence |
|---|---|---|
| Unknown Canadian province treated as Quebec | Already fixed at base; verified and strengthened | Unknown has province-unresolved and no Quebec activation flag. The existing Info/post-result question records only resident/not-resident/unknown on device. All twelve non-Quebec province/territory codes, retry/failure/stale-answer tests, restart and actual coordinator are covered. |
| Eligible established non-Quebec adult gets an unnecessary ads-off switch | Already fixed at base; stronger regression added | Fresh advertising choice stays unset. Actual rendered Info has no Allow advertising, Stop advertising or Not now. Stopping reporting leaves ads permitted. Actual monetization adapter requests the test interstitial with non-personalized=true and rdp=1, loads it, presents on the eligible result exit and continues exactly once after close. First exit stays free. |
| Unknown US state treated as Connecticut | Already fixed at base; verified | Unknown is state-unresolved, confirmed CT is its distinct minor necessity branch. All other 49 states plus DC avoid CT restrictions. Adult US receives neither CT minor nor NY minor consent restriction. |
| Unproved NY territorial exemption labelled as known NY applicability | Fixed | New reason new-york-applicability-unresolved retains the missing fact. Known NY activity/history is distinct and cannot be overridden by contradictory wholly-outside evidence. The existing teen-purpose consent fallback remains; no non-NY exemption is fabricated. Its territorial narrowing is still unproved, as described below. |
| Competition Stop → pending acceptance → newer Stop reuses old Stop | Reproduced and fixed | Two new pre-fix regressions failed: service operation identity and actual Compete I Agree. Stop now checks the purpose's intent revision before reusing an in-flight operation. An older successful save cannot confirm a newer intent. After correction, the actual Compete modal stays open, terms are not accepted, the final saved record is denied and restart restores denial. |
| Competition race at real transport boundary | Verified corrected | Both Apple-required and not-required cases use real privacy storage, launch policy, monetization and competition API. After the race and after restart, ordinary leaderboard/run calls fail before client creation or fetch. Advertising stays allowed and RevenueCat stays refused. Native Apple account clearance is explicitly simulated, not claimed as an installed-device result. |

Native SDKs/Apple, storage failures and network transports are controlled test doubles. Ad invocation is source evidence; it is not physical ad display, fill, payment or RevenueCat receipt.

Existing refusal read/retry, unrelated-save preservation, stale reporting Allow, pending deletion on both Apple paths, native-dismissal sequencing and reporting withdrawal regressions remain in the complete suite. No gameplay, calibration, recording/sharing, native patches, dependencies, deployment configuration or ad scheduling code changed.

## Actual country / age / region behavior

All entries require a readable privacy record, fresh supported country, confirmed age eligibility, any mandatory Apple clearance, the displayed notice and applicable Google consent. Existing explicit refusals remain binding. A regional answer never grants a refused purpose. Competition also requires its own terms/choice and clear deletion/Apple account state.

| Country / age | Region evidence | Advertising | RevenueCat reporting | Online competition |
|---|---|---|---|---|
| Canada, 18+ | Established non-Quebec | Normal restricted ads; **no discretionary Flap Fit ads-off control** for a fresh/unrefused choice | Notice route; independent Stop remains | Separately requested |
| Canada, 18+ | Confirmed Quebec | Specific function activation; required withdrawal remains | Separate function activation; independent Stop | Separately requested |
| Canada, 18+ | Unresolved | Paused pending the small Quebec question; no inferred Quebec status or grant | Same unresolved hold | Separately requested |
| Canada, 14–17 | Established non-Quebec | Teen purpose consent while NY processing scope is unresolved | Separate teen purpose consent | Separately requested |
| Canada, 14–17 | Confirmed Quebec | Quebec activation plus teen purpose consent, separately per purpose | Same, independent of ads | Separately requested |
| Canada, 14–17 | Unresolved | Resolve Quebec applicability first; teen safeguard remains afterward | Same | Separately requested |
| Canada, current Apple response below 14 | Any | Current [14,16,18] gates do not establish 13+; optional processing stays age-unresolved | Same | Same |
| United States, 18+ | Any/unknown state | Normal restricted ads, no minor-specific ads-off control | Notice route; independent Stop | Separately requested |
| United States, 13–17 | Confirmed Connecticut | Current provider route lacks the required minor necessity basis: held; consent cannot override | Optional ad reporting lacks that basis: held | Separately requested |
| United States, 13–17 | Established non-Connecticut | No CT restriction; teen purpose consent while NY scope remains unresolved | Separate teen consent | Separately requested |
| United States, 13–17 | Unresolved state | One local CT-residency clarification; held while unresolved | Same | Separately requested |
| Australia, 18+ | No subdivision needed | Normal restricted ads | Notice route; independent Stop | Separately requested |
| Australia, 15–17 | No subdivision needed | Teen purpose consent while NY scope remains unresolved | Separate teen consent | Separately requested |
| Australia, 13–14 | No individual capacity/guardian verification | Current route held for unestablished authority | Same | Same |
| Mexico, 18+ | No subdivision needed | Normal restricted ads | Notice route; independent Stop | Separately requested |
| Mexico, 13–17 | Guardian authority not collected | Current route held for unestablished authority | Same | Same |
| Any country, age unknown/refused or outside 13+ audience | Unresolved/invalid age | No inferred adult access | Same | Same |
| Country unresolved/outside AU/CA/MX/US | Any | No inferred launch-country permission | Same | Same |

The age rows describe the processing gate, not a new local-play ban. Apple's declared range is consumed without persisting a birthday. Pure policy tests for finer ranges or reviewed NY exemptions do not claim that the production coordinator obtains those extra facts.

## Smallest geographic flow and Quebec exclusion

Canada alone does not establish a province. The existing Info / claimed result-exit privacy panel asks whether the user lives in Quebec: Yes, another province/territory, or Not sure. It does not ask for a full address, GPS permission or all provinces. An unanswered/failed read remains unresolved and recoverable; it never silently clears an exemption. There is no new first-play question.

**Quebec is not excluded.** The local answer is a privacy-rule clarification, not tamper-resistant residence proof or a distribution block. Apple's documented availability controls select countries/regions using the Apple Account country, not an independently verified Canadian province ([Apple availability documentation](https://developer.apple.com/help/app-store-connect/manage-your-apps-availability/manage-availability-for-your-app-on-the-app-store)). No workable Quebec-only distribution restriction is claimed or installed. Exclusion is not needed to give established non-Quebec adults the normal ad-funded route; Quebec's required choices remain. Canada stays available.

## Why these restrictions match the configured processing

- **Quebec:** the configured Google route still uses device/app information, IP-derived approximate location and ad interactions; RevenueCat uses a random persistent app identifier and ad-event/device metadata. These are not camera/exercise payloads and are not an anonymous/no-personal-data exemption. The function-activation treatment is an application of the reviewed route to Quebec's identification/location/profiling rules, not a claim that all advertising everywhere needs consent ([Quebec regulator, Law 25 changes](https://www.cai.gouv.qc.ca/protection-renseignements-personnels/sujets-et-domaines-dinteret/principaux-changements-loi-25)). A generic old grant does not substitute for the separate disclosed activation.
- **Connecticut minors:** the authenticated configuration is restricted multi-buyer AdMob demand, not proven Google-only processing. Existing evidence does not establish minor-specific necessity/retention for that route or optional RevenueCat reporting. The CT branch therefore stays held; a consent button cannot create that basis. Unknown CT residence is a separate missing fact, resolved by the existing one-question flow ([Connecticut statute, 42-529a/d](https://prdext2.cga.ct.gov/2026/sup/chap_743jj.htm)).
- **New York minors:** state/residence alone does not prove that a purpose's activity/data falls wholly outside NY. The production configuration has no verified provider-use/history evidence satisfying all parts of that exemption. The current fallback asks separate teen consent; it does not assign NY residence. Removing the fallback for all non-NY residents would invent the missing exemption ([899-ll](https://www.nysenate.gov/legislation/laws/GBS/899-LL)). Advertising and optional ad analytics have no established strictly-necessary service basis here. The existing panel now explicitly explains the optional data use and puts refusal first with greater visual prominence; refusal does not block local play ([899-ff](https://www.nysenate.gov/legislation/laws/GBS/899-FF), [NY Attorney General guidance](https://ag.ny.gov/child-data-protection-act-guidance)).
- **Australia/Mexico:** these are existing national capacity/authority gates, not assumptions about one state. The app has no case-by-case under-15 Australian capacity/guardian service and no verified Mexican minor representation mechanism. Adult paths are unaffected ([OAIC B.59–61](https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-b-key-concepts), [Mexico data law](https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf), [civil capacity](https://www.diputados.gob.mx/LeyesBiblio/pdf/CCF.pdf)).
- **Other US state opt-outs:** the preserved route is non-personalized with restricted data processing. A sale/sharing/targeting opt-out is not recast as a universal advertising refusal. NPA still uses identifiers for functions such as frequency control and aggregate measurement; it does not prove zero personal data ([Google NPA documentation](https://support.google.com/admob/answer/7676680?hl=en)). This is the existing reviewed route, not a renewed 50-state audit or certification of every buyer.

## Verification and remaining limits

See adjacent regional-stop-checks-2026-09-20.json and regional-stop-package-2026-09-20.json for actual final results, regression names, before-fix failures and required input hashes. Final results: **60 suites / 1272 tests passed, zero failed or pending**. TypeScript, strict lint and production release/privacy validators exited 0. Local EAS package: **778 files / 285 required inputs**, all byte-identical; inside-package release validator exited 0 and exclusion checks passed. An initial new Apple-required fixture lacked the separate simulated account-clearance prerequisite; that failed run is recorded rather than counted as a pass. No assertion, existing test or dependency was removed to pass.

The package is an actual local EAS archive-stage inspection, not a cloud/native build. Required source/runtime/models/assets/patches/configuration and manifest/validator inputs are compared byte-for-byte; the release validator runs inside that copy. Private/signing/environment material and excluded web/backups/caches are checked.

**Still unresolved:** the provider/data-history proof needed to narrow the NY teen fallback remains unavailable; no territorial exemption or completed NY narrowing is claimed. If Quebec exclusion is pursued later, its actual enforcement must be established first. Neither issue is relabelled as something a device test can resolve. Final compiled-artifact checks, installed iPad/iPhone acceptance, actual RevenueCat receipt and Apple submission gates remain separate. Build remains held.
