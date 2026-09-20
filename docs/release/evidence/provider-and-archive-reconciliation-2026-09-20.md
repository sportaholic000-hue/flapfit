# Independent release checks — September 20, 2026

Compiled source: 20921889c3dda24d790b9f1e5ab4706c77a77c45. No new build,
dependency change, ad-account setting change or tester request was made by this check.

## Archive diagnostics

Actual Store build f0870fe0-c332-4c12-b0f8-bc8a9492a105 Xcode log downloaded and
inspected: 12,362,117 bytes, SHA-256
b78fad7faf3d0673ecab2ee827fd907e412364720e5186da759d62229fa3b5ef.
It runs Validate on FlapFit.app and ends ARCHIVE SUCCEEDED; no error diagnostics.
Compiler warnings remain recorded in store-archive-diagnostics-2026-09-20.json.

The Google missing ios_app_id warning is **not reproduced as a missing native
configuration**: the Expo config plugin supplies iosAppId, and the exact signed
Store Info.plist contains GADApplicationIdentifier
ca-app-pub-5933597810180440~5139925774 and GADDelayAppMeasurementInit=true.
The warning itself documents the Expo-plugin exception. Do not patch a second,
competing app ID into app.json merely to hide the warning.

The two retain-cycle diagnostics are in Google's NativeAd and BannerView wrapper
classes, not the interstitial used by this app. Their existence does not reproduce
the repaired interstitial resource finding. Dependency header/nullability, Swift
concurrency/deprecation, C/C++ and Hermes warnings remain visible; no warnings
were suppressed or dependencies upgraded. No warning names a local custom module.
The 67 other distinct warning texts were inspected; this does not certify native
runtime behavior. Existing A3/C4 repeated-cycle checks remain required.

The build service exposes the IPA twice (buildUrl/applicationArchiveUrl) and the
Xcode log; no full xcarchive or generated privacy report is exposed. The log's
temporary xcresult path is a build-worker path, not a downloadable local artifact.
Apple's actual aggregate report therefore remains unavailable. Fifteen inspected
IPA manifests are useful evidence but do not become an Xcode-generated report.
[Apple report workflow](https://developer.apple.com/documentation/bundleresources/describing-data-use-in-privacy-manifests)
requires Xcode's archive organizer. Retaining extra artifacts for an eventual
necessary successor is possible through [EAS buildArtifactPaths](https://docs.expo.dev/eas/json/);
this check did not start a build solely to obtain a report. Apple upload diagnostics
also remain open because no upload occurred.

## Actual AdMob demand and restrictions

Read-only console inspection observed:

- Mediation: one AdMob (default) group.
- AdMob Network: 407 authorized buyers. The displayed first 15 rows show data
  collection Allowed and blocking controls On; this is not a 407-row permission audit.
- Ad-source controls: 53,677 sources, 0 blocked; automatic new certified sources on.
- US privacy settings: Use active ad partners, 333 partners. The chooser was opened
  and cancelled; Save and Undo remained disabled. No selection was changed.
- EU and US messages each have one active message. IDFA explainer is not configured.
- App store linkage/readiness is pending, observed ad requests/impressions zero.

The production adapter applies NPA=true, rdp=1, PG and actual age treatment before
Google initialization; the native patch disables publisher first-party ID. UMP
and central independent-purpose decisions are additional gates. No workout,
pose or recording payload is passed to monetization.

This is **restricted multi-buyer demand, not verified Google-only demand**.
[Google's buyer rules](https://www.google.com/intl/en/authorizedbuyers/guidelines/)
bind program data use by buyers, advertisers and their vendors: disclosed purposes,
no sale, no profiling when disallowed, and necessary retention with an 18-month
ceiling. That ceiling is not proof of each recipient's actual retention.
[NPA bid rules](https://developers.google.com/authorized-buyers/rtb/build-profiles-with-bid-requests)
prohibit using these bids for profiling even when the general collection setting
is Allowed. Do not misreport that dashboard label alone as proof of prohibited tracking.

Conversely, [NPA/RDP creative rules](https://support.google.com/admob/answer/14323214?hl=en)
do not automatically exclude third-party creative vendors from non-Google demand.
[Google RDP commitments](https://support.google.com/admob/answer/14125907?hl=en)
do not cover those third parties' independent handling. The current no-tracking
claim still needs the precise creative/recipient route reconciled; installed
receipt/traffic is a later, separate verification. Neither a default mediation
group nor extra consent can silently establish Connecticut minor necessity.
No adult grant, CT-reviewed flag, CHILD-for-everyone workaround or blanket demand
block was introduced. The existing US-state/authority gaps remain open in D3.

## Review reconciliation limits

The three supplied focused findings are reproduced/fixed as recorded in
focused-privacy-review-2026-09-20.md, with the physical transition still unverified.
The older native-ad-withdrawal continuation finding was already fixed before
those corrections; see review-reconciliation-2026-09-19.md. The accessible
"GPT pro  Apple Launch Work" review identifies the still-open regional production
gaps, now recorded explicitly in the current tracker. Its author also states it
has not seen Fable's latest findings. No latest Fable report was present among
the supplied/found review files. Unavailable review text is not "not reproduced"
and has not been claimed reconciled. No repeated request for that report was sent.
