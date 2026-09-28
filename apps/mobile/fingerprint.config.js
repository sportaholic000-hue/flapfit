const { transform, transformConsent } = require('./scripts/patch-admob-privacy.cjs');
const { patchBridgeSource } = require('./scripts/patch-revenuecat-processing.cjs');
const { entries: androidAdMobEntries, transform: transformAndroidAdMob } = require('./scripts/patch-admob-privacy-android.cjs');
const textChunks = new WeakMap();

/** Native inputs outside the standard Expo module discovery paths. */
module.exports = {
  concurrentIoLimit: 4,
  // EAS remotely increments build numbers. They are not native API changes.
  sourceSkips: ['PackageJsonAndroidAndIosScriptsIfNotContainRun', 'ExpoConfigVersions', 'GitIgnore'],
  extraSources: [
    { type: 'dir', filePath: 'plugins', reasons: ['flapfit-native-plugins'] },
    { type: 'file', filePath: 'scripts/patch-admob-privacy-android.cjs', reasons: ['flapfit-android-native-privacy'] },
    { type: 'dir', filePath: 'modules', reasons: ['flapfit-native-modules'] },
    { type: 'dir', filePath: '../../.yarn/patches', reasons: ['flapfit-dependency-patches'] },
    { type: 'file', filePath: 'fingerprint.config.js', reasons: ['flapfit-fingerprint-config'] },
  ],
  // Git may check out source as CRLF on Windows and LF on EAS's macOS host.
  // Normalize text for comparison only; never rewrite native/package files.
  fileHookTransform(source, chunk, isEndOfFile) {
    if (source.type !== 'file' || !/\.(?:[cm]?js|[cm]?ts|tsx|jsx|json|swift|m|mm|h|kt|java|gradle|properties|xml|podspec|patch|rb|plist|md|sh)$|(?:^|\/)(?:\.easignore|\.gitignore)$/.test(source.filePath)) return chunk;
    const chunks = textChunks.get(source) ?? [];
    if (chunk !== null) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    if (!isEndOfFile) { textChunks.set(source, chunks); return ''; }
    textChunks.delete(source);
    const text = Buffer.concat(chunks).toString('utf8').replace(/\r\n/g, '\n');
    // Compare the exact final native bridge, before or after Expo prebuild.
    if (source.filePath.endsWith('/react-native-purchases/ios/RNPurchases.m')) return patchBridgeSource(text);
    if (source.filePath.endsWith('/RNGoogleMobileAds/RNGoogleMobileAdsModule.mm')) return transform(text);
    if (source.filePath.endsWith('/RNGoogleMobileAds/RNGoogleMobileAdsConsentModule.mm')) return transformConsent(text);
    const androidEntry = androidAdMobEntries.find(entry => source.filePath.replace(/\\/g, '/').endsWith('/react-native-google-mobile-ads/android/src/main/java/io/invertase/googlemobileads/' + entry.file));
    if (androidEntry) return transformAndroidAdMob(androidEntry, text);
    return text;
  },
};
