# Independent review handoff — September 23, 2026

No EAS build, native build, TestFlight upload or OTA update is authorized. The owner will explicitly authorize a build only after independent inspection. No subagents. Do not redesign gameplay or add compliance/support workflows.

## Scope and evidence

Compare the repair commit to 9391f404d90093483b2a5a3ccb57f1403524341f; use a453c1916a01903b88b783209d62c2b750363150 as the morning TestFlight reference. Four application files, four tests and one AGENTS.md sentence changed. Additional files in this backup are review documentation only.

Read [repair review](regression-repair-2026-09-23.md), [verification evidence](evidence/regression-repair-2026-09-23/verification.json) and [publication record](evidence/regression-repair-2026-09-23/readiness-followup.json). The 354 test results are latest passing runs per suite, not one full-repository run. Native SDKs are mocked. TypeScript, strict lint, production config and local iOS JS/Hermes export passed. No device FPS or real-ad assertion is justified by these checks.

## Verify independently

- Exact province/state labels persist for all picker options. Returning from a restricted region recomputes regional eligibility and refreshes permitted readiness from the active menu. Do not override Google's canRequestAds or unrelated refusal/setup state.
- Global policy/foreground listeners cannot start Google or RevenueCat preparation. Late menu continuations cannot start SDK work after ownership is lost. Already-dispatched native initialization settles before camera entry. Inspect failure, revocation and retry behavior for deadlocks or accidental ad-free play.
- Results appear before ads; only Done, Try Again and Next Level may show one. First session exit allocates no interstitial. Preserve every-second-exit cadence, 90-second minimum, immediate no-fill navigation, and one action once.
- Preserve Quebec all-age restriction and Connecticut/New York minor restrictions. The pre-existing New York protected-history flag remains after a later answer/location correction; assess it explicitly and report, rather than silently changing policy. It is an independent reason a region change may not enable ads.
- Preserve Agree & Play, short dropdown setup, UMP Manage Privacy Choices and deletion of the manual email/request-ID/response-code workflow and its exclusive crypto packages.
- Confirm no pose tracking, exercise physics, camera processing, backend, dependency or native-module changes were introduced by this repair.

## Remaining acceptance after owner authorizes a build

On the exact signed candidate, check cold launch; each exercise's camera tracking; camera permission recovery; Record & Play and share-return; background/foreground; results-first order; first free exit; later eligible ad; no-fill; repeated region changes and app restart; and native UMP choices. Confirm the existing ads-only RevenueCat patch and final privacy manifests/disclosures in the native artifact. Do not treat this JavaScript export as native acceptance.

Then capture actual candidate screenshots, attach the tested build, confirm App Privacy publication and complete submission. Apple review contacts are already visually confirmed complete; do not erase them based on empty DOM/accessibility values. Reviewer-note menu paths are saved. Privacy policy version 39 is published. AdMob app review/store linking remains separate from the fixed location-state regression. Neither Apple nor Google approval is guaranteed by source tests.
