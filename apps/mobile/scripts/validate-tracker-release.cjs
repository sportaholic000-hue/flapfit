function validateTrackerReleaseConfig({
  buildProfile,
  approvedVersion,
  gameScreenSource,
  formTrackingSource,
}) {
  if (buildProfile !== 'production') return [];

  const failures = [];
  const rulesVersion = formTrackingSource.match(
    /FORM_TRACKING_RULES_VERSION\s*=\s*['"]([^'"]+)['"]/
  )?.[1];
  const productionMode = gameScreenSource.match(
    /PRODUCTION_TRACKING_MODE[^=]*=\s*['"]([^'"]+)['"]/
  )?.[1];

  if (!rulesVersion) {
    failures.push('form tracking: missing versioned production rules marker');
  }
  if (productionMode !== 'form-test') {
    failures.push(
      'game.tsx: hardened Form Test tracking must be physically approved and promoted before a production build'
    );
  }
  if (!rulesVersion || approvedVersion !== rulesVersion) {
    failures.push(
      'FLAPFIT_APPROVED_TRACKER_RULES_VERSION: must match the physically approved form-tracking rules version'
    );
  }

  return failures;
}

module.exports = { validateTrackerReleaseConfig };
