# Flap Fit — remaining privacy work, September 19, 2026

Read-only review of the current repository and official provider guidance. No source or account settings changed. This is an implementation recommendation, not a claim that a signed binary or legal compliance has been verified.

## Decision

Do not wait for signing to prepare App Privacy answers and finish the age-treatment decision. Most facts are already established. Final native verification is a later reconciliation step, not a reason to leave all privacy work untouched.

The real open source/configuration question is age treatment: the intended 13+ audience can include people below their regional consent age, while the app currently has no age signal. PG creative filtering and non-personalized ads do not resolve that question.

## Exact present behavior

- `apps/mobile/src/services/monetization/index.ts:107`: UMP `requestInfoUpdate()` has no age parameter. Its native default is false. Only lobby focus may present consent, and game entry invalidates pending form requests.
- Lines 118 and 146: both initialization paths set only `maxAdContentRating: PG`. Neither sets age treatment. Ads remain disabled after failed/denied consent when `canRequestAds` is false.
- Line 186: every interstitial requests non-personalized ads. No demographics, exercise category, training time, competition profile or health information is sent to either monetization SDK by this adapter.
- RevenueCat configuration disables automatic device-identifier collection and diagnostics. It uses its own anonymous identifier and records ad load/display/click/revenue events. This does not eliminate Google's independent device/IP/diagnostic processing.
- `app.config.js` delays ad measurement startup, supplies AdMob IDs and SKAdNetwork entries; no ATT request or tracking permission string is configured. `app.json` says tracking false, declares the four competition data categories and required-reason APIs. A source manifest cannot prove the final linked SDK manifests.
- Installed wrapper 16.5.0 already supports `ageRestrictedTreatment` in JavaScript and iOS native code. Its podspec resolves Google Mobile Ads 13.5.0 and UMP 3.1.0. No package upgrade is needed to use the age-treatment API.

## App Privacy answers that can be prepared now

Top-level **Yes, data is collected**. Policy: `https://flapfitapp.com/privacy/`. Privacy choices can point to the live privacy/deletion controls page. No IAP feature needs to be created.

### Exact entries ready to save as the current-source draft

- Privacy Policy URL: **https://flapfitapp.com/privacy/**.
- Privacy Choices URL: **https://flapfitapp.com/privacy/** (the already verified page explaining privacy controls and deletion).
- User ID: **App Functionality + Analytics; linked Yes; tracking No** (combined competition and RevenueCat purposes).
- Gameplay Content, Fitness, Other User Content: each **App Functionality; linked Yes; tracking No**.
- Purchase History: **App Functionality + Analytics; linked No; tracking No**, based on the present separate anonymous RevenueCat identity and no identity mapping. This answer must change if identifiers are later connected.
- Coarse Location, Device ID, Advertising Data, Product Interaction: each **Third-Party Advertising + Analytics; linked Yes; tracking No** as the conservative current-source draft. No-cross-app tracking remains a final shipped-configuration verification, not something NPA proves alone.
- Crash Data: **App Functionality + Analytics + Third-Party Advertising; linked No; tracking No**, reflecting Google's explicitly non-user-related crash logs.
- Performance Data: **App Functionality + Analytics + Third-Party Advertising; linked Yes; tracking No**, reflecting Google's user-associated performance data.
- Other Diagnostic Data: **App Functionality; linked Yes; tracking No**. Resolved from the authenticated request/error paths and Supabase's documented retained Auth/API/function logging below. Exact plan retention duration is not needed to declare that collection occurs.
- Leave **Photos/Videos, Audio, Health, Precise Location, Contacts, Financial/Payment Info, Browsing History** unchecked for the implemented features described above. Fitness is already separately checked. No email/phone/name collection is implemented in the native app.

These are source-supported draft selections, not a claim that App Store Connect has been changed or that the final binary has been reconciled. The backend diagnostic row is resolved; complete the final native reconciliation before treating the questionnaire as release-verified.

| Data type | Present evidence and purpose | Linked / tracking draft |
| --- | --- | --- |
| User ID | Competition ID/handle: App Functionality. Separate RevenueCat anonymous ID: Analytics. | Competition is linked; tracking No under current design. |
| Gameplay Content | Online exercise leaderboard results: App Functionality. | Linked; No tracking. |
| Fitness | Exercise category and active duration submitted with online scores: App Functionality. | Linked; No tracking. |
| Other User Content | Competition names, reports and blocks: App Functionality. | Linked; No tracking. |
| Coarse Location | Google IP-derived approximate location: Third-Party Advertising, Analytics. | Conservatively linked to device; final provider reconciliation. |
| Device ID | Google app/device-scoped identifiers remain possible without IDFA: Third-Party Advertising, Analytics. | Conservatively linked; no IDFA is not proof that no identifiers exist. |
| Advertising Data | Ad impressions, clicks and revenue: Third-Party Advertising, Analytics. | Device/anonymous-customer associated. |
| Product Interaction | Ad interaction and SDK activity: Third-Party Advertising, Analytics. | Device associated. |
| Crash / Performance Data | Google SDK signals: App Functionality, Analytics, Third-Party Advertising. | Crash unlinked; user-associated performance linked, subject to final SDK reconciliation. |
| Other Diagnostic Data | Supabase retained operational/security logs: App Functionality. | Linked Yes; tracking No. |
| Purchase History | RevenueCat's published instructions require Analytics and App Functionality even though this app exposes no purchases. | RevenueCat permits unlinked for its anonymous ID when no identity mapping exists; no tracking by RevenueCat itself. |

Do not declare on-device camera frames, local gameplay video/audio or local training history as uploaded by Flap Fit. User-directed external sharing is not a Flap Fit server upload. No health/fitness attributes go to the ad systems. Preserve the worksheet's warning that NPA alone does not establish “No tracking.”

Apple requires disclosures for retained off-device data including partners; on-device-only processing is excluded. Its categories also cover pseudonymous profiles, not only real names. [Apple definitions](https://developer.apple.com/app-store/app-privacy-details/).

Google explicitly describes IP/coarse location, device identifiers, advertising/interaction signals and diagnostics. Its SDK includes privacy manifests, but the developer must reconcile them. [Google disclosure guide](https://developers.google.com/admob/ios/privacy/data-disclosure).

RevenueCat requires Purchase History; anonymous identifiers can support an unlinked answer only without identity mapping. Ad-only use is not a documented exemption. [RevenueCat Apple disclosure guide](https://www.revenuecat.com/docs/platform-resources/apple-platform-resources/apple-app-privacy).

### Backend diagnostic evidence — resolved follow-up

`apps/mobile/src/services/competitionApi.ts:63` signs in anonymously; lines 309–315 send authenticated requests to the hosted Edge Function. `supabase/functions/flapfit-game/index.ts:312` logs caught service/database errors with `console.error(error)`. The local configuration enables JWT verification and does not disable hosted logging. The retention migration does not delete hosted Auth/API/function logs. Response `Cache-Control: no-store` does not disable server logging.

Supabase automatically retains authentication events in external log storage; optional Postgres audit storage is additional. Its documented fields include user ID, IP, user agent, timestamp and action. [Supabase Auth audit logs](https://supabase.com/docs/guides/auth/audit-logs). The hosted Logs interface supports filtering by Auth actor IDs/API Gateway JWT subjects and records function invocation/associated console events. Retention length depends on plan. [Supabase hosted Logs](https://supabase.com/docs/guides/observability/logs).

Thus operational/security metadata is collected off-device and linkable to a pseudonymous profile/device. Its demonstrated purpose is running, securing and debugging the online service: **Other Diagnostic Data, App Functionality, linked Yes, tracking No**. No evidence supports advertising or behavioral-analytics purposes for these Supabase records. Exact retention days remain unknown but do not block the disclosure. No customer log contents were inspected, and no code/account settings changed.

## Age-treatment implementation choices

Google now supports CHILD, TEEN and UNSPECIFIED request treatment. CHILD restricts personalization, third-party ad-vendor requests and advertising identifiers. This is an ad-treatment setting. PG separately limits creative maturity. [Google age treatment](https://support.google.com/admob/answer/6219315?hl=en-GB).

UMP's under-age flag is separate and is not forwarded to Mobile Ads. Its documentation describes identifying under-consent users so they are not asked to consent. NPA still needs applicable storage consent. [Google UMP guidance](https://developers.google.com/admob/ios/privacy/gdpr), [Google NPA guidance](https://support.google.com/admob/answer/7676680).

1. **All requests CHILD, no age screen:** technically supported for ad requests and may reduce revenue. Keeping normal UMP preserves adult consent, but leaves the unresolved question of presenting a consent form to under-consent users. I found no primary guidance sufficient to certify globally setting UMP under-age=true for all unknown adults simply to suppress forms. Do not label that shortcut a completed consent fix.
2. **Neutral age bands before SDK initialization:** clearest documented technical route. Store only an on-device band, not birth date or a server profile. An intentionally conservative policy can use 13–15 => UMP under-age=true and CHILD; 16–17 => ordinary UMP and TEEN; 18+ => ordinary UMP and current NPA. Unknown or under-13 => no monetization initialization. Keep consent/canRequestAds gating, invalidation and PG on both initialization paths. Age bands are self-declaration, not verified age assurance. Regional requirements still need to match launch territories; these bands are a proposed conservative policy, not a universal legal threshold.
3. **16+ minimum:** requires matching Terms, rating and eligibility treatment. Merely changing the listing does not provide a runtime age signal or resolve teen treatment. Do not silently implement this as an adult flag for everyone.

The owner decision is audience/consent behavior and its revenue tradeoff, not approval to install another SDK. Do not add a birth-date collection system, change calibration, or claim an age-verification feature.

## What must wait, and what must not

**Complete before the artifact:** prepare/save accurate questionnaire drafts and URLs; settle age treatment; align audience/rating/Terms if changed; verify SDK versions; inspect source permissions and SDK configurations. Update the release worksheet now. The current tracker overstates “Blocked — final binary” for the entire E3 task; only final reconciliation depends on the binary.

**Requires the artifact:** inspect generated Info.plist/entitlements/embedded PrivacyInfo files and actual SDK versions; verify required-reason APIs and tracking declarations; check Apple upload diagnostics. On iPhone/iPad, prove consent presentation/refusal/privacy reopening, no ad before permission, cancellation/share return, and no late overlay. Mock tests or published dashboard messages cannot substitute for this.

**Does not independently block Apple submission:** RevenueCat revenue appearing in charts, AdMob store-link approval or ads filling immediately, Android-only validation, contest media. These are operational follow-ups provided the app works without ads and disclosures accurately describe enabled SDK behavior.

**Cannot certify submission-ready yet:** signed native verification and device acceptance are absent, App Privacy is not published/verified, and the younger-user policy is unresolved. There is no evidence here that Apple automatically rejects the current age-flag omission; this is a specific launch privacy risk needing disposition, not a fabricated build error.
