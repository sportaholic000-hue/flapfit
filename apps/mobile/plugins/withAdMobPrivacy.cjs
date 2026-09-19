const { withDangerousMod } = require('@expo/config-plugins');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { patchAdMobPrivacy } = require('../scripts/patch-admob-privacy.cjs');
module.exports = function withAdMobPrivacy(config) {
  return withDangerousMod(config, ['ios', async (mod) => {
    patchAdMobPrivacy(mod.modRequest.projectRoot);
    execFileSync(process.execPath, [path.join(mod.modRequest.projectRoot, 'scripts/test-admob-privacy-native.cjs')], { stdio: 'inherit' });
    return mod;
  }]);
};
