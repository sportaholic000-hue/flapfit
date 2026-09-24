import type { ReactTestRenderer } from 'react-test-renderer';

async function mount() {
  jest.resetModules();
  const React: typeof import('react') = require('react');
  const renderer: typeof import('react-test-renderer') = require('react-test-renderer');
  const { createLaunchUpdates } = require('@/services/launchUpdates');
  let finishCheck!: (value: object) => void;
  let finishDownload!: (value: object) => void;
  const sequence: string[] = [];
  const client = {
    isEnabled: true,
    checkForUpdateAsync: jest.fn(() => { sequence.push('check'); return new Promise(resolve => { finishCheck = resolve; }); }),
    fetchUpdateAsync: jest.fn(() => new Promise(resolve => { finishDownload = resolve; })),
    reloadAsync: jest.fn().mockResolvedValue(undefined),
  };
  const controller = createLaunchUpdates(() => client);
  jest.doMock('@/services/launchUpdates', () => ({ launchUpdates: controller }));
  const listeners = new Set<(state: string) => void>();
  const appState = { currentState: 'active', addEventListener: (_: string, listener: (state: string) => void) => {
    listeners.add(listener); return { remove: () => listeners.delete(listener) };
  } };
  jest.doMock('react-native', () => ({ View: 'View', Text: 'Text', TouchableOpacity: 'Button', ActivityIndicator: 'Spinner', AppState: appState }));
  const { LaunchUpdateGate } = require('../LaunchUpdateGate');
  function Router() { React.useEffect(() => { sequence.push('mount'); return () => { sequence.push('unmount'); }; }, []); return React.createElement('Router'); }
  let tree!: ReactTestRenderer;
  await React.act(async () => { tree = renderer.create(React.createElement(LaunchUpdateGate, null, React.createElement(Router))); });
  const check = async (isAvailable = true) => { await React.act(async () => finishCheck({ isAvailable })); };
  const press = async (text: string) => { await React.act(async () => {
    tree.root.findAllByType('Button' as never).find(node => node.findAllByType('Text' as never).some(label => label.children.join('') === text))!.props.onPress();
  }); };
  const change = async (state: string) => { await React.act(async () => {
    appState.currentState = state; [...listeners].forEach(listener => listener(state));
  }); };
  return { client, controller, check, press, change, sequence, listeners,
    routerVisible: () => tree.root.findAllByType('Router' as never).length === 1,
    request: async () => { await React.act(async () => { controller.requestCheck(); }); },
    finish: async () => { await React.act(async () => tree.unmount()); },
    download: async () => { await React.act(async () => finishDownload({ isNew: true })); },
  };
}

afterEach(() => { jest.dontMock('@/services/launchUpdates'); });

test('cold entry and foreground returns mount immediately without any OTA request or listener', async () => {
  const f = await mount();
  try {
    expect(f.routerVisible()).toBe(true);
    expect(f.listeners.size).toBe(0);
    await f.change('background'); await f.change('active');
    expect(f.client.checkForUpdateAsync).not.toHaveBeenCalled();
    expect(f.client.fetchUpdateAsync).not.toHaveBeenCalled();
    expect(f.client.reloadAsync).not.toHaveBeenCalled();
  } finally { await f.finish(); }
});

test('explicit check unmounts routes before networking; download completion in background waits to reload', async () => {
  const f = await mount();
  try {
    await f.request();
    expect(f.sequence).toEqual(['mount', 'unmount', 'check']);
    expect(f.routerVisible()).toBe(false);
    await f.check(); expect(f.routerVisible()).toBe(false);
    await f.press('Update now'); expect(f.routerVisible()).toBe(false);
    await f.change('background'); await f.download();
    expect(f.client.reloadAsync).not.toHaveBeenCalled(); expect(f.routerVisible()).toBe(false);
    await f.change('active');
    expect(f.client.reloadAsync).toHaveBeenCalledTimes(1); expect(f.routerVisible()).toBe(false);
  } finally { await f.finish(); }
});

test('Later restores entry, removes lifecycle listeners and never checks on foreground', async () => {
  const f = await mount();
  try {
    await f.request(); await f.check(); await f.press('Later');
    expect(f.routerVisible()).toBe(true);
    expect(f.listeners.size).toBe(0);
    await f.change('background'); await f.change('active');
    expect(f.client.checkForUpdateAsync).toHaveBeenCalledTimes(1);
    expect(f.client.fetchUpdateAsync).not.toHaveBeenCalled();
  } finally { await f.finish(); }
});

test('no-update result gives feedback and Continue restores entry', async () => {
  const f = await mount();
  try {
    await f.request(); await f.check(false);
    expect(f.routerVisible()).toBe(false);
    await f.press('Continue'); expect(f.routerVisible()).toBe(true);
    expect(f.client.reloadAsync).not.toHaveBeenCalled();
  } finally { await f.finish(); }
});
