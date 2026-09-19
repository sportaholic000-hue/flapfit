# Flap Fit current audit handoff — September 18, 2026

**Follow-up:** [September 19 audit corrections and current verification](audit-fixes-2026-09-19.md) supersede the test counts and corrected behavior below. This document preserves the accepted baseline.

This is the complete accepted source candidate for backup and independent audit. Read this before older release notes. The owner explicitly authorized publishing the entire current app to the existing GitHub repository. No Apple, Google, TestFlight, website, or contest submission is authorized by that instruction.

## Included scope

- All six exercises use Form Test tracking version `2026-09-18.9-foot-return` in production and Expo. Original/Form Test selection is removed. The owner accepted known camera and floor-contact limitations and ended further physical pull-up testing and tuning; acceptance does not imply flawless physical contact detection.
- Friend challenge codes are removed from launch and preserved in `archive/friend-challenges/2026-09-17`. Daily Challenge, top-50 exercise leaderboards, local stats, evolution, and online moderation/deletion remain.
- Current complete-video recording and duration/container repair, optional microphone sound, sharing, and result-exit ad sequencing are included. The owner reported complete video/audio/duration working during Expo tests; native composer and monetization behavior still need installed-build verification.
- AdMob and RevenueCat source/configuration, the approved SMS dependency patch, lockfile, native config plugins, local pose runtime/model, app artwork and design sources, tests/fixtures, backend function/migrations, and release/legal drafts are included.
- Existing GitHub commits for challenge-code retirement, iPhone/iPad support, RevenueCat iOS configuration, and the approved Apple title are retained with the newer local work. The app bundle ID is `com.flapfit.game`; the approved App Store title is **Flap Fit: Fitness Game**.

## Verification of this source

- Fresh full automated suite: **33 suites / 391 tests passed**.
- Production release-configuration validator: **passed**, including the accepted tracker approval marker.
- TypeScript and strict lint passed during the final tracker promotion. Subsequent audit preparation changes documentation only.
- Both iOS and Android Expo Go bundles returned HTTP 200 and contain the accepted tracker, removed selector, and updated Info instruction.
- Store-assets validator: **fails as expected because genuine final iPhone/iPad/Android screenshots are absent**. Its eight screenshots per device family are this project's planned set, not a claim that all eight are a store minimum.

These checks are source/bundle evidence, not native compilation, physical device certification, store acceptance, or contest acceptance.

## Remaining release evidence

1. Compile the exact native candidate and verify installed iPhone/iPad recording, sharing send/cancel/return, consent, ad frequency/failures, and actual RevenueCat ad events. Expo Go skips the native monetization SDKs. Android native verification is a separate release task.
2. Confirm live advertising/privacy/deletion disclosures, `app-ads.txt`, and published AdMob consent settings match the final SDK behavior. Website work is managed separately; historical notes are not proof of its current live status.
3. Capture genuine final-build screenshots, complete store metadata/privacy/age/compliance forms and review contact details, and confirm support mailbox receipt/reply. Local drafts do not prove store-console completion.
4. Verify contest eligibility against current official requirements and retain actual RevenueCat/release evidence. Installed packages alone do not establish eligibility.

## Recovery and audit boundaries

Clone this repository's `main` at the verified audit commit. Restore dependencies with `corepack yarn install --immutable`; do not regenerate the lockfile or upgrade packages during recovery. See the root README for Expo and test commands. Public EAS profile values are in `apps/mobile/eas.json`; private account credentials and signing keys are intentionally excluded from Git. Generated dependencies, caches, local logs, and temporary recordings are not required source files.

The hosted backend and service accounts have state outside Git. Source-controlled migrations and function code are included, but this repository is not a live database or account-credential backup. Historical local/hosted migration timestamps differ; do not blindly reapply migrations to the existing hosted project.

Preserve historical failed physical tests as evidence. `form-tracking-accepted-2026-09-18.md` records the owner's current decision. Older release notes that say original tracking is selected, that another physical test is mandatory, or that pushing is prohibited are superseded. Audit the current code and this accepted scope.
