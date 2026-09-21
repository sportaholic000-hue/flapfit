# Regional advertising correction — September 21, 2026

The owner clarified that regional advertising restrictions must not exclude gameplay, that New York must not be asked repeatedly, and that the website must state camera access is necessary. This supersedes the exclusion decisions in be32f2f and the proposed Apple reviewer replacement in bb12be7.

## Implemented behavior

- Quebec, CT/NY minors, Australian ages 13–14 and Mexican ages 13–17 retain gameplay while applicable ads and ad-event reporting are off. Saved grants cannot activate these providers.
- Missing optional region/age evidence, an unread advertising notice, unread saved privacy choices or a failed country lookup does not impose a gameplay quota. The obsolete first-game marker is ignored without deleting any user data.
- Known under-13 audience exclusion and required Apple age/access checks remain separate. Already-admitted gameplay is not interrupted by background refresh.
- Both New York Yes and No are saved on the device. Restart and foreground refresh do not re-ask. The question is replaced by saved status and an explicit Update control. Legacy Yes migrates; previous unsaved No cannot be inferred. A saved declaration is not represented as a current physical-location verification. Known positive history retains provider restrictions without blocking play.
- Failed New York writes remain unconfirmed and do not enable advertising. Saved privacy refusals, Stop/retry behavior, competition privacy, ad cadence, tracking and recording remain intact.
- The privacy/terms copy states camera access is required for normal Play and Record & Play; microphone permission and recording are optional. Regional exclusion, repeated-NY-question and one-game copy is removed from the current website source.

## Apple reviewer notes

The owner authorized a read-only check after automatic approval review initially rejected access. Browser inspection of Version 1.0 > App Review Information > Notes confirmed the exclusion paragraph was not saved. The saved notes still state local gameplay is available while optional features may be restricted. Save was disabled. No Apple fields, review instructions, account settings or submission state were changed. The local proposed replacement is CANCELLED_DO_NOT_APPLY.

## Verification and publication

- Full mobile Jest run: 67 suites / 1,391 tests passed, zero failures. This includes runtime ad-provider integration, repeated game entry, old trial markers, New York persistence/migration/write failures and rendered privacy controls.
- TypeScript `tsc --noEmit`, strict Oxlint, production-profile release configuration and app/site `git diff --check` passed.
- Website validator passed all five routes. Corrected source `b3a5171dcfc87a2e2ff307ef5c3f995ad0350b2c` was committed and pushed. The Sites helper packaged and validated 41 files; the exact source/archive was saved as version 33 and published successfully on September 21, 2026. Version 32 was not deployed.
- Site: `appgprj_6aa368d995348191b4206fa03f951b3a`; version: `appgprj_6aa368d995348191b4206fa03f951b3a~appgver_ff9fec0bc2508191b445061d1b63d23c`; deployment: `appgdep_6ab14ff521708191870e4c0ace88d4e5`. Sites returned `succeeded` at `2026-09-21T15:40:50.221218+00:00` and URL https://flap-fit.sportaholic000.chatgpt.site. The existing public audience was preserved.
- App changes are applied locally on `wip/crash-protection-20260920` above `bb12be76639c4cfeb1a130767555979fd697f244`, with unrelated existing edits preserved. No native build, installed-device result, Apple write or submission is claimed. The app correction needs inclusion in a new build to reach installed devices.
