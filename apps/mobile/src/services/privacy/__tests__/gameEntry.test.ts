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
test('one first run; unanswered Close/Back cannot authorize another run or survive as a free route after restart', async () => {
  let f = await fixture();
  const currentEntry = {};
  expect(await f.entry.authorizeGameEntry(false, currentEntry, true)).toEqual({ status: 'trial' });
  expect(await f.entry.authorizeGameEntry(false, currentEntry)).toEqual({ status: 'trial' });
  expect(await f.entry.authorizeGameEntry(false, {})).toEqual({ status: 'unanswered', reason: 'province' });
  f = await fixture(f.memory);
  expect(await f.entry.authorizeGameEntry(false)).toEqual({ status: 'unanswered', reason: 'province' });
  expect(f.access.getProcessingInputs().choices.ads.decision).toBe('unset');
  expect(f.access.getProcessingInputs().launch?.options.quebecResidency).toBeUndefined();
});
test('existing progress cannot be treated as a first installation', async () => {
  const f = await fixture();
  expect(await f.entry.authorizeGameEntry(true)).toEqual({ status: 'unanswered', reason: 'province' });
  expect(f.storage.setItem).not.toHaveBeenCalled();
});
test('answering No without reviewing the notice is not a dismissal bypass', async () => {
  const f = await fixture();
  await f.entry.authorizeGameEntry(false, {}, true);
  f.access.applyQuebecResidency('not-resident');
  expect(await f.entry.authorizeGameEntry(false)).toEqual({ status: 'unanswered', reason: 'notice' });
  f.access.markProcessingNoticePresented(1);
  expect(await f.entry.authorizeGameEntry(false)).toEqual({ status: 'available' });
});
test.each(['ads', 'analytics', 'competition'] as const)('saved %s refusal never becomes the reason to withhold a game', async purpose => {
  const f = await fixture();
  await f.entry.authorizeGameEntry(false, {}, true);
  f.access.applyQuebecResidency('not-resident');
  f.access.markProcessingNoticePresented(1);
  await f.access.setProcessingChoice(purpose, 'denied');
  expect(await f.entry.authorizeGameEntry(false)).toEqual({ status: 'available' });
  expect(f.access.getProcessingInputs().choices[purpose].decision).toBe('denied');
});
test('a known excluded group cannot use the first-run claim to override eligibility', async () => {
  const f = await fixture();
  f.access.applyQuebecResidency('resident');
  expect(await f.entry.authorizeGameEntry(false)).toEqual({ status: 'unavailable', reason: 'quebec' });
  expect(f.storage.setItem).not.toHaveBeenCalled();
});
test('failed and malformed claim reads remain retryable, never first-run defaults', async () => {
  const f = await fixture(new Map([['@flapfit/first-game-started-v1', 'broken']]));
  await expect(f.entry.authorizeGameEntry(false)).rejects.toThrow('could not be read');
  expect(f.storage.setItem).not.toHaveBeenCalled();
  f.memory.set('@flapfit/first-game-started-v1', '1');
  expect(await f.entry.authorizeGameEntry(false)).toEqual({ status: 'unanswered', reason: 'province' });
});
test('failed claim write admits no game; explicit retry can recover', async () => {
  const f = await fixture();
  f.storage.setItem.mockRejectedValueOnce(new Error('disk full'));
  await expect(f.entry.authorizeGameEntry(false, {}, true)).rejects.toThrow('disk full');
  expect(await f.entry.authorizeGameEntry(false, {}, true)).toEqual({ status: 'trial' });
});
test('two concurrent distinct entries receive only one initial trial', async () => {
  const f = await fixture();
  expect(await Promise.all([f.entry.authorizeGameEntry(false, {}, true), f.entry.authorizeGameEntry(false, {}, true)])).toEqual([
    { status: 'trial' }, { status: 'unanswered', reason: 'province' },
  ]);
});

test('camera/audio permission recovery or closing before prepared gameplay does not consume the first run', async () => {
  let f = await fixture();
  expect(await f.entry.authorizeGameEntry(false, {})).toEqual({ status: 'trial' });
  expect(f.storage.setItem).not.toHaveBeenCalled();
  f = await fixture(f.memory);
  expect(await f.entry.authorizeGameEntry(false, {})).toEqual({ status: 'trial' });
  expect(f.storage.setItem).not.toHaveBeenCalled();
  expect(await f.entry.authorizeGameEntry(false, {}, true)).toEqual({ status: 'trial' });
  expect(f.memory.get('@flapfit/first-game-started-v1')).toBe('1');
});
