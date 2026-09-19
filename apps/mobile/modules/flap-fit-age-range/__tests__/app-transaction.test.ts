const mockRequireNative = jest.fn();
const mockRead = jest.fn();
const mockRefresh = jest.fn();
const mockRequestAgeRange = jest.fn();
const mockPlatform = require('react-native').Platform as { OS: string };

jest.mock('expo', () => ({
  requireOptionalNativeModule: (...args: unknown[]) => mockRequireNative(...args),
}));
jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  return Object.create(actual, { Platform: { value: { ...actual.Platform, OS: 'ios' } } });
});
import { getVerifiedAppleAppTransaction } from '../app-transaction';

// Deliberately not an Apple signature: wrapper tests exercise transport shape only.
// Genuine Apple signature/app/environment verification belongs to the receiving server.
const signed = 'header.payload.signature';
beforeEach(() => {
  jest.clearAllMocks();
  mockPlatform.OS = 'ios';
  mockRequireNative.mockReturnValue({
    getVerifiedAppTransaction: mockRead,
    refresh: mockRefresh,
    requestAgeRange: mockRequestAgeRange,
  });
  mockRead.mockResolvedValue({ status: 'verified', signedAppTransaction: signed });
});

test('reads only the passive StoreKit method without refreshing or requesting age UI', async () => {
  expect(await getVerifiedAppleAppTransaction()).toEqual({ status: 'verified', signedAppTransaction: signed });
  expect(mockRequireNative).toHaveBeenCalledWith('FlapFitAgeRange');
  expect(mockRead).toHaveBeenCalledTimes(1);
  expect(mockRefresh).not.toHaveBeenCalled();
  expect(mockRequestAgeRange).not.toHaveBeenCalled();
});

test('only signed transport data is returned; native identifiers, age, error and consent claims are discarded', async () => {
  mockRead.mockResolvedValue({
    status: 'verified', signedAppTransaction: signed,
    appTransactionId: 'private', lowerBound: 13, upperBound: 15,
    consentGranted: true, environment: 'Production', error: 'private detail',
  });
  expect(await getVerifiedAppleAppTransaction()).toEqual({ status: 'verified', signedAppTransaction: signed });
});

test.each(['unverified', 'unsupported', 'unavailable', 'error'] as const)(
  '%s never exposes a stale signed value', async (status) => {
    mockRead.mockResolvedValue({ status, signedAppTransaction: signed, privateDetail: 'private' });
    expect(await getVerifiedAppleAppTransaction()).toEqual({ status, signedAppTransaction: null });
  },
);

test.each([
  null, [], {}, { status: 'futureStatus', signedAppTransaction: signed },
  { status: 'verified', signedAppTransaction: null },
  { status: 'verified', signedAppTransaction: 123 },
  { status: 'verified', signedAppTransaction: '' },
  { status: 'verified', signedAppTransaction: 'not-a-jws' },
  { status: 'verified', signedAppTransaction: 'a.b.' },
  { status: 'verified', signedAppTransaction: '.b.c' },
  { status: 'verified', signedAppTransaction: 'a.b.c.d' },
  { status: 'verified', signedAppTransaction: 'a.b.c\n' },
  { status: 'verified', signedAppTransaction: 'a. b.c' },
].map((value) => [value]))('malformed native result %j fails closed', async (value) => {
  mockRead.mockResolvedValue(value);
  expect(await getVerifiedAppleAppTransaction()).toEqual({ status: 'error', signedAppTransaction: null });
});

test.each(['android', 'web'])('%s never attempts to load StoreKit', async (platform) => {
  mockPlatform.OS = platform;
  expect(await getVerifiedAppleAppTransaction()).toEqual({ status: 'unsupported', signedAppTransaction: null });
  expect(mockRequireNative).not.toHaveBeenCalled();
});

test.each([null, {}, { getVerifiedAppTransaction: 'not-a-function' }])(
  'missing module or older native client %j is unsupported', async (native) => {
    mockRequireNative.mockReturnValue(native);
    expect(await getVerifiedAppleAppTransaction()).toEqual({ status: 'unsupported', signedAppTransaction: null });
  },
);

test('missing native bridge exception does not expose error text', async () => {
  mockRequireNative.mockImplementationOnce(() => { throw new Error('private lookup detail'); });
  expect(await getVerifiedAppleAppTransaction()).toEqual({ status: 'unsupported', signedAppTransaction: null });
});

test('native rejection fails closed without exposing localized private error data', async () => {
  mockRead.mockRejectedValue(new Error('private account detail'));
  expect(await getVerifiedAppleAppTransaction()).toEqual({ status: 'error', signedAppTransaction: null });
});

test('does not cache an earlier signed identity across subsequent reads', async () => {
  const first = await getVerifiedAppleAppTransaction();
  mockRead.mockResolvedValue({ status: 'verified', signedAppTransaction: 'header.changed.signature' });
  const second = await getVerifiedAppleAppTransaction();
  expect(first).toEqual({ status: 'verified', signedAppTransaction: signed });
  expect(second).toEqual({ status: 'verified', signedAppTransaction: 'header.changed.signature' });
  expect(mockRead).toHaveBeenCalledTimes(2);
});
