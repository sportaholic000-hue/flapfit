import { createBirdSvg, getBirdVisualState } from './birdVisual';
import type { BirdSkin } from './birds';

const jay: BirdSkin = {
  id: 'sky',
  name: 'Jay',
  body: '#38BDF8',
  belly: '#BAE6FD',
  wing: '#0284C7',
  beak: '#F59E0B',
  eye: '#1F2937',
};

const balanced = { wings: 55, legs: 55, arms: 55, shoulders: 55 };

describe('canonical bird visual', () => {
  it('gives Stage 10 a greater than 20 percent size jump over Stage 9', () => {
    const stageNine = getBirdVisualState({ stage: 8, ...balanced });
    const stageTen = getBirdVisualState({ stage: 9, ...balanced });

    expect(stageTen.scale / stageNine.scale).toBeGreaterThan(1.2);
    expect(stageTen.muscle).toBeGreaterThan(stageNine.muscle);
    expect(stageTen.champion).toBe(true);
  });

  it('maps each exercise morphology input to its own anatomy channel', () => {
    const baseline = getBirdVisualState({ stage: 3 });
    const wings = getBirdVisualState({ stage: 3, wings: 100 });
    const arms = getBirdVisualState({ stage: 3, arms: 100 });
    const shoulders = getBirdVisualState({ stage: 3, shoulders: 100 });
    const legs = getBirdVisualState({ stage: 3, legs: 100 });

    expect(wings.wingPower).toBeGreaterThan(baseline.wingPower);
    expect(wings.armPower).toBe(baseline.armPower);
    expect(arms.armPower).toBeGreaterThan(baseline.armPower);
    expect(arms.shoulderPower).toBe(baseline.shoulderPower);
    expect(shoulders.shoulderPower).toBeGreaterThan(baseline.shoulderPower);
    expect(shoulders.legPower).toBe(baseline.legPower);
    expect(legs.legPower).toBeGreaterThan(baseline.legPower);
    expect(legs.wingPower).toBe(baseline.wingPower);
  });

  it('uses exactly two named wings and two leg paths in either pose', () => {
    for (const pose of ['showcase', 'flying'] as const) {
      const svg = createBirdSvg(jay, { stage: 5, ...balanced }, pose, { pose });
      const legs = svg.match(new RegExp(`id="${pose}-legs"[\\s\\S]*?<\\/g>`))?.[0] ?? '';

      expect(svg.match(/-rear-wing"/g) ?? []).toHaveLength(1);
      expect(svg.match(/-front-wing"/g) ?? []).toHaveLength(1);
      expect(legs.match(/<path /g) ?? []).toHaveLength(2);
    }
  });

  it('removes the ground shadow and tucks the legs in flying pose', () => {
    const showcase = createBirdSvg(jay, { stage: 4, ...balanced }, 'showcase');
    const flying = createBirdSvg(jay, { stage: 4, ...balanced }, 'flying', {
      pose: 'flying',
    });

    expect(showcase).toContain('cy="226"');
    expect(flying).not.toContain('cy="226"');
    expect(flying).toContain('C103 185 96 194 91 205');
  });
});
