# Friendlier setup and residency dropdowns

The owner approved a shared “Let’s get you started” introduction, a Canadian province/territory dropdown and a US state/territory dropdown for minors. The existing age checks, advertising decisions and separate New York current-location question remain in place.

The shared Privacy & choices content now starts with “Let’s get you started” and “A couple of quick questions to set up Flap Fit.” This applies in Info and the required setup sheet for all supported countries. Apple's native age popup and the Legend-bird “Almost ready to fly” screen are unchanged.

Canada asks “Which province or territory do you live in?” with all 13 provinces and territories. US minors see “Which state or territory do you live in?” with 50 states, DC and the five inhabited territories. An outside-country answer preserves the old No response for people whose storefront country differs from their residence. Lists are alphabetical, start without a selected answer, can be cancelled, and use the existing React Native controls without adding a dependency.

Selecting an item calls the existing residency save operation with only `resident` or `not-resident` for Quebec or Connecticut. No exact province/state selection is retained, logged or transmitted. Existing stored answers are compatible. After a successful save the dropdown shows “Answer saved · Change”; an unsuccessful save keeps the selection reachable and never shows a successful confirmation. A New York residence selection does not answer the separate current-location question. Saved New York Yes and No answers continue to persist without periodic repetition.

No backend requests, services, provider settings, pricing, advertising opt-out, website changes or builds are introduced by this change.

Validation: 498 tests passed across nine focused suites covering PrivacyChoices, game entry/setup, saved regional answers, release eligibility and advertising policy. The final PrivacyChoices suite was also rerun after the outside-country option was added: all 80 tests passed. TypeScript (`tsc --noEmit`), strict lint and `git diff --check` passed. Browser rendering of the actual captured component trees was inspected at phone width for the province dropdown and iPad width for the state dropdown. This verifies the source and rendered layout; native scrolling and touch behavior still need a physical-device check in the next build. No build was started.
