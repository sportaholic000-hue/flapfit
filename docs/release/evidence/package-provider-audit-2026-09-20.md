# Package/source reconciliation and authenticated provider audit

Inspected source: `30dffe412a08d13a8e836d7b8abd19eac24470ef`, branch `wip/crash-protection-20260920`. Authenticated browser readback: September 20, 2026. This record supersedes older contradictory readiness summaries only for the facts below. No build, binary upload, deployment, credential change, Apple edit or privacy publication was performed.

## Package/source result

All 284 retained EAS package inputs were compared with raw Git blobs at the identified commit and the recorded package SHA-256 values. **246 match exactly; 38 differ only in CRLF/LF line endings; zero content differences.** Normalization replaced CRLF with LF only: no whitespace, text or syntax was removed. All recorded package hashes matched the retained actual package, and all checkout inputs matched that package before the normalization below.

The four previously unexplained files had mixed endings, not uniformly CRLF endings:

| Path under apps/mobile | Commit CRLF / LF | Recorded package CRLF / LF | Result |
| --- | --- | --- | --- |
| app.config.js | 0 / 28 | 3 / 25 | Identical after CRLF-to-LF only |
| script/build_and_run.sh | 0 / 103 | 1 / 102 | Identical after CRLF-to-LF only |
| src/app/_layout.tsx | 0 / 79 | 2 / 77 | Identical after CRLF-to-LF only |
| src/utils/game/__tests__/camera-preview.test.ts | 0 / 72 | 1 / 71 | Identical after CRLF-to-LF only |

Counts above distinguish CRLF from bare LF; no bare CR exists. Raw and normalized SHA-256 values and all 284 comparisons are in `package-source-hash-reconciliation-2026-09-20.json`.

**Correction:** normalized those four working files to the exact existing Git blob bytes and pinned only those paths to `text eol=lf` in `.gitattributes`. This also removes the CR from the shell helper's final `esac` line. No application logic changed. No Bash execution is claimed. The original retained package and its recorded hashes were preserved.

Fresh actual local EAS archive inspection after this formatting correction: see `package-source-normalized-package-2026-09-20.json`. All 284 required inputs match the checkout; all four corrected files exactly match the original commit bytes; `.gitattributes` survives packaging. The production release validator ran **inside the new package** and passed. Credential/signing, dependency, Expo state, backup and web exclusions were checked again. This inspection copies files locally; it does not build or upload.

Prior full verification remains applicable: all 59 suites / 1,133 tests, TypeScript, strict applicable lint and production release/manifest checks passed for the same application content. Exact coverage comes from the per-file comparison, not from test totals alone. Those completed checks were not rerun unnecessarily. Existing privacy-refusal/retry/native-dismissal and competition-entry/withdrawal fixes remain intact.

## Verified authenticated settings

| Service / location | Actual saved state or readback |
| --- | --- |
| Apple app / version | Flap Fit Workout Game, app 6813280704, bundle com.flapfit.game; version 1.0, Prepare for Submission. No selected build. TestFlight explicitly says No Builds; no processing row or actual build-specific compliance prompt. |
| Apple listing and review information | Owner listing, subtitle, description, keywords, support/marketing URLs, categories Health & Fitness / Games / Action, reviewer notes and no-login choice retained. Notes describe independent competition eligibility and withdrawal. Prior actual visual Save/two-reload verification of correct reviewer contacts is reused from `completed-work-before-review-2026-09-20.md`; AX omissions are not reopened as blank fields. |
| Apple declarations | Content Rights: necessary rights to third-party content saved. Non-medical declaration saved. Existing 13+ setting retained; Apple's older-OS/global regional 12+ display is not an instruction to change it. Secure EAS upload authentication from Tasks 3–4 remains completed and was not repeated. |
| Apple pricing / availability / release | Current price $0.00, including AU/CA/MX/US currencies. Exactly Australia, Canada, Mexico, United States available; 171 not available. Automatic release after approval selected. Mac checkbox off. Vision Pro checkbox on, but Apple explicitly says version 1.0 is incompatible and not available there; these are distinct facts, not a Mac/Vision release claim. |
| Apple App Privacy | Both privacy URLs are https://flapfitapp.com/privacy/. Twelve saved categories and displayed purposes/linkage match the four-country worksheet: Fitness, Coarse Location, Gameplay Content, Other User Content, User ID, Device ID, Product Interaction, Advertising Data, Crash Data, Performance Data, Other Diagnostic Data, Other Data Types. Crash Data is not linked; the other eleven are linked. No tracking section appears in the saved preview. No answers changed. |
| RevenueCat project / apps | Project a58d3dbd; existing iOS app app23ef6df569 and Android app app5d011c6989 use com.flapfit.game. iOS in-app-purchase key shows Valid credentials. No SDK-version data yet. The account warns it cannot add app configurations; existing configuration is readable. |
| RevenueCat AdMob connection | Connected to publisher pub-5933597810180440, with admob.readonly and admob.report scopes. This confirms configuration, not event receipt. |
| RevenueCat received data | Ads page shows its initial Start tracking in-app ad revenue view in both sandbox and production. No receipt evidence. Sandbox view restored after inspection. No Apple server notifications received; the app has no IAP and this is not the consent-service notification route or EAS upload credential. Blank optional RC product-import API-key fields do not reopen upload authentication. |
| AdMob iOS identity / unit | App ca-app-pub-5933597810180440~5139925774; sole unit Flap Fit iOS Result Exit, interstitial ca-app-pub-5933597810180440/2284241303. Both match verified EAS configuration. Zero active mediation groups and zero campaigns for this unit. |
| AdMob serving controls | Text/image/rich media and video; Google-optimised All prices floor; no console app/unit cap; high-engagement ads On. Existing source controls first exit free, every two exits and 90 seconds, result-exit-only. No console control was changed or represented as a proven physical ad experience. |
| AdMob privacy messages | Flap Fit US Privacy and Flap Fit European Privacy are Published, modified September 19, each assigned to Flap Fit iOS and Android. European entries use the correct privacy URL; fallback deployment off. Zero messages shown. IDFA explainer unconfigured, consistent with no ATT request. US settings use 333 active ad partners and app-request RDP control. Existing reviewed restricted multi-buyer/NPA/RDP configuration remains; no unsupported Google-only claim. |
| AdMob policy / readiness | Policy centre: No current issues; No disapproved apps. App status separately Requires review; store details blank. App verification currently says Not required with Verify app disabled. Home setup 3/4 complete; store linkage is the remaining setup item. Payment-profile setup is marked complete; no bank/credential changes. |
| AdMob activity | Last-seven-day app view: zero requests, impressions and revenue. Account banner warns of over five months inactivity and automatic deactivation after six months without ads. This is a warning, not proof it has already deactivated. |

## Exact remaining items before release

| Remaining item | Exact location / needed action | Dependency |
| --- | --- | --- |
| Genuine screenshots | Apple version 1.0 > Previews and Screenshots: iPhone 6.5-inch and iPad 13-inch currently 0/10. Supported 6.9-inch phone alternative remains documented. Supply truthful accepted-size phone/tablet captures, then upload when authorized. | Screenshots/device evidence |
| Final privacy publication verification | App Privacy has saved answers, but no authoritative publication timestamp/state was exposed. Publish button alone proves neither published nor unpublished. Reconcile final compiled/configured flow, then verify/publish with authorization. | Final artifact and authorized console action |
| Final binary, processing and attachment | TestFlight > No Builds; version > Build empty. An accepted Store binary must eventually be uploaded, pass actual Apple processing/validation, answer any real compliance prompt, and be selected. | Final Store artifact and upload authorization |
| Apple review submission | Version 1.0 > Add for Review / Submit for Review, after acceptance and the above requirements. | Completed accepted record and owner authorization |
| AdMob store linkage and approval | Flap Fit > App settings > App store details / Approval status. Link the publicly accessible store listing, complete any then-required app-ads.txt verification, and obtain readiness approval. Current Not required verification label does not mean future monetization approval. | Public store listing and provider review |
| AdMob inactivity risk | Account-wide warning. Complete legitimate launch/serving when ready; if Google deactivates the account, use its actual reactivation/verification flow. No fake impressions, live-ad test clicks or premature release. | Account/provider state and legitimate activity |
| Genuine RevenueCat receipt | Ads dashboard still has no received data. Match permitted installed-app events to real provider receipt and verify withdrawal/relaunch; do not invent revenue or treat Connected as proof. | Installed corrected app and provider receipt |
| Final physical and Apple integration evidence | Consolidated iPad acceptance, then essentially finished iPhone pass; actual native dismissal/Google/result action sequencing, full-length audio/video sharing, real Apple transaction/status/rescission and applicable return behavior. | Corrected installed artifact / physical devices / Apple |

The retained device artifact 04cf2e97 is still source f4b191d: it contains corrected native declarations but lacks the later competition fixes in 30dffe4. It is not the final acceptance candidate. A future corrected artifact must receive its own native manifest/required-reason/permission/configuration checks. The separate Xcode Organizer PDF remains **not generated/deferred**, not a release requirement reopened by this audit.

## Evidence limitations and corrected interpretations

- No application-content divergence was found; the four unexplained hashes were mixed endings. The only source-policy change is the four-path LF rule. No dependency upgrade or application redesign.
- Reviewer contacts, Content Rights, regional source work and upload credentials are completed, with their newer evidence preserved. Older contradictory findings remain superseded.
- No current AdMob policy issues does not equal app approval. App verification Not required does not equal store linkage or readiness. RevenueCat Connected does not equal event receipt.
- The public seller file has existing September 20 HTTP-200/content-match evidence in `regional-live-site-check.json`. A fresh read through the research tool was unavailable and the browser blocked that resource; this does not establish a website failure. Google crawler verification remains separate from that existing website proof.
- The read-only audit changed no Apple/AdMob/RevenueCat settings. Disclosure publication, production ad serving, device acceptance and submission readiness are not marked complete.

Provider references: [Google app setup and publicly accessible listing requirement](https://support.google.com/admob/answer/9989980?hl=en), [app verification/readiness](https://support.google.com/admob/answer/14538460?hl=en), [app-ads.txt website discovery](https://support.google.com/admob/answer/9363762?hl=en), [inactive-account deactivation/reactivation](https://support.google.com/admob/answer/10491752?hl=en). These explain the remaining actions; the authenticated UI facts above establish this account's current state.
