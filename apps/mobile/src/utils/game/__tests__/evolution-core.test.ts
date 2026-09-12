import { computeBirdRadii } from '../html/scriptGame';
import { computeEvolutionStage, EVO_EMOJIS, EVO_NAMES, EVO_THRESHOLDS } from '../store';

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
});
