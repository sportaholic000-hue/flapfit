# Apple readiness audit — September 22, 2026

Audited source: `0c6f805`, clean `main` synchronized with `origin/main`. Scope: current source checks, the live App Store Connect record, public policies/support/deletion pages, and a read-only AdMob readiness check. No app code, website, provider settings, Apple notes or declarations were changed. No build, upload or submission was started. No subagents were used.

The code checks pass. Submission is not yet fully ready: current policies/reviewer guidance contain setup inconsistencies, a previously identified privacy-request completion gap is still present, the final privacy publication status is unconfirmed, and the tested release candidate still needs to be attached to Apple after device testing.

## Fresh automated checks

| Check | Result |
| --- | --- |
| Complete mobile Jest suite | 69 suites, 1,514 tests passed; zero failures or pending tests; process exit 0 |
| Mobile TypeScript | Passed, exit 0 |
| Strict Oxlint for mobile source/scripts | Passed, exit 0 |
| Production release configuration | Passed, using the production profile's environment |
| Public release links | Passed with network access; configured marketing/privacy/terms/deletion pages respond with required labels |
| Recursive dependency security audit, all workspaces | Zero security advisories; security-only audit exit 0 |
| Unfiltered dependency audit | The same six upstream tooling deprecation notices, not six unresolved security advisories |
| Public app-ads.txt | HTTP 200, text/plain, correct Google DIRECT publisher entry |

The initially sandboxed public-link and registry checks could not access the network. Their failures were environmental, not app findings; authorized network retries completed successfully. No dependency or application edit was made to obtain these results.

The most recent signed device-build evidence confirms the bundled tracker assets, permission descriptions, native privacy manifests, test-ad configuration and required native bridges. That inspection is not proof of physical-device behavior or production ad traffic. The existing Expo Doctor result is 20/21, with seven patch-version recommendations; these are separate from the zero-advisory security result and were not silently upgraded during this audit.

## Confirmed corrections before submission

### 1. Website and app setup descriptions disagree

Live `/privacy/` still says an unread advertising notice is not a requirement to continue, closing unanswered regional questions does not prevent another game, and missing answers do not impose a one-game limit. Live `/terms/`, under camera/regional advertising, repeats that last assertion.

Current `apps/mobile/src/services/privacy/gameEntry.ts` and `gameSetup.ts` require unfinished setup after the initial completed run, preserving existing exceptions, separate provider/reporting choices and required Apple access rules. The installed replacement build contains that behavior. This is a confirmed stale-copy issue, not a proposal to reverse the approved gate.

The in-app status also needs precise wording: `PrivacyChoices.tsx` displays `releaseEligibilityMessage(resolveReleaseEligibility(input))`, which checks audience/Apple eligibility but does not check unfinished setup. It can therefore say “Gameplay is available” while game entry still requires setup. `processingAvailability.ts` has a similar older-system explanation. Narrow those messages to the fact actually checked, or reference unfinished setup, without changing eligibility or advertising decisions.

Apple requires accurate privacy information and metadata under 2.3 and 5.1.1. Proposed neutral wording is in [the proposed wording](apple-readiness-proposed-copy-2026-09-22.md). No advertising-exempt audience list is proposed.

### 2. Saved reviewer notes describe the previous setup flow

The live Notes field calls advertising/reporting setup optional and does not explain returning to Finish setup before a repeat game. Its older-iOS paragraph also omits the implemented local age-band fallback. Correct those specific passages while retaining the useful equipment-free Squats/Sky calibration, on-device camera, optional recording, competition/deletion, safety, ad cadence and support instructions.

The saved ad cadence matches `ResultAdGate`: first exit of a session is free, then at most each second eligible exit and at least 90 seconds apart; no fill does not trap the player. No need to change those instructions.

### 3. Privacy-request completion still has a functional gap

The earlier `privacy-withdrawal-assessment-2026-09-21.md` remains unresolved in current code. The app and website direct advertising-data requests to support when Google's own privacy form is unavailable. `Info` opens a mail draft only. There is no implemented mechanism by which support completes a new applicable Google data-processing withdrawal for that installation in the identified case.

Existing saved advertising refusals, Google's available privacy controls and independent RevenueCat reporting withdrawal are implemented. Those do not establish completion of a new scoped request where Google's form is unavailable. This is an identified implementation/operational risk under Apple's accessible-consent-withdrawal requirements, not a claim that Apple has rejected the app or that every user must get a general ads-off option. A narrow, explicitly agreed remedy and end-to-end verification remain necessary before calling this closed. No general ads-off control was added.

### 4. Legacy data descriptions need labeling

The privacy/deletion pages still describe run-verification records without clearly identifying them as legacy. The deployed version-11 one-step leaderboard flow creates no new game-run tickets. Existing run records and cleanup remain, so describe the retained records as legacy rather than deleting the retention disclosure. The privacy page's active-run-duration description should likewise distinguish retained legacy run data from the current score submission, which carries player name, exercise and score.

## App Store Connect verification

| Item | Observed state |
| --- | --- |
| App/version | Flap Fit Workout Game, 6813280704, version 1.0, Prepare for Submission |
| Build attached to version | None |
| Reviewer contact | Name, phone and email visibly populated. Browser text/DOM extraction omitted phone/email values; visual inspection confirmed them. They are not missing and private values are not copied into this report. |
| Reviewer sign-in | Not required, matching the app's anonymous competition flow |
| General age rating | 13+ under the current system; legacy OS ratings use Apple's older scale |
| Launch availability | Australia, Canada, Mexico, United States |
| Price/distribution | Current free-price schedule, public distribution |
| Mac/Vision | Mac distribution unchecked; version 1.0 explicitly incompatible/unavailable on Vision Pro |
| Categories | Health & Fitness; secondary Games / Action |
| Medical declaration | Not a regulated medical device |
| Privacy URLs | Both point to the live flapfitapp.com/privacy/ page |
| App Privacy answers | Twelve completed data categories; purposes/linkage match the current disclosure worksheet. No additional category mismatch established. |
| Privacy publication | Not proven by this read-only inspection. The Publish button alone is insufficient proof either way. Confirm the final responses are published for the final submitted configuration. |
| Apple notification URLs | Separate production and sandbox consent handlers configured |
| Release selection | Automatic release after approval |

The saved description's six exercises, fifteen levels, Endless after Level 5, daily challenge, ten bird stages, optional recording, on-device camera handling and absence of purchases match the inspected source. No store-note edit was saved.

## Website/app points that agree

- Camera permission is required for all gameplay; normal Play also uses the camera. Microphone permission is optional for recording audio.
- Camera processing and composed recordings stay on the device; sharing is initiated through native destinations chosen by the user.
- Competition is optional. Public player names/scores, reporting/blocking, anonymous ownership and in-app profile deletion are described.
- In-app deletion preserves local progress and does not promise to erase independent ad-provider records.
- Non-personalized advertising, separate RevenueCat reporting, no workout attributes in ad payloads, and no purchases/subscriptions are disclosed.
- Source includes server-side player-name filtering, reporting and blocking routes. Actual moderation and support responses remain an operator responsibility, not something a unit test can prove.

## Build/backend/device boundaries

Current device test build: `f0cf64c3-04c1-43fe-97d9-44f409e2f809`, source `69b0696`, internal/ad-hoc, test ads. The approved Legend-bird setup screen and clearer selection highlights in `0c6f805` are saved and pushed but are not in that installed binary. The App Store candidate must include the final approved source and production advertising configuration; an ad-hoc IPA is not the final store upload.

The current single-step leaderboard deployment record confirms production `flapfit-game` v11, matching client score submissions and preserving RLS, ownership, unique names and request-size limits. The prior `/leaderboard` 410 issue was resolved. This audit inspected that deployment/readback evidence and current client source; it did not create live users, scores, run tickets or additional backend tests. No anti-cheat service was introduced.

Remaining physical-device checks are the user's iPad and iPhone runs: camera initialization/calibration through each offered exercise, record/share return, setup completion/dismissal and repeat-game navigation, eligible test-ad display, competition report/block/deletion, and restart/background recovery. Final production SDK behavior and ad-event receipt are not established merely by source tests. Camera startup slowness remains a device observation to characterize; no new bird-motion defect was established in this audit.

## Monetization launch step, separate from Apple review

Fresh AdMob readback: account Open, the existing inactivity warning remains, and Flap Fit iOS still says Requires review. The public app-ads.txt publisher entry is now independently verified. The published store listing must be linked and Google's readiness process completed when eligible; current test-ad operation does not establish production fill or RevenueCat revenue receipt. No artificial live-ad traffic or account changes were made.

## Sources and evidence

- [Apple App Review Guidelines: accuracy, completion, privacy and UGC](https://developer.apple.com/app-store/review/guidelines/)
- [Apple App Privacy publication procedure](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/)
- [Google iOS data-disclosure guidance](https://developers.google.com/admob/ios/privacy/data-disclosure)
- [Live privacy policy](https://flapfitapp.com/privacy/), [terms](https://flapfitapp.com/terms/), [support](https://flapfitapp.com/support/), [deletion](https://flapfitapp.com/delete-account/)
- Current check counts and command outcomes: [checks.json](evidence/apple-readiness-2026-09-22/checks.json); full local Jest and audit outputs retained in the task's `work/apple-readiness-2026-09-22` directory.

Passing checks is evidence about the checked source, not an Apple approval guarantee. This audit deliberately preserves the owner's monetization rules and does not treat earlier historical audit notes as current unresolved defects when later evidence closed them.
