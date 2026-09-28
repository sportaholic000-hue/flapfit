// Android-only parity for the existing iOS AdMob privacy controls. No new dependency.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const entries = [
  {
    "file": "ReactNativeGoogleMobileAdsModule.kt",
    "expected": "f364f1e80091d71cd630cee7e898082c35652b3d9ed9aa7c13a304d63347d8a7",
    "patched": "e4fd2485bc5f95a362c9086d28491a97f9d08d03d7b52ea6b5e5b7fe3a9cdd77",
    "replacements": [
      [
        "        val result = Arguments.createArray()",
        "        // FLAP_FIT_ANDROID_PUBLISHER_ID_DISABLED_V1\n        // Google requires initialization before this call; no ad request is ready yet.\n        if (!MobileAds.putPublisherFirstPartyIdEnabled(false)) {\n          promise.reject(\"flapfit-publisher-id\", \"Publisher privacy configuration was not saved.\")\n          return@OnInitializationCompleteListener\n        }\n        val result = Arguments.createArray()"
      ]
    ]
  },
  {
    "file": "ReactNativeGoogleMobileAdsConsentModule.java",
    "expected": "d90aff9b558dfc07c91bf054421a485bd1834d46fd27d84fd2aa0103dbdd8691",
    "patched": "34ac4dfca093899b883246e704e3c97dc8c0ab938d657cce069a8a9fd75a6b32",
    "replacements": [
      [
        "  private WritableMap getConsentInformation() {",
        "\n  // FLAP_FIT_ANDROID_UMP_SIGNALS_V2\n  private void flapFitStoredBoolean(WritableMap result, String name, Object value) {\n    if (value instanceof Integer && (((Integer) value) == 0 || ((Integer) value) == 1)) {\n      result.putBoolean(name, ((Integer) value) == 1);\n    } else {\n      result.putNull(name);\n    }\n  }\n\n  private void flapFitStoredPurpose(WritableMap result, String name, Object value, int index) {\n    if (value instanceof String && ((String) value).matches(\"[01]+\") && ((String) value).length() > index) {\n      result.putBoolean(name, ((String) value).charAt(index) == '1');\n    } else {\n      result.putNull(name);\n    }\n  }\n\n  private WritableMap getConsentInformation() {"
      ],
      [
        "    return consentStatusMap;",
        "    // Presence-aware provider signals, independent of ad SDK initialization.\n    java.util.Map<String, ?> stored = PreferenceManager.getDefaultSharedPreferences(getReactApplicationContext()).getAll();\n    consentStatusMap.putInt(\"flapFitPrivacySignalsVersion\", 2);\n    flapFitStoredBoolean(consentStatusMap, \"flapFitGdprApplies\", stored.get(\"IABTCF_gdprApplies\"));\n    flapFitStoredPurpose(consentStatusMap, \"flapFitPurposeOneConsent\", stored.get(\"IABTCF_PurposeConsents\"), 0);\n    flapFitStoredPurpose(consentStatusMap, \"flapFitPublisherPurposeOneConsent\", stored.get(\"IABTCF_PublisherConsent\"), 0);\n    flapFitStoredPurpose(consentStatusMap, \"flapFitPublisherPurposeSevenConsent\", stored.get(\"IABTCF_PublisherConsent\"), 6);\n    return consentStatusMap;"
      ]
    ]
  }
];
const hash = source => crypto.createHash('sha256').update(source).digest('hex');
function transform(entry, raw) {
  let source = raw.replace(/\r\n/g, '\n');
  if (hash(source) === entry.patched) return source;
  if (hash(source) !== entry.expected) throw new Error('Android AdMob source drift: ' + entry.file);
  for (const [before, after] of entry.replacements) {
    if (source.split(before).length !== 2) throw new Error('Android AdMob anchor drift: ' + entry.file);
    source = source.replace(before, after);
  }
  if (hash(source) !== entry.patched) throw new Error('Android AdMob patch mismatch: ' + entry.file);
  return source;
}
function patchAndroidAdMobPrivacy(projectRoot) {
  const packageFile = require.resolve('react-native-google-mobile-ads/package.json', { paths: [projectRoot] });
  if (JSON.parse(fs.readFileSync(packageFile, 'utf8')).version !== '16.5.0') throw new Error('Android AdMob privacy requires 16.5.0');
  const directory = path.join(path.dirname(packageFile), 'android/src/main/java/io/invertase/googlemobileads');
  const changes = entries.map(entry => {
    const file = path.join(directory, entry.file);
    return [file, transform(entry, fs.readFileSync(file, 'utf8'))];
  });
  for (const [file, result] of changes) if (fs.readFileSync(file, 'utf8') !== result) fs.writeFileSync(file, result);
}
module.exports = { entries, transform, patchAndroidAdMobPrivacy };
if (require.main === module) { patchAndroidAdMobPrivacy(path.resolve(__dirname, '..')); console.log('Android AdMob privacy patches verified.'); }
