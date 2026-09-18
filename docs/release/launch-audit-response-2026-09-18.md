# Flap Fit launch audit response — September 18, 2026

This responds to the last two messages of **Audit Launch Readiness Plan**. Work was performed in
`C:\Users\money\Projects\flapfit\anything`, preserving the original checkout, prior staged changes,
assets, lockfile and recorder repair. No Apple/Google/TestFlight/contest submission was made.

## Fixed in the current candidate

- **Overlapping score submissions:** enqueue and flush now resolve under one queue lock. Each run
  receives its own accepted/rejected result. An earlier result callback cannot replace the UI status
  after Retry, Next Level, leaving the screen or unmounting.
- **Pending scores:** one bounded foreground retry and Compete's explicit Refresh action retry the
  queue and refresh rankings. No continuous polling or another workout is required. The status text
  names these actual retry triggers.
- **Deletion acknowledgement:** an uncertain DELETE is reconciled with the Auth server. Only its
  explicit `user_not_found` result confirms removal; a generic 401, expired token or connection error
  never counts as proof. A persisted confirmed-deletion marker allows local cleanup to be retried.
  The existing session is used; deletion never signs into a replacement guest account. The queue
  and session clear without erasing local workout history. Verification has a 15-second timeout.
- **Deletion/upload race:** a score queued behind deletion cannot recreate the profile or repopulate
  the outbox. Online terms/name reset inside the same lock; local levels, bird and training remain.
- **Tracker cache:** preparations share in-flight work but recheck cached files on subsequent calls.
  Evicted/corrupt files are restaged, including stale Expo asset download metadata. A payload read
  gets one recovery attempt; persistent failure reveals a working native Try again control.
- **Support-ID ownership:** the app, policy draft, deletion-page draft and moderation procedure now
  say the support ID is public lookup information, not an ownership credential. Remote requests must
  be authenticated through the original app session. If that session is lost, support cannot safely
  promise recovery/deletion based on public data. No new login system or recovery secret was added.
- **Display/copy:** “1m 60s” rounds to “2m 0s”; Home and Stats use the same tracked-training streak;
  leaderboard errors describe the Refresh button; listing subtitle is **Fun Home Workouts & Tracking**
  and the description covers bodyweight and weighted exercise.
- **Small screens:** onboarding content and the evolution ceremony can scroll; the result card
  already had scrolling in the local app. Actual enlarged-text/iPhone/iPad checks still belong in
  native-device validation.

## Preserved and included in the consolidated source

- Complete-video recording repair, correct byte-count validation, existing sharing flow and sound.
  The MP4 repair blob is identical to confirmed checkpoint `0974a3b`:
  `a5db5b08c0eb5da7ec490896337eadc5e3d1131c`.
- Friend challenge codes remain removed. Daily Challenge, training history and top-50 leaderboards
  remain. No challenge tables or player records were purged for this task.
- Approved native AdMob/RevenueCat packages, SMS patch, consent flow and result-exit ad gates.
  Expo Go skips native monetization SDKs. No purchases/subscriptions/paywall were added.
- iPhone/iPad configuration, approved Apple title and existing validated RevenueCat credential.
- Pull-up candidate `2026-09-17.4-grab-reference` is unchanged by this audit response. Production
  tracking remains `original` and the physical-approval marker is unset. No thresholds were tuned
  and no synthetic-test result is presented as a physical pull-up pass.
- Level 1 pipe lettering remains the undecided visual experiment; it is not a final branding choice.

## Verification

- Full local Jest run: **29 suites / 318 tests passed**.
- After the final deletion/upload race guard: the three affected competition/profile suites passed
  **24 tests**, including the additional race case. No tests were skipped or disabled.
- TypeScript and strict existing lint passed after the recovery corrections; final layout check
  results are recorded with the candidate manifest.
- Live Supabase test of the **actual competitionApi module**, using a newly created disposable
  anonymous identity: the server deleted the account; the test deliberately discarded its response;
  Auth returned `user_not_found`; the client finished sign-out/queue cleanup and preserved local
  workout totals. The fixture was deleted; no public score or existing player profile was used.
- Preview iOS release configuration passes. Both production platforms fail **only** the two existing
  calibration promotion/physical-approval checks. They were not bypassed.
- Store-asset validation correctly reports absent iPhone, iPad and Android screenshot sets.

## Still needs real release evidence or owner input

1. Owner's final pull-up test, then explicit approval of the selected rules version before promotion.
   Decide whether to keep/revise/remove the pipe experiment before the final production source.
2. Approved private EAS source upload, a native compile, then installed iPhone/iPad verification of
   recording, share send/cancel, consent, ad timing and real RevenueCat ad events. A compile check
   does not submit to a store or replace device testing. None is claimed complete here.
3. Published privacy/advertising/deletion wording and `app-ads.txt`, then appropriate AdMob consent
   publication and native validation. Website editing remains with the separately managed task.
   This turn's web reader could not fetch the pages; browser site access was rejected by automatic
   approval review and an explicit read-only permission request is pending. This is not evidence
   that the public pages are broken.
4. Genuine final-build iPhone and iPad screenshots, review phone number, support inbox send/reply
   verification and accurate store forms. No invented screenshots or contact details were supplied.
5. GitHub was confirmed **public** during this task. The consolidated candidate is saved locally;
   publish it only after the owner approves the destination/visibility and outstanding test scope.
   Do not build the older GitHub `main` (`2b949ef`) unchanged.
6. Shipaton still needs a qualifying public release and real RevenueCat Ads evidence, not just an
   installed SDK. No claim of acceptance or eligibility completion is made.

The code recovery findings above are addressed. Calibration, native-device evidence, public
disclosures and required store assets remain separate release gates; passing source tests does
not establish that those gates are complete.
