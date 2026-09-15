import {
  deriveDailyExerciseTut,
  deriveDailyTut,
  recoverDailyExerciseTut,
  recoverDailyTut,
  type SessionRecord,
} from '../store';

function session(
  day: string,
  exercise: SessionRecord['exercise'],
  tutSeconds: number
): SessionRecord {
  return {
    iso: `${day}T12:00:00.000Z`,
    day,
    exercise,
    score: 10,
    pushups: 0,
    mode: 'level',
    levelId: 1,
    tutSeconds,
  };
}

describe('Stats training history', () => {
  const sessions = [
    session('2026-09-14', 'pushups', 30),
    session('2026-09-14', 'squats', 45),
    session('2026-09-15', 'pushups', 20),
  ];

  test('keeps the combined chart separate from each exercise chart', () => {
    expect(deriveDailyTut(sessions)).toEqual({
      '2026-09-14': 75,
      '2026-09-15': 20,
    });
    expect(deriveDailyExerciseTut(sessions)).toEqual({
      '2026-09-14': { pushups: 30, squats: 45 },
      '2026-09-15': { pushups: 20 },
    });
  });

  test('recovers missing chart buckets without double-counting persisted totals', () => {
    expect(recoverDailyTut({ '2026-09-14': 80 }, sessions)).toEqual({
      '2026-09-14': 80,
      '2026-09-15': 20,
    });
    expect(recoverDailyExerciseTut({ '2026-09-14': { pushups: 35 } }, sessions)).toEqual({
      '2026-09-14': { pushups: 35, squats: 45 },
      '2026-09-15': { pushups: 20 },
    });
  });

  test('does not guess an exercise for older unattributed sessions', () => {
    const legacy = session('2026-09-13', undefined, 25);

    expect(deriveDailyTut([legacy])).toEqual({ '2026-09-13': 25 });
    expect(deriveDailyExerciseTut([legacy])).toEqual({});
  });
});
