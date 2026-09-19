import { createSettingsPermissionRecovery } from '../settingsPermissionRecovery';

test('ordinary foreground events do not reread permissions or restart a run', async () => {
  const refresh = jest.fn(); const recovery = createSettingsPermissionRecovery(refresh);
  await recovery.onActive(); await recovery.onActive(); expect(refresh).not.toHaveBeenCalled();
});
test.each(['camera', 'microphone'] as const)('returning from %s settings rereads only that permission once', async (permission) => {
  const refresh = jest.fn().mockResolvedValue({ granted: true });
  const recovery = createSettingsPermissionRecovery(refresh);
  await recovery.open(permission, jest.fn().mockResolvedValue(undefined));
  expect(refresh).not.toHaveBeenCalled();
  await Promise.all([recovery.onActive(), recovery.onActive()]);
  expect(refresh).toHaveBeenCalledTimes(1); expect(refresh).toHaveBeenCalledWith(permission);
});
test('failed Settings navigation does not leave a pending refresh', async () => {
  const refresh = jest.fn(); const recovery = createSettingsPermissionRecovery(refresh);
  await expect(recovery.open('camera', () => Promise.reject(new Error('unavailable')))).rejects.toThrow();
  await recovery.onActive(); expect(refresh).not.toHaveBeenCalled();
});
test('a failed permission refresh can retry on the next return', async () => {
  const refresh = jest.fn().mockRejectedValueOnce(new Error('interrupted')).mockResolvedValue({ granted: true });
  const recovery = createSettingsPermissionRecovery(refresh);
  await recovery.open('camera', () => Promise.resolve());
  await recovery.onActive(); await recovery.onActive(); expect(refresh).toHaveBeenCalledTimes(2);
});
