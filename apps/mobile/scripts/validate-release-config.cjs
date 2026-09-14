const fs = require('node:fs');
const path = require('node:path');

const appRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(appRoot, '..', '..');
const appJson = JSON.parse(fs.readFileSync(path.join(appRoot, 'app.json'), 'utf8')).expo;
const easJson = JSON.parse(fs.readFileSync(path.join(appRoot, 'eas.json'), 'utf8'));
const mobilePackage = JSON.parse(fs.readFileSync(path.join(appRoot, 'package.json'), 'utf8'));
const failures = [];

const requiredPublicValues = [
  ['EXPO_PUBLIC_SUPPORT_EMAIL', 'public support email'],
  ['EXPO_PUBLIC_PRIVACY_URL', 'public privacy policy URL'],
  ['EXPO_PUBLIC_TERMS_URL', 'public terms URL'],
  ['EXPO_PUBLIC_ACCOUNT_DELETION_URL', 'public account and data deletion URL'],
  ['EXPO_PUBLIC_MARKETING_URL', 'public support/marketing website URL'],
  ['EXPO_PUBLIC_SUPABASE_URL', 'Supabase project URL'],
  ['EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'Supabase publishable key'],
];

for (const [key, label] of requiredPublicValues) {
  const value = String(process.env[key] ?? '').trim();
  if (!value) failures.push(`${key}: missing ${label}`);
  if (key.endsWith('_URL') && value && !/^https:\/\//i.test(value)) {
    failures.push(`${key}: must use a public https:// URL`);
  }
}

const supportEmail = String(process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? '').trim();
if (supportEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail)) {
  failures.push('EXPO_PUBLIC_SUPPORT_EMAIL: invalid email address');
}

const supabaseKey = String(process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '').trim();
if (supabaseKey && !supabaseKey.startsWith('sb_publishable_')) {
  failures.push('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: use a modern sb_publishable_ key');
}

if (appJson.owner !== 'sportaholic') {
  failures.push('app.json: Expo owner must remain sportaholic');
}
if (appJson.extra?.eas?.projectId !== 'bbbfea4f-3047-46f6-a5ba-6286356e4718') {
  failures.push('app.json: EAS project ID must remain linked to @sportaholic/flapfit');
}

if (appJson.name !== 'Flap Fit' || appJson.slug !== 'flapfit') {
  failures.push('app.json: release name and slug must remain Flap Fit / flapfit');
}
if (appJson.ios?.bundleIdentifier !== 'com.flapfit.game') {
  failures.push('app.json: iOS bundle identifier must be com.flapfit.game');
}
if (appJson.android?.package !== 'com.flapfit.game') {
  failures.push('app.json: Android package must be com.flapfit.game');
}
if (appJson.android?.allowBackup !== false) {
  failures.push(
    'app.json: Android backup must remain disabled for local game and anonymous auth data'
  );
}
if (appJson.ios?.infoPlist?.NSAppTransportSecurity?.NSAllowsArbitraryLoads !== false) {
  failures.push('app.json: iOS arbitrary network loads must remain disabled');
}

const privacyManifest = appJson.ios?.privacyManifests;
if (privacyManifest?.NSPrivacyTracking !== false) {
  failures.push('app.json: iOS privacy manifest must declare tracking disabled');
}
if ((privacyManifest?.NSPrivacyTrackingDomains ?? []).length !== 0) {
  failures.push('app.json: iOS privacy manifest must not contain tracking domains');
}

const requiredPrivacyApiReasons = new Map([
  ['NSPrivacyAccessedAPICategoryFileTimestamp', ['0A2A.1', '3B52.1', 'C617.1']],
  ['NSPrivacyAccessedAPICategoryDiskSpace', ['85F4.1', 'E174.1']],
  ['NSPrivacyAccessedAPICategoryUserDefaults', ['CA92.1']],
  ['NSPrivacyAccessedAPICategorySystemBootTime', ['35F9.1']],
]);
for (const [apiType, reasons] of requiredPrivacyApiReasons) {
  const entry = privacyManifest?.NSPrivacyAccessedAPITypes?.find(
    (candidate) => candidate.NSPrivacyAccessedAPIType === apiType
  );
  if (
    !entry ||
    reasons.some((reason) => !entry.NSPrivacyAccessedAPITypeReasons?.includes(reason))
  ) {
    failures.push(`app.json: iOS privacy manifest is missing required reasons for ${apiType}`);
  }
}

const requiredCollectedDataTypes = new Set([
  'NSPrivacyCollectedDataTypeUserID',
  'NSPrivacyCollectedDataTypeGameplayContent',
  'NSPrivacyCollectedDataTypeFitness',
  'NSPrivacyCollectedDataTypeOtherUserContent',
]);
for (const dataType of requiredCollectedDataTypes) {
  const entry = privacyManifest?.NSPrivacyCollectedDataTypes?.find(
    (candidate) => candidate.NSPrivacyCollectedDataType === dataType
  );
  if (
    !entry ||
    entry.NSPrivacyCollectedDataTypeLinked !== true ||
    entry.NSPrivacyCollectedDataTypeTracking !== false ||
    !entry.NSPrivacyCollectedDataTypePurposes?.includes(
      'NSPrivacyCollectedDataTypePurposeAppFunctionality'
    )
  ) {
    failures.push(`app.json: iOS privacy manifest is incomplete for ${dataType}`);
  }
}

const buildPropertiesPlugin = appJson.plugins?.find(
  (plugin) => Array.isArray(plugin) && plugin[0] === 'expo-build-properties'
);
if ((buildPropertiesPlugin?.[1]?.android?.compileSdkVersion ?? 0) < 36) {
  failures.push('app.json: Android compile SDK must be API 36 or newer');
}
if ((buildPropertiesPlugin?.[1]?.android?.targetSdkVersion ?? 0) < 36) {
  failures.push('app.json: Android target SDK must be API 36 or newer');
}
if (buildPropertiesPlugin?.[1]?.android?.usesCleartextTraffic !== false) {
  failures.push('app.json: Android cleartext network traffic must remain disabled');
}
if (Number.parseFloat(buildPropertiesPlugin?.[1]?.ios?.deploymentTarget ?? '0') < 16.4) {
  failures.push('app.json: iOS deployment target must remain 16.4 or newer for Expo SDK 57');
}

if (!/^~57\./.test(String(mobilePackage.dependencies?.expo ?? ''))) {
  failures.push(
    'package.json: Expo SDK 57 is required for the current Apple and Google toolchains'
  );
}
if (!/^0\.86\./.test(String(mobilePackage.dependencies?.['react-native'] ?? ''))) {
  failures.push('package.json: React Native 0.86 must remain aligned with Expo SDK 57');
}

const productionBuild = easJson.build?.production;
if (!productionBuild) {
  failures.push('eas.json: missing production build profile');
} else {
  if (productionBuild.environment !== 'production') {
    failures.push('eas.json: production builds must use the production EAS environment');
  }
  if (productionBuild.autoIncrement !== true) {
    failures.push('eas.json: production build numbers must auto-increment');
  }
  if (productionBuild.distribution === 'internal' || productionBuild.developmentClient === true) {
    failures.push(
      'eas.json: production must create store-distribution builds, not internal/dev builds'
    );
  }
  if (productionBuild.android?.buildType !== 'app-bundle') {
    failures.push('eas.json: Google Play production builds must use the Android App Bundle format');
  }

  const iosImage = String(productionBuild.ios?.image ?? 'auto');
  const iosImageSupportsXcode26 =
    iosImage === 'auto' ||
    iosImage === 'latest' ||
    iosImage === 'sdk-57' ||
    /xcode-26(?:\.|$)/i.test(iosImage);
  if (!iosImageSupportsXcode26) {
    failures.push(
      "eas.json: iOS production image must support Apple's required Xcode 26 toolchain"
    );
  }
}

if (
  mobilePackage.scripts?.['eas-build-post-install'] !== 'node ./scripts/eas-build-post-install.cjs'
) {
  failures.push(
    'package.json: production EAS builds must retain the fail-closed post-install check'
  );
}

const cameraPlugin = appJson.plugins?.find(
  (plugin) => Array.isArray(plugin) && plugin[0] === 'expo-camera'
);
if (
  !cameraPlugin ||
  cameraPlugin[1]?.microphonePermission !== false ||
  cameraPlugin[1]?.recordAudioAndroid !== false
) {
  failures.push('app.json: Expo Camera must keep microphone permission and Android audio disabled');
}

const packageNames = new Set([
  ...Object.keys(mobilePackage.dependencies ?? {}),
  ...Object.keys(mobilePackage.devDependencies ?? {}),
]);
const forbiddenReleasePackages = [
  'react-native-google-mobile-ads',
  'expo-ads-admob',
  '@react-native-firebase/analytics',
  '@segment/analytics-react-native',
];
for (const packageName of forbiddenReleasePackages) {
  if (packageNames.has(packageName)) {
    failures.push(
      `package.json: ${packageName} conflicts with the ad-free, no-analytics 1.0 declaration`
    );
  }
}

const storeSource = fs.readFileSync(path.join(appRoot, 'src', 'utils', 'game', 'store.ts'), 'utf8');
const functionSource = fs.readFileSync(
  path.join(repoRoot, 'supabase', 'functions', 'flapfit-game', 'index.ts'),
  'utf8'
);
const appTermsVersion = storeSource.match(/COMPETITION_TERMS_VERSION\s*=\s*['"]([^'"]+)['"]/)?.[1];
const apiTermsVersion = functionSource.match(/CURRENT_TERMS_VERSION\s*=\s*['"]([^'"]+)['"]/)?.[1];
if (!appTermsVersion || !apiTermsVersion || appTermsVersion !== apiTermsVersion) {
  failures.push('competition Terms version must match between the mobile app and Edge Function');
}

const adsPlugin = appJson.plugins?.find(
  (plugin) => Array.isArray(plugin) && plugin[0] === 'react-native-google-mobile-ads'
);
if (adsPlugin) {
  const ids = [adsPlugin[1]?.androidAppId, adsPlugin[1]?.iosAppId].filter(Boolean);
  if (ids.some((id) => String(id).startsWith('ca-app-pub-3940256099942544'))) {
    failures.push(
      'app.json: Google sample AdMob IDs remain; use production IDs or remove ads from version 1'
    );
  }
}

if (failures.length) {
  console.error('Flap Fit release configuration is incomplete:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Flap Fit release configuration is complete.');
}
