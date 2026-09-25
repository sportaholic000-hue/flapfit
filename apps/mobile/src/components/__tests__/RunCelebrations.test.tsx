import type { ReactTestRenderer } from 'react-test-renderer';
import { getBird } from '@/utils/game/birds';

async function mount(evolvedTo: number | null, championship: boolean) {
  jest.resetModules();
  const React: typeof import('react') = require('react');
  const { act } = React;
  const renderer: typeof import('react-test-renderer') = require('react-test-renderer');
  jest.doMock('react-native', () => ({
    View: 'View',
    Text: 'Text',
    TouchableOpacity: 'TouchableOpacity',
    ScrollView: 'ScrollView',
    useWindowDimensions: () => ({ width: 390, height: 844 }),
    Easing: { out: (value: unknown) => value, cubic: 0, quad: 0 },
    Animated: {
      View: 'AnimatedView',
      Value: class {
        interpolate() {
          return 1;
        }
      },
      timing: jest.fn(),
      spring: jest.fn(),
      parallel: () => ({ start: jest.fn(), stop: jest.fn() }),
    },
  }));
  jest.doMock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
  jest.doMock('react-native-safe-area-context', () => ({
    useSafeAreaInsets: () => ({ top: 44, bottom: 34 }),
  }));
  jest.doMock('lucide-react-native', () => ({ Share2: 'Share2', Sparkles: 'Sparkles' }));
  jest.doMock('../BirdAvatar', () => ({ __esModule: true, default: 'BirdAvatar' }));
  const { RunCelebrations }: typeof import('../RunCelebrations') = require('../RunCelebrations');
  const onComplete = jest.fn(),
    onShareEvolution = jest.fn();
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = renderer.create(
      <RunCelebrations
        evolvedTo={evolvedTo}
        championship={championship}
        skin={getBird('sunny')}
        birdEvo={{ stage: 5, wings: 0, legs: 0, arms: 0, shoulders: 0 }}
        totalTutSeconds={7205}
        runTutSeconds={65}
        onShareEvolution={onShareEvolution}
        onComplete={onComplete}
      />
    );
  });
  const text = () =>
    tree.root
      .findAllByType('Text' as never)
      .map((node) => node.children.join(''))
      .join('\n');
  const press = async (title: string) => {
    const button = tree.root
      .findAllByType('TouchableOpacity' as never)
      .find((node) =>
        node.findAllByType('Text' as never).some((child) => child.children.join('') === title)
      );
    expect(button).toBeDefined();
    await act(async () => button!.props.onPress());
  };
  return {
    tree,
    text,
    press,
    onComplete,
    onShareEvolution,
    unmount: async () => {
      await act(async () => tree.unmount());
    },
  };
}

test('same-run evolution comes first, then championship, then the original results callback', async () => {
  const f = await mount(5, true);
  expect(f.text()).toContain('EVOLUTION!');
  expect(f.text()).toContain('Athlete');
  expect(f.tree.root.findByType('BirdAvatar' as never).props.evo.stage).toBe(5);
  expect(f.text()).not.toContain('YOU CONQUERED FLAP FIT');
  await f.press('Share my evolution');
  expect(f.onShareEvolution).toHaveBeenCalledTimes(1);
  expect(f.onComplete).not.toHaveBeenCalled();
  await f.press('Continue to championship');
  expect(f.text()).not.toContain('EVOLUTION!');
  expect(f.text()).toContain('YOU CONQUERED FLAP FIT');
  expect(f.onComplete).not.toHaveBeenCalled();
  await f.press('Continue to results');
  expect(f.onComplete).toHaveBeenCalledTimes(1);
  await f.unmount();
});

test('first championship without evolution immediately presents the full owner-specified copy', async () => {
  const f = await mount(null, true);
  for (const copy of [
    'YOU CONQUERED FLAP FIT',
    'Not many have flown this far.',
    'Fifteen levels. Every obstacle. You kept going until there was nothing left to beat.',
    'You’ve earned your place among the champions.',
    'Now give the leaderboard a name to remember, champ!',
  ])
    expect(f.text()).toContain(copy);
  expect(f.text()).not.toContain('EVOLUTION!');
  await f.press('Continue to results');
  expect(f.onComplete).toHaveBeenCalledTimes(1);
  expect(f.onShareEvolution).not.toHaveBeenCalled();
  await f.unmount();
});

test('ordinary evolution retains its share and direct continuation to results', async () => {
  const f = await mount(1, false);
  expect(f.text()).toContain('First Flap');
  await f.press('Share my evolution');
  expect(f.onComplete).not.toHaveBeenCalled();
  await f.press('Continue to results');
  expect(f.onComplete).toHaveBeenCalledTimes(1);
  expect(f.text()).not.toContain('YOU CONQUERED FLAP FIT');
  await f.unmount();
});
