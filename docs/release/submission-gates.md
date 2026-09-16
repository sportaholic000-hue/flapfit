# Flap Fit dual-store submission gates

Target: iPhone submission first, while preserving Google Play readiness.

This file is a release gate, not a claim that store approval is guaranteed. Apple and Google make the
final review decisions.

## Technical source gates

- [x] App name is Flap Fit; iOS bundle ID and Android package are `com.flapfit.game`.
- [x] A September 16 full mobile/backend source scan found no `anything.com`, `Flappy Push`,
      or superseded support-email references in launch code. Old Expo ownership remains only in historical release notes.
- [x] Flap Fit 1.0 is an iPhone app on Apple (`ios.supportsTablet: false`), so the approved launch
      asset plan does not require a separate iPad screenshot set. iPad Expo Go checks remain useful
      compatibility evidence but do not expand the App Store device family.
- [x] The 1024 x 1024 source app icon is fully opaque; Android's adaptive foreground correctly uses
      transparency.
- [x] Release validation locks the approved app icon and adaptive icon plus the transparent Flap Fit
      splash logo at 340 px on a solid `#0F172A` native background. Pixel inspection confirms the
      exposed splash background matches exactly, with no light-blue field or contrasting square.
- [x] Expo SDK 57 dependencies pass Expo dependency checks.
- [x] The locked dependency graph has a documented reachability review; current registry advisories
      are non-critical and predominantly Expo/Jest build tooling, not untrusted-data paths in the
      shipped game.
- [x] Expo Doctor 1.20.4 passes all 21 checks on the current candidate. It ran as a temporary Yarn
      download and left the dependency lockfile unchanged.
- [x] Android compile SDK and target SDK are 36.
- [x] Android production profile is configured to build an AAB.
- [x] Expo SDK 57's automatic EAS iOS image uses Xcode 26.6, meeting Apple's current upload
      toolchain requirement.
- [x] iOS export compliance declares no non-exempt encryption.
- [x] iOS permission surface is camera plus optional microphone access requested only for Record &
      Play.
- [x] The app-level iOS privacy manifest declares no tracking, the optional competition data types,
      and the required-reason APIs used by the locked native SDKs.
- [x] Android permission surface is INTERNET, VIBRATE, CAMERA, and RECORD_AUDIO. Microphone access
      is requested only for Record & Play.
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
- [x] The September 16 audit-hardening candidate passes TypeScript, 78 automated tests and repository
      lint. Current-source offline iOS and Android JavaScript exports passed on commit `207a685`;
      signed native packaging and physical tests remain pending.
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
- [x] Form Test now bounds sustained stale tracking and nonfatal invalid-form pauses across all six
      exercises; a brief interruption can recover. Physical tolerance remains to be approved.
- [x] Production EAS validation also fails closed while the agreed AdMob and RevenueCat integration
      is absent. The current Expo/preview checkpoint remains intentionally ad-free.
- [ ] Rerun the same checks after tomorrow's physical testing and any resulting source changes.
- [ ] Physically approve Form Test tracking for all six exercises, then promote it from the
      development-only comparison toggle to the production tracker before enabling global
      leaderboards. A server-issued run prevents fabricated/replayed submissions, but it cannot by
      itself prove exercise form on a modified client.
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
- [x] All checked-in migrations through `202609160001_enforce_run_timing` are live and `flapfit-game`
      version 4 is deployed with JWT verification enabled.
- [x] Live verification covers Terms enforcement, leaderboard read, legacy claimed-score rejection,
      verified-run creation/finalization, idempotent retry, replay rejection, implausible-result
      rejection (including the audit's 125/30-second and 60/13.75-second cases), all-exercise
      challenges, and profile deletion.
- [x] Every public application table has RLS enabled. Protected score writes are service-only.
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
- [ ] Public privacy policy is linked in the app; store listings await final setup.
- [ ] Public Terms of Use is linked in the app and covers the competition community rules.
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
      international transfers where applicable.
- [ ] All public pages use the final legal operator and contact details.

## Apple submission gates

- [ ] Apple Developer membership and agreements are active.
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
- if Record & Play was used, only after the share flow returns to Flap Fit;
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

- [ ] After tomorrow's Expo gameplay approval, integrate the approved ad and RevenueCat design in a
      native build, add consent/privacy handling for selected launch countries, and test ad-ready,
      no-ad, offline, failure, and consent paths in TestFlight and Play internal testing.
- [ ] Update the store listing, privacy policy, reviewer notes, Apple App Privacy, Google Data Safety,
      and Ads declaration from the exact monetized build. Confirm both stores say no in-app
      purchases or subscriptions for Flap Fit 1.0.

## Shipaton 2026 gate

- [ ] Follow `shipaton-submission.md`; the deadline is September 30, 2026 at 11:45 PM Pacific.
- [ ] Confirm Flap Fit's first public release occurs during the contest window and is downloadable
      in the United States. TestFlight or a build waiting for App Review is not sufficient.
- [ ] Confirm the released build serves ads through RevenueCat Ads and matches the demonstration.
- [ ] Submit a public YouTube/Vimeo video under two minutes, a public store URL, the RevenueCat
      project ID, the 1024 x 1024 icon, and a qualifying frameless screenshot.
