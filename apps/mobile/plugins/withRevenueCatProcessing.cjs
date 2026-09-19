const { withDangerousMod, withPodfile } = require('@expo/config-plugins');
const { patchBridge } = require('../scripts/patch-revenuecat-processing.cjs');
module.exports = function withRevenueCatProcessing(config) {
  config = withDangerousMod(config, ['ios', async (mod) => { patchBridge(mod.modRequest.projectRoot); return mod; }]);
  return withPodfile(config, (mod) => {
    const marker = '# FLAP_FIT_RC_PROCESSING_FENCE_V1';
    if (!mod.modResults.contents.includes(marker)) {
      const anchor = 'post_install do |installer|';
      if (mod.modResults.contents.split(anchor).length !== 2) throw new Error('RevenueCat consent fence: Podfile post_install changed');
      mod.modResults.contents = mod.modResults.contents.replace(anchor, anchor + '\n    ' + marker + '\n    system("node", File.expand_path("../scripts/patch-revenuecat-processing.cjs", __dir__), File.join(__dir__, "Pods")) || raise("RevenueCat consent fence failed")\n    system("node", File.expand_path("../scripts/test-revenuecat-processing-native.cjs", __dir__)) || raise("RevenueCat native fence checks failed")');
    }
    return mod;
  });
};
