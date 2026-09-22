# Privacy replacement test build — September 22, 2026

[Install the replacement build](https://expo.dev/accounts/flapfitapp/projects/flapfit/builds/f0cf64c3-04c1-43fe-97d9-44f409e2f809). Build f0cf64c3-04c1-43fe-97d9-44f409e2f809, source 69b0696f2759f35f5ae22833db56d1b71cacc96b, profile ios-device-check, version 1.0.0 (4). Finished 2026-09-22T18:30:49.343Z.

This signed internal/ad-hoc build contains the neutral age/location copy and the unfinished-setup dismissal correction. The existing two-device signing profile and test-ad configuration are retained. No new service, paid plan, provider settings, motion behavior or website changes were introduced.

The source checks cover 223 distinct passing tests across six affected suites, including real route/result components for Done, Try again and Next level with native boundaries mocked. TypeScript, strict lint and production configuration checks passed before submission. The completed cloud archive has zero compiler errors. The actual IPA contains the new neutral recovery screen and test-ad markers, matches the source privacy manifest, and preserves all six tracker assets byte-for-byte against Git and the runtime size requirements. Native provider checks passed in the cloud worker. Expo Doctor output is retained in the build evidence; its existing dependency recommendation warning is not represented as a completely passing doctor check.

Account readback: Free plan, 11/15 iOS builds used, $0.00 build overage and $0.00 estimated total. No billing settings were changed.

Physical iPad acceptance remains pending. Install over the previous build, dismiss unfinished setup from the result flow, and confirm that it retains the result instead of starting another run. Then complete setup and confirm Try again and Next level start the intended new runs. Eligible test ads retain their existing every-second-completed-exit placement, readiness checks and 90-second minimum interval. Also check camera startup and exercise control; no camera performance or movement adjustment is claimed.

IPA SHA-256: eb6b2c53da59eae9c9edf87916622013131e6a1484434e18196d44ef283c49f1.

[Build results](evidence/privacy-replacement-build-2026-09-22/build-verification.json), [signed artifact inspection](evidence/privacy-replacement-build-2026-09-22/signed-artifact-verification.json), and [source packaging](evidence/privacy-replacement-build-2026-09-22/source-package-verification.json). Temporary provider URLs, signing credentials and IPA binaries remain outside Git. No Apple review submission occurred.
