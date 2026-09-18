import { isLaunchGameMode } from '../gameModes';
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
