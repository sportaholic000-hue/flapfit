import type { ReactTestInstance, ReactTestRenderer } from 'react-test-renderer';
import type { SessionRecord } from '@/utils/game/store';

jest.setTimeout(30_000);

function session(day: string, exercise: SessionRecord['exercise'], tutSeconds: number): SessionRecord {
  return { day, iso: day + 'T12:00:00.000Z', exercise, tutSeconds, score: 5, pushups: 0, mode: 'level', levelId: 1 };
}

const text = (node: ReactTestInstance): string => node.children.map(child =>
  typeof child === 'string' ? child : text(child)
).join('');

async function fixture(sessions: SessionRecord[]) {
  jest.resetModules();
  jest.useFakeTimers();
  // Late local evening exercises local-day handling rather than UTC date slicing.
  jest.setSystemTime(new Date(2026, 9, 15, 23, 30));
  const React: typeof import('react') = require('react');
  const renderer: typeof import('react-test-renderer') = require('react-test-renderer');
  jest.doMock('react-native', () => ({
    View: 'View', Text: 'Text', ScrollView: 'ScrollView', TouchableOpacity: 'TouchableOpacity',
  }));
  jest.doMock('expo-router', () => ({
    useFocusEffect: (effect: () => void) => React.useEffect(effect, [effect]),
  }));
  jest.doMock('expo-image', () => ({ Image: 'Image' }));
  jest.doMock('expo-status-bar', () => ({ StatusBar: () => null }));
  jest.doMock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
  jest.doMock('lucide-react-native', () => ({ CheckCircle2: 'Icon', ChevronDown: 'Icon', ChevronUp: 'Icon' }));
  jest.doMock('@/components/TabSkyBackground', () => ({ TabSkyBackground: () => null }));
  jest.doMock('@/components/BirdAvatar', () => ({ __esModule: true, default: () => null }));
  jest.doMock('@/components/AchievementCard', () => ({ AchievementCard: () => null }));
  jest.doMock('@/components/ChampionBadge', () => ({ ChampionBadge: () => null }));
  jest.doMock('@/components/RunCelebrations', () => ({ ChampionshipCeremony: () => null }));

  const real = jest.requireActual<typeof import('@/utils/game/store')>('@/utils/game/store');
  const exerciseTut = { ...real.useGameStore.getState().exerciseTut };
  for (const s of sessions) if (s.exercise) exerciseTut[s.exercise] += s.tutSeconds ?? 0;
  const state = {
    ...real.useGameStore.getState(), hydrated: true, sessions,
    dailyTut: real.deriveDailyTut(sessions), dailyExerciseTut: real.deriveDailyExerciseTut(sessions),
    totalTutSeconds: sessions.reduce((sum, s) => sum + (s.tutSeconds ?? 0), 0),
    exerciseTut, lastActivityDate: sessions[0]?.day ?? null,
  };
  const savedBefore = JSON.stringify(state);
  jest.doMock('@/utils/game/store', () => ({
    ...real, useGameStore: (select: (value: typeof state) => unknown) => select(state),
  }));
  const Screen = require('@/app/(tabs)/stats').default;
  let tree!: ReactTestRenderer;
  await React.act(async () => { tree = renderer.create(React.createElement(Screen)); });
  const texts = (scope = tree.root) => scope.findAllByType('Text' as never).map(text);
  const button = (label: string, last = false) => {
    const matches = tree.root.findAllByType('TouchableOpacity' as never).filter(node =>
      node.findAllByType('Text' as never).some(child => text(child) === label)
    );
    expect(matches.length).toBeGreaterThan(0);
    return matches[last ? matches.length - 1 : 0];
  };
  const press = async (label: string, last = false) => {
    await React.act(async () => { button(label, last).props.onPress(); });
  };
  let selected = 'All Exercises';
  return {
    tree, state,
    async exercise(label: string) {
      await press(selected);
      await press(label, true);
      selected = label;
    },
    window: (label: '7d' | '30d') => press(label),
    expectChart(total: string, expectedSeconds: number[], subtitle: string) {
      const heading = tree.root.findAllByType('Text' as never).find(node =>
        text(node) === selected + ' · Flying Time'
      );
      expect(heading).toBeDefined();
      const chart = heading!.parent!;
      expect(chart.findAllByType('Text' as never).filter(node => node.props.style?.fontSize === 22).map(text)).toEqual([total]);
      expect(texts(chart)).toContain(subtitle);
      expect(texts(chart).some(t => t.includes('sessions only') || t.includes('All exercises combined'))).toBe(false);
      const bars = chart.findAllByType('View' as never).filter(node => {
        const s = node.props.style;
        return s?.width === '100%' && s?.borderRadius === 4 && typeof s?.height === 'number';
      });
      expect(bars).toHaveLength(expectedSeconds.length);
      const maximum = Math.max(60, ...expectedSeconds);
      bars.forEach((bar, i) => expect(bar.props.style.height).toBeCloseTo(Math.max(4, expectedSeconds[i] / maximum * 184)));
    },
    expectLifetime(value: string) {
      const card = tree.root.findAll(node => typeof node.type === 'function' &&
        node.props.label?.toLowerCase() === 'training time')[0];
      expect(card).toBeDefined();
      expect(card.props.value).toBe(value);
      expect(JSON.stringify(state)).toBe(savedBefore);
      expect(texts()).not.toContain('Preview championship & achievements');
    },
    async finish() { await React.act(async () => tree.unmount()); jest.useRealTimers(); },
  };
}

afterEach(() => jest.useRealTimers());

test('inactive-week headline follows the visible window for All, push-ups and biceps while lifetime time remains', async () => {
  const f = await fixture([
    session('2026-10-06', 'pushups', 90), session('2026-10-06', 'biceps', 30),
    session('2026-09-01', 'pushups', 600), session('2026-09-01', 'biceps', 120),
  ]);
  try {
    for (const [label, seconds, formatted] of [
      ['All Exercises', 120, '2m 0s'], ['Push-ups', 90, '1m 30s'], ['Bicep Curls', 30, '30s'],
    ] as const) {
      await f.exercise(label);
      for (let repeat = 0; repeat < 2; repeat++) {
        await f.window('7d'); f.expectChart('0s', Array(7).fill(0), 'Last 7 days');
        await f.window('30d');
        const bars = Array(30).fill(0); bars[20] = seconds;
        f.expectChart(formatted, bars, 'Last 30 days');
        f.expectLifetime('14m 0s');
      }
    }
  } finally { await f.finish(); }
});

test('today, oldest included dates, first excluded dates and unattributed history use existing local-day boundaries', async () => {
  const f = await fixture([
    session('2026-10-15', 'pushups', 10), session('2026-10-15', 'biceps', 6),
    session('2026-10-09', 'pushups', 20), session('2026-10-09', 'biceps', 8),
    session('2026-10-08', 'pushups', 30), session('2026-10-08', 'biceps', 10),
    session('2026-09-16', 'pushups', 40), session('2026-09-16', 'biceps', 12),
    session('2026-09-15', 'pushups', 50), session('2026-09-15', 'biceps', 14),
    session('2026-10-12', undefined, 15),
  ]);
  try {
    for (const item of [
      { label: 'All Exercises', seven: '59s', month: '2m 31s', values: [52, 40, 28, 15, 16] },
      { label: 'Push-ups', seven: '30s', month: '1m 40s', values: [40, 30, 20, 0, 10] },
      { label: 'Bicep Curls', seven: '14s', month: '36s', values: [12, 10, 8, 0, 6] },
    ]) {
      await f.exercise(item.label);
      const [oldest30, excluded7, oldest7, legacy, today] = item.values;
      await f.window('7d');
      f.expectChart(item.seven, [oldest7, 0, 0, legacy, 0, 0, today], 'Last 7 days');
      await f.window('30d');
      const monthBars = Array(30).fill(0);
      monthBars[0] = oldest30; monthBars[22] = excluded7; monthBars[23] = oldest7;
      monthBars[26] = legacy; monthBars[29] = today;
      f.expectChart(item.month, monthBars, 'Last 30 days');
      f.expectLifetime('3m 35s');
    }
  } finally { await f.finish(); }
});

test('empty saved history remains zero through repeated period and exercise changes', async () => {
  const f = await fixture([]);
  try {
    for (const label of ['All Exercises', 'Push-ups', 'Bicep Curls', 'All Exercises']) {
      await f.exercise(label);
      for (const window of ['30d', '7d', '30d', '7d'] as const) {
        await f.window(window);
        const days = window === '7d' ? 7 : 30;
        f.expectChart('0s', Array(days).fill(0), 'Last ' + days + ' days');
        f.expectLifetime('0s');
      }
    }
  } finally { await f.finish(); }
});
