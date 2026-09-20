# Flap Fit Apple readiness review — September 20, 2026

**Verdict: pushed main is not ready for submission.** Its automated checks pass, but its production privacy integration is incomplete, its published policy/reviewer notes describe newer behavior, and App Store Connect has no uploaded build or screenshots. This review distinguishes current source, recorded artifact evidence, fresh local tests, and live Apple console observations.

## Scope and source identity

- Reviewed main: `f39190d6ae2a84c8ba97624b5c917295f0b1ec7d`, rechecked against remote main during review.
- Requested comparison baseline: `ccb0172887786179bfc814f7caabf395598c802c`; exactly six commits ahead, 39 changed files.
- `ccb0172` **records** a signed candidate. The recorded artifact was actually built from `0be68de0666c27f3151ae544de07b374eca54937`.
- Recorded build: `710512ba-6445-42d8-af23-659d862a3298`, app 1.0.0/build 2, internal Ad Hoc distribution. Recorded IPA SHA-256: `0fa9fde8a47b4df076ea319fb64dadb57228c9937c66ea5ba210adbc3df6e12d`.
- Its saved artifact report includes the age-range entitlement in binary/profile and both device families. That report is not a newly inspected IPA or installed-device test in this review.
- No app source, remote repository, backend, territory, metadata or submission setting was changed. Dependencies were installed into a separate review checkout; tracked files remained clean.

[Six-commit comparison](https://github.com/sportaholic000-hue/flapfit/compare/ccb0172887786179bfc814f7caabf395598c802c...f39190d6ae2a84c8ba97624b5c917295f0b1ec7d)

## Confirmed source blockers

### 1. Real users cannot complete the processing-permission flow

Fresh state starts with unknown region, unresolved purpose requirements and no verified age. Root startup hydrates choices and checks Apple duties. The sole production age-request caller requests only the mandatory Apple check, without regional context. That path intentionally leaves all purpose requirements unresolved.

Production call-site inspection found no caller establishing `setPrivacyRegion`, `setProcessingRequirements`, or `markProcessingNoticePresented`. No production grant caller connects the regional resolver to the app. `Compete` acceptance only updates `competitionTermsVersion`; it does not grant the separate competition processing choice.

Consequence: ads, RevenueCat and competition remain blocked for a fresh install. Restoring an old choice does not restore the missing current verification/policy. This is a source integration gap, not an AdMob no-fill problem.

Fresh execution of the real policy function after hydration and a not-required Apple result returned `allowed:false / region-unconfirmed` for all three purposes. The passing native-ad tests inject permitted processing fixtures, so they cannot prove a real player reaches the permitted branch.

**Acceptance:** an eligible person using the real screens can obtain the separately permitted ad/reporting/competition outcomes; required refusals remain effective; no test grants, universal optional-ad switch, or global RevenueCat shutdown is used as a shortcut.

Source: `apps/mobile/src/services/privacy/processingAccess.ts`, `processingPolicy.ts`, `appleAgeControl.ts`; `apps/mobile/src/app/(tabs)/compete.tsx` lines 807–814; `apps/mobile/src/utils/game/store.ts` line 302.

### 2. The source does not cover the actual four-country launch

Live Apple availability is **Australia, Canada, Mexico and United States**. The old 172-territory tracker entry is stale.

The pushed `regionalPolicy.ts` explicitly handles US/Canada only. Every other country returns `other / worldwide-not-cleared`; the central policy independently rejects `region:other`. Australia and Mexico therefore have no cleared processing path in this source. The new website describes handling for these countries, but that implementation is not in the reviewed main.

**Acceptance:** finish and review the actual four-country policy and runtime wiring. This review does not authorize changing territories. Broader worldwide implementation and EU availability work need not block this four-country submission.

### 3. Withdrawal services are not connected to the UI

`privacyRights.ts` contains useful reporting-withdrawal and competition-stop services, including separate storage/native-stop confirmation. Neither service is called by a production screen. Info renders Google's advertising privacy row only when UMP reports it required; that is not an independent RevenueCat reporting control.

Deletion and support remain exposed independently of current competition access; retain that behavior.

**Acceptance:** applicable rights are reachable through real screens, even if ads/analytics never initialized or UMP does not require its form. Stopping reporting must not disable independently permitted ads. Failed persistence/native shutdown must remain retryable and must not display false success. Confirm queued/native work and relaunch on the device.

### 4. The newest ad-treatment fix does not establish the threshold

`f39190d` correctly maps `underAgeOfConsent:true` to Google `child` treatment on both initialization paths. Google documents CHILD as equivalent to the prior TFUA/TFCD child treatment; TEEN does not carry all those protections. [Google age-treatment documentation](https://support.google.com/admob/answer/6219315)

However, `verifyTransientAge()` sets `underAgeOfConsent` to `!adult && !teen`, where teen means any known lower bound of at least 13 below 18. Direct execution yielded false for ages 13, 14, 15 and 16. It contains no regional consent-threshold input. The newest tests manually supply a teen plus `underAgeOfConsent:true`; the current real policy does not produce that combination for an eligible teen.

**Acceptance:** the regional decision must supply the applicable protection, with an end-to-end policy-to-adapter test. This finding does not assert that all teens universally require CHILD treatment. It establishes that the conditional mapping alone cannot demonstrate correct regional treatment.

### 5. Release descriptions are ahead of the reviewed source

The live September 20 privacy policy and saved Apple reviewer notes describe `Info > Privacy & choices > Advertising & reporting`, separate reporting controls and optional setup after a result exit. Those paths are absent from `f39190d`, whose monetization preparation still runs from lobby focus.

**Acceptance:** identify and push any newer implementation already completed elsewhere; review that successor rather than rebuilding these features twice. Align the tested artifact, reviewer instructions and policy. No claim about unseen local work is made here.

[Live privacy policy](https://flapfitapp.com/privacy/)

## Six-commit disposition

| Commit | Source review result | Additional evidence needed |
| --- | --- | --- |
| `63aa060` — Apple verifier compatibility | Bounded Deno 2.1.4 compatibility adapter preserves official signature, chain, environment and revocation checks. Fresh backend tests pass. | Deployment remains supported by recorded readback and Sandbox TEST evidence; real signed app-transaction status/link and rescission need integration proof. This backend-only change does not itself require an iOS rebuild. |
| `6a6ccdb` — privacy startup | Root caller, hydration and unresolved-duty retry are present. No SDK grant is inferred. | New embedded app build; cold launch, stored refusal and foreground behavior. Does not finish regional policy. |
| `85f787b` — privacy rights | UMP native access is decoupled from ad eligibility; request serialization and withdrawal services are covered by tests. | Wire independent controls; verify native form dismissal and reporting cancellation/purge on device. |
| `5a956b1` — required Apple age request | Lobby invokes mandatory check after positive duty, serializes native presentations, does not treat age as consent. | Installed supported-OS behavior, decline/error/unsupported cases, transaction status/linkage; complete regional integration. |
| `5e09719` — resume permitted ads | Effective-policy subscription and stale-request protections are present and tested. | Real UI must produce the permitted decision; device checks for form/game-entry races and no late ad. |
| `f39190d` — restricted ad treatment | Both paths map the under-consent flag to CHILD; fresh full suite passes. | Fix/verify upstream regional flag derivation and native request configuration. |

The six commits do not change the package lock, mobile dependency list, native modules/plugins, game screen or game utilities. That reduces regression scope but does not put the changed JavaScript into the older IPA. A completed successor needs a fresh App Store distribution build. Old compilation evidence supports feasibility, not acceptance of the new behavior.

## Live App Store Connect findings

These were read from the authenticated Apple UI during this review, superseding old checklist entries.

| Item | Current observation | Action |
| --- | --- | --- |
| App version | 1.0, Prepare for Submission | Remains pre-submission. |
| TestFlight | **No Builds** | Produce and upload an App Store distribution build; wait for processing. |
| Version build attachment | No build attached | Attach the processed, accepted candidate. |
| iPhone screenshots | **0 of 10** in displayed 6.5-inch slot | Upload genuine screenshots in Apple-accepted sizes. |
| iPad screenshots | **0 of 10** in 13-inch slot | Upload genuine tablet captures. |
| Reviewer phone/email | Both fields empty; checked field values without exposing private data | Complete and save privately. |
| Listing | Name, subtitle, promotional copy, description, keywords and public URLs populated | Preserve owner wording; reconcile factual feature claims. |
| Category | Health & Fitness; Games / Action | Already set. |
| Content rights / medical declaration | Rights asserted; not a regulated medical device | Already set; no new declaration made. |
| Age rating | 13+ displayed for 172 rating regions; earlier-OS global rating 12+ | Rating regions are not distribution territories and are not proof of an in-app age gate. |
| Availability | **4 countries: AU, CA, MX, US** | Preserve; reconcile runtime policy with these four. |
| Pricing | Free; $0.00 observed | Already set. |
| App Privacy | 12 data categories and both privacy URLs populated | Reconcile final data flows/native manifests and confirm final publication. Not blank. A visible Publish button alone does not prove publication state. |
| Apple notification URLs | Production and Sandbox endpoints populated | Already set; endpoint behavior still needs relevant integration evidence. |
| Release option | **Automatically release this version** selected | Submission is intended to lead to automatic release after approval under this setting. Change only if owner wants review without immediate release. |
| Mac / Vision Pro | Mac availability unchecked; Vision Pro marked incompatible/unavailable | No Mac testing project added. |

App Privacy currently includes Device ID, Crash Data, Other Diagnostic Data, Performance Data, Gameplay Content, User ID, Coarse Location, Product Interaction, Fitness, Other Data Types, Other User Content and Advertising Data. Do not paste the older privacy worksheet over it: that worksheet predates the RevenueCat ad-only transport patch. Reconcile the actual collection, purposes, linkage and tracking of the final build. Camera/video/audio processed only locally should not be reclassified as Flap Fit uploads.

[Version and submission](https://appstoreconnect.apple.com/apps/6813280704/distribution/ios/version/inflight) · [App Privacy](https://appstoreconnect.apple.com/apps/6813280704/distribution/privacy) · [Availability](https://appstoreconnect.apple.com/apps/6813280704/distribution/pricing)

## Fresh verification completed

| Check | Result |
| --- | --- |
| Immutable Yarn 4.12.0 install | Passed; tracked files unchanged. |
| Complete mobile Jest suite | **47 suites / 889 tests passed.** Native boundaries are mocked. |
| TypeScript | Passed. |
| Strict oxlint on nine changed runtime files | Passed. This is scoped lint, not a claim about every file. |
| iOS production release config with committed production environment | Passed. Does not validate the missing runtime coordinator. |
| Backend verifier/database/Vault suite | **39 tests passed**, including compatibility and rejection cases. Local tests, not live production calls. |
| Pinned AdMob/UMP native patch fixtures | Passed apply/idempotence/drift/tamper and presence-aware bridge checks. Not a native device run. |
| Delta whitespace | Passed. |
| Store assets validator | Failed: planned iPhone/iPad screenshots absent, plus Android screenshots. Android output is not an Apple blocker; the exact eight-image marketing plan is not an Apple minimum. |
| GitHub verification for `f39190d` | Zero workflow runs, zero check runs and zero commit statuses. No committed Actions workflow. This is missing CI evidence, not a failed run or independent Apple requirement. |

Recorded but not freshly reproduced: prior IPA inspection, hosted Production v3/Sandbox v8 readback, genuine Sandbox TEST delivery and rejection probes. That TEST is not real RESCIND_CONSENT or installed transaction/link evidence. No new IPA was built or physically installed during this review.

## Shortest defensible path to submission today

1. **Reconcile newer work first.** Get the actual current implementation into an identifiable commit. The site and review notes already imply work beyond pushed main. Review the incremental successor against the blockers above.
2. **Finish real integration before the final build.** Prove a permitted user can reach ads/reporting/competition through normal screens; prove each required refusal independently. Cover AU/CA/MX/US and unsupported/unknown/error paths without inventing adult permission. Preserve the free, ad-supported 13+ product and existing ad placement.
3. **Freeze the source and build for the App Store.** Use the production profile, not the old internal Ad Hoc IPA. Record commit, EAS build ID, version/build number and artifact hash. Inspect signed entitlement/profile compatibility, embedded privacy manifests, purpose strings and applied native patches; resolve Apple upload diagnostics. Do not assume an OTA makes an old binary the submitted candidate.
4. **While the build processes, complete metadata.** Reviewer phone/email, genuine iPhone/iPad screenshots, accurate privacy declarations and matching reviewer notes. Preserve the existing four countries and free price. Confirm the intended automatic/manual release behavior.
5. **Run a focused installed acceptance pass.** Use equipment-free Squats/Sky on iPhone and iPad. Check cold launch and relaunch, camera denial/Settings recovery, ordinary play, local progress, Record & Play with/without audio, complete received clip and share cancel/return. No new prolonged pull-up calibration cycle.
6. **Exercise the changed native boundaries.** Apple required/declined/unavailable behavior; Google privacy reopening; independently permitted restricted ads with reporting refused; reporting withdrawal during queued/native work and after foreground/relaunch; no-fill navigation exactly once; no ad on share-return or late over the next workout. Use test ads or registered test devices—never synthetic live clicks/revenue. Prove permitted genuine RevenueCat receipt separately as the product/Shipaton requirement, not an Apple demand to earn revenue.
7. **Check online and Apple linkage.** Real permitted competition entry, one result, Report/Block, support/deletion without re-enabling disallowed processing, and required Apple status/link/rescission handling. TestFlight uses Sandbox Apple transactions: verify that route and its relationship to the production competition enforcement explicitly. Do not infer it from a TEST webhook.
8. **Attach the processed accepted build, review the final record, then submit with owner authorization.** Apple requires a selected uploaded build and complete, accurate review information. [Apple build selection](https://developer.apple.com/help/app-store-connect/manage-builds/choose-a-build-to-submit/) · [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

No new feature work, calibration redesign, Android release checks, contest media or eight-slide screenshot campaign needs to delay this path. With only these four territories selected, EU release verification is not the current critical path. Same-day submission remains conditional on finishing the actual source integration, obtaining the build, and passing device acceptance; passing unit tests alone cannot justify the submission.
