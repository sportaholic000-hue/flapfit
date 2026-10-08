# iOS artwork and device-test OTA — October 8, 2026

## Scope

The owner requested all six exercise guides be improved with no jagged outlines, and to inspect them through OTA on the installed iPad before any native build. This update also carries already-saved pushup calibration (670ab25) and iOS screen-awake (c17ed1a) corrections. No new native build, App Review submission, or public release is authorized here. The microphone prompt is unchanged and remains a separate pending correction.

## Artwork

Thirteen poses cover shoulder press, lateral raise, bicep curl, squat, pushup and pullup, including the preliminary pullup reach. They retain the detailed blue bodies, clothing and hands from the owner-supplied reference images, rather than the simplified flat contours. All use real transparency: body alpha 0.32, maximum yellow alpha 0.88. Smoothed subpixel masks remove rough edge pixels; the pushup head/shoulder boundary has stronger smoothing while the finger detail is preserved. Lossless WebP prevents the previous lossy conversion from changing the reviewed pixels. No baked background or extra text is included.

The upper-body dumbbell references and squat/pullup images are the same owner artwork available on source branch commit dc4b47056ac9a9864f435c2025bff9022c56473d under apps/mobile/artwork/calibration/references. The open-hand overhead reference supplies the pullup reach. The two improved-hand pushup figures use the generated source and owner-authorized local cleanup documented in pushup-artwork-preview-2026-10-07.md, with the further smoothing described above. The task output folder calibration-artwork-2026-10-08 preserves extraction/refinement scripts, source hashes and crops.

Active assets are apps/mobile/assets/images/calibration/*.webp, listed in ios-artwork-manifest.json. The manifest uses the existing figure/foot/bar coordinate mapping. The reach figure retains the narrow placement; pushups retain their existing image bounds. The exact lossless asset bytes are embedded in iosCalibrationImageData.ts by scripts/embed-calibration-artwork.cjs. Updating only an image file is insufficient: regenerate the module with that script. Both the original files and generated module are committed so the app receives the reviewed pixels. Old lossy pushup preview assets and their obsolete embed are removed.

The iOS image selector is the only guide code change. Calibration stages, instructions, progress bars, fade timing and measurement/gameplay logic are unchanged by the artwork integration. There is no runtime image processing, image network request or per-frame work. Source files for ads, consent, region rules, permissions and recording are untouched by this artwork change. The latest camera fix, recording branding and manual OTA behavior remain present.

## Compatibility and verification

Official Expo fingerprint generation with the production environment returned 469f66ace28d0ea7661bb8681b0239739f8b3955 (109 sources), matching installed TestFlight build 10, including the newly direct but already native Expo keep-awake dependency. No runtime override or compatibility bypass was used. EAS remote production environment passed validate-update-config.cjs against the existing profile; live ads remain configured.

The existing guide verifier passed all six exercise fades, pullup reach paths, rejected-state cancellation, countdown preservation, and 36 excluded / 12 enabled configurations. Browser renders cover 52 calibration layouts across compact/large iPhone and 11/13-inch iPad viewports, plus eight recording layouts. The rendered contact sheet and full-size iPad pushups were inspected; these are browser checks, not physical-device approval. Nineteen asset checks verify each exact embedded file and all six iOS selectors. Artwork/calibration/screen-awake/game-entry checks passed 71 tests. TypeScript and lint passed. The preceding logic-only candidate passed the full 78-suite / 1,874-test suite; the asset-only integration adds 19 checks.

The changed tracker rules are deliberately NOT marked physically approved. The final production build validator continues to require physical approval of 2026-10-08.1-pushup-calibration. The owner-authorized compatible OTA is the device-test preview used to obtain that evidence; it is not a claim that the final build gate has passed.

## Owner device checks before any build

Install through Info → Check for updates → Update now on TestFlight build 10. Inspect both poses of all six exercises, and the preliminary pullup reach, against the real camera on iPad/iPhone. Check edge quality, full faces/hands, transparency and dumbbells, then normal text/progress/fades. For pushups, missing or bent arms must not advance step one; a correctly framed top pose should still calibrate after the existing preparation/hold. Pose-estimator errors cannot be ruled out by synthetic tests. For Auto-Lock, leave calibration and a run untouched longer than the configured screen timeout, then confirm normal auto-lock resumes outside gameplay. Recording/share, results and existing ad exits should retain their behavior.

## Publication

Published successfully from clean, pushed source **34ba0d5205d133f07ee973734fe2397c05d49e88**. EAS publication exited 0 and returned:

- iOS update group: **c2016486-88a3-43cf-a85d-ca208d28876c**
- iOS update ID: **01a11a03-302f-7b7b-a8d7-b212202665de**
- Runtime: **469f66ace28d0ea7661bb8681b0239739f8b3955**, matching build 10
- Branch/channel/environment: **production**; platform: **iOS only**
- Dashboard: https://expo.dev/accounts/flapfitapp/projects/flapfit/updates/c2016486-88a3-43cf-a85d-ca208d28876c
- Hermes export succeeded (10 MB bundle, 107 assets). The 13 guide images are embedded inside the updated bundle; there are no new remote image requests.

The final smoothed pushups were re-rendered in all 52 layouts and all 19 exact-byte/selection checks passed again. Publication logs and the compact receipt are saved in the task output folder. Installation and native-device appearance remain for the owner to judge. The current production channel is shared with compatible installations and updates remain manual. No native build, Android OTA or App Review submission was started. The microphone prompt remains unchanged. Main, the submitted build-8 release tag and the protected experimental branches retain their earlier commit IDs.

Use the current candidate only; do not roll back to September test-ad OTAs.
