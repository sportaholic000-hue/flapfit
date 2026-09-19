function load(options: { value?: unknown; platform?: string; expoGo?: boolean; missing?: boolean; error?: boolean } = {}) {
  jest.resetModules();
  const info = options.value ?? { privacyOptionsRequirementStatus: 'REQUIRED', canRequestAds: true };
  const native = { getConsentInfo: jest.fn().mockResolvedValue(info), showPrivacyOptionsForm: jest.fn().mockResolvedValue(info) };
  const get = jest.fn(() => { if (options.error) throw new Error('native missing'); return options.missing ? null : native; });
  const adSdk = jest.fn(() => { throw new Error('ad SDK must stay unevaluated'); });
  const revenueCat = jest.fn(() => { throw new Error('RevenueCat must stay unevaluated'); });
  jest.doMock('react-native', () => ({ Platform: { OS: options.platform ?? 'ios' }, TurboModuleRegistry: { get } }));
  jest.doMock('expo-constants', () => ({ __esModule: true, default: { executionEnvironment: options.expoGo ? 'storeClient' : 'standalone' }, ExecutionEnvironment: { StoreClient: 'storeClient' } }));
  jest.doMock('react-native-google-mobile-ads', adSdk);
  jest.doMock('react-native-purchases', revenueCat);
  const controls = (require('../umpPrivacyControls') as typeof import('../umpPrivacyControls')).getUmpPrivacyControls();
  return { controls, native, get, adSdk, revenueCat };
}

test.each(['ios', 'android'])('existing %s rights work without evaluating either processing SDK', async (platform) => {
  const f = load({ platform });
  await expect(f.controls!.getConsentInfo()).resolves.toEqual({ required: true, canRequestAds: true });
  await expect(f.controls!.showPrivacyOptionsForm()).resolves.toEqual({ required: true, canRequestAds: true });
  expect(f.get).toHaveBeenCalledWith('RNGoogleMobileAdsConsentModule');
  expect(f.adSdk).not.toHaveBeenCalled(); expect(f.revenueCat).not.toHaveBeenCalled();
});

test.each([
  [{ privacyOptionsRequirementStatus: 'NOT_REQUIRED', canRequestAds: false }, false],
  [{ privacyOptionsRequirementStatus: 'UNKNOWN', canRequestAds: 'true' }, null],
  [{ privacyOptionsRequirementStatus: 'required', canRequestAds: 1 }, null],
  [{}, null],
  [false, null],
])('unresolved or malformed status does not invent permission: %j', async (value, required) => {
  await expect(load({ value }).controls!.getConsentInfo()).resolves.toEqual({ required, canRequestAds: false });
});

test.each([{ platform: 'web' }, { expoGo: true }])('unsupported runtime %j never queries native', (options) => {
  const f = load(options); expect(f.controls).toBeNull(); expect(f.get).not.toHaveBeenCalled();
});

test.each([{ missing: true }, { error: true }])('missing bridge %j stays unavailable', (options) => {
  expect(load(options).controls).toBeNull();
});

test('native form rejection remains a failure that the caller can display', async () => {
  const f = load(); f.native.showPrivacyOptionsForm.mockRejectedValue(new Error('not available'));
  await expect(f.controls!.showPrivacyOptionsForm()).rejects.toThrow('not available');
});
