# Build 11 App Review resubmission — October 9, 2026

The owner and his brother accepted the production candidate after testing on iPad and iPhone. The owner then selected build 11 and completed the App Review resubmission in App Store Connect. Apple’s API independently confirmed receipt at 2026-10-09T04:52:21.579Z (1:52 a.m. Halifax ADT).

- App: Flap Fit, Apple ID 6813280704, bundle com.flapfit.game.
- App Store version: 1.0; native/TestFlight version: 1.0.0 (11).
- Apple build ID: 59a2fedf-8b39-4b3a-b479-dbd89e114a55; processing state VALID.
- App version state: WAITING_FOR_REVIEW.
- Review submission state: WAITING_FOR_REVIEW.
- Existing submission ID: 5e2ee5b1-42bd-4bc8-899a-6e1874d3c99a.
- Existing release option: AFTER_APPROVAL (automatic release after approval), preserved.
- Exact binary source: fcbf4e0c4bb2b5bdb07d85e5630f173786a72718.
- EAS production build: 90abaf28-65cd-43e5-b542-70a49c56c68d.
- Native runtime/fingerprint: 13f3cdc16a6f972c6de512a40c7ef2652bdbc9b6; manual OTA remains included.

[Apple review submission](https://appstoreconnect.apple.com/apps/6813280704/distribution/reviewsubmissions/details/5e2ee5b1-42bd-4bc8-899a-6e1874d3c99a)

[Production build](https://expo.dev/accounts/flapfitapp/projects/flapfit/builds/90abaf28-65cd-43e5-b542-70a49c56c68d)

The final check confirmed the selected build is 11 and review contact phone/email are present. Before submission, all 10 iPhone and 10 iPad screenshot assets reported COMPLETE and the Marketing URL was https://www.flapfitapp.com. The owner retained his description and screenshots. The owner chose to explain the permission correction in a reply to Apple; sending that reply was not independently verified. The final Notes read-back contains the owner’s shorter Play instruction and still explains that camera access is necessary.

Browser automation was unavailable. The existing Apple upload key allowed read-only verification but refused build selection with HTTP 403, so the agent made no App Store metadata mutation or submission through that key. The owner completed the changes and submission in the browser. Availability could not be freshly read using that key; no storefront selection was changed during resubmission. The intended initial scope remains Canada, USA, Australia and Mexico, with unfinished European processing disabled in this candidate.

This receipt supersedes the earlier candidate handoff’s statements that device acceptance and App Review authorization were still pending. No new native build, OTA publication, application-code change, main/tag change or Android-branch change was performed during this resubmission step. Waiting for Review confirms queue entry, not Apple approval or public availability.