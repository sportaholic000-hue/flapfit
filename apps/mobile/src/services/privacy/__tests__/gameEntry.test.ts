async function fixture(memory = new Map<string, string>()) {
  jest.resetModules();
  const storage = { getItem: jest.fn(async (key: string) => memory.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => { memory.set(key, value); }) };
  jest.doMock('@react-native-async-storage/async-storage', () => storage);
  const access: typeof import('../processingAccess') = require('../processingAccess');
  const entry: typeof import('../gameEntry') = require('../gameEntry');
  await access.hydrateProcessingAccess();
  access.setAppleAgeRequirement('not-required'); access.setAppleRescissionPending(false);
  access.setLaunchProcessingCountry('CA', true);
  access.verifyLaunchAgeEvidence({ source: 'apple', status: 'shared', lowerBound: 18, upperBound: null }, 'CA', access.getAgeVerificationRevision());
  return { memory, storage, access, entry };
}

test.each([null,'1','broken'])('old first-game marker %s cannot limit repeat play or require a notice',async marker=>{
  let f=await fixture(marker===null?new Map():new Map([['@flapfit/first-game-started-v1',marker]]));
  f.storage.getItem.mockClear();f.storage.setItem.mockClear();
  for(let run=0;run<3;run++)expect(await f.entry.authorizeGameEntry()).toEqual({status:'available'});
  expect(f.storage.getItem).not.toHaveBeenCalled();expect(f.storage.setItem).not.toHaveBeenCalled();
  f=await fixture(f.memory);expect(await f.entry.authorizeGameEntry()).toEqual({status:'available'});
});
test('regional answers, notice, saved-choice read failure and offline country do not prevent play',async()=>{
  const f=await fixture();f.access.applyQuebecResidency('resident');
  expect(await f.entry.authorizeGameEntry()).toEqual({status:'available'});
  f.access.setLaunchProcessingCountry(null,false);
  f.storage.getItem.mockRejectedValue(new Error('disk unavailable'));
  expect(await f.entry.authorizeGameEntry()).toEqual({status:'available'});
  expect(f.access.getProcessingAccess().ads.allowed).toBe(false);
});
test('Apple-restricted access is still checked before each new run',async()=>{
  const f=await fixture();expect(await f.entry.authorizeGameEntry()).toEqual({status:'available'});
  f.access.setAppleAccessRestricted(true);
  expect(await f.entry.authorizeGameEntry()).toEqual({status:'unavailable',reason:'apple'});
});

test.each(['pending', 'error', 'unsupported', 'required'] as const)('a saved under-13 answer is not erased by Apple/country state %s', async requirement => {
  const f = await fixture(new Map([['@flapfit/local-age-answer-v1', JSON.stringify({ version: 1, answer: 'under-13' })]]));
  f.access.setAppleAgeRequirement(requirement); f.access.setLaunchProcessingCountry(null, false);
  expect(await f.entry.authorizeGameEntry()).toEqual({ status: 'unavailable', reason: 'age' });
  expect(f.access.getProcessingInputs().verification).toBeNull();
  expect(f.access.getProcessingAccess().ads.allowed).toBe(false);
});

test('current verified Apple evidence takes precedence over an older local answer', async () => {
  const f = await fixture(new Map([['@flapfit/local-age-answer-v1', JSON.stringify({ version: 1, answer: 'under-13' })]]));
  expect(await f.entry.authorizeGameEntry()).toEqual({ status: 'available' });
});

test('storage completion rechecks Apple authorization established during the read', async () => {
  const f = await fixture(); f.access.clearAgeVerification();
  let complete!: (value: string) => void;
  f.storage.getItem.mockImplementationOnce(() => new Promise<string>(done => { complete = done; }));
  const pending = f.entry.authorizeGameEntry();
  f.access.setAppleAgeRequirement('required');
  f.access.verifyMandatoryAppleAgeEvidence({ source: 'apple', status: 'shared', lowerBound: 18, upperBound: null }, f.access.getAgeVerificationRevision());
  complete(JSON.stringify({ version: 1, answer: 'under-13' }));
  expect(await pending).toEqual({ status: 'available' });
});

test('a local adult answer never satisfies a required Apple check', async () => {
  const f = await fixture(new Map([['@flapfit/local-age-answer-v1', JSON.stringify({ version: 1, answer: '18-plus' })]]));
  f.access.setAppleAgeRequirement('required');
  expect(await f.entry.authorizeGameEntry()).toEqual({ status: 'unanswered', reason: 'age' });
});

test('an explicit saved correction updates the audience check without starting ads', async () => {
  const f = await fixture(new Map([['@flapfit/local-age-answer-v1', JSON.stringify({ version: 1, answer: 'under-13' })]]));
  jest.doMock('react-native', () => ({ Platform: { OS: 'ios', Version: '18.6' } }));
  f.access.setAppleAgeRequirement('unsupported');
  const local: typeof import('../localAgeAnswer') = require('../localAgeAnswer');
  expect(await f.entry.authorizeGameEntry()).toEqual({ status: 'unavailable', reason: 'age' });
  await local.saveLocalAgeAnswer('13-17');
  expect(await f.entry.authorizeGameEntry()).toEqual({ status: 'available' });
  expect(f.access.getProcessingAccess().ads.allowed).toBe(false);
});
