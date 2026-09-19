# Audit corrections — September 19, 2026

These corrections follow the four section audits of main at `453e363f0b2fcbbe0d522777f92fe2888946addd` and the owner's instruction to fix and push them. The older pasted audit against `f289471` is not the current app baseline. This report describes the successor source; it does not authorize store submission or claim a native build has passed.

## Corrected findings

| Finding | Implemented correction |
|---|---|
| EAS excluded mobile configuration | Anchored the repository-only config exclusion. Real EAS archive inspection also exposed directory traversal excluding the backend contract; explicit parent exceptions now retain only the contract and config needed by release validation. Local backups, environments and keys stay excluded. |
| Interstitial resources accumulated | A locked Yarn patch to AdMob SDK 16.5.0 adds permanent interstitial disposal: consumer callbacks, internal SDK subscription, loaded native ad references and unfinished request ownership are released. Late loads cannot restore disposed ads. Consent changes invalidate existing result ads. |
| Android asynchronous failed presentation stranded result actions | Forwarded the native failed-to-show callback as the SDK ERROR event and cleared the native request. Existing result gating completes the selected action once; no navigation timeout or ad cadence change was added. |
| Permission granted in Settings left mounted UI stale | Returning from an explicit camera or microphone Settings visit refreshes that permission. Ordinary foreground events do not refresh the game or reset its WebView. |
| Direct routes bypassed unlocks | Game entry waits for saved progress and enforces the existing level and Endless unlock rules. Valid Daily Challenge routes remain available. |
| Instructions and labels differed from accepted behavior | Added the accepted tiptoe overhead-reach preparation to onboarding/reviewer notes; TOP remains Step 1 and BOTTOM Step 2. Corrected three displayed evolution stage labels without changing achievement thresholds. Reviewer notes now name the actual sharing and privacy controls. |
| Release drafts had inaccurate details | Removed the review-phone placeholder from public support copy, documented privately entering the review phone, added the higher age-rating override when required by 13+ Terms, corrected Shipaton's July 31 start and exact 1179×2556 screenshot requirement. Store forms and contest acceptance are not claimed complete. |

## Verification

- **406 tests across 35 suites passed**, including Settings recovery, direct-route/465 Daily Challenge combinations, actual installed SDK subscription cleanup after 10/50/100 loaded and unfinished requests, consent invalidation, and asynchronous presentation failure completing the action once.
- TypeScript, strict lint, and a fresh Yarn 4.12.0 immutable install passed. The AdMob version remains 16.5.0; no dependency versions were upgraded.
- EAS CLI 24.7.0's actual Git archive implementation produced the inspected local build input. **87 assets and 97 source/build files** matched byte-for-byte. Both SDK patches and required mobile/backend configuration were present. Secret/local-backup exclusion checks passed. Production validation passed **from the extracted archive for iOS and Android**.
- React Native 0.86.3 codegen generated the interstitial disposal bindings for Android, iOS and C++. This proves schema generation, not native compilation or device behavior.
- Public release-link availability/HTML/page-label checks passed. This does not verify every policy statement or saved console value.
- The protected tracking, gameplay and recording source hashes are unchanged. All six exercises retain accepted Form Test version `2026-09-18.9-foot-return`. Friend codes remain archived; Daily Challenge, top-50 leaderboards and the existing result-exit ad cadence remain.

Machine-readable results: [audit-fixes-2026-09-19.json](evidence/audit-fixes-2026-09-19.json).

## Reproduce the candidate checks

Restore with `corepack yarn install --immutable`, then run the mobile test and typecheck scripts. The two committed Yarn patches must remain present. Generate a temporary upload archive using EAS CLI 24.7.0's `build:inspect --platform ios --profile production --stage archive --output <temporary-directory>`. Inspect that copy and run its release validator with the production profile's public environment values for each platform. Do not infer archive correctness merely from validating the original checkout.

## Remaining release evidence

1. Compile this source and verify the installed Apple candidate on iPhone and iPad: startup, Settings permission recovery, recording with complete duration/audio, share send/cancel/return, consent and result-exit ads. Android needs its own native compile/device evidence, including forced asynchronous failed presentation. No new physical pull-up testing or tracking tuning is required by these fixes.
2. Observe real ad impressions and RevenueCat ad events; reconcile published UMP settings, audience/age-of-consent handling, app-ads authorization and actual public disclosures. A valid Apple credential, PG ad-creative limit and test event are not substitutes for those checks. Website edits are managed separately.
3. Capture genuine final-build store screenshots, complete store metadata/privacy/age/compliance forms and private review contact details, and verify support mailbox receipt/reply. Native build numbers/artifact IDs must be recorded when produced; no native artifact was produced by this source check. The configured app version remains 1.0.0.
4. Follow the existing moderation, account-deletion and secure backend-backup procedures. The source repository is not a backup of hosted database/account state. No unverified moderation record or user data was altered by these corrections.

No Apple, Google, TestFlight, website or contest submission was made. Full native/device and store-account evidence remains necessary before claiming launch readiness.
