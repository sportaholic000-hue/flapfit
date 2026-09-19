import { ENDLESS_UNLOCK_LEVEL, LEVELS } from './levels';

/** Only these modes can mount the launch game, including through old links. */
export function isLaunchGameMode(mode: unknown): boolean {
  return mode === undefined || mode === 'level' || mode === 'daily' || mode === 'endless';
}

/** Match menu unlocks before consent or camera startup, after saved state is loaded. */
export function canEnterLaunchGame(mode: unknown, levelId: unknown, unlockedLevel: number): boolean {
  if (!isLaunchGameMode(mode) || !Number.isInteger(unlockedLevel) || unlockedLevel < 1) return false;
  if (mode === 'endless') return unlockedLevel > ENDLESS_UNLOCK_LEVEL;
  const id = levelId === undefined ? 1 : typeof levelId === 'string' && /^\d+$/.test(levelId) ? Number(levelId) : NaN;
  return Number.isSafeInteger(id) && id >= 1 && id <= LEVELS.length && id <= unlockedLevel;
}
