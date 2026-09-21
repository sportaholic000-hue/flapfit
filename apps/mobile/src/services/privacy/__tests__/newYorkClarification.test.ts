const KEY = '@flapfit/new-york-eligibility-v1';
async function fixture(memory = new Map<string, string>(), failRead = false) {
  jest.resetModules();
  const storage = { getItem: jest.fn(async (key: string) => {
    if (failRead && key === KEY) throw new Error('read unavailable');
    return memory.get(key) ?? null;
  }), setItem: jest.fn(async (key: string, value: string) => { memory.set(key, value); }) };
  jest.doMock('@react-native-async-storage/async-storage', () => storage);
  const access: typeof import('../processingAccess') = require('../processingAccess');
  const regional: typeof import('../newYorkClarification') = require('../newYorkClarification');
  await access.hydrateProcessingAccess();
  access.setAppleAgeRequirement('not-required'); access.setAppleRescissionPending(false);
  access.setLaunchProcessingCountry('US', true);
  access.applyConnecticutResidency('not-resident');
  access.verifyLaunchAgeEvidence({ source: 'apple', status: 'shared', lowerBound: 15, upperBound: 17 }, 'US', access.getAgeVerificationRevision());
  access.markProcessingNoticePresented(1);
  await regional.restoreNewYorkClarification();
  return { memory, storage, access, regional };
}
const settle = async () => { for (let i = 0; i < 30; ++i) await Promise.resolve(); };

test('current No permits independent ads without consent; reporting refusal stays refused', async () => {
  const f = await fixture();
  await f.access.setProcessingChoice('analytics', 'denied');
  await f.access.setProcessingChoice('competition', 'granted');
  expect(f.access.getProcessingAccess().ads.allowed).toBe(false);
  await f.regional.saveNewYorkPresence('not-present');
  expect(f.access.getProcessingInputs().choices.ads.decision).toBe('unset');
  expect(f.access.getProcessingAccess()).toMatchObject({ ads: { allowed: true }, revenueCat: { allowed: false, reason: 'refused' }, competition: { allowed: true } });
  expect(JSON.parse(f.memory.get(KEY)!)).toEqual({version:2,answer:'not-present',protectedHistory:false});
});
test('saved No survives refresh and restart without repeating the question or erasing refusals', async () => {
  let f = await fixture();
  await f.access.setProcessingChoice('analytics', 'denied');
  await f.regional.saveNewYorkPresence('not-present');
  f.access.setLaunchProcessingCountry(null, false);
  f.access.setLaunchProcessingCountry('US', true);
  expect(f.regional.needsNewYorkClarification()).toBe(false);
  expect(f.access.getProcessingAccess().ads.allowed).toBe(true);
  f = await fixture(f.memory);
  expect(f.regional.needsNewYorkClarification()).toBe(false);
  expect(f.access.getProcessingAccess().revenueCat.reason).toBe('refused');
});
test('Yes survives country change and restart; a later No is not an eraser of protected history', async () => {
  let f = await fixture();
  await f.regional.saveNewYorkPresence('present');
  await f.regional.saveNewYorkPresence('not-present');
  expect(f.access.getProcessingAccess().ads.allowed).toBe(false);
  expect(JSON.parse(f.memory.get(KEY)!)).toEqual({ version: 2, answer: 'not-present', protectedHistory: true });
  f.access.setLaunchProcessingCountry('AU', true);
  f.access.verifyLaunchAgeEvidence({ source: 'apple', status: 'shared', lowerBound: 15, upperBound: 17 }, 'AU', f.access.getAgeVerificationRevision());
  expect(f.access.getProcessingAccess().ads.allowed).toBe(false);
  f = await fixture(f.memory);
  expect(f.access.getProcessingInputs().launch?.options.newYorkProtectedHistory).toBe(true);
  expect(f.access.getProcessingAccess().ads.allowed).toBe(false);
});
test.each(['failure', 'malformed'])('unread %s never becomes clean history or gets overwritten by No', async kind => {
  const original = kind === 'failure' ? JSON.stringify({ version: 1, protectedHistory: true }) : '{broken';
  const f = await fixture(new Map([[KEY, original]]), kind === 'failure');
  expect(f.access.getProcessingAccess().ads.allowed).toBe(false);
  await expect(f.regional.saveNewYorkPresence('not-present')).rejects.toThrow('not confirmed');
  expect(f.memory.get(KEY)).toBe(original);
  expect(f.storage.setItem).not.toHaveBeenCalled();
});
test('failed read has a real retry that restores the prior protected history', async () => {
  const f = await fixture(new Map([[KEY, JSON.stringify({ version: 1, protectedHistory: true })]]), true);
  f.storage.getItem.mockImplementation(async key => f.memory.get(key) ?? null);
  await f.regional.restoreNewYorkClarification();
  expect(f.regional.hasNewYorkReadError()).toBe(false);
  expect(f.access.getProcessingInputs().launch?.options.newYorkProtectedHistory).toBe(true);
  expect(f.access.getProcessingAccess().ads.allowed).toBe(false);
});
test('failed Yes immediately closes processing, exposes truthful retry and persists on successful retry', async () => {
  let f = await fixture();
  await f.regional.saveNewYorkPresence('not-present');
  f.storage.setItem.mockRejectedValueOnce(new Error('disk full'));
  const saving = f.regional.saveNewYorkPresence('present');
  expect(f.access.getProcessingAccess().ads.allowed).toBe(false);
  await expect(saving).rejects.toThrow('not confirmed');
  expect(f.regional.newYorkClarificationStatus()).toContain('not confirmed');
  await f.regional.restoreNewYorkClarification();
  expect(f.regional.needsNewYorkClarification()).toBe(true);
  await f.regional.saveNewYorkPresence('present');
  f = await fixture(f.memory);
  expect(f.access.getProcessingAccess().ads.allowed).toBe(false);
});
test('delayed No cannot override a newer Yes or apply to another country', async () => {
  const f = await fixture();
  // A pending history read makes the first No asynchronous without saving a false record.
  let finish!: () => void;
  f.storage.setItem.mockImplementationOnce(async (key, value) => {
    await new Promise<void>(done => { finish = done; }); f.memory.set(key, value);
  });
  const old = f.regional.saveNewYorkPresence('present'); await settle();
  const newer = f.regional.saveNewYorkPresence('not-present');
  f.access.setLaunchProcessingCountry('CA', true);
  finish(); await Promise.all([old, newer]);
  expect(f.access.getProcessingInputs().launch?.options.newYorkPresence).toBeUndefined();
  expect(f.access.getProcessingInputs().launch?.options.newYorkProtectedHistory).toBe(true);
});
test('adults and a confirmed CT minor do not get an unnecessary NY question', async () => {
  const f = await fixture();
  f.access.applyConnecticutResidency('resident');
  expect(f.regional.hasNewYorkClarificationControl()).toBe(false);
  f.access.applyConnecticutResidency('not-resident');
  f.access.verifyLaunchAgeEvidence({ source: 'apple', status: 'shared', lowerBound: 18, upperBound: null }, 'US', f.access.getAgeVerificationRevision());
  expect(f.regional.hasNewYorkClarificationControl()).toBe(false);
});

test('legacy Yes migrates without asking again and never restricts gameplay',async()=>{
  const f=await fixture(new Map([[KEY,JSON.stringify({version:1,protectedHistory:true})]]));
  expect(f.regional.hasSavedNewYorkAnswer()).toBe(true);
  expect(f.regional.needsNewYorkClarification()).toBe(false);
  const entry:typeof import('../gameEntry')=require('../gameEntry');
  expect(await entry.authorizeGameEntry()).toEqual({status:'available'});
  expect(f.access.getProcessingAccess().ads.allowed).toBe(false);
});
test('failed No save cannot enable ads or falsely suppress the unanswered question',async()=>{
  const f=await fixture();f.storage.setItem.mockRejectedValueOnce(new Error('disk full'));
  await expect(f.regional.saveNewYorkPresence('not-present')).rejects.toThrow('not confirmed');
  expect(f.regional.hasSavedNewYorkAnswer()).toBe(false);
  expect(f.regional.needsNewYorkClarification()).toBe(true);
  expect(f.access.getProcessingAccess().ads.allowed).toBe(false);
  await f.regional.saveNewYorkPresence('not-present');
  expect(f.regional.needsNewYorkClarification()).toBe(false);
});
