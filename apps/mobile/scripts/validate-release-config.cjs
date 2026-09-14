const fs = require('node:fs');
const path = require('node:path');

const appRoot = path.resolve(__dirname, '..');
const appJson = JSON.parse(fs.readFileSync(path.join(appRoot, 'app.json'), 'utf8')).expo;
const failures = [];

const requiredPublicValues = [
  ['EXPO_PUBLIC_SUPPORT_EMAIL', 'public support email'],
  ['EXPO_PUBLIC_PRIVACY_URL', 'public privacy policy URL'],
  ['EXPO_PUBLIC_TERMS_URL', 'public terms URL'],
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
