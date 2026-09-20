import type { LaunchCountry } from '../privacyCountry';

const KEY = '@flapfit/processing-choices-v1';
const NOTICE = '@flapfit/processing-notice-v1';
const originalEnv = { ...process.env };
const choice = (decision: 'unset' | 'denied' | 'granted') => ({ decision, noticeVersion: 1,
  decidedAt: decision === 'unset' ? null : '2026-09-20T00:00:00.000Z' });
const refusal = () => JSON.stringify({ version: 1, region: 'unknown', choices: {
  ads: choice('unset'), analytics: choice('denied'), competition: choice('unset'),
} });
const acknowledged = JSON.stringify({ version: 1, acknowledged: true, adsActivated: false, reportingActivated: false });
type Fault = 'none' | 'read-error' | 'invalid-json' | 'invalid-record' | 'empty';
const settle = async () => { for (let n = 0; n < 40; n++) await Promise.resolve(); };

function load(country: LaunchCountry, initialFault: Fault = 'none', memory = new Map([[KEY, refusal()], [NOTICE, acknowledged]])) {
  jest.resetModules();
  process.env.EXPO_PUBLIC_ADS_MODE = 'live';
  process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY = 'appl_mock_hydration_regression';
  let fault = initialFault;
  const storage = {
    getItem: jest.fn(async (key: string) => {
      if (key === KEY) {
        if (fault === 'read-error') throw new Error('Choices read failed');
        if (fault === 'invalid-json') return 'broken-json';
        if (fault === 'invalid-record') return JSON.stringify({ version: 1, region: 'unknown', choices: {} });
        if (fault === 'empty') return '';
      }
      return memory.get(key) ?? null;
    }),
    setItem: jest.fn(async (key: string, value: string) => { memory.set(key, value); }),
    removeItem: jest.fn(async (key: string) => { memory.delete(key); }),
  };
  jest.doMock('@react-native-async-storage/async-storage', () => storage);
  jest.doMock('react-native', () => ({ Platform: { OS: 'ios', Version: '26.5' },
    AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) },
    NativeModules: { RNPurchases: { flapFitSetProcessingAllowed: jest.fn().mockResolvedValue(true) } },
    TurboModuleRegistry: { get: () => null },
  }));
  jest.doMock('expo', () => ({ requireOptionalNativeModule: () => null }));
  jest.doMock('expo-constants', () => ({ __esModule: true, default: { executionEnvironment: 'standalone', expoConfig: {} }, ExecutionEnvironment: { StoreClient: 'storeClient' } }));
  const nativeAds = { setRequestConfiguration: jest.fn().mockResolvedValue(undefined), initialize: jest.fn().mockResolvedValue(undefined) };
  const consent = jest.fn().mockResolvedValue({ canRequestAds: true, privacyOptionsRequirementStatus: 'NOT_REQUIRED' });
  jest.doMock('react-native-google-mobile-ads', () => ({ default: () => nativeAds,
    AdsConsent: { requestInfoUpdate: consent, loadAndShowConsentFormIfRequired: consent },
    AdsConsentPrivacyOptionsRequirementStatus: { REQUIRED: 'REQUIRED' }, MaxAdContentRating: { PG: 'PG' },
  }));
  const purchases = { configure: jest.fn(), adTracker: {} };
  const rcLoad = jest.fn(() => ({ default: purchases }));
  jest.doMock('react-native-purchases', rcLoad);
  const access: typeof import('../processingAccess') = require('../processingAccess');
  const notice: typeof import('../processingNotice') = require('../processingNotice');
  const adapter: typeof import('../../monetization') = require('../../monetization');
  const adult = () => {
    access.setAppleAgeRequirement('not-required');
    access.setLaunchProcessingCountry(country, true);
    access.verifyLaunchAgeEvidence({ source: 'apple', status: 'shared', lowerBound: 18, upperBound: null }, country, access.getAgeVerificationRevision());
  };
  const configure = async () => { await adapter.prepareMonetization(() => true); await settle(); };
  const start = async () => { await access.hydrateProcessingAccess(); adult(); await notice.restoreProcessingNotice(); await configure(); };
  return { access, notice, adapter, storage, memory, purchases, rcLoad, nativeAds, start, adult, configure,
    recover: () => { fault = 'none'; }, reads: () => storage.getItem.mock.calls.filter(([key]) => key === KEY).length };
}
afterEach(() => { process.env = { ...originalEnv }; });

describe.each(['US', 'AU', 'MX'] as const)('%s actual monetization configuration boundary', (country) => {
  test('readable refusal survives notice/adult resolution while permitted Google ads initialize', async () => {
    const f = load(country); await f.start();
    expect(f.access.getProcessingAccess()).toMatchObject({ revenueCat: { allowed: false, reason: 'refused' }, ads: { allowed: true } });
    expect(f.purchases.configure).not.toHaveBeenCalled(); expect(f.rcLoad).not.toHaveBeenCalled();
    expect(f.nativeAds.initialize).toHaveBeenCalledTimes(1);
    expect(f.storage.setItem).not.toHaveBeenCalled();
  });

  test.each(['read-error', 'invalid-json', 'invalid-record', 'empty'] as const)('%s cannot enable SDKs, overwrite unread refusal, or prevent recovery', async (fault) => {
    const f = load(country, fault); const saved = f.memory.get(KEY); await f.start();
    expect(f.purchases.configure).not.toHaveBeenCalled();
    expect(f.access.getProcessingInputs().hydrated).toBe(false);
    expect(f.access.getProcessingAccess()).toMatchObject({ revenueCat: { allowed: false }, ads: { allowed: false } });
    expect(f.purchases.configure).not.toHaveBeenCalled(); expect(f.rcLoad).not.toHaveBeenCalled();
    expect(f.nativeAds.initialize).not.toHaveBeenCalled();
    await expect(f.access.setProcessingChoice('competition', 'granted')).rejects.toThrow(/read|retr/i);
    await expect(f.access.setPrivacyRegion('us')).rejects.toThrow(/read|retr/i);
    expect(f.memory.get(KEY)).toBe(saved);
    expect(f.storage.setItem).not.toHaveBeenCalled(); expect(f.storage.removeItem).not.toHaveBeenCalled();

    const reads = f.reads(); f.recover();
    // Exercise the real notice retry entry, not only the storage helper.
    await f.notice.restoreProcessingNotice(); await f.configure();
    expect(f.reads()).toBeGreaterThan(reads);
    expect(f.access.getProcessingInputs()).toMatchObject({ hydrated: true, choices: { analytics: { decision: 'denied' } } });
    expect(f.purchases.configure).not.toHaveBeenCalled(); expect(f.rcLoad).not.toHaveBeenCalled();
    expect(f.nativeAds.initialize).toHaveBeenCalledTimes(1);
    await f.access.setProcessingChoice('competition', 'granted');
    expect(JSON.parse(f.memory.get(KEY)!).choices).toMatchObject({ analytics: { decision: 'denied' }, competition: { decision: 'granted' } });
    expect(f.access.getProcessingAccess().ads.allowed).toBe(true);
    const restarted = load(country, 'none', f.memory); await restarted.start();
    expect(restarted.purchases.configure).not.toHaveBeenCalled(); expect(restarted.rcLoad).not.toHaveBeenCalled();
    expect(restarted.nativeAds.initialize).toHaveBeenCalledTimes(1);
  });

  test('a genuinely absent first-run record still permits the reviewed notice route', async () => {
    const f = load(country, 'none', new Map()); await f.start();
    expect(f.access.getProcessingInputs().hydrated).toBe(true);
    expect(f.purchases.configure).not.toHaveBeenCalled(); expect(f.nativeAds.initialize).not.toHaveBeenCalled();
    await f.notice.acknowledgeProcessingNotice(); await f.configure();
    expect(f.purchases.configure).toHaveBeenCalledTimes(1); expect(f.nativeAds.initialize).toHaveBeenCalledTimes(1);
  });
});

test('retrying an unrelated save reads the original refusal before merging its own change', async () => {
  const f = load('US', 'read-error'); await f.start(); f.recover();
  await f.access.setProcessingChoice('competition', 'granted'); await f.notice.restoreProcessingNotice(); await f.configure();
  expect(JSON.parse(f.memory.get(KEY)!).choices.analytics.decision).toBe('denied');
  expect(f.purchases.configure).not.toHaveBeenCalled(); expect(f.nativeAds.initialize).toHaveBeenCalledTimes(1);
});

test('a refusal made during an unreadable record stays effective when recovery restores an older grant', async () => {
  const prior = JSON.parse(refusal()); prior.choices.analytics = choice('granted');
  const f = load('US', 'read-error', new Map([[KEY, JSON.stringify(prior)], [NOTICE, acknowledged]]));
  await f.start(); await expect(f.access.setProcessingChoice('analytics', 'denied')).rejects.toThrow();
  expect(f.access.getProcessingInputs().choices.analytics.decision).toBe('denied');
  expect(f.storage.setItem).not.toHaveBeenCalled(); f.recover();
  await f.notice.restoreProcessingNotice(); await f.configure();
  expect(f.purchases.configure).not.toHaveBeenCalled(); expect(f.nativeAds.initialize).toHaveBeenCalledTimes(1);
  await f.access.setProcessingChoice('analytics', 'denied');
  expect(JSON.parse(f.memory.get(KEY)!).choices.analytics.decision).toBe('denied');
});
