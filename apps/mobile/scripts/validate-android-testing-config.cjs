const PROFILE = 'android-closed-testing';
function validateAndroidTestingConfig(eas, env) {
  const failures = [];
  const build = eas.build?.[PROFILE];
  if (!build) return ['Missing isolated Android closed-testing profile.'];
  if (env.EAS_BUILD_PLATFORM !== 'android') failures.push('The Android closed-testing profile may only build Android.');
  if (build.channel !== PROFILE || build.channel === eas.build.production.channel) failures.push('Android testing must have its own OTA channel.');
  if (build.distribution !== 'store' || build.android?.buildType !== 'app-bundle' || build.developmentClient === true) failures.push('Google Play closed testing requires a store AAB, without a development client.');
  if (build.environment !== 'preview' || build.autoIncrement !== true) failures.push('Android closed testing must use preview variables and increment the Android version code.');
  if (build.env?.EXPO_PUBLIC_ADS_MODE !== 'test' || env.EXPO_PUBLIC_ADS_MODE !== 'test') failures.push('Closed testing must use official test ads.');
  for (const [key, value] of Object.entries(eas.build.production.env)) {
    if (key !== 'EXPO_PUBLIC_ADS_MODE' && build.env?.[key] !== value) failures.push('Android profile must preserve the existing production value for ' + key);
  }
  return failures;
}
module.exports = { PROFILE, validateAndroidTestingConfig };
