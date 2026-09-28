const KEY = '@flapfit/local-age-answer-v1';
const flush = async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); };
async function fixture(memory = new Map<string, string>(), country: 'US' | 'CA' | 'AU' | 'MX' = 'US') {
  jest.resetModules();
  const storage = {
    getItem: jest.fn(async (key: string) => memory.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => { memory.set(key, value); }),
  };
  jest.doMock('@react-native-async-storage/async-storage', () => storage);
  jest.doMock('react-native', () => ({ Platform: { OS: 'ios', Version: '18.0' } }));
  const access: typeof import('../processingAccess') = require('../processingAccess');
  const local: typeof import('../localAgeAnswer') = require('../localAgeAnswer');
  await access.hydrateProcessingAccess();
  access.setAppleAgeRequirement('unsupported');
  access.setLaunchProcessingCountry(country, true);
  return { access, local, memory, storage };
}

test('missing answer grants nothing, while a saved adult answer is local evidence and never an Apple check', async () => {
  let f = await fixture();
  await f.local.restoreLocalAgeAnswer();
  expect(f.local.needsLocalAgeAnswer()).toBe(true);
  expect(f.access.getProcessingAccess().ads.allowed).toBe(false);
  expect(f.memory.has(KEY)).toBe(false);
  await f.local.saveLocalAgeAnswer('18-plus');
  expect(f.access.getProcessingInputs().verification).toMatchObject({ mandatoryCheckSatisfied: false, localCheckSatisfied: true });
  expect(f.access.getProcessingAccess().ads.reason).toBe('notice-needed');
  f.access.markProcessingNoticePresented(1);
  expect(f.access.getProcessingAccess().ads.allowed).toBe(true);
  expect(f.access.getProcessingInputs().choices.ads.decision).toBe('unset');
  f = await fixture(f.memory);
  await f.local.restoreLocalAgeAnswer();
  expect(f.local.needsLocalAgeAnswer()).toBe(false);
  expect(f.access.getProcessingInputs().verification?.mandatoryCheckSatisfied).toBe(false);
  expect(JSON.stringify(f.access.getProcessingInputs())).not.toMatch(/lowerBound|upperBound|18-plus/);
});

test.each(['pending', 'error', 'required', 'not-required'] as const)('local answer cannot override Apple status %s or an available API', async requirement => {
  const f = await fixture(new Map([[KEY, JSON.stringify({ version: 1, answer: '18-plus' })]]));
  f.access.setAppleAgeRequirement(requirement);
  await f.local.restoreLocalAgeAnswer();
  expect(f.local.hasLocalAgeControl()).toBe(false);
  await expect(f.local.saveLocalAgeAnswer('18-plus')).rejects.toThrow();
  expect(f.access.verifyLocalLaunchAgeEvidence({ source: 'self', status: 'shared', lowerBound: 18, upperBound: null }, 'US', f.access.getAgeVerificationRevision())).toBe(false);
  expect(f.access.getProcessingAccess().ads.allowed).toBe(false);
  expect(f.storage.setItem).not.toHaveBeenCalled();
});

test('Apple access restriction and lost country close a previously allowed local route', async () => {
  const f = await fixture(); await f.local.saveLocalAgeAnswer('18-plus');
  f.access.markProcessingNoticePresented(1);
  f.access.setLaunchProcessingCountry(null, false);
  expect(f.access.getProcessingAccess().ads.allowed).toBe(false);
  expect(f.local.hasLocalAgeControl()).toBe(false);
  f.access.setLaunchProcessingCountry('US', true);
  f.access.setAppleAccessRestricted(true);
  await f.local.restoreLocalAgeAnswer();
  expect(f.access.getProcessingAccess().ads.allowed).toBe(false);
  expect(f.local.hasLocalAgeControl()).toBe(false);
});

test('web cannot supply a native local age answer', async () => {
  const f = await fixture();
  const { Platform } = require('react-native'); Platform.OS = 'web';
  expect(f.local.hasLocalAgeControl()).toBe(false);
  await expect(f.local.saveLocalAgeAnswer('18-plus')).rejects.toThrow();
  expect(f.storage.setItem).not.toHaveBeenCalled();
});

test.each(['invalid', '', JSON.stringify({ version: 1, answer: 'adult' })])('unreadable record %j is preserved and cannot be overwritten by another answer', async raw => {
  const f = await fixture(new Map([[KEY, raw]]));
  await f.local.restoreLocalAgeAnswer();
  expect(f.local.hasLocalAgeReadError()).toBe(true);
  await expect(f.local.saveLocalAgeAnswer('18-plus')).rejects.toThrow();
  expect(f.storage.setItem).not.toHaveBeenCalled();
  expect(f.memory.get(KEY)).toBe(raw);
  expect(f.access.getProcessingAccess().ads.allowed).toBe(false);
});

test('a failed read retries the real saved minor answer instead of supplying an adult default', async () => {
  const f = await fixture(new Map([[KEY, JSON.stringify({ version: 1, answer: 'under-13' })]]));
  f.storage.getItem.mockRejectedValueOnce(new Error('read failed'));
  await f.local.restoreLocalAgeAnswer();
  expect(f.local.hasLocalAgeReadError()).toBe(true);
  await f.local.restoreLocalAgeAnswer();
  expect(f.local.hasLocalAgeReadError()).toBe(false);
  expect(f.access.getProcessingAccess().ads.reason).toBe('outside-audience');
});

test('failed age correction closes old adult access and retains truthful retry; success survives restart', async () => {
  let f = await fixture(); await f.local.saveLocalAgeAnswer('18-plus'); f.access.markProcessingNoticePresented(1);
  f.storage.setItem.mockRejectedValueOnce(new Error('disk full'));
  await expect(f.local.saveLocalAgeAnswer('under-13')).rejects.toThrow('not confirmed');
  await f.local.restoreLocalAgeAnswer();
  expect(f.access.getProcessingAccess().ads.allowed).toBe(false);
  expect(f.local.localAgeAnswerStatus()).toContain('save not confirmed');
  expect(JSON.parse(f.memory.get(KEY)!).answer).toBe('18-plus'); // no false durability claim
  await f.local.saveLocalAgeAnswer('under-13');
  expect(f.local.localAgeAnswerStatus()).toContain('Under 13');
  f = await fixture(f.memory); await f.local.restoreLocalAgeAnswer();
  expect(f.access.getProcessingAccess().ads.reason).toBe('outside-audience');
});

test('late adult save cannot overwrite a newer minor answer or bypass a new mandatory Apple check', async () => {
  const f = await fixture(); await f.local.restoreLocalAgeAnswer();
  let finish!: () => void;
  f.storage.setItem.mockImplementationOnce((key, value) => new Promise<void>(resolve => { finish = () => { f.memory.set(key, value); resolve(); }; }));
  const adult = f.local.saveLocalAgeAnswer('18-plus'); await flush();
  const minor = f.local.saveLocalAgeAnswer('under-13'); await flush();
  expect(f.access.getProcessingAccess().ads.allowed).toBe(false);
  finish(); await Promise.all([adult, minor]);
  expect(JSON.parse(f.memory.get(KEY)!).answer).toBe('under-13');
  expect(f.access.getProcessingAccess().ads.reason).toBe('outside-audience');
  f.storage.setItem.mockImplementationOnce((key, value) => new Promise<void>(resolve => { finish = () => { f.memory.set(key, value); resolve(); }; }));
  const changed = f.local.saveLocalAgeAnswer('18-plus'); await flush();
  f.access.setAppleAgeRequirement('required'); finish(); await changed;
  expect(f.access.getProcessingAccess().ads.reason).toBe('apple-check-required');
  expect(f.access.getProcessingInputs().verification).toBeNull();
});

test('local answer preserves advertising/reporting refusals and competition choice through restart', async () => {
  let f = await fixture();
  await f.access.setProcessingChoice('ads', 'denied');
  await f.access.setProcessingChoice('analytics', 'denied');
  await f.access.setProcessingChoice('competition', 'granted');
  const before = f.memory.get('@flapfit/processing-choices-v1');
  await f.local.saveLocalAgeAnswer('18-plus');
  expect(f.memory.get('@flapfit/processing-choices-v1')).toBe(before);
  expect(f.access.getProcessingAccess()).toMatchObject({ ads: { reason: 'refused' }, revenueCat: { reason: 'refused' }, competition: { allowed: true } });
  f = await fixture(f.memory); await f.local.restoreLocalAgeAnswer();
  expect(f.access.getProcessingAccess()).toMatchObject({ ads: { reason: 'refused' }, revenueCat: { reason: 'refused' }, competition: { allowed: true } });
});

test.each([
  ['CA', ['Under 13', '13', '14–17', '18 or older']],
  ['AU', ['Under 13', '13–14', '15–17', '18 or older']],
  ['US', ['Under 13', '13–17', '18 or older']],
  ['MX', ['Under 13', '13–17', '18 or older']],
] as const)('%s asks only the age distinctions used by that country policy', async (country, labels) => {
  const f = await fixture(undefined, country);
  expect(f.local.localAgeOptions().map(option => option.label)).toEqual(labels);
});

test('a failed correction cannot erase the saved under-13 answer discovered by an overlapping game-entry read', async () => {
  const f = await fixture(new Map([[KEY, JSON.stringify({ version: 1, answer: 'under-13' })]]));
  let finishRead!: (value: string) => void;
  f.storage.getItem.mockImplementationOnce(() => new Promise<string>(done => { finishRead = done; }));
  f.storage.setItem.mockRejectedValueOnce(new Error('disk full'));
  const reading = f.local.hasSavedUnder13Answer();
  const saving = f.local.saveLocalAgeAnswer('18-plus');
  const failedSave = expect(saving).rejects.toThrow('not confirmed');
  await flush(); finishRead(JSON.stringify({ version: 1, answer: 'under-13' }));
  await reading; await failedSave;
  expect(await f.local.hasSavedUnder13Answer()).toBe(true);
  expect(JSON.parse(f.memory.get(KEY)!).answer).toBe('under-13');
});


test('Android uses the local age route without claiming Apple verification', async () => {
  const f = await fixture();
  const { Platform } = require('react-native'); Platform.OS = 'android';
  expect(f.local.needsLocalAgeAnswer()).toBe(true);
  expect(f.access.getProcessingAccess().ads.allowed).toBe(false);
  await f.local.saveLocalAgeAnswer('18-plus');
  expect(f.access.getProcessingInputs().verification).toMatchObject({ localCheckSatisfied: true, mandatoryCheckSatisfied: false });
  expect(f.access.getProcessingAccess().ads.allowed).toBe(false);
  f.access.markProcessingNoticePresented(1);
  expect(f.access.getProcessingAccess().ads.allowed).toBe(true);
  await f.local.saveLocalAgeAnswer('under-13');
  expect(f.access.getProcessingAccess().ads.allowed).toBe(false);
  expect(await f.local.hasSavedUnder13Answer()).toBe(true);
});
