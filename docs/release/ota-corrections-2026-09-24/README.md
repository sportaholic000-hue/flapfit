# FlapFit OTA correction review — September 24, 2026

This report supersedes the launch behavior and fingerprint findings in the earlier OTA setup report at commit `046c1aa`.

## Candidate and authorization

- Reviewed baseline: `046c1aa9f4d3024fe75a7aca034910e263f084c4`.
- Corrected source: `ef158656019c8f371055a6fea47813464e160a0f`, backed up to GitHub.
- Owner selected **Open normally; Check for updates in Info**.
- No native app build, TestFlight upload, App Store submission or OTA publication was started. Existing channels, environments, billing settings and native SDK versions remain unchanged.

## Startup correction

Normal entry mounts the existing app immediately and makes no OTA check. The update service starts in its ready state and does not even load the native updater until the player explicitly uses the new Info action.

The Info action requests the update screen. Its effect starts the native check only after the normal routes have unmounted. The existing camera-ownership flag rejects a request during an active workout and is checked again before native work. This is a read-only guard; the gameplay activity service and game loops are unchanged.

The update screen gives Update now / Later when an update exists, feedback when already current, and Continue after errors. Only explicitly requested checks/downloads wait for the actual native operation to finish. There is no fake JavaScript cancellation, timeout race or network request left behind when returning to gameplay. Reload waits for foreground, and a resolved reload promise does not prematurely mount game routes. Ordinary foreground returns never check for updates. An accepted download still takes time on a poor connection; it no longer delays ordinary entry.

No changes to the result-before-ad requirement, first-run ad exemption, ad scheduling, location labels/eligibility, onboarding, Google privacy choices, recorder, leaderboard contract or AGENTS.md.

## Fingerprint correction

The defect was in `@expo/fingerprint 0.20.13` config-plugin discovery. Its loader passed the result of `path.relative` to POSIX ignore patterns before converting Windows backslashes. Parent-directory matching therefore retained extra build-tool modules on Windows.

A pinned Yarn patch changes that one discovery line to call the package's existing `toPosixPath` helper before ignore matching. The patch targets the actual `^0.20.13` dependency descriptor and is recorded in the lockfile. No SDK upgrade or replacement runtime policy was introduced.

The actual installed loader is tested with Windows, Linux and macOS path semantics. The previous line reproduces the mismatch as a negative control; the patched line returns the same sources and retains the app's native plugins and patch scripts.

The fingerprint policy, native modules, config plugins, provider bridges and Yarn patches remain hashed. Existing native drift checks remain enforced. The change aligns discovery with Expo's existing POSIX behavior rather than adding broad native exclusions.

Actual production-profile iOS runtime resolution now matches:

| Host | Node | Runtime fingerprint | Sources |
| --- | --- | --- | --- |
| Windows | 24.13.1 | 469f66ace28d0ea7661bb8681b0239739f8b3955 | 110 |
| Linux (Ubuntu WSL) | 22.22.1 | 469f66ace28d0ea7661bb8681b0239739f8b3955 | 110 |

Every source identity/hash pair matches, not only the aggregate hash. Both calculations assert the required native modules, plugins, provider patch scripts and Yarn patches are present. The Linux calculation used an actual Linux Node process on the same checkout and installed dependency tree; it was not a fresh Linux dependency installation. macOS path semantics are covered by the installed-loader fixture; a macOS native compile was not performed or claimed. EAS will perform the eventual native build in its cloud; the owner does not need a Mac.

WSL printed its existing systemd-user-session warning but completed the calculation successfully. That host warning did not affect the matching result. The new fingerprint differs from both historical hashes because the corrected source set and new pinned patch are now inputs.

## Verification

The formal verification and full rerun below ran against clean source commit ef158656019c8f371055a6fea47813464e160a0f.

| Check | Result |
| --- | --- |
| Full mobile Jest suite | 72 suites, 1,598 tests passed on the final run |
| Focused OTA service, mounted gate and Info coverage | 21 tests passed; also covered by the final full run |
| Apple verifier | 6 tests passed |
| Immutable Yarn install | Passed; pinned fingerprint patch applied |
| OTA environment/native compatibility tests | Passed; all 16 omitted environment values rejected |
| Installed fingerprint loader regression | Passed Windows/Linux/macOS path cases and old-code negative control |
| Dependency and Jest tooling regression checks | Passed |
| TypeScript and strict lint | Passed |
| Recursive dependency audit | Passed, exit 0 |
| Production config and tracker asset bytes | Passed |
| AdMob and RevenueCat native patch checks, RevenueCat bridge check | Passed |
| iOS JavaScript/Hermes export | Passed; 9.2 MB bytecode bundle produced locally |

The first full-suite attempt had **1 timeout / 1,597 passes**: the first startupGameEntry integration case exceeded its existing 30-second deadline, with React hook diagnostics after the timeout. After the other heavy checks finished, the complete suite was rerun serially and passed in 457.405 seconds. **No source changes, skipped assertions, increased timeouts or retry setting were used.** Both attempt summaries and logs are retained. Committed logs normalize line endings and trailing whitespace; raw local logs remain available. This records a local test-run timing limitation, not proof of a device failure.

No punycode warning appeared in these test/export logs. Metro emitted two terminal-color environment warnings (NO_COLOR/FORCE_COLOR); they did not prevent export. The initial verification record retains its nonzero Jest result; followup-verification.json and mobile-jest-final-summary.json record the successful full rerun.

The raw verification record identifies the exact tested commit. The full-suite run, affected tests, native patch checks, dependency audit and iOS JavaScript export are local verification; they do not substitute for a new native binary and iPhone acceptance.

## Privacy policy and Apple disclosure

The final OTA supplement reflects the selected Info-only flow and describes Expo's random installation identifier, platform/runtime information, ordinary request IP metadata and provider privacy practices. It does not add any camera, recording, workout, leaderboard or advertising-ID payload.

The existing public website was updated using the Sites workflow:
- Website version: **40**.
- Published source: `77c20622441f6fb7987597e34979b356cdb9c341`.
- Deployment: `appgdep_6ab4e0a32914819192a42621bb01af31`, succeeded.
- Final website content diff: privacy section, effective date, and the existing date validation only. Cross-platform line-ending churn was removed before publication.
- Public policy: https://flapfitapp.com/privacy/
- Deployment URL: https://flap-fit.sportaholic000.chatgpt.site

App Store Connect redirected to Apple sign-in while opening App Privacy. No Apple disclosure was changed in this turn. The owner has been asked to restore that session; the save remains a pre-submission blocker. This does not require a native build.

The already prepared Apple change is **Device ID → add App Functionality**, preserving existing purposes, linked Yes and tracking No. The app-owned native manifest already contains that purpose. The existing twelve-category worksheet remains the basis for the other disclosures; no unrelated answer should be changed to complete this OTA correction.

## Remaining release work

1. Restore App Store Connect sign-in and save/read back Device ID → App Functionality; publish the reconciled questionnaire before submission.
2. Owner/independent reviewer approval for a new native build. This task did not consume a build.
3. Verify the compiled artifact and iPhone behavior, take screenshots from the approved candidate, attach that build and complete the existing App Store submission steps.

The next owner-authorized TestFlight build must prove native installation and actual OTA delivery: normal online/offline entry, explicit Info check, available/no-update/error results, Later, accepted download, foreground-only reload and recovery. Recheck the established camera, recording/sharing, results/ad and region-correction flows on the iPhone. No new purchases, subscriptions, consent UI or support workflow is required by these corrections.

Production-channel publications reach matching production-channel TestFlight and App Store installations. Do not publish a test OTA to that channel after public release as if it were isolated to testers.

For independent reproduction, the report directory includes `verify-runtime.cjs`. From the repository root run `node docs/release/ota-corrections-2026-09-24/verify-runtime.cjs . <output-directory>` on each host after the normal immutable Yarn install. It calculates the iOS runtime using the production-profile environment and asserts the required native inputs are still hashed. It does not build or publish.

Sources: [Expo Updates API](https://docs.expo.dev/versions/latest/sdk/updates/), [Expo fingerprint](https://docs.expo.dev/versions/latest/sdk/fingerprint/), [Expo privacy policy](https://expo.dev/privacy), [installation identifier](https://docs.expo.dev/eas/observe/reference/client-id/), [Apple privacy definitions](https://developer.apple.com/app-store/app-privacy-details/).
