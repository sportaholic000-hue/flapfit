jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  return Object.create(actual, { Platform: { value: { ...actual.Platform, OS: 'ios', Version: '26.6' } } });
});
jest.mock('@react-native-async-storage/async-storage', () => {
  const values = new Map<string, string>();
  return {
    getItem: jest.fn(async (key: string) => values.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => { values.set(key, value); }),
    removeItem: jest.fn(async (key: string) => { values.delete(key); }),
  };
});
jest.mock('../../../../modules/flap-fit-age-range', () => ({
  ...jest.requireActual('../../../../modules/flap-fit-age-range/src/gates'),
  getAppleAgeRequirements: jest.fn(),
  requestAppleAgeRange: jest.fn(),
}));
import { interpretAppleRequirements } from '../appleAgeControl';
import type { AppleAgeRequirements } from '../../../../modules/flap-fit-age-range';
const supported = (): AppleAgeRequirements => ({
  status: 'available', ageRangeSupported: true, eligibility: false,
  regulatoryFeaturesSupported: true, regulatoryFeatures: [],
  compiledCapabilities: {
    ageRange: true, regionalEligibility: true, regulatoryFeatures: true, confirmedAssurance: true,
  },
});
test('required Apple flag wins over a false legacy eligibility value', () => {
  expect(interpretAppleRequirements({
    ...supported(), regulatoryFeatures: ['declaredAgeRangeRequired'],
  }, 'ios', 26)).toBe('required');
});
test('legacy positive eligibility still requires the Apple age check', () => {
  expect(interpretAppleRequirements({
    ...supported(), eligibility: true, regulatoryFeaturesSupported: false,
  }, 'ios', 26)).toBe('required');
});
test('only usable negative duty evidence permits not-required', () => {
  expect(interpretAppleRequirements(supported(), 'ios', 26)).toBe('not-required');
  expect(interpretAppleRequirements({
    ...supported(), eligibility: null, regulatoryFeaturesSupported: false,
  }, 'ios', 26)).toBe('error');
});
test('missing bridge on a modern OS is not an exemption', () => {
  expect(interpretAppleRequirements({
    ...supported(), status: 'unsupported',
  }, 'ios', 26)).toBe('error');
});
test('unknown future flags and failed queries stay unresolved', () => {
  expect(interpretAppleRequirements({
    ...supported(), regulatoryFeatures: ['unknown'],
  }, 'ios', 26)).toBe('error');
  expect(interpretAppleRequirements({ ...supported(), status: 'error' }, 'ios', 26)).toBe('error');
});
test('older unsupported OS and Android retain unsupported rather than fabricating adult age', () => {
  expect(interpretAppleRequirements({ ...supported(), status: 'unsupported' }, 'ios', 18)).toBe('unsupported');
  expect(interpretAppleRequirements(supported(), 'android', 16)).toBe('unsupported');
});


import type { AppleAgeVerificationContext } from '../appleAgeControl';
const context = (): AppleAgeVerificationContext => {
  const common = {
    providerOnly: true, disclosed: true, nonSensitive: true, purposeLimited: true,
    quebecFunctions: 'not-present' as const,
  };
  return {
    country: 'US', subdivision: 'TX',
    flows: {
      ads: { ...common, nonPersonalized: true, restrictedDataProcessing: true, connecticutNecessaryContextualDelivery: false },
      analytics: { ...common, connecticutStrictInternalNecessity: false },
    },
    choices: { adsWithdrawalScope: 'none', quebecAdsFunctionsActivated: false, quebecAnalyticsFunctionsActivated: false },
  };
};
const sharedAdult = () => ({
  status: 'shared', lowerBound: 18, upperBound: null,
  assurance: 'guardianDeclared', communicationLimits: true,
});
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
};
let runtime: typeof import('../processingAccess');
let control: typeof import('../appleAgeControl');
let native: { getAppleAgeRequirements: jest.Mock; requestAppleAgeRange: jest.Mock };
async function readyControl() {
  jest.resetModules();
  runtime = require('../processingAccess');
  runtime.setAppleRescissionPending(false); // Separate server status fixture for age-only assertions.
  control = require('../appleAgeControl');
  native = require('../../../../modules/flap-fit-age-range');
  native.getAppleAgeRequirements.mockResolvedValue({ ...supported(), eligibility: true });
  native.requestAppleAgeRange.mockResolvedValue(sharedAdult());
  await runtime.hydrateProcessingAccess();
  await runtime.setPrivacyRegion('us');
  await control.prepareAppleAgeControl();
}

test('consumes Apple response into only sanitized results and independent regional purpose decisions', async () => {
  await readyControl();
  const result = await control.requestAppleAgeEvidence(context());
  expect(result.status).toBe('processed');
  for (const value of [result, runtime.getProcessingInputs(), runtime.getProcessingAccess()]) {
    expect(JSON.stringify(value)).not.toMatch(/"(?:age|source|lowerBound|upperBound|ageBand|assurance|communicationLimits)"/);
  }
  expect(result.regional?.requirements).toEqual({
    ads: 'notice-and-opt-out', analytics: 'notice-and-opt-out', competition: 'requested-service',
  });
  runtime.markProcessingNoticePresented(1);
  await runtime.setProcessingChoice('analytics', 'denied');
  expect(runtime.getProcessingAccess()).toMatchObject({
    ads: { allowed: true, treatment: 'unspecified' }, revenueCat: { allowed: false }, competition: { allowed: false },
  });
});

test('one in-flight Apple sheet returns the same sanitized promise to concurrent callers', async () => {
  await readyControl();
  const pending = deferred<ReturnType<typeof sharedAdult>>();
  native.requestAppleAgeRange.mockReturnValue(pending.promise);
  const first = control.requestAppleAgeEvidence(context());
  const second = control.requestAppleAgeEvidence(context());
  expect(first).toBe(second);
  expect(native.requestAppleAgeRange).toHaveBeenCalledTimes(1);
  pending.resolve(sharedAdult());
  const result = await first;
  expect(result).not.toHaveProperty('lowerBound');
  expect(result).not.toHaveProperty('assurance');
});

test('late Apple response cannot revive eligibility after a coarse or finer jurisdiction change', async () => {
  await readyControl();
  const pending = deferred<ReturnType<typeof sharedAdult>>();
  native.requestAppleAgeRange.mockReturnValue(pending.promise);
  const first = control.requestAppleAgeEvidence(context());
  await runtime.setPrivacyRegion('us'); // e.g. Texas to New York: same coarse region, new duties.
  pending.resolve(sharedAdult());
  expect((await first).status).toBe('stale');
  expect(runtime.getProcessingInputs().verification).toBeNull();
  expect(runtime.getProcessingAccess().ads.allowed).toBe(false);
});

test('account invalidation discards a late Apple range without weakening a required check', async () => {
  await readyControl();
  const pending = deferred<ReturnType<typeof sharedAdult>>();
  native.requestAppleAgeRange.mockReturnValue(pending.promise);
  const first = control.requestAppleAgeEvidence(context());
  control.invalidateAppleAgeEvidence();
  pending.resolve(sharedAdult());
  expect((await first).status).toBe('stale');
  expect(runtime.getProcessingInputs().verification).toBeNull();
  expect(runtime.getProcessingAccess().ads).toMatchObject({ allowed: false, treatment: 'child' });
});

test('declined Apple information clears previous eligibility even if native payload contains stale bounds', async () => {
  await readyControl();
  await control.requestAppleAgeEvidence(context());
  runtime.markProcessingNoticePresented(1);
  expect(runtime.getProcessingAccess().ads.allowed).toBe(true);
  native.requestAppleAgeRange.mockResolvedValue({ ...sharedAdult(), status: 'declined' });
  const result = await control.requestAppleAgeEvidence(context());
  expect(result.access.ads).toMatchObject({ allowed: false, reason: 'apple-check-required', treatment: 'child' });
  expect(JSON.stringify(result)).not.toMatch(/"(?:source|lowerBound|upperBound|assurance)"/);
});

test('unexpected native rejection removes old verification without exposing error payloads', async () => {
  await readyControl();
  await control.requestAppleAgeEvidence(context());
  native.requestAppleAgeRange.mockRejectedValue(new Error('native error including sensitive data'));
  const result = await control.requestAppleAgeEvidence(context());
  expect(result.status).toBe('unavailable');
  expect(runtime.getProcessingInputs().verification).toBeNull();
  expect(JSON.stringify(result)).not.toContain('sensitive data');
});

test('unconfirmed or inconsistent jurisdiction does not collect an Apple age range for later storage', async () => {
  await readyControl();
  await runtime.setPrivacyRegion('unknown');
  expect((await control.requestAppleAgeEvidence(context())).status).toBe('unavailable');
  expect(native.requestAppleAgeRange).not.toHaveBeenCalled();
  expect(runtime.getProcessingInputs().verification).toBeNull();
});

test('late requirements query after jurisdiction change cannot mark the new jurisdiction exempt', async () => {
  await readyControl();
  const pending = deferred<AppleAgeRequirements>();
  native.getAppleAgeRequirements.mockReturnValue(pending.promise);
  const query = control.prepareAppleAgeControl();
  await Promise.resolve();
  await runtime.setPrivacyRegion('ca-other');
  pending.resolve(supported());
  await query;
  expect(runtime.getProcessingInputs().appleRequirement).toBe('pending');
  expect(runtime.getProcessingAccess().ads.allowed).toBe(false);
});


test('an in-flight refresh cannot keep using old eligibility until the new response arrives', async () => {
  await readyControl();
  await control.requestAppleAgeEvidence(context());
  runtime.markProcessingNoticePresented(1);
  expect(runtime.getProcessingAccess().ads.allowed).toBe(true);
  const pending = deferred<ReturnType<typeof sharedAdult>>();
  native.requestAppleAgeRange.mockReturnValue(pending.promise);
  const refresh = control.requestAppleAgeEvidence(context());
  expect(runtime.getProcessingInputs().verification).toBeNull();
  expect(runtime.getProcessingAccess().ads.allowed).toBe(false);
  pending.resolve(sharedAdult());
  await refresh;
  expect(runtime.getProcessingAccess().ads.allowed).toBe(true);
});


test('coordinator may request gate 14 directly from Apple without a custom age question', async () => {
  await readyControl();
  await runtime.setPrivacyRegion('ca-quebec');
  await control.prepareAppleAgeControl();
  native.requestAppleAgeRange.mockResolvedValue({ ...sharedAdult(), lowerBound: 14, upperBound: 15 });
  const result = await control.requestAppleAgeEvidence({ ...context(), country: 'CA', subdivision: 'QC' }, [14, 16, 18]);
  expect(native.requestAppleAgeRange).toHaveBeenCalledWith([14, 16, 18]);
  expect(result.status).toBe('processed');
  expect(result.regional?.missingFacts).not.toContain('age-at-least-14');
  expect(JSON.stringify(result)).not.toMatch(/"(?:source|lowerBound|upperBound)"/);
});

test('Apple overriding gate 14 with range 13-15 remains unresolved for Quebec', async () => {
  await readyControl();
  await runtime.setPrivacyRegion('ca-quebec');
  await control.prepareAppleAgeControl();
  native.requestAppleAgeRange.mockResolvedValue({ ...sharedAdult(), lowerBound: 13, upperBound: 15 });
  const result = await control.requestAppleAgeEvidence({ ...context(), country: 'CA', subdivision: 'QC' }, [14]);
  expect(result.regional?.missingFacts).toContain('age-at-least-14');
  expect(result.access.ads.allowed).toBe(false);
});

test('different concurrent gates do not reuse a result or present another system sheet', async () => {
  await readyControl();
  const pending = deferred<ReturnType<typeof sharedAdult>>();
  native.requestAppleAgeRange.mockReturnValue(pending.promise);
  const first = control.requestAppleAgeEvidence(context());
  const second = await control.requestAppleAgeEvidence(context(), [14]);
  expect(second.status).toBe('unavailable');
  expect(native.requestAppleAgeRange).toHaveBeenCalledTimes(1);
  pending.resolve(sharedAdult());
  expect((await first).status).toBe('stale');
  expect(runtime.getProcessingInputs().verification).toBeNull();
});

test('invalid adjacent gates do not invoke Apple or retain previous eligibility', async () => {
  await readyControl();
  await control.requestAppleAgeEvidence(context());
  native.requestAppleAgeRange.mockClear();
  const result = await control.requestAppleAgeEvidence(context(), [13, 14, 18]);
  expect(result.status).toBe('unavailable');
  expect(native.requestAppleAgeRange).not.toHaveBeenCalled();
  expect(runtime.getProcessingInputs().verification).toBeNull();
});
