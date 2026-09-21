> Current source reconciliation (September 21): regional advertising is independent of gameplay, with the 13+ minimum retained. Both New York answers persist locally; the old first-game marker is unused. Notice-based advertising now has accessible data-consent withdrawal, and Info has an inappropriate-ad report draft. These changes add no automatic provider payload or collected category. Website version 34 is published. The existing twelve-category worksheet still requires reconciliation with the eventual compiled artifact and confirmed publication status. See third-party-audit-2026-09-21.md. No new app build or Apple write is authorized before the owner’s audit.

# Flap Fit App Privacy answers — four-country Apple release

Current implementation worksheet, September 19–20, 2026. Scope: Canada, United States, Australia and Mexico; the parent task verified those four saved Apple territories. This supersedes the older stock-RevenueCat purchase/IDFV assumptions in `apple-app-privacy.md` and `privacy-remaining-review-2026-09-19.md`. It does not claim the final native candidate has been installed or that this questionnaire is already published.

## Entries to prepare in App Store Connect

- Does this app or its third-party partners collect data? **Yes**.
- Privacy Policy URL: **https://flapfitapp.com/privacy/**.
- Privacy Choices URL: **https://flapfitapp.com/privacy/**.
- Select the categories and purposes below. Conditional collection still belongs on the label: the questionnaire describes the released app's permitted paths, not just a user who refuses them all. Apple requires ongoing optional collection and partner collection to be disclosed. [Apple definitions](https://developer.apple.com/app-store/app-privacy-details/)

**AF** = App Functionality; **AN** = Analytics; **TA** = Third-Party Advertising. Select exactly the expanded purpose names in Apple. **N\*** is the implemented no-tracking answer, subject to the specific final verification below; it is not a claim that NPA alone proves that answer.

| Apple data category | Purposes | Linked to user? | Used for tracking? | Actual collection and condition |
| --- | --- | --- | --- | --- |
| User ID | AF, AN | Yes | No | Permitted competition: anonymous account ID and public handle. Required Apple consent service: app-transaction identifier hash, optionally linked to the existing account. Independently permitted RevenueCat: separate generated anonymous ID; no competition-ID mapping. |
| Gameplay Content | AF | Yes | No | Permitted online leaderboard runs: score, run ID/type and related result records. Local-only runs are not uploaded. |
| Fitness | AF | Yes | No | Online run's exercise category and duration. No fitness attributes go to Google or RevenueCat. |
| Other User Content | AF | Yes | No | Online moderation reports, reasons and blocking records; associated account/result identifiers. |
| Other Data Types | AF | Yes | No | Required Apple consent/revocation status, notification ID and timestamp linked to the hashed app-transaction identity; existing online account linkage where applicable. This is authorization administration, not advertising. |
| Coarse Location | AF, TA, AN | Yes | N* | Country determination/consent administration and Google's IP-derived general location when eligible Google processing runs. Current network-country lookup uses the existing Cloudflare-hosted domain; trace IP/text is discarded in the app. No GPS permission or precise position. |
| Device ID | TA, AN | Yes | N* | Google's documented app/developer-bound device identifiers. Do not remove this category merely because IDFA and publisher first-party ID are disabled. RevenueCat's IDFV header is separately removed. |
| Advertising Data | TA, AN | Yes | N* | Google ad delivery/measurement; independently permitted RevenueCat ad load, impression, click, failure and actual paid-impression reporting. |
| Product Interaction | AF, TA, AN | Yes | N* | Google/UMP interactions and consent-function operation; permitted RevenueCat ad interaction events. No workout telemetry is attached. |
| Crash Data | AF, TA, AN | No | No | Google's non-user-related SDK crash information. RevenueCat diagnostic collection is disabled. |
| Performance Data | AF, TA, AN | Yes | N* | Google's user-associated SDK performance signals. |
| Other Diagnostic Data | AF, TA, AN | Yes | N* | Google operational diagnostics plus retained Supabase Auth/API/function security/error logs. The backend portion is AF only; combined category purposes include Google's use. |

The Google categories are supported by its [iOS disclosure guide](https://developers.google.com/admob/ios/privacy/data-disclosure) and the actual embedded Google/UMP manifests in [the inspected IPA](evidence/regional-store-privacy-manifests.json). The guide includes app/developer-scoped identifiers, non-user-related crashes and user-associated performance. Conservative linked **Yes** applies where any included path retains an account/device association; a randomly assigned ID does not make the combined category anonymous.

Do **not** select Developer's Advertising or Marketing, Product Personalization or Other Purposes for these paths: this implementation does not send marketing campaigns or personalize product content. The generic Google manifest contains capabilities broader than this app's configured use.

## Categories left unchecked

**Purchase History; Health; Precise Location; Financial/Payment/Credit Info; Contacts; Sensitive Info; Browsing History; Search History; Photos or Videos; Audio Data; Environment Scanning; Hands; Head.** Camera/pose processing, video/audio recording and local exercise history stay on-device; external sharing is user-directed. No birthday or raw Apple age range is sent to these providers.

**Name, Email Address, Phone Number, Physical Address and Other User Contact Info:** not collected by native account/analytics features. A public player handle is covered by User ID. Optional user-initiated email support is not a native contact-capture field; no separate in-app Customer Support collector exists. Do not claim the support mailbox never receives voluntarily supplied correspondence.

## RevenueCat reconciliation: no purchase-history collection in this build

The [stock RevenueCat guide](https://www.revenuecat.com/docs/platform-resources/apple-platform-resources/apple-app-privacy) tells ordinary SDK integrations to disclose Purchase History for analytics and receipt/entitlement functionality. That does not describe this patched ads-only execution path. Flap Fit offers no purchases/subscriptions; the pinned native patch disables purchase/receipt/customer/offering/configuration/attribution startup and rejects non-ad HTTP routes. It retains AdTracker delivery. Consequently **leave Purchase History unchecked for this verified source** rather than claiming nonexistent purchase retrieval. Apple app-transaction credentials are used for consent verification; the service retains the identifier hash/status, not purchase contents or payment history.

Actual RevenueCat reporting contains its anonymous app ID, session/event/impression identifiers and timestamps, ad placement/unit/type and genuine ad-event/revenue data, with SDK/app/build/OS/device-model/locale/storefront/environment headers. These support User ID, Advertising Data and Product Interaction for AN. IDFV is removed; automatic device-identifier collection, diagnostics and in-app messages are disabled. The app never sets customer contact attributes. [RevenueCat ad reporting](https://www.revenuecat.com/docs/ad-monetization)

Source evidence: `apps/mobile/scripts/patch-revenuecat-processing.cjs` (version/hash-pinned route and startup restrictions), `apps/mobile/src/services/monetization/index.ts` (configuration and payloads), `supabase/functions/flapfit-apple-consent/core.ts` (retained consent fields). The old IPA's generic RevenueCat privacy manifest declares Purchase History; this is a library declaration, not evidence that blocked purchase routes ran. The build-4 worker confirms the reviewed native patch, with isolated native harness results recorded below; no RevenueCat support-response gate is introduced.

## Exact remaining verification before publishing the final label

**Tracking N\***: current source requests only NPA with RDP, disables Google's publisher first-party ID before initialization, contains no ATT/IDFA request, and supplies no cross-company user identifier or fitness attributes. RC and competition identifiers are not joined. Select **No** for the reviewed no-cross-app-association configuration; final publication must reconcile the actual compiled flags/provider route with that configuration. Google's generic embedded manifest flags Device ID as tracking-capable; it does not prove runtime tracking. Conversely missing ATT alone does not prove no tracking. There is no verified evidence here of cross-company association that would justify marking Tracking Yes. The outstanding point is verification of the enabled Google route, not a new data category, blanket ad-free policy or a new consent question. [Apple tracking definition](https://developer.apple.com/app-store/app-privacy-details/), [Google privacy controls](https://developers.google.com/admob/ios/privacy/strategies), [NPA behavior](https://support.google.com/admob/answer/7676680)

Build-4 native artifact checks are complete as recorded below; installed checks and the genuine Xcode aggregate report remain pending. No other mandatory data category is unresolved in this source worksheet. AdMob/UMP permissions, RevenueCat permission and competition eligibility remain independent: refusal of one does not erase disclosures for another permitted path, and required country/Apple authorization administration is not treated as optional ad analytics.

## Build-4 artifact reconciliation

Store 103c8936, source c05f497, was inspected on September 20. All 15 manifest semantics match the previously reviewed artifact, including the stock RevenueCat Purchase History capability declaration. The worker verifies the ten-file native ads-only/consent fence, and its isolated lifecycle harness passes. Actual production profile, delayed Google measurement, no ATT usage description, permissions and entitlement are confirmed in the signed app. These close native-artifact observations only; they do not prove real provider traffic, native physical behavior, generate an Xcode aggregate report, or publish the Apple questionnaire. The existing twelve-category draft remains saved but unpublished.
