# Privacy-sheet dismissal bypass — September 22, 2026

The installed build continued the selected result action after Privacy & choices was closed without answers or notice acknowledgement. The same incomplete state did not prevent entry from Home, Retry or a fresh app launch. Repeated dismissal therefore allowed repeated runs without completing the setup needed for eligible advertising.

The result flow now returns an explicit completion result. Dismissal with incomplete setup retains the saved result and releases the action buttons; it does not execute Done, Try again or Next level. The game-entry check uses the existing persisted completed-run history to require unfinished setup after the first completed run, including entry from Home/deep links and after relaunch. The neutral recovery screen offers Review setup, Review in Info and Back to Home. Reading/opening/closing a sheet never saves an answer or acknowledges a notice.

Age/location answers and notice acknowledgement are checked separately from permission. Established protected audiences retain gameplay without an advertising notice. Declining optional reporting, Google preventing requests, and unavailable ad inventory do not block gameplay. The existing country-service outage behavior remains: it grants no answers and no permission, and unresolved answers are checked again when country resolution returns. This change does not promise an ad on every run: the unchanged result placement allows eligible ready ads on every second completed exit, at least 90 seconds apart.

No regional advertising rules, provider configuration, ad frequency, motion/camera code, backend contract, game-store schema or storage record was added or changed. There is no new service, backend request or monetary commitment. Existing local progress already records completed sessions.

## Verification

- Six affected suites cover 223 distinct passing tests. The final result-route suite has 14 passing tests and renders the real RootLayout, Home, GameScreen and result buttons with native boundaries mocked.
- Actual Done, Try again and Next level were each dismissed twice without executing their navigation/restart action; each recovered after the missing answers and notice were completed.
- Four-country disclosure-to-choices dismissal, regional unanswered sheets, reopening, module restart, real Home entry, failed notice saving and later recovery are covered.
- Quebec, Connecticut minors, New York protected minors, Australian ages 13–14 and Mexican minors retain their approved gameplay and provider restrictions. The Canadian age-13 outside-Quebec advertising boundary is covered separately.
- Reporting refusal and Google refusing ad requests do not become gameplay requirements. Existing placement/cooldown tests pass.
- TypeScript, strict lint and production configuration/tracker-asset validation passed.
- [84-state browser review](evidence/privacy-dismissal-fix-2026-09-22/index.html), including the new neutral unfinished-setup screen. This renders captured component trees, not physical-device screenshots. Apple/Google-owned dialogs are not recreated.

## Device status

These results verify source and simulated native boundaries. The installed c3a053bb device build contains the reported bypass. A [replacement signed build](https://expo.dev/accounts/flapfitapp/projects/flapfit/builds/f0cf64c3-04c1-43fe-97d9-44f409e2f809) is now complete with these fixes; see the [artifact verification record](privacy-replacement-build-2026-09-22.md). Physical-device acceptance remains pending. The owner said the earlier bird behavior may have been their movement; no motion/tracking adjustment is claimed here. The camera startup speed report has not been resolved by this fix.
