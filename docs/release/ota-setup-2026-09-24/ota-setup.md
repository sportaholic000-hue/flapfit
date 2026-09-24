# FlapFit OTA setup — owner and independent review

Prepared September 24, 2026. **No native build, TestFlight submission or OTA update has been published.** This report covers OTA setup after the previous release repair and dependency audit; it does not replace an iPhone acceptance test or guarantee store approval.

## Status and scope

The source configuration and Expo account setup are complete for owner review. The next native build must include `expo-updates` before an installed app can receive these updates. The existing TestFlight installation cannot gain OTA capability retroactively. Expo's cloud build handles iOS compilation; the owner does not need a Mac.

- Baseline: `68e9003d21e454db0f387ba7a5cef325ce1ee42f`.
- OTA implementation: `ff0b29da837935624726e0e9e134430e7abc6a4a`.
- Test-only follow-up: `bf7d2e0e21ae3588dbe2c25219b47dc94c8bc6b8`. The following documentation commit contains the report and evidence; neither documentation nor the test correction changes runtime behavior.
- No changes to the game loop, result-ad sequence/frequency, province/state labels, regional advertising rules, onboarding, UMP choices, leaderboard contract, recorder, tracker assets or `AGENTS.md`.
- All 662 existing production dependency versions and checksums are preserved. Seven OTA-related dependencies were added, bringing that graph to 669.

## What a player sees

1. On a fresh launch, FlapFit checks for a compatible update before mounting its screens.
2. When an update exists, the player can choose **Update now** or **Later**. Later opens the installed version for that session.
3. Update now downloads and opens the update before the menu. If the app is backgrounded, the reload waits until it returns to the foreground.
4. A failed/offline check opens the installed version. A failed download/reload offers **Continue**.
5. Returning from a workout, recording, sharing or ordinary backgrounding does not start another check. There is no update polling or OTA download during gameplay.

Expo's native automatic checking is disabled (`NEVER`); the launch gate owns checking and downloading. Embedded/cached startup and Expo's recovery protections remain enabled.

**Connection tradeoff:** a stalled check can delay opening the menu. The installed iOS SDK uses a 60-second request timeout; that is not a promise that the entire operation finishes within exactly 60 seconds. There is no supported cancellation API here. The implementation waits for the native request to settle rather than allowing a timed-out JavaScript wrapper to leave network work running during a game. Later becomes available when an update is offered, not while the check is pending. An accepted download also finishes or fails before gameplay.

## Configuration and compatibility

- SDK-matched `expo-updates ~57.0.23`; existing Expo/RN/AdMob/RevenueCat versions retained.
- Updates URL targets existing project `bbbfea4f-3047-46f6-a5ba-6286356e4718`.
- `runtimeVersion.policy = fingerprint` prevents delivery to a different native runtime.
- Fingerprint inputs explicitly include local native modules/plugins and native dependency patches. Text line endings are normalized for Windows versus Expo's macOS build hosts. Existing native bridge patches are compared in their final form whether fingerprinting happens before or after prebuild.
- The RevenueCat patch helper was refactored to expose its existing source transformation for fingerprinting. Its resulting native bridge bytes and existing privacy processing behavior are unchanged; patch verification passed.
- Local production iOS fingerprint: `4bbc54ab0f505811dae5c08164789d138442b889`, covering 321 sources. This is local configuration evidence, **not a verified cloud binary runtime**. Compare the eventual build's runtime before publishing any OTA.
- Actual Expo native config introspection confirms updates enabled, the correct URL, automatic checking `NEVER`, zero startup wait and `file:fingerprint` runtime resolution.

## Expo account setup

All three channels exist and point to branches with the same names; readback showed no published update groups.

| Profile/channel | Environment copied and verified | Existing distribution/ad behavior |
| --- | --- | --- |
| production | 16 existing profile variables | Existing store production profile; live ads |
| preview | 15 existing profile variables | Existing internal distribution; test ads |
| development | 15 existing profile variables | Existing development client; test ads |

No profile was replaced and no ad identifiers or backend endpoints were invented. The remote environments were checked against the existing profile values using `eas env:exec`. A new configuration validator rejects missing or mismatched environment values and wrong ad modes before release work.

Account readback: Free plan, $0/month, 13 iOS builds used out of 15, zero OTA active installations and zero OTA bandwidth used. The account displays 1,000 included OTA monthly active installations and 100 GiB bandwidth. No plan or billing change was made. Reassess usage before a future upgrade; this setup does not authorize spending.

GitHub integration was checked before backup. The repository has no push-triggered build workflow; its existing Apple device-registration workflow is manual. No PR build label was created. Source backup does not itself publish an OTA.

## Node warning

The app test warning came from `react-native-url-polyfill` / `whatwg-url-without-unicode` resolving Node's deprecated built-in `punycode`. Jest now resolves the already installed `punycode/` package. This is a test-only mapping and changes no phone behavior.

The separate EAS CLI 18.9.1 utility still emits its upstream `DEP0040` warning. It is outside the app dependency graph. Its warning was retained, not hidden. The CLI also advertises version 24.7.0. The app dependency audit and the CLI's transitive dependencies are distinct scopes.

## Privacy disclosure prepared for review

EAS Update sends Expo a random installation identifier and technical update/platform information; ordinary request metadata includes an IP address. This integration does not send camera images, recordings, workout results, leaderboard names or advertising identifiers to Expo.

The native manifest and release worksheet now include Device ID for App Functionality. A short [privacy-policy supplement](../ota-privacy-supplement-2026-09-24.md) is prepared for review. **The live privacy policy and App Store Connect privacy answers have not been changed by this OTA task.** Before submission, publish the approved wording and add App Functionality to the existing Device ID category while preserving the other accurate purposes. This introduces no consent screen, support-email system or additional gameplay requests.

## Validation

At implementation commit `ff0b29d`, 14 of 15 checks passed: immutable installation, OTA/config/tooling checks, TypeScript, lint, six Apple-verifier tests, zero dependency-audit findings, production configuration, all six tracker-asset checks, AdMob/RevenueCat patch verification, and the production iOS JavaScript/Hermes export.

The full mobile suite ran **72 suites / 1,589 tests: 1,588 passed and one failed**. The failure was a legacy privacy-manifest assertion expecting six missing declarations; OTA adds the seventh (Device ID). The follow-up corrected that expectation and added missing-Device-ID and missing-App-Functionality-purpose cases. Its **13 tests and focused lint all passed**. No other source file changed after the full run, and no gameplay/ad test failed. The full suite was not rerun after this test-only correction.

Additional checks passed: actual Expo native config introspection and runtime fingerprint resolution; all three remote environment comparisons; empty channel/branch readback; baseline dependency/scope comparison. Raw logs contain no app-test `punycode`/`DEP0040` warning. The local export retains cosmetic `NO_COLOR`/`FORCE_COLOR` warnings.

This validates source, tests and bundling. It does **not** validate the new native SDK installation, actual OTA delivery/recovery on an iPhone, camera performance or Apple/Google approval.

Evidence is saved beside this report. The original full-suite result is retained, including its stale assertion failure and the follow-up that resolves it. No result has been rewritten to conceal an earlier failure.

## Next steps requiring the owner's go-ahead

1. Review this source diff and the disclosure supplement, including the launch connection tradeoff.
2. After explicit build approval, use the existing **production** profile for the next TestFlight candidate. Do not switch to the current preview profile for submission; it intentionally keeps test ads and internal distribution.
3. On the iPhone, test offline/online launches, menu responsiveness, first-run ad exemption, result-before-ad exits, eligible/restricted region corrections, privacy choices, purchases/restores, recording/sharing and actual pose tracking. These native/device checks remain necessary.
4. After separate OTA publication approval, perform a harmless compatible update/rollback test against that candidate before App Store release, including Update now, Later, failed download and background/foreground behavior. Publishing an update is separate from this setup and has not occurred.
5. Reconcile the live privacy disclosures, take screenshots from the approved candidate and attach the build to the App Store version before submission.

Production-channel updates reach **all matching production-channel installations**, including TestFlight and App Store installs. After public launch, that channel is not a TestFlight-only testing lane.

## Future OTA operator notes — reference only, not executed

Use a reviewed clean checkout, matching EAS environment and matching native runtime. Run normal release checks, inspect the diff and verify that the proposed change is compatible JavaScript/assets. Native SDK changes, permissions, entitlements and native patches require a new binary. Preserve the current build profiles.

From `apps/mobile`, an authorized future production publication would use:

```powershell
npx eas-cli@24.7.0 env:exec production "node scripts/validate-update-config.cjs production" --non-interactive
npx eas-cli@24.7.0 update --platform ios --channel production --environment production --message "Describe the reviewed update"
```

Do not run the publication command just to test configuration. Its environment is explicit because OTA publication does not inherit every setting from an EAS build profile. Test and obtain owner approval before publication. OTA does not grant permission to bypass Apple's rules or deliver disallowed functionality.

Sources: [Expo setup](https://docs.expo.dev/eas-update/getting-started/), [download control](https://docs.expo.dev/eas-update/download-updates/), [runtime compatibility](https://docs.expo.dev/eas-update/runtime-versions/), [environment variables](https://docs.expo.dev/eas/environment-variables/usage/), [Expo privacy](https://expo.dev/privacy), [installation identifier](https://docs.expo.dev/eas/observe/reference/client-id/), [Apple software requirements](https://developer.apple.com/app-store/review/guidelines/#software-requirements).
