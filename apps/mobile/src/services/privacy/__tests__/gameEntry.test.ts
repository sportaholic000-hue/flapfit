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
