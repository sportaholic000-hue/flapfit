import { createLaunchUpdates } from '../launchUpdates';
import { holdGameplayActivity } from '../gameplayActivity';

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
  const getClient = jest.fn(() => client);
  const updates = createLaunchUpdates(getClient);
  const start = () => { updates.requestCheck(); return updates.start(); };
  return { updates, client, getClient, check, fetch, start };
}

test('normal entry and unrequested start never load the SDK or start network work', async () => {
  const f = fixture();
  expect(f.updates.getSnapshot()).toBe('ready');
  await f.updates.start(); await f.updates.download(); await f.updates.apply();
  expect(f.getClient).not.toHaveBeenCalled();
  expect(f.updates.getSnapshot()).toBe('ready');
});

test('Info request reserves the update screen before networking; Later never downloads or reloads', async () => {
  const f = fixture();
  expect(f.updates.requestCheck()).toBe(true);
  expect(f.updates.getSnapshot()).toBe('requested');
  expect(f.getClient).not.toHaveBeenCalled();
  expect(f.updates.requestCheck()).toBe(false);
  const checking = f.updates.start(); await f.updates.start();
  expect(f.client.checkForUpdateAsync).toHaveBeenCalledTimes(1);
  f.check.resolve({ isAvailable: true }); await checking;
  expect(f.updates.getSnapshot()).toBe('available');
  f.updates.later();
  await f.updates.start(); await f.updates.download(); await f.updates.apply();
  expect(f.updates.getSnapshot()).toBe('ready');
  expect(f.client.checkForUpdateAsync).toHaveBeenCalledTimes(1);
  expect(f.client.fetchUpdateAsync).not.toHaveBeenCalled();
  expect(f.client.reloadAsync).not.toHaveBeenCalled();
});

test('an unresolved explicit check/download cannot leak into gameplay; duplicate taps do not duplicate work', async () => {
  const f = fixture(); const checking = f.start();
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

test('offline check reports failure, then Continue allows an explicit retry', async () => {
  const f = fixture(); const checking = f.start();
  f.check.reject(new Error('offline')); await checking;
  expect(f.updates.getSnapshot()).toBe('failed');
  f.updates.later(); expect(f.updates.getSnapshot()).toBe('ready');
  f.client.checkForUpdateAsync.mockResolvedValueOnce({ isAvailable: false });
  await f.start();
  expect(f.updates.getSnapshot()).toBe('current');
  expect(f.client.checkForUpdateAsync).toHaveBeenCalledTimes(2);
  f.updates.later(); expect(f.updates.getSnapshot()).toBe('ready');
});

test.each(['download', 'reload'])('%s failure permits Continue only after the operation settles', async step => {
  const f = fixture(); const checking = f.start();
  f.check.resolve({ isAvailable: true }); await checking;
  const downloading = f.updates.download();
  if (step === 'download') f.fetch.reject(new Error('download failed'));
  else f.fetch.resolve({ isNew: true });
  await downloading;
  if (step === 'reload') { f.client.reloadAsync.mockRejectedValue(new Error('reload failed')); await f.updates.apply(); }
  expect(f.updates.getSnapshot()).toBe('failed');
  f.updates.later(); expect(f.updates.getSnapshot()).toBe('ready');
});

test('rollback is offered and applied only through the requested update screen', async () => {
  const f = fixture(); const checking = f.start();
  f.check.resolve({ isAvailable: false, isRollBackToEmbedded: true }); await checking;
  expect(f.updates.getSnapshot()).toBe('available');
  const downloading = f.updates.download();
  f.fetch.resolve({ isNew: false, isRollBackToEmbedded: true }); await downloading;
  await f.updates.apply(); expect(f.client.reloadAsync).toHaveBeenCalledTimes(1);
});

test('withdrawn update reports the installed version is current without reloading', async () => {
  const f = fixture(); const checking = f.start();
  f.check.resolve({ isAvailable: true }); await checking;
  const downloading = f.updates.download(); f.fetch.resolve({ isNew: false }); await downloading;
  expect(f.updates.getSnapshot()).toBe('current');
  expect(f.client.reloadAsync).not.toHaveBeenCalled();
});

test('disabled updater and unavailable native module cannot break ordinary entry', async () => {
  const f = fixture(); f.client.isEnabled = false;
  await f.start();
  expect(f.updates.getSnapshot()).toBe('unavailable');
  expect(f.client.checkForUpdateAsync).not.toHaveBeenCalled();
  f.updates.later(); expect(f.updates.getSnapshot()).toBe('ready');
  const absent = createLaunchUpdates(() => { throw new Error('no native module'); });
  expect(absent.getSnapshot()).toBe('ready');
  absent.requestCheck(); await absent.start();
  expect(absent.getSnapshot()).toBe('failed');
  absent.later(); expect(absent.getSnapshot()).toBe('ready');
});

test('camera ownership rejects an update request without touching the workout or SDK', () => {
  const f = fixture(); const release = holdGameplayActivity();
  try {
    expect(f.updates.requestCheck()).toBe(false);
    expect(f.updates.getSnapshot()).toBe('ready');
    expect(f.getClient).not.toHaveBeenCalled();
  } finally { release(); }
  expect(f.updates.requestCheck()).toBe(true);
});

test('camera ownership is rechecked before starting native work', async () => {
  const f = fixture(); f.updates.requestCheck(); const release = holdGameplayActivity();
  try { await f.updates.start(); } finally { release(); }
  expect(f.getClient).not.toHaveBeenCalled();
  expect(f.updates.getSnapshot()).toBe('ready');
});
