import { computeBirdRadii } from '../html/scriptGame';
import {
  computeEvolutionStage,
  deriveDailyExerciseTut,
  EVO_EMOJIS,
  EVO_NAMES,
  EVO_THRESHOLDS,
  type SessionRecord,
} from '../store';

describe('evolution core', () => {
  it('defines all ten tracked-training-time stages', () => {
    expect(EVO_THRESHOLDS).toEqual([0, 120, 600, 1800, 3600, 7200, 14400, 28800, 54000, 108000]);
    expect(EVO_NAMES).toHaveLength(10);
    expect(EVO_EMOJIS).toHaveLength(10);
  });

  it('changes stage at every threshold boundary', () => {
    EVO_THRESHOLDS.forEach((threshold, stage) => {
      expect(computeEvolutionStage(threshold, null)).toBe(stage);
      if (stage > 0) {
        expect(computeEvolutionStage(threshold - 0.001, null)).toBe(stage - 1);
      }
    });
  });

  it('keeps collision and raster draw-box size invariant across evolution', () => {
    const start = computeBirdRadii(844, 0);
    const final = computeBirdRadii(844, 9);

    expect(final.collision).toBe(start.collision);
    expect(final.visual).toBe(start.visual);
  });

  it('keeps daily chart totals separated by exercise', () => {
    const base = {
      iso: '2026-09-15T12:00:00.000Z',
      day: '2026-09-15',
      score: 10,
      pushups: 0,
      mode: 'level',
      levelId: 1,
    } satisfies Omit<SessionRecord, 'exercise' | 'tutSeconds'>;

    const totals = deriveDailyExerciseTut([
      { ...base, exercise: 'pushups', tutSeconds: 30 },
      { ...base, exercise: 'pushups', tutSeconds: 15 },
      { ...base, exercise: 'squats', tutSeconds: 40 },
      { ...base, tutSeconds: 90 },
    ]);

    expect(totals).toEqual({
      '2026-09-15': { pushups: 45, squats: 40 },
    });
  });
});
