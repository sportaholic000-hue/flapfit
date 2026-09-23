import type { ReactTestRenderer } from 'react-test-renderer';

jest.setTimeout(20_000);

async function fixture(requiredInitially = true) {
  jest.resetModules();
  const React: typeof import('react') = require('react');
  const renderer: typeof import('react-test-renderer') = require('react-test-renderer');
  let required = requiredInitially;
  const listeners = new Set<() => void>();
  const show = jest.fn<Promise<void>, [(() => boolean)?]>().mockResolvedValue(undefined);
  const refresh = jest.fn().mockResolvedValue(undefined);
  const openURL = jest.fn();
  const alert = jest.fn();
  jest.doMock('@/services/monetization', () => ({
    isAdPrivacyRequired: () => required,
    subscribeAdPrivacy: (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener); },
    refreshAdPrivacyRequirement: refresh,
    showAdPrivacyOptions: show,
  }));
  jest.doMock('react-native', () => ({
    View: 'View', Text: 'Text', ScrollView: 'ScrollView', TouchableOpacity: 'TouchableOpacity', Modal: 'Modal',
    StyleSheet: { create: (value: unknown) => value }, Platform: { OS: 'ios', Version: '26' },
    Alert: { alert }, Linking: { openURL }, Share: { share: jest.fn() },
  }));
  jest.doMock('expo-router', () => ({
    useRouter: () => ({ push: jest.fn() }),
    useFocusEffect: (callback: () => (() => void)) => React.useEffect(callback, [callback]),
  }));
  jest.doMock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '1.0.0' } } }));
  jest.doMock('expo-status-bar', () => ({ StatusBar: () => null }));
  jest.doMock('@tanstack/react-query', () => ({ useQueryClient: () => ({ removeQueries: jest.fn() }) }));
  jest.doMock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
  jest.doMock('lucide-react-native', () => Object.fromEntries([
    'Camera', 'ChevronRight', 'CircleHelp', 'Clock3', 'FileText', 'KeyRound', 'Mail', 'MessageSquareWarning',
    'Settings', 'Share2', 'ShieldCheck', 'Smartphone', 'Trash2', 'TriangleAlert', 'X',
  ].map(name => [name, () => null])));
  jest.doMock('@/components/BirdAvatar', () => ({ __esModule: true, default: () => null }));
  jest.doMock('@/components/PrivacyChoices', () => ({ PrivacyChoices: 'PrivacyChoices' }));
  jest.doMock('@/services/competitionApi', () => ({ competitionIsConfigured: () => true }));
  jest.doMock('@/utils/game/birds', () => ({ getBird: () => ({}) }));
  jest.doMock('@/utils/game/store', () => ({
    EVO_NAMES: [], EVO_THRESHOLDS: [],
    useGameStore: (select: (state: { birdId: string; resetCompetitionProfile: () => void }) => unknown) =>
      select({ birdId: 'test', resetCompetitionProfile: jest.fn() }),
  }));
  const Info = require('../../app/(tabs)/info').default;
  let tree!: ReactTestRenderer;
  await React.act(async () => { tree = renderer.create(React.createElement(Info)); });
  const rows = () => tree.root.findAllByType('TouchableOpacity' as never);
  const privacyRows = () => rows().filter(node => node.props.accessibilityLabel?.startsWith('Manage Privacy Choices'));
  const text = () => tree.root.findAllByType('Text' as never).map(node => node.children.join('')).join('\n');
  return { show, refresh, openURL, alert, privacyRows, text,
    press: async () => { await React.act(async () => { privacyRows()[0].props.onPress(); }); },
    setRequired: async (value: boolean) => { await React.act(async () => { required = value; listeners.forEach(fn => fn()); }); },
    act: React.act,
    unmount: async () => { await React.act(async () => tree.unmount()); },
  };
}

test('Info has one direct Google privacy action and no email/code workflow', async () => {
  const f = await fixture();
  expect(f.refresh).toHaveBeenCalledTimes(1);
  expect(f.privacyRows()).toHaveLength(1);
  expect(f.privacyRows()[0].props.accessibilityLabel).toBe('Manage Privacy Choices');
  expect(f.text()).not.toMatch(/Privacy requests|Contact privacy support|response code|Ad privacy settings|Non-personalized ads support/);
  await f.press();
  expect(f.show).toHaveBeenCalledTimes(1);
  expect(f.show.mock.calls[0][0]!()).toBe(true);
  expect(f.openURL).not.toHaveBeenCalled();
  await f.unmount();
  expect(f.show.mock.calls[0][0]!()).toBe(false);
});

test('Google requirement state automatically shows and hides the Info action', async () => {
  const f = await fixture(false);
  expect(f.privacyRows()).toHaveLength(0);
  await f.setRequired(true); expect(f.privacyRows()).toHaveLength(1);
  await f.setRequired(false); expect(f.privacyRows()).toHaveLength(0);
  expect(f.show).not.toHaveBeenCalled(); expect(f.openURL).not.toHaveBeenCalled();
  await f.unmount();
});

test('a pending native privacy form disables repeated taps and re-enables on dismissal', async () => {
  const f = await fixture();
  let finish!: () => void;
  f.show.mockReturnValueOnce(new Promise<void>(resolve => { finish = resolve; }));
  await f.press();
  expect(f.privacyRows()[0].props.disabled).toBe(true);
  await f.press(); expect(f.show).toHaveBeenCalledTimes(1);
  await f.act(async () => { finish(); });
  expect(f.privacyRows()[0].props.disabled).toBe(false);
  await f.unmount();
});

test('a Google form failure leaves an actionable retry without composing an email', async () => {
  const f = await fixture(); f.show.mockRejectedValueOnce(new Error('offline'));
  await f.press();
  expect(f.alert).toHaveBeenCalledWith('Privacy settings unavailable', expect.stringContaining('try again'));
  expect(f.privacyRows()[0].props.disabled).toBe(false);
  expect(f.openURL).not.toHaveBeenCalled();
  await f.press(); expect(f.show).toHaveBeenCalledTimes(2);
  await f.unmount();
});
