import json
import plistlib
import sys
import zipfile
from pathlib import Path

ipa, destination = map(Path, sys.argv[1:3])
with zipfile.ZipFile(ipa) as archive:
    entries = []
    for name in sorted(archive.namelist()):
        if not name.endswith('PrivacyInfo.xcprivacy'):
            continue
        manifest = plistlib.loads(archive.read(name))
        entries.append({'path': name, 'tracking': manifest.get('NSPrivacyTracking'),
                        'trackingDomains': manifest.get('NSPrivacyTrackingDomains', []),
                        'collectedDataTypes': manifest.get('NSPrivacyCollectedDataTypes', []),
                        'accessedAPITypes': manifest.get('NSPrivacyAccessedAPITypes', [])})
    result = {'source': 'Privacy manifests extracted directly from the signed IPA; this is not an Xcode-generated privacy report or a runtime network trace.', 'manifests': entries}
destination.write_text(json.dumps(result, indent=2) + '\n')
for entry in entries:
    print(json.dumps({'path': entry['path'], 'tracking': entry['tracking'],
                      'dataTypes': [d.get('NSPrivacyCollectedDataType') for d in entry['collectedDataTypes']],
                      'requiredReasonAPICount': len(entry['accessedAPITypes'])}))
