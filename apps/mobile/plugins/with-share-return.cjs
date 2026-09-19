const { AndroidConfig, withAndroidManifest } = require('expo/config-plugins');

// Android can leave the receiving share activity above our root activity.
// When the user explicitly relaunches Flap Fit, return to the existing app
// activity instead of surfacing that external screen again. This does not
// claim that another app will automatically return after sending.
module.exports = function withShareReturn(config) {
  return withAndroidManifest(config, config => {
    const activity = AndroidConfig.Manifest.getMainActivityOrThrow(config.modResults);
    activity.$['android:launchMode'] = 'singleTask';
    activity.$['android:clearTaskOnLaunch'] = 'true';
    return config;
  });
};
