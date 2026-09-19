# Processing readiness and launch-scope reconciliation

An independent age/status/consent decision can finish while the lobby remains mounted. The lobby previously subscribed only to Apple's duty and completed-check state, so a later permitted ad decision could remain inactive until another lobby visit. It now reacts to effective ad eligibility, age treatment and independent RevenueCat permission. If an older Google setup/form still owns presentation, the current policy resumes after it finishes. A later game entry, withdrawal, blur or background invalidates the continuation. An unchanged failed request does not become an automatic retry loop.

RevenueCat refusal remains independent: permitted restricted ads can initialize without loading RevenueCat. No user-facing choice, regional permission grant, ad placement or cadence changed. The production region/purpose coordinator is still unfinished; mocked permitted fixtures do not establish launch readiness.

## Reconciliation of earlier evidence

The production root already mounts startCompetitionForegroundRetry, which starts Apple authorization-status monitoring whenever Apple duties require it, even without online participation. The previous required-apple-age record incorrectly said monitoring was unmounted. Three added integration tests verify startup, later duty resolution, synchronous publication and cleanup without creating an anonymous account. No duplicate monitor was added.

[Apple's age-assurance guidance](https://developer.apple.com/support/age-assurance/) says Apple prevents app launch after parental app-access consent is revoked. No extra app lock screen was added on that basis. The existing processing/status checks and server notifications still require physical rescission/linkage verification.

## Owner-selected launch scope

The owner removed **China mainland, Hong Kong and Iraq**. Read-only App Store Connect verification shows each as **Not Available**, with **172 countries or regions** available. Canada and the United States remain **Available on App Release**. The agent changed no selection. This supersedes the prior 175-country worldwide record, while retaining worldwide launch in the remaining selected territories. Availability is not evidence of runtime privacy clearance.

## Verification

**47 mobile suites / 886 tests passed**, including 153 focused cases. TypeScript and four-file strict scoped lint passed. See [machine-readable evidence](evidence/processing-readiness.json) for source hashes and full test output. Native APIs are mocked; this does not prove installed behavior or genuine RevenueCat receipt. The existing signed build 710512ba (1.0.0 build 2, source 0be68de) predates these changes. No preliminary link or store submission was sent.
