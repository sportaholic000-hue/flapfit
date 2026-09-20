# Assigned Tasks 3 and 4

Starting source: 1ecab513c20a604511579e0df2465d2656616627, branch wip/crash-protection-20260920.
Previous source/package verification is preserved. No completed checks were rerun and no application, dependency or submission-profile inputs changed.

Task 3: COMPLETE. The existing Flap Fit Workout Game / com.flapfit.game / App Store Connect 6813280704 Content Rights field was initially unanswered. Apple asked: “Does your app contain, show, or access third-party content?”

The owner confirmed the artwork was created completely from scratch and that Flap Fit uses their authorized AdMob account. The original-art statement was not expanded into a third-party art licence. The ads are the basis for selecting “Yes, it contains, shows, or accesses third-party content, and I have the necessary rights.” Apple displayed Saved. After a full reload, the field read: “Yes, this app has the necessary rights to its third-party content.” No other App Store field was edited.

[Google Mobile Ads SDK terms](https://developers.google.com/admob/terms) link the existing AdMob use to publisher terms; the [publisher terms](https://www.gstatic.com/adsense/tc/2022-v1/google_usa/en.html), sections 2, 3 and 9, describe ad serving/use and distribution through the AdMob SDK. These support the authorized-ad-service basis, not a claim to own advertisers' artwork. An initial automatic approval rejection was resolved by obtaining the specific owner confirmation before saving.

Task 4: BLOCKED on obtaining the private-key download. Apple shows the approved Flap Fit EAS Upload key active with Developer access. The Download action was invoked; the one-time download control disappeared. The .p8 file is not available in the checked local download locations. Browser security policy blocked inspection of the browser downloads page. The owner has been asked to save the download locally. EAS import/assignment and Apple API authentication cannot be completed without that file; no successful authentication is claimed.

Fresh pre-creation inventory found no suitable existing key: Apple Team keys 0, Individual keys 0; EAS matching iOS record present with no submission key and account API-key count 0. Local credentials contained signing materials only; no API-key submission override or app-specific-password environment variable was configured. Those private signing materials were not printed or changed. The approved new key has only Developer access; no certificate, provisioning profile or other signing identity was replaced or revoked.

The existing production submission configuration targets app 6813280704 and bundle com.flapfit.game. Key creation and a prepared setup script alone are not authentication evidence. Only a later authorized real upload can confirm Transporter transfer, Apple binary acceptance/processing and TestFlight availability.

Machine-readable, non-secret evidence: tasks-3-4-verification-2026-09-20.json.
No build, binary upload, deployment, App Privacy publication, review submission, dependency installation or gameplay change was performed. This batch advances only Content Rights and the upload-authentication entry; it does not close the broader upload/processing checklist item.
