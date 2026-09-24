const fs = require('node:fs');
const path = require('node:path');

function validateUpdateConfig(appRoot, profile = 'production', env = process.env) {
  const app = require(path.join(appRoot, 'app.config.js'))({ config: JSON.parse(fs.readFileSync(path.join(appRoot, 'app.json'), 'utf8')).expo });
  const eas = JSON.parse(fs.readFileSync(path.join(appRoot, 'eas.json'), 'utf8'));
  const pkg = JSON.parse(fs.readFileSync(path.join(appRoot, 'package.json'), 'utf8'));
  const failures = [];
  if (!pkg.dependencies['expo-updates']) failures.push('Missing native expo-updates dependency.');
  if (app.updates?.enabled !== true) failures.push('Native OTA support must remain enabled.');
  if (app.updates?.url !== 'https://u.expo.dev/bbbfea4f-3047-46f6-a5ba-6286356e4718') failures.push('OTA URL must match the existing FlapFit EAS project.');
  if (app.runtimeVersion?.policy !== 'fingerprint') failures.push('OTA must use the native fingerprint compatibility policy.');
  if (app.updates?.checkAutomatically !== 'NEVER') failures.push('Automatic native downloads would bypass the launch gate.');
  if (app.updates?.useEmbeddedUpdate !== true || app.updates?.disableAntiBrickingMeasures !== false) failures.push('The embedded offline app and Expo recovery protections must stay enabled.');
  for (const name of ['production', 'preview', 'development']) {
    if (eas.build[name].channel !== name || eas.build[name].environment !== name) failures.push(name + ': channel and environment must match.');
  }
  if (eas.build.preview.env.EXPO_PUBLIC_ADS_MODE !== 'test' || eas.build.production.env.EXPO_PUBLIC_ADS_MODE !== 'live') failures.push('Preserve preview/test and production/live advertising modes.');
  const expected = eas.build[profile]?.env;
  if (!expected) failures.push('Unknown OTA profile: ' + profile);
  else for (const [name, value] of Object.entries(expected)) {
    if (env[name] !== value) failures.push(name + ': missing or different from the ' + profile + ' native build environment.');
  }
  return failures;
}
if (require.main === module) {
  const profile = process.argv[2] ?? 'production';
  const failures = validateUpdateConfig(path.resolve(__dirname, '..'), profile);
  if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
  else console.log('OTA configuration and ' + profile + ' environment match the native build profile. No update was published.');
}
module.exports = { validateUpdateConfig };
