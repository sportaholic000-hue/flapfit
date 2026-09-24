import type { ReactTestRenderer } from 'react-test-renderer';

async function mount() {
  jest.resetModules();
  const React: typeof import('react') = require('react');
  const renderer: typeof import('react-test-renderer') = require('react-test-renderer');
  const { createLaunchUpdates } = require('@/services/launchUpdates');
  let finishCheck!: (value: object) => void;
  let finishDownload!: (value: object) => void;
  const client = {
    isEnabled: true,
    checkForUpdateAsync: jest.fn(() => new Promise(resolve => { finishCheck = resolve; })),
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
  const childMounted = jest.fn();
  function Router() { React.useEffect(() => { childMounted(); }, []); return React.createElement('Router'); }
  let tree!: ReactTestRenderer;
  await React.act(async () => { tree = renderer.create(React.createElement(LaunchUpdateGate, null, React.createElement(Router))); });
  const check = async () => { await React.act(async () => finishCheck({ isAvailable: true })); };
  const press = async (text: string) => { await React.act(async () => {
    tree.root.findAllByType('Button' as never).find(node => node.findAllByType('Text' as never).some(label => label.children.join('') === text))!.props.onPress();
  }); };
  const change = async (state: string) => { await React.act(async () => {
    appState.currentState = state; [...listeners].forEach(listener => listener(state));
  }); };
  return { client, controller, check, press, change, childMounted, listeners,
    finish: async () => { await React.act(async () => tree.unmount()); },
    download: async () => { await React.act(async () => finishDownload({ isNew: true })); },
  };
}

afterEach(() => { jest.dontMock('@/services/launchUpdates'); });

test('router/camera routes cannot mount during a check, offer, or download; background completion waits for foreground to reload', async () => {
  const f = await mount();
  try {
    expect(f.childMounted).not.toHaveBeenCalled();
    await f.check(); expect(f.childMounted).not.toHaveBeenCalled();
    await f.press('Update now'); expect(f.childMounted).not.toHaveBeenCalled();
    await f.change('background'); await f.download();
    expect(f.client.reloadAsync).not.toHaveBeenCalled(); expect(f.childMounted).not.toHaveBeenCalled();
    await f.change('active');
    expect(f.client.reloadAsync).toHaveBeenCalledTimes(1); expect(f.childMounted).not.toHaveBeenCalled();
  } finally { await f.finish(); }
});

test('Later mounts the app, removes lifecycle listeners, and never checks or downloads on foreground again', async () => {
  const f = await mount();
  try {
    await f.check(); await f.press('Later');
    expect(f.childMounted).toHaveBeenCalledTimes(1);
    expect(f.listeners.size).toBe(0);
    await f.change('background'); await f.change('active');
    expect(f.client.checkForUpdateAsync).toHaveBeenCalledTimes(1);
    expect(f.client.fetchUpdateAsync).not.toHaveBeenCalled();
  } finally { await f.finish(); }
});
