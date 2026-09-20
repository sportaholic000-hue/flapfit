# Supplied Apple readiness review: current-source resolution

The supplied review inspected main `f39190d6ae2a84c8ba97624b5c917295f0b1ec7d`. Before correction work, latest completed evidence was pushed at `6248c71ab02101bb561e572a825ac19d11b88b57` on `wip/crash-protection-20260920`; the implementation was already pushed at f4b191d. This record reconciles the supplied findings with that successor and the scoped fixes committed alongside this evidence. It does not mark the app ready for submission.

## Finding-by-finding result

| Finding | Disposition | Specific current evidence |
| --- | --- | --- |
| 1 | REPRODUCED AND FIXED (remaining competition entry); post-game ad/reporting flow ALREADY FIXED | Original main lacks the launch coordinator. Current base already connects root country/Apple evidence and claimed result exits to actual notices/choices. Current-base Compete saved its purpose choice but never called eligibility preparation; fresh users depended on a game-result visit. Now the real Compete screen starts independent eligibility only after saved terms and native dismissal, without ad notice or either SDK initialization. Rendered terms tests plus actual coordinator tests cover all four adult countries, failed save, cancellation and retained existing ad eligibility. |
| 2 | ALREADY FIXED | launchProcessingControl -> verifyLaunchAgeEvidence -> launchProcessingPolicy is the active four-country path. The legacy US/CA regionalPolicy is not the active launch-country resolver. Actual coordinator tests exercise US/CA/AU/MX adult permission/refusal/restart; CA14+/AU15+ teen choices and independent withdrawal; unsupported/unknown/declined and parental-authority-required paths remain restricted. No territory change or new guardian-permission collector. |
| 3 | REPRODUCED AND FIXED (competition stop); reporting controls ALREADY FIXED | Info already renders independent reporting controls via PrivacyChoices -> refuseProcessingPurpose -> withdrawAdPerformanceReporting, including actual save/native confirmation and rendered retry after both failures. stopOnlineCompetition had no production screen caller. Info now exposes it independently, retaining retry through remount after unconfirmed storage and never stopping permitted ads/reporting. Support/deletion remain exposed outside eligibility gating. No competition control added to the result privacy sheet. |
| 4 | ALREADY FIXED; verification extended | Active launch plan derives treatment/underAgeOfConsent from country-specific thresholds and central access forwards the plan, bypassing the old generic teen-only derivation. Real coordinator-to-Google tests verify TEEN and UMP false for eligible CA/AU teens and US teens. Added actual-coordinator checks verify CHILD/underAgeOfConsent true and no SDK load where CA13/AU13-14/MXminor lack verified guardian authority. Existing adapter CHILD mapping tests remain. No fictitious parental grant was added to make an eligible-child test pass; the production app does not collect that authority. |
| 5 | ALREADY FIXED in successor source; artifact alignment remains open | Live privacy policy read September20 describes Info > Privacy & choices, separate reporting, CT clarification and optional result-exit setup, matching current production paths. Lobby calls requiredOnly; game.tsx claims result action before preparePostGamePrivacy. Source f4b191d was already remote; completed work was pushed first at6248c71. Existing artifact04cf2e97 contains the prior corrected manifest/regional/rights implementation but not this follow-up competition wiring. It is not a final acceptance candidate. |

## Completed correction and source/package verification

Compete now establishes its own age/regional eligibility after the existing rules are accepted and the native terms sheet has actually dismissed. No game or ad setup is a prerequisite. The shared presentation/game-entry barriers remain in force. Existing eligibility and prepared ads are preserved on later visits. Info exposes Stop online competition independently of ads/reporting, with truthful unconfirmed-save state and a retry retained after remount. Profile deletion/support remain independent. No onboarding, calibration, recording, ad-placement, permission, country, dependency or native configuration changes.

All **59 suites / 1133 tests passed**, with every tracked/new suite covered. TypeScript, strict applicable lint, production release/manifest validators and whitespace checks passed. The first full run's five fixture failures are retained in JSON, together with the exact final-run proof; no tests or behavioral assertions were removed. The tests operate at source/rendered boundaries with native/provider mocks, not physical devices.

The actual local EAS upload-stage package contains **761 files**; **284 required inputs** byte-match the corrected source. The release validator ran **inside that packaged copy** and passed. Models/assets/patches/configuration and corrected manifest validators survive; credentials/signing files, web/backup content, Expo state and dependencies are excluded. Per-file hashes are saved beside this record. No cloud build or source/signing upload was launched.

The older three focused findings remain verified: the exact unrelated-write-failure/restart case preserves a reporting refusal and never loads RevenueCat; both withdrawal failures retain rendered retry and actual confirmation state; privacy continuation waits for native dismissal in component/service tests. Physical dismissal/Google/result sequencing remains open.

## Existing artifact inspected, not a corrected acceptance candidate

Existing EAS `04cf2e97-63f0-43f2-af1a-0002414c9d13`, source `f4b191dbda7eb17bcb5811cafb8c34eb9b7c6657`, **1.0.0 (4)**, internal `ios-device-check`, finished September20 19:35:20 UTC. Its IPA SHA-256 is **`410c26d7765da88d07b903eb1257fb0e9da91b2389aa2fc7d4783231b61830c0`**. It was downloaded and inspected without launching a build.

Signed bundle `com.flapfit.game`, existing two-device profile/certificate, iPhone+iPad support and age entitlement passed. Actual archive/IPA identity and JavaScript match; checksum and archive integrity passed. Nine corrected app-owned privacy declarations, fourteen unchanged SDK manifests, required reasons, camera/mic strings, native RevenueCat/UMP patches and six byte-matched tracking resources passed. Test ad ID and real permitted RC configuration are present. Native worker fences/purge/relaunch harnesses passed; archive succeeded with zero compiler errors and no privacy-related warnings in the inspected compiler log.

Diagnostics are **not all green**: Expo Doctor19/21 reports the omitted-worker-gitignore warning (source ignores .expo and the actual package excludes it) and seven patch-version recommendations. Locked dependencies were preserved. The compiler log contains1949 warning lines, with categories recorded in JSON. Successful compilation is not device acceptance.

This artifact **does not include today's competition wiring**. It can substantiate its own unchanged native/manifest inputs, not certify the corrected successor. No new build, Apple upload, privacy publication or submission occurred. The separate Xcode Organizer PDF is **not generated/deferred**, as the owner directed.

## Apple findings: complete versus remaining

Already complete evidence retained: owner listing/categories/URLs/reviewer notes; reviewer contacts visually verified after Save and two reloads; Content Rights;13+/non-medical; Free; exactlyAU/CA/MX/US; automatic release choice; secure upload credentials with read-only authentication. The review's blank-contact observation was the same AX/DOM omission previously corrected by actual visual readback. No private contacts appear here and no saved fields were rewritten.

| Remaining action | Exact place | Dependency |
| --- | --- | --- |
| Supply genuine phone/tablet screenshots | Version1.0 > Previews and Screenshots:6.5-inch or supported6.9-inch iPhone;13-inch iPad | Device captures at accepted sizes, then authorized upload |
| Verify/publish final saved privacy label when authorized | App Privacy | Corrected artifact/configured-flow reconciliation; current publication not proved by Publish button alone |
| Transfer accepted Store binary, resolve actual processing/compliance result and select it | TestFlight/Version1.0 > Build | Final Store-distribution binary and separate upload authorization; no build presently selected in retained live evidence |
| Submit complete accepted record | Version1.0 > Add for Review/Submit for Review | Final accepted build and owner authorization |

Saved twelve-category privacy answers remain populated, not a blank section. Export/compliance has no actual build-specific prompt yet; it is not an unanswered observed field. Missing CI runs on older main do not establish a failed check or an Apple requirement.

Installed-device acceptance, genuine RevenueCat receipt and real Apple transaction/status/link/rescission remain separate proofs. They cannot be completed by these source tests, prior Sandbox TEST delivery or another checklist label. One consolidated iPad pass precedes the essentially finished iPhone candidate; no intermediate build was sent to the brother.

Live policy readback: https://flapfitapp.com/privacy/ (September20). Current paths match its result-exit/Info/independent-reporting description. Website content and Apple reviewer wording were preserved. This reconciliation covers the supplied review and earlier three focused findings; it does not invent access to another unpublished review.
