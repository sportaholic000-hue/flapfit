# Older-iOS age fallback — source verified, build still held

Base: `ffdd7923a78fb70b1ecfa185c8f5417244b7430a`. The commit containing this record is the corrected successor on `wip/crash-protection-20260920`.

## Finding and correction

**Fixed:** on supported pre-iOS/iPadOS-26 systems, the unavailable Apple API formerly left every user without a way to establish age eligibility for advertising or competition. The existing Info/results privacy panel now accepts the minimum age band used by the current country policy. It saves only that locally supplied band, separately from purpose choices. A successful answer is restored on restart and does not require another answer at each result exit.

This is explicitly self-declared evidence, not Apple verification or parent/guardian authority. The native boundary must first report `unsupported`. An available Apple service, a declined Apple answer, an error, a pending/required Apple check, or withdrawn Apple access cannot be replaced by this fallback. The mandatory-check flag remains false. Android behavior is unchanged.

The question appears in the existing panel after a selected completed-game exit when needed, or when the user opens Info. Close/back/dismissal writes no age answer, consent or refusal. Existing advertising/reporting refusals remain untouched. Successful correction to a younger age invalidates older adult eligibility immediately while saving. Failed reads do not become first-run defaults; failed saves show unconfirmed status and leave a reachable retry after panel remount. A failed write is not claimed durable: the previous disk answer can remain until retry succeeds. No gameplay restriction or paywall was introduced.

| Current country | Local answer buttons | Existing processing policy after answering |
|---|---|---|
| Canada | Under 13 / 13 / 14–17 / 18 or older | Province question remains separate. Established non-Quebec adults use notice-based ads with no discretionary ads-off switch; Quebec consent and unresolved-province restrictions remain. |
| United States | Under 13 / 13–17 / 18 or older | Adults use the notice route. Existing CT/NY teen restrictions remain unchanged. |
| Australia | Under 13 / 13–14 / 15–17 / 18 or older | Adults use the notice route. Existing younger-user authority requirements and worldwide NY teen fallback remain unchanged. |
| Mexico | Under 13 / 13–17 / 18 or older | Adults use the notice route. Existing under-18 authority requirements remain unchanged. |

## Behavioral evidence

- Actual processing/notice/launch/monetization modules: older-iOS adult answers in all four countries reach Google initialization after the notice; separately refused RevenueCat remains unloaded and unconfigured through restart. Canada's control uses an established non-Quebec answer.
- Separate permitted-reporting control reaches the real RevenueCat configuration boundary and the existing non-personalized/RDP result-ad request. Native SDK transports are mocked; this is not a provider receipt.
- Rendered age buttons, successful answer, no fresh adult ads-off switch, retained reporting refusal, failed-save status and retry after close/reopen are exercised.
- Missing/malformed/failed reads, delayed older-adult/newer-minor writes, a newly required Apple check, lost country, restricted access, saved refusals and successful restart recovery are covered.
- Under-13 and existing AU/MX authority restrictions still prevent provider initialization. The fallback does not invent adulthood or parental permission.

**Final locked-dependency verification:** 63 suites / 1,335 tests passed; zero failed or pending. TypeScript, strict source/scripts lint and production iOS release/privacy/required-reason validators all exited 0. The final input hashes were identical before and after these checks. An earlier full pass preceded the explicit iOS-only guard; the final full run includes that guard and its Android non-change regression.

**Actual local EAS archive-stage package:** 792 files; 291 required inputs matched the checkout. Validator run from the packaged copy passed. Private credentials/signing/environment files, web/backup content and dependency/Expo caches were excluded. This is local packaging, not a native/cloud build or upload. Adjacent JSON records exact hashes and Git line-ending reconciliation.

**Website:** matching local-age disclosure and September 21 effective date published as version 31, source `6b23ee3883ceda26d01f8d41839e8fe567227f0c`. The source remote was verified. Public privacy HTML and date configuration returned HTTP 200 and matched the committed content, allowing only line endings and the recognized Cloudflare edge script. The app repository retains exact website source copies under its excluded backup directory.

## Remaining work — not device tests

This closes only the unsupported older-iOS age route. It does **not** complete the no-discretionary-ad-free requirement. Unanswered questions, applicable refusals, current-system unknown/declined/error age responses, Quebec handling, CT teen eligibility and the worldwide NY teen fallback remain unresolved for that business requirement. iOS 26.0/26.1 with an available basic API but unavailable regulatory-duty check is not reclassified as unsupported or exempt.

The age/region-wide eligibility decision remains pending; this change does not impose it. Prior refusal/deletion/competition Stop/native-dismissal fixes, calibration, full-run video/audio, four-country scope, native patches, SDK configuration and dependencies are preserved. No native build, Apple upload, App Privacy publication, submission, device acceptance or genuine RevenueCat receipt is claimed.

Apple reference: https://developer.apple.com/support/age-assurance/ documents framework availability and that existing iOS/iPadOS 18-or-earlier accounts are unaffected by those platform changes. Local self-declaration does not replace any independent regional processing rule or certify legal compliance.
