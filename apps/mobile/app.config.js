const skAdNetworkItems = require('./config/admob-skadnetwork-ids.json');

module.exports = ({ config }) => ({
  ...config,
  plugins: [
    ...(config.plugins ?? []),
    ['react-native-google-mobile-ads', {
      // Sample application IDs keep preview builds installable. Production
      // validation rejects them for the platform actually being built.
      iosAppId: process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID?.trim() || 'ca-app-pub-3940256099942544~1458002511',
      androidAppId: process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID?.trim() || 'ca-app-pub-3940256099942544~3347511713',
      delayAppMeasurementInit: true,
      skAdNetworkItems,
    }],
  ],
  android: {
    ...config.android,
    blockedPermissions: [...new Set([
      ...(config.android?.blockedPermissions ?? []),
      'com.google.android.gms.permission.AD_ID',
      'android.permission.ACCESS_ADSERVICES_AD_ID',
      'android.permission.ACCESS_ADSERVICES_ATTRIBUTION',
    ])],
  },
});
