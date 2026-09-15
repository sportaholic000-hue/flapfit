const { validateTrackerReleaseConfig } = require('./validate-tracker-release.cjs');

const formTrackingSource = "export const FORM_TRACKING_RULES_VERSION = '2026-09-15.1';";

describe('validateTrackerReleaseConfig', () => {
  test('does not block development or preview builds', () => {
    expect(
      validateTrackerReleaseConfig({
        buildProfile: 'preview',
        approvedVersion: undefined,
        gameScreenSource: "const PRODUCTION_TRACKING_MODE = 'original';",
        formTrackingSource,
      })
    ).toEqual([]);
  });

  test('blocks production while the original tracker is selected', () => {
    const failures = validateTrackerReleaseConfig({
      buildProfile: 'production',
      approvedVersion: '2026-09-15.1',
      gameScreenSource: "const PRODUCTION_TRACKING_MODE = 'original';",
      formTrackingSource,
    });
    expect(failures).toContain(
      'game.tsx: hardened Form Test tracking must be physically approved and promoted before a production build'
    );
  });

  test('blocks production without the exact physical-approval version', () => {
    const failures = validateTrackerReleaseConfig({
      buildProfile: 'production',
      approvedVersion: '2026-09-14.1',
      gameScreenSource: "const PRODUCTION_TRACKING_MODE = 'form-test';",
      formTrackingSource,
    });
    expect(failures).toContain(
      'FLAPFIT_APPROVED_TRACKER_RULES_VERSION: must match the physically approved form-tracking rules version'
    );
  });

  test('accepts the explicitly promoted and matching production tracker', () => {
    expect(
      validateTrackerReleaseConfig({
        buildProfile: 'production',
        approvedVersion: '2026-09-15.1',
        gameScreenSource: "const PRODUCTION_TRACKING_MODE = 'form-test';",
        formTrackingSource,
      })
    ).toEqual([]);
  });
});
