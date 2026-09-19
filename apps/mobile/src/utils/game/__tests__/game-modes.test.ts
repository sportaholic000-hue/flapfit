import { canEnterLaunchGame, isLaunchGameMode } from '../gameModes';
import { getDailyChallenge } from '../levels';
import { ACHIEVEMENTS } from '../achievements';
import { useGameStore } from '../store';

test('retired and malformed links cannot start games; all launch modes remain available', () => {
  for (const mode of [undefined, 'level', 'daily', 'endless']) expect(isLaunchGameMode(mode)).toBe(true);
  for (const mode of ['challenge', 'unknown', ['daily', 'challenge'], null]) expect(isLaunchGameMode(mode)).toBe(false);
});

test('Daily Challenge still generates a playable target and records completion only once', () => {
  const daily = getDailyChallenge(5, '2026-09-17');
  expect(daily).toEqual(getDailyChallenge(5, '2026-09-17'));
  useGameStore.setState({ dailyCompleted: [] });
  useGameStore.getState().completeDaily('2026-09-17');
  useGameStore.getState().completeDaily('2026-09-17');
  expect(useGameStore.getState().dailyCompleted).toEqual(['2026-09-17']);
  expect(ACHIEVEMENTS.some(a => a.id === 'daily-5')).toBe(true);
  expect(ACHIEVEMENTS.some(a => a.id === 'challenge-1')).toBe(false);
});

test('direct entry follows saved standard-level and Endless unlocks', () => {
  expect(canEnterLaunchGame('level', '15', 1)).toBe(false);
  expect(canEnterLaunchGame('level', '5', 5)).toBe(true);
  expect(canEnterLaunchGame('endless', undefined, 5)).toBe(false);
  expect(canEnterLaunchGame('endless', undefined, 6)).toBe(true);
  expect(canEnterLaunchGame(undefined, undefined, 1)).toBe(true);
  for (const id of ['0', '16', '2junk', '-1', '1.5', ['1'], null]) expect(canEnterLaunchGame('level', id, 15)).toBe(false);
  expect(canEnterLaunchGame('challenge', '1', 15)).toBe(false);
});
test('valid Daily Challenge entries remain accessible at every saved unlock', () => {
  for (let unlocked = 1; unlocked <= 15; unlocked += 1) {
    for (let day = 1; day <= 31; day += 1) {
      const daily = getDailyChallenge(unlocked, '2026-09-' + day);
      expect(canEnterLaunchGame('daily', String(daily.levelId), unlocked)).toBe(true);
    }
  }
});
