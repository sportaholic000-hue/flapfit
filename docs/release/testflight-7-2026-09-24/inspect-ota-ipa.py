"""Verify embedded updater and app-owned privacy settings, without executing an IPA."""
import json
import plistlib
import re
import sys
import zipfile
from pathlib import Path

ipa, repository, output = map(Path, sys.argv[1:4])
app = json.loads((repository / 'apps/mobile/app.json').read_text())['expo']
expected_runtime = '469f66ace28d0ea7661bb8681b0239739f8b3955'
with zipfile.ZipFile(ipa) as archive:
    names = archive.namelist()
    info_path = next(n for n in names if re.fullmatch(r'Payload/[^/]+\.app/Info\.plist', n))
    root = info_path.removesuffix('Info.plist')
    info = plistlib.loads(archive.read(info_path))
    native = plistlib.loads(archive.read(root + 'Expo.plist'))
    assert native['EXUpdatesEnabled'] is True
    assert native['EXUpdatesCheckOnLaunch'] == 'NEVER'
    assert native['EXUpdatesLaunchWaitMs'] == 0
    assert native.get('EXUpdatesHasEmbeddedUpdate', True) is True
    assert native.get('EXUpdatesDisableAntiBrickingMeasures', False) is False
    assert native['EXUpdatesURL'] == app['updates']['url']
    assert native['EXUpdatesRequestHeaders']['expo-channel-name'] == 'production'
    runtime = native['EXUpdatesRuntimeVersion']
    if runtime == 'file:fingerprint':
        resource = next(n for n in names if n.endswith('/EXUpdates.bundle/fingerprint'))
        runtime = archive.read(resource).decode().strip()
    assert runtime == expected_runtime, runtime
    assert info['GADDelayAppMeasurementInit'] is True
    assert 'NSUserTrackingUsageDescription' not in info
    assert info['ITSAppUsesNonExemptEncryption'] is False
    privacy = plistlib.loads(archive.read(root + 'PrivacyInfo.xcprivacy'))
    assert privacy.get('NSPrivacyTracking') is False
    actual_types = {entry['NSPrivacyCollectedDataType']: entry for entry in privacy['NSPrivacyCollectedDataTypes']}
    required_types = app['ios']['privacyManifests']['NSPrivacyCollectedDataTypes']
    for required in required_types:
        actual = actual_types[required['NSPrivacyCollectedDataType']]
        assert actual['NSPrivacyCollectedDataTypeLinked'] == required['NSPrivacyCollectedDataTypeLinked']
        assert actual['NSPrivacyCollectedDataTypeTracking'] == required['NSPrivacyCollectedDataTypeTracking']
        assert set(required['NSPrivacyCollectedDataTypePurposes']).issubset(actual['NSPrivacyCollectedDataTypePurposes'])
    result = {
        'version': info['CFBundleShortVersionString'], 'buildNumber': info['CFBundleVersion'],
        'runtimeVersion': runtime, 'channel': 'production',
        'updatesEnabled': True, 'automaticCheck': 'NEVER', 'launchWaitMs': 0,
        'embeddedUpdateEnabled': True, 'antiBrickingProtectionEnabled': True,
        'delayedGoogleMeasurement': True, 'trackingPermissionRequested': False,
        'appOwnedPrivacyDeclarationsMatched': len(required_types),
        'deviceIdAppFunctionalityDeclared': True,
        'physicalDeviceBehaviorVerified': False,
    }
output.write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
print(json.dumps(result, indent=2))
