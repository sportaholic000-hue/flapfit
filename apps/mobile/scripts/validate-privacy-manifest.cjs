// App-owned backend records and the configured ads-only reporting path.
// Google/UMP retain their own manifests; this supplements their declarations
// for the application's country lookup and patched RevenueCat ad integration.
// It declares existing collection, not new permissions or transport.
const purposesByType = new Map([
  // EAS Update sends an app-installation identifier for update delivery.
  ['DeviceID', ['AppFunctionality']],
  ['UserID', ['AppFunctionality', 'Analytics']],
  ['GameplayContent', ['AppFunctionality']],
  ['Fitness', ['AppFunctionality']],
  ['OtherUserContent', ['AppFunctionality']],
  ['OtherDataTypes', ['AppFunctionality']],
  ['OtherDiagnosticData', ['AppFunctionality']],
  ['CoarseLocation', ['AppFunctionality']],
  ['AdvertisingData', ['Analytics']],
  ['ProductInteraction', ['Analytics']],
]);

function validateCollectedDataDeclarations(manifest) {
  const failures = [];
  for (const [type, purposes] of purposesByType) {
    const dataType = `NSPrivacyCollectedDataType${type}`;
    const entry = manifest?.NSPrivacyCollectedDataTypes?.find(
      (candidate) => candidate.NSPrivacyCollectedDataType === dataType
    );
    if (
      !entry ||
      entry.NSPrivacyCollectedDataTypeLinked !== true ||
      entry.NSPrivacyCollectedDataTypeTracking !== false ||
      purposes.some((purpose) => !entry.NSPrivacyCollectedDataTypePurposes?.includes(
        `NSPrivacyCollectedDataTypePurpose${purpose}`
      ))
    ) {
      failures.push(`app.json: iOS privacy manifest is incomplete for ${dataType}`);
    }
  }
  return failures;
}

module.exports = { validateCollectedDataDeclarations };
