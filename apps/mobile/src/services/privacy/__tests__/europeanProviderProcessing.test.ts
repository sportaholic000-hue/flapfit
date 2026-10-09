import type { UmpProviderInfo } from '../umpStoredSignals';
const info = (overrides: Partial<UmpProviderInfo> = {}): UmpProviderInfo => ({
  supported: true, gdprApplies: true, canRequestAds: true, consentStatus: 'OBTAINED',
  purposeOneConsent: true, publisherPurposeOneConsent: false, publisherPurposeSevenConsent: false, ...overrides,
});
const deferred = <T,>() => { let resolve!: (value: T) => void; const promise = new Promise<T>((done) => { resolve = done; }); return { promise, resolve }; };
async function load(options: { discovery?: UmpProviderInfo; final?: UmpProviderInfo; age?: unknown; reporting?: boolean; competition?: boolean; missing?: boolean; enabled?: boolean } = {}) {
  jest.resetModules();
  const values = new Map<string, string>();
  const storage = { getItem: jest.fn(async (key: string) => values.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => { values.set(key, value); }), removeItem: jest.fn(async () => undefined) };
  jest.doMock('@react-native-async-storage/async-storage', () => storage);
  jest.doMock('react-native', () => {
    const actual = jest.requireActual('react-native');
    return Object.create(actual, { Platform: { value: { ...actual.Platform, OS: 'ios', Version: '26.6' } } });
  });
  const age = jest.fn().mockResolvedValue(options.age ?? { status: 'shared', lowerBound: 18, upperBound: null });
  jest.doMock('../../../../modules/flap-fit-age-range', () => ({
    ...jest.requireActual('../../../../modules/flap-fit-age-range/src/gates'), requestAppleAgeRange: age, getAppleAgeRequirements: jest.fn(),
  }));
  const controls = { update: jest.fn().mockResolvedValue(options.final ?? info()),
    getProviderInfo: jest.fn().mockResolvedValue(options.final ?? info()), loadAndShowIfRequired: jest.fn().mockResolvedValue(options.final ?? info()) };
  controls.update.mockResolvedValueOnce(options.discovery ?? info());
  jest.doMock('../umpPrivacyControls', () => ({ getUmpProcessingControls: () => options.missing ? null : controls }));
  jest.doMock('../europeanProviderPolicy', () => ({ isEuropeanProcessingDeferred: () => false, EUROPEAN_PROVIDER_POLICY: {
    enabled: options.enabled ?? true, revision: 'test-v1', googleNonPersonalizedRouteReviewed: true, googleLimitedAdsRouteReviewed: true,
    revenueCatPublisherNoticeReviewed: options.reporting ?? false, competitionRequestedServiceReviewed: options.competition ?? false,
  } }));
  const adSdk = jest.fn(() => { throw new Error('GMA evaluated during privacy collection'); });
  const revenueCat = jest.fn(() => { throw new Error('RevenueCat evaluated during privacy collection'); });
  jest.doMock('react-native-google-mobile-ads', adSdk); jest.doMock('react-native-purchases', revenueCat);
  const access: typeof import('../processingAccess') = require('../processingAccess');
  const coordinator: typeof import('../europeanProviderProcessing') = require('../europeanProviderProcessing');
  await access.hydrateProcessingAccess(); access.setAppleAgeRequirement('not-required');
  const present = jest.fn(async <T,>(operation: () => Promise<T>): Promise<T> => operation());
  const canPresent = jest.fn(() => true);
  return { access, coordinator, controls, age, storage, present, canPresent, adSdk, revenueCat,
    run: () => coordinator.prepareEuropeanProviderProcessing({ present: present as import('../europeanProviderProcessing').EuropeanProviderPresentation['present'], canPresent }) };
}
test('real sequence discovers applicability protectively, uses Apple first, then admits ads independently', async () => {
  const f = await load(); const result = await f.run();
  expect(result.status).toBe('processed'); expect(f.controls.update.mock.calls).toEqual([[true], [false]]);
  expect(f.age).toHaveBeenCalledWith([14, 16, 18]); expect(f.present).toHaveBeenCalledTimes(1);
  expect(result.access.ads.allowed).toBe(true); expect(result.access.revenueCat.allowed).toBe(false); expect(result.access.competition.allowed).toBe(false);
  expect(f.access.getProcessingInputs().region).toBe('unknown'); expect(f.storage.setItem).not.toHaveBeenCalled();
  expect(f.adSdk).not.toHaveBeenCalled(); expect(f.revenueCat).not.toHaveBeenCalled();
  expect(JSON.stringify(f.access.getProcessingInputs())).not.toMatch(/lowerBound|upperBound|source|assurance/);
});
test.each([false, null])('non-European or unknown applicability %j does not request age or assume a country', async (gdprApplies) => {
  const f = await load({ discovery: info({ gdprApplies }) }); await f.run();
  expect(f.age).not.toHaveBeenCalled(); expect(f.access.getProcessingAccess().ads.allowed).toBe(false);
});
test('unsupported native version cannot start the age sheet or processing', async () => {
  const f = await load({ discovery: info({ supported: false }) }); expect((await f.run()).status).toBe('unavailable'); expect(f.age).not.toHaveBeenCalled();
});
test.each([
  { status: 'declined' }, { status: 'unavailable' }, { status: 'shared', lowerBound: 14, upperBound: 15 },
  { status: 'shared', lowerBound: null, upperBound: 13 },
])('unknown/refused/teen age %j is never adult and is not repeatedly requested', async (age) => {
  const f = await load({ age }); expect((await f.run()).status).toBe('age-unresolved');
  await f.run(); expect(f.age).toHaveBeenCalledTimes(1); expect(f.controls.update).toHaveBeenCalledTimes(1);
  expect(f.access.getProcessingAccess().ads.allowed).toBe(false);
});
test('existing Apple adult verification is reused without another request even before any region selection', async () => {
  const f = await load(); f.access.setAppleAgeRequirement('required'); f.access.setAppleRescissionPending(false);
  f.access.verifyMandatoryAppleAgeEvidence({ source: 'apple', status: 'shared', lowerBound: 18, upperBound: null }, f.access.getAgeVerificationRevision());
  expect((await f.run()).access.ads.allowed).toBe(true); expect(f.age).not.toHaveBeenCalled();
});
test('Google required form uses the same presentation barrier after the Apple sheet', async () => {
  const f = await load(); f.controls.update.mockResolvedValueOnce(info({ consentStatus: 'REQUIRED', canRequestAds: false }));
  await f.run(); expect(f.present).toHaveBeenCalledTimes(2); expect(f.controls.loadAndShowIfRequired).toHaveBeenCalledTimes(1);
});
test('concurrent lobby calls share one operation and completed focus does not re-prompt', async () => {
  const f = await load(); const a = f.run(), b = f.run(); expect(a).toBe(b); await a; await f.run();
  expect(f.age).toHaveBeenCalledTimes(1); expect(f.controls.update).toHaveBeenCalledTimes(2);
});
test('Google canRequestAds false denies ads even with full publisher reporting consent', async () => {
  const f = await load({ reporting: true, final: info({ canRequestAds: false, publisherPurposeOneConsent: true, publisherPurposeSevenConsent: true }) });
  const result = await f.run(); expect(result.access.ads.allowed).toBe(false); expect(result.access.revenueCat.allowed).toBe(true);
});
test('Google selected limited ads may remain eligible when reporting consent is refused', async () => {
  const f = await load({ reporting: true, final: info({ purposeOneConsent: false }) });
  const result = await f.run(); expect(result.access.ads.allowed).toBe(true); expect(result.access.revenueCat).toEqual({ allowed: false, reason: 'refused' });
});
test('Google vendor/general P1 consent cannot stand in for publisher P1 and P7', async () => {
  const f = await load({ reporting: true }); expect((await f.run()).access.revenueCat.allowed).toBe(false);
});
test('publisher booleans alone cannot bypass unreviewed actual notice/configuration', async () => {
  const f = await load({ final: info({ publisherPurposeOneConsent: true, publisherPurposeSevenConsent: true }) }); expect((await f.run()).access.revenueCat.allowed).toBe(false);
});
test('durable analytics refusal wins over fresh publisher consent without disabling ads', async () => {
  const f = await load({ reporting: true, final: info({ publisherPurposeOneConsent: true, publisherPurposeSevenConsent: true }) });
  await f.access.setProcessingChoice('analytics', 'denied'); const result = await f.run();
  expect(result.access.ads.allowed).toBe(true); expect(result.access.revenueCat.reason).toBe('refused');
});
test('a stale native discovery response cannot apply after jurisdiction changes', async () => {
  const f = await load(); const wait = deferred<UmpProviderInfo>(); f.controls.update.mockReset().mockReturnValueOnce(wait.promise);
  const operation = f.run(); await Promise.resolve(); await f.access.setPrivacyRegion('us'); wait.resolve(info());
  expect((await operation).status).toBe('stale'); expect(f.age).not.toHaveBeenCalled(); expect(f.access.getProcessingAccess().ads.allowed).toBe(false);
});
test('a late Apple response cannot bypass changed duty or lost presentation ownership', async () => {
  const f = await load(); const wait = deferred<unknown>(); f.age.mockReturnValueOnce(wait.promise); const operation = f.run();
  for (let i = 0; i < 6; i++) await Promise.resolve(); f.access.setAppleAgeRequirement('pending');
  wait.resolve({ status: 'shared', lowerBound: 18, upperBound: null }); expect((await operation).status).toBe('stale');
  expect(f.access.getProcessingAccess().ads.allowed).toBe(false);
});
test('rights re-resolution closes reporting synchronously, makes no new form/update/age request, and applies refusal', async () => {
  const f = await load({ reporting: true, final: info({ publisherPurposeOneConsent: true, publisherPurposeSevenConsent: true }) });
  await f.run(); expect(f.access.getProcessingAccess().revenueCat.allowed).toBe(true);
  const wait = deferred<UmpProviderInfo>(); f.controls.getProviderInfo.mockReturnValueOnce(wait.promise);
  const operation = f.coordinator.reconcileEuropeanProviderPrivacyOptions();
  expect(f.access.getProcessingAccess().revenueCat.allowed).toBe(false);
  wait.resolve(info({ purposeOneConsent: false })); await operation;
  expect(f.access.getProcessingAccess().ads.allowed).toBe(true); expect(f.access.getProcessingAccess().revenueCat.reason).toBe('refused');
  expect(f.controls.update).toHaveBeenCalledTimes(2); expect(f.age).toHaveBeenCalledTimes(1); expect(f.controls.loadAndShowIfRequired).not.toHaveBeenCalled();
});
test('failed rights read leaves affected processing off and never restores a cached grant', async () => {
  const f = await load(); await f.run(); f.controls.getProviderInfo.mockRejectedValueOnce(new Error('offline'));
  expect((await f.coordinator.reconcileEuropeanProviderPrivacyOptions()).status).toBe('unavailable'); expect(f.access.getProcessingAccess().ads.allowed).toBe(false);
});
test('mandatory Apple rescission pending remains blocking despite provider eligibility', async () => {
  const f = await load(); f.access.setAppleAgeRequirement('required'); const result = await f.run();
  expect(result.access.ads.reason).toBe('apple-access-check-pending'); expect(result.access.revenueCat.allowed).toBe(false);
});

test('four-country production scope leaves the European branch inert before any collection or UI', async () => {
  const f = await load({ enabled: false }); expect((await f.run()).status).toBe('not-applicable');
  expect((await f.coordinator.reconcileEuropeanProviderPrivacyOptions()).status).toBe('not-applicable');
  expect(f.controls.update).not.toHaveBeenCalled(); expect(f.controls.getProviderInfo).not.toHaveBeenCalled();
  expect(f.age).not.toHaveBeenCalled(); expect(f.present).not.toHaveBeenCalled();
});

test('leaving while waiting for the presentation barrier does not consume the unshown Apple attempt', async () => {
  const f = await load(); const wait = deferred<void>();
  f.present.mockImplementationOnce(async (operation) => { await wait.promise; return operation(); });
  const first = f.run(); for (let i = 0; i < 6; i++) await Promise.resolve();
  f.canPresent.mockReturnValue(false); wait.resolve(); expect((await first).status).toBe('not-presented');
  expect(f.age).not.toHaveBeenCalled(); f.canPresent.mockReturnValue(true);
  expect((await f.run()).status).toBe('processed'); expect(f.age).toHaveBeenCalledTimes(1);
});
