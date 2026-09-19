import { PROCESSING_NOTICE_VERSION, type PurposeRequirement } from '../processingPolicy';

const KEY = '@flapfit/processing-choices-v1';
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
};
const savedChoice = (decision: 'granted' | 'denied' | 'unset') => ({
  decision, noticeVersion: PROCESSING_NOTICE_VERSION,
  decidedAt: decision === 'unset' ? null : '2026-09-20T10:00:00.000Z',
});
const stored = (decision: 'granted' | 'denied' = 'granted', region = 'us') => JSON.stringify({
  version: 1, region,
  choices: { ads: savedChoice(decision), analytics: savedChoice(decision), competition: savedChoice(decision) },
});
let api: typeof import('../processingAccess');
let memory: Map<string, string>;
let storage: { getItem: jest.Mock; setItem: jest.Mock; removeItem: jest.Mock };

function loadFreshModule() {
  jest.resetModules();
  jest.doMock('@react-native-async-storage/async-storage', () => storage);
  return require('../processingAccess') as typeof import('../processingAccess');
}
function establishAgeAndFixturePolicy() {
  api.setAppleRescissionPending(false); // Independent server-check fixture, not an age result.
  api.setAppleAgeRequirement('not-required');
  api.verifyTransientAgeEvidence({ source: 'apple', status: 'shared', lowerBound: 14, upperBound: 17 });
  // This fixture selects requirements only inside a test, never in product code.
  api.setProcessingRequirements({
    ads: 'express-consent', analytics: 'express-consent', competition: 'requested-service',
  });
}
async function ready() {
  await api.hydrateProcessingAccess();
  await api.setPrivacyRegion('us');
  establishAgeAndFixturePolicy();
}
async function grantAll() {
  await Promise.all([
    api.setProcessingChoice('ads', 'granted'),
    api.setProcessingChoice('analytics', 'granted'),
    api.setProcessingChoice('competition', 'granted'),
  ]);
}
function allOff() {
  const current = api.getProcessingAccess();
  return !current.ads.allowed && !current.revenueCat.allowed && !current.competition.allowed;
}

beforeEach(() => {
  memory = new Map();
  storage = {
    getItem: jest.fn(async (key: string) => memory.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => { memory.set(key, value); }),
    removeItem: jest.fn(async (key: string) => { memory.delete(key); }),
  };
  api = loadFreshModule();
});

test('loading or unselected policy never starts processing even after age and region become known', async () => {
  expect(allOff()).toBe(true);
  await api.hydrateProcessingAccess();
  await api.setPrivacyRegion('us');
  api.setAppleAgeRequirement('not-required');
  api.verifyTransientAgeEvidence({ source: 'apple', status: 'shared', lowerBound: 18, upperBound: null });
  await grantAll();
  expect(api.getProcessingInputs().requirements).toEqual({
    ads: 'unresolved', analytics: 'unresolved', competition: 'unresolved',
  });
  expect(allOff()).toBe(true);
});

test('a grant is never published before its durable write completes', async () => {
  await ready();
  const started = deferred<void>();
  const write = deferred<void>();
  storage.setItem.mockImplementationOnce(async (key: string, value: string) => {
    started.resolve(); await write.promise; memory.set(key, value);
  });
  const granting = api.setProcessingChoice('ads', 'granted');
  await started.promise;
  expect(api.getProcessingAccess().ads.allowed).toBe(false);
  write.resolve();
  await granting;
  expect(api.getProcessingAccess().ads.allowed).toBe(true);
  expect(JSON.parse(memory.get(KEY)!).choices.ads.decision).toBe('granted');
});

test('withdrawal takes effect immediately while its persistence is pending', async () => {
  await ready();
  await grantAll();
  const started = deferred<void>();
  const write = deferred<void>();
  storage.setItem.mockImplementationOnce(async (key: string, value: string) => {
    started.resolve(); await write.promise; memory.set(key, value);
  });
  const withdrawing = api.setProcessingChoice('analytics', 'denied');
  expect(api.getProcessingAccess()).toMatchObject({
    ads: { allowed: true }, revenueCat: { allowed: false, reason: 'refused' }, competition: { allowed: true },
  });
  await started.promise;
  write.resolve();
  await withdrawing;
  expect(JSON.parse(memory.get(KEY)!).choices.analytics.decision).toBe('denied');
});

test('a pending grant cannot re-enable its purpose after a newer refusal', async () => {
  await ready();
  const observed: boolean[] = [];
  api.subscribeProcessingAccess(() => observed.push(api.getProcessingAccess().ads.allowed));
  const started = deferred<void>();
  const write = deferred<void>();
  storage.setItem.mockImplementationOnce(async (key: string, value: string) => {
    started.resolve(); await write.promise; memory.set(key, value);
  });
  const granting = api.setProcessingChoice('ads', 'granted');
  await started.promise;
  const refusing = api.setProcessingChoice('ads', 'denied');
  write.resolve();
  await Promise.all([granting, refusing]);
  expect(observed).not.toContain(true);
  expect(api.getProcessingInputs().choices.ads.decision).toBe('denied');
  expect(JSON.parse(memory.get(KEY)!).choices.ads.decision).toBe('denied');
});

test('concurrent grants remain independent and each waits for its durable operation', async () => {
  await ready();
  const firstStarted = deferred<void>(), secondStarted = deferred<void>();
  const first = deferred<void>(), second = deferred<void>();
  storage.setItem
    .mockImplementationOnce(async (key: string, value: string) => {
      firstStarted.resolve(); await first.promise; memory.set(key, value);
    })
    .mockImplementationOnce(async (key: string, value: string) => {
      secondStarted.resolve(); await second.promise; memory.set(key, value);
    });
  const ads = api.setProcessingChoice('ads', 'granted');
  await firstStarted.promise;
  const competition = api.setProcessingChoice('competition', 'granted');
  first.resolve();
  await ads;
  await secondStarted.promise;
  expect(api.getProcessingAccess()).toMatchObject({
    ads: { allowed: true }, revenueCat: { allowed: false }, competition: { allowed: false },
  });
  second.resolve();
  await competition;
  expect(api.getProcessingAccess()).toMatchObject({
    ads: { allowed: true }, revenueCat: { allowed: false }, competition: { allowed: true },
  });
  const persisted = JSON.parse(memory.get(KEY)!);
  expect(persisted.choices.ads.decision).toBe('granted');
  expect(persisted.choices.competition.decision).toBe('granted');
});

test('a late hydration result cannot restore a grant over a newer refusal', async () => {
  const read = deferred<string>();
  storage.getItem.mockReturnValueOnce(read.promise);
  const hydrating = api.hydrateProcessingAccess();
  await api.setProcessingChoice('ads', 'denied');
  read.resolve(stored('granted'));
  await hydrating;
  expect(api.getProcessingInputs().choices.ads.decision).toBe('denied');
  expect(api.getProcessingAccess().ads.allowed).toBe(false);
  expect(JSON.parse(memory.get(KEY)!).choices.ads.decision).toBe('denied');
});

test('a late hydration result cannot replace a newly selected region', async () => {
  const read = deferred<string>();
  storage.getItem.mockReturnValueOnce(read.promise);
  const hydrating = api.hydrateProcessingAccess();
  await api.setPrivacyRegion('ca-quebec');
  read.resolve(stored('granted', 'ca-other'));
  await hydrating;
  expect(api.getProcessingInputs().region).toBe('ca-quebec');
  expect(JSON.parse(memory.get(KEY)!).region).toBe('ca-quebec');
});

test('a saved refusal survives relaunch and does not refuse other independently permitted purposes', async () => {
  await ready();
  await grantAll();
  await api.setProcessingChoice('analytics', 'denied');
  api = loadFreshModule();
  expect(allOff()).toBe(true);
  await api.hydrateProcessingAccess();
  expect(api.getProcessingInputs().choices.analytics.decision).toBe('denied');
  // Hydration never treats a previously shared Apple range as fresh evidence.
  expect(api.getProcessingInputs().verification).toBeNull();
  expect(api.getProcessingInputs()).not.toHaveProperty('age');
  expect(allOff()).toBe(true);
  establishAgeAndFixturePolicy();
  expect(api.getProcessingAccess()).toMatchObject({
    ads: { allowed: true }, revenueCat: { allowed: false, reason: 'refused' }, competition: { allowed: true },
  });
});

test('failed grant persistence publishes no grant and rejects the operation', async () => {
  await ready();
  const observed: boolean[] = [];
  api.subscribeProcessingAccess(() => observed.push(api.getProcessingAccess().ads.allowed));
  storage.setItem.mockRejectedValueOnce(new Error('disk unavailable'));
  await expect(api.setProcessingChoice('ads', 'granted')).rejects.toThrow('disk unavailable');
  expect(observed).not.toContain(true);
  expect(allOff()).toBe(true);
  expect(storage.removeItem).toHaveBeenCalledWith(KEY);
});

test('failed persistence invalidates already queued grants instead of publishing them later', async () => {
  await ready();
  const started = deferred<void>();
  const write = deferred<void>();
  storage.setItem.mockImplementationOnce(() => { started.resolve(); return write.promise; });
  const ads = api.setProcessingChoice('ads', 'granted');
  const failure = expect(ads).rejects.toThrow('failed write');
  await started.promise;
  const competition = api.setProcessingChoice('competition', 'granted');
  write.reject(new Error('failed write'));
  await failure;
  await competition;
  expect(allOff()).toBe(true);
  const saved = JSON.parse(memory.get(KEY)!);
  expect(saved.choices.ads.decision).toBe('denied');
  expect(saved.choices.competition.decision).toBe('denied');
});

test('failed withdrawal is surfaced and cannot leave processing enabled in the current session', async () => {
  await ready();
  await grantAll();
  storage.setItem.mockRejectedValueOnce(new Error('write failed'));
  storage.removeItem.mockRejectedValueOnce(new Error('cleanup failed'));
  await expect(api.setProcessingChoice('analytics', 'denied')).rejects.toThrow('write failed');
  expect(allOff()).toBe(true);
});

test('a later explicit grant can recover after storage succeeds without granting other purposes', async () => {
  await ready();
  storage.setItem.mockRejectedValueOnce(new Error('temporary failure'));
  await expect(api.setProcessingChoice('ads', 'granted')).rejects.toThrow();
  await api.setProcessingChoice('ads', 'granted');
  expect(api.getProcessingAccess()).toMatchObject({
    ads: { allowed: true }, revenueCat: { allowed: false }, competition: { allowed: false },
  });
});

test('a failed region write cannot make that region eligible in memory', async () => {
  await ready();
  await grantAll();
  storage.setItem.mockRejectedValueOnce(new Error('region write failed'));
  await expect(api.setPrivacyRegion('ca-quebec')).rejects.toThrow('region write failed');
  expect(api.getProcessingInputs().region).toBe('unknown');
  expect(allOff()).toBe(true);
});

test.each([
  'not json',
  JSON.stringify({ version: 2, region: 'us', choices: {} }),
  JSON.stringify({ version: 1, region: 'us', choices: { ads: savedChoice('granted') } }),
  JSON.stringify({ version: 1, region: 'unrecognized', choices: {
    ads: savedChoice('granted'), analytics: savedChoice('granted'), competition: savedChoice('granted'),
  } }),
])('malformed persisted state cannot grant access: %s', async (value) => {
  memory.set(KEY, value);
  await api.hydrateProcessingAccess();
  expect(allOff()).toBe(true);
  expect(api.getProcessingInputs().choices.ads.decision).toBe('unset');
  expect(api.getProcessingInputs().region).toBe('unknown');
});

test('unreadable storage leaves purposes off and does not invent a prior choice', async () => {
  storage.getItem.mockRejectedValueOnce(new Error('read failed'));
  await api.hydrateProcessingAccess();
  expect(api.getProcessingInputs().hydrated).toBe(true);
  expect(api.getProcessingInputs().choices.ads.decision).toBe('unset');
  expect(allOff()).toBe(true);
});

test('concurrent hydration uses one read and a shared completion', async () => {
  const read = deferred<string | null>();
  storage.getItem.mockReturnValueOnce(read.promise);
  const a = api.hydrateProcessingAccess(), b = api.hydrateProcessingAccess();
  expect(a).toBe(b);
  expect(storage.getItem).toHaveBeenCalledTimes(1);
  read.resolve(null);
  await Promise.all([a, b]);
});

test('Apple evidence and access permissions are neither persisted nor sent as purpose choices', async () => {
  await ready();
  api.setAppleAgeRequirement('required');
  api.verifyTransientAgeEvidence({ source: 'apple', status: 'shared', lowerBound: 14, upperBound: 17 }, true);
  await api.setProcessingChoice('ads', 'granted');
  const persisted = JSON.parse(memory.get(KEY)!);
  expect(Object.keys(persisted).sort()).toEqual(['choices', 'region', 'version']);
  expect(persisted.age).toBeUndefined();
  expect(persisted.appleAgeCheckSatisfied).toBeUndefined();
  expect(api.getProcessingAccess().revenueCat.allowed).toBe(false);
});

test('a newly required Apple check invalidates a previously satisfied check', async () => {
  await ready();
  await grantAll();
  api.setAppleAgeRequirement('required');
  api.verifyTransientAgeEvidence({ source: 'apple', status: 'shared', lowerBound: 14, upperBound: 17 }, true);
  expect(api.getProcessingAccess().ads.allowed).toBe(true);
  api.setAppleAgeRequirement('required');
  expect(allOff()).toBe(true);
  expect(api.getProcessingInputs().verification).toBeNull();
});

test('Apple restriction takes effect immediately without rewriting the user purpose choices', async () => {
  await ready();
  await grantAll();
  api.setAppleAccessRestricted(true);
  expect(allOff()).toBe(true);
  expect(api.getProcessingInputs().choices.ads.decision).toBe('granted');
});

test('purpose notices enable only an explicitly selected notice-and-opt-out requirement', async () => {
  await ready();
  const requirements: Record<'ads' | 'analytics' | 'competition', PurposeRequirement> = {
    ads: 'notice-and-opt-out', analytics: 'express-consent', competition: 'requested-service',
  };
  api.setProcessingRequirements(requirements);
  expect(allOff()).toBe(true);
  api.markProcessingNoticePresented(PROCESSING_NOTICE_VERSION);
  expect(api.getProcessingAccess()).toMatchObject({
    ads: { allowed: true }, revenueCat: { allowed: false }, competition: { allowed: false },
  });
});

test('a failing subscriber cannot prevent other observers seeing a withdrawal', async () => {
  await ready();
  await grantAll();
  api.subscribeProcessingAccess(() => { throw new Error('observer failed'); });
  const observed: boolean[] = [];
  const unsubscribe = api.subscribeProcessingAccess(() => observed.push(api.getProcessingAccess().revenueCat.allowed));
  await api.setProcessingChoice('analytics', 'denied');
  expect(observed).toEqual([false]);
  unsubscribe();
  api.setAppleAccessRestricted(true);
  expect(observed).toEqual([false]);
});

test('editing a returned input copy cannot forge a processing choice', async () => {
  await ready();
  const copy = api.getProcessingInputs();
  copy.choices.ads.decision = 'granted';
  copy.verification!.treatment = 'unspecified';
  copy.requirements.analytics = 'notice-and-opt-out';
  expect(api.getProcessingInputs().choices.ads.decision).toBe('unset');
  expect(api.getProcessingInputs().verification?.treatment).toBe('teen');
  expect(api.getProcessingInputs()).not.toHaveProperty('age');
  expect(allOff()).toBe(true);
});


test('Apple ranges and source are absent from runtime, saved choices and published snapshots after verification', async () => {
  await ready();
  api.setAppleAgeRequirement('required');
  api.verifyTransientAgeEvidence({ source: 'apple', status: 'shared', lowerBound: 16, upperBound: 17 }, true);
  await grantAll();
  for (const value of [api.getProcessingInputs(), api.getProcessingAccess(), JSON.parse(memory.get(KEY)!)]) {
    const serialized = JSON.stringify(value);
    expect(serialized).not.toMatch(/"(?:age|source|lowerBound|upperBound|ageBand|assurance)"/);
  }
  expect(api.getProcessingAccess().ads).toMatchObject({ allowed: true, treatment: 'teen' });
});

test('a region change invalidates verification and rejects late evidence for the previous region', async () => {
  await ready();
  await grantAll();
  const previous = api.getAgeVerificationRevision();
  await api.setPrivacyRegion('ca-quebec');
  expect(api.getProcessingInputs().verification).toBeNull();
  expect(api.verifyTransientAgeEvidence(
    { source: 'apple', status: 'shared', lowerBound: 18, upperBound: null }, true, previous,
  )).toBe(false);
  expect(allOff()).toBe(true);
});

test('a finer jurisdiction change within the same coarse region invalidates verification', async () => {
  await ready();
  await grantAll();
  const previous = api.getAgeVerificationRevision();
  await api.setPrivacyRegion('us');
  expect(api.getAgeVerificationRevision()).not.toBe(previous);
  expect(api.getProcessingInputs().verification).toBeNull();
  expect(allOff()).toBe(true);
});

test('required Apple verification cannot be satisfied by self-declared adult evidence', async () => {
  await ready();
  await grantAll();
  api.setAppleAgeRequirement('required');
  api.verifyTransientAgeEvidence({ source: 'self', status: 'shared', lowerBound: 18, upperBound: null }, true);
  expect(api.getProcessingAccess().ads).toMatchObject({ allowed: false, reason: 'apple-check-required' });
  expect(allOff()).toBe(true);
});

test('unknown region rejects verification rather than retaining raw evidence for later', async () => {
  await api.hydrateProcessingAccess();
  expect(api.verifyTransientAgeEvidence(
    { source: 'apple', status: 'shared', lowerBound: 18, upperBound: null }, true,
  )).toBe(false);
  expect(api.getProcessingInputs().verification).toBeNull();
  await api.setPrivacyRegion('us');
  expect(api.getProcessingInputs().verification).toBeNull();
});


test('hydration whitelists purpose-choice fields and cannot restore an old embedded age profile', async () => {
  const prior = JSON.parse(stored('granted'));
  prior.age = { source: 'apple', lowerBound: 18, upperBound: null };
  prior.choices.ads.age = prior.age;
  memory.set(KEY, JSON.stringify(prior));
  await api.hydrateProcessingAccess();
  expect(JSON.stringify(api.getProcessingInputs())).not.toMatch(/"(?:age|source|lowerBound|upperBound)"/);
  expect(api.getProcessingInputs().verification).toBeNull();
  expect(allOff()).toBe(true);
});

test('removing an Apple access restriction cannot revive evidence collected before restriction', async () => {
  await ready();
  await grantAll();
  api.setAppleAccessRestricted(true);
  api.setAppleAccessRestricted(false);
  expect(api.getProcessingInputs().verification).toBeNull();
  expect(allOff()).toBe(true);
});


test('pending rescission suspends required processing without erasing sanitized age or changing independent refusals', async () => {
  await ready();await grantAll();api.setAppleAgeRequirement('required');
  api.verifyTransientAgeEvidence({source:'apple',status:'shared',lowerBound:18,upperBound:null},true);
  await api.setProcessingChoice('analytics','denied');
  const verified=api.getProcessingInputs().verification;
  api.setAppleRescissionPending(true);expect(allOff()).toBe(true);
  expect(api.getProcessingInputs().verification).toEqual(verified);
  api.setAppleRescissionPending(false);
  expect(api.getProcessingAccess().ads.allowed).toBe(true);expect(api.getProcessingAccess().revenueCat.allowed).toBe(false);
  api.setAppleAccessRestricted(true);api.setAppleRescissionPending(false);
  expect(allOff()).toBe(true);expect(api.getProcessingInputs().verification).toBeNull();
});
