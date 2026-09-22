FlapFit authenticated account verification — September 21, 2026

The owner provided signed-in RevenueCat, AdMob and App Store Connect access after the original audit. Inspection was initially read-only. After identifying the wrong reporting timezone, the owner explicitly approved AdSense access and correction to Atlantic Time, then authorized necessary fixes in AdSense and AdMob. Only that timezone was changed. No new ad restrictions, privacy mechanisms, app/site edits, binary, upload, submission or deployment were introduced.

Repository at inspection: main, 3fb45f2393fcfb371f3c7ceea1b21f3f9f7d58a6, clean and three commits ahead of origin/main. Tested code remains 2f9b8a33404c9ed2eb809d03e41cbff8055e6a01. This documentation follow-up does not change the tested code. The original evidence directory and its package manifest describe their original checkpoint and were preserved.

**Exact account change and verification**

| Item | Before | After / evidence |
| --- | --- | --- |
| Linked Google publisher reporting timezone | America/St_Johns, Newfoundland Time; AdSense displayed (UTC-03:30) St John's | Selected the available (UTC-04:00) Halifax option in AdSense. Google displayed “Your changes are saved.” After refreshing AdMob, Account information displayed (GMT-04:00) Atlantic Time - Halifax (America/Halifax). Returning to AdSense Account information confirmed Halifax persisted. |

Halifax uses the Atlantic standard/daylight schedule applicable to the owner's New Brunswick location. No Moncton option appeared in the displayed timezone list. Google documents that app dashboards use the linked AdSense reporting timezone; changing it affects subsequent report data and can shift the reporting boundary on the change date, without changing payments. This is not an app audience or regional advertising eligibility setting. [Google AdMob timezone documentation](https://support.google.com/admob/answer/7276705?hl=en), [AdSense change procedure](https://support.google.com/adsense/answer/9830725?hl=en)

**AdSense and AdMob**

| Check | Observed current state | Result / remaining work |
| --- | --- | --- |
| Publisher identity / app configuration | Same publisher pub-5933597810180440 in AdSense, AdMob and RevenueCat connection. iOS app ID ca-app-pub-5933597810180440~5139925774 and result-exit interstitial ca-app-pub-5933597810180440/2284241303 match all three mobile eas.json profiles. | No mismatch demonstrated. |
| Account status | Open in both Google consoles. AdSense active product is AdMob. | No closed-account condition. |
| Payment / verification overview | Linked AdSense (Canada) account, CAD, CA$0 balance and CA$100 payout threshold. Both verification pages say verification may be needed once earnings reach the verification threshold. No current verify-now step or payment-hold notice appeared. | Not a claim that future identity/address/tax/bank requirements are already completed. No financial or identity details changed. |
| AdSense notification | General notice about monetization of content concerning the war in Ukraine. | Not an account-specific FlapFit enforcement finding. |
| AdMob Policy centre | No current issues; no disapproved apps. | Does not equal app-readiness approval. |
| FlapFit iOS readiness | Requires review; store details absent/unlinked. App verification shown as not required in this unlinked state. | Published store listing must later be linked and Google review completed. No false listing or premature review submission. |
| Inactivity | Banner says account has not served ads for over five months and warns of deactivation after six months. Account still Open; no Reactivate action presented. | Outstanding launch-timing concern. No artificial live-ad traffic generated. |
| Ad content / revenue | App maximum content rating Parental Guidance, T/MA blocked. Impression-level ad revenue On. Programmatic limited ads On. Share full IP address Off. | Existing configuration retained. No additional ad-blocking categories or discretionary ad-off paths added. |
| Privacy messages | Flap Fit US Privacy and Flap Fit European Privacy each Published, modified September 19. Both application-selection dialogs show Flap Fit iOS and Android checked. | Existing published app coverage confirmed. Both dialogs canceled without changes. |
| Consent settings | US active ad partners selected and request-level RDP option displayed. EU common partners selected, maximize message coverage selected, legitimate-interest controls selected. | Readback only; not a legal certification or proof of device UMP behavior. No settings altered. |
| Cadence | One iOS result-exit interstitial; no active mediation groups/campaigns. No console frequency cap. | Cadence exists in app code; absence of a second console cap is not itself a defect. |
| Public app-ads.txt | Local website dist/app-ads.txt has the correct Google DIRECT publisher entry. Fresh public HTTP read encountered a Cloudflare challenge; browser access was blocked. | Live file contents and Google crawler acceptance were not verified here. This does not demonstrate that the file is missing or that Google's crawler is blocked. No website/security changes. |

Google requires a publicly available supported-store app and correct linkage for app-readiness review/full serving. The unlinked, unpublished setup can be used for testing, but cannot be labeled approved. The inactivity warning is separate from a policy violation or an already-deactivated account. [App readiness](https://support.google.com/admob/answer/10564477?hl=en-GB), [App setup](https://support.google.com/admob/answer/9989980?hl=en-GB), [Inactivity/deactivation](https://support.google.com/admob/answer/10491752?hl=en)

**RevenueCat**

Project FlapFit (a58d3dbd) has iOS and Android configurations for com.flapfit.game. The AdMob integration is Connected to the matching publisher with readonly/report scopes. The iOS credential panel reports Valid credentials. No credential contents were copied. Both production and sandbox Ads views show setup/empty state, not evidence of received ad-revenue events. The sandbox display filter was restored to its original On state after inspecting both views.

Connection and credential status do not prove a genuine impression reached RevenueCat. That remains device/provider verification. Generic purchase/paywall onboarding is not a reason to add subscriptions or a purchase flow to this advertising-only app. No RevenueCat configuration changed.

**App Store Connect**

- Flap Fit Workout Game, Apple ID 6813280704, bundle com.flapfit.game; iOS 1.0 is Prepare for Submission and has no build attached to that version. This is not a claim about all historical TestFlight builds.
- Availability is Australia, Canada, Mexico and the United States; all four current prices are zero. General age rating is 13+ on the current rating system. Older-OS/regional rating labels do not redefine the owner's under-13 rule.
- English (U.S.) media manager has zero screenshots in each of eight listed iPhone sizes and five listed iPad sizes. Required captures still need preparing and uploading later; not every listed size necessarily requires a separate set.
- Reviewer name, phone and email are populated. Phone/email were visually verified because text extraction omitted their values. They must not be reported as missing. Sign-in required is unchecked. Existing review instructions describe camera gameplay, optional recording, result-exit ads, Google controls and independent reporting choices.
- App Privacy contains twelve selected data types with declared purposes. Privacy Policy and Privacy Choices both point to https://flapfitapp.com/privacy/. The Publish button alone does not establish whether the latest declarations have been published; publication state was not proven.
- Apple production/sandbox notification URLs point to the corresponding separate consent handlers. Mac availability is unchecked. Although the Vision Pro checkbox is checked, the page explicitly says version 1.0 is incompatible and unavailable there; no compatible Vision Pro launch was established.
- Saved release choice is automatic release after approval. No Apple field, reviewer note, declaration, screenshot or release setting changed.

**What this closes and what remains**

Current-console access is no longer the reason provider settings are unresolved. The confirmed timezone defect is fixed. Published Google-message coverage, revenue reporting enabled, matching provider IDs, RevenueCat connection, Apple contact fields and launch-country prices have current evidence.

Still outstanding: public listing/linkage and Google readiness review; inactivity risk until legitimate serving resumes; current Google crawl verification; appropriate store screenshots; real device ad/privacy/RevenueCat receipt; the specifically scoped withdrawal/support question in finding C; separately unverified backend Auth rate/spend settings; operational support/moderation evidence; and deployment of the local API fix when authorized. Console inspection does not resolve those by itself.

No source tests were rerun for this documentation-only follow-up. The prior test evidence remains applicable to unchanged code. Only local documentation is committed; no push or deployment is part of this follow-up.


## Supabase continuation — read-only, September 21, 2026

Owner explicitly authorized read-only Supabase Auth/provider/rate/abuse/project-limit inspection after an initial automatic approval review misclassified dashboard access. Access then succeeded; this is no longer a barrier. Project yhrleungvipsqlmayrfg, organization Flap Fit, production main, AWS us-east-2 nano. No settings were saved.

| Actual setting | Readback |
| --- | --- |
| New user signup / anonymous sign-in | Both enabled. |
| Email provider / confirmation | Email enabled; Confirm email unchecked. The app itself uses anonymous signup. Social providers, including Apple, disabled; this is distinct from the app's custom Apple signed-transaction verifier. |
| Manual identity linking | Off. |
| Anonymous signup limit | 30 requests/hour per IP. |
| Other Auth limits | Refresh 150/5 minutes/IP; token verification 30/5 minutes/IP; non-anonymous signup/sign-in 30/5 minutes/IP. IP forwarding switch off. |
| Attack protection | CAPTCHA disabled; leaked-password protection disabled. No CAPTCHA token flow in current anonymous app sign-in. Enabling it alone could break Compete; no change made. |
| Plan and overages | Free; September 14–October 14, 2026 cycle. Usage page says no quota exceeded and no overage billing; excess can cause restrictions. |
| Usage | Database 0.027/0.5 GB (detailed maximum 26.23 MB); Edge Function invocations 550/500,000; egress 0.002/5 GB; cached egress 0/5 GB; MAU displayed 0/50,000; storage 0/1 GB; Realtime 0/200 peak and 0/2 million messages. Dashboard counts can lag; zero displayed MAU is not proof that no Auth users exist. |

The 30/IP/hour limit bounds a single IP, not distributed abuse. Calibration occurs in the camera gameplay client; scripts can reach the public Auth endpoint without doing a workout. CAPTCHA is a provider-recommended defense, not an established Apple approval requirement or a required gameplay feature. Free-plan limits currently create an availability/usage concern rather than unbounded overage charges. Existing run caps do not stop fresh anonymous identities. There is no demonstrated current quota problem, and no production abuse test was sent. [Supabase anonymous-auth guidance](https://supabase.com/docs/guides/auth/auth-anonymous#security-and-abuse-prevention)

Unused Email signup is an additional Auth resource surface; app-side anonymous-only checks do not disable that provider endpoint. Turning Email off could be reviewed as narrow hardening because the app does not use it, but the latest instruction permits inspection only. No silent provider/security change was made. Existing competition retention does not constitute automatic cleanup of all abandoned Auth users; do not delete such users indiscriminately, which could destroy legitimate anonymous account access.

Fresh Supabase function readback also reconfirmed flapfit-game version 8 with JWT verification true and old source. Deployment preparation and rollback are in api-production-plan-2026-09-21.md. No deployment occurred. Existing AdMob/RevenueCat/ASC readbacks above remain the actual observed settings; this follow-up did not change or republish them. Store-capture work is excluded from this continuation.
