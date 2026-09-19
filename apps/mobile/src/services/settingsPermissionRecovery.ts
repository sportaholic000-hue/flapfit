export type SettingsPermission = 'camera' | 'microphone';

/** Refresh only a permission whose Settings screen was opened; ordinary resumes do nothing. */
export function createSettingsPermissionRecovery(refresh: (permission: SettingsPermission) => Promise<unknown>) {
  let pending: SettingsPermission | null = null;
  return {
    open: async (permission: SettingsPermission, openSettings: () => Promise<unknown>) => {
      pending = permission;
      try { await openSettings(); } catch (error) { pending = null; throw error; }
    },
    onActive: async () => {
      const permission = pending;
      pending = null;
      if (!permission) return;
      try { await refresh(permission); } catch { pending = permission; }
    },
  };
}
