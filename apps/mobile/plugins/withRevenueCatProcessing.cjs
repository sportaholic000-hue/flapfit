const { withDangerousMod, withPodfile } = require('@expo/config-plugins');
const { patchBridge } = require('../scripts/patch-revenuecat-processing.cjs');
const oldBlock = "# FLAP_FIT_RC_PROCESSING_FENCE_V1\n    system(\"node\", File.expand_path(\"../scripts/patch-revenuecat-processing.cjs\", __dir__), File.join(__dir__, \"Pods\")) || raise(\"RevenueCat consent fence failed\")\n    system(\"node\", File.expand_path(\"../scripts/test-revenuecat-processing-native.cjs\", __dir__)) || raise(\"RevenueCat native fence checks failed\")";
const block = "# FLAP_FIT_RC_PROCESSING_FENCE_V2\n    require 'json'\n    ff_rc_versions = {}\n    installer.pod_targets.each do |target|\n      spec = target.root_spec\n      next unless [\"RevenueCat\", \"PurchasesHybridCommon\"].include?(spec.name)\n      version = spec.version.to_s\n      previous = ff_rc_versions[spec.name]\n      raise(\"Conflicting RevenueCat pod versions for #{spec.name}\") if previous && previous != version\n      ff_rc_versions[spec.name] = version\n    end\n    system(\"node\", File.expand_path(\"../scripts/patch-revenuecat-processing.cjs\", __dir__), File.join(__dir__, \"Pods\"), JSON.generate(ff_rc_versions)) || raise(\"RevenueCat consent fence failed\")\n    system(\"node\", File.expand_path(\"../scripts/test-revenuecat-processing-native.cjs\", __dir__)) || raise(\"RevenueCat native fence checks failed\")";
function patchPodfile(source) {
  if(source.includes('# FLAP_FIT_RC_PROCESSING_FENCE_V2')) {
    if(source.split(block).length!==2) throw Error('RevenueCat consent fence: modified Podfile integration');
    return source;
  }
  if(source.includes('# FLAP_FIT_RC_PROCESSING_FENCE_V1')) {
    if(source.split(oldBlock).length!==2) throw Error('RevenueCat consent fence: modified old Podfile integration');
    return source.replace(oldBlock,block);
  }
  const anchor='post_install do |installer|';
  if(source.split(anchor).length!==2) throw Error('RevenueCat consent fence: Podfile post_install changed');
  return source.replace(anchor,anchor+'\n    '+block);
}
module.exports = function withRevenueCatProcessing(config) {
  config = withDangerousMod(config, ['ios', async (mod) => { patchBridge(mod.modRequest.projectRoot); return mod; }]);
  return withPodfile(config, (mod) => {
    mod.modResults.contents=patchPodfile(mod.modResults.contents);
    return mod;
  });
};
module.exports.patchPodfile=patchPodfile;
module.exports.oldBlock=oldBlock;
module.exports.block=block;
