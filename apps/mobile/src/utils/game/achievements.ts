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
  challengesWon: number;
  dailiesCompleted: number;
  totalTutSeconds: number;
  birdEvolutionStage: number;
  exerciseTutSeconds: Record<string, number>;
};

export type AchievementDef = {
  id: string;
  title: string;
  desc: string;
  emoji: string;
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
  // Bird evolution
  {
    id: 'evo-1',
    title: 'Fledgling',
    desc: 'Evolve to Stage 1',
    emoji: '🐤',
    goal: 1,
    category: 'global',
    progress: (s) => s.birdEvolutionStage,
  },
  {
    id: 'evo-3',
    title: 'Athlete Bird',
    desc: 'Evolve to Stage 3',
    emoji: '💪',
    goal: 3,
    category: 'global',
    progress: (s) => s.birdEvolutionStage,
  },
  {
    id: 'evo-5',
    title: 'Legendary Bird',
    desc: 'Evolve to Stage 5',
    emoji: '🏆',
    goal: 5,
    category: 'global',
    progress: (s) => s.birdEvolutionStage,
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
    id: 'levels-5',
    title: 'Climbing',
    desc: 'Unlock level 5',
    emoji: '🪜',
    goal: 5,
    category: 'global',
    progress: (s) => s.unlockedLevel,
  },
  {
    id: 'levels-10',
    title: 'High Flyer',
    desc: 'Unlock level 10',
    emoji: '🦅',
    goal: 10,
    category: 'global',
    progress: (s) => s.unlockedLevel,
  },
  {
    id: 'levels-15',
    title: 'Summit',
    desc: 'Unlock level 15',
    emoji: '🏔️',
    goal: 15,
    category: 'global',
    progress: (s) => s.unlockedLevel,
  },
  // Daily / Challenge
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
    id: 'challenge-1',
    title: 'Duelist',
    desc: 'Win a friend challenge',
    emoji: '⚔️',
    goal: 1,
    category: 'global',
    progress: (s) => s.challengesWon,
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
