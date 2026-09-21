import type { ReactTestRenderer } from 'react-test-renderer';
jest.setTimeout(20_000);

async function fixture(first: { status: string; reason?: string } = { status: 'unanswered', reason: 'age' }) {
  jest.resetModules();
  const React: typeof import('react') = require('react');
  const renderer: typeof import('react-test-renderer') = require('react-test-renderer');
  const { act } = React;
  const listeners = new Set<(state: string) => void>();
  const appState = { currentState: 'active', addEventListener: jest.fn((_event, listener) => { listeners.add(listener); return { remove: () => listeners.delete(listener) }; }) };
  jest.doMock('react-native', () => ({ View: 'View', Text: 'Text', ActivityIndicator: 'ActivityIndicator', TouchableOpacity: 'TouchableOpacity', Platform: { OS: 'ios' }, AppState: appState }));
  const replace = jest.fn(); jest.doMock('expo-router', () => ({ useRouter: () => ({ replace }) }));
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
    const gate = <GameEligibilityGate>{child}</GameEligibilityGate>;
    await act(async () => { tree = renderer.create(strict ? React.createElement(React.StrictMode, null, gate) : gate); });
  };
  const text = () => tree.root.findAllByType('Text' as never).map(node => node.children.join('')).join('\n');
  const press = async (title: string) => {
    const button = tree.root.findAllByType('TouchableOpacity' as never).find(node => node.findAllByType('Text' as never).some(child => child.children.join('') === title));
    expect(button).toBeDefined(); await act(async () => { button!.props.onPress(); });
  };
  const change = async (state: string) => { await act(async () => { appState.currentState = state; [...listeners].forEach(listener => listener(state)); }); };
  const unmount = async () => { await act(async () => { tree.unmount(); }); };
  return { mount, text, press, change, unmount, authorize, settleNative, retry, replace, act, next: () => newRun(), prepare: () => prepareEntry() };
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
  expect(f.authorize.mock.calls[0]).toHaveLength(0);
  f.authorize.mockRejectedValueOnce(new Error('claim write failed'));
  await expect(f.prepare()).rejects.toThrow('claim write failed');
  expect(f.authorize).toHaveBeenLastCalledWith();
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
