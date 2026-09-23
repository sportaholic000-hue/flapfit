# Automated privacy controls — September 23, 2026

## Owner-authorized scope

Remove the manual privacy email/response-code workflow, replace the confusing Google advertising copy with one native UMP action in Info, and show the saved residency status clearly. No iOS/EAS build, upload, website deployment, account configuration change or additional paid service is authorized by this change.

## Result

- Info shows **Manage Privacy Choices** only when Google's `privacyOptionsRequirementStatus` requires its entry point. The existing native consent bridge calls Google's privacy-options form directly. There is no email, support ticket, response code or new server endpoint in this path.
- The action is disabled while opening, presents a retryable error on failure and observes screen focus/native presentation ownership. If a visible row becomes `NOT_REQUIRED` before the tap completes, Google's current `canRequestAds` state is applied so permitted advertising is not left unready.
- **Your setup** contains the existing saved answers and independent preferences. The dropdown shows **Quebec resident** or **Outside Quebec**, and **Connecticut resident** or **Outside Connecticut**. Only the existing binary residency flag is stored; no exact province/state name, location service or additional request is introduced. Failed saves do not display a confirmed answer.
- Removed the request screen, request-ID/token verification modules, operator signing script, dedicated tests and their two exclusive cryptography dependencies. Removed the obsolete operator procedure from the active runbook. Earlier dated release reports describe historical builds and are superseded by this note for the removed workflow.
- Previously saved refusals remain respected and can still be affirmatively restored through the existing preference control. No general advertising-disable option was added. Regional advertising rules, age eligibility, onboarding completion, result cadence, RevenueCat reporting, camera/gameplay and leaderboard behavior are unchanged.

## Verification

- Focused Jest verification: **339/339 tests across 7/7 suites passed** (`InfoPrivacy`, `PrivacyChoices`, monetization, UMP privacy controls, regional clarification, launch-processing integration and game entry).
- TypeScript `tsc --noEmit`: passed.
- Strict project lint (`oxlint --no-ignore --deny-warnings`): passed.
- Offline Yarn 4.12.0 immutable install with `--mode=skip-build`: passed; the lockfile matches the dependency removals. No dependency or native build scripts ran.
- `git diff --check`: passed. Source scan found no remaining manual request-screen, support-response module or signing-tool references in app/runtime code.
- No application build or upload started. Installed TestFlight version 1.0.0 (5), public website and account settings are unchanged.

## Review limits

Google UMP displays the messages configured for the application and determines whether its privacy-options form is required. It does not guarantee coverage of every regional privacy obligation or historical-data request. Using the SDK does not guarantee Apple approval. Native device testing remains necessary after an owner-authorized future build; the installed TestFlight build is unchanged.

References: [Google UMP on iOS](https://developers.google.com/admob/ios/privacy#privacy_options), [Apple App Review privacy guidelines](https://developer.apple.com/app-store/review/guidelines/#data-collection-and-storage).
