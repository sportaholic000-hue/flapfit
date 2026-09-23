# Saved locations and ad readiness — September 23, 2026

## Confirmed defect and resulting behavior

Changing Quebec to another province already cleared the regional restriction, but the monetization listener invalidated SDK readiness without restarting preparation. A result created during that interval retained a null ad reference even after later initialization. The same affected state changes when advertising becomes eligible again.

The listener now restarts permitted SDK preparation after a residency correction. Automatic preparation checks Google's current `canRequestAds` result without opening a consent form over the settings sheet or gameplay. Required native consent presentation remains in the existing explicit flow. Epoch checks, foreground checks, disposal and deduplication guard against stale decisions and overlapping initialization. Game entry can resume this passive preparation without taking ownership of a new native popup.

The game creates an opportunity whose ad reference updates with SDK readiness. The result screen still appears first. Ad loading, session frequency, cooldown, failure behavior and immediate result actions retain their original implementation. `resultAdGate.ts` is unchanged. No loading wait, shared ad cache, new cadence or carried-over ad schedule is included.

## Saved province and state names

The dropdown writes the validated selected province/state code alongside the existing residency answer in the same local storage record, and displays its actual name. All 13 Canadian and 56 US options retain the existing regional policy mapping. The selected code is not sent to Google, RevenueCat or the competition service. No new provider, database or per-game server request was added.

Older binary-only records retain their eligibility. A Quebec or Connecticut answer identifies its actual name; a nonresident answer does not identify the previously discarded province/state. That legacy field remains `Saved answer` until the user selects their actual province/state, after which its name survives restart. No additional onboarding requirement is introduced. Pending/failed saves never display a newly confirmed selection.

## Verification

- Ad adapter and real privacy-flow integration: 201 tests passed across two suites after the final monetization changes. Includes Quebec-to-New Brunswick, Connecticut-to-Maine, passive preparation during game entry, immediate actions when no ad is loaded, late callbacks and newer restrictions.
- Picker UI, local storage, startup/game-entry and unchanged scheduler suites passed during this correction. The UI checks every province/state option; storage checks restart, pending/failing writes and legacy records.
- TypeScript and strict lint results are recorded in the completion report.
- No application build, upload, public-site deployment, backend deployment or account configuration change was performed.

This source change is not present in the installed TestFlight build until a later authorized build is installed. SDK-mocked tests verify the client state transitions; they do not establish production AdMob fill or account readiness.
