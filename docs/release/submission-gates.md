# Flap Fit dual-store submission gates

Target: iPhone submission first, while preserving Google Play readiness.

This file is a release gate, not a claim that store approval is guaranteed. Apple and Google make the
final review decisions.

## Technical source gates

- [x] App name is Flap Fit; iOS bundle ID and Android package are `com.flapfit.game`.
- [x] Expo SDK 57 dependencies pass Expo dependency checks.
- [x] The locked dependency graph has a documented reachability review; current registry advisories
      are non-critical and predominantly Expo/Jest build tooling, not untrusted-data paths in the
      shipped game.
- [ ] Re-run Expo Doctor on final HEAD. The last complete run passed but predates the latest commits;
      the tool is not in the locked dependency graph, so downloading it requires owner approval.
- [x] Android compile SDK and target SDK are 36.
- [x] Android production profile is configured to build an AAB.
- [x] Expo SDK 57's automatic EAS iOS image uses Xcode 26.6, meeting Apple's current upload
      toolchain requirement.
- [x] iOS export compliance declares no non-exempt encryption.
- [x] iOS permission surface is camera only.
- [x] The app-level iOS privacy manifest declares no tracking, the optional competition data types,
      and the required-reason APIs used by the locked native SDKs.
- [x] Android permission surface is INTERNET, VIBRATE, and CAMERA only.
- [x] MediaPipe model/runtime assets and exercise/evolution art are bundled locally.
- [x] Camera recording is local, silent, temporary, and user-shared.
- [x] Arbitrary cleartext network traffic is disabled for both iOS and Android release builds.
- [x] Android cloud backup is disabled so local training state and anonymous auth tokens are not
      restored onto another device unexpectedly.
- [x] The unsupported automatic interface-style override is removed; app screens keep their explicit
      light styling without adding an unnecessary native dependency.
- [x] Online competition has name filtering, report, block, deletion, and rate limiting.
- [x] Competition publishing requires versioned Terms acceptance.
- [x] The Competition acceptance screen links directly to the full Terms and Privacy Policy when the
      required production URLs are configured.
- [x] Re-run TypeScript, tests, format/lint, and both production-style local Expo exports on the
      current release candidate.
- [ ] Build the production iOS artifact and test through TestFlight on a physical iPhone.
- [ ] Build the production Android AAB and test on Play internal testing / physical Android.
- [ ] Test camera denial/re-enable, low light, interrupted recording, offline mode, API failure,
      challenge expiration, deletion, report/block, cold start, and upgrade from a prior local install.

## External values required before any production build

The release validator currently requires:

- [ ] `EXPO_PUBLIC_SUPPORT_EMAIL`
- [ ] `EXPO_PUBLIC_PRIVACY_URL`
- [ ] `EXPO_PUBLIC_TERMS_URL`
- [ ] `EXPO_PUBLIC_ACCOUNT_DELETION_URL`
- [ ] `EXPO_PUBLIC_MARKETING_URL`
- [ ] `EXPO_PUBLIC_SUPABASE_URL`
- [ ] `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Owner/legal inputs still required:

- [ ] Legal operator/developer name.
- [ ] Public support email monitored by a real person.
- [ ] Launch countries and whether EU/UK distribution is included.
- [ ] Intended audience/age range. Avoid selecting children unless intentionally compliant with
      Apple's Kids Category and Google Families requirements.
- [ ] Moderation owner, response SLA, takedown/escalation process, and documented handling of urgent
      or illegal reports.

## Backend gates

- [ ] User selects/approves the Supabase organization.
- [ ] Obtain exact Supabase project cost and receive explicit cost confirmation.
- [ ] Create a dedicated Flap Fit project in the chosen region.
- [ ] Enable anonymous authentication.
- [ ] Apply the checked-in schema and deploy `flapfit-game` with JWT verification enabled.
- [ ] Confirm HTTPS, RLS/table privilege posture, authentication, name filtering, Terms enforcement,
      leaderboard ordering, challenge limits, report/block behavior, and full account deletion.
- [x] Define and document source-controlled retention for expired challenges and moderation reports.
- [x] The checked-in retention migration deletes expired 30-day challenges daily, removes resolved
      moderation reports after 180 days, minimizes account-deletion records, and prunes Cron history.
- [ ] Verify the retention migration and scheduled jobs in the dedicated production Supabase project,
      record the provider's exact service-log and backup periods, and copy them into the public
      privacy policy.
- [ ] Run Supabase security and performance advisors and resolve launch-impacting findings.

## Website and legal gates shared by both stores

- [ ] Public marketing site loads signed out over HTTPS.
- [ ] Public privacy policy is linked in the app and both store listings.
- [ ] Public Terms of Use is linked in the app and covers the competition community rules.
- [ ] Public account/data deletion page works without requiring the app to be installed.
- [ ] Run `yarn workspace mobile release:links` against the production environment and confirm every
      public page returns HTML containing the expected Flap Fit page label.
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
- [x] The app is linked to the existing `@sportaholic/flapfit` EAS project and the checked-in project
      ID matches the remote project.
- [ ] Populate the currently empty EAS `production` environment with the seven validated public
      release values.
- [ ] Support email/form is visible and functional.
- [ ] Privacy policy identifies data, purposes, providers, retention, deletion, user rights, and
      international transfers where applicable.
- [ ] All public pages use the final legal operator and contact details.

## Apple submission gates

- [ ] Apple Developer membership and agreements are active.
- [ ] App Store Connect app record exists with the exact bundle ID.
- [ ] Complete App Privacy using `apple-app-privacy.md`.
- [ ] Complete age rating honestly for fitness/wellness and user-generated competition content.
- [ ] Complete Apple's updated 2026 age-rating questionnaire.
- [ ] Add final name, subtitle, description, keywords, categories, copyright, support URL, privacy
      URL, marketing URL, and review contact.
- [ ] Upload genuine screenshots from the production build for every required iPhone display class.
- [ ] Attach the production build, enter reviewer notes, and submit to TestFlight before App Review.
- [ ] Answer export compliance and content-rights questions accurately.
- [ ] If distributing in the EU, complete Digital Services Act trader-status and contact disclosures.
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
- [ ] Upload the AAB to internal testing first and review the pre-launch report.
- [ ] Satisfy any testing-duration/tester requirement shown on this developer account before
      production access.
- [ ] Confirm the uploaded AAB targets API 36 and review the Play-generated permission/device catalog
      before production rollout.

## Flap Fit 1.0 monetization declaration

Flap Fit 1.0 is ad-free and contains no ad SDK. Answer **No ads** in both stores.

Future ads must not be added to these declarations until the source actually includes an approved ad
SDK and consent/privacy work is complete. The approved future placement strategy is:

- no automatic ad when a result screen appears;
- eligible only after Done, Try Again, or Next Level;
- if Record & Play was used, only after the share flow returns to Flap Fit;
- never during recording or sharing;
- ad failure never blocks the selected action; and
- prevent stale or duplicate ad displays.
