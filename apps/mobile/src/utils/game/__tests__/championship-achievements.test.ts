import AsyncStorage from '@react-native-async-storage/async-storage';
import { ACHIEVEMENTS, type StatsSnapshot } from '../achievements';
import {
  FINAL_LEVEL,
  isChampionshipRun,
  recoverStandardLevelBestScores,
} from '../levelAchievements';
import { LEVELS } from '../levels';
import { retryPersistedStoreHydration, useGameStore } from '../store';

function record(levelId: number | null, score: number, mode = 'level') {
  useGameStore
    .getState()
    .recordSession({ exercise: 'pushups', mode, levelId, score, pushups: 0, tutSeconds: 12 });
}
function snapshot(): StatsSnapshot {
  const state = useGameStore.getState();
  return {
    tutStreak: 0,
    bestSingleScore: state.bestSingleScore,
    unlockedLevel: state.unlockedLevel,
    sessionsCount: state.sessions.length,
    dailiesCompleted: state.dailyCompleted.length,
    totalTutSeconds: state.totalTutSeconds,
    exerciseTutSeconds: state.exerciseTut,
    standardLevelBestScores: state.standardLevelBestScores,
    championUnlocked: state.championUnlocked,
  };
}
function progress(id: string) {
  const achievement = ACHIEVEMENTS.find((a) => a.id === id)!;
  return [Math.min(achievement.goal, achievement.progress(snapshot())), achievement.goal];
}

beforeEach(async () => {
  useGameStore.setState(useGameStore.getInitialState(), true);
  await AsyncStorage.clear();
});

test('Endless, High Flyer and Summit count cleared levels, not the next unlocked level', () => {
  useGameStore.setState({ unlockedLevel: 5 });
  expect(progress('endless-unlock')).toEqual([4, 5]);
  record(5, LEVELS[4].targetScore - 1);
  expect(progress('endless-unlock')).toEqual([4, 5]);
  record(5, LEVELS[4].targetScore);
  expect(progress('endless-unlock')).toEqual([5, 5]);
  useGameStore.setState({ unlockedLevel: 9 });
  expect(progress('levels-10')).toEqual([8, 9]);
  record(9, LEVELS[8].targetScore);
  expect(progress('levels-10')).toEqual([9, 9]);
  useGameStore.setState({ unlockedLevel: 14 });
  record(14, LEVELS[13].targetScore);
  expect(progress('levels-15')).toEqual([14, 14]);
  expect(progress('flap-fit-champion')).toEqual([14, 15]);
  expect(useGameStore.getState().championUnlocked).toBe(false);
});

test('only a completed standard final-level run meeting its target awards Champion', () => {
  useGameStore.setState({ unlockedLevel: 15 });
  record(15, FINAL_LEVEL.targetScore - 1);
  expect(useGameStore.getState().championUnlocked).toBe(false);
  record(15, 100, 'daily');
  record(null, 100, 'endless');
  record(14, 60);
  expect(useGameStore.getState().championUnlocked).toBe(false);
  expect(isChampionshipRun('level', 15, NaN)).toBe(false);
  record(15, FINAL_LEVEL.targetScore);
  expect(progress('flap-fit-champion')).toEqual([15, 15]);
  expect(useGameStore.getState().championUnlocked).toBe(true);
  expect(useGameStore.getState().championshipCelebrationSeen).toBe(false);
  useGameStore.getState().markChampionshipCelebrationSeen();
  record(15, 2);
  record(15, 85);
  expect(useGameStore.getState().championshipCelebrationSeen).toBe(true);
  expect(useGameStore.getState().championUnlocked).toBe(true);
  expect(useGameStore.getState().standardLevelBestScores['15']).toBe(85);
  expect(FINAL_LEVEL.maxScore).toBe(0);
});

test('mastery requires sixty in one standard run, and counts each level once across exercises', () => {
  record(1, 30);
  record(1, 29);
  expect(progress('level-score-60')).toEqual([30, 60]);
  record(1, 59);
  expect(progress('level-mastery-5')).toEqual([0, 5]);
  record(1, 60);
  record(1, 60);
  useGameStore
    .getState()
    .recordSession({ exercise: 'squats', mode: 'level', levelId: 1, score: 60, pushups: 0 });
  expect(progress('level-score-60')).toEqual([60, 60]);
  expect(progress('level-mastery-5')).toEqual([1, 5]);
  for (let id = 2; id <= 5; id++) record(id, 60);
  expect(progress('level-mastery-5')).toEqual([5, 5]);
  expect(progress('level-mastery-all')).toEqual([5, 15]);
  for (let id = 6; id <= 15; id++) record(id, id === 15 ? 80 : 60);
  expect(progress('level-mastery-all')).toEqual([15, 15]);
});

test('Daily and Endless retain their old best-score behavior without counting toward standard mastery', async () => {
  record(1, 60, 'daily');
  record(15, 60, 'daily');
  record(null, 100, 'endless');
  expect(progress('level-score-60')).toEqual([0, 60]);
  expect(useGameStore.getState().bestSingleScore).toBe(100);
  expect(useGameStore.getState().endlessBest).toBe(100);
  expect(useGameStore.getState().bestScores['1']).toBe(60);
  await Promise.resolve();
  await retryPersistedStoreHydration();
  expect(progress('level-mastery-all')).toEqual([0, 15]);
  expect(useGameStore.getState().championUnlocked).toBe(false);
});

test('time achievements still follow real total and per-exercise training time', () => {
  useGameStore.getState().recordTut(119, 'pushups');
  expect(progress('tut-2')).toEqual([1, 2]);
  useGameStore.getState().recordTut(1, 'squats');
  expect(progress('tut-2')).toEqual([2, 2]);
  useGameStore.getState().recordTut(181, 'pushups');
  expect(progress('pushups-tut-5')).toEqual([5, 5]);
  expect(progress('squats-tut-5')).toEqual([0, 5]);
  useGameStore.getState().recordTut(7200 - 301, 'squats');
  expect(progress('tut-120')).toEqual([120, 120]);
  expect(ACHIEVEMENTS.filter((a) => a.id.startsWith('evo-'))).toEqual([]);
});

test('legacy recovery credits recorded standard runs, but never guesses mixed low-level scores', () => {
  const recovered = recoverStandardLevelBestScores(
    undefined,
    { '1': 60, '2': 60, '6': 60, '15': 25 },
    [
      { mode: 'level', levelId: 1, score: 59 },
      { mode: 'level', levelId: 3, score: 60 },
      { mode: 'daily', levelId: 2, score: 60 },
      { mode: 'endless', levelId: null, score: 100 },
    ]
  );
  expect(recovered['1']).toBe(59);
  expect(recovered['2']).toBeUndefined();
  expect(recovered['3']).toBe(60);
  expect(recovered['6']).toBe(60);
  expect(recovered['15']).toBe(25);
});

test('an existing level-15 completion gets a permanent badge and one unseen ceremony after hydration', async () => {
  await AsyncStorage.setItem(
    'flap-fit-store',
    JSON.stringify({
      version: 0,
      state: {
        unlockedLevel: 15,
        bestScores: { '15': 25 },
        sessions: [],
        totalTutSeconds: 4321,
      },
    })
  );
  await retryPersistedStoreHydration();
  expect(useGameStore.getState().championUnlocked).toBe(true);
  expect(progress('flap-fit-champion')).toEqual([15, 15]);
  expect(useGameStore.getState().championshipCelebrationSeen).toBe(false);
  expect(useGameStore.getState().totalTutSeconds).toBe(4321);
  useGameStore.getState().markChampionshipCelebrationSeen();
  await Promise.resolve();
  await retryPersistedStoreHydration();
  expect(useGameStore.getState().championshipCelebrationSeen).toBe(true);
});

test('unlocking the final level in an old save is not a championship', async () => {
  await AsyncStorage.setItem(
    'flap-fit-store',
    JSON.stringify({
      version: 0,
      state: {
        unlockedLevel: 15,
        bestScores: { '14': 60, '15': 24 },
        sessions: [],
      },
    })
  );
  await retryPersistedStoreHydration();
  expect(useGameStore.getState().championUnlocked).toBe(false);
  useGameStore.getState().markChampionshipCelebrationSeen();
  expect(useGameStore.getState().championshipCelebrationSeen).toBe(false);
});

test('new mastery records and champion status survive history trimming, app restart and profile reset', async () => {
  record(1, 60);
  record(15, 25);
  for (let i = 0; i < 301; i++) record(null, 1, 'endless');
  expect(useGameStore.getState().sessions).toHaveLength(300);
  useGameStore.getState().resetCompetitionProfile();
  await Promise.resolve();
  await retryPersistedStoreHydration();
  expect(progress('level-score-60')).toEqual([60, 60]);
  expect(useGameStore.getState().championUnlocked).toBe(true);
});
