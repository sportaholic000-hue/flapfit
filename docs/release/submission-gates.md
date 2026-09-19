# Flap Fit dual-store submission gates

> **Current status — September 18:** Start with [the current audit handoff](audit-handoff-2026-09-18.md). The owner accepted `2026-09-18.9-foot-return` for all six exercises and closed further physical calibration testing. Earlier tracker failures, original-mode selection, pending promotion, and no-push statements below are historical. Native build/device and store gates remain open.

> **Latest physical result: FAILED.** After testing Form Test `2026-09-17.3-floor-reference`, the owner could still plant toes and continue playing. New logs confirm that version, a retained floor reference, and visible high-confidence feet misclassified as airborne. Earlier automated passes and pending-acceptance notes below do not approve this candidate. See `docs/release/pullup-floor-reference-failure-2026-09-17.md` for the evidence. No replacement runtime patch has been applied.

## September 17 launch scope: friend codes retired

The owner removed friend challenge codes from the launch app. Daily Challenge, its local completion
and achievement, top-50 bodyweight leaderboards, complete gameplay video sharing and the approved
result-action ad sequence remain. Create/join/compare screens, friend-code helpers, friend game mode
and Duelist achievement are removed. The implementation is preserved under
`archive/friend-challenges/2026-09-17/`, outside the app and excluded from EAS uploads.
Older dated code-binding and friend-code test entries below are historical, not launch requirements.
No database records are purged: existing retention, moderation and account deletion remain supported.
Verification for this revision is recorded in `friend-code-retirement-2026-09-17.md`; older export
hashes and test totals do not describe this revised source. Physical calibration approval and the
other native/account/store gates remain outstanding.


Target: one universal iPhone and iPad app on Apple first, while preserving Google Play readiness.

Current evidence: September 17, 2026. See `launch-audit-2026-09-17.md` for the latest
implemented changes, checks, and remaining owner/device gates. No store upload is authorized yet.

This file is a release gate, not a claim that store approval is guaranteed. Apple and Google make the
final review decisions.

## Technical source gates

- [x] App name is Flap Fit; iOS bundle ID and Android package are `com.flapfit.game`.
- [x] A September 16 full mobile/backend source scan found no `anything.com`, `Flappy Push`,
      or superseded support-email references in launch code. Old Expo ownership remains only in historical release notes.
- [x] Flap Fit 1.0 targets both iPhone and iPad (`ios.supportsTablet: true`) in one iOS app.
      Full-screen camera gameplay is retained.
- [ ] Verify the installed native build on both device families and capture the separate genuine
      13-inch iPad screenshot set; Expo Go testing alone does not clear native-device acceptance.
- [x] The 1024 x 1024 source app icon is fully opaque; Android's adaptive foreground correctly uses
      transparency.
- [x] Release validation locks the approved app icon and adaptive icon plus the transparent Flap Fit
      splash logo at 340 px on a solid `#0F172A` native background. Pixel inspection confirms the
      exposed splash background matches exactly, with no light-blue field or contrasting square.
- [x] Review the current Expo patch recommendations. Exact diffs were inspected: sharing 57.0.20
      changes metadata; Expo 57.0.23 and build-properties 57.0.20 add optional Xcode 27 scene support.
      The existing package versions are retained and the iOS build image is pinned to Xcode 26.6.
      Native compilation remains a separate gate; warnings have not been hidden.
- [x] The approved expo-sms 57.0.2 has a reproducible Yarn patch for Apple's attachment UTI.
      Immutable installation passed without unrelated dependency changes. Expo Go retains system
      sharing; the native composer requires an installed-build attachment and return test.
- [x] The locked dependency graph has a documented reachability review; current registry advisories
      are non-critical and predominantly Expo/Jest build tooling, not untrusted-data paths in the
      shipped game.
- [x] Current-source Expo Doctor completed 20/21 using the unchanged official SDK 57 schema
      response to recover Node's failed network transport. Schema/assets pass. The only finding
      is the reviewed patch-version recommendation above; no warning exclusions were added.
      Native integration compatibility still requires the separate compile and device gates.
- [x] Android compile SDK and target SDK are 36.
- [x] Android production profile is configured to build an AAB.
- [x] iOS EAS profiles pin macos-tahoe-26.5-xcode-26.6, the supported SDK 57 image meeting
      Apple's current upload toolchain requirement. The private simulator compile awaits approval.
- [x] iOS export compliance declares no non-exempt encryption.
- [x] iOS permission surface is camera plus optional microphone access requested only for Record &
      Play.
- [x] The app-level iOS privacy manifest declares no tracking, competition data types, and required
      reasons for the original native APIs.
- [ ] Review the final merged native privacy report, including AdMob and RevenueCat manifests,
      against the updated Apple privacy worksheet.
- [x] App-requested Android permissions are INTERNET, VIBRATE, CAMERA, and RECORD_AUDIO;
      microphone access is requested only for Record & Play. Advertising-ID and AdServices ID/
      attribution permissions are explicitly blocked in the generated configuration.
- [ ] Inspect the merged signed Android manifest for additional SDK permissions.
- [x] MediaPipe model/runtime assets and exercise/evolution art are bundled locally.
- [x] Camera recording is local, temporary, and user-shared. It can include the user's voice and
      workout sounds when microphone permission is granted.
- [x] Record & Play requires an explicit user choice and shows a persistent red RECORDING indicator
      while the temporary video is being captured.
- [x] Arbitrary cleartext network traffic is disabled for both iOS and Android release builds.
- [x] Android cloud backup is disabled so local training state and anonymous auth tokens are not
      restored onto another device unexpectedly.
- [x] The unsupported automatic interface-style override is removed; app screens keep their explicit
      light styling without adding an unnecessary native dependency.
- [x] Online competition has shared client/server name validation, report, block, deletion, run and
      challenge rate limits, replay protection, plausibility checks, and a durable result outbox.
- [x] A full 25-result offline queue preserves existing submissions, rejects a new result visibly,
      and still permits an idempotent retry of an already-queued run. Deleting the online profile clears the queue.
- [x] Online-profile deletion clears pending submissions, cached competition results, the local
      player name, and prior Terms acceptance while preserving bird and workout progress. A new
      anonymous profile cannot be recreated until the player accepts the current Terms again.
- [x] Competition publishing requires versioned Terms acceptance.
- [x] The Competition acceptance screen links directly to the full Terms and Privacy Policy when the
      required production URLs are configured.
- [x] Current September 17 source passes TypeScript, strict lint, and 267 tests in 28 suites.
      These software results do not complete physical acceptance of Form Test
      2026-09-17.3-floor-reference or any native-build/store gate.
- [x] Current production-env Android and iOS JavaScript exports pass after the latest sharing,
      challenge, consent, and Android RevenueCat changes. Source fingerprints stayed unchanged
      during export. Re-export if later device testing or release changes modify the candidate;
      signed native packaging and physical testing remain separate gates.
- [x] Persisted-state hydration does not overwrite unreadable saved progress with defaults. Slow
      hydration shows branded loading and retry; a read error blocks writes and offers a retry. A real
      AsyncStorage regression preserves the original bytes and restores progress.
- [x] Empty-storage hydration starts with the default bird and level, then persists new workout
      progress. Malformed saved bytes also remain untouched until a valid copy is restored.
- [x] Tracked training time uses capped active wall-clock frame time rather than the 35 ms physics
      step; executable regression checks 15–20 FPS and a long background frame gap.
- [x] Development friend-code challenges launch with Form Test like Home and Levels. The production
      tracker remains deliberately gated pending physical approval.
- [x] Production EAS validation fails closed while the hardened tracker remains unapproved: Form
      Test must be promoted and `FLAPFIT_APPROVED_TRACKER_RULES_VERSION` must exactly match the
      versioned rules marker. Development and preview testing remain available.
- [x] Form Test keeps pipes moving. Sustained invalid form or missing tracking releases the bird
      to fall and crash; there is no recovery countdown. Full lockout is a valid movement endpoint.
      Physical pull-up floor-contact/calf-raise rejection remains to be approved.
- [x] Approved AdMob and RevenueCat SDK integration is implemented. Expo Go safely skips the native
      SDKs; preview uses test ads and production uses real ad units. Production validation still
      fails closed for missing platform RevenueCat keys and unapproved tracking.
- [ ] Rerun the same checks after tomorrow's physical testing and any resulting source changes.
- [ ] Physically approve Form Test 2026-09-17.3-floor-reference on iPhone/iPad and Android,
      including the explicit arms-relaxed floor observation before jumping/gripping, straight and
      bent suspended legs, grip-only rejection, planted feet during countdown/play, calf raises,
      narrow grips, full lockout, and continuous pipes/recording. Verify the other five exercises
      too. Then deliberately promote the accepted version and set its exact approval marker.
      Production still selects original; no marker is set. A cropped-foot setup cannot verify
      ground contact, and the demonstrated image reference is not a 3D floor or weight-bearing
      measurement. A server-issued run cannot itself prove form on a modified client.
- [ ] Build the production iOS artifact and test through TestFlight on a physical iPhone.
- [ ] Build the production Android AAB and test on Play internal testing / physical Android.
- [ ] Test camera denial/re-enable, low light, interrupted recording, offline mode, API failure,
      challenge expiration, deletion, report/block, cold start, and upgrade from a prior local install.

## External values required before any production build

The release validator currently requires:

- [x] `EXPO_PUBLIC_SUPPORT_EMAIL`
- [x] `EXPO_PUBLIC_PRIVACY_URL`
- [x] `EXPO_PUBLIC_TERMS_URL`
- [x] `EXPO_PUBLIC_ACCOUNT_DELETION_URL`
- [x] `EXPO_PUBLIC_MARKETING_URL`
- [x] `EXPO_PUBLIC_SUPABASE_URL`
- [x] `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Owner/legal inputs still required:

- [x] Legal operator/developer name: Troy Reardon.
- [x] Public support email supplied: support@flapfitapp.com. Reconfirm it is monitored and
      replace it everywhere if the final domain changes.
- [ ] Canada and the United States are confirmed as the minimum launch availability. Decide whether
      to add other countries at first release; EU/UK and other country-specific disclosures remain
      required before selecting those storefronts.
- [x] Intended audience minimum age is 13. Do not select Apple's Kids Category or Google Families
      unless the product is intentionally changed to comply with those programs.
- [x] Moderation owner, response targets, takedown/escalation process, and handling of urgent or
      illegal reports are documented in `moderation-runbook.md`.

## Backend gates

- [x] Dedicated Flap Fit Supabase organization is separate from WUF.
- [x] Current project is on Supabase Free at $0 while within its published quotas. A production
      backup/availability decision remains below.
- [x] Dedicated Flap Fit project is healthy in AWS US East (Ohio), `us-east-2`.
- [x] Anonymous authentication is enabled.
- [x] Challenge exercise binding is live in addition to the prior migrations. `flapfit-game`
      version 6 is deployed with JWT verification enabled. Local migration names match hosted
      names; hosted migration timestamps differ, so do not blindly reapply with CLI db push.
- [x] Live verification covers Terms enforcement, leaderboard read, legacy claimed-score rejection,
      verified-run creation/finalization, idempotent retry, replay rejection, implausible-result
      rejection (including the audit's 125/30-second and 60/13.75-second cases), all-exercise
      challenges, and profile deletion. September 17 real API checks also pass for all six bound
      exercises, matching-run acceptance, wrong-exercise rejection, invalid-input rejection, and
      old-client compatibility. All temporary profile data was deleted; three original codes remain.
- [x] Every public application table has RLS enabled and direct anon/authenticated table access is
      denied. New and existing privileged RPCs are unavailable to those client roles. Supabase Cron
      schema USAGE is also denied to both roles despite generic policy advisories.
- [x] Define and document source-controlled retention for expired challenges and moderation reports.
- [x] The checked-in retention migration deletes expired 30-day challenges daily, removes resolved
      moderation reports after 180 days, minimizes account-deletion records, and prunes Cron history.
- [x] Retention migrations and the daily cleanup job are live. The public privacy draft records the
      current Free-plan observability and backup limitations.
- [x] The daily retention job succeeded after the verified-run migration; the September 16 check
      found no run more than seven days past expiry.
- [x] Supabase security and performance advisors were rerun after the verified-run migrations. The
      challenge foreign-key index was added; remaining notices concern Supabase-managed Cron tables,
      password protection unused by anonymous-only Auth, and expected unused indexes on empty data.
- [ ] Decide whether to upgrade to Supabase Pro before public launch. The Free plan has no automatic
      daily database backups and may pause a low-activity project after seven days; Pro currently
      provides seven days of daily backups and avoids inactivity pausing.

## Website and legal gates shared by both stores

- [x] Public marketing site loads signed out over HTTPS; the existing Site was made public without a
      duplicate or DNS change. Marketing, Privacy, Terms, and deletion URLs return HTTP 200.
- [x] The public homepage returned HTTP 200 with `index,follow`, no `noindex` meta or
      `X-Robots-Tag`, and a permissive `robots.txt` in an independent September 16 check.
- [x] Public Privacy Policy is linked from Info and the Competition acceptance screen. The
      production URL passed the September 16 public-link check; store-listing setup remains open.
- [x] Public Terms of Use is linked from Info and the Competition acceptance screen. The live page
      includes leaderboard/challenge rules, prohibited content, cheating, reporting, and blocking.
      Final ad-related legal copy remains open below.
- [x] Public account/data deletion page works without requiring the app to be installed, with the
      September 16 support-ID and run-retention copy.
- [x] `yarn workspace mobile release:links` passed against all four signed-out HTTPS pages.
- [x] Production EAS builds fail closed when any required public link or online-service value is
      missing.
- [x] The release validator rejects reserved/private placeholder domains and requires separate
      Privacy, Terms, and account-deletion pages.
- [x] EAS development, preview, and production profiles explicitly select their matching EAS
      environment so store builds cannot silently inherit the wrong values.
- [x] The release validator also guards bundle IDs, API 36, cleartext traffic, camera/audio
      permissions, Expo/React Native alignment, the Xcode 26 image, production AAB/store
      distribution, auto-incrementing build numbers, ad/analytics packages, and mobile/API
      Competition Terms version parity.
- [x] The release validator guards the checked-in Edge Function JWT-verification setting.
- [x] EAS upload rules retain the non-secret Edge Function/config contract files required by the
      production build validator while excluding database migrations from the app build context.
- [x] A September 15 full-history credential scan found no Supabase service-role value, private-key
      block, GitHub token, Stripe secret, AWS access key, or assigned EAS token in any reachable Git
      commit. Public mobile identifiers remain intentionally separate from server-only credentials.
- [x] Root Git and EAS upload rules exclude Apple API/signing keys, provisioning profiles, Android
      keystores, and store service-account files regardless of where they are downloaded inside the
      repository. Production validation fails if those EAS exclusions are removed.
- [x] The app is linked to the existing `@flapfitapp/flapfit` EAS project; the checked-in project ID
      matches the transferred project and the stale owner validator is corrected.
- [x] EAS build profiles contain the seven validated public release values. No service-role secret is
      present in the mobile configuration.
- [x] Public support page at https://flapfitapp.com/support/ loads signed out over HTTPS and exposes
      a direct support@flapfitapp.com email link.
- [ ] Support mailbox receipt and reply work from an external sender.
- [x] Public DNS for support email has both IONOS MX records plus resolving SPF, DKIM, and DMARC
      records. A real signed-out send-and-reply test is still required before the support gate above
      can be marked complete.
- [ ] Privacy policy identifies data, purposes, providers, retention, deletion, user rights, and
      international transfers where applicable. Its current public text explicitly says there is
      no advertising SDK; after the native ad implementation is tested, update that statement and
      the related provider/data disclosures before either store submission.
- [x] The public Privacy Policy identifies Troy Reardon as operator; the account-deletion page
      names him for privacy contact; Privacy, Terms, Support, and deletion pages all publish
      support@flapfitapp.com. The Terms intentionally omit his full name as requested. These
      passages and HTTP 200 responses were rechecked signed out on September 16. Recheck after
      the final advertising disclosure update.

## Apple submission gates

- [x] Apple Business shows Free Apps Agreement Active, effective September 13, 2026 to
      September 14, 2027. Paid Apps Agreement is New/unsigned and is optional for this free app
      with no IAP, per Apple's agreement guidance. No agreement was accepted in this task.
- [ ] Verify membership/signing access during the authorized native build; complete the owner DSA
      declaration below before submission.
- [ ] App Store Connect app record exists with the exact bundle ID.
- [ ] Complete App Privacy using `apple-app-privacy.md`.
- [ ] Complete age rating honestly for fitness/wellness and user-generated competition content,
      using `apple-age-rating.md` against the exact final binary.
- [ ] Complete Apple's updated 2026 age-rating questionnaire, including the social-media-capability
      questions required for submissions beginning September 2026. Current facts support UGC Yes,
      messaging/chat No, and social-media capabilities No.
- [ ] Because the primary category is Health & Fitness, complete Apple's regulated-medical-device
      declaration for the EU/EEA, UK, and US. Flap Fit is a fitness game, not a regulated medical
      device, so answer No unless the product or its regulatory status materially changes.
- [ ] Review Accessibility Nutrition Labels on the exact signed iPhone build. Claim a supported
      feature only when every common task meets Apple's criteria; otherwise leave it unclaimed rather
      than overstating accessibility support.
- [ ] Add final name, subtitle, description, keywords, categories, copyright, support URL, privacy
      URL, marketing URL, and review contact.
- [ ] Upload genuine screenshots from the production build for every required iPhone display class.
- [ ] Attach the production build, enter reviewer notes, and submit to TestFlight before App Review.
- [ ] Answer export compliance and content-rights questions accurately.
- [ ] Declare Digital Services Act trader status even if the first release excludes the EU. If
      distributing in the EU as a trader, verify the public address/P.O. box, phone number, and
      support email before Apple displays them on the product page.
- [ ] Confirm the uploaded build metadata shows Xcode 26 or newer and review the generated privacy
      manifest before submission.

## Google Play submission gates

- [ ] Google Play developer account and required developer verification are complete.
- [ ] Play Console app record exists with package `com.flapfit.game`.
- [ ] Enroll the app in Play App Signing and protect the upload key.
- [ ] Complete Data Safety using `google-data-safety.md`.
- [ ] Complete Health apps declaration as Activity and Fitness; do not claim no health features.
- [ ] Complete app access, target audience, content rating, ads, privacy policy, data deletion, and
      any required financial/features declarations.
- [ ] Upload genuine phone screenshots, app icon, and 1024 x 500 feature graphic.
- [ ] Run `yarn workspace mobile release:assets` and resolve every local store-media failure.
- [ ] Upload the AAB to internal testing first and review the pre-launch report.
- [ ] Satisfy any testing-duration/tester requirement shown on this developer account before
      production access.
- [ ] Confirm the uploaded AAB targets API 36 and review the Play-generated permission/device catalog
      before production rollout.

## Flap Fit 1.0 monetization gate

The Expo Go checkpoint is intentionally ad-free. It is not the final monetized store candidate. Do
not complete either store's ads, privacy, or reviewer declarations until the approved ad and
RevenueCat implementation exists in the exact submitted source and has passed signed-build tests.
Flap Fit 1.0 has no purchase, subscription, paywall, or remove-ads product; both stores' in-app
purchase declarations must say No for this release.

Approved placement strategy:

- no automatic ad when a result screen appears;
- eligible only after Done, Try Again, or Next Level;
- if sharing was opened, only after the share flow returns to Flap Fit; recording without sharing follows the normal result-action path;
- never during recording or sharing;
- ad failure never blocks the selected action; and
- prevent stale or duplicate ad displays.

Privacy and review constraints for the final implementation:

- never provide camera frames, recordings, player names, exercise choice, training time, score,
  evolution state, challenge activity, or other health/fitness/gameplay data to an ad SDK or use it
  for advertising profiles or targeting;
- launch with non-personalized ads and no IDFA/ATT request unless the final reviewed design is
  deliberately changed and all declarations are updated;
- complete Google's UMP consent flow before requesting ads where required, including the EEA, UK,
  and Switzerland, and add an Info-screen Privacy and cookie settings entry point for changing or
  revoking choices;
- ensure every interstitial is clearly identified as an ad, has a prominent close/skip control, and
  exposes the ad network's inappropriate-ad reporting path; and
- keep AdMob and RevenueCat initialization independent from camera calibration and gameplay so a
  network, consent, or SDK failure cannot block exercise play.

- [x] Native result-action placement, UMP handling, independent RevenueCat event reporting, iOS
      Messages/Mail composers, and the first-exit-free / every-two-exits / 90-second cap are implemented.
- [x] Both AdMob app/unit pairs are configured and impression-level ad revenue is enabled.
      Flap Fit European and US messages are saved drafts; European refusal is available in all regions.
- [ ] Finish the RevenueCat store registration and public SDK keys; verify real ad events.
- [ ] Publish the final consent messages after reviewing provider wording and the matching public
      privacy policy. Native ad-ready, no-ad, offline, failure, consent, and share-return tests remain
      required on iPhone and Android after gameplay approval.
- [x] Local store listing, privacy policy, reviewer notes, Apple App Privacy, and Google Data Safety
      drafts describe the implemented ad integration and no purchases/subscriptions.
- [ ] Reconcile those drafts with the exact signed build and publish the approved website changes;
      then complete the store declarations.
- [x] The existing public site can serve a root-level text file. Its updated `robots.txt` returned
      HTTP 200 and permits the Google app-ads crawler in a signed-out September 16 check.
- [ ] Publish the real AdMob publisher's `app-ads.txt` at `https://flapfitapp.com/app-ads.txt`
      (HTTP 404 on September 16), link `flapfitapp.com` as the store-listing developer website,
      and complete AdMob ownership verification and app-readiness review before claiming live ads.
      Verify that both HTTP and HTTPS return the exact publisher-specific file.

## Shipaton 2026 gate

- [ ] Follow `shipaton-submission.md`; the deadline is September 30, 2026 at 11:45 PM Pacific.
- [ ] Confirm Flap Fit's first public release occurs during the contest window and is downloadable
      in the United States. TestFlight or a build waiting for App Review is not sufficient.
- [ ] Confirm the released build serves ads through RevenueCat Ads and matches the demonstration.
- [ ] Submit a public YouTube/Vimeo video under two minutes, a public store URL, the RevenueCat
      project ID, the 1024 x 1024 icon, and a qualifying frameless screenshot.
