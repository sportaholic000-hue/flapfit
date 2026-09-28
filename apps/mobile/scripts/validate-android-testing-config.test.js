const { validateAndroidTestingConfig } = require('./validate-android-testing-config.cjs');
const eas = require('../eas.json');
const env = { ...eas.build['android-closed-testing'].env, EAS_BUILD_PLATFORM: 'android' };
test('isolated store-testing profile passes without changing production', () => {
  expect(validateAndroidTestingConfig(eas, env)).toEqual([]);
  expect(eas.build.production.channel).toBe('production');
  expect(eas.build.production.env.EXPO_PUBLIC_ADS_MODE).toBe('live');
});
test.each([
  ['iOS channel', b => { b.channel = 'production'; }],
  ['APK distribution', b => { b.distribution = 'internal'; }],
  ['APK output', b => { b.android.buildType = 'apk'; }],
  ['live ad test traffic', b => { b.env.EXPO_PUBLIC_ADS_MODE = 'live'; }],
  ['different backend', b => { b.env.EXPO_PUBLIC_SUPABASE_URL = 'https://different.invalid'; }],
])('%s cannot slip into the closed-testing profile', (_label, mutate) => {
  const changed = JSON.parse(JSON.stringify(eas));
  mutate(changed.build['android-closed-testing']);
  expect(validateAndroidTestingConfig(changed, env).length).toBeGreaterThan(0);
});
test('Android testing profile cannot be used to build iOS', () => {
  expect(validateAndroidTestingConfig(eas, { ...env, EAS_BUILD_PLATFORM: 'ios' })).toContain('The Android closed-testing profile may only build Android.');
});
