import type { ReactTestRenderer } from 'react-test-renderer';

// Render the real RootLayout -> Home Play button -> GameScreen -> eligibility gate.
// Native rendering, router transport and provider SDK boundaries are test adapters;
// startup, eligibility, saved-age restoration and monetization controllers are real.
const settle = async () => { for (let i = 0; i < 80; i++) await Promise.resolve(); };
const originalEnv = { ...process.env };
jest.setTimeout(30_000);

type CameraTestStatus = 'undetermined' | 'granted' | 'denied';
async function mountApp(saved: string | null, options: {
  delayed?: boolean; failRead?: boolean; offline?: boolean; completedRun?: boolean; playable?: boolean;
  cameraStatus?: CameraTestStatus; cameraCanAskAgain?: boolean; cameraResponse?: CameraTestStatus;
  cameraSettingsStatus?: CameraTestStatus; platform?: 'ios' | 'android';
} = {}) {
  jest.resetModules(); jest.useFakeTimers();
  const React: typeof import('react') = require('react');
  const renderer: typeof import('react-test-renderer') = require('react-test-renderer');
  const { act } = React;
  process.env.EXPO_PUBLIC_ADS_MODE = 'test';
  const memory = new Map<string, string>();
  if (saved !== null) memory.set('@flapfit/local-age-answer-v1', saved);
  let releaseRead!: () => void;
  const readBarrier = options.delayed ? new Promise<void>(done => { releaseRead = done; }) : Promise.resolve();
  const storage = {
    getItem: jest.fn(async (key: string) => {
      if (key === '@flapfit/local-age-answer-v1') {
        await readBarrier;
        if (options.failRead) throw new Error('Local storage unavailable');
      }
      return memory.get(key) ?? null;
    }),
    setItem: jest.fn(async (key: string, value: string) => { memory.set(key, value); }),
    removeItem: jest.fn(async (key: string) => { memory.delete(key); }),
  };
  jest.doMock('@react-native-async-storage/async-storage', () => storage);
  const listeners = new Set<(state: string) => void>();
  const appState = { currentState: 'active', addEventListener: jest.fn((_event, listener) => { listeners.add(listener); return { remove: () => listeners.delete(listener) }; }) };
  const animation = () => ({ start: jest.fn(), stop: jest.fn() });
  const openSettings = jest.fn().mockResolvedValue(undefined);
  const platform = options.platform ?? 'ios';
  jest.doMock('react-native', () => ({
    View: 'View', Text: 'Text', ScrollView: 'ScrollView', TouchableOpacity: 'TouchableOpacity', ActivityIndicator: 'ActivityIndicator',
    Platform: { OS: platform, Version: '18.6', select: (values: Record<string, unknown>) => values[platform] ?? values.default }, AppState: appState,
    Alert: { alert: jest.fn() }, Linking: { openSettings }, Share: {}, StyleSheet: { create: (styles: unknown) => styles },
    Animated: { Value: class { interpolate = jest.fn(); setValue = jest.fn(); }, View: 'View', timing: animation, loop: animation, sequence: animation },
    Easing: { linear: jest.fn(), out: jest.fn(), quad: jest.fn() }, useWindowDimensions: () => ({ width: 390, height: 844 }),
    TurboModuleRegistry: { get: () => null }, NativeModules: { RNPurchases: { flapFitSetProcessingAllowed: jest.fn().mockResolvedValue(true), flapFitSetNetworkPaused: jest.fn().mockResolvedValue(true) } },
  }));
  jest.doMock('lucide-react-native', () => new Proxy({}, { get: (_target, key) => key === '__esModule' ? true : String(key) }));
  jest.doMock('react-native-svg', () => new Proxy({}, { get: (_target, key) => key === '__esModule' ? true : String(key) }));
  jest.doMock('expo-constants', () => ({ __esModule: true, default: { executionEnvironment: 'standalone', expoConfig: {} }, ExecutionEnvironment: { StoreClient: 'storeClient' } }));
  jest.doMock('../../../../modules/flap-fit-age-range', () => ({ ...jest.requireActual('../../../../modules/flap-fit-age-range/src/gates'),
    getAppleAgeRequirements: jest.fn().mockResolvedValue({ status: 'unsupported', ageRangeSupported: false }), requestAppleAgeRange: jest.fn() }));
  const adLoad = jest.fn(() => { throw new Error('Advertising SDK must not load at game entry'); });
  const rcLoad = jest.fn(() => { throw new Error('Reporting SDK must not load at game entry'); });
  jest.doMock('react-native-google-mobile-ads', adLoad); jest.doMock('react-native-purchases', rcLoad);
  jest.doMock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
  jest.doMock('expo-image', () => ({ Image: 'Image' }));
  jest.doMock('expo-status-bar', () => ({ StatusBar: 'StatusBar' }));
  jest.doMock('expo-splash-screen', () => ({ preventAutoHideAsync: jest.fn().mockResolvedValue(undefined), hideAsync: jest.fn().mockResolvedValue(undefined) }));
  jest.doMock('react-native-gesture-handler', () => ({ GestureHandlerRootView: 'View' }));
  jest.doMock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
  jest.doMock('react-native-webview', () => ({ WebView: 'WebView' }));
  jest.doMock('@/components/BirdAvatar', () => ({ __esModule: true, default: 'BirdAvatar' }));
  const sheet = { openChoices: jest.fn(), cancelChoices: jest.fn(), privacyChoicesSheet: null };
  jest.doMock('@/components/PrivacyChoices', () => ({ usePrivacyChoicesSheet: () => sheet }));
  jest.doMock('@/services/competitionApi', () => ({ startCompetitionForegroundRetry: () => () => {}, competitionIsConfigured: () => false }));
  jest.doMock('@/services/recordingCache', () => ({ startRecordingCacheCleanup: () => () => {}, discardGameplayRecordingFile: jest.fn() }));
  jest.doMock('@/services/videoSharing', () => ({ getVideoShareAvailability: jest.fn().mockResolvedValue({}) }));
  jest.doMock('@/utils/game/mediapipeAssets', () => ({ prepareMediaPipeAssets: () => options.playable ? Promise.resolve({}) : new Promise(() => {}) }));
  jest.doMock('@/utils/game/birdWebAsset', () => ({ loadBirdAssetDataUri: () => options.playable ? Promise.resolve('data:image/png;base64,test') : new Promise(() => {}) }));
  const cameraSnapshot = (status: CameraTestStatus) => ({ status, granted: status === 'granted',
    canAskAgain: status === 'denied' ? options.cameraCanAskAgain ?? false : true });
  let nativeCamera = cameraSnapshot(options.cameraStatus ?? (options.playable ? 'granted' : 'undetermined'));
  let updateCamera: ((value: typeof nativeCamera) => void) | undefined;
  const requestCameraPermission = jest.fn(async () => {
    nativeCamera = cameraSnapshot(options.cameraResponse ?? 'denied');
    updateCamera?.(nativeCamera); return nativeCamera;
  });
  const getCameraPermission = jest.fn(async () => {
    if (options.cameraSettingsStatus) nativeCamera = cameraSnapshot(options.cameraSettingsStatus);
    updateCamera?.(nativeCamera); return nativeCamera;
  });
  const camera = jest.fn(() => {
    const [permission, setPermission] = React.useState(nativeCamera); updateCamera = setPermission;
    return [permission, requestCameraPermission, getCameraPermission];
  });
  jest.doMock('expo-camera', () => ({ useCameraPermissions: camera, useMicrophonePermissions: () => [null, jest.fn(), jest.fn()] }));
  const awakeStart = jest.fn().mockResolvedValue(undefined);
  const awakeStop = jest.fn().mockResolvedValue(undefined);
  jest.doMock('expo-keep-awake', () => ({ activateKeepAwakeAsync: awakeStart, deactivateKeepAwake: awakeStop }));
  jest.doMock('expo-haptics', () => ({ impactAsync: jest.fn().mockResolvedValue(undefined), ImpactFeedbackStyle: {}, notificationAsync: jest.fn().mockResolvedValue(undefined), NotificationFeedbackType: { Success: 'success', Error: 'error' } }));
  const fetchDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'fetch');
  const fetcher = options.offline ? jest.fn().mockRejectedValue(new Error('Offline')) : jest.fn().mockResolvedValue({ ok: true, status: 200, redirected: false,
    url: 'https://flapfitapp.com/cdn-cgi/trace', headers: { get: (key: string) => key === 'content-type' ? 'text/plain' : null }, text: async () => 'h=flapfitapp.com\nloc=US\n' });
  Object.defineProperty(globalThis, 'fetch', { configurable: true, writable: true, value: fetcher });
  let params = {};
  let navigate!: (route: string) => void;
  const router = { push: jest.fn((route: { pathname: string; params: object }) => { params = route.params; navigate(route.pathname); }), back: jest.fn(() => navigate('/(tabs)')), replace: jest.fn() };
  const Tabs = Object.assign(function Tabs() { const Home = require('@/app/(tabs)/index').default; return React.createElement(Home); }, { Screen: 'TabScreen' });
  jest.doMock('expo-router', () => ({
    useRouter: () => router, useLocalSearchParams: () => params, useFocusEffect: (effect: () => void) => React.useEffect(effect, [effect]), Tabs,
    Redirect: function Redirect({ href }: { href: string }) { React.useEffect(() => navigate(href), [href]); return null; },
    Stack: function Stack() {
      const [route, setRoute] = React.useState('/'); navigate = setRoute;
      const Screen = route === '/game' ? require('@/app/game').default
        : route === '/(tabs)' ? require('@/app/(tabs)/_layout').default : require('@/app/index').default;
      return React.createElement(Screen);
    },
  }));
  const { useGameStore } = require('@/utils/game/store');
  await useGameStore.persist.rehydrate();
  useGameStore.setState({ hydrated: true, hydrationError: null, hasOnboarded: true });
  if (options.completedRun) useGameStore.getState().recordSession({ exercise: 'squats', mode: 'daily', levelId: 1, score: 0, pushups: 0, tutSeconds: 0 });
  const Root = require('@/app/_layout').default;
  let tree!: ReactTestRenderer;
  await act(async () => { tree = renderer.create(React.createElement(Root)); await settle(); });
  await act(async () => { jest.advanceTimersByTime(1400); await settle(); });
  const play = async () => { await act(async () => {
    const button = tree.root.findAll(node => /^Play Level \d+$/.test(node.props.accessibilityLabel ?? '') && typeof node.props.onPress === 'function')[0];
    expect(button).toBeDefined(); button.props.onPress(); await settle();
  }); expect(router.push).toHaveBeenCalledWith(expect.objectContaining({ pathname: '/game' }));
    expect(JSON.stringify(tree.toJSON())).not.toContain('Flap Fit hit a snag'); };
  return { camera, requestCameraPermission, getCameraPermission, openSettings, storage, adLoad, rcLoad, play, tree, sheet, router, awakeStart, awakeStop,
    completeGame: async () => { await act(async () => {
      tree.root.findByType('WebView' as never).props.onMessage({ nativeEvent: { data: JSON.stringify({ type: 'gameover', score: 5, pushups: 0, tutSeconds: 0, runDurationMs: 1000 }) } });
      await settle();
    }); },
    pressResult: async (title: string) => { await act(async () => {
      const button = tree.root.findAllByType('TouchableOpacity' as never).find(node => node.findAllByType('Text' as never).some(child => child.children.join('') === title));
      expect(button).toBeDefined(); expect(button!.props.disabled).not.toBe(true); button!.props.onPress(); await settle();
    }); },
    release: async () => { await act(async () => { releaseRead?.(); await settle(); }); },
    change: async (state: string) => { await act(async () => { appState.currentState = state; [...listeners].forEach(listener => listener(state)); await settle(); }); },
    finish: async () => { await act(async () => { tree.unmount(); }); jest.clearAllTimers(); jest.useRealTimers();
      if (fetchDescriptor) Object.defineProperty(globalThis, 'fetch', fetchDescriptor); },
  };
}
afterEach(() => { process.env = { ...originalEnv }; jest.useRealTimers(); });

test.each([false, true])('optional work stays paused from WebView admission until completion or unmount (unmount=%s)', async unmount => {
  const f = await mountApp(JSON.stringify({ version: 1, answer: '18-plus' }), { playable: true });
  const activity: typeof import('../../gameplayActivity') = require('../../gameplayActivity');
  try {
    await f.play();
    expect(f.tree.root.findAllByType('WebView' as never)).toHaveLength(1);
    expect(activity.isGameplayActive()).toBe(true);
    expect(f.awakeStart).toHaveBeenCalledTimes(1);
    if (!unmount) {
      await f.completeGame();
      expect(activity.isGameplayActive()).toBe(false);
      expect(f.awakeStop).toHaveBeenCalledWith(f.awakeStart.mock.calls[0][0]);
    }
  } finally { await f.finish(); }
  expect(activity.isGameplayActive()).toBe(false);
  expect(f.awakeStop).toHaveBeenCalledWith(f.awakeStart.mock.calls[0][0]);
});

test.each([false, true])('saved under-13 is restored before Home Play reaches camera setup (offline=%s)', async offline => {
  const f = await mountApp(JSON.stringify({ version: 1, answer: 'under-13' }), { offline });
  try { await f.play(); expect(f.camera).not.toHaveBeenCalled(); expect(JSON.stringify(f.tree.toJSON())).toContain('13');
    expect(f.storage.getItem).toHaveBeenCalledWith('@flapfit/local-age-answer-v1'); expect(f.adLoad).not.toHaveBeenCalled(); expect(f.rcLoad).not.toHaveBeenCalled();
  } finally { await f.finish(); }
});

test('a delayed saved-age read finishes before the camera/game child can mount', async () => {
  const f = await mountApp(JSON.stringify({ version: 1, answer: 'under-13' }), { delayed: true });
  try { await f.play(); expect(f.camera).not.toHaveBeenCalled(); await f.release(); expect(f.camera).not.toHaveBeenCalled(); }
  finally { await f.finish(); }
});

test.each([null, JSON.stringify({ version: 1, answer: '13-17' }), JSON.stringify({ version: 1, answer: '18-plus' }), 'invalid'])('optional unanswered/eligible/unreadable record %s permits Home Play without ad setup', async saved => {
  const f = await mountApp(saved, { offline: true });
  try { await f.play(); expect(f.camera).toHaveBeenCalled(); expect(JSON.stringify(f.tree.toJSON())).toContain('Camera access needed');
    expect(f.adLoad).not.toHaveBeenCalled(); expect(f.rcLoad).not.toHaveBeenCalled(); }
  finally { await f.finish(); }
});

test('failed local-age read does not turn a storage failure into a new gameplay ban', async () => {
  const f = await mountApp(null, { failRead: true, offline: true });
  try { await f.play(); expect(f.camera).toHaveBeenCalled(); }
  finally { await f.finish(); }
});

test('backgrounding during saved-age restoration cannot mount a late game child', async () => {
  const f = await mountApp(JSON.stringify({ version: 1, answer: '18-plus' }), { delayed: true });
  try { await f.play(); await f.change('background'); await f.release(); expect(f.camera).not.toHaveBeenCalled();
    await f.change('active'); expect(f.camera).toHaveBeenCalled(); }
  finally { await f.finish(); }
});

test('leaving the route during restoration cancels the game continuation', async () => {
  const f = await mountApp(JSON.stringify({ version: 1, answer: '18-plus' }), { delayed: true });
  await f.play(); await f.finish(); await f.release(); expect(f.camera).not.toHaveBeenCalled();
});

test('actual Home -> game route uses completed-run history to prevent a fresh-route setup bypass', async () => {
  const f = await mountApp(null, { completedRun: true });
  try {
    await f.play(); expect(f.camera).not.toHaveBeenCalled();
    expect(JSON.stringify(f.tree.toJSON())).toContain('Finish setup');
    expect(f.adLoad).not.toHaveBeenCalled(); expect(f.rcLoad).not.toHaveBeenCalled();
  } finally { await f.finish(); }
});

test.each(['Try again', 'Next level'])('actual result %s -> unanswered choices -> Close keeps the saved result and cancels navigation', async action => {
  const f = await mountApp(null, { playable: true });
  try {
    await f.play(); await f.completeGame();
    for (let attempt = 0; attempt < 2; attempt++) {
      await f.pressResult(action);
      expect(f.sheet.openChoices).toHaveBeenCalledTimes(attempt + 1);
      expect(f.router.back).not.toHaveBeenCalled(); expect(f.router.replace).not.toHaveBeenCalled();
      expect(JSON.stringify(f.tree.toJSON())).toContain('Try again');
      expect(JSON.stringify(f.tree.toJSON())).not.toContain('Finish setup');
      expect(f.adLoad).not.toHaveBeenCalled();
    }
    const notice: typeof import('../processingNotice') = require('../processingNotice');
    expect(notice.isProcessingNoticeAcknowledged()).toBe(false);
    const local: typeof import('../localAgeAnswer') = require('../localAgeAnswer');
    await local.saveLocalAgeAnswer('18-plus'); await notice.acknowledgeProcessingNotice();
    await f.pressResult(action);
    expect(JSON.stringify(f.tree.toJSON())).not.toContain('Try again');
    if (action === 'Next level') expect(f.router.replace).toHaveBeenCalledWith(expect.objectContaining({ pathname: '/game' }));
  } finally { await f.finish(); }
});

test.each(['dismissed', 'failed'])('Done leaves the result when setup is %s, but Home cannot start another run', async outcome => {
  const f = await mountApp(null, { playable: true });
  try {
    await f.play(); await f.completeGame();
    if (outcome === 'failed') f.sheet.openChoices.mockRejectedValueOnce(new Error('Setup unavailable'));
    await f.pressResult('Done');
    expect(f.router.back).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(f.tree.toJSON())).not.toContain('Try again');
    const notice: typeof import('../processingNotice') = require('../processingNotice');
    expect(notice.isProcessingNoticeAcknowledged()).toBe(false);
    expect(f.storage.setItem.mock.calls.some(([key]) => key === '@flapfit/local-age-answer-v1')).toBe(false);
    f.camera.mockClear();
    await f.play();
    expect(JSON.stringify(f.tree.toJSON())).toContain('Finish setup');
    expect(f.camera).not.toHaveBeenCalled();
    expect(f.adLoad).not.toHaveBeenCalled(); expect(f.rcLoad).not.toHaveBeenCalled();
  } finally { await f.finish(); }
});

test('Done still uses the existing eligible result-ad opportunity before returning Home', async () => {
  const f = await mountApp(null, { playable: true });
  try {
    await f.play();
    const monetization: typeof import('../../monetization') = require('../../monetization');
    const privacy: typeof import('../postGamePrivacy') = require('../postGamePrivacy');
    jest.spyOn(privacy, 'preparePostGamePrivacy').mockResolvedValue(true);
    let closeAd!: () => void;
    const ad = { isReady: () => true, show: jest.fn(async (callbacks: { opened: () => void; closed: () => void }) => { callbacks.opened(); closeAd = callbacks.closed; }), dispose: jest.fn() };
    jest.spyOn(monetization, 'prepareResultInterstitial').mockReturnValue(ad);
    // Preserve the real scheduler and move past its first completed exit.
    monetization.resultAdGate.createResult(null, monetization.adEnvironment).exit(false, jest.fn());
    await f.completeGame(); await f.pressResult('Done');
    expect(ad.show).toHaveBeenCalledTimes(1);
    expect(f.router.back).not.toHaveBeenCalled();
    const { act } = require('react');
    await act(async () => { closeAd(); await settle(); });
    expect(f.router.back).toHaveBeenCalledTimes(1);
  } finally { await f.finish(); }
});

test('first result and its Done action never allocate an interstitial', async () => {
  const f = await mountApp(null, { playable: true });
  try {
    await f.play();
    const monetization: typeof import('../../monetization') = require('../../monetization');
    const privacy: typeof import('../postGamePrivacy') = require('../postGamePrivacy');
    jest.spyOn(privacy, 'preparePostGamePrivacy').mockResolvedValue(true);
    const prepare = jest.spyOn(monetization, 'prepareResultInterstitial');
    await f.completeGame();
    expect(prepare).not.toHaveBeenCalled();
    await f.pressResult('Done');
    expect(prepare).not.toHaveBeenCalled();
    expect(f.router.back).toHaveBeenCalledTimes(1);
  } finally { await f.finish(); }
});

test.each([false, true])('audit A2: visible result replaces a background-invalidated ad only after fresh permission (leaveEarly=%s)', async leaveEarly => {
  const f = await mountApp(null, { playable: true });
  try {
    await f.play();
    const { act } = require('react');
    const local: typeof import('../localAgeAnswer') = require('../localAgeAnswer');
    const notice: typeof import('../processingNotice') = require('../processingNotice');
    const access: typeof import('../processingAccess') = require('../processingAccess');
    await act(async () => { await local.saveLocalAgeAnswer('18-plus'); await notice.acknowledgeProcessingNotice(); await settle(); });
    expect(access.getProcessingAccess().ads.allowed).toBe(true);
    const monetization: typeof import('../../monetization') = require('../../monetization');
    const privacy: typeof import('../postGamePrivacy') = require('../postGamePrivacy');
    jest.spyOn(privacy, 'preparePostGamePrivacy').mockResolvedValue(true);
    let ready = true;
    const oldAd = { isReady: () => ready, show: jest.fn(), dispose: jest.fn() };
    const newAd = { isReady: () => true, show: jest.fn(async callbacks => { callbacks.opened(); callbacks.closed(); }), dispose: jest.fn() };
    const allocate = jest.spyOn(monetization, 'prepareResultInterstitial').mockReturnValueOnce(oldAd).mockReturnValue(newAd);
    jest.spyOn(monetization, 'isMonetizationPrepared').mockReturnValue(true);
    let finishRefresh!: () => void;
    const refresh = jest.spyOn(monetization, 'refreshMonetizationForResult').mockImplementation(() => new Promise<void>(done => { finishRefresh = done; }));
    monetization.resultAdGate.createResult(null, monetization.adEnvironment).exit(false, jest.fn());
    await f.completeGame();
    expect(allocate).toHaveBeenCalledTimes(1);
    ready = false; // Native consent invalidation makes the old ad unusable.
    await f.change('background');
    expect(refresh).not.toHaveBeenCalled();
    await f.change('active');
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(oldAd.show).not.toHaveBeenCalled(); expect(newAd.show).not.toHaveBeenCalled();
    if (leaveEarly) await f.pressResult('Done');
    await act(async () => { finishRefresh(); await settle(); });
    if (leaveEarly) {
      expect(allocate).toHaveBeenCalledTimes(1);
      expect(newAd.show).not.toHaveBeenCalled();
      expect(f.router.back).toHaveBeenCalledTimes(1);
    } else {
      expect(allocate).toHaveBeenCalledTimes(2);
      expect(newAd.show).not.toHaveBeenCalled(); // Returning from Share never shows an ad.
      await f.pressResult('Done');
      expect(newAd.show).toHaveBeenCalledTimes(1);
      expect(f.router.back).toHaveBeenCalledTimes(1);
    }
  } finally { await f.finish(); }
});

test('audit A2: first free result does not refresh or allocate after background/share return', async () => {
  const f = await mountApp(null, { playable: true });
  try {
    await f.play();
    const monetization: typeof import('../../monetization') = require('../../monetization');
    const refresh = jest.spyOn(monetization, 'refreshMonetizationForResult');
    const allocate = jest.spyOn(monetization, 'prepareResultInterstitial');
    await f.completeGame(); await f.change('background'); await f.change('active');
    expect(refresh).not.toHaveBeenCalled(); expect(allocate).not.toHaveBeenCalled();
  } finally { await f.finish(); }
});


// Apple's build-8 rejection: exercise the actual rendered camera gate and native
// permission boundary, including updates after denial and a Settings return.
test('iOS first camera explanation has only Continue, which requests native permission once', async () => {
  const f = await mountApp(null, { offline: true });
  try {
    await f.play();
    const buttons = f.tree.root.findAllByType('TouchableOpacity' as never);
    expect(buttons).toHaveLength(1);
    expect(buttons[0].props.accessibilityLabel).toBe('Continue');
    expect(JSON.stringify(f.tree.toJSON())).not.toContain('Allow camera');
    expect(JSON.stringify(f.tree.toJSON())).not.toContain('Go back');
    expect(f.requestCameraPermission).not.toHaveBeenCalled();
    await f.pressResult('Continue');
    expect(f.requestCameraPermission).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(f.tree.toJSON())).toContain('Open settings');
    expect(JSON.stringify(f.tree.toJSON())).toContain('Go back');
    await f.pressResult('Go back'); await f.play();
    await f.change('background'); await f.change('active');
    expect(f.requestCameraPermission).toHaveBeenCalledTimes(1);
    expect(f.tree.root.findAllByType('WebView' as never)).toHaveLength(0);
  } finally { await f.finish(); }
});

test('granting the first iOS camera request proceeds into gameplay', async () => {
  const f = await mountApp(null, { offline: true, playable: true, cameraStatus: 'undetermined', cameraResponse: 'granted' });
  try {
    await f.play(); await f.pressResult('Continue');
    expect(f.requestCameraPermission).toHaveBeenCalledTimes(1);
    expect(f.tree.root.findAllByType('WebView' as never)).toHaveLength(1);
    expect(JSON.stringify(f.tree.toJSON())).not.toContain('Camera access needed');
  } finally { await f.finish(); }
});

test('already granted iOS camera access bypasses the explanation and request', async () => {
  const f = await mountApp(null, { offline: true, playable: true });
  try {
    await f.play();
    expect(f.tree.root.findAllByType('WebView' as never)).toHaveLength(1);
    expect(JSON.stringify(f.tree.toJSON())).not.toContain('Camera access needed');
    expect(f.requestCameraPermission).not.toHaveBeenCalled();
  } finally { await f.finish(); }
});

test.each([false, true])('previous iOS denial routes to Settings instead of another request (canAskAgain=%s)', async canAskAgain => {
  const f = await mountApp(null, { offline: true, cameraStatus: 'denied', cameraCanAskAgain: canAskAgain });
  try {
    await f.play();
    expect(JSON.stringify(f.tree.toJSON())).toContain('Gameplay needs the camera');
    expect(JSON.stringify(f.tree.toJSON())).toContain('Go back');
    await f.pressResult('Open settings');
    expect(f.openSettings).toHaveBeenCalledTimes(1);
    await f.change('background'); await f.change('active');
    expect(f.getCameraPermission).toHaveBeenCalledTimes(1);
    expect(f.requestCameraPermission).not.toHaveBeenCalled();
    expect(f.tree.root.findAllByType('WebView' as never)).toHaveLength(0);
    await f.pressResult('Go back');
    expect(f.router.back).toHaveBeenCalledTimes(1);
  } finally { await f.finish(); }
});

test('granting camera access in Settings resumes iOS gameplay without requesting again', async () => {
  const f = await mountApp(null, { offline: true, playable: true, cameraStatus: 'denied', cameraSettingsStatus: 'granted' });
  try {
    await f.play(); await f.pressResult('Open settings');
    await f.change('background'); await f.change('active');
    expect(f.getCameraPermission).toHaveBeenCalledTimes(1);
    expect(f.requestCameraPermission).not.toHaveBeenCalled();
    expect(f.tree.root.findAllByType('WebView' as never)).toHaveLength(1);
  } finally { await f.finish(); }
});

test('this iOS correction preserves Android camera explanation actions', async () => {
  const f = await mountApp(null, { offline: true, platform: 'android' });
  try {
    await f.play();
    expect(JSON.stringify(f.tree.toJSON())).toContain('Allow camera');
    expect(JSON.stringify(f.tree.toJSON())).toContain('Go back');
    await f.pressResult('Allow camera');
    expect(f.requestCameraPermission).toHaveBeenCalledTimes(1);
  } finally { await f.finish(); }
});
