import { BIRD_STAGE_ART, BIRD_STAGE_COUNT, BIRD_STAGE_SKIN_IDS } from '../birdStageArt';
import { BIRDS } from '../birds';

describe('bird evolution asset coverage', () => {
  test('provides a stage-art family for every selectable bird', () => {
    expect(BIRD_STAGE_SKIN_IDS).toEqual(BIRDS.map((bird) => bird.id));
  });

  test('provides all ten stages for all seven bird colors', () => {
    expect(BIRD_STAGE_SKIN_IDS).toHaveLength(7);
    for (const skinId of BIRD_STAGE_SKIN_IDS) {
      expect(BIRD_STAGE_ART[skinId]).toHaveLength(BIRD_STAGE_COUNT);
      expect(BIRD_STAGE_ART[skinId].every(Boolean)).toBe(true);
    }
  });
});
