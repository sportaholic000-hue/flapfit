# Specific advertising-data withdrawal assessment

Historical assessment. The September 22 authorized source now includes a device-specific support response mechanism; see [the correction record](apple-review-corrections-2026-09-22.md) and [operator procedure](moderation-runbook.md#device-specific-privacy-response--september-22). Physical-device/provider verification remains distinct from the source implementation.

September 21, 2026 (America/Halifax). Assessment of source `2f9b8a33404c9ed2eb809d03e41cbff8055e6a01`, unchanged in `e9acd2d8a8d359b3c24c3cb1bd48487e62bc6d1d`.

**Conclusion:** the current controls cover separate RevenueCat reporting withdrawal, saved advertising refusals and applicable Google privacy forms. They do not provide a working route for a new, valid withdrawal of consent to Google's personal-data processing on a Canadian installation where Google reports that no privacy form is required. This is a specific support/product capability gap. It does not establish a right to remove all advertising, or justify giving every adult an ads-off button. No such control was added.

## Concrete scenario and requirement

An adult in New Brunswick has completed the app's advertising notice, is eligible for ads, and has no saved refusal. They contact the published support address to withdraw consent to future collection/use of their app-associated identifiers and ad interaction information for advertising measurement. They are not merely opting out of targeted ads and are not asking to delete only old records. For this scenario Google UMP returns `NOT_REQUIRED`; the published US/EU message configuration does not establish a Canadian withdrawal form.

PIPEDA applies to covered commercial personal-information activities, including this Canadian commercial app's consent-based processing. Schedule 1 distinguishes an allowable implied-consent basis from the later right to withdraw that consent, subject to legal/contractual restrictions and reasonable notice. An advertising-funded business model does not itself document such an exception. The reviewed terms identify advertising but do not state an applicable restriction preventing this withdrawal. This assessment does not claim that every operational/security datum must be erased immediately or that every possible request is valid. [OPC scope](https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/pipeda_brief/), [PIPEDA Schedule 1, 4.3 and 4.3.8](https://laws-lois.justice.gc.ca/eng/acts/p-8.6/page-7.html)

Apple separately requires an accessible, understandable consent-withdrawal mechanism and an accurate explanation of withdrawal/deletion in the privacy policy. It does not prescribe a geographic no-ad list, a particular button, a paid plan or universally ad-free access. Failure to fulfill an applicable request is a review/compliance risk; this is not a prediction of rejection. [Apple 5.1.1(i)–(ii)](https://developer.apple.com/app-store/review/guidelines/#data-collection-and-storage)

Google's documented SDK data categories include IP address, app/device identifiers, performance information and ad interactions. Non-personalized advertising changes targeting; it can still use identifiers for frequency management and reporting. Restricted data processing limits uses rather than eliminating the SDK's collection. Therefore neither `requestNonPersonalizedAdsOnly: true` nor `rdp: '1'` is evidence that the example's affected processing has stopped. Actual device traffic has not been measured by this audit. [SDK data disclosure](https://developers.google.com/admob/ios/privacy/data-disclosure), [Non-personalized ads](https://support.google.com/admob/answer/7676680?hl=en-GB), [RDP](https://support.google.com/admob/answer/14125907?hl=en)

## What the implementation actually does

| Request/control | Existing effect | What it does not establish |
| --- | --- | --- |
| Targeting/sale/sharing preferences | App already requests NPA/RDP. Google US-state choices remain available when required. | Not withdrawal from every advertising processing purpose; lawful contextual ads may continue. |
| Google privacy form | Current UMP status is checked; Info exposes the entry when `REQUIRED`. | `NOT_REQUIRED` has no usable form in this app. Google says to hide the entry in this state; adding a dead button is not a remedy. |
| Stop RevenueCat reporting | Existing independent refusal, persistence/retry, transport-stop acknowledgement and reporting gates. | Does not stop Google advertising processing or delete historical RevenueCat records. |
| Previously saved advertising refusal | Restored and honored. Existing `withdrawAdvertisingConsent()` can persist a refusal and stop new app ad work. | An eligible Canadian user without a saved refusal cannot newly invoke that action from the ordinary UI; Retry is only for a previous unconfirmed refusal. |
| Contact support | Opens the published support route; runbook distinguishes request categories. | Email does not mutate the installation's local choice. No ticket/deep-link/backend instruction in current source applies such a refusal. |
| Delete online profile | Authenticated competition deletion and retries remain available. | Competition identity is separate from Google and RevenueCat; deleting it neither fulfills this request nor proves control of a provider record. |
| Historical provider deletion | Existing runbook requires the correct provider identifier/control and confirmation of provider action. | Does not prevent another request from the app. Retention exceptions and independently necessary processing must be evaluated separately. |
| Commercial request for no ads | No general ad-removal control or purchase exists. | A preference for a free ad-free app is not itself the specific legal request assessed here. |

[Google UMP privacy-entry requirements](https://developers.google.com/admob/ios/privacy#privacy_options) support the required/not-required distinction, not a conclusion about every country's legal rights.

Relevant source: `PrivacyChoices.tsx` advertising section; `processingNotice.ts` notice acknowledgement and purpose functions; `privacyRights.ts` separate advertising/reporting functions; `monetization/index.ts` UMP gate, NPA/RDP requests and preload invalidation; `docs/release/moderation-runbook.md` support procedure. This is a demonstrated source/control-path limitation, not an observed unfulfilled customer complaint.

## Smallest concrete proposal — not implemented

For an applicable request like the one above, the existing Contact us workflow needs a scope-specific completion route on the requesting installation. Reuse the existing durable advertising refusal and retry machinery only when the request actually requires stopping the Google processing that the current integration cannot separate. Leave camera gameplay, approved regional rules, independent reporting choices, competition and other users' advertising unchanged. The action must explain the affected processing and honestly distinguish stopping new ad requests from residual native traffic and historical deletion.

This would add a way for an affected adult outside the approved regional exclusions to establish a **new** advertising-processing refusal. That is a product behavior change requiring the owner's decision under this task's boundaries. A private support email, a new runbook paragraph or a successful local setter test cannot substitute for implementing and verifying that route. No new control, remote kill switch, ticket service, site wording or account setting was introduced here.

If the requirement is instead to continue Google ads after this particular withdrawal, first establish a supported provider configuration that actually stops the specified consent-dependent processing. The inspected NPA/RDP controls do not establish that capability. No such capability is claimed. The requirement concerns personal-data processing, not all advertising as a business model.

Any later approved implementation must cover persistence/restart, failed saves, stale preloads/in-flight callbacks, native residual traffic, unrelated reporting/competition state, and a fresh affirmative change of the user's choice. Do not mark the support request complete merely because it was received or old records were deleted.

## Present disposition

The legal/control-path assessment is complete for the specific Canadian scenario. The remedy remains a named product decision, not an unspecified policy question and not an implemented fix. This assessment is not a blanket legal certification of every launch jurisdiction or every provider's retention practice.
