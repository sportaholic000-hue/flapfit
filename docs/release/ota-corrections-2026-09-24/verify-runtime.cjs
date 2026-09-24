const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(process.argv[2]);
const out = path.resolve(process.argv[3]);
const mobile = path.join(root, 'apps/mobile');
Object.assign(process.env, require(path.join(mobile, 'eas.json')).build.production.env, {
  EXPO_NO_DOTENV: '1', EXPO_NO_TELEMETRY: '1', CI: '1', NODE_ENV: 'production',
});
process.chdir(mobile);
fs.mkdirSync(out, { recursive: true });
(async () => {
  const { resolveRuntimeVersionAsync } = require(path.join(root, 'node_modules/expo-updates/utils/build/resolveRuntimeVersionAsync'));
  const result = await resolveRuntimeVersionAsync(mobile, 'ios', { debug: true }, {});
  assert.equal(result.workflow, 'managed');
  for (const file of ['scripts/patch-revenuecat-processing.cjs', 'scripts/patch-admob-privacy.cjs', 'plugins', 'modules', '../../.yarn/patches', 'fingerprint.config.js']) {
    assert(result.fingerprintSources.some(source => source.filePath === file && source.hash), 'Missing native input: ' + file);
  }
  fs.writeFileSync(path.join(out, 'fingerprint-' + process.platform + '.json'), JSON.stringify({ node: process.version, platform: process.platform, ...result }, null, 2) + '\n');
  console.log(JSON.stringify({ platform: process.platform, node: process.version, runtimeVersion: result.runtimeVersion, sources: result.fingerprintSources.length, allNativeInputsPresent: true }));
})().catch(error => { console.error(error); process.exitCode = 1; });
