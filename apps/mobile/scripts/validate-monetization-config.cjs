const unsupportedPackages = [
  'expo-ads-admob',
  '@react-native-firebase/analytics',
  '@segment/analytics-react-native',
  'react-native-purchases-ui',
  'expo-in-app-purchases',
  'react-native-iap',
];

function validateMonetizationConfig({ appJson, mobilePackage, env, buildProfile }) {
  const failures = [];
  const packageNames = new Set([
    ...Object.keys(mobilePackage.dependencies ?? {}),
    ...Object.keys(mobilePackage.devDependencies ?? {}),
  ]);

  for (const packageName of unsupportedPackages) {
    if (packageNames.has(packageName)) {
      failures.push(`package.json: unsupported Flap Fit 1.0 package ${packageName}`);
    }
  }

  const hasAdMob = packageNames.has('react-native-google-mobile-ads');
  const hasRevenueCat = packageNames.has('react-native-purchases');
  if (hasAdMob !== hasRevenueCat) {
    failures.push(
      'package.json: launch monetization must include both react-native-google-mobile-ads and react-native-purchases'
    );
  }

  const adsPlugin = appJson.plugins?.find(
    (plugin) => Array.isArray(plugin) && plugin[0] === 'react-native-google-mobile-ads'
  );
  if (!hasAdMob && adsPlugin) {
    failures.push('app.json: AdMob config plugin is present without the AdMob package');
  }

  if (buildProfile === 'production' && (!hasAdMob || !hasRevenueCat)) {
    failures.push(
      'production launch requires the approved AdMob and RevenueCat integration; keep Expo/preview testing ad-free until it is approved'
    );
  }

  if (!hasAdMob || !hasRevenueCat) return failures;

  if (mobilePackage.dependencies?.['react-native-google-mobile-ads'] !== '16.5.0') {
    failures.push(
      'package.json: react-native-google-mobile-ads must use the explicitly approved 16.5.0 release'
    );
  }
  if (mobilePackage.dependencies?.['react-native-purchases'] !== '10.9.1') {
    failures.push(
      'package.json: react-native-purchases must use the explicitly approved 10.9.1 release'
    );
  }

  const revenueCatVersion = String(
    mobilePackage.dependencies?.['react-native-purchases'] ?? ''
  ).match(/(\d+)\.(\d+)\.(\d+)/);
  const revenueCatMajor = Number.parseInt(revenueCatVersion?.[1] ?? '0', 10);
  const revenueCatMinor = Number.parseInt(revenueCatVersion?.[2] ?? '0', 10);
  if (revenueCatMajor < 10 || (revenueCatMajor === 10 && revenueCatMinor < 2)) {
    failures.push(
      'package.json: react-native-purchases 10.2.0 or newer is required for RevenueCat ad tracking'
    );
  }

  if (!adsPlugin) {
    failures.push(
      'app.json: monetized builds require the react-native-google-mobile-ads config plugin'
    );
  } else {
    const appIds = [adsPlugin[1]?.androidAppId, adsPlugin[1]?.iosAppId];
    if (appIds.some((id) => !/^ca-app-pub-\d+~\d+$/.test(String(id ?? '')))) {
      failures.push('app.json: monetized builds require valid iOS and Android AdMob app IDs');
    }
    if (
      buildProfile === 'production' &&
      appIds.some((id) => String(id).startsWith('ca-app-pub-3940256099942544'))
    ) {
      failures.push('app.json: Google sample AdMob app IDs cannot be used in a production build');
    }
    if (adsPlugin[1]?.delayAppMeasurementInit !== true) {
      failures.push(
        'app.json: AdMob measurement must remain delayed until the privacy flow permits ads'
      );
    }
    if (adsPlugin[1]?.userTrackingUsageDescription) {
      failures.push('app.json: launch ads must not add an ATT/IDFA usage description');
    }
  }

  if (appJson.ios?.infoPlist?.NSUserTrackingUsageDescription) {
    failures.push('app.json: launch ads must not request App Tracking Transparency');
  }

  const monetizationValues = [
    ['EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_ID', /^ca-app-pub-\d+\/\d+$/, 'iOS AdMob unit ID'],
    ['EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID', /^ca-app-pub-\d+\/\d+$/, 'Android AdMob unit ID'],
    [
      'EXPO_PUBLIC_REVENUECAT_IOS_API_KEY',
      /^appl_[A-Za-z0-9_-]+$/,
      'RevenueCat iOS public SDK key',
    ],
    [
      'EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY',
      /^goog_[A-Za-z0-9_-]+$/,
      'RevenueCat Android public SDK key',
    ],
  ];
  for (const [key, pattern, label] of monetizationValues) {
    const value = String(env[key] ?? '').trim();
    if (!pattern.test(value)) failures.push(`${key}: missing or invalid ${label}`);
    if (buildProfile === 'production' && value.startsWith('ca-app-pub-3940256099942544')) {
      failures.push(`${key}: Google sample ad-unit ID cannot be used in a production build`);
    }
  }

  return failures;
}

module.exports = { validateMonetizationConfig };
