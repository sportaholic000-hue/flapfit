const { withEntitlementsPlist } = require('expo/config-plugins');

const entitlement = 'com.apple.developer.declared-age-range';

module.exports = function withFlapFitAgeRange(config) {
  // Keep the resolved Expo config visible to EAS capability/signing synchronization.
  config.ios = {
    ...config.ios,
    entitlements: { ...config.ios?.entitlements, [entitlement]: true },
  };
  return withEntitlementsPlist(config, (mod) => {
    mod.modResults[entitlement] = true;
    return mod;
  });
};
