# Flap Fit

Source repository for the Flap Fit iOS and Android fitness game.

## Current audit candidate

Start with [`docs/release/audit-handoff-2026-09-18.md`](docs/release/audit-handoff-2026-09-18.md).
The owner accepted tracking `2026-09-18.9-foot-return` for all six exercises. The current source
passes 391 tests in 33 suites and production configuration validation. Native build/device evidence,
store screenshots, and final store/privacy requirements remain open; this is not a submission approval.

## Authoritative source

- `main` is the active development and release branch.
- The Expo application is in `apps/mobile`.
- Do not use an old downloaded ZIP or the historical release/experiment branches as the current
  source. Confirm the expected `main` commit before testing or building.
- The app is linked to EAS project `@flapfitapp/flapfit`
  (`bbbfea4f-3047-46f6-a5ba-6286356e4718`) and dedicated Supabase project
  `yhrleungvipsqlmayrfg`.

## Restore on another computer

Use the repository's locked Yarn version and lockfile:

```powershell
corepack yarn install --immutable
```

Do not upgrade Expo, add packages, or regenerate the lockfile as part of recovery.

## Test in Expo Go

From the repository root:

```powershell
# Device on the same Wi-Fi network
corepack yarn workspace mobile start:expo-go

# Tester on another network
corepack yarn workspace mobile start:expo-go:tunnel
```

Share the direct Expo Go deep link/QR produced by Metro, not an Expo dashboard URL. Keep the working
Metro process open for Fast Refresh and do not clear its cache without a demonstrated cache problem.

## Verification

```powershell
corepack yarn workspace mobile test
corepack yarn workspace mobile typecheck
corepack yarn workspace mobile release:assets
```

Run `release:check` and `release:links` only after loading the public values from the intended EAS
profile; both commands deliberately fail when required release configuration or public pages are
missing.

The full physical and store-release gates are in
[`docs/release/submission-gates.md`](docs/release/submission-gates.md) and
[`docs/release/physical-test-matrix.md`](docs/release/physical-test-matrix.md).

## Release safeguards

- Production builds require the selected tracker and its exact approved rules version to match.
- The approved AdMob and RevenueCat native integrations are included. Expo Go skips native
  monetization; installed-build verification is still required. See
  [`docs/release/monetization-integration-plan.md`](docs/release/monetization-integration-plan.md).
- Never commit a Supabase service-role/secret key, Apple signing credential, Google service account,
  AdMob account credential, or RevenueCat secret. Only public client values belong in the app.
- Test the exact signed iOS build through TestFlight and the Android AAB through Play internal
  testing before submission.
