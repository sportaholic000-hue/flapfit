# Region-specific processing controls — implementation status

Updated September 19, 2026. This is an implementation checkpoint, not release clearance.

## Owner decisions

Flap Fit remains a 13+ ad-supported app. The universal optional-ads proposal is rejected. There is no approved discretionary adult Allow ads switch, Play without ads button or free remove-ads setting. Required consent and opt-outs apply to the actual processing and jurisdiction. Restricted advertising must continue independently of RevenueCat refusal whenever its own route is permitted. RevenueCat must genuinely function for permitted users.

The owner personally selected worldwide availability, with Canada and the USA priorities. App Store Connect shows 175 Available. Free download pricing (AUTO_FREE, price 0) was saved and persisted after reload on September 19. No territories were changed. The owner submitted EU trader identity documentation on September 19; Apple review is pending. Apple now has the approved not-a-regulated-medical-device declaration and a saved calculated 13+ age rating (12+ equivalent on pre-26 operating systems). The rating questionnaire flags Afghanistan and Morocco as unavailable under local rules; selected territories were not edited.

The prior age-and-residence questionnaire and standalone disclosure proposal is withdrawn. No entire interface is approved, and no new consent/questionnaire UI has been added. Use sufficient Apple and provider information before proposing any narrow unresolved question; worldwide release is not yet cleared merely because worldwide availability is selected. In this intermediate source state, processing cannot start until an approved runtime coordinator supplies verified decisions. This is not a permanent global RevenueCat or teenage-ad shutdown and is not a releasable candidate.

## Implemented controls

- Independent advertising, RevenueCat and competition decisions; unknown age/location never becomes adult permission.
- Explicit regional requirements and missing technical facts: applicable jurisdiction, Quebec threshold where relevant, independent New York scope/consent, Connecticut necessity checks, verified advertising route or provider-only processing, disclosure, data sensitivity and purpose/retention restrictions.
- AdMob requests use non-personalized advertising, restricted-data-processing request extras, PG content rating and native age treatment. UMP permission is separate from RevenueCat permission.
- Revoking RevenueCat permission leaves independently eligible ads usable. Withdrawal cancels native RevenueCat requests, closes transport to new work, rejects stale operation generations and purges persisted ad/paywall events. Fresh permission can resume genuine reporting. No logOut-as-shutdown claim.
- Competition gates cover authentication, reads, writes, response parsing, retries and refresh. Authenticated deletion/support use a separate rights-access path without renewed participation.
- Concurrent first-use competition requests share one anonymous identity. Timeouts recover without cancelling other callers. Intentionally local runs stay local and receive no failed-upload message.
- The Apple Declared Age Range module queries required regional features, supports suitable requested gates including 14 alone or 14/16/18, fails closed on missing/error evidence, and does not treat download permission as data-processing consent. Actual returned bounds remain authoritative; there is no new custom question.
- New York applicability uses transient purpose-specific in-state activity/history or verified wholly-outside evidence. Residence alone cannot grant an exemption or establish the full processing rule.
- Stored UMP applicability is presence-aware: true/false/null with an exact native patch version. A missing key or older binary cannot become verified non-European permission. Querying it does not initialize Google Mobile Ads or authorize RevenueCat.

## Native withdrawal limits

Locked chain: react-native-purchases 10.9.1, PurchasesHybridCommon 18.37.0, RevenueCat iOS 5.88.0. The vendor SDK has no supported complete shutdown API. The version-pinned build patch fences RevenueCat's HTTP/CDN requests, scheduled reporting operations and persistent event writes. It cancels active URLSession tasks and purges event files. A recursive lock prevents withdrawal/write races; permission generations prevent queued work from resuming after a later grant.

The SDK object and StoreKit observers may remain allocated. Cancellation cannot retract data already transmitted or delete server records. This is transport and event-processing enforcement, not SDK destruction. A native stop failure must remain visible; callback silence cannot establish successful withdrawal. Device traffic verification through background, foreground and relaunch is still required.

AdMob has no demonstrated complete shutdown API either. The app disposes preloaded ads and stops new requests on loss of permission. This does not prove all internal Google background activity has stopped. Relevant withdrawal cases need installed-device inspection before being cleared.

Android RevenueCat remains off until an equivalent native stop mechanism is verified; this does not block independent Android ads or the Apple-first work.

## Apple capability and signing evidence

The existing com.flapfit.game identifier now has Declared Age Range enabled. Existing App Store profile Flap Fit App Store was regenerated using the same distribution certificate; no certificate was revoked. Downloaded profile inspection verified:

- UUID d222fac2-c6f5-4375-806f-6f08cef38bbb.
- com.apple.developer.declared-age-range = true.
- application-identifier = KM48R8T97P.com.flapfit.game.
- get-task-allow = false, no registered-device list (App Store profile).
- Signing certificate SHA-256 unchanged from the prior profile.

The ignored local credential file points to the regenerated profile. Remote Expo credential import completed successfully: the active regenerated profile was assigned to @flapfitapp/flapfit, and Expo reported that all credentials are ready to build. Signing files, passwords and private keys are excluded from Git.

## Verification already completed

- Historical independent-control checkpoint: 42 suites / 718 tests passed, exit 0, including parameterized Apple age gates, purpose-specific New York applicability and presence-aware UMP signals. No production warning was suppressed.
- TypeScript, strict scoped lint and whitespace checks passed for the independent control changes.
- Native RevenueCat and AdMob patches applied to their exact locked source versions, were idempotent, and rejected unexpected source changes in fixture checks.
- The Swift cancellation/purge harness passed on the Mac host in signed device build 710512ba-6445-42d8-af23-659d862a3298. The ten-file RevenueCat patch was verified and the source 0be68de native archive finished successfully. This still does not establish installed-device or RevenueCat event receipt.
The previous successful simulator build 168235db-6728-4956-a9bc-77dc5109fa19 predates these changes. It is not evidence for this implementation or an installable device candidate. Compile 5f203f43-8b70-4c82-a189-0bb208c2ffbe, version 1.0.0 (2), source d84ea63b52009794b5dc20618e6d34bd7d420bbc, was accepted and failed during pod installation: registry pod specifications were not present in Pods/Local Podspecs. The hook now obtains exact resolved versions from CocoaPods installer targets, preserving all source hashes. A fixture without any Local Podspecs directory verifies version rejection, application, idempotence, tamper rejection and CLI arguments. The corrected native compile passed: Expo build 75760bcb-f8f1-48a8-a82e-ca7f132bcc35, source d5e9b3912f232201799e009d5fbb4ab2f15fc35a, version 1.0.0 (2), completed September 19 at 19:18:41 UTC. This is a simulator artifact, not an installable device build or installed-runtime verification. Later source edits require their own candidate build.

## Remaining release gates

1. Finish automatic-signal resolution and show the minimal exact sequence before adding any custom prompt. Connect the runtime coordinator and independent Info privacy settings. Required rights must remain accessible regardless of UMP status and SDK initialization.
2. Complete explicit data-flow/configuration assessments. Console evidence currently confirms only the default AdMob mediation group; third-party bidding and Google-certified demand are not yet cleared merely by that fact.
3. Finish the native compile, produce a signed installable iPhone/iPad candidate using the imported compatible profile, and verify Apple age/required-access handling on it.
4. Actual device evidence: permitted-user RevenueCat receipt; restricted test ads with RevenueCat denied; unknown/refusal/withdrawal, in-flight work, background/foreground/relaunch; deletion/support while participation is off. Use supported test ads/registered devices, never fabricated revenue or live-ad clicks.
5. Finalize content rights, truthful App Privacy disclosures, required screenshots and a tested build. The 13+ age rating and non-medical-device declaration are saved. EU trader verification awaits Apple review. Worldwide availability and free download price are recorded; their privacy/legal release requirements remain separate. No App Store submission is authorized.

## Sources and legal implementation boundaries

- [Texas app-store law, sections 121.054–.056](https://tcss.legis.texas.gov/resources/BC/htm/BC.121.v3.htm): Apple-provided personal data must be deleted after verification; in-memory lifetime also matters. Derived operational protections are an implementation inference, not a statutory safe-harbor certification.
- [Apple age assurance](https://developer.apple.com/support/age-assurance/) and [age-range request documentation](https://developer.apple.com/documentation/declaredagerange/requesting-people-share-their-age-range-with-your-app).
- [New York Attorney General guidance](https://ag.ny.gov/child-data-protection-act-guidance), [Connecticut law](https://www.cga.ct.gov/2026/sup/chap_743jj.htm).
- [Canadian meaningful consent](https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/p_principle/principles/p_consent/), [Quebec private-sector privacy statute](https://www.legisquebec.gouv.qc.ca/en/pdf/cs/P-39.1.pdf).
- [Google restricted data processing](https://support.google.com/admob/answer/14125907?hl=en), [limited ads](https://support.google.com/admob/answer/10105530?hl=en), [RevenueCat DPA](https://www.revenuecat.com/dpa).

Gameplay, calibration, recording/audio, sharing and result-exit ad placement are unchanged. The game screen diff is limited to competition result disposition and neutral messaging for local runs.

## Follow-on native and device preparation

- Passive StoreKit AppTransaction reader added for Apple consent-revocation verification: native verified JWS only, no refresh/sign-in/purchase UI, storage, logging or app identifier exposure to ad/analytics SDKs. The receiving server must independently verify it. A valid download alone is not consent and must not clear revocation.
- Focused Apple bridge tests including the new reader: 97 passed; TypeScript, scoped lint and whitespace passed. Native compilation/device testing is still required.
- Both test devices are enrolled and the Ad Hoc profile includes both devices plus declared-age-range. Signed internal build 710512ba completed successfully for source 0be68de. The production App Store profile is preserved separately. No TestFlight upload or App Store submission occurred.
- The RESCIND_CONSENT receiver/linkage is implemented, deployed and configured in App Store Connect. Genuine Sandbox TEST delivery then exposed missing X509 APIs in the hosted Deno runtime; delivery remains blocked. A compatible, locally tested Node verifier is prepared but not deployed. See review-reconciliation-2026-09-19.md for the exact evidence.
## RevenueCat ad-measurement scope follow-up

The pinned iOS profile now preserves real AdTracker event delivery and the random app identifier while suppressing unrelated customer, purchase, entitlement, offering, configuration, attribution and feature-event startup and transport. The IDFV request header is removed. This app has no purchases or subscriptions. The consent cancellation/purge fence remains independent of advertising eligibility.

All ten exact-version source transformations, idempotence, drift rejection, endpoint/startup assertions, script syntax and whitespace checks passed. These follow-on native changes are covered by successful signed device build 710512ba from source 0be68de; installed verification remains required. In particular, demonstrate backend receipt for a fresh permitted RevenueCat app ID without a customer-info GET; SDK source alone does not establish server acceptance. Retained event IDs are pseudonymous, not anonymous data. Native objects and the random-ID cache may remain after withdrawal; the enforced stop covers transport, active tasks and queued ad events.

## Review successor

The reconciled full run now passes 44 suites / 811 tests, with 32 receiver/database tests. See review-reconciliation-2026-09-19.md for F1, current deployment/signing evidence and open worldwide/runtime/device requirements. No revised consent interface has been added.
