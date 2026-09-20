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

test.each([{}, { gdprApplies: false }, { flapFitPrivacySignalsVersion: 3, flapFitGdprApplies: false }, null])('never trusts an unverified native response %j', async (value) => {
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

const providerInfo = { flapFitPrivacySignalsVersion: 2, flapFitGdprApplies: true,
  canRequestAds: true, status: 'OBTAINED', flapFitPurposeOneConsent: false,
  flapFitPublisherPurposeOneConsent: true, flapFitPublisherPurposeSevenConsent: false };
test('native v2 presence flags remain available to the existing applicability reader', async () => {
  await expect(load({ value: providerInfo }).read()).resolves.toEqual({ status: 'available', gdprApplies: true });
});
test('normalizer retains only explicit booleans and does not expose raw consent strings', () => {
  load(); const { normalizeUmpProviderInfo } = require('../umpStoredSignals');
  expect(normalizeUmpProviderInfo({ ...providerInfo, IABTCF_PublisherConsent: '1111111', identifier: 'private' })).toEqual({
    supported: true, gdprApplies: true, canRequestAds: true, consentStatus: 'OBTAINED',
    purposeOneConsent: false, publisherPurposeOneConsent: true, publisherPurposeSevenConsent: false,
  });
  expect(JSON.stringify(normalizeUmpProviderInfo(providerInfo))).not.toContain('1111111');
});
test.each([null, 1, 'true', {}])('malformed purpose %j cannot authorize reporting', (value) => {
  load(); const { normalizeUmpProviderInfo } = require('../umpStoredSignals');
  expect(normalizeUmpProviderInfo({ ...providerInfo, flapFitPublisherPurposeOneConsent: value }).publisherPurposeOneConsent).toBeNull();
});
test('older or unknown native versions cannot grant the new provider branch', () => {
  load(); const { normalizeUmpProviderInfo } = require('../umpStoredSignals');
  for (const version of [undefined, 1, 3]) {
    expect(normalizeUmpProviderInfo({ ...providerInfo, flapFitPrivacySignalsVersion: version })).toMatchObject({ supported: false, canRequestAds: false, publisherPurposeOneConsent: null });
  }
});
