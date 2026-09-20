# Tasks 5–6 — scoped release reconciliation, 2026-09-20

Starting point: `19183a13161668c45c81d624146085b9210acbc0`, branch `wip/crash-protection-20260920`. Tasks 1–4 and all unrelated local work are preserved. This batch changes evidence and corresponding tracker rows only. No source/package re-verification, Apple edits, build, upload, deployment, privacy publication, submission, installation or credential change occurred.

## Task 5 — BLOCKED: Xcode access unavailable

The retained `work/retained-FlapFit.xcarchive.zip` exists in the Codex workspace: 91,561,294 bytes; SHA-256 `ad7345b7ccc04325a3f1ee10b802d6eb4329c469e835903f6a397a11c3393442` freshly reconfirmed. Existing archive provenance is reused from `regional-store-verification.json`: EAS build `103c8936-9447-4190-a45b-6912b1027c69`, archive `FlapFit 2026-09-20 02.54.20.xcarchive`, version 1.0.0 (4), source `c05f497180c89af21ddb9b9fe014e97e2a23b80a`, worker Xcode 26.6 (17F113). Prior archive/IPA identity checks were not repeated.

No later genuine Xcode report was found in the existing release evidence or local work outputs. Current access is Windows: no `xcodebuild`, no `xcrun`, no configured Mac tool access or SSH host configuration. The retained archive is available; an accessible Xcode Organizer is not.

[Apple's documented workflow](https://developer.apple.com/documentation/bundleresources/describing-data-use-in-privacy-manifests) is to select the archive in Xcode Organizer, open its context menu, choose **Generate Privacy Report**, and save the report. That workflow has **not been exercised** here. No report, unsupported command, or substitute manifest summary is claimed.

Smallest needed action: access an existing Mac with compatible Xcode (build 4 used 26.6), or have its authorized operator open this retained archive and return Xcode's generated PDF with archive identity and Xcode version. No new binary or private signing material is needed. This access would also make the same workflow available for the corrected candidate.

Build 4 predates manifest correction `f168286d9058093a42da8e96f02f53a82365a7e6`. Any report from build 4 can prove only its own declarations and the report workflow. The corrected candidate must later receive its own report from its own archive; this blocker does not invalidate or reopen completed source/package checks.

## Task 6 — COMPLETE: current saved state reconciled, read-only

App `6813280704` / `com.flapfit.game`, version **1.0 — Prepare for Submission**. Current signed-in browser readback verified:

- Listing: Flap Fit Workout Game; Home Fitness & Tracking; existing promotional text, description, keywords and copyright populated; English (U.S.). Categories Health & Fitness / Games / Action.
- URLs: support `https://flapfitapp.com/support/`, marketing `https://flapfitapp.com/`, privacy policy and privacy choices both `https://flapfitapp.com/privacy/`.
- Content Rights: “Yes, this app has the necessary rights to its third-party content.” Existing 13+ and non-regulated-medical-device declarations retained. Apple's pre-OS-26 display says global 12+ with regional exceptions; no rating change was made.
- Reviewer information: notes and first/last name populated; sign-in not required. **Phone number and Email are empty.** The earlier tracker saying all contact information was complete is superseded. Both actual INPUT values were checked for emptiness without recording private values. The handoff says contact was saved but provides no values that can truthfully fill these fields.
- Pricing: current-price table shows AUD/CAD/MXN/USD 0.00 for the four release countries. App Availability shows exactly Australia, Canada, Mexico and United States (4 Available). Release choice is Automatically release this version.
- App Privacy: all 12 saved categories, purposes and linkage match `app-privacy-draft-saved-2026-09-20.md`; no Set Up entries. Preview contains linked and unlinked data, no tracking section. The preserved draft was not published; current readback retains it and Publish remains available. The page shows no publication timestamp. Answers are saved; publication remains a separate action.
- Screenshots: iPhone 6.5-inch, iPhone 6.9-inch (Media Manager), and iPad 13-inch all show **0 of 10**. A 6.9-inch OR 6.5-inch iPhone set suffices; both are not mandatory. iPad 13-inch is required for this iPad app. Optional app previews and smaller scalable sizes are not listed as missing requirements. [Apple screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/).
- Builds: TestFlight explicitly shows **No Builds** and “Submit a build to start testing.” No processing build is displayed, and version 1.0 has no selected build. No build-specific export/compliance prompt is present; the generic encryption-documentation help is not a missing-compliance result. Recheck actual prompts only when the final binary is processed.
- Review: Add for Review is visible on the version page. App Review says “Items you submit to App Review will appear here.” No submitted items are present.

No requested field was classified as missing merely because it was inaccessible. This reconciliation is complete; Apple submission preparation is not claimed complete.

### Exact remaining Apple actions

| Missing field/action | Apple location/label | Needed to finish | Dependency |
| --- | --- | --- | --- |
| Reviewer phone and email | iOS App 1.0 → App Review Information → Contact Information → Phone number / Email | Enter owner-confirmed contact values and save; both saved inputs are blank. | Owner-confirmed details + console action |
| iPhone screenshots | Previews and Screenshots → iPhone 6.5-inch; Media Manager → iPhone 6.9-inch | Upload accepted genuine final-app images to a supported 6.9-inch OR 6.5-inch set; both are empty. | Screenshots/device evidence + console upload |
| iPad screenshots | Previews and Screenshots → iPad → 13-inch Display | Upload accepted genuine final-app iPad images; set is empty. | Screenshots/device evidence + console upload |
| Privacy publication | App Privacy → Publish | Publish the already-saved answers when authorized after existing final native/runtime reconciliation. | Console action; final privacy evidence remains a release prerequisite |
| Final build availability and selection | TestFlight → Builds; iOS App 1.0 → Build | Separately authorize final corrected binary upload, wait for Apple processing, then select it. | Final binary + Apple processing + console selection |
| Review submission | iOS App 1.0 → Add for Review; App Review | Complete prerequisites and final acceptance, then obtain final-send authorization and submit. | Console action after prerequisites + owner authorization |

The existing screenshot production plan is reused; no new device-testing request or content redesign was introduced. Task 4 authentication remains complete and untouched. Source tests, archive/report checks, device results and provider receipt retain their separate statuses.

Machine-readable evidence: `tasks-5-6-verification-2026-09-20.json`. Only Tasks 5 and 6 were handled; no next task or build is authorized by this record.
