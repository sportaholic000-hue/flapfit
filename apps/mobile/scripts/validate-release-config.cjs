const fs = require('node:fs');
const path = require('node:path');

const appRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(appRoot, '..', '..');
const appJson = JSON.parse(fs.readFileSync(path.join(appRoot, 'app.json'), 'utf8')).expo;
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

if (!appJson.extra?.eas?.projectId) {
  failures.push('app.json: missing extra.eas.projectId (link the app to its EAS project)');
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
  failures.push('app.json: Android backup must remain disabled for local game and anonymous auth data');
}
if (appJson.ios?.infoPlist?.NSAppTransportSecurity?.NSAllowsArbitraryLoads !== false) {
  failures.push('app.json: iOS arbitrary network loads must remain disabled');
}

const buildPropertiesPlugin = appJson.plugins?.find(
  (plugin) => Array.isArray(plugin) && plugin[0] === 'expo-build-properties'
);
if ((buildPropertiesPlugin?.[1]?.android?.targetSdkVersion ?? 0) < 36) {
  failures.push('app.json: Android target SDK must be API 36 or newer');
}
if (buildPropertiesPlugin?.[1]?.android?.usesCleartextTraffic !== false) {
  failures.push('app.json: Android cleartext network traffic must remain disabled');
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
    failures.push(`package.json: ${packageName} conflicts with the ad-free, no-analytics 1.0 declaration`);
  }
}

const storeSource = fs.readFileSync(path.join(appRoot, 'src', 'utils', 'game', 'store.ts'), 'utf8');
const functionSource = fs.readFileSync(
  path.join(repoRoot, 'supabase', 'functions', 'flapfit-game', 'index.ts'),
  'utf8'
);
const appTermsVersion = storeSource.match(
  /COMPETITION_TERMS_VERSION\s*=\s*['"]([^'"]+)['"]/
)?.[1];
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
