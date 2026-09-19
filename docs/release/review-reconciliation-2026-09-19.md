# September 19 review reconciliation and F1 repair

The supplied review inspected d5e9b3912f232201799e009d5fbb4ab2f15fc35a. Before edits, main was already ac8b271880cff982e13f0c925f01f405653435d9, which narrows the locked RevenueCat profile to ad measurement. Preserved uncommitted Apple transaction-environment, rescission, competition-linkage and receiver work was reconciled; nothing was reset.

## F1: native presentation ownership

Confirmed in the latest adapter, independently of the report's transcribed reproduction. Application disposal synthesized failed() after setting shown=true but before native dismissal/failure. The installed 16.5.0 iOS code resolves show immediately after presentFromRootViewController; its delegate emits CLOSED only from adDidDismissFullScreenContent and ERROR from didFailToPresentFullScreenContentWithError. Android resolves handoff similarly and has the existing failure forwarding patch.

The adapter now separates invalidation from native release. Withdrawal immediately invalidates reuse/reporting and discards unused preloads. Once show has been dispatched, it retains delegate/listener ownership until native close, native presentation failure or the SDK's pre-presentation rejection. Disposal never manufactures a terminal callback. Result continuation remains once-only and waits for foreground. A presentation barrier also survives result unmount, so a later game entry or privacy form cannot pass underneath the handed-off ad. No timeout, second ad, cadence change or universal ads toggle was added. The native SDK/package patch itself was not changed for F1.

Automated evidence: ten assertions failed before the repair against the real adapter/gate. After repair, 56 focused monetization/gate tests passed, covering before-show withdrawal, pending show, displayed close, native failure/rejection, background/foreground, repeated terminal events, unmount and privacy-form serialization. These mocks establish JavaScript control flow, not physical iPhone behavior or complete Google internal shutdown.

## Reconciled verification

- Full current mobile run: 44 suites / 811 tests, all passed. The first reconciliation run exposed a stale backend test harness that stripped the newly imported Apple guard; it now executes that actual guard and tests denial and authenticated deletion.
- TypeScript and scoped strict lint passed. No gameplay, accepted calibration, recording/audio, sharing, or result-exit cadence source was modified.
- Apple receiver tests: 32 passed, including real pinned verifier forgery rejection, SQL atomicity/privileges and synthetic Vault-interface tests. Deno check and scoped lint passed.
- Earlier corrected native compile 75760bcb-f8f1-48a8-a82e-ca7f132bcc35 succeeded for d5e9b3912f232201799e009d5fbb4ab2f15fc35a. It does not cover ac8b271 or this successor and is not device evidence.

## Worldwide owner decision and remaining runtime work

The OWNER personally selected worldwide availability. Preserve it; Canada/USA remain priorities, not exclusive territories. No territories changed during this work. Worldwide privacy handling is still incomplete: regionalPolicy currently resolves Canada/US only, and the automatic coordinator plus independently reachable combined privacy controls are not connected. A selected worldwide territory list is not evidence those processing rules are implemented. Unresolved purposes stay off; this intermediate state is not a releasable globally disabled RevenueCat product.

The revised consent interface remains unapproved and has not been added. There is no universal adult Allow ads/Play without ads switch. RevenueCat remains independent and must be demonstrated with genuine permitted-user receipt, plus independently eligible restricted ads when analytics is denied. Unknown information, UMP approval and permission to download never become unrestricted processing permission.

## Apple/backend preparation

Both enrolled devices were registered in Apple. Profile D6F78BM77G (Flap Fit iPhone iPad Test), UUID 0c333376-b18f-4bb4-81b2-53e462501fd3, includes exactly those two devices, com.flapfit.game and the declared-age-range entitlement. It reuses the existing distribution certificate. Private files/device identifiers are excluded from Git. The owner downloaded the profile in their browser after Codex's browser blocked download.

With the owner's explicit deployment approval, consent migrations were applied and the Production/Sandbox receivers deployed (version 1 each), plus flapfit-game version 8 with JWT still required. Live checks: malformed notification/status data rejected with 400/no-store; unauthenticated links and game API rejected with 401. Cold-start Vault access succeeded. Private tables have RLS and no anon/authenticated SELECT; key RPC executable only by service_role. No raw Apple IDs, signed transactions or key values were output or committed.

Both Production/Sandbox notification URLs are now saved in App Store Connect. Genuine delivery testing uncovered the hosted runtime incompatibility described below; URL configuration alone is not delivery proof. Real rescission/linkage and installed runtime evidence remain required. Rejected requests are not proof of successful genuine Apple notification handling. No App Store upload, review submission or release occurred.

## Exact pushed repair and signed build

- F1 repair: 5f24386a05b8d5de4b7ba1ed5e1ea88fc04bed4c, included in candidate source 0be68de0666c27f3151ae544de07b374eca54937. Remote main was read back and the old immediate pending.failed disposal path was absent.
- Signed internal device build 710512ba-6445-42d8-af23-659d862a3298 FINISHED on September 19 at 20:52:56 UTC, source 0be68de, version 1.0.0 (2), simulator=false. This covers the latest ten-file RevenueCat patch and F1, unlike the prior simulator build.
- Mac-host build output: RevenueCat 5.88.0 consent fence verified (10 files patched). Native fence harness passed cold launch, active cancellation, persistent purge, stale-generation rejection and fresh grant. Xcode compiled FlapFitAgeRange, applied the two-device profile and archived successfully with declared-age-range entitlement. These are build-host tests, not installed-device or RevenueCat-server receipt evidence.

## Genuine Apple TEST exposed a separate hosted failure

Apple accepted the Sandbox TEST request and returned a genuine signed V2 TEST payload. Local Node and Deno 2.9.6 verification both succeeded with online OCSP. Apple reported UNSUCCESSFUL_HTTP_RESPONSE_CODE for delivery to the hosted Sandbox receiver; direct replay returned 400. Temporary redacted Sandbox diagnostics identified Supabase edge runtime 1.76.0, compatible with Deno 2.1.4, throwing Not implemented: crypto.X509Certificate.prototype.toString. Upstream Deno 2.1.4 also lacks raw, infoAccess and verify. No signature/chain/revocation check was bypassed. The temporary diagnostic code was removed; Sandbox version 4 restored the original reviewed source hash. Production version 1 and game version 8 are unchanged. Production TEST-request authorization separately returned 401; no cause is asserted yet.

A stateless Node verifier is prepared under services/apple-verifier, with six passing HTTP tests and a genuine local Apple TEST proof (200; tampered signature 400; wrong environment 400; missing authentication 401). It uses the unchanged official Apple library and needs no Apple private key or database credentials. It is not deployed or connected: a compatible hosting/data destination and cost must be approved first. Hosted genuine receipt and actual rescission remain submission blockers.

## Follow-up: existing-backend fix and signed-artifact inspection

The hosted verification blocker above is resolved in Supabase itself. No extra hosting is authorized or used. Production receiver v3 and Sandbox v8 retain the pinned Apple verifier/online OCSP and add the bounded old-runtime compatibility layer. Official Apple Sandbox TEST delivery reports SUCCESS; valid replay 200, tampered/malformed 400, Production rejects Sandbox 400. Temporary diagnostics are removed; uploaded source was read back. Backend tests now total 39 passing; type checking passed. See apple-consent-receiver-2026-09-19.md and evidence/apple-compat-hosted-proof.json. Real rescission/linkage/device and RevenueCat receipt remain unverified.

IPA inspection confirms 1.0.0 (2), com.flapfit.game, iPhone and iPad, iOS minimum 16.4, no background modes, and the declared-age-range entitlement in BOTH the signed ARM64 binary and embedded two-device profile. SHA-256 matches the downloaded candidate. All 1,301 main-executable CodeDirectory page hashes and Info.plist/resources/entitlements special-slot hashes match. This is artifact integrity evidence, not Apple CMS/trust-chain or device validation. Fifteen bundled privacy manifests and final camera/microphone permission strings were extracted to evidence/ios-device-embedded-artifacts.json. The vendor RevenueCat manifest still declares purchase history; reconcile vendor-generic declarations with the actual ads-only behavior in the final privacy report. No mobile source changed in this backend correction.
