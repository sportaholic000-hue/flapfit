"""Inspect an IPA without exposing certificate material or device identifiers."""
import hashlib
import json
import plistlib
import re
import struct
import sys
import zipfile
from pathlib import Path

ipa, output = map(Path, sys.argv[1:3])
with zipfile.ZipFile(ipa) as archive:
    names = archive.namelist()
    info_path = next(n for n in names if re.fullmatch(r"Payload/[^/]+\.app/Info\.plist", n))
    root = info_path.removesuffix("Info.plist")
    info = plistlib.loads(archive.read(info_path))
    profile_raw = archive.read(root + "embedded.mobileprovision")
    start = profile_raw.index(b"<?xml")
    end = profile_raw.index(b"</plist>", start) + len(b"</plist>")
    profile = plistlib.loads(profile_raw[start:end])
    binary = archive.read(root + info["CFBundleExecutable"])
    assert struct.unpack_from("<I", binary)[0] == 0xFEEDFACF, "Expected arm64 Mach-O"
    offset = 32
    entitlements = None
    for _ in range(struct.unpack_from("<I", binary, 16)[0]):
        command, size = struct.unpack_from("<II", binary, offset)
        if command == 0x1D:
            location, length = struct.unpack_from("<II", binary, offset + 8)
            signature = memoryview(binary)[location:location + length]
            magic, _, count = struct.unpack_from(">III", signature)
            assert magic == 0xFADE0CC0, "Invalid signature container"
            for index in range(count):
                kind, relative = struct.unpack_from(">II", signature, 12 + 8 * index)
                if kind == 5:
                    blob_magic, blob_length = struct.unpack_from(">II", signature, relative)
                    assert blob_magic == 0xFADE7171, "Invalid entitlement container"
                    entitlements = plistlib.loads(bytes(signature[relative + 8:relative + blob_length]))
        offset += size
    assert entitlements is not None, "Signed entitlements missing"
    manifest_paths = [n for n in names if n.endswith("PrivacyInfo.xcprivacy")]
    app_privacy = plistlib.loads(archive.read(root + "PrivacyInfo.xcprivacy"))
    result = {
        "sha256": hashlib.file_digest(ipa.open("rb"), "sha256").hexdigest(),
        "bundleIdentifier": info.get("CFBundleIdentifier"),
        "version": info.get("CFBundleShortVersionString"),
        "buildNumber": info.get("CFBundleVersion"),
        "deviceFamilies": info.get("UIDeviceFamily"),
        "minimumOS": info.get("MinimumOSVersion"),
        "cameraDescription": info.get("NSCameraUsageDescription"),
        "microphoneDescription": info.get("NSMicrophoneUsageDescription"),
        "hasTrackingUsageDescription": "NSUserTrackingUsageDescription" in info,
        "delaysGoogleMeasurement": info.get("GADDelayAppMeasurementInit"),
        "appManifestTracking": app_privacy.get("NSPrivacyTracking"),
        "privacyManifestCount": len(manifest_paths),
        "declaredAgeRangeInSignedBinary": entitlements.get("com.apple.developer.declared-age-range"),
        "declaredAgeRangeInProfile": profile.get("Entitlements", {}).get("com.apple.developer.declared-age-range"),
        "provisionedDeviceCount": len(profile.get("ProvisionedDevices", [])),
        "profileExpires": profile["ExpirationDate"].isoformat() + "Z",
        "revenueCatProcessingBridgePresent": b"flapFitSetProcessingAllowed" in binary,
        "deviceAcceptance": "not established by artifact inspection",
    }
assert result["bundleIdentifier"] == "com.flapfit.game"
assert set(result["deviceFamilies"]) == {1, 2}
assert result["declaredAgeRangeInSignedBinary"] is True
assert result["declaredAgeRangeInProfile"] is True
assert result["provisionedDeviceCount"] == 2
output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
print(json.dumps(result, indent=2))
