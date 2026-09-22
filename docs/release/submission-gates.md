# Flap Fit dual-store submission gates

## Current dependency and build status — September 22

All 18 recorded dependency security advisories are repaired; 68 suites / 1,448 tests pass. See [the remediation record](dependency-remediation-2026-09-22.md). The owner has now authorized a signed physical-device test build after checks complete, superseding the earlier build hold below. The signed test build [8391a757-6092-49c1-b7f6-ecd82e90c4c2](https://expo.dev/accounts/flapfitapp/projects/flapfit/builds/8391a757-6092-49c1-b7f6-ecd82e90c4c2) has now finished and its IPA passed inspection. Source: 36c48a1d9e11891eb54430c745fa9659442f629d. The Free plan now has six iOS builds remaining and $0 overage. This authorizes the test build, not Apple review submission before device acceptance.

## Historical audit gate — September 21

The owner requires an independent inspection before any final app build. Source fixes, full checks and the website update are recorded in [the audit handoff](third-party-audit-2026-09-21.md). **67 suites / 1,400 tests**, TypeScript, strict lint and release validation pass. The unapproved general ads-off controls are removed; regression tests cover eligible adults across all four launch countries. Website version 36 is published; the public regional audience list was removed in the website-only successor. See [the current source record](source-organization-2026-09-21.md) for the authoritative branch, archived copies and build-input cleanup. No mobile build, Apple upload, metadata edit or submission occurred. Wait for the owner’s explicit build instruction after the audit. This supersedes earlier build-preparation wording below.


## Current owner correction — regional advertising only

See [regional advertising correction](evidence/regional-advertising-correction-2026-09-21.md). Regional restrictions disable advertising and reporting without excluding gameplay. No trial quota or advertising-notice game gate remains. Both New York answers persist; camera access is required for all gameplay. The earlier exclusion-based source/package evidence is historical and must not be used as acceptance evidence for the corrected source.

The proposed exclusion-based Apple reviewer paragraph is cancelled. An authorized read-only check confirmed it was not saved; Apple settings remain unchanged. Do not publish website version 32. Use the corrected website and its recorded publication result. Native build, upload, device acceptance and submission remain separate from this source correction.

Current instructions reconciled September 20, 2026 against the account audit and the
successor recorded in [three-finding account-audit correction](evidence/audit-three-findings-2026-09-20.md).
The [Apple-first tracker](apple-first-tracker-2026-09-19.md) records detailed evidence and
the [held acceptance procedure](consolidated-device-acceptance-2026-09-20.md) records device cases.
This checklist does not authorize a build, upload, publication or submission.

The owner accepted `2026-09-18.9-foot-return` for all six exercises on September 18.
September 17 floor-reference failures, original-mode selection and pending promotion are historical
and superseded. Do not repeat calibration or pull-up experiments. Friend codes remain retired;
their archived implementation is excluded from the app and EAS package.

## Completed source and configuration work

- [x] Universal iPhone/iPad app, bundle/package `com.flapfit.game`, opaque 1024-square icon,
      approved splash, local tracking models/runtime and exercise artwork.
- [x] Accepted tracker and approval marker, onboarding, local progress, unlocks and Daily Challenge.
      Game-progress hydration recovery is separate from the newly corrected privacy-choice read path.
- [x] Privacy-choice read failure reproduced and corrected through the actual notice/launch-policy/
      monetization boundary; unread records cannot reopen reporting or be overwritten by unrelated
      choices. Recovery restores saved refusals and independently permitted ads. Source results are
      recorded in the linked successor evidence; they do not prove native behavior or provider receipt.
- [x] Per-purpose action ordering prevents an older delayed Allow from overriding newer Stop,
      including remount and later writes. Pending deletion blocks both Apple paths before ordinary
      Auth/link/game dispatch and invalidates in-flight preparation; support/deletion retry remain
      available. Exact source/regression evidence is in the linked three-finding report. Build held.
- [x] Earlier failed-write refusal preservation, save/native-stop retry controls, native-dismissal
      sequencing, independent Compete eligibility and Info competition withdrawal remain implemented.
- [x] Camera permission plus optional microphone only for Record & Play; no ATT request or IDFA
      collection. Recording stays temporary/local and full-length video/audio sharing is preserved.
- [x] Non-personalized result-exit ads only: first exit free, every second eligible exit, at least
      90 seconds between opened ads, no automatic ad on result/share/foreground, exactly one selected
      action, and no-fill continues. Reporting and competition have independent choices.
- [x] Locked Expo/React Native dependencies and existing native privacy/sharing patches retained.
      Xcode 26.6 EAS image, Android SDK 36/AAB, TLS requirements, Android backup/ID blocking,
      no-non-exempt-encryption setting and public release configuration remain validated.
- [x] Corrected app-owned privacy declarations cover reviewed practices/purposes. Source manifest,
      required-reason and release validators and actual local EAS packaging results are recorded
      for the corrected successor. Private credentials, signing files, backup/web content and local
      dependency/cache state are excluded from the package.
- [x] Dedicated Supabase project, anonymous-auth competition, Terms enforcement, RLS/restricted
      direct access, validation, run/outbox protections, moderation, deletion and retention have
      retained source/backend evidence. Native rights and genuine Apple delivery remain separate.
- [x] Existing website/provider/support and seller-file setup is retained with its dated readback evidence.
- [x] Corrected advertising-only privacy/terms and required-camera wording published as website
      version 33. Superseded version 32 was not deployed. See the current correction evidence.
- [x] Support receive/reply and independent deletion/moderation operations are retained in tracker D4.
      This does not mark installed-app rights access complete.

Supabase plan/backup choices are operational considerations, not an instruction to buy a service or
reopen completed setup. No change to hosting or plan is authorized by this checklist.

## Apple: saved and verified

- [x] App Store Connect app `6813280704`, version 1.0, **Prepare for Submission**; current owner
      name/subtitle/description/keywords/copyright, Health & Fitness / Games / Action categories,
      support/marketing/privacy URLs, reviewer notes/contact fields and no-login choice are saved.
- [x] Content Rights, 13+ rating and non-medical declaration are saved. Preserve their values.
- [x] Free pricing, exactly Australia/Canada/Mexico/United States, public distribution and automatic
      release after approval are saved. Mac availability is off; the current version is explicitly
      unavailable on Vision Pro. No extra platform release is inferred from an enabled checkbox.
- [x] Existing Apple access, two-device signing and secure EAS upload authentication are established.
      Do not create replacement identities or credentials. Free Apps Agreement is active; no IAP,
      subscription, paywall or paid-app agreement is required by this ads-only release.
- [x] Twelve App Privacy categories/purposes/linkage are saved and reconciled with the reviewed flow;
      use [the four-country worksheet](four-country-app-privacy-answers.md). Saved answers are distinct
      from publication, which is not established by seeing a Publish button.

## Apple: remaining evidence and actions

- [ ] Corrected signed registered-device artifact and its exact source/version/configuration pairing,
      after explicit build authorization. Existing `04cf2e97` / `f4b191d` contains the native manifest
      correction but lacks later competition and read-recovery changes. Store build `103c8936` /
      `c05f497` also predates the manifest correction. Neither is final acceptance.
- [ ] Inspect the final artifact's app/SDK manifests, required reasons, permissions, entitlements,
      device profile, bundled resources, native patches, diagnostics and checksum. Reconcile its
      configured data flows with App Privacy. The separate Xcode Organizer PDF is **not generated /
      deferred by owner**; no Mac/operator is required to close that evidence method. Actual Apple
      validation errors must still be resolved.
- [ ] One consolidated iPad A16/iPadOS 26.5 pass, then one essentially finished iPhone 16 Pro pass:
      startup/layouts, permissions/return, full recipient video/audio, native sheet/Google/result
      sequencing, ad cadence/failure/withdrawal, online rights and applicable Apple authorization.
      Mark unavailable cases untested with a disposition. Source tests cannot close these cases.
- [ ] Genuine correctly sized screenshots: supported iPhone 6.9-inch OR 6.5-inch set and 13-inch iPad
      set. Saved slots are empty. Capture truthfully, then upload only when authorized. Review any
      accessibility claim against the actual accepted build; do not invent supported features.
- [ ] Verify/publish final App Privacy after final-artifact reconciliation and explicit authorization.
- [ ] Accepted Store-distribution artifact, authorized Apple upload, actual processing/validation,
      any real export-compliance prompt, and selected version build. TestFlight currently has no
      builds. TestFlight is optional for registered Ad Hoc acceptance; it is not a required extra
      tester session or authorization to upload. Contacts and Content Rights are done; the exclusion-based eligibility-note correction is cancelled and must not be saved. The current Notes were verified read-only.
- [ ] Final owner review and authorized Add for Review / Submit for Review. Confirm any actual
      account/compliance prompt then; do not manufacture new unfinished fields from generic guidance.

## RevenueCat and AdMob

- [x] Existing iOS/Android RevenueCat apps, matching public SDK keys, valid iOS app credentials and
      matching AdMob publisher connection are evidenced. Impression-level ad revenue is **On**.
- [x] Authenticated project `a58d3dbd`: **Ad Revenue** and **Impressions** charts open, Charts v3 is
      enabled, and no feature-access gate is shown. This establishes feature access, not receipt.
- [x] Matching iOS result-exit interstitial is configured. European and US privacy messages are
      **Published**, assigned to both apps; prior “saved drafts” wording is superseded.
- [x] Supplied account audit saved/reloaded an app-specific **PG** maximum, blocking T/MA, matching
      the existing SDK ceiling. Its review-note additions were also saved/read back; preserve them.
- [ ] Correlate genuine permitted installed-app ad events with RevenueCat receipt; verify native
      withdrawal/background/relaunch while separately permitted Google ads continue. Empty charts,
      SDK stubs, Connected and valid credentials do not prove receipt or paid revenue.
- [ ] Link a publicly available store listing in AdMob, finish any then-required seller-file
      verification and obtain app-readiness approval. Current status Requires review / blank store
      details remains distinct from no policy violations and verification currently Not required.
- [ ] Resolve legitimate serving/provider follow-through around the account's five-month inactivity
      warning. Do not create fake impressions, click live test ads or release prematurely.
- [ ] Preserve actual Sandbox TEST evidence and separately confirm genuine Apple linkage/rescission
      and production follow-through when available. A pre-release Production 401 or synthetic
      fixture is not successful real delivery.

## Deferred Android and contest work

Android store work and contest media remain separately deferred, not new Apple source/build gates.
Preserve Android readiness; do not advance these tasks without authorization.

- [ ] Google Play account/verification, signing, Data Safety/Health/ads/audience/access declarations,
      phone screenshots/icon/feature graphic, AAB/internal testing and any account-specific testing
      requirement, merged permissions/device catalog and rollout.
- [ ] [Shipaton submission](shipaton-submission.md): qualifying public US release in the contest
      window, actual RevenueCat Ads integration, public store link/project ID, a video **under** two
      minutes, 1024-square icon and **exactly 1179 × 2556** frameless screenshot. A 1320 × 2868 Apple
      screenshot is a different deliverable and does not satisfy the contest size requirement.

Historical source counts, failure notes and earlier instructions remain in Git history and dated
evidence. Reopen a completed item only for a concrete newer conflict or changed candidate input.
