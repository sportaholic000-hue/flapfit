import type { ReactTestRenderer } from 'react-test-renderer';

async function mount(platform = 'android', delayed = false) {
  jest.resetModules();
  const React: typeof import('react') = require('react');
  const renderer: typeof import('react-test-renderer') = require('react-test-renderer');
  const FocusContext = React.createContext(true);
  let focused = true;
  const pending: Array<() => void> = [];
  const activate = jest.fn((_tag: string) => delayed
    ? new Promise<void>(resolve => pending.push(resolve))
    : Promise.resolve());
  const deactivate = jest.fn((_tag: string) => Promise.resolve());
  const listeners = new Set<(state: string) => void>();
  const appState = { currentState: 'active', addEventListener: jest.fn((_event: string, listener: (state: string) => void) => { listeners.add(listener); return { remove: () => listeners.delete(listener) }; }) };
  jest.doMock('react-native', () => ({ Platform: { OS: platform }, AppState: appState }));
  jest.doMock('expo-keep-awake', () => ({
    activateKeepAwakeAsync: activate,
    deactivateKeepAwake: deactivate,
  }));
  jest.doMock('expo-router', () => ({
    useFocusEffect: (effect: () => (() => void) | undefined) => {
      const isFocused = React.useContext(FocusContext);
      React.useEffect(() => isFocused ? effect() : undefined, [effect, isFocused]);
    },
  }));
  const { GameScreenAwake } = require('../GameScreenAwake');
  function Run({ finished }: { finished: boolean }) {
    return finished ? null : React.createElement(GameScreenAwake);
  }
  const element = (finished = false) => React.createElement(
    FocusContext.Provider, { value: focused }, React.createElement(Run, { finished }),
  );
  let tree!: ReactTestRenderer;
  await React.act(async () => { tree = renderer.create(element()); });
  const render = async (finished = false) => {
    await React.act(async () => tree.update(element(finished)));
  };
  return {
    activate, deactivate, render,
    appState: async (state: string) => { await React.act(async () => { appState.currentState = state; for (const listener of listeners) listener(state); }); },
    focus: async (value: boolean) => { focused = value; await render(); },
    resolve: async (index: number) => { await React.act(async () => { pending[index](); }); },
    finish: async () => { await React.act(async () => tree.unmount()); },
  };
}

afterEach(() => {
  jest.dontMock('react-native');
  jest.dontMock('expo-router');
  jest.dontMock('expo-keep-awake');
});

test('keeps a focused Android run awake through rerenders, releases at results and reacquires for retry', async () => {
  const f = await mount();
  try {
    expect(f.activate).toHaveBeenCalledTimes(1);
    const first = f.activate.mock.calls[0][0];
    await f.render();
    await f.render();
    expect(f.activate).toHaveBeenCalledTimes(1);
    expect(f.deactivate).not.toHaveBeenCalled();
    await f.render(true);
    expect(f.deactivate).toHaveBeenCalledWith(first);
    await f.render(false);
    expect(f.activate).toHaveBeenCalledTimes(2);
    expect(f.activate.mock.calls[1][0]).not.toBe(first);
  } finally { await f.finish(); }
});

test('releases on navigation blur and reacquires on focus, then releases on unmount', async () => {
  const f = await mount();
  const first = f.activate.mock.calls[0][0];
  await f.focus(false);
  expect(f.deactivate).toHaveBeenCalledWith(first);
  await f.focus(true);
  const second = f.activate.mock.calls[1][0];
  expect(second).not.toBe(first);
  await f.finish();
  expect(f.deactivate).toHaveBeenCalledWith(second);
});

test('a late activation after leaving cannot leak or release the next focused run', async () => {
  const f = await mount('android', true);
  try {
    const oldTag = f.activate.mock.calls[0][0];
    await f.focus(false);
    await f.focus(true);
    const newTag = f.activate.mock.calls[1][0];
    await f.resolve(0);
    expect(f.deactivate).toHaveBeenLastCalledWith(oldTag);
    expect(f.deactivate).not.toHaveBeenCalledWith(newTag);
    await f.resolve(1);
    expect(f.deactivate).not.toHaveBeenCalledWith(newTag);
  } finally { await f.finish(); }
});

test.each(['ios', 'web'])('does not change %s wake behavior in this Android candidate', async platform => {
  const f = await mount(platform);
  try {
    await f.render();
    expect(f.activate).not.toHaveBeenCalled();
    expect(f.deactivate).not.toHaveBeenCalled();
  } finally { await f.finish(); }
});

 test('Android background releases immediately and foreground reacquires without late-tag leaks', async () => {
  const f = await mount('android', true);
  try {
    const first = f.activate.mock.calls[0][0];
    await f.appState('background'); expect(f.deactivate).toHaveBeenCalledWith(first);
    await f.appState('active'); const next = f.activate.mock.calls[1][0]; expect(next).not.toBe(first);
    await f.resolve(0); expect(f.deactivate).toHaveBeenLastCalledWith(first); expect(f.deactivate).not.toHaveBeenCalledWith(next);
    await f.resolve(1); await f.appState('active'); expect(f.activate).toHaveBeenCalledTimes(2);
    await f.focus(false); await f.appState('background'); await f.appState('active'); expect(f.activate).toHaveBeenCalledTimes(2);
  } finally { await f.finish(); }
});
