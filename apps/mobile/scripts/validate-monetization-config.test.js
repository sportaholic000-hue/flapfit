const { validateMonetizationConfig } = require('./validate-monetization-config.cjs');

const validEnv = {
  EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_ID: 'ca-app-pub-1234567890123456/1111111111',
  EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID: 'ca-app-pub-1234567890123456/2222222222',
  EXPO_PUBLIC_REVENUECAT_IOS_API_KEY: 'appl_publicIosKey_1',
  EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY: 'goog_publicAndroidKey_1',
};

function validMonetizedFixture() {
  return {
    appJson: {
      ios: { infoPlist: {} },
      plugins: [
        [
          'react-native-google-mobile-ads',
          {
            androidAppId: 'ca-app-pub-1234567890123456~1111111111',
            iosAppId: 'ca-app-pub-1234567890123456~2222222222',
            delayAppMeasurementInit: true,
          },
        ],
      ],
    },
    mobilePackage: {
      dependencies: {
        'react-native-google-mobile-ads': '16.1.0',
        'react-native-purchases': '10.2.0',
      },
    },
    env: validEnv,
  };
}

describe('validateMonetizationConfig', () => {
  test('accepts the current pre-monetization candidate', () => {
    expect(
      validateMonetizationConfig({ appJson: { plugins: [] }, mobilePackage: {}, env: {} })
    ).toEqual([]);
  });

  test('rejects a partial native-package installation', () => {
    const failures = validateMonetizationConfig({
      appJson: { plugins: [] },
      mobilePackage: { dependencies: { 'react-native-google-mobile-ads': '16.1.0' } },
      env: {},
    });
    expect(failures).toContain(
      'package.json: launch monetization must include both react-native-google-mobile-ads and react-native-purchases'
    );
  });

  test('accepts a complete production monetization configuration', () => {
    expect(validateMonetizationConfig(validMonetizedFixture())).toEqual([]);
  });

  test('rejects RevenueCat versions older than the ad-tracking minimum', () => {
    const fixture = validMonetizedFixture();
    fixture.mobilePackage.dependencies['react-native-purchases'] = '10.1.9';
    expect(validateMonetizationConfig(fixture)).toContain(
      'package.json: react-native-purchases 10.2.0 or newer is required for RevenueCat ad tracking'
    );
  });

  test('rejects sample ad IDs, early measurement, and ATT configuration', () => {
    const fixture = validMonetizedFixture();
    fixture.appJson.plugins[0][1] = {
      androidAppId: 'ca-app-pub-3940256099942544~3347511713',
      iosAppId: 'ca-app-pub-3940256099942544~1458002511',
      delayAppMeasurementInit: false,
      userTrackingUsageDescription: 'Tracking',
    };
    fixture.appJson.ios.infoPlist.NSUserTrackingUsageDescription = 'Tracking';
    fixture.env = {
      ...validEnv,
      EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_ID: 'ca-app-pub-3940256099942544/4411468910',
    };
    const failures = validateMonetizationConfig(fixture);

    expect(failures).toEqual(
      expect.arrayContaining([
        'app.json: Google sample AdMob app IDs cannot be used in a production build',
        'app.json: AdMob measurement must remain delayed until the privacy flow permits ads',
        'app.json: launch ads must not add an ATT/IDFA usage description',
        'app.json: launch ads must not request App Tracking Transparency',
        'EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_ID: Google sample ad-unit ID cannot be used in a production build',
      ])
    );
  });

  test('rejects missing production monetization values', () => {
    const fixture = validMonetizedFixture();
    fixture.env = {};
    const failures = validateMonetizationConfig(fixture);
    expect(failures.filter((failure) => failure.includes('missing or invalid'))).toHaveLength(4);
  });
});
