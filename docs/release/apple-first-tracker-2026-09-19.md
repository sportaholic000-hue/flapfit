# Apple-first completion tracker — September 19, 2026

Owner goal: an evidenced Apple submission candidate within 18 hours. Owner reviews before Submit for Review.
Source checklist: FlapFit_Apple_First_Launch_Checklist.md supplied September 19; audit baseline 453e363f0b2fcbbe0d522777f92fe2888946addd.

## Candidate and boundaries

- Binary source: 5f5d69c1540e8c5b40c21b155ce9ded514884e94 on main, pushed and clean when build initiated. Later tracker/listing documentation does not alter the binary.
- Bundle: com.flapfit.game; App Store ID 6813280704; SKU flapfit-ios; Expo project bbbfea4f-3047-46f6-a5ba-6286356e4718.
- Owner-confirmed Apple title: **Flap Fit Workout Game** (no colon). Subtitle: **Home Fitness & Tracking**. Saved fields observed in App Store Connect.
- App version 1.0.0; App Store version record 1.0. Remote build number initialized to 1, then incremented to 2 on the interactive attempt. No completed artifact yet.
- Accepted tracker 2026-09-18.9-foot-return and protected recorder/gameplay sources unchanged. No new calibration experiments.
- No final Apple submission or public release authorized by this tracker.

## Item-by-item evidence

| Item | Status | Evidence / next required action |
| --- | --- | --- |
| A1 candidate | Verified | Full source commit, identity and clean main verified above; remote main matched. |
| A2 actual upload contents | Verified | Actual EAS makeShallowCopy archive: 585 files, 87 assets + 97 build/source files byte-equal; nine required configuration/patch files. iOS release validator passed from extracted archive. See audit-fixes-2026-09-19.md and evidence JSON. |
| A3 ad resources | Verified — source/SDK | Patched installed SDK 16.5.0 removes internal subscription and native ownership. 10/50/100 lifecycle tests return subscriptions to zero; iOS codegen passes. Physical/native acceptance remains C4. |
| A4 permission refresh | Verified — source | Explicit Settings-return refresh, no ordinary foreground reset; automated regression tests pass. Device evidence remains C5. |
| A5 accepted instructions | Verified | Onboarding and reviewer notes corrected; Info already describes tiptoe overhead reach, then top Step 1 and bottom Step 2. No threshold change. |
| A6 unlock and Daily Challenge | Verified | Hydration/current unlock guard; Endless after level 5; Daily Challenge cases pass. |
| B1 locked source checks | Verified | Immutable Yarn install, 406 tests in 35 suites, TypeScript, strict lint, packaged release validation. |
| B2 integrity/advisories | Verified — with disclosed residual | Asset/patch/entry checks passed. Known credential patterns: zero matches in 310 tracked files and 613 archive/validation files (not history or exhaustive scan). Fresh registry audit: 29 advisory rows, 6 deprecations, zero critical. Moderate malformed-URL runtime DoS remains; build/test advisories are separate. See evidence JSON and dependency-audit.md. |
| B3 signed iOS build | Blocked — Apple login | Noninteractive attempt stopped before compilation because signing was missing. Owner approved certificate/profile setup. Interactive production build is at Apple ID prompt; private login window requested. No certificate revocation. |
| B4 final native privacy/permissions | Blocked — artifact | Inspect signed artifact, native manifests, privacy report and actual upload diagnostics after B3. Source declarations alone are insufficient. |
| B5 installed artifact identity | Blocked — artifact | Record actual build UUID, version/build, checksum and installation once available. |
| C1 startup/play | Blocked — device candidate | Owner confirms iPhone + iPad available. Use equipment-free Squats/Sky, no additional pull-up experiments. |
| C2 full video/audio recipient | Blocked — device candidate | Prior Expo Go results are not signed-build proof; verify complete received clip and duration. |
| C3 sharing/return/cancel | Blocked — device candidate | Verify same result/clip survives cancel/return and does not trigger an ad automatically. |
| C4 consent/result ads | Blocked — device candidate | Use test ads/registered devices; no artificial live clicks. Verify one exit action, no-fill and no late ad. |
| C5 permissions/interruptions | Blocked — device candidate | Deny, Settings grant, return, interruptions and subsequent run. |
| C6 online features | Blocked — acceptance evidence | Reconcile prior live deletion evidence with unchanged backend; do not delete a real player. Native terms/report/block flow still needs candidate. |
| C7 iPhone/iPad layouts | Blocked — device candidate | Both device families remain enabled; owner has both devices. |
| D1 served pages | Verified | Site version 27 published. Actual custom-domain privacy/terms/deletion/support/home/app-ads/config responses all HTTP 200 and authored content matches source. Cloudflare security script injection documented. Homepage/design unchanged. |
| D2 data disclosures | In progress | Website correction covers AdMob, RevenueCat, optional competition, local video/audio, separate retention and deletion. Reconcile final artifact/provider settings. |
| D3 consent configuration | In progress | Source UMP + no-IDFA/nonpersonalized configuration confirmed; published regional messages and under-age/region treatment still require console evidence. PG filtering does not establish age-of-consent treatment. |
| D4 support/deletion/moderation | In progress | Owner confirms support@flapfitapp.com tested and working. Website now explains lost anonymous sessions and identifiers are not ownership proof. Pending moderation item still needs review. |
| D5 ad-provider readiness | In progress | app-ads.txt added for current publisher. Verify console readiness and permitted RevenueCat event receipt; provider activation/contest evidence alone does not block Apple. |
| E1 listing/category | In progress | Name/subtitle saved. Health & Fitness, Games/Action observed. Description, promo, keywords, support/marketing URLs, copyright and reviewer notes saved; completed save observed with persisted form values. No removed codes or invented health claims. |
| E2 genuine screenshots | Blocked — candidate/device | iPhone/iPad screenshot slots empty. Use real candidate captures; contest assets and app-preview video are not required gates. |
| E3 App Privacy | Blocked — final binary evidence | Vendor docs require RevenueCat Purchase History disclosure even though no purchases are offered; no exemption assumed. Complete answers after B4 reconciliation. |
| E4 account/regional declarations | In progress | Age ratings, applicable trader/territory, agreements, export and medical-device declarations still need verification. Do not invent or sign owner-only legal declarations. |
| E5 reviewer instructions/contact | In progress | No-login selected and Squats/Sky reviewer notes entered; private reviewer phone still needed in Apple form. |
| E6 free/territory/release | Blocked — owner choice | Free app intended; console currently defaults automatic release. Confirm intended territories/release choice before changing. |
| E7 processed build attachment | Blocked — build | No build attached. Upload/processing is distinct from final review submission. |
| F1 release evidence sheet | In progress | This tracker plus audit evidence records known checks and missing proof. |
| F2 go/no-go | Blocked | NOT APPLE SUBMISSION-READY until signed artifact, acceptance and required store/privacy/account fields complete. |
| F3 Submit for Review | Blocked — owner review | Explicit owner review required; not performed. |

## Deferred from Apple

Android store/testing work, contest media/write-up and cosmetic polish. Existing shared Android callback repair remains included. No additional feature or calibration work.

## Evidence locations

- Source audit evidence: docs/release/evidence/audit-fixes-2026-09-19.json.
- Local working evidence: workspace work/audit-fixes-20260919 (Jest, codegen, archive, scan, EAS output). No private signing files in source.
- Website source: 229fb8f5f8a00b2ce6147ccfd124f868670e3d97; existing public Site appgprj_6aa368d995348191b4206fa03f951b3a, version 27. Deployment appgdep_6aae207df8388191820ca89850fde156 succeeded. Provider URL https://flap-fit.sportaholic000.chatgpt.site; custom domain https://flapfitapp.com verified against served content.
- Google disclosure source checked Sep 19: https://developers.google.com/admob/ios/privacy/data-disclosure
- RevenueCat disclosure source checked Sep 19: https://www.revenuecat.com/docs/platform-resources/apple-platform-resources/apple-app-privacy
