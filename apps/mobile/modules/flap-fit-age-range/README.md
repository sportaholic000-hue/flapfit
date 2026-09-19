# Flap Fit Apple age-range bridge

Local Apple-only Expo module. Generated with Expo's create-expo-module scaffold, then reduced to age-requirement and age-range methods (no native view, Android implementation, custom age screen, logging or persistence).

## Integration

Import getAppleAgeRequirements and requestAppleAgeRange from this directory. Add ./modules/flap-fit-age-range/app.plugin.js to Expo plugins. Expo autolinks local modules from apps/mobile/modules; no npm package or package.json change is required.

getAppleAgeRequirements never asks the user to share age. requestAppleAgeRange may show Apple's system sheet. No argument preserves gates 13/16/18. Callers may instead pass one to three validated integer gates, for example requestAppleAgeRange([14]) or requestAppleAgeRange([14, 16, 18]), when those distinctions are needed. Apple requires at least two years per requested range, so 13/14/18 is invalid; 14 itself is a valid threshold. Validation rejects empty, unsorted, duplicate, fractional, non-finite and too-close gates without showing a system sheet. No automatic extra request or custom question is added.

An older native client keeps the legacy default request but returns unsupported for custom gates instead of quietly requesting a different range. The app coordinator owns request timing and applicable decisions. A requested threshold is not evidence of a user's age. Regulated regions may override it; use only the actual inclusive bounds Apple returns. If Apple still returns 13–15, do not pretend it resolved the under-14 boundary. Reduce the transient response to necessary verification/purpose decisions and discard the raw Apple range/source/assurance after verification; do not retain the original interval for later questions.

Responses carry exact inclusive bounds, assurance and required regulatory flags. null bounds have their documented open-ended meaning; missing/failed/declined/unsupported responses never become adult. Future unknown regulatory flags are retained as unknown. No native error text or arbitrary response fields reach application code. Raw results are ephemeral and must not be logged, stored or sent to analytics, ads or RevenueCat. Apple age/download approval is not advertising/data-processing consent.

## Native build and signing

Use Xcode/iOS SDK 26.4 or later for a production candidate's required-regulatory flags; 26.5+ is preferred for the current confirmed assurance case. The podspec reads the actual SDK version and conditionally compiles new symbols. An older SDK on a newer OS cannot invent support: it returns explicit compiledCapabilities and unknown assurance where unavailable. Runtime guards preserve the existing deployment target:
- iOS26.0: base age-range request, no regional eligibility result.
- iOS26.2: regional eligibility and older assurance-method values.
- iOS26.4: required regulatory features.
- iOS26.5: current confirmed assurance case.

A weak framework link and canImport guard permit unsupported builds/platforms to return unsupported; a production candidate must actually use the stated SDK and link this module. Inspect compiledCapabilities on the installed build; unsupported feature lookups never imply an exempt user. Expo Go, Android, web and builds without this native module return unsupported. No private/signing files belong in this module.

The plugin sets com.apple.developer.declared-age-range. Enable the matching App ID capability and regenerate/download a profile containing that entitlement before signing; a pre-capability profile cannot be assumed usable. No certificate or purchase key needs revocation.

## Verification

Run the module Jest bridge tests as part of mobile tests. Native Swift must additionally compile on EAS/macOS, followed by Apple sandbox cases on an installed iPhone/iPad: each supplied age interval, declined sharing, unavailable service, regulated vs unregulated requirements, old OS fallback and repeated calls. JS mocks do not validate Apple's runtime or native compilation.

Future significant app updates must honor the returned parental-consent/adult-notification flags; this bridge does not invent an initial-launch significant update. Consent revocation is a separate App Store server-notification responsibility.

## Primary API references

- https://developer.apple.com/documentation/declaredagerange/requesting-people-share-their-age-range-with-your-app
- https://developer.apple.com/documentation/declaredagerange/agerangeservice/requiredregulatoryfeatures
- https://developer.apple.com/documentation/declaredagerange/agerangeservice/agerangedeclaration
- https://developer.apple.com/support/age-assurance
- https://developer.apple.com/documentation/storekit/testing-age-assurance-in-sandbox (explicit inclusive bounds: nil-12, 13-15, 16-17, 18-nil)
- Apple documentation metadata, checked 2026-09-19: confirmed introduced26.5; requiredRegulatoryFeatures26.4; activeParentalControls26.0.


## Passive app-transaction identity for consent revocation

Import getVerifiedAppleAppTransaction from ./app-transaction. This separate call reads StoreKit AppTransaction.shared on iOS 16+ and returns either {status:'verified', signedAppTransaction:string} or {status:'unsupported'|'unavailable'|'unverified'|'error', signedAppTransaction:null}. The native module only exports a JWS when StoreKit reports .verified. It does not call refresh, request a purchase or sign-in, present a custom question, extract an appTransactionID, or cache/log/persist the result. Missing native methods and unsupported platforms fail closed.

Forward the signed JWS directly to Flap Fit's verified server status/link endpoint and discard it. The server must separately validate its signature/certificate chain, bundle ID, app ID and environment before deriving a private revocation identity. Do not send it to analytics, RevenueCat, advertising or ordinary gameplay APIs. This bridge supplies download identity only: a valid app transaction does not establish current parental or processing consent and must never reset a stored revocation. The native module has no UI or SDK initialization. The separate appleRescission service checks and links required Apple competition access before game requests; source wiring alone does not configure or prove Apple server-notification delivery.

- https://developer.apple.com/documentation/storekit/apptransaction/shared
- https://developer.apple.com/documentation/storekit/verificationresult/jwsrepresentation-6ma59
- https://developer.apple.com/documentation/storekit/apptransaction/apptransactionid

Native compilation and installed Apple sandbox verification are required separately from wrapper tests.

Native verified AppTransaction.environment (iOS/iPadOS 16+) is exposed only as Production or Sandbox to select the matching fixed verification endpoint. Xcode/unknown values fail closed. The server independently verifies the environment; JavaScript never decodes the JWS and never retries another environment on failure. https://developer.apple.com/documentation/storekit/apptransaction/environment
