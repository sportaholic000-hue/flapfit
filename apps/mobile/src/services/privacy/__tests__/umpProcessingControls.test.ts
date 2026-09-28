const nativeInfo = { flapFitPrivacySignalsVersion: 2, flapFitGdprApplies: true, canRequestAds: true, status: 'OBTAINED',
  flapFitPurposeOneConsent: false, flapFitPublisherPurposeOneConsent: true, flapFitPublisherPurposeSevenConsent: false };
function load(options: { platform?: string; expoGo?: boolean; missingMethod?: boolean } = {}) {
  jest.resetModules();
  const native = { getConsentInfo: jest.fn().mockResolvedValue(nativeInfo), requestInfoUpdate: jest.fn().mockResolvedValue(nativeInfo),
    loadAndShowConsentFormIfRequired: jest.fn().mockResolvedValue(nativeInfo) };
  const get = jest.fn(() => options.missingMethod ? { getConsentInfo: native.getConsentInfo } : native);
  jest.doMock('react-native', () => ({ Platform: { OS: options.platform ?? 'ios' }, TurboModuleRegistry: { get } }));
  jest.doMock('expo-constants', () => ({ __esModule: true, default: { executionEnvironment: options.expoGo ? 'storeClient' : 'standalone' }, ExecutionEnvironment: { StoreClient: 'storeClient' } }));
  const sdk = jest.fn(() => { throw new Error('advertising SDK import forbidden'); });
  jest.doMock('react-native-google-mobile-ads', sdk); jest.doMock('react-native-purchases', sdk);
  const controls = (require('../umpPrivacyControls') as typeof import('../umpPrivacyControls')).getUmpProcessingControls();
  return { native, get, sdk, controls };
}
afterEach(() => jest.useRealTimers());
test.each(['ios', 'android'])('%s silent update passes actual under-consent-age flag without importing either processing SDK', async platform => {
  const f = load({ platform }); const result = await f.controls!.update(true); await f.controls!.update(false);
  expect(f.native.requestInfoUpdate.mock.calls).toEqual([[{ tagForUnderAgeOfConsent: true }], [{ tagForUnderAgeOfConsent: false }]]);
  expect(result).toMatchObject({ supported: true, gdprApplies: true, purposeOneConsent: false, publisherPurposeOneConsent: true, publisherPurposeSevenConsent: false });
  expect(f.sdk).not.toHaveBeenCalled();
});
test('form and read methods preserve nullable provider signals through the same native module', async () => {
  const f = load(); await expect(f.controls!.loadAndShowIfRequired()).resolves.toMatchObject({ canRequestAds: true });
  await expect(f.controls!.getProviderInfo()).resolves.toMatchObject({ publisherPurposeSevenConsent: false }); expect(f.sdk).not.toHaveBeenCalled();
});
test.each([{ platform: 'web' }, { expoGo: true }, { missingMethod: true }])('unsupported processing runtime %j stays unavailable', (options) => {
  expect(load(options).controls).toBeNull();
});
test('hung silent updates time out and cannot later return a grant', async () => {
  jest.useFakeTimers(); const f = load(); f.native.requestInfoUpdate.mockReturnValueOnce(new Promise(() => undefined));
  const check = expect(f.controls!.update(true)).rejects.toThrow('Privacy signal unavailable');
  await jest.advanceTimersByTimeAsync(10_001); await check; expect(jest.getTimerCount()).toBe(0);
});
test('native form does not release presentation ownership on a JS timeout', async () => {
  jest.useFakeTimers(); const f = load(); let resolve!: (value: unknown) => void;
  f.native.loadAndShowConsentFormIfRequired.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
  let finished = false; const operation = f.controls!.loadAndShowIfRequired().then(() => { finished = true; });
  await jest.advanceTimersByTimeAsync(30_000); expect(finished).toBe(false); resolve(nativeInfo); await operation; expect(finished).toBe(true);
});
