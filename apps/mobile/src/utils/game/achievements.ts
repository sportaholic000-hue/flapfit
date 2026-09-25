import { ENDLESS_UNLOCK_LEVEL, LEVELS } from './levels';
import { bestStandardLevelScore, completedLevelCount, LEVEL_MASTERY_SCORE, masteredLevelCount } from './levelAchievements';

export type ExerciseKey =
  | 'pushups'
  | 'squats'
  | 'pullups'
  | 'lateralraise'
  | 'biceps'
  | 'shoulderpress';

export type AchievementCategory = 'global' | ExerciseKey;

export type StatsSnapshot = {
  tutStreak: number;
  bestSingleScore: number;
  unlockedLevel: number;
  sessionsCount: number;
  dailiesCompleted: number;
  totalTutSeconds: number;
  standardLevelBestScores: Record<string, number>;
  championUnlocked: boolean;
  exerciseTutSeconds: Record<string, number>;
};

export type AchievementDef = {
  id: string;
  title: string;
  desc: string;
  emoji: string;
  icon?: 'endless' | 'max-level' | 'ultimate' | 'impossible';
  goal: number;
  category: AchievementCategory;
  progress: (s: StatsSnapshot) => number;
};

function totalTutMins(s: StatsSnapshot) {
  return Math.floor(s.totalTutSeconds / 60);
}

function exTutMins(ex: string) {
  return (s: StatsSnapshot) => Math.floor((s.exerciseTutSeconds[ex] ?? 0) / 60);
}

function makeExerciseAchievements(
  ex: ExerciseKey,
  label: string,
  emojis: [string, string, string, string, string, string]
): AchievementDef[] {
  const milestones: [number, string, string][] = [
    [5, 'Warming Up', emojis[0]],
    [15, 'Building Heat', emojis[1]],
    [30, 'Half Hour', emojis[2]],
    [60, 'The Hour', emojis[3]],
    [120, 'Two Hour Club', emojis[4]],
    [300, 'Iron ' + label, emojis[5]],
  ];
  return milestones.map(([goal, title, emoji]) => ({
    id: `${ex}-tut-${goal}`,
    title,
    desc: `${goal} min of ${label} training time`,
    emoji,
    goal,
    category: ex,
    progress: exTutMins(ex),
  }));
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // ─── Global ─────────────────────────────────────────────────────────────
  {
    id: 'first-flight',
    title: 'First Flight',
    desc: 'Complete your first run',
    emoji: '🐣',
    goal: 1,
    category: 'global',
    progress: (s) => s.sessionsCount,
  },
  // Overall TUT milestones
  {
    id: 'tut-2',
    title: 'First Burn',
    desc: 'Fly for 2 min total',
    emoji: '🔥',
    goal: 2,
    category: 'global',
    progress: totalTutMins,
  },
  {
    id: 'tut-10',
    title: 'Heating Up',
    desc: 'Fly for 10 min total',
    emoji: '🌡️',
    goal: 10,
    category: 'global',
    progress: totalTutMins,
  },
  {
    id: 'tut-30',
    title: 'Under Tension',
    desc: 'Fly for 30 min total',
    emoji: '💪',
    goal: 30,
    category: 'global',
    progress: totalTutMins,
  },
  {
    id: 'tut-60',
    title: 'The Hour',
    desc: 'Fly for 1 hr total',
    emoji: '⏱️',
    goal: 60,
    category: 'global',
    progress: totalTutMins,
  },
  {
    id: 'tut-120',
    title: 'Legend in the Making',
    desc: 'Fly for 2 hr total',
    emoji: '👑',
    goal: 120,
    category: 'global',
    progress: totalTutMins,
  },
  // TUT Streak
  {
    id: 'tut-streak-3',
    title: 'Habit Forming',
    desc: '3-day active streak',
    emoji: '📅',
    goal: 3,
    category: 'global',
    progress: (s) => s.tutStreak,
  },
  {
    id: 'tut-streak-7',
    title: 'One Week Beast',
    desc: '7-day active streak',
    emoji: '🗓️',
    goal: 7,
    category: 'global',
    progress: (s) => s.tutStreak,
  },
  {
    id: 'tut-streak-30',
    title: 'Unstoppable',
    desc: '30-day active streak',
    emoji: '🌋',
    goal: 30,
    category: 'global',
    progress: (s) => s.tutStreak,
  },
  // Standard-level mastery (bird evolution has its own rewards).
  {
    id: 'level-score-60',
    title: 'Max Out a Level',
    desc: 'Score 60 in a standard level run',
    emoji: '🏁',
    icon: 'max-level',
    goal: LEVEL_MASTERY_SCORE,
    category: 'global',
    progress: (s) => bestStandardLevelScore(s.standardLevelBestScores),
  },
  {
    id: 'level-mastery-5',
    title: 'Ultimate Legend',
    desc: 'Score 60 on 5 different standard levels',
    emoji: '🏅',
    icon: 'ultimate',
    goal: 5,
    category: 'global',
    progress: (s) => masteredLevelCount(s.standardLevelBestScores),
  },
  {
    id: 'level-mastery-all',
    title: 'The Impossible',
    desc: 'Score 60 on all 15 standard levels',
    emoji: '💎',
    icon: 'impossible',
    goal: LEVELS.length,
    category: 'global',
    progress: (s) => masteredLevelCount(s.standardLevelBestScores),
  },
  // Score
  {
    id: 'score-10',
    title: 'Double Digits',
    desc: 'Score 10 in a run',
    emoji: '🎯',
    goal: 10,
    category: 'global',
    progress: (s) => s.bestSingleScore,
  },
  {
    id: 'score-25',
    title: 'Sharp Shooter',
    desc: 'Score 25 in a run',
    emoji: '🏹',
    goal: 25,
    category: 'global',
    progress: (s) => s.bestSingleScore,
  },
  {
    id: 'score-50',
    title: 'Untouchable',
    desc: 'Score 50 in a run',
    emoji: '⚡',
    goal: 50,
    category: 'global',
    progress: (s) => s.bestSingleScore,
  },
  // Levels
  {
    id: 'endless-unlock',
    title: 'Endless Unlocked',
    desc: 'Clear level 5 to unlock Endless mode',
    emoji: '♾️',
    icon: 'endless',
    goal: ENDLESS_UNLOCK_LEVEL,
    category: 'global',
    progress: (s) => completedLevelCount(s.unlockedLevel, s.championUnlocked),
  },
  {
    id: 'levels-10',
    title: 'High Flyer',
    desc: 'Unlock level 10',
    emoji: '🦅',
    goal: 9,
    category: 'global',
    progress: (s) => completedLevelCount(s.unlockedLevel, s.championUnlocked),
  },
  {
    id: 'levels-15',
    title: 'Summit',
    desc: 'Unlock level 15',
    emoji: '🏔️',
    goal: 14,
    category: 'global',
    progress: (s) => completedLevelCount(s.unlockedLevel, s.championUnlocked),
  },
  // Daily Challenge
  {
    id: 'daily-5',
    title: 'Daily Grinder',
    desc: 'Complete 5 daily challenges',
    emoji: '🗓️',
    goal: 5,
    category: 'global',
    progress: (s) => s.dailiesCompleted,
  },

  {
    id: 'flap-fit-champion',
    title: 'Flap Fit Champion',
    desc: 'Clear all 15 standard levels',
    emoji: '🏆',
    goal: LEVELS.length,
    category: 'global',
    progress: (s) => completedLevelCount(s.unlockedLevel, s.championUnlocked),
  },

  // ─── Push-ups ────────────────────────────────────────────────────────────
  ...makeExerciseAchievements('pushups', 'Push-ups', ['💪', '🔥', '🏋️', '⏱️', '🦾', '👑']),

  // ─── Squats ──────────────────────────────────────────────────────────────
  ...makeExerciseAchievements('squats', 'Squats', ['🦵', '🔥', '🏋️', '⏱️', '🦾', '👑']),

  // ─── Pull-ups ────────────────────────────────────────────────────────────
  ...makeExerciseAchievements('pullups', 'Pull-ups', ['💪', '🔥', '🏋️', '⏱️', '🦾', '👑']),

  // ─── Lateral Raise ───────────────────────────────────────────────────────
  ...makeExerciseAchievements('lateralraise', 'Lateral Raises', [
    '🙌',
    '🔥',
    '🏋️',
    '⏱️',
    '🦾',
    '👑',
  ]),

  // ─── Bicep Curls ─────────────────────────────────────────────────────────
  ...makeExerciseAchievements('biceps', 'Bicep Curls', ['💪', '🔥', '🏋️', '⏱️', '🦾', '👑']),

  // ─── Shoulder Press ──────────────────────────────────────────────────────
  ...makeExerciseAchievements('shoulderpress', 'Shoulder Press', [
    '🙆',
    '🔥',
    '🏋️',
    '⏱️',
    '🦾',
    '👑',
  ]),
];
