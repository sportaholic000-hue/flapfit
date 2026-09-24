Follow-up completion: the privacy correction is published as website version 39. Apple's reviewer-note menu labels were saved and verified after reload. Contact information is complete; the earlier blank-field finding was incorrect. Screenshots and attaching a build are planned submission steps after the repaired build is tested. The mobile source remains the same tested nine-file repair. AdMob's five-month inactivity warning is separate from the region-switch regression.

Flap Fit regression repair and submission review — September 23, 2026

The repair is prepared against local commit `9391f404d90093483b2a5a3ccb57f1403524341f`. It changes nine files: four application files, four test files and AGENTS.md. No packages, native modules, backend services, game physics, pose-estimation algorithms or exercise calibration were changed. No EAS build, TestFlight upload, OTA update or App Store submission was started. GitHub source backup was subsequently authorized; its final remote commit is recorded separately. The website copy correction was subsequently published. No subagents were used.

Pre-commit verification: the tested repair was applied as **uncommitted changes in the original checkout**, `C:\Users\money\Projects\flapfit\anything`. All nine files match the tested review copies byte for byte. At that verification, Git showed exactly nine modified files, no deletions, and unchanged HEAD `9391f40`. The installed TestFlight build remains unchanged.

**What the history establishes**

| Commit | Finding | Disposition |
| --- | --- | --- |
| `a453c19` | Morning build source; shortened dropdown setup and Agree & Play acknowledgment. The original dropdown stored binary residency information, which could not reconstruct a particular eligible province/state. | Preserve the short setup. Use this as the shipped-build reference, not as a whole-tree rollback target. |
| `a4bf762` | TestFlight build record. | No change. |
| `13a25c2` | Removed the manual request-ID/email/support-response workflow and its exclusive cryptography dependencies; added native UMP controls. Displayed residency categories rather than the selected province/state. | Preserve workflow removal and UMP. The categorical labels were superseded by the next commit's useful name-storage fix. |
| `9391f40` | Saved a validated province/state code alongside the existing eligibility answer, allowing the exact selected display name to survive restart. Also introduced automatic regional SDK preparation, a foreground restart, a results readiness wrapper, and the disputed AGENTS.md sentence. | Keep exact selections. Remove the automatic preparation/restart and wrapper; replace preparation with an explicit menu-owned call. |

The original checkout was clean and at `9391f40`; its stored `origin/main` reference matched. Before backup, a fresh authenticated Git fetch confirmed live main still matched 9391f40, with no divergence. Expo initially had no connection; the owner then connected sportaholic000-hue/flapfit. The updated settings were inspected before pushing; no push-triggered build workflow exists. No GitHub Actions workflow is present; the sole EAS workflow is manually dispatched device registration. No automatic build was enabled.

The pose/tracking implementation and bundled game assets did not change between `a453c19` and the reviewed HEAD. The confirmed regression was the SDK preparation lifecycle around the game, not an alteration of the pose algorithm. No device FPS measurement was performed, so a numerical performance regression or recovery is not claimed.

**Repairs and preserved behavior**

1. **Region recovery:** saving a choice in the existing setup/Info UI immediately recomputes the existing regional policy and calls a fresh permitted Google consent/SDK readiness refresh while that UI still owns the action. The global policy listener can invalidate stale ads and stop revoked processing; it no longer starts Google or RevenueCat. There is no foreground listener that restarts the removed preparation path.
2. **All picker options:** coverage includes every one of the 13 Canadian province/territory options and all 56 U.S. state/district/territory options, plus the existing outside-country options. Selection, eligibility and display are checked together. No NB-specific exception was added. The persisted code maps to the exact selected display name; New Brunswick, Alberta, Ontario and the other choices remain distinguishable after restart.
3. **Gameplay isolation:** pending menu continuations check focus/ownership, app activity and the current policy before initializing SDKs. Game entry invalidates those continuations. Already-dispatched native initialization is awaited before the camera mounts; it cannot be restarted by the removed background path. This is not a claim that an already initialized third-party SDK has no internal background activity.
4. **First-run waste removed:** the result checks the existing session cadence before creating an interstitial. A first completed-run exit is still ad-free and now allocates no ad. The readiness-following wrapper and its listener set were deleted. Interstitials are prepared only on results that could use them, after recording finalization.
5. **Results-first contract preserved:** results appear first. Only Done, Try Again or Next Level can request presentation. The first exit remains free; the existing every-second-exit frequency and 90-second minimum between shown ads remain. Result actions do not wait for an unfilled ad. No menu ad is requested or shown.
6. **Approved setup and privacy preserved:** Agree & Play, its Terms/Privacy acknowledgment, the short setup UI, UMP Manage Privacy Choices, independent reporting choices and the removal of manual response codes remain intact. No dependency was added or restored.
7. **AGENTS.md cleanup:** removed exactly “A saved location correction must restart permitted SDK preparation and refresh an existing result ad reference.” Recent remaining additions preserve actual location names, the UMP action, removal of the manual workflow, results-first placement and existing cadence. I found no other recent instruction in that file conflicting with this repair directive.

Regional eligibility and Google permission are separate. Returning to an eligible region clears the regional block; it does not fabricate `canRequestAds`, erase an independent refusal, bypass incomplete required setup or guarantee inventory. The immediate menu refresh restores SDK readiness when Google permits it. The next eligible results screen requests the actual interstitial. This avoids reintroducing wasteful first-run/menu ad requests.

Two existing limitations are relevant. Old binary-only “not resident” records cannot reveal which province/state was discarded; they retain eligibility and display “Saved answer” until a new selection is made. Also, the pre-existing New York minor rule retains a protected-history flag after a saved Yes; a later No or state selection does not erase that history. This predates today's regressions and is unchanged. The exhaustive U.S. recovery fixture uses a minor with no New York protected history, while other existing tests cover that independent restriction. Changing that product/policy rule would require a separate decision, not an incidental dropdown fix.

**Files for review**

The complete diff is `flapfit-repair.patch`. Exact file copies are under `changed-files/`, with SHA-256 hashes in `changed-files-manifest.json`.

| File | Change |
| --- | --- |
| `AGENTS.md` | Delete the disputed sentence only. |
| `apps/mobile/src/components/PrivacyChoices.tsx` | Start the permitted refresh from the existing user action. |
| `apps/mobile/src/services/monetization/index.ts` | Remove global automatic preparation/foreground restart/result wrapper; bind SDK work to the initiating UI and cancel late continuations. |
| `apps/mobile/src/services/monetization/resultAdGate.ts` | Expose the existing cadence check before allocating an ad. |
| `apps/mobile/src/app/game.tsx` | Use the existing interstitial directly on eligible results; skip first-run allocation. |
| `apps/mobile/src/components/__tests__/PrivacyChoices.test.tsx` | Check actual selection labels and permission changes. |
| `apps/mobile/src/services/__tests__/monetization.test.ts` | Check explicit refresh, cancellation, native settlement, denial/retry and no global restart. |
| `apps/mobile/src/services/privacy/__tests__/launchProcessingIntegration.test.ts` | Exercise every province/state option through eligibility and SDK readiness. |
| `apps/mobile/src/services/privacy/__tests__/startupGameEntry.test.tsx` | Verify actual Home/game/results entry, including no first-result allocation. |

**Validation**

| Check | Result |
| --- | --- |
| PrivacyChoices | 90 passed |
| Launch-processing integration | 100 passed |
| Monetization | 104 passed |
| Regional clarification | 31 passed |
| Result ad gate | 8 passed |
| Startup/game entry | 17 passed |
| Info privacy | 4 passed |
| Total | **354 passed across seven focused suites** |
| TypeScript `tsc --noEmit` | Passed |
| Strict oxlint | Passed |
| Production release configuration using committed EAS profile values | Passed |
| `git diff --check` | Passed |
| Local production iOS JavaScript/Hermes export | Passed: 3,759 modules, 106 assets; no EAS/native build |

The test total combines the latest completed run for each suite. Earlier runs hit first-test module-loading timeouts; reruns passed without an application change. One invocation specified an incorrect InfoPrivacy path; its corrected invocation passed. These execution issues are disclosed rather than presented as one uninterrupted green run. `verification.json` contains every final test name and result.

Applying the repair exposed a Windows sandbox file-replacement issue: the initial per-file grants allowed Git's removal step but blocked recreation. After directory permission was granted, all nine files were restored from the reviewed copies and verified by SHA-256. No files remain missing; no unrelated source was changed.

These are JavaScript tests with mocked native SDKs. They do not establish real iPhone performance, native UMP presentation or live ad fill. No build quota was consumed. A final candidate still needs a brief physical-device check of results/ad order, region corrections, cold launch, background/foreground, camera permission and Record & Play/sharing before review submission.

**Live account and Apple readiness findings**

The initial account inspection was read-only. The subsequent authorized website correction and Apple reviewer-note label changes are recorded below; contact details were preserved.

| Finding observed September 23 | Required follow-up / implication |
| --- | --- |
| App Store version 1.0 is **Prepare for Submission**, with **no build attached**. | Select the intended final candidate only after the repair is approved and its authorized build is tested. The morning build does not contain today's source fixes. |
| iPhone 6.5-inch and 6.9-inch screenshot groups show zero screenshots; iPad 13-inch group also shows zero. | Supply the required real product screenshots before submission. No screenshots were invented or uploaded. |
| App Review contact details are complete. | Corrected after visual inspection: the browser text/DOM readout omitted the populated phone and email. The owner's existing full name, phone and support email are present; no contact edit is needed. |
| Review notes used outdated menu labels. | Completed: Your setup and Manage Privacy Choices were saved and verified after reload. |
| Privacy policy described the deleted manual workflow and outdated region storage. | Completed: corrected copy effective September 23 is published as website version 39. |
| App Privacy has twelve populated data categories and the configured public privacy URLs. Publish is available; publication completion was not demonstrated in this read-only check. | Reconcile against the final signed candidate, then complete/confirm publication. No new category mismatch was established by this source repair. |
| AdMob **Flap Fit iOS** shows **Requires review**, and the account has an inactivity warning. | Link the public store listing and complete Google's review when available. This is an ad-serving readiness issue, separate from the region-state bug and Apple submission. |
| Expo shows **13 iOS builds** in the current billing period. | This work started zero builds. |
| RevenueCat's current sandbox ad dashboard shows prior load/display events and five impressions in the selected 28-day view. | Historical test reporting exists. It does not prove production delivery or validate this new patch. |

The source already contains the inappropriate-ad reporting entry point and UMP controls. Apple's advertising rules do not require moving an interstitial in front of workout results; the approved results-first flow is preserved. Accurate metadata, complete screenshots/contact details, working privacy controls and a tested candidate are the concrete review concerns here. [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

Google's `canRequestAds` decision must remain effective even after regional eligibility recovers. SDK data collection still needs to match the App Privacy disclosure. [Google UMP](https://developers.google.com/admob/ios/privacy), [Google iOS disclosure guide](https://developers.google.com/admob/ios/privacy/data-disclosure)

RevenueCat's generic guidance requires purchase-history disclosure for ordinary integrations. This repository already has a version-pinned native ads-only patch that blocks non-ad HTTP routes and purchase-related startup; the newer repository worksheet explicitly supersedes the older stock-SDK worksheet. I did not undo that patch or add purchases, subscriptions or a new compliance workflow. Final native-artifact verification must confirm the patch remains in the shipped build. [RevenueCat's general App Privacy guide](https://www.revenuecat.com/docs/platform-resources/apple-platform-resources/apple-app-privacy)

The app is not yet ready to call submitted or fully verified. The identified source regressions are repaired and focused checks pass; final screenshots/build selection, App Privacy publication confirmation, native/device verification and ad-account readiness items above remain. Public policy and reviewer-note corrections are complete. No game-loop redesign is needed to address these findings.
