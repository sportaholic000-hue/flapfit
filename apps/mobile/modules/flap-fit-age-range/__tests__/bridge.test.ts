const mockGetRequirements = jest.fn();
const mockRequestAgeRange = jest.fn();
const mockRequestAgeRangeWithGates = jest.fn();
const mockRequireNative = jest.fn();
const mockPlatform = require('react-native').Platform as { OS: string };

jest.mock('expo', () => ({
  requireOptionalNativeModule: (...args: unknown[]) => mockRequireNative(...args),
}));
jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  // Preserve Jest Expo's TurboModuleRegistry and other native shims. Expo installs a
  // lazy global fetch getter which Jest may read during teardown; replacing all of
  // React Native with only Platform breaks that unrelated native lookup too late.
  return Object.create(actual, {
    Platform: { value: { ...actual.Platform, OS: 'ios' } },
  });
});

import { getAppleAgeRequirements, requestAppleAgeRange } from '../index';

const requirements = {
  status: 'available',
  compiledCapabilities: {
    ageRange: true, regionalEligibility: true,
    regulatoryFeatures: true, confirmedAssurance: true,
  },
  ageRangeSupported: true,
  eligibility: true,
  regulatoryFeaturesSupported: true,
  regulatoryFeatures: ['declaredAgeRangeRequired'],
};
const shared = (lowerBound: number | null, upperBound: number | null) => ({
  status: 'shared', lowerBound, upperBound,
  assurance: 'guardianDeclared', communicationLimits: false,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockPlatform.OS = 'ios';
  mockRequireNative.mockReturnValue({
    getRequirements: mockGetRequirements,
    requestAgeRange: mockRequestAgeRange,
    requestAgeRangeWithGates: mockRequestAgeRangeWithGates,
  });
  mockGetRequirements.mockResolvedValue(requirements);
});

test('platform override preserves the native registry used by Expo lazy globals', () => {
  const { TurboModuleRegistry } = require('react-native');
  expect(typeof TurboModuleRegistry.get).toBe('function');
  // Resolve the same getter Jest can enumerate during teardown, while this test
  // environment is alive. This must use Expo's normal mock without missing shims.
  expect(typeof globalThis.fetch).toBe('function');
});

test('regional query never triggers the user-presenting age request', async () => {
  expect(await getAppleAgeRequirements()).toEqual(requirements);
  expect(mockRequestAgeRange).not.toHaveBeenCalled();
});

test.each([[null, 12], [13, 15], [16, 17], [18, null], [14, 16]])(
  'preserves exact Apple interval %s–%s rather than widening to an adult band',
  async (lower, upper) => {
    mockRequestAgeRange.mockResolvedValue(shared(lower, upper));
    expect(await requestAppleAgeRange()).toEqual(shared(lower, upper));
  },
);

test.each(['declined', 'unknown', 'unsupported', 'unavailable', 'error'])(
  '%s cannot retain leaked adult bounds or details',
  async (status) => {
    mockRequestAgeRange.mockResolvedValue({
      ...shared(18, null), status, accountID: 'private', error: 'private message',
    });
    expect(await requestAppleAgeRange()).toEqual({
      status, lowerBound: null, upperBound: null, assurance: 'unknown',
      communicationLimits: null,
    });
  },
);

test.each([
  shared(null, null), shared(18, 12), shared(-1, 12),
  { ...shared(18, null), lowerBound: '18' },
  { ...shared(18, null), lowerBound: Number.NaN },
  { status: 'unexpectedFutureStatus', lowerBound: 18, upperBound: null },
])('malformed native age response remains unknown', async (value) => {
  mockRequestAgeRange.mockResolvedValue(value);
  expect((await requestAppleAgeRange()).status).toBe('unknown');
});

test('future assurance does not become confirmed; extra data is discarded', async () => {
  mockRequestAgeRange.mockResolvedValue({
    ...shared(18, null), assurance: 'newMethod', privateData: 'private',
  });
  expect(await requestAppleAgeRange()).toEqual({
    ...shared(18, null), assurance: 'unknown',
  });
});

test('future regulatory duties remain explicit unknown flags', async () => {
  mockGetRequirements.mockResolvedValue({
    ...requirements, regulatoryFeatures: ['newDuty', 'declaredAgeRangeRequired', 'newDuty'],
  });
  expect((await getAppleAgeRequirements()).regulatoryFeatures).toEqual([
    'unknown', 'declaredAgeRangeRequired',
  ]);
});

test('failed eligibility does not become a false regional exemption', async () => {
  mockGetRequirements.mockResolvedValue({
    ...requirements, status: 'error', eligibility: false, regulatoryFeatures: [],
  });
  expect(await getAppleAgeRequirements()).toMatchObject({
    status: 'error', eligibility: null, regulatoryFeaturesSupported: false,
  });
});

test('a known requirement survives failure of the subsequent feature query', async () => {
  mockGetRequirements.mockResolvedValue({
    ...requirements, status: 'error', regulatoryFeatures: [],
  });
  expect((await getAppleAgeRequirements()).eligibility).toBe(true);
});

test('iOS26.0 can support age sharing while regional eligibility remains unknown', async () => {
  mockGetRequirements.mockResolvedValue({
    ...requirements, eligibility: null,
    regulatoryFeaturesSupported: false, regulatoryFeatures: [],
  });
  expect(await getAppleAgeRequirements()).toMatchObject({
    status: 'available', ageRangeSupported: true, eligibility: null,
    regulatoryFeaturesSupported: false,
  });
});

test('Expo Go missing native module is safely unsupported', async () => {
  mockRequireNative.mockReturnValue(null);
  expect((await getAppleAgeRequirements()).status).toBe('unsupported');
  expect((await requestAppleAgeRange()).status).toBe('unsupported');
  expect(mockGetRequirements).not.toHaveBeenCalled();
});

test('Android/web do not attempt to load Apple framework', async () => {
  mockPlatform.OS = 'android';
  expect((await requestAppleAgeRange()).status).toBe('unsupported');
  expect(mockRequireNative).not.toHaveBeenCalled();
});

test('rejected native requests return generic errors without private text', async () => {
  mockGetRequirements.mockRejectedValue(new Error('private account detail'));
  mockRequestAgeRange.mockRejectedValue(new Error('private account detail'));
  const results = [await getAppleAgeRequirements(), await requestAppleAgeRange()];
  expect(results.every((value) => value.status === 'error')).toBe(true);
  expect(JSON.stringify(results)).not.toContain('private');
});

test('compiled capabilities stay explicit and do not imply a current user age', async () => {
  mockGetRequirements.mockResolvedValue({
    ...requirements, eligibility: null, regulatoryFeaturesSupported: false,
    regulatoryFeatures: [],
    compiledCapabilities: {
      ageRange: true, regionalEligibility: false,
      regulatoryFeatures: false, confirmedAssurance: false,
    },
  });
  expect(await getAppleAgeRequirements()).toMatchObject({
    eligibility: null,
    compiledCapabilities: { regionalEligibility: false, confirmedAssurance: false },
  });
});


test('no-argument request preserves the default native method', async () => {
  mockRequestAgeRange.mockResolvedValue(shared(13, 15));
  await requestAppleAgeRange();
  expect(mockRequestAgeRange).toHaveBeenCalledWith();
  expect(mockRequestAgeRangeWithGates).not.toHaveBeenCalled();
});

test.each([[14], [14, 16, 18], [13, 16, 18], [18], [13, 15]])(
  'passes requested valid gates %j without adding or changing thresholds', async (...gates) => {
    mockRequestAgeRangeWithGates.mockResolvedValue(shared(14, 15));
    expect(await requestAppleAgeRange(gates)).toEqual(shared(14, 15));
    expect(mockRequestAgeRangeWithGates).toHaveBeenCalledWith(gates);
    expect(mockRequestAgeRange).not.toHaveBeenCalled();
  },
);

test.each([
  [], [13, 14, 18], [14, 14], [18, 16, 14], [13, 16, 18, 20],
  [1], [0], [-1], [14.5], [Number.NaN], [Number.POSITIVE_INFINITY],
  [Number.MAX_SAFE_INTEGER + 1], ['14'], Array(1), null,
].map((gates) => [gates]))('invalid gate request %j never presents a native age sheet', async (gates) => {
  // Deliberately verify runtime validation at a JavaScript/bridge trust boundary.
  expect((await requestAppleAgeRange(gates as unknown as number[])).status).toBe('error');
  expect(mockRequestAgeRange).not.toHaveBeenCalled();
  expect(mockRequestAgeRangeWithGates).not.toHaveBeenCalled();
});

test('older native client rejects custom gates instead of silently using 13/16/18', async () => {
  mockRequireNative.mockReturnValue({ requestAgeRange: mockRequestAgeRange });
  expect((await requestAppleAgeRange([14])).status).toBe('unsupported');
  expect(mockRequestAgeRange).not.toHaveBeenCalled();
  mockRequestAgeRange.mockResolvedValue(shared(13, 15));
  expect(await requestAppleAgeRange([13, 16, 18])).toEqual(shared(13, 15));
});

test('a regulated response is not rewritten to match the requested gate 14', async () => {
  mockRequestAgeRangeWithGates.mockResolvedValue(shared(13, 15));
  expect(await requestAppleAgeRange([14])).toEqual(shared(13, 15));
});

test('custom gate errors stay generic and never fabricate a resolved threshold', async () => {
  mockRequestAgeRangeWithGates.mockRejectedValue(new Error('private native detail'));
  const result = await requestAppleAgeRange([14]);
  expect(result.status).toBe('error');
  expect(result.lowerBound).toBeNull();
  expect(JSON.stringify(result)).not.toContain('private');
});
