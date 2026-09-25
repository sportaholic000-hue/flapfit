import { LEVELS } from './levels';

export const FINAL_LEVEL = LEVELS[LEVELS.length - 1];
export const LEVEL_MASTERY_SCORE = 60;

type LevelSession = { mode: string; levelId: number | null; score: number };

export function isChampionshipRun(mode: string, levelId: number | null, score: number): boolean {
  return (
    mode === 'level' &&
    levelId === FINAL_LEVEL.id &&
    Number.isFinite(score) &&
    score >= FINAL_LEVEL.targetScore
  );
}

export function completedLevelCount(unlockedLevel: number, championUnlocked: boolean): number {
  return championUnlocked
    ? LEVELS.length
    : Math.max(0, Math.min(LEVELS.length - 1, unlockedLevel - 1));
}

export function bestStandardLevelScore(bestScores: Record<string, number>): number {
  return Math.max(0, ...LEVELS.map((level) => bestScores[String(level.id)] ?? 0));
}

export function masteredLevelCount(bestScores: Record<string, number>): number {
  return LEVELS.filter((level) => (bestScores[String(level.id)] ?? 0) >= LEVEL_MASTERY_SCORE)
    .length;
}

/** Recover standard runs without treating the old mixed Daily/level table as all standard. */
export function recoverStandardLevelBestScores(
  saved: Record<string, number> | undefined,
  legacyBestScores: Record<string, number>,
  sessions: LevelSession[]
): Record<string, number> {
  const recovered: Record<string, number> = {};
  const keep = (id: number, score: number) => {
    if (!LEVELS.some((level) => level.id === id) || !Number.isFinite(score) || score < 0) return;
    recovered[String(id)] = Math.max(recovered[String(id)] ?? 0, score);
  };
  for (const [id, score] of Object.entries(saved ?? {})) keep(Number(id), score);
  // The shipped Daily generator only selects levels 1–5. Higher legacy bests
  // are unambiguously standard runs, even after the 300-session history rolls over.
  for (const level of LEVELS) {
    if (saved === undefined && level.id > 5)
      keep(level.id, legacyBestScores[String(level.id)] ?? 0);
  }
  for (const session of sessions) {
    if (session.mode === 'level' && session.levelId !== null) keep(session.levelId, session.score);
  }
  return recovered;
}
