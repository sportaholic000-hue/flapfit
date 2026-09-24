import { createLaunchUpdates } from '../launchUpdates';

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
function fixture() {
  const check = deferred<{ isAvailable: boolean; isRollBackToEmbedded?: boolean }>();
  const fetch = deferred<{ isNew: boolean; isRollBackToEmbedded?: boolean }>();
  const client = {
    isEnabled: true,
    checkForUpdateAsync: jest.fn(() => check.promise),
    fetchUpdateAsync: jest.fn(() => fetch.promise),
    reloadAsync: jest.fn().mockResolvedValue(undefined),
  };
  const updates = createLaunchUpdates(() => client);
  return { updates, client, check, fetch };
}

test('one check per launch, no downloads or reloads for Later, no late checks after entering the app', async () => {
  const f = fixture();
  const checking = f.updates.start();
  await f.updates.start();
  expect(f.updates.getSnapshot()).toBe('checking');
  expect(f.client.checkForUpdateAsync).toHaveBeenCalledTimes(1);
  f.check.resolve({ isAvailable: true }); await checking;
  expect(f.updates.getSnapshot()).toBe('available');
  expect(f.client.fetchUpdateAsync).not.toHaveBeenCalled();
  f.updates.later();
  await f.updates.start(); await f.updates.download(); await f.updates.apply();
  expect(f.updates.getSnapshot()).toBe('ready');
  expect(f.client.checkForUpdateAsync).toHaveBeenCalledTimes(1);
  expect(f.client.fetchUpdateAsync).not.toHaveBeenCalled();
  expect(f.client.reloadAsync).not.toHaveBeenCalled();
});

test('cannot enter the router with an unresolved check or download; duplicate taps do not duplicate work', async () => {
  const f = fixture(); const checking = f.updates.start();
  f.updates.later(); expect(f.updates.getSnapshot()).toBe('checking');
  f.check.resolve({ isAvailable: true }); await checking;
  const downloading = f.updates.download(); await f.updates.download();
  f.updates.later(); expect(f.updates.getSnapshot()).toBe('downloading');
  expect(f.client.fetchUpdateAsync).toHaveBeenCalledTimes(1);
  f.fetch.resolve({ isNew: true }); await downloading;
  expect(f.updates.getSnapshot()).toBe('downloaded');
  expect(f.client.reloadAsync).not.toHaveBeenCalled();
  await f.updates.apply(); await f.updates.apply();
  expect(f.client.reloadAsync).toHaveBeenCalledTimes(1);
  expect(f.updates.getSnapshot()).toBe('applying');
});

test('offline check failure and no available update both leave the installed app usable', async () => {
  const offline = fixture(); const failed = offline.updates.start();
  offline.check.reject(new Error('offline')); await failed;
  expect(offline.updates.getSnapshot()).toBe('ready');
  const current = fixture(); const checking = current.updates.start();
  current.check.resolve({ isAvailable: false }); await checking;
  expect(current.updates.getSnapshot()).toBe('ready');
});

test.each(['download', 'reload'])('%s failure permits Continue only after the operation settles', async step => {
  const f = fixture(); const checking = f.updates.start();
  f.check.resolve({ isAvailable: true }); await checking;
  const downloading = f.updates.download();
  if (step === 'download') f.fetch.reject(new Error('download failed'));
  else f.fetch.resolve({ isNew: true });
  await downloading;
  if (step === 'reload') { f.client.reloadAsync.mockRejectedValue(new Error('reload failed')); await f.updates.apply(); }
  expect(f.updates.getSnapshot()).toBe('failed');
  f.updates.later(); expect(f.updates.getSnapshot()).toBe('ready');
});

test('rollback to the embedded version is offered and applied through the same launch gate', async () => {
  const f = fixture(); const checking = f.updates.start();
  f.check.resolve({ isAvailable: false, isRollBackToEmbedded: true }); await checking;
  expect(f.updates.getSnapshot()).toBe('available');
  const downloading = f.updates.download();
  f.fetch.resolve({ isNew: false, isRollBackToEmbedded: true }); await downloading;
  await f.updates.apply(); expect(f.client.reloadAsync).toHaveBeenCalledTimes(1);
});

test('withdrawn update opens the installed version without a pointless reload', async () => {
  const f = fixture(); const checking = f.updates.start();
  f.check.resolve({ isAvailable: true }); await checking;
  const downloading = f.updates.download(); f.fetch.resolve({ isNew: false }); await downloading;
  expect(f.updates.getSnapshot()).toBe('ready');
  expect(f.client.reloadAsync).not.toHaveBeenCalled();
});

test('disabled updater/dev client needs no network; unavailable native module does not break launch', async () => {
  const client = { isEnabled: false, checkForUpdateAsync: jest.fn(), fetchUpdateAsync: jest.fn(), reloadAsync: jest.fn() };
  const disabled = createLaunchUpdates(() => client); await disabled.start();
  expect(disabled.getSnapshot()).toBe('ready'); expect(client.checkForUpdateAsync).not.toHaveBeenCalled();
  const absent = createLaunchUpdates(() => { throw new Error('no native module'); }); await absent.start();
  expect(absent.getSnapshot()).toBe('ready');
});
