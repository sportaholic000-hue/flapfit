import { Directory, File, Paths } from 'expo-file-system';
import { AppState } from 'react-native';

// Exact namespace used by the existing recorder, including recordings from older versions.
const RECORDING_NAME = /^flap-fit-\d{10,17}-[a-z0-9_-]{1,24}-[a-z0-9]{0,7}\.[a-z0-9]{1,8}$/i;
const activeFiles = new Set<string>();
export function cleanupOrphanedGameplayRecordings(): { deleted: number; failed: number } {
  const result = { deleted: 0, failed: 0 };
  try {
    for (const entry of new Directory(Paths.cache).list()) {
      if (!(entry instanceof File) || !RECORDING_NAME.test(entry.name) || activeFiles.has(entry.uri)) continue;
      try { entry.delete(); ++result.deleted; } catch { ++result.failed; }
    }
  } catch { ++result.failed; }
  return result;
}
export function createGameplayRecordingFile(sessionId: string, extension: string): File {
  cleanupOrphanedGameplayRecordings();
  const safeSessionId = sessionId.replace(/[^a-z0-9_-]/gi, '').slice(0, 24) || 'run-' + Date.now();
  const file = new File(Paths.cache,
    'flap-fit-' + Date.now() + '-' + safeSessionId + '-' + Math.random().toString(36).slice(2, 9) + '.' + extension);
  // Protect in-progress and complete/unshared videos through foreground and root remounts.
  activeFiles.add(file.uri);
  return file;
}
export function discardGameplayRecordingFile(file: File | null): void {
  if (!file) return;
  try { if (file.exists) file.delete(); } catch {
    // Keep it on device for the next bounded attempt; never claim deletion succeeded.
    console.warn('Temporary gameplay video cleanup will retry.');
  } finally { activeFiles.delete(file.uri); }
}
export function startRecordingCacheCleanup(): () => void {
  cleanupOrphanedGameplayRecordings();
  const subscription = AppState.addEventListener('change', state => {
    if (state === 'active') cleanupOrphanedGameplayRecordings();
  });
  return () => subscription.remove();
}
