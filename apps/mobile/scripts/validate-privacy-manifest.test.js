const { validateCollectedDataDeclarations } = require('./validate-privacy-manifest.cjs');
const configured = require('../app.json').expo.ios.privacyManifests;
const copy = () => JSON.parse(JSON.stringify(configured));
const entry = (manifest, name) => manifest.NSPrivacyCollectedDataTypes.find(
  (value) => value.NSPrivacyCollectedDataType === `NSPrivacyCollectedDataType${name}`
);

test('current declarations cover the existing backend and ads-only reporting data', () => {
  expect(validateCollectedDataDeclarations(configured)).toEqual([]);
});

test.each(['OtherDataTypes', 'OtherDiagnosticData', 'CoarseLocation', 'AdvertisingData', 'ProductInteraction'])(
  'rejects a missing existing %s collection declaration', (name) => {
    const manifest = copy();
    manifest.NSPrivacyCollectedDataTypes = manifest.NSPrivacyCollectedDataTypes.filter(
      (value) => value.NSPrivacyCollectedDataType !== `NSPrivacyCollectedDataType${name}`
    );
    expect(validateCollectedDataDeclarations(manifest)).toEqual([
      `app.json: iOS privacy manifest is incomplete for NSPrivacyCollectedDataType${name}`,
    ]);
  }
);

test('rejects the prior four-category manifest and omitted reporting purpose', () => {
  const manifest = copy();
  const prior = new Set(['UserID', 'GameplayContent', 'Fitness', 'OtherUserContent']);
  manifest.NSPrivacyCollectedDataTypes = manifest.NSPrivacyCollectedDataTypes.filter(
    (value) => prior.has(value.NSPrivacyCollectedDataType.replace('NSPrivacyCollectedDataType', ''))
  );
  entry(manifest, 'UserID').NSPrivacyCollectedDataTypePurposes = ['NSPrivacyCollectedDataTypePurposeAppFunctionality'];
  const failures = validateCollectedDataDeclarations(manifest);
  expect(failures).toHaveLength(6);
  expect(failures).toContain('app.json: iOS privacy manifest is incomplete for NSPrivacyCollectedDataTypeOtherDataTypes');
});

test.each([
  ['UserID', 'Analytics'],
  ['OtherDataTypes', 'AppFunctionality'],
])('rejects missing %s purpose %s', (name, purpose) => {
  const manifest = copy();
  entry(manifest, name).NSPrivacyCollectedDataTypePurposes = entry(manifest, name).NSPrivacyCollectedDataTypePurposes.filter(
    (value) => value !== `NSPrivacyCollectedDataTypePurpose${purpose}`
  );
  expect(validateCollectedDataDeclarations(manifest)).toHaveLength(1);
});

test.each([
  ['NSPrivacyCollectedDataTypeLinked', false],
  ['NSPrivacyCollectedDataTypeTracking', true],
])('rejects an incorrect authorization-record %s declaration', (property, value) => {
  const manifest = copy();
  entry(manifest, 'OtherDataTypes')[property] = value;
  expect(validateCollectedDataDeclarations(manifest)).toHaveLength(1);
});
