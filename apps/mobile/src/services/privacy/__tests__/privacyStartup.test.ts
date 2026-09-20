const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

let api: typeof import('../privacyStartup');
let control: jest.Mock;
let requirement: string;
let setRequirement: jest.Mock;
let lifecycle: Set<(state: string) => void>;
let appState: { currentState: string; addEventListener: jest.Mock };
let remove: jest.Mock;
let countryStart: jest.Mock;
let countryStop: jest.Mock;
const settle = async () => { for (let i = 0; i < 8; ++i) await Promise.resolve(); };
function changeState(state: string) {
  appState.currentState = state;
  [...lifecycle].forEach((listener) => listener(state));
}

beforeEach(() => {
  jest.resetModules();
  requirement = 'pending';
  lifecycle = new Set();
  remove = jest.fn();
  countryStop = jest.fn(); countryStart = jest.fn(() => countryStop);
  control = jest.fn(async () => { requirement = 'not-required'; return requirement; });
  setRequirement = jest.fn((next: string) => { requirement = next; });
  appState = {
    currentState: 'active',
    addEventListener: jest.fn((_event, listener) => {
      lifecycle.add(listener);
      return { remove: () => { remove(); lifecycle.delete(listener); } };
    }),
  };
  jest.doMock('react-native', () => ({ AppState: appState }));
  jest.doMock('../launchProcessingControl', () => ({ startLaunchProcessing: () => () => undefined }));
  jest.doMock('../privacyCountry', () => ({ startPrivacyCountry: () => countryStart() }));
  jest.doMock('../appleAgeControl', () => ({ prepareAppleAgeControl: () => control() }));
  jest.doMock('../processingAccess', () => ({
    getProcessingInputs: () => ({ appleRequirement: requirement }),
    setAppleAgeRequirement: (next: string) => setRequirement(next),
  }));
  // Startup must never import these SDKs, even when Apple has no additional duty.
  jest.doMock('react-native-google-mobile-ads', () => { throw new Error('Unexpected ad SDK import'); });
  jest.doMock('react-native-purchases', () => { throw new Error('Unexpected analytics SDK import'); });
  api = require('../privacyStartup');
});

test('startup checks Apple without Home, ad readiness or online participation', async () => {
  const stop = api.startPrivacyStartup();
  await settle();
  expect(control).toHaveBeenCalledTimes(1);
  expect(requirement).toBe('not-required');
  stop();
  expect(lifecycle.size).toBe(0);
});

test('overlapping consumers and an effect remount share the in-flight check', async () => {
  const pending = deferred<string>();
  control.mockReturnValue(pending.promise);
  const first = api.startPrivacyStartup();
  const second = api.startPrivacyStartup();
  first(); first(); second();
  const remount = api.startPrivacyStartup();
  expect(control).toHaveBeenCalledTimes(1);
  expect(lifecycle.size).toBe(1);
  pending.resolve('required');
  await settle();
  remount();
  expect(lifecycle.size).toBe(0);
});

test('background startup waits for foreground', async () => {
  appState.currentState = 'background';
  const stop = api.startPrivacyStartup();
  expect(control).not.toHaveBeenCalled();
  changeState('active');
  await settle();
  expect(control).toHaveBeenCalledTimes(1);
  stop();
});

test('a failed lookup remains unresolved and retries on the next foreground', async () => {
  control.mockRejectedValueOnce(new Error('native unavailable'));
  const stop = api.startPrivacyStartup();
  await settle();
  expect(setRequirement).toHaveBeenCalledWith('error');
  changeState('active');
  expect(control).toHaveBeenCalledTimes(1);
  changeState('background'); changeState('active');
  await settle();
  expect(control).toHaveBeenCalledTimes(2);
  expect(requirement).toBe('not-required');
  stop();
});

test.each(['required', 'not-required', 'unsupported'])('ordinary foreground preserves established %s state', async (value) => {
  control.mockImplementation(async () => { requirement = value; return value; });
  const stop = api.startPrivacyStartup();
  await settle();
  changeState('inactive'); changeState('active');
  changeState('background'); changeState('active');
  await settle();
  expect(control).toHaveBeenCalledTimes(1);
  expect(setRequirement).not.toHaveBeenCalled();
  stop();
});

test('unmounted startup does not retry on later lifecycle events', async () => {
  control.mockResolvedValue('error');
  const stop = api.startPrivacyStartup();
  await settle(); stop();
  changeState('background'); changeState('active');
  expect(control).toHaveBeenCalledTimes(1);
});

test('real startup restores a saved refusal without asking for an age range or enabling a purpose', async () => {
  jest.resetModules();
  jest.dontMock('../appleAgeControl');
  jest.dontMock('../processingAccess');
  jest.doMock('react-native', () => ({ AppState: appState, Platform: { OS: 'ios', Version: '26.6' } }));
  const choice = (decision: string) => ({ decision, noticeVersion: 1, decidedAt: '2026-09-19T12:00:00.000Z' });
  const stored = JSON.stringify({ version: 1, region: 'us', choices: {
    ads: choice('granted'), analytics: choice('denied'), competition: choice('granted'),
  } });
  const getItem = jest.fn().mockResolvedValue(stored);
  const setItem = jest.fn();
  jest.doMock('@react-native-async-storage/async-storage', () => ({ getItem, setItem, removeItem: jest.fn() }));
  const getAppleAgeRequirements = jest.fn().mockResolvedValue({
    status: 'available', ageRangeSupported: true, eligibility: false,
    regulatoryFeaturesSupported: true, regulatoryFeatures: [],
    compiledCapabilities: { ageRange: true, regionalEligibility: true, regulatoryFeatures: true },
  });
  const requestAppleAgeRange = jest.fn();
  jest.doMock('../../../../modules/flap-fit-age-range', () => ({
    ...jest.requireActual('../../../../modules/flap-fit-age-range/src/gates'),
    getAppleAgeRequirements, requestAppleAgeRange,
  }));
  api = require('../privacyStartup');
  const runtime = require('../processingAccess') as typeof import('../processingAccess');
  const stop = api.startPrivacyStartup();
  await expect(api.preparePrivacyStartup()).resolves.toBe('not-required');
  expect(getItem).toHaveBeenCalledTimes(1);
  expect(getAppleAgeRequirements).toHaveBeenCalledTimes(1);
  expect(requestAppleAgeRange).not.toHaveBeenCalled();
  expect(setItem).not.toHaveBeenCalled();
  expect(runtime.getProcessingInputs()).toMatchObject({
    hydrated: true, region: 'us', verification: null,
    choices: { ads: { decision: 'granted' }, analytics: { decision: 'denied' } },
  });
  expect(runtime.getProcessingAccess()).toMatchObject({
    ads: { allowed: false }, revenueCat: { allowed: false }, competition: { allowed: false },
  });
  stop();
});

test('root startup owns exactly one country listener until the final consumer stops', () => {
  const first = api.startPrivacyStartup(), second = api.startPrivacyStartup();
  expect(countryStart).toHaveBeenCalledTimes(1); first(); first(); expect(countryStop).not.toHaveBeenCalled();
  second(); expect(countryStop).toHaveBeenCalledTimes(1);
});
test('real mounted startup resolves country without Home, SDK initialization, region question or age prompt', async () => {
  jest.resetModules(); jest.dontMock('../privacyCountry');
  jest.doMock('react-native', () => ({ AppState: appState, Platform: { OS: 'ios', Version: '26.6' } }));
  jest.doMock('expo-constants', () => ({ __esModule: true, default: { executionEnvironment: 'standalone' }, ExecutionEnvironment: { StoreClient: 'storeClient' } }));
  const request = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>().mockResolvedValue({
    ok: true, status: 200, redirected: false, url: 'https://flapfitapp.com/cdn-cgi/trace',
    headers: { get: (key: string) => key === 'content-type' ? 'text/plain' : null },
    text: async () => 'h=flapfitapp.com\nloc=CA\nip=192.0.2.9\ncolo=IAD\n',
  } as unknown as Response);
  const original = Object.getOwnPropertyDescriptor(globalThis, 'fetch');
  Object.defineProperty(globalThis, 'fetch', { configurable: true, writable: true, value: request });
  api = require('../privacyStartup');
  const country = require('../privacyCountry') as typeof import('../privacyCountry');
  const stop = api.startPrivacyStartup();
  try {
    await expect(country.refreshPrivacyCountry()).resolves.toEqual({ status: 'resolved', country: 'CA', source: 'cloudflare-trace' });
    expect(request).toHaveBeenCalledTimes(1); expect(control).toHaveBeenCalledTimes(1);
    expect(country.getPrivacyCountrySnapshot()).not.toHaveProperty('ip');
    expect(lifecycle.size).toBe(2);
  } finally { stop(); if (original) Object.defineProperty(globalThis, 'fetch', original); }
  expect(lifecycle.size).toBe(0); expect(country.getPrivacyCountrySnapshot().status).toBe('unknown');
});
