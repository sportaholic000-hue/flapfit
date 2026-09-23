# Done/Home and Expo compatibility correction

The result-screen setup check introduced in `69b0696` also cancelled Done when an unanswered setup sheet was closed. The shared handler now distinguishes an exit from a new run: Done continues through the existing result-ad opportunity and leaves the result even when setup is dismissed or fails. Try again and Next level still require completed setup. Home, deep-link and restart entry continue to use the existing local completed-run history.

No dismissal saves an answer, acknowledges a notice or grants consent. Eligible Done exits still use the same ad scheduler. Regional advertising decisions, optional reporting controls, game physics, pose tracking, camera assets, competition endpoints and per-run requests are unchanged.

The SDK remains Expo 57. The seven recommended patch updates are applied: Expo 57.0.24, asset 57.0.18, build properties 57.0.21, constants 57.0.19, router 57.0.22, sharing 57.0.21 and Metro runtime 57.0.16. The remaining transitive constants copy is deduplicated to 57.0.19. The lockfile also includes their required Expo CLI, UI, router-server and Babel preset patch dependencies.

Privacy support request IDs now use the documented `expo-crypto` 57.0.3 `randomUUID()` API instead of directly depending on internal `expo-modules-core`. On iOS this calls Foundation UUID locally. The existing signed-response scope, expiry, device-request matching, newer-choice protection and save-failure handling remain. This adds no network service, recurring request or monetary cost.

Regression coverage uses the actual RootLayout/Home/game route with mocked native boundaries. It checks Done after dismissal or a setup failure, blocked re-entry without acknowledging setup, Retry/Next cancellation, and an eligible interstitial completing before Done navigation. The Home test helper follows the currently unlocked level after finishing a run rather than assuming Level 1 remains selected. Test timeouts have not been increased.

Verified before the replacement build:

- Full Jest suite: 1,532/1,532 tests, 71/71 suites.
- TypeScript and strict lint: exit 0.
- Recursive security audit (deprecations excluded from security counts): zero advisories, exit 0.
- Expo Doctor 1.20.4: 21/21. The real HTTPS schema endpoint initially reset its connection; a local diagnostic fetch retry received HTTP 200 on attempt 2. Normal TLS validation remained enabled. No checks were skipped and no schema was substituted.
- Production configuration validator and iOS Hermes export: exit 0.
- Regression test fixture correction: after a completed run, Home can select the next unlocked level. The test now follows the actual current level. Earlier failed test output is superseded by the full successful run above.

See the adjacent verification JSON for machine-readable results. The replacement uses the existing ios-device-check profile and the same two registered devices. It is an internal test-ad build; no App Store review submission is part of this change. Signed build/source-package verification and physical-device acceptance are separate from these source checks. The signed artifact will be recorded when it finishes.
