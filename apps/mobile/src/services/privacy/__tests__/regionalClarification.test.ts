const settle = async () => { for (let i=0;i<30;i++) await Promise.resolve(); };
async function fixture(memory = new Map<string,string>(), country: 'US' | 'CA' | 'AU' | 'MX' = 'US', adult = false) {
  jest.resetModules();
  const storage = { getItem: jest.fn(async (key: string) => memory.get(key) ?? null),
    setItem: jest.fn(async (key: string,value: string) => { memory.set(key,value); }) };
  jest.doMock('@react-native-async-storage/async-storage', () => storage);
  const access: typeof import('../processingAccess') = require('../processingAccess');
  const regional: typeof import('../regionalClarification') = require('../regionalClarification');
  await access.hydrateProcessingAccess();
  access.setAppleAgeRequirement('not-required'); access.setAppleRescissionPending(false);
  access.setLaunchProcessingCountry(country,true);
  access.verifyLaunchAgeEvidence({ source: 'apple',status: 'shared',lowerBound: adult ? 18 : 14,upperBound: adult ? null : 17 },country,access.getAgeVerificationRevision());
  access.markProcessingNoticePresented(1);
  await regional.restoreRegionalClarification();
  return { access, regional, storage, memory };
}
test('US teen clarification resolves only Connecticut uncertainty, never NY purpose consent', async () => {
  const f=await fixture();
  expect(f.regional.needsConnecticutClarification()).toBe(true);
  expect(f.access.getProcessingAccess().ads.allowed).toBe(false);
  await f.regional.saveConnecticutResidency('not-resident');
  expect(f.access.getProcessingInputs().launch?.plan?.separateExpressChoiceRequired).toEqual({ads:true,analytics:true});
  expect(f.access.getProcessingAccess()).toMatchObject({ads:{allowed:false,reason:'permission-needed'},revenueCat:{allowed:false,reason:'permission-needed'}});
  await f.access.setProcessingChoice('ads','granted');
  await f.access.setProcessingChoice('analytics','denied');
  await f.access.setProcessingChoice('competition','granted');
  expect(f.access.getProcessingAccess()).toMatchObject({ads:{allowed:true},revenueCat:{allowed:false,reason:'refused'},competition:{allowed:true}});
});
test.each(['resident','unknown'] as const)('%s cannot override Connecticut necessity with express grants', async answer => {
  const f=await fixture();
  await f.regional.saveConnecticutResidency(answer);
  for (const purpose of ['ads','analytics','competition'] as const) await f.access.setProcessingChoice(purpose,'granted');
  expect(f.access.getProcessingAccess()).toMatchObject({ads:{allowed:false},revenueCat:{allowed:false},competition:{allowed:true}});
  expect(f.regional.needsConnecticutClarification()).toBe(false);
});
test.each(['CA','AU','MX'] as const)('%s does not receive an unnecessary Connecticut question or accept that answer', async country => {
  const f=await fixture(new Map(),country);
  expect(f.regional.hasConnecticutClarificationControl()).toBe(false);
  await expect(f.regional.saveConnecticutResidency('not-resident')).rejects.toThrow('eligibility changed');
  expect(f.storage.setItem).not.toHaveBeenCalled();
});
test('adults do not receive the teen clarification', async () => {
  const f=await fixture(new Map(),'US',true);
  expect(f.regional.hasConnecticutClarificationControl()).toBe(false);
});
test('failed permissive save grants nothing and offers an honest retry', async () => {
  const f=await fixture();
  for (const purpose of ['ads','analytics'] as const) await f.access.setProcessingChoice(purpose,'granted');
  f.storage.setItem.mockRejectedValueOnce(new Error('disk full'));
  await expect(f.regional.saveConnecticutResidency('not-resident')).rejects.toThrow('could not be saved');
  expect(f.access.getProcessingAccess()).toMatchObject({ads:{allowed:false},revenueCat:{allowed:false}});
  expect(f.regional.connecticutClarificationStatus()).toContain('not confirmed');
  await f.regional.saveConnecticutResidency('not-resident');
  expect(f.access.getProcessingAccess()).toMatchObject({ads:{allowed:true},revenueCat:{allowed:true}});
});
test('a failed restrictive answer stays restricted when other preparation rereads saved evidence', async () => {
  const f=await fixture();
  await f.regional.saveConnecticutResidency('not-resident');
  await f.access.setProcessingChoice('ads','granted');
  expect(f.access.getProcessingAccess().ads.allowed).toBe(true);
  f.storage.setItem.mockRejectedValueOnce(new Error('disk full'));
  const saving=f.regional.saveConnecticutResidency('resident');
  expect(f.access.getProcessingAccess().ads.allowed).toBe(false);
  await expect(saving).rejects.toThrow('could not be saved');
  await f.regional.restoreRegionalClarification();
  expect(f.access.getProcessingAccess().ads.allowed).toBe(false);
  expect(f.regional.connecticutClarificationStatus()).toContain('not confirmed');
});
test('restart restores the residency fact but preserves reporting refusal independently', async () => {
  let f=await fixture();
  await f.regional.saveConnecticutResidency('not-resident');
  await f.access.setProcessingChoice('ads','granted');
  await f.access.setProcessingChoice('analytics','denied');
  const memory=f.memory;
  expect(memory.get('@flapfit/connecticut-residency-v1')).toBe('{"version":1,"answer":"not-resident"}');
  f=await fixture(memory);
  expect(f.access.getProcessingAccess()).toMatchObject({ads:{allowed:true},revenueCat:{allowed:false,reason:'refused'}});
  expect(f.regional.needsConnecticutClarification()).toBe(false);
  expect([...memory.values()].join('')).not.toMatch(/lowerBound|upperBound|birthday|latitude|longitude/);
});
test('an unrelated regional write failure does not erase the saved reporting refusal', async () => {
  let f=await fixture();
  await f.regional.saveConnecticutResidency('not-resident');
  await f.access.setProcessingChoice('ads','granted');
  await f.access.setProcessingChoice('analytics','denied');
  f.storage.setItem.mockRejectedValueOnce(new Error('disk full'));
  await expect(f.regional.saveConnecticutResidency('not-resident')).rejects.toThrow();
  f=await fixture(f.memory);
  expect(f.access.getProcessingAccess()).toMatchObject({ads:{allowed:true},revenueCat:{allowed:false,reason:'refused'}});
});
test('a stale save cannot apply a US permission to changed country or new age evidence', async () => {
  const f=await fixture(); let finish!: () => void;
  f.storage.setItem.mockImplementationOnce(async () => new Promise<void>(done => { finish=done; }));
  const saving=f.regional.saveConnecticutResidency('not-resident'); await settle();
  expect(finish).toBeDefined();
  f.access.setLaunchProcessingCountry('CA',true); finish(); await saving;
  expect(f.access.getProcessingInputs().launch).toMatchObject({country:'CA',plan:null,options:{}});
  expect(f.access.getProcessingAccess().ads.allowed).toBe(false);
});
test('declining both purposes suppresses an unnecessary result clarification', async () => {
  const f=await fixture();
  await f.access.setProcessingChoice('ads','denied'); await f.access.setProcessingChoice('analytics','denied');
  expect(f.regional.needsConnecticutClarification()).toBe(false);
  expect(f.regional.hasConnecticutClarificationControl()).toBe(true);
});
