import type { ReactTestRenderer } from 'react-test-renderer';
jest.setTimeout(20_000);

async function fixture(first: { status: string; reason?: string } = { status: 'unanswered', reason: 'age' }) {
  jest.resetModules();
  const React: typeof import('react') = require('react');
  const renderer: typeof import('react-test-renderer') = require('react-test-renderer');
  const { act } = React;
  const listeners = new Set<(state: string) => void>();
  const appState = { currentState: 'active', addEventListener: jest.fn((_event, listener) => { listeners.add(listener); return { remove: () => listeners.delete(listener) }; }) };
  jest.doMock('react-native', () => ({ View: 'View', ScrollView: 'ScrollView', Text: 'Text', ActivityIndicator: 'ActivityIndicator', TouchableOpacity: 'TouchableOpacity', Platform: { OS: 'ios' }, AppState: appState }));
  jest.doMock('expo-image', () => ({ Image: 'Image' }));
  jest.doMock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
  jest.doMock('react-native-svg', () => ({ __esModule: true, default: 'Svg', Path: 'Path' }));
  jest.doMock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 24, bottom: 20, left: 0, right: 0 }) }));
  const replace = jest.fn(); jest.doMock('expo-router', () => ({ useRouter: () => ({ replace }) }));
  const openChoices = jest.fn().mockResolvedValue(undefined);
  const cancelChoices = jest.fn();
  jest.doMock('../PrivacyChoices', () => ({ usePrivacyChoicesSheet: () => ({ openChoices, cancelChoices, privacyChoicesSheet: null }) }));
  let completedRun = false;
  const hasCompletedRun = () => completedRun;
  const authorize = jest.fn().mockResolvedValue(first);
  const settleNative = jest.fn().mockResolvedValue(undefined);
  const retry = jest.fn().mockResolvedValue(undefined);
  jest.doMock('@/services/privacy/gameEntry', () => ({ authorizeGameEntry: authorize }));
  jest.doMock('@/services/monetization', () => ({ settlePrivacyBeforeGameplay: settleNative }));
  jest.doMock('@/services/privacy/retryGameEligibility', () => ({ retryGameEligibility: retry }));
  jest.doMock('@/services/privacy/processingNotice', () => ({ restoreProcessingNotice: jest.fn().mockResolvedValue(undefined) }));
  jest.doMock('@/services/privacy/regionalClarification', () => ({ restoreRegionalClarification: jest.fn().mockResolvedValue(undefined) }));
  jest.doMock('@/services/privacy/localAgeAnswer', () => ({ restoreLocalAgeAnswer: jest.fn().mockResolvedValue(undefined) }));
  jest.doMock('@/services/privacy/newYorkClarification', () => ({ restoreNewYorkClarification: jest.fn().mockResolvedValue(undefined) }));
  const { GameEligibilityGate }: typeof import('../GameEligibilityGate') = require('../GameEligibilityGate');
  let tree: ReactTestRenderer; let newRun!: () => void; let prepareEntry!: () => Promise<void>;
  const mount = async (strict = false) => {
    const child = (next: () => void, prepare: () => Promise<void>) => { newRun = next; prepareEntry = prepare; return React.createElement('Text', null, 'Game running'); };
    const gate = <GameEligibilityGate hasCompletedRun={hasCompletedRun}>{child}</GameEligibilityGate>;
    await act(async () => { tree = renderer.create(strict ? React.createElement(React.StrictMode, null, gate) : gate); });
  };
  const text = () => tree.root.findAllByType('Text' as never).map(node => node.children.join('')).join('\n');
  const press = async (title: string) => {
    const button = tree.root.findAllByType('TouchableOpacity' as never).find(node => node.findAllByType('Text' as never).some(child => child.children.join('') === title));
    expect(button).toBeDefined(); await act(async () => { button!.props.onPress(); });
  };
  const change = async (state: string) => { await act(async () => { appState.currentState = state; [...listeners].forEach(listener => listener(state)); }); };
  const unmount = async () => { await act(async () => { tree.unmount(); }); };
  return { openChoices, cancelChoices, completeRun: () => { completedRun = true; }, json: () => tree.toJSON(), mount, text, press, change, unmount, authorize, settleNative, retry, replace, act, next: () => newRun(), prepare: () => prepareEntry() };
}

test('unanswered entry renders recovery and Back; neither is a consent or a game-start action', async () => {
  const f = await fixture(); await f.mount();
  expect(f.text()).toContain('Complete the required Apple age check before another game');
  expect(f.text()).not.toContain('Game running');
  await f.press('Review in Info'); expect(f.replace).toHaveBeenLastCalledWith('/(tabs)/info');
  await f.press('Back to Home'); expect(f.replace).toHaveBeenLastCalledWith('/(tabs)');
  expect(f.retry).not.toHaveBeenCalled(); expect(f.authorize).toHaveBeenCalledTimes(1);
  await f.unmount();
});
test('a real retry recovers eligibility; opening the gate does not automatically request age', async () => {
  const f = await fixture({ status: 'unanswered', reason: 'age' }); await f.mount();
  expect(f.retry).not.toHaveBeenCalled();
  f.authorize.mockResolvedValue({ status: 'available' }); await f.press('Retry check');
  expect(f.retry).toHaveBeenCalledTimes(1); expect(f.text()).toContain('Game running');
  await f.unmount();
});

test('the prepared-game boundary still honors an Apple access restriction before play', async () => {
  const f = await fixture({ status: 'available' }); await f.mount();
  expect(f.authorize).toHaveBeenLastCalledWith(false);
  f.authorize.mockRejectedValueOnce(new Error('claim write failed'));
  await expect(f.prepare()).rejects.toThrow('claim write failed');
  expect(f.authorize).toHaveBeenLastCalledWith(false);
  await f.act(async () => { await f.prepare(); });
  f.authorize.mockResolvedValueOnce({ status: 'unavailable', reason: 'apple' });
  await f.act(async () => { await expect(f.prepare()).rejects.toThrow('Review availability'); });
  expect(f.text()).toContain('Apple account access must be restored');
  expect(f.text()).not.toContain('Game running');
  await f.unmount();
});
test('foreground refresh does not interrupt an admitted game or its recording', async () => {
  const f = await fixture({ status: 'available' }); await f.mount();
  f.authorize.mockResolvedValue({ status: 'unanswered', reason: 'country' });
  await f.change('background'); await f.change('active');
  expect(f.authorize).toHaveBeenCalledTimes(1); expect(f.text()).toContain('Game running');
  await f.unmount();
});
test('Retry or Next rechecks eligibility exactly once, even if an old callback fires twice', async () => {
  const f = await fixture({ status: 'available' }); await f.mount();
  f.authorize.mockResolvedValue({ status: 'unanswered', reason: 'age' });
  await f.act(async () => { f.next(); f.next(); });
  expect(f.authorize).toHaveBeenCalledTimes(2);
  expect(f.text()).not.toContain('Game running'); expect(f.text()).toContain('Complete the required Apple age check');
  await f.unmount();
});
test('pending native dismissal is awaited, and unmount cancels a late game-start continuation', async () => {
  const f = await fixture({ status: 'available' });
  let dismiss!: () => void; f.settleNative.mockReturnValueOnce(new Promise<void>(done => { dismiss = done; }));
  await f.mount(); expect(f.authorize).not.toHaveBeenCalled();
  await f.unmount(); await f.act(async () => { dismiss(); });
  expect(f.authorize).not.toHaveBeenCalled(); expect(f.replace).not.toHaveBeenCalled();
});
test('background during entry can recover on return without a permanently stuck exit', async () => {
  const f = await fixture({ status: 'available' });
  let dismiss!: () => void; f.settleNative.mockReturnValueOnce(new Promise<void>(done => { dismiss = done; }));
  await f.mount(); await f.change('background'); await f.act(async () => { dismiss(); });
  expect(f.authorize).not.toHaveBeenCalled();
  await f.change('active'); expect(f.text()).toContain('Game running');
  await f.unmount();
});
test('failed storage check displays a retry and strict effect remount does not leave a spinner stuck', async () => {
  const f = await fixture({ status: 'available' });
  f.authorize.mockRejectedValueOnce(new Error('read failed'));
  await f.mount(); expect(f.text()).toContain('Game access could not be checked');
  await f.press('Retry check'); expect(f.text()).toContain('Game running'); await f.unmount();
  await f.mount(true); expect(f.text()).toContain('Game running'); await f.unmount();
});

const previewGates: unknown[] = [];
afterAll(() => {
  const output = process.env.FLAPFIT_PRIVACY_PREVIEW_OUTPUT;
  if (output) require('node:fs').writeFileSync(require('node:path').join(require('node:path').dirname(output), 'gates.json'), JSON.stringify(previewGates, null, 2) + '\n');
});
test.each([
  { label: 'Under 13', status: 'unavailable', reason: 'age' },
  { label: 'Required Apple age check', status: 'unanswered', reason: 'age' },
  { label: 'Apple account access restriction', status: 'unavailable', reason: 'apple' },
])('captures the common $label screen without an advertising message', async ({ label, status, reason }) => {
  const f = await fixture({ status, reason }); await f.mount();
  expect(f.text()).not.toMatch(/advertis|\bads\b/i);
  previewGates.push({ label, text: f.text(), tree: f.json() });
  await f.unmount();
});
test('captures the common availability error screen', async () => {
  const f = await fixture(); f.authorize.mockRejectedValueOnce(new Error('test failure')); await f.mount();
  expect(f.text()).not.toMatch(/advertis|\bads\b/i);
  previewGates.push({ label: 'Availability check could not complete', text: f.text(), tree: f.json() });
  await f.unmount();
});

test('repeat-run setup dismissal cannot mount gameplay; a later completed setup can', async () => {
  const f = await fixture({ status: 'available' }); await f.mount();
  f.completeRun(); f.authorize.mockResolvedValue({ status: 'setup-required' });
  await f.act(async () => { f.next(); });
  expect(f.authorize).toHaveBeenLastCalledWith(true);
  expect(f.text()).toContain('Almost ready to fly'); expect(f.text()).not.toContain('Game running');
  await f.press('Finish setup');
  expect(f.openChoices).toHaveBeenCalledTimes(1);
  expect(f.text()).toContain('Almost ready to fly'); expect(f.text()).not.toContain('Game running');
  f.openChoices.mockImplementationOnce(async () => { f.authorize.mockResolvedValue({ status: 'available' }); });
  await f.press('Finish setup'); expect(f.text()).toContain('Game running');
  await f.unmount();
});

test('leaving during setup prevents a late sheet dismissal from starting a game', async () => {
  const f = await fixture({ status: 'setup-required' }); f.completeRun(); await f.mount();
  let close!: () => void; f.openChoices.mockReturnValueOnce(new Promise<void>(done => { close = done; }));
  await f.press('Finish setup'); const before = f.authorize.mock.calls.length;
  await f.unmount(); f.authorize.mockResolvedValue({ status: 'available' });
  await f.act(async () => { close(); }); expect(f.authorize).toHaveBeenCalledTimes(before);
  expect(f.cancelChoices).toHaveBeenCalled();
});

test('captures incomplete setup without advertising-outcome wording', async () => {
  const f = await fixture({ status: 'setup-required' }); await f.mount();
  expect(f.text()).not.toMatch(/advertis|\bads\b|Quebec|Connecticut|New York/i);
  previewGates.push({ label: 'Unfinished setup after initial run', text: f.text(), tree: f.json() });
  await f.unmount();
});
