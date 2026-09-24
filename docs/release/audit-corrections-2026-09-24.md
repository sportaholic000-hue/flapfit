# FlapFit — September 24 audit corrections

Application candidate: `d8971fe1f69a6dac44dee25f224f86098fccbf60`, based on audited `272b560913ce4e9f8b2efbed40b42e89191bf234`. The preceding implementation commit is `6926fa897633425922dda1f9b08272e6e5989566`; its native transport retention was tightened in the candidate. No EAS build, TestFlight upload, OTA, backend deployment or App Store submission was started. No subagents were used.

## Disposition of the independent audit

| Finding | Correction and evidence | Still required |
| --- | --- | --- |
| A1: iOS 26.0/26.1 setup dead end | Distinguish basic Apple age-range availability from an unavailable newer regional-duty API. Request the available Apple age range during setup; retain fail-closed ads/reporting until genuine age and other requirements are satisfied. Cross-module tests cover first entry, completed-run setup, second/third entry across 16.4, 18.6, 26.0, 26.1, 26.1.2, 26.2, 26.3, 26.4 and 26.6 shapes. Decline/error/unavailable/unknown never become local age or consent. | Representative native OS/device testing. This is mocked native-boundary integration evidence, not an Apple-framework execution claim. |
| A2: lost result ad after external sharing/background | The still-visible, unclaimed eligible result may refresh UMP permission without presenting a form and prepare a replacement ad after access returns. Leaving early cancels ownership, so late completion cannot create/show a surprise ad. First free result never starts a recovery request. | Actual share destinations, no-fill, denied consent and native interruption tests on the candidate. |
| A3: age-rating worksheet | Corrected Age Assurance to Yes and Contests to Frequent. App Store Connect was inspected: those two answers were already saved correctly. No answer was changed. Clarified approximate country processing in the saved reviewer notes. | Recheck final rating/metadata when attaching the accepted candidate. |
| A7: gameplay background work | Remove mounted-game outbox flush. Before WebView admission, hold optional work; stop Supabase auth refresh, prevent new optional requests, invalidate active optional requests, and retain outbox entries. Resume normal delivery when exercise finishes or the game unmounts. Add a separate native RevenueCat transport pause; retain never-started tasks, consent and genuine queued events. Withdrawal remains separate and still cancels/purges. Block provider preparation and result-ad allocation during the held run. | Native Swift/Objective-C execution, complete CocoaPods/Xcode validation and device traffic tracing. This does **not** establish zero traffic from every SDK. Required Apple access monitoring and country refresh remain active; already-issued UMP information requests can finish. |
| A4: final-commit verification | See the attached final verification record and logs. The earlier partial run on 6926fa8 was stopped after the retention improvement; it is not represented as full candidate acceptance. | Apple native compilation/checks run on Expo's hosted build machine during the next authorized iOS build. The owner does not need a Mac or a separate test build. Physical-device checks follow that candidate. |
| A5: recording theory | No recorder, bitrate, duration cap, WebView recovery mechanism or pose-loop rewrite. Owner's successful recordings remain relevant evidence. | Representative Record & Play/audio/playback/share smoke test, including a duration comparable to the owner's successful runs. |
| A6: submission/candidate evidence | Contacts were already visually confirmed complete; no contact changes. Review-note clarification was saved. Screenshots and attaching a newly accepted build remain planned release steps. | Inspect the signed candidate archive, collect current screenshots, verify provider operation and final privacy publication/listing before submission. |

## Preserved behavior

Results appear first. Only Done, Try Again or Next Level claims a result exit. The first claimed exit per JavaScript session is free; later ads require an even exit and at least 90 seconds since an ad opened. No inventory loading wait, automatic ad on share/return, late ad over a workout or carried-forward missed opportunity was added. Google privacy choices remain separate from optional RevenueCat reporting.

Exact province/state names and all existing regional advertising restrictions remain in place. The shortened Agree & Play onboarding, native Manage Privacy Choices, local recording, one post-game score submission and unique leaderboard names remain. The removed manual privacy email/request-ID/response-code flow stays removed. AGENTS.md and the pose/recording HTML implementation were not changed by this follow-up.

## Native pause details for independent review

`gameplayActivity.ts` owns a small in-memory lease; it does not store personal information or change consent. `game.tsx` acquires it before camera admission and releases it on the existing game-over event or component cleanup. No work was added to the per-frame pose loop. The competition API uses the same lease for its transport and automatic refresh. Required Apple checks remain separate.

The RevenueCat patch remains pinned to 5.88.0, PurchasesHybridCommon 18.37.0 and react-native-purchases 10.9.1. It pauses registered URLSession tasks and retains unstarted tasks until resume or real withdrawal. No replacement analytics queue or fabricated provider event is introduced. Fresh upstream input, the exact preceding cached native patch and the previous bridge have explicit hash-checked paths; unknown/tampered input still fails. Apple's [URLSessionTask suspension documentation](https://developer.apple.com/documentation/foundation/urlsessiontask/suspend()) describes temporary suspension and resumption; application-specific behavior still needs the native/device checks above.

## Remaining acceptance sequence

1. Independent review of this candidate and its actual verification gaps. No build is authorized by this report.
2. Only after the owner's explicit build instruction: use the existing Expo iOS build workflow for the intended candidate. Expo supplies the hosted macOS/Xcode environment; the existing native integration runs its Swift/Objective-C checks there. No owner Mac, separate native-test build, new hosting service or extra build job is required. Windows's native harness messages are recorded as skipped, not native passes.
3. Inspect that candidate's archive and run device acceptance. Cover setup completion/refusal, all applicable regional transitions, first free exit/even exit/cooldown/no-fill, external sharing, background/foreground during camera activity, pending genuine reports, and representative recording/audio.
4. Take current screenshots, attach the accepted build, verify publication of accurate App Privacy disclosures and saved review contacts/notes, then submit according to the owner's release instructions.

Expo documents its [hosted iOS build environment](https://docs.expo.dev/build-reference/infrastructure/). This is how the iPhone app is compiled; it does not make FlapFit a Mac application or require the owner to have a Mac.

Apple's current [age-rating definitions](https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions) include Declared Age Range in Age Assurance and fitness goals/rankings in Contests. A passing source test suite cannot certify Apple or Google acceptance.

## Final recorded verification

**70 suites / 1579 tests passed; 0 failed; 0 pending.** All checks below ran against source `d8971fe1f69a6dac44dee25f224f86098fccbf60`. App tree: `a34b6bfebb91a368dca1e483c49f0313aba6924c`.

| Check | Result |
| --- | --- |
| immutable-install | PASS |
| typecheck | PASS |
| lint | PASS |
| mobile-jest | PASS |
| apple-verifier | PASS |
| dependency-audit | Six tooling deprecation notices (raw exit 1) |
| production-config | PASS |
| tracker-bytes | PASS |
| public-links | PASS |
| admob-patch | PASS |
| revenuecat-patch | PASS |
| revenuecat-bridge | PASS |
| admob-native | DEFERRED to the authorized Expo build |
| revenuecat-native | DEFERRED to the authorized Expo build |
| ios-js-export | PASS |
| security-advisories | PASS |

The iOS export is a local JavaScript/Hermes bundling check, not a signed iOS build. Native scripts were skipped on Windows and run in the existing Expo integration after build authorization. Detailed commands, start/finish timestamps and exit codes are in verification.json; logs are retained alongside it.

The first all-workspace/transitive dependency audit returned six deprecation notices: abab, domexception, eslint, glob, inflight and whatwg-encoding. These remain recorded as maintenance debt; no package was upgraded or excluded. A fresh audit using Yarn's documented --no-deprecations option checked the same full workspace/transitive scope and reported no security advisories. This does not establish absence of all vulnerabilities, and it is not a fresh audit of every separately managed backend dependency.
