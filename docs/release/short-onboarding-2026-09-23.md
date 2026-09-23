# Short onboarding and Agree & Play

The owner requested brief onboarding across Canada, the United States, Australia and Mexico, using **Agree & Play**, with Terms and Privacy Policy links instead of an additional Learn more control or an expanded provider explanation.

Required setup now starts with “Let’s get you started”, followed by only the applicable existing age/residency/current-location controls. Redundant section labels, introductory helper copy and successful availability copy are omitted from this compact presentation. Saved-answer indicators and error recovery remain available.

The footer reads:

> By tapping Agree & Play, you agree to our Terms of Service and acknowledge our Privacy Policy. Ads support Flap Fit. We use app and device information to deliver ads and measure ad performance.

Terms of Service and Privacy Policy are direct links. The action is **Agree & Play**. There is no Learn more button or provider-detail expansion in required setup. The separate notice-only native result alert is also shortened; its existing Continue/Privacy & choices actions are retained because that alert also serves Done/Home. Explicitly opening Privacy & choices, or visiting Info, retains the existing detailed information and controls.

This changes presentation, not advertising eligibility or consent semantics. Agree & Play uses the existing notice acknowledgment and sheet-dismissal path; it does not create new advertising/reporting grants or overwrite saved preferences. The existing caller rechecks required answers before a subsequent run. Done/Home remains escapable, while Retry, Next level and later entry retain their existing checks. The province/state dropdowns and saved New York answers are unchanged. Age/location answers do not reveal advertising consequences.

No provider SDK configuration, advertising exclusions, backend requests, website text, dependencies, paid services or build configuration changed. No build was started in this change.

Validation: all 505 tests passed across nine focused suites covering rendered country/age states, actual advertising decisions, saved answers, policy links, failed saves, modal dismissal and repeated-run protections. TypeScript (`tsc --noEmit`), strict mobile lint and `git diff --check` passed. An earlier draft test run had one Windows module-load timeout; the complete final run passed without increasing timeouts or changing policy behavior. The actual captured component trees produced 94 review states, and the short Canada setup was visually checked at phone width. This browser rendering is not a native-device test.
