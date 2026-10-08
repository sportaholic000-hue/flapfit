# iOS navy tab-bar candidate - October 8, 2026

Owner requested trying the existing Flap Fit navy with white icons/text while keeping the current icons and avoiding redoing the App Store screenshots. This is a reversible style candidate, not a published OTA or a native build. Obtain the owner's decision on the preview before including it in the resubmission candidate.

Only `apps/mobile/src/app/(tabs)/_layout.tsx` changes application behavior, limited to iOS colors:

- Navy background `#0F172A`, matching the existing app NAVY constant.
- White `#FFFFFF` icons and labels only for unselected tabs.
- Preserve the existing orange `#F59E0B` icon/label for the selected tab. The owner rejected the proposed square highlight; the active-background override is removed.
- Subtle top separator `#334155`.

Existing icons, labels, sizes, spacing, safe-area behavior, tab order, navigation actions, accessibility selection semantics and all game code are unchanged. Android/web use their existing options. No new components, dependencies, assets or native configuration are added to the app.

Validation: targeted lint and diff checks passed. Executing the actual layout with its existing options confirms Android options are identical to the baseline. Contrast ratios are 17.85:1 white/navy and 8.31:1 existing orange/navy. The preview check verifies the selected-tab color remains orange and no active-background override remains. Existing icon paths and the candidate's real color options were used to render a [desktop color preview](navy-tab-preview-2026-10-08/nav-preview.png). It is an illustration, not an iPhone/iPad screenshot or proof of native layout acceptance. No new behavior tests were added for this style-only change.

Apple permits custom tab-bar backgrounds/tints: https://developer.apple.com/design/human-interface-guidelines/tab-bars and https://developer.apple.com/documentation/uikit/uitabbar . Its screenshot guidance separately says to update screenshots to match the current interface: https://developer.apple.com/help/app-review/guideline-reference/2-3-3-screenshots/ . No guarantee was made that a changed bar can be left different in existing submission screenshots. Screenshots without the bar are unaffected by this specific change; existing marketing text/layout could be reused if affected captures are refreshed. No App Store screenshots/settings were modified.

All changes are confined to the iOS candidate branch. Android can adopt these styles later only if the owner chooses; its branch was not changed. No OTA, build or Apple submission was started for this preview.

Owner clarification: the bar appears in eight of ten screenshots and new iPhone/iPad captures are currently impractical. The owner proposed only navy background/white inactive controls while preserving orange selection, deferring illustrated icons until later. This revision follows that narrower scope. The screenshot difference was described as a relatively low-risk cosmetic difference as a judgment, not a guaranteed Apple acceptance or a measured rejection rate. Apple guideline 2.3 requires metadata to accurately reflect the core experience; its screenshot help separately recommends matching the current interface. No screenshots were changed. No OTA was authorized or published in this follow-up.

## Owner decision: defer navigation redesign

The owner chose to keep the existing white navigation bar, gray inactive controls and orange selection for the next native build. The four isolated styling changes from `c1336c9514b92f7335362f782b9f6bca1f6f02bb` are removed from the active candidate. The navy design and preview remain preserved in that pushed commit and these documents for possible future compatible OTA delivery. Do not include the navy colors or illustrated replacement icons in this release. No screenshots were edited.
