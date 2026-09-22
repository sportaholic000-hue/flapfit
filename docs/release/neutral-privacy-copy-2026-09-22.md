# Neutral age and location wording — September 22, 2026

The owner found that the installed Privacy & choices sheet exposed which regional answers suppress advertising. The same flaw existed in explanatory text, saved New York status, processing-status messages, age availability text and error notices. This contradicts the owner's instruction.

The revised app asks factual age/location questions and confirms saved answers without stating their advertising outcome. It removes the Quebec/Connecticut explanations, New York outcome/history explanation, age/region-dependent ad status, unanswered-question outcome text and save-error outcome text. Explicit saved privacy decisions and retry controls remain truthful. Advertising/provider decisions and the under-13 gameplay restriction are unchanged. The residency note is simply "Your answer is saved on this device."; the redundant instruction to answer based on residence was removed after owner review.

## Verification and visual review

- Eight focused suites / 250 tests passed. These include real component rendering plus the actual local eligibility and provider-integration paths with native/network APIs mocked.
- Rendered Google advertising text is identical across tested country, age, province/state and New York answer states. Positive and negative advertising decisions are asserted independently. Eligible adult, Canadian outside-Quebec teen, Australian age threshold, Mexican age threshold, US minor and New York saved-history behavior remain covered.
- TypeScript, strict lint and production release validation passed, including exact-byte checks for all six bundled tracker assets.
- [The standalone 83-state gallery](evidence/neutral-privacy-copy-2026-09-22/index.html) renders the captured component trees and actual styles through the installed React Native Web renderer. It includes all four launch countries, every offered local age band, before/after regional answers, reopening, save failures, the actual shared disclosure alert and common age/access screens.
- This is a browser-rendered source preview, not a physical iPad screenshot. Native alerts contain the exact title/message/button text captured from the app, while their OS chrome is not reproduced. Apple's age/permission dialogs and Google's own forms vary by device/account and are not fabricated in this gallery.
- Preview navigation was checked in the browser for Canada, the US/New York saved state, Australia, Mexico and shared age/access screens. Source hashes are saved in the preview manifest.

## Reproduction

Set FLAPFIT_PRIVACY_PREVIEW_OUTPUT to an absolute writable path ending in screens.json. Run the PrivacyChoices, GameEligibilityGate and launchProcessingIntegration Jest suites. They write screens.json, gates.json and notices.json beside that path. Then run:

    node apps/mobile/scripts/render-privacy-preview.cjs <capture-directory>

The renderer produces index.html and preview-manifest.json. It performs no provider or backend requests and creates no runtime app route. Captures use synthetic local test state.

## Device status

Installed build c3a053bb still contains its old copy. This record covers the corrected source and review gallery; a later native build is needed to change the installed app. No new cloud build, website publication, provider/account change or monetary commitment occurred in this correction.

The owner's camera startup delay and unusual bird movement reports remain open. They are not marked resolved by this presentation-only correction; gameplay and tracker rules have not been altered here.
