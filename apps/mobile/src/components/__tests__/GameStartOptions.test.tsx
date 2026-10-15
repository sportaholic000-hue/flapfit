import type { ReactTestRenderer } from 'react-test-renderer';

jest.setTimeout(60_000);

async function fixture(screen: 'home' | 'levels' = 'home', unlockedLevel = 6, dailyDone = false) {
  jest.resetModules();
  const React: typeof import('react') = require('react');
  const renderer: typeof import('react-test-renderer') = require('react-test-renderer');
  const push = jest.fn();
  jest.doMock('react-native', () => ({
    View: 'View', Text: 'Text', ScrollView: 'ScrollView', TouchableOpacity: 'TouchableOpacity',
    Modal: 'Modal', Pressable: 'Pressable', ActivityIndicator: 'ActivityIndicator',
  }));
  jest.doMock('expo-router', () => ({
    useRouter: () => ({ push }), Redirect: 'Redirect',
    useFocusEffect: (callback: () => (() => void)) => React.useEffect(callback, [callback]),
  }));
  jest.doMock('expo-image', () => ({ Image: 'Image' }));
  jest.doMock('expo-status-bar', () => ({ StatusBar: () => null }));
  jest.doMock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
  jest.doMock('react-native-svg', () => ({ __esModule: true, default: 'Svg', Defs: 'Defs', LinearGradient: 'LinearGradient', Path: 'Path', Circle: 'Circle', Stop: 'Stop' }));
  jest.doMock('lucide-react-native', () => Object.fromEntries(
    ['Camera', 'CheckCircle2', 'Flame', 'Infinity', 'Lock', 'Play', 'Sun', 'Video', 'Star'].map(name => [name, 'Icon'])
  ));
  jest.doMock('@/components/TabSkyBackground', () => ({ TabSkyBackground: () => null }));
  jest.doMock('@/components/BirdAvatar', () => ({ __esModule: true, default: () => null }));
  jest.doMock('@/services/monetization', () => ({
    getLobbyPrivacyKey: () => 'ready', prepareMonetization: jest.fn().mockResolvedValue(undefined),
  }));
  jest.doMock('@/services/privacy/processingAccess', () => ({ subscribeProcessingAccess: () => () => {} }));
  jest.doMock('@/utils/game/birds', () => ({ BIRDS: [], getBird: () => ({ name: 'Test bird' }) }));
  jest.doMock('@/utils/game/exerciseImages', () => ({ EXERCISE_IMAGES: {} }));
  jest.doMock('@/utils/game/levels', () => ({
    LEVELS: Array.from({ length: 6 }, (_, i) => ({ id: i + 1, name: `Course ${i + 1}`, targetScore: 10 })),
    getDailyChallenge: () => ({ levelId: 2, target: 17 }),
  }));
  const state = {
    hydrated: true, hydrationError: null, hasOnboarded: true, birdId: 'test', setBird: jest.fn(), unlockedLevel,
    dailyCompleted: dailyDone ? ['today'] : [], endlessBest: 22, exerciseMode: 'squats', setExerciseMode: jest.fn(),
    totalTutSeconds: 0, dailyTut: {}, exerciseTut: {}, lastActivityDate: null, bestScores: {},
  };
  jest.doMock('@/utils/game/store', () => ({
    useGameStore: (select: (value: typeof state) => unknown) => select(state),
    computeTutStreak: () => 0, computeEvolutionStage: () => 0, computeBirdMorphology: () => ({}),
    dayKey: () => 'today', EVO_NAMES: ['Chick', 'Bird'], EVO_THRESHOLDS: [0, 100],
    isEndlessUnlocked: (level: number) => level >= 6, retryPersistedStoreHydration: jest.fn(),
  }));
  const Screen = screen === 'home' ? require('../../app/(tabs)/index').default : require('../../app/(tabs)/levels').default;
  let tree!: ReactTestRenderer;
  await React.act(async () => { tree = renderer.create(React.createElement(Screen)); });
  const buttons = () => tree.root.findAllByType('TouchableOpacity' as never);
  const button = (label: string) => buttons().find(node => node.props.accessibilityLabel === label)!;
  const press = async (label: string) => {
    const target = button(label);
    expect(target).toBeDefined();
    expect(target.props.disabled).not.toBe(true);
    await React.act(async () => { target.props.onPress(); });
  };
  const pressText = async (text: string) => {
    const target = buttons().find(node => node.findAllByType('Text' as never).some(child => child.children.join('') === text));
    expect(target).toBeDefined();
    await React.act(async () => { target!.props.onPress(); });
  };
  return {
    push, button, buttons, press, pressText, act: React.act,
    modal: () => tree.root.findByType('Modal' as never),
    backdrop: () => tree.root.findAllByType('Pressable' as never).find(node => node.props.accessibilityLabel === 'Close game start options')!,
    unmount: async () => { await React.act(async () => { tree.unmount(); }); },
  };
}

const homeGames = [
  { label: 'Play Level 6', params: { mode: 'level', levelId: '6' } },
  { label: 'Play Endless Mode', params: { mode: 'endless' } },
  { label: "Play today's Daily Challenge", params: { mode: 'daily', levelId: '2', target: '17' } },
];

test('Home sky choices launch directly with unchanged level, Endless and daily parameters', async () => {
  const f = await fixture();
  for (const game of homeGames) {
    f.push.mockClear();
    await f.press(game.label);
    expect(f.modal().props.visible).toBe(false);
    expect(f.push).toHaveBeenCalledTimes(1);
    expect(f.push).toHaveBeenCalledWith({ pathname: '/game', params: { ...game.params, backgroundMode: 'sky' } });
  }
  await f.unmount();
});

test('Home camera choices wait for Play or Record & Play and preserve every game parameter', async () => {
  const f = await fixture();
  await f.press('Live Camera Background');
  for (const game of homeGames) {
    for (const record of [false, true]) {
      f.push.mockClear();
      await f.press(game.label);
      expect(f.push).not.toHaveBeenCalled();
      expect(f.modal().props.visible).toBe(true);
      await f.press(record ? 'Record and play with live camera' : 'Play with live camera');
      expect(f.modal().props.visible).toBe(false);
      expect(f.push).toHaveBeenCalledTimes(1);
      expect(f.push).toHaveBeenCalledWith({ pathname: '/game', params: {
        ...game.params, backgroundMode: 'camera', ...(record ? { record: '1' } : {}),
      } });
    }
  }
  expect(f.buttons().filter(node => node.props.accessibilityLabel?.startsWith('Record'))).toHaveLength(1);
  await f.unmount();
});

test('Cancel, backdrop and Android back dismiss Home choices without starting a run', async () => {
  const f = await fixture();
  await f.press('Live Camera Background');
  await f.press('Play Level 6');
  await f.press('Cancel');
  expect(f.modal().props.visible).toBe(false);
  await f.press('Play Level 6');
  await f.act(async () => { f.backdrop().props.onPress(); });
  expect(f.modal().props.visible).toBe(false);
  await f.press('Play Level 6');
  await f.act(async () => { f.modal().props.onRequestClose(); });
  expect(f.modal().props.visible).toBe(false);
  expect(f.push).not.toHaveBeenCalled();
  await f.unmount();
});

test('Home keeps Endless locked and does not offer a completed Daily Challenge', async () => {
  const f = await fixture('home', 1, true);
  expect(f.button('Endless Mode locked').props.disabled).toBe(true);
  expect(f.button('Endless Mode locked').props.onPress).toBeUndefined();
  expect(f.button("Play today's Daily Challenge")).toBeUndefined();
  await f.press('Live Camera Background');
  expect(f.button('Endless Mode locked').props.disabled).toBe(true);
  expect(f.modal().props.visible).toBe(false);
  expect(f.push).not.toHaveBeenCalled();
  await f.unmount();
});

test('Levels retains its direct sky launch and existing camera choices for levels and Endless', async () => {
  const f = await fixture('levels');
  await f.pressText('Course 1');
  expect(f.push).toHaveBeenLastCalledWith({ pathname: '/game', params: { mode: 'level', levelId: '1', backgroundMode: 'sky' } });
  await f.press('Live Camera Background');
  for (const [text, params] of [['Course 1', { mode: 'level', levelId: '1' }], ['Endless Mode', { mode: 'endless' }]] as const) {
    for (const record of [false, true]) {
      f.push.mockClear();
      await f.pressText(text);
      expect(f.push).not.toHaveBeenCalled();
      expect(f.modal().props.visible).toBe(true);
      await f.press(record ? 'Record and play with live camera' : 'Play with live camera');
      expect(f.push).toHaveBeenCalledWith({ pathname: '/game', params: { ...params, backgroundMode: 'camera', ...(record ? { record: '1' } : {}) } });
      expect(f.modal().props.visible).toBe(false);
    }
  }
  await f.unmount();
});
