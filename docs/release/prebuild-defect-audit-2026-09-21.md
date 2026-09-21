FlapFit pre-build defect audit — September 21, 2026

The demonstrated saved-age and request-body defects are corrected locally. All 1,429 mobile tests pass, as do 42 separate backend/SQL tests, mobile TypeScript, strict lint, the production configuration validator, and type checking of all three Edge Function entrypoints. The investigation did not establish the claimed universal Apple-link authorization bypass. Advertising withdrawal coverage remains a narrowly defined unresolved policy/support question; no advertising-off mechanism was added.

This report covers the latest attached request, which expressly prohibits creating or signing a mobile binary, uploading, submitting, deploying, publishing, or changing production configuration. None of those actions occurred. Website content and account settings were unchanged. Tests using simulated native boundaries are distinguished below from future device evidence.

**Source and changes**

| Item | Exact revision / state |
| --- | --- |
| Starting app source | `368f829e671a39aed32cd3bfb5debbf82e3ba916`, clean `main`, matching `origin/main` at inspection |
| Defect correction | `ba598fd7ac7654b803edc92877eb49d786eb2798` |
| Final code inspected and packaged | `2f9b8a33404c9ed2eb809d03e41cbff8055e6a01` |
| Website source | `560bfae47fa6b526ca0d5eb33aa9a5acda692a0f`, clean and unchanged |
| Publication | Both code commits remain local. The following documentation commit records this report and evidence; it does not change application behavior. Nothing was pushed. |

Nine files changed across the two code commits. Only three contain runtime source changes:

- `apps/mobile/src/services/privacy/gameEntry.ts`: consult the existing saved minimum-age answer before admitting a new game.
- `apps/mobile/src/services/privacy/localAgeAnswer.ts`: separate reading the existing age record from optional advertising setup; preserve the durable answer during a failed overlapping save.
- `supabase/functions/flapfit-game/index.ts`: enforce the existing body limit while reading bytes; correct three query-result type annotations.
- Regression coverage: `startupGameEntry.test.tsx`, `gameEntry.test.ts`, `localAgeAnswer.test.ts`, `launch-competition.test.js`, and `competition-database.test.mjs`.
- `supabase/tests/apple-consent/package.json`: include the new SQL regression file in its test command. No dependency changed.

The diff leaves camera/game UI, calibration, exercise detection, scoring, recording, regional/provider policy, privacy controls, manifests, permissions, dependency locks, native patches and website source unchanged. Old commits and historical evidence were preserved. This report describes the current inspection; earlier checkpoint documents remain historical evidence, not additional current product requirements.

**Approved behavior used for this audit**

The minimum age comes from the owner's explicit instruction that under-13 users are blocked and the app is 13+. It was not inferred from an AI handoff or the App Store rating. An App Store age rating and an application's own audience policy are distinct; Apple also describes circumstances where a parent can allow access to an app above a child's store age rating. [Apple age assurance](https://developer.apple.com/support/age-assurance)

The following is an internal implementation table, not website copy:

| Audience / condition | Local gameplay | Advertising and ad-performance reporting |
| --- | --- | --- |
| Known under 13 | Unavailable, including restoration of an existing saved answer before new game entry | Disabled |
| Quebec, age 13+ | Available | Disabled under the approved regional policy |
| Canada outside Quebec, age 13+ | Available | Eligible subject to the existing processing/Google checks |
| US adult, age 18+ | Available; no minor CT/NY questionnaire requirement | Eligible subject to existing checks |
| US Connecticut resident, ages 13–17 | Available | Disabled |
| Under 18 with established New York protected history | Available, including after leaving New York | Disabled until adult eligibility is established |
| US ages 13–17, Connecticut No and New York No | Available | Eligible subject to existing checks; saved NY No is not automatically asked again |
| Australia, ages 13–14 | Available | Disabled |
| Australia, age 15+ | Available | Eligible subject to existing checks |
| Mexico, ages 13–17 | Available | Disabled |
| Mexico, age 18+ | Available | Eligible subject to existing checks |
| Missing, malformed or failed optional local age/country lookup | Does not itself create a gameplay ban | Does not grant provider permission |
| An applicable required Apple check is incomplete, or Apple access is restricted | Existing Apple access gate applies | Independent provider gates also remain |

An eligible route is permission to request ads, not a guarantee of ad fill. Existing saved refusals and applicable Google decisions remain effective. Reporting refusal stays separate from Google ads. Optional advertising setup is not a game quota. Both NY answers persist, while known protected history remains effective for minors. The app has no new general ads-off switch, mandatory login, subscription, or regional gameplay ban.

Normal Play and Record & Play require camera access. Recording and microphone audio remain optional. The public geographic no-ad list was not restored.

**Finding A — confirmed and fixed: saved under-13 answer could be bypassed on startup**

Intended behavior: enforce the owner's existing minimum age when the installation already holds an under-13 answer, without turning unknown age into a new restriction.

Failure and conditions: on a cold start, root startup checked Apple requirements and Home prepared only required processing. The saved local answer was restored later through optional launch/advertising setup. Game entry evaluated in-memory inputs before that restoration. With a saved under-13 record and an unsupported Apple age API, Home Play could mount the game child and its camera-permission hook, online or offline.

Reproduction: the initial route regression rendered the real root, Home and game eligibility path with the durable under-13 record. Three assertions failed before correction. The final harness also traverses the actual index redirect and tabs layout: RootLayout → index → tabs layout → Home Play → GameScreen → GameEligibilityGate → real authorization and privacy controllers. Native views, router transport, provider SDKs and unrelated external boundaries are adapters. The test checks the actual camera hook and camera-permission screen; it does not claim a physical workout, native router implementation or camera capture was exercised.

Smallest correction: read the existing versioned local answer before game entry, independent of country and optional monetization initialization. Re-read current processing inputs after storage completes. Current verified Apple evidence and access restrictions retain precedence. The local answer cannot satisfy a required Apple authorization check. Missing, malformed and failed reads remain unknown; they do not become an under-13 answer.

Additional reproduced race: a new save intent arriving during the initial read could discard the durable under-13 value. If the subsequent save failed, the cached answer remained unknown. Every writer already waits for the initial read, so the correction retains the durable value until a new write succeeds. The added regression failed before correction and passes now.

Verification: all ten final startup-route cases pass, covering saved under-13 online/offline, delayed storage, unanswered/teen/adult/malformed records, storage failure, backgrounding and leaving the route. Boundary tests cover current Apple evidence, local corrections and failed concurrent saves. Advertising and reporting SDKs are not loaded by the new entry check. See the retained before/after logs and full-suite result.

**Finding B — unsupported as stated: an absent Apple mapping alone is not an applicable authorization bypass**

The live SQL revocation query returns false when no linked transaction has a recorded revocation. That establishes “no recorded linked revocation”; it does not establish that every anonymous identity was legally required to have a link.

The actual required client path obtains fresh Apple status, establishes or reuses the anonymous competition identity, verifies/links that identity, and then dispatches competition operations. Its tests cover checks before account creation, concurrent operations, revoked access, stale completion and continued access to deletion/support. The Apple handlers verify signed transaction/notification data and expected application/environment values; production and sandbox are separated. The competition API verifies the current authenticated anonymous user and derives ownership from that identity.

The inspected evidence did not demonstrate a reachable bypass of a particular applicable Apple authorization requirement. The backend is not a universal device-attestation or age-proof boundary, and a modified client is not proven trustworthy. Those limits do not justify requiring Apple linkage for every user. No universal linking, login or attestation requirement was added.

Live evidence: competition function version 8 has gateway JWT verification enabled; Apple production version 3 and sandbox version 8 use their own signed-data verification rather than gateway JWT verification. Their inspected source matches the repository. The latter setting alone is not proof that unsigned Apple instructions are accepted.

**Finding C — unresolved scope and operational route; no new advertising control applied**

Current controls: Google UMP is refreshed on the permitted initialization path, advertising requires Google's current permission plus independent app processing eligibility, and Info exposes Google's privacy entry when Google reports it required. Reporting has its own withdrawal, durable-save state and native-stop acknowledgement. Saved advertising refusals remain effective. Google requires a usable privacy entry when its status is REQUIRED; NOT_REQUIRED does not itself require that entry. [Google UMP documentation](https://developers.google.com/admob/ios/privacy)

The [published privacy policy](https://flapfitapp.com/privacy/) directs applicable withdrawal/data requests to Google controls or support. The support runbook distinguishes stopping future processing from deleting provider-held records, and documents reporting withdrawal and provider requests. It does not establish a working installation-specific route for stopping future consent-dependent advertising processing when Google offers no privacy form.

The demonstrated gap is in that support promise/procedure: contacting support or deleting provider records does not, by itself, change this installation's future ad-processing state. Whether an affected eligible user has an applicable withdrawal right, and which specific processing must stop, was not established for every launch route. Thus a universal “all adults must be able to disable all ads” finding is unsupported. This is not a conclusion that the app will necessarily be rejected. Apple's policy requires an accessible way to withdraw consent for applicable consent-based data collection; it does not prescribe a general ad-free product. [Apple 5.1.1](https://developer.apple.com/app-store/review/guidelines/#data-collection-and-storage)

Proposed remedy, **unapplied**:

1. Document the affected advertising purpose, processing basis and user circumstances separately from reporting, sale/sharing preferences and deletion of historic provider records.
2. Where Google's existing controls fulfill that right, document and verify that exact path, including its effect on subsequent SDK requests.
3. If a required withdrawal is outside those controls, specify a verifiable route that persists only the applicable restriction on the original installation and stops the affected processing. Continue separately lawful advertising where supported. A support email must not be marked fulfilled until the actual effect is verified.
4. Verify durability after restart, save failures, in-flight requests and independent reporting state. Any necessary new product control must be reviewed as a separate behavior change; it was not introduced by this audit.

The attached request explicitly says to document a remedy separately if it changes approved behavior. This is why the audit leaves that decision unresolved rather than adding another advertising-off mechanism. The website was not edited to conceal the gap or promise an unimplemented remedy.

**Finding D — security, operations and dependencies**

| Area | Classification and evidence | Action / limit |
| --- | --- | --- |
| Request body size | **Confirmed; fixed in source.** The API fully read a request before checking 4,096 JavaScript characters. Oversized streams were consumed, and multi-byte input over 4,096 bytes could pass. Three before-fix assertions failed. | Stream-count bytes, reject declared oversize early, cancel on overflow, retain at most the allowed data, keep existing JSON/object validation. All 21 handler tests pass. No production abuse traffic. Live version 8 still has the old code. |
| Backend type checking | **Confirmed; fixed.** Deno found seven errors from one joined-result fallback and two untyped RPC results. | Three annotations now match the reviewed SQL shapes. All three entrypoints type-check; emitted JavaScript before/after these annotations is identical. No runtime policy change. |
| API ownership/authentication | **No demonstrated bypass in tested paths.** Missing/invalid/non-anonymous credentials fail. Claimed user IDs in request bodies cannot replace the authenticated user. SQL rejects another user's run. | Handler and SQL regressions pass. Not proof against every malicious client or genuine pose verification. |
| API abuse and cost | **Existing controls verified; configuration unknowns remain.** Run creation serializes per user and caps 30 per 10 minutes / 500 per day. Queries/results and run lifetime are bounded. | This is not a global/IP budget for every read, report, status call or fresh anonymous identity. Actual Auth signup limits, CAPTCHA and account spend controls were not available for verification. No new login/CAPTCHA requirement or production load test. |
| Session storage | **Optional hardening.** Anonymous auth state uses AsyncStorage rather than encrypted credential storage. | No remote token-disclosure path was demonstrated. Device compromise/backup exposure remains a consideration. No identity-risking storage migration. |
| Existing database access | **Verified restricted.** Seven public competition tables and three private Apple tables have RLS and no direct anon/authenticated read/write grants. Public application RPC execution is denied to those roles. Private schema usage is denied. | Current anonymous application users cannot directly use those tables/RPCs. Security-definer paths and client CREATE permissions were inspected. |
| Default database privileges | **Optional hardening.** Public defaults for future objects are permissive for relevant owner roles. Current application objects explicitly revoke access. | Future migrations must apply grants/RLS deliberately. This is not evidence that current tables are exposed; no speculative production migration was applied. |
| Security-advisor notices | **Reviewed, not blindly treated as exploits.** Private RLS-without-policy is deny-by-default. Cron owner policies do not grant anon/auth schema usage. Leaked-password protection is disabled while this app uses anonymous auth. | The password setting is not proof of a password-login vulnerability in the current app. Reassess if password authentication is introduced. |
| Moderation | **Source controls present; operation unverified.** Name filtering, report/block controls and a runbook exist. The runbook calls for operator review and response targets. | Passing tests do not prove a staffed inbox or that real reports are reviewed on schedule. No customer report was changed. |
| Deletion | **Tested source and SQL behavior.** Authenticated deletion remains accessible despite revoked access or new participation terms. SQL cascades private competition data and minimizes report identifiers. Client retries persist and distinguish a lost acknowledgement from an unconfirmed deletion. | Storage/sign-out failure, retry, ownership and stale-operation tests pass. Local training progress remains. Provider records and backups are separate. |
| Retention | **Live configuration and SQL verified.** Cleanup removes runs expired more than seven days, expired challenges, and resolved reports after 180 days. Pending reports await review; profiles persist until deletion. | Live scheduled runs succeeded September 19–21 at about 03:17 UTC. Hosted logs/backups and provider retention were not fully verifiable. |
| Offline synchronization | **Existing behavior verified in tests.** Bounded outbox, expiring server runs, idempotent finalization and cancellation of stale work after privacy/deletion changes. | Authentication errors are not treated as proof of deletion. A disconnected device does not prove hosted-service behavior. |
| Dependency advisories | **Advisories remain; no newly demonstrated reachable application exploit.** Fresh audit exited 1: 28 security rows (22 high, 6 moderate, 0 critical) plus 6 deprecation rows. Rows include repeated package/version paths. | Four families: xmldom XML/plist tooling, js-yaml test/lint tooling, PostCSS build processing, and uuid tooling APIs. The reviewed application path did not expose their affected operations to untrusted input. No broad dependency upgrade; do not call the dependency audit clean. |
| Existing URI-decoder backport | **Reverified.** Installed patched decoder passes legacy/upstream vectors and real query-string callers. Original hostile-input case hit the timeout; patched larger case completed within the bound. | Exact patch and installed hashes plus timings are retained. Source validation is not a blanket certification of every dependency. |
| Native patches | **Source integrity verified; native execution pending.** Google patch and ten pinned RevenueCat source patches pass application/idempotence/tamper checks, including the Podfile integration. | No native compile occurred. Native transport stopping, privacy behavior and actual ad/report receipt still need device evidence. |
| Secrets | **No known-signature findings in the current tracked source and actual source package.** Scan covers private-key markers, selected secret-key formats and service-role JWTs, with file-only reporting. | Not a complete historical or entropy-based secret audit. Public client identifiers are not automatically secrets. |

Supabase's documented anonymous signup limits and recommendations are not evidence of the project's actual configured values. [Supabase anonymous authentication](https://supabase.com/docs/guides/auth/auth-anonymous)

**Executed checks and evidence**

Evidence is saved under [evidence/prebuild-audit-2026-09-21](evidence/prebuild-audit-2026-09-21/). The JSON summary records source SHA, changed files, counts, preservation checks and package details. Before-fix failures are retained so the fixes can be independently compared with the baseline.

Commands below used Node 24.13.1. Unless indicated otherwise, the working directory was `apps/mobile`; the installed dependencies reside at the repository root.

| Command / check | Result and scope |
| --- | --- |
| `node ../../node_modules/jest/bin/jest.js --runInBand --silent --json --outputFile=<audit>/jest-final-results.json` | **68 suites / 1,429 tests passed.** Includes route, privacy, provider, storage, permission, recording, competition and race regressions. |
| `node ../../node_modules/typescript/bin/tsc --noEmit` | Exit 0. |
| `node ../../node_modules/oxlint/bin/oxlint --no-ignore --deny-warnings src scripts` | Exit 0. Repository `corepack yarn lint` also passed. |
| `git diff --check` | Passed. |
| `node --test core.test.mjs database.test.mjs verifier.test.mjs vault.test.mjs crypto-compat.test.mjs`, from `supabase/tests/apple-consent` | **39 passed.** External audit test dependencies selected with `APPLE_CONSENT_TEST_PACKAGE_JSON`. |
| `node --test competition-database.test.mjs`, same directory/environment | **3 passed.** Executes actual competition migration SQL in PGlite. Platform Auth schema/cron are test scaffolding; two unsupported extension declarations are omitted. Not a hosted Auth workflow or real scheduler test. |
| Final rerun: `node ../../node_modules/jest/bin/jest.js --runInBand --silent scripts/launch-competition.test.js` | **21 passed** after type annotations; already included in the 1,429 total, not 21 additional distinct tests. |
| Deno 2.9.6: `deno check --cached-only --frozen=false --config supabase/functions/flapfit-apple-consent/deno.json --lock=<audit>/deno-audit.lock supabase/functions/flapfit-game/index.ts supabase/functions/flapfit-apple-consent/index.ts supabase/functions/flapfit-apple-consent-sandbox/index.ts`, repository root | Exit 0. An initial cache miss required fetching declarations into the external audit cache and lock. The first completed type check exposed the seven corrected errors. No repository dependency/lock update. |
| `node scripts/validate-release-config.cjs` with production profile environment from `eas.json` and `EAS_BUILD_PROFILE=production` | Exit 0, both checkout and actual EAS source copy. Includes configured privacy/permission checks; final binary declarations remain unverified. |
| `node scripts/test-admob-privacy-patch.cjs` | Exit 0. |
| `node scripts/test-revenuecat-processing-patch.cjs <official-cached-source>` | Exit 0. |
| `node scripts/check-release-links.cjs` | Exit 0; public links reachable. Not proof of support-inbox delivery. |
| `node scripts/validate-store-assets.cjs` | **Exit 1:** 24 planned screenshots absent from capture folders: 8 iPhone, 8 iPad and 8 Google Play. These are store captures, not missing gameplay assets. The exact eight-image set is the repository's plan, not an asserted Apple requirement. |
| Bundled literal asset-reference inspection | 79 references checked, none missing. Does not replace installed asset loading. |
| `corepack yarn npm audit --recursive --all --json`, repository root | Exit 1 with the advisory/deprecation counts explained above. Full output retained. |
| `node <audit>/verify-uri-decoder.cjs --installed` | 35 legacy vectors, 135 upstream vectors (165 upstream calls), and 2 query-string callers passed; stress evidence retained. |
| Actual EAS CLI 24.7.0 `GitClient.makeShallowCopyAsync`, with `requireCommit=true` | Accepted clean code revision `2f9b8a3`; 460 files / 55,953,778 bytes. Committed included contents unchanged; only intentionally ignored tracked files omitted. Generated exports, nested install state, archive and signing metadata absent. SHA-256 manifest retained. This was local copying only. |
| Live backend metadata/source and public privacy/support inspection | Read-only. No customer rows, abuse traffic, deployment or configuration writes. Apple, AdMob and RevenueCat account consoles were not available in the current browser inventory; old screenshots are not treated as fresh verification. |

The complete mobile run preceded the final backend type-only annotations. The backend handler suite and Deno checks were then rerun, and unchanged emitted JavaScript was verified. Repeating the entire mobile suite after those annotations would not add evidence about changed behavior.

External verification dependencies were the previously available audit tools at `C:/Users/money/Documents/Codex/2026-09-16/g/work/apple-consent-tools`, the cached official RevenueCat source at `.../g/work/rc-consent-review`, and the cached EAS CLI at `.../g/work/eas-cli-cache/_npx/9845298b0950620f/node_modules/eas-cli`. The command logs, external Deno audit lock and test source are preserved. These are verification inputs, not new app dependencies.

**Remaining work, with the boundaries made explicit**

No additional demonstrated mobile-source defect remains from these investigated findings after the listed corrections. That is narrower than “ready for approval” or “all privacy obligations resolved.”

| Outstanding item | What is needed | Why it remains |
| --- | --- | --- |
| Advertising withdrawal/support coverage | Resolve the specific purpose/basis and working route described in finding C; verify any applicable request can actually be fulfilled. | Legal/processing scope and operational effect were not fully established. A behavior-changing remedy is explicitly outside this audit's authorization. |
| Corrected API body limit in production | A separately authorized deployment of the corrected `flapfit-game` source, followed by readback and bounded verification. | Live version 8 still matches the pre-fix baseline. Deployment was expressly forbidden. It is inaccurate to call the live defect fixed. No database migration is needed for this correction. |
| Provider/account readiness and cost settings | Read current AdMob app/store linkage, readiness and serving/consent configuration; RevenueCat connection/event settings; relevant Auth rate/spend controls and Apple metadata. | The corresponding signed-in consoles were unavailable in the current browser. No current account approval or ad-serving guarantee is claimed. |
| Moderation/support operations | Establish monitored ownership and evidence that requests/reports can be processed using the documented routes. | Source and public mail links do not establish staffed operations. |
| Store screenshots | Capture and review appropriate assets for the eventual tested candidate; check actual App Store Connect slots. | The local store-asset validator fails for missing planned captures. This is submission preparation, not a reason to change gameplay or a mobile compilation defect. |

The following checks genuinely require the future native candidate/device or provider runtime. They were **not passed** by this audit:

- iPhone/iPad native compilation, signing/entitlements, generated Info.plist/privacy manifests and required-reason API declarations in the final artifact; Swift/Objective-C patch compatibility.
- Real camera access/recovery for both Play and Record & Play; optional microphone denial, recording/sharing lifecycle and camera-based calibration/exercises on device.
- Genuine Apple age/authorization responses, required linking and rescission, including production/sandbox separation and native lifecycle transitions.
- Real Google UMP presentation, unavailable/required forms, SDK request flags, regional provider gating, no-fill/error/close behavior and result-exit ad cadence.
- Native reporting-stop acknowledgement, absence of late prohibited transport after privacy changes, genuine permitted ad impressions and RevenueCat event receipt.
- Installed offline/reconnect/deletion flows, moderation workflow evidence, actual support delivery and final store metadata/assets.

No mobile build, prebuild/native compile, cloud upload, push, website publication, account edit, backend deployment or submission was performed. This completes the authorized pre-build investigation and local corrections; acceptance and monetization are not guaranteed by passing source tests.
