function load(options: { value?: unknown; error?: boolean; platform?: string; expoGo?: boolean; missing?: boolean } = {}) {
  jest.resetModules();
  const getConsentInfo = options.error ? jest.fn().mockRejectedValue(new Error('native query failed')) : jest.fn().mockResolvedValue(options.value);
  const get = jest.fn(() => options.missing ? null : { getConsentInfo });
  jest.doMock('react-native', () => ({ Platform: { OS: options.platform ?? 'ios' }, TurboModuleRegistry: { get } }));
  jest.doMock('expo-constants', () => ({ __esModule: true, default: { executionEnvironment: options.expoGo ? 'storeClient' : 'standalone' }, ExecutionEnvironment: { StoreClient: 'storeClient' } }));
  return { get, getConsentInfo, read: (require('../umpStoredSignals') as typeof import('../umpStoredSignals')).readStoredUmpSignals };
}

test.each([true, false, null])('preserves presence-aware provider value %s', async (flag) => {
  const f = load({ value: { flapFitPrivacySignalsVersion: 1, flapFitGdprApplies: flag } });
  await expect(f.read()).resolves.toEqual({ status: 'available', gdprApplies: flag });
  expect(f.get).toHaveBeenCalledWith('RNGoogleMobileAdsConsentModule');
});

test.each([{}, { gdprApplies: false }, { flapFitPrivacySignalsVersion: 2, flapFitGdprApplies: false }, null])('never trusts an unverified native response %j', async (value) => {
  await expect(load({ value }).read()).resolves.toEqual({ status: 'unavailable', gdprApplies: null });
});

test.each([undefined, '0', '1', 0, 1, {}])('invalid or absent flag %j remains unknown', async (flag) => {
  await expect(load({ value: { flapFitPrivacySignalsVersion: 1, flapFitGdprApplies: flag } }).read()).resolves.toEqual({ status: 'available', gdprApplies: null });
});

test.each([{ platform: 'android' }, { platform: 'web' }, { expoGo: true }])('unsupported runtime does not query native module %j', async (options) => {
  const f = load(options);
  await expect(f.read()).resolves.toEqual({ status: 'unavailable', gdprApplies: null });
  expect(f.get).not.toHaveBeenCalled();
});

test('missing native module remains unknown', async () => {
  await expect(load({ missing: true }).read()).resolves.toEqual({ status: 'unavailable', gdprApplies: null });
});

test('native failure remains unknown without rejecting', async () => {
  await expect(load({ error: true }).read()).resolves.toEqual({ status: 'error', gdprApplies: null });
});
