# TestFlight upload fingerprint correction — September 24, 2026

The authorized iOS production build `c245cd98-21d8-470d-ade8-41d23acc2c18` (1.0.0, build 6), based on `0685f0cbd60376b4cbfe347919452e5b05aa9aaa`, stopped in Configure expo-updates before compilation. Expo explicitly marked this failed attempt as not counting against EAS Build usage.

## Cause and correction

The root `.easignore` contained an unanchored `README.md` rule. It removed `apps/mobile/modules/flap-fit-age-range/README.md` from the source upload, although the local native-module fingerprint included it. The rule is now `/README.md`, excluding only the root documentation file and preserving nested module inputs.

Removing that exact README from the saved local fingerprint reproduces both cloud values:

| Input | Local / corrected upload | Failed cloud upload |
| --- | --- | --- |
| Native modules directory | `785c3c21bc1cc4a7026665bbe1678e48ed57714c` | `3358308e143615f2511a4291496fdb3a62aaf5e4` |
| iOS runtime | `469f66ace28d0ea7661bb8681b0239739f8b3955` | `62074572e44990f682a88586f9ff6c395e271800` |

The other reported differences were null-hash `ios` and `patches` directory entries. Expo's aggregate hash skips null hashes, so these did not cause the mismatch and require no workaround.

No application code, native module, config plugin, dependency, SDK patch, fingerprint policy, gameplay loop, or ad behavior changed. The original Windows path-normalization fix remains in place. Native compatibility protection is unchanged.

## Verification

`package-fingerprint-verification.json` records the reproduction and correction. The verifier checked both Git's requireCommit filtering and EAS CLI 24.7.0's actual copying matcher: none of the 34 app-owned fingerprint file leaves are excluded after the correction. All 14 non-null app-owned file/directory sources were rehashed with Expo's installed fingerprint implementation and match the audited baseline.

OTA configuration, Windows/Linux/macOS discovery fixtures, and production release validation passed. The full mobile suite passed: **72 suites / 1,598 tests**, with no failures (415.6 seconds). Results are retained separately in this evidence directory.

## Submission and privacy status

The initial automatic submission attempt also encountered a separate plan restriction: EAS `--what-to-test`/changelog submission requires Enterprise. The retry must omit that option and use the existing standard production submission profile. Testing notes can be saved in Apple's interface. No plan upgrade is required.

App Store Connect's Device ID category now includes App Functionality, Third-Party Advertising and Analytics, linked Yes, tracking No. The twelve saved categories match the reviewed worksheet. The added purpose's linkage was explicitly saved as Yes and read back; the preview lists only Diagnostics under data not linked to the user. The public OTA policy supplement is already published as website version 40.

Final privacy publication awaits the owner's confirmation of Apple's publication declaration. Final signed-artifact verification and iPhone acceptance remain required. No App Store review submission or OTA publication has been performed.
