import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { ENDLESS_UNLOCK_LEVEL, LEVELS } from './levels';

const STORE_NAME = 'flap-fit-store';
const LEGACY_STORE_NAME = ['flappy', 'push', 'store'].join('-');

// Bump this value whenever the competition/community rules materially change.
// Players must accept the current version before publishing names, scores, or
// challenge attempts to the online service.
export const COMPETITION_TERMS_VERSION = '2026-09-14';

const migratingStorage = {
  async getItem(name: string) {
    const currentValue = await AsyncStorage.getItem(name);
    if (currentValue !== null || name !== STORE_NAME) return currentValue;

    const legacyValue = await AsyncStorage.getItem(LEGACY_STORE_NAME);
    if (legacyValue !== null) await AsyncStorage.setItem(STORE_NAME, legacyValue);
    return legacyValue;
  },
  setItem(name: string, value: string) {
    return AsyncStorage.setItem(name, value);
  },
  removeItem(name: string) {
    return AsyncStorage.removeItem(name);
  },
};

export type SessionRecord = {
  iso: string;
  day: string;
  // Added after launch. Older persisted sessions intentionally have no
  // exercise so they remain part of Total without being misattributed.
  exercise?: ExerciseMode;
  score: number;
  pushups: number;
  mode: string;
  levelId: number | null;
  // Retained only so older saved sessions can still be read. Flap Fit no
  // longer estimates calories because the camera cannot measure them reliably.
  calories?: number;
  tutSeconds: number;
};

export type ExerciseMode =
  | 'pushups'
  | 'squats'
  | 'pullups'
  | 'lateralraise'
  | 'biceps'
  | 'shoulderpress';

export type DailyExerciseTut = Record<string, Partial<Record<ExerciseMode, number>>>;

export function deriveDailyTut(sessions: SessionRecord[]): Record<string, number> {
  return sessions.reduce<Record<string, number>>((totals, session) => {
    if (!Number.isFinite(session.tutSeconds) || session.tutSeconds <= 0) return totals;
    totals[session.day] = (totals[session.day] ?? 0) + session.tutSeconds;
    return totals;
  }, {});
}

export function deriveDailyExerciseTut(sessions: SessionRecord[]): DailyExerciseTut {
  return sessions.reduce<DailyExerciseTut>((totals, session) => {
    if (!session.exercise || !Number.isFinite(session.tutSeconds) || session.tutSeconds <= 0) {
      return totals;
    }
    totals[session.day] = {
      ...totals[session.day],
      [session.exercise]: (totals[session.day]?.[session.exercise] ?? 0) + session.tutSeconds,
    };
    return totals;
  }, {});
}

export function recoverDailyTut(
  persisted: Record<string, number> | undefined,
  sessions: SessionRecord[]
): Record<string, number> {
  const recovered = { ...(persisted ?? {}) };
  for (const [day, seconds] of Object.entries(deriveDailyTut(sessions))) {
    if (!Number.isFinite(recovered[day]) || recovered[day] <= 0) recovered[day] = seconds;
  }
  return recovered;
}

export function recoverDailyExerciseTut(
  persisted: DailyExerciseTut | undefined,
  sessions: SessionRecord[]
): DailyExerciseTut {
  const recovered: DailyExerciseTut = Object.fromEntries(
    Object.entries(persisted ?? {}).map(([day, totals]) => [day, { ...totals }])
  );
  for (const [day, totals] of Object.entries(deriveDailyExerciseTut(sessions))) {
    const dayTotals = { ...(recovered[day] ?? {}) };
    for (const exercise of Object.keys(totals) as ExerciseMode[]) {
      const existing = dayTotals[exercise];
      if (!Number.isFinite(existing) || (existing ?? 0) <= 0)
        dayTotals[exercise] = totals[exercise];
    }
    recovered[day] = dayTotals;
  }
  return recovered;
}

// Evolution uses active tracked gameplay time. These totals are not full-rep,
// calorie, medical, or diagnostic measurements; competition verification is
// handled separately by the selected versioned tracking rules.
export const EVO_THRESHOLDS = [
  0, // Starting bird
  2 * 60,
  10 * 60,
  30 * 60,
  60 * 60,
  2 * 60 * 60,
  4 * 60 * 60,
  8 * 60 * 60,
  15 * 60 * 60,
  30 * 60 * 60,
] as const;
export const EVO_NAMES = [
  'Hatchling',
  'First Flap',
  'Rookie',
  'Trainee',
  'Conditioned',
  'Athlete',
  'Strong',
  'Powerhouse',
  'Elite',
  'Legend',
] as const;
export const EVO_EMOJIS = ['🥚', '🐣', '🐤', '🏋️', '💪', '🏅', '🦾', '⚡', '🔥', '👑'] as const;

const pad = (n: number) => String(n).padStart(2, '0');
export function dayKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function computeStreak(sessions: SessionRecord[]): number {
  const days = new Set(sessions.map((s) => s.day));
  let streak = 0;
  const cursor = new Date();
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function computeTutStreak(dailyTut: Record<string, number>): number {
  let streak = 0;
  const cursor = new Date();
  if (!dailyTut[dayKey(cursor)]) cursor.setDate(cursor.getDate() - 1);
  while ((dailyTut[dayKey(cursor)] ?? 0) > 0) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function computeEvolutionStage(totalTut: number, lastActivityDate: string | null): number {
  let base = 0;
  for (let i = EVO_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalTut >= EVO_THRESHOLDS[i]) {
      base = i;
      break;
    }
  }
  if (lastActivityDate && base > 0) {
    const daysInactive = (Date.now() - new Date(lastActivityDate).getTime()) / 86400000;
    if (daysInactive >= 7) base = Math.max(0, base - 2);
    else if (daysInactive >= 5) base = Math.max(0, base - 1);
  }
  return base;
}

export function computeBirdMorphology(exerciseTut: Record<string, number>) {
  const get = (k: string) => exerciseTut[k] ?? 0;
  const scale = (v: number, max: number) => Math.min(100, Math.round((v / max) * 100));
  return {
    wings: scale(get('pushups') + get('lateralraise') * 0.5, 1200),
    legs: scale(get('squats'), 900),
    arms: scale(get('pullups') + get('biceps'), 900),
    shoulders: scale(get('shoulderpress') + get('lateralraise') * 0.5, 900),
  };
}

function makeDeviceId(): string {
  return `dev-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

type RecordSessionInput = {
  exercise: ExerciseMode;
  score: number;
  pushups: number;
  mode: string;
  levelId: number | null;
  tutSeconds?: number;
};

type GameStore = {
  hydrated: boolean;
  hasOnboarded: boolean;
  // Kept in persisted state for backwards compatibility. Camera tracking is
  // now the only supported control mode.
  controlMode: 'camera';
  exerciseMode: ExerciseMode;
  birdId: string;
  playerName: string;
  competitionTermsVersion: string | null;
  deviceId: string;
  unlockedLevel: number;
  bestScores: Record<string, number>;
  endlessBest: number;
  bestSingleScore: number;
  totalPushups: number;
  totalPipes: number;
  challengesWon: number;
  dailyCompleted: string[];
  sessions: SessionRecord[];
  // Tracked training/play time. Field names stay unchanged so existing
  // AsyncStorage data remains compatible.
  totalTutSeconds: number;
  exerciseTut: Record<string, number>;
  dailyTut: Record<string, number>;
  dailyExerciseTut: DailyExerciseTut;
  lastActivityDate: string | null;
  // Actions
  setHydrated: () => void;
  setOnboarded: () => void;
  setExerciseMode: (mode: ExerciseMode) => void;
  setBird: (id: string) => void;
  setPlayerName: (name: string) => void;
  acceptCompetitionTerms: () => void;
  resetCompetitionProfile: () => void;
  recordSession: (input: RecordSessionInput) => void;
  recordTut: (seconds: number, exercise: ExerciseMode) => void;
  completeDaily: (day: string) => void;
  addChallengeWon: () => void;
};

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      hydrated: false,
      hasOnboarded: false,
      controlMode: 'camera',
      exerciseMode: 'pushups',
      birdId: 'sunny',
      playerName: '',
      competitionTermsVersion: null,
      deviceId: makeDeviceId(),
      unlockedLevel: 1,
      bestScores: {},
      endlessBest: 0,
      bestSingleScore: 0,
      totalPushups: 0,
      totalPipes: 0,
      challengesWon: 0,
      dailyCompleted: [],
      sessions: [],
      totalTutSeconds: 0,
      exerciseTut: {},
      dailyTut: {},
      dailyExerciseTut: {},
      lastActivityDate: null,

      setHydrated: () => set({ hydrated: true }),
      setOnboarded: () => set({ hasOnboarded: true }),
      setExerciseMode: (mode) => set({ exerciseMode: mode }),
      setBird: (id) => set({ birdId: id }),
      setPlayerName: (name) => set({ playerName: name.slice(0, 20) }),
      acceptCompetitionTerms: () => set({ competitionTermsVersion: COMPETITION_TERMS_VERSION }),
      resetCompetitionProfile: () => set({ playerName: '', competitionTermsVersion: null }),

      recordTut: (seconds, exercise) => {
        const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
        if (safeSeconds === 0) return;
        const state = get();
        const today = dayKey();
        const newTotal = state.totalTutSeconds + safeSeconds;
        const newExerciseTut = {
          ...state.exerciseTut,
          [exercise]: (state.exerciseTut[exercise] ?? 0) + safeSeconds,
        };
        const newDailyTut = {
          ...state.dailyTut,
          [today]: (state.dailyTut[today] ?? 0) + safeSeconds,
        };
        const newDailyExerciseTut: DailyExerciseTut = {
          ...state.dailyExerciseTut,
          [today]: {
            ...state.dailyExerciseTut[today],
            [exercise]: (state.dailyExerciseTut[today]?.[exercise] ?? 0) + safeSeconds,
          },
        };
        // Trim to last 90 days
        const cutoff = dayKey(new Date(Date.now() - 90 * 86400000));
        const trimmed: Record<string, number> = {};
        for (const k of Object.keys(newDailyTut)) {
          if (k >= cutoff) trimmed[k] = newDailyTut[k];
        }
        const trimmedExercise: DailyExerciseTut = {};
        for (const k of Object.keys(newDailyExerciseTut)) {
          if (k >= cutoff) trimmedExercise[k] = newDailyExerciseTut[k];
        }
        set({
          totalTutSeconds: newTotal,
          exerciseTut: newExerciseTut,
          dailyTut: trimmed,
          dailyExerciseTut: trimmedExercise,
          lastActivityDate: new Date().toISOString(),
        });
      },

      recordSession: ({ exercise, score, pushups, mode, levelId, tutSeconds = 0 }) => {
        const state = get();
        const now = new Date();
        const session: SessionRecord = {
          iso: now.toISOString(),
          day: dayKey(now),
          exercise,
          score,
          pushups,
          mode,
          levelId,
          tutSeconds,
        };
        const sessions = [session, ...state.sessions].slice(0, 300);
        const updates: Partial<GameStore> = {
          sessions,
          totalPushups: state.totalPushups + pushups,
          totalPipes: state.totalPipes + score,
          bestSingleScore: Math.max(state.bestSingleScore, score),
          lastActivityDate: now.toISOString(),
        };
        if ((mode === 'level' || mode === 'daily') && levelId) {
          const key = String(levelId);
          const prevBest = state.bestScores[key] ?? 0;
          if (score > prevBest) {
            updates.bestScores = { ...state.bestScores, [key]: score };
          }
          const levelConfig = LEVELS.find((l) => l.id === levelId);
          const cleared = levelConfig ? score >= levelConfig.targetScore : false;
          if (cleared && levelId === state.unlockedLevel && levelId < LEVELS.length) {
            updates.unlockedLevel = levelId + 1;
          }
        }
        if (mode === 'endless' && score > state.endlessBest) {
          updates.endlessBest = score;
        }
        set(updates);
      },

      completeDaily: (day) => {
        const state = get();
        if (!state.dailyCompleted.includes(day)) {
          set({ dailyCompleted: [...state.dailyCompleted, day].slice(-90) });
        }
      },
      addChallengeWon: () => set({ challengesWon: get().challengesWon + 1 }),
    }),
    {
      name: STORE_NAME,
      storage: createJSONStorage(() => migratingStorage),
      partialize: (state) => {
        const { hydrated: _h, ...rest } = state;
        return rest;
      },
      // Old installs may have persisted controlMode: 'sensor'. Force that
      // value to camera during hydration; setHydrated then writes it back.
      merge: (persistedState, currentState) => {
        const persisted = (persistedState ?? {}) as Partial<GameStore>;
        const sessions = persisted.sessions ?? currentState.sessions;
        return {
          ...currentState,
          ...persisted,
          // Recover missing day buckets from completed sessions. Stored values
          // win so hydration never double-counts current installs; older
          // sessions without an exercise stay only in the Total chart.
          dailyTut: recoverDailyTut(persisted.dailyTut, sessions),
          dailyExerciseTut: recoverDailyExerciseTut(persisted.dailyExerciseTut, sessions),
          controlMode: 'camera' as const,
        };
      },
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    }
  )
);

export function isEndlessUnlocked(unlockedLevel: number): boolean {
  return unlockedLevel > ENDLESS_UNLOCK_LEVEL;
}
