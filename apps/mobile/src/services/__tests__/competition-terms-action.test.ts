function fixture(options: { existingTerms?: boolean; allowed?: boolean; granted?: boolean } = {}) {
  jest.resetModules();
  const acceptTerms = jest.fn();
  const effects: Array<() => unknown> = [];
  const setters: jest.Mock[] = [];
  const input = { choices: { competition: { decision: options.granted ? 'granted' : 'undecided', noticeVersion: 1 } } };
  const saveName = jest.fn(async (name: string) => name);
  const setPlayerName = jest.fn();
  const gameState = { playerName: 'Player', setPlayerName,
    competitionTermsVersion: options.existingTerms ? 1 : 0, acceptCompetitionTerms: acceptTerms, hydrated: true };
  const access = { competition: { allowed: options.allowed ?? false } };
  const setChoice = jest.fn(async () => { input.choices.competition = { decision: 'granted', noticeVersion: 1 }; });
  const flush = jest.fn().mockResolvedValue({ submitted: 0, pending: 0, rejected: [] });
  jest.doMock('react', () => ({ ...jest.requireActual('react'),
    useEffect: (effect: () => unknown) => { effects.push(effect); },
    useCallback: (callback: unknown) => callback,
    useRef: (current: unknown) => ({ current }),
    useState: (value: unknown) => { const setter = jest.fn(); setters.push(setter); return [value, setter]; },
    useSyncExternalStore: (_subscribe: unknown, snapshot: () => unknown) => snapshot(),
  }));
  jest.doMock('react-native', () => ({ Alert: { alert: jest.fn() }, Linking: { openURL: jest.fn() },
    Modal: 'Modal', ScrollView: 'ScrollView', Text: 'Text', TextInput: 'TextInput', TouchableOpacity: 'TouchableOpacity', View: 'View' }));
  jest.doMock('expo-router', () => ({ useFocusEffect: (effect: () => unknown) => { effects.push(effect); } }));
  jest.doMock('@/services/monetization', () => ({ prepareCompetitionEligibility: jest.fn().mockResolvedValue(undefined) }));
  jest.doMock('expo-image', () => ({ Image: 'Image' }));
  jest.doMock('expo-status-bar', () => ({ StatusBar: 'StatusBar' }));
  jest.doMock('lucide-react-native', () => ({ CheckCircle2: 'Check', FileText: 'File', Medal: 'Medal', RefreshCw: 'Refresh', Trophy: 'Trophy' }));
  jest.doMock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0 }) }));
  jest.doMock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: jest.fn() }) }));
  jest.doMock('@/components/KeyboardAvoidingAnimatedView', () => 'KeyboardView');
  jest.doMock('@/config/release', () => ({ RELEASE_LINKS: { termsUrl: 'https://example.test/terms', privacyUrl: 'https://example.test/privacy' } }));
  jest.doMock('@/utils/game/exerciseImages', () => ({ EXERCISE_IMAGES: {} }));
  jest.doMock('@/utils/game/store', () => ({ COMPETITION_TERMS_VERSION: 1,
    useGameStore: Object.assign((select: (value: unknown) => unknown) => select(gameState), { getState: () => gameState }) }));
  jest.doMock('@/services/privacy/processingPolicy', () => ({ PROCESSING_NOTICE_VERSION: 1 }));
  jest.doMock('@/services/privacy/processingAccess', () => ({ getProcessingAccess: () => access,
    getProcessingInputs: () => input, setProcessingChoice: setChoice, subscribeProcessingAccess: jest.fn() }));
  jest.doMock('@/services/competitionApi', () => ({ competitionIsConfigured: true, competitionPlayerNameError: () => null,
    normalizeCompetitionPlayerName: (name: string) => name, competitionRequest: jest.fn(), saveCompetitionPlayerName: saveName,
    consumeCompetitionSubmissionNotices: jest.fn().mockResolvedValue([]), flushPendingCompetitionResults: flush }));
  const Screen = require('../../app/(tabs)/compete').default;
  const tree = Screen();
  const nodes: Array<{ type?: { name?: string }; props: Record<string, any> }> = [];
  function walk(node: any): void {
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (!node || typeof node !== 'object' || !node.props) return;
    nodes.push(node); walk(node.props.children);
  }
  walk(tree);
  const terms = nodes.find((node) => node.type?.name === 'CompetitionTermsModal')!;
  const board = nodes.find((node) => node.type?.name === 'LeaderboardPanel')!;
  const saveButton = nodes.find(node => node.props.accessibilityLabel === 'Save player name')!;
  return { terms, board, input, access, setChoice, acceptTerms, effects, setters, flush, saveName, setPlayerName, saveButton, gameState };
}

test('name conflict is displayed without replacing the previous saved name', async () => {
  const f=fixture({existingTerms:true,allowed:true,granted:true});
  f.saveName.mockRejectedValueOnce(new Error('Name already taken. Choose a different player name.'));
  await f.saveButton.props.onPress();
  expect(f.saveName).toHaveBeenCalledWith('Player');
  expect(f.setPlayerName).not.toHaveBeenCalled();
  expect(f.setters.some(setter=>setter.mock.calls.some(([value])=>value==='Name already taken. Choose a different player name.'))).toBe(true);
});

test('name is saved only after server confirmation and duplicate presses share one request', async () => {
  const f=fixture({existingTerms:true,allowed:true,granted:true}); let finish!: (name:string)=>void;
  f.saveName.mockImplementationOnce(()=>new Promise<string>(resolve=>{finish=resolve;}));
  const pending=f.saveButton.props.onPress(); await f.saveButton.props.onPress();
  expect(f.saveName).toHaveBeenCalledTimes(1); expect(f.setPlayerName).not.toHaveBeenCalled();
  finish('Player'); await pending;
  expect(f.setPlayerName).toHaveBeenCalledWith('Player');
});

test('saving a name before online participation remains local', async () => {
  const f=fixture(); await f.saveButton.props.onPress();
  expect(f.saveName).not.toHaveBeenCalled(); expect(f.setPlayerName).toHaveBeenCalledWith('Player');
});

test('withdrawal during name save does not restore the local online profile', async () => {
  const f=fixture({existingTerms:true,allowed:true,granted:true}); let finish!: (name:string)=>void;
  f.saveName.mockImplementationOnce(()=>new Promise<string>(resolve=>{finish=resolve;}));
  const pending=f.saveButton.props.onPress(); f.access.competition.allowed=false; finish('Player'); await pending;
  expect(f.setPlayerName).not.toHaveBeenCalled();
});

test('the existing affirmative action persists only competition permission before accepting terms', async () => {
  const f = fixture(); let finish!: () => void;
  f.setChoice.mockImplementation(() => new Promise<void>((resolve) => { finish = () => {
    f.input.choices.competition.decision = 'granted'; resolve();
  }; }));
  const acceptance = f.terms.props.onAccept();
  await f.terms.props.onAccept();
  expect(f.setChoice).toHaveBeenCalledTimes(1);
  expect(f.setChoice).toHaveBeenCalledWith('competition', 'granted');
  expect(f.acceptTerms).not.toHaveBeenCalled();
  finish(); await acceptance;
  expect(f.acceptTerms).toHaveBeenCalledTimes(1);
});

test('failed persistence never marks terms accepted and remains retryable', async () => {
  const f = fixture(); f.setChoice.mockRejectedValueOnce(new Error('disk unavailable'));
  await f.terms.props.onAccept(); expect(f.acceptTerms).not.toHaveBeenCalled();
  expect(f.setters.some((setter) => setter.mock.calls.some(([value]) => value === 'Could not save competition acceptance. Please try again.'))).toBe(true);
  await f.terms.props.onAccept(); expect(f.acceptTerms).toHaveBeenCalledTimes(1);
});

test('existing saved terms and screen mount never silently grant participation or retry local-only work', () => {
  const f = fixture({ existingTerms: true }); f.effects.forEach((effect) => effect());
  expect(f.board.props.termsAccepted).toBe(false);
  expect(f.board.props.processingAllowed).toBe(false);
  expect(f.setChoice).not.toHaveBeenCalled(); expect(f.acceptTerms).not.toHaveBeenCalled();
  expect(f.flush).not.toHaveBeenCalled();
  f.terms.props.onClose(); expect(f.setChoice).not.toHaveBeenCalled();
});

test('a newer refusal during persistence is not overridden by the earlier acceptance continuation', async () => {
  const f = fixture(); let finish!: () => void;
  f.setChoice.mockImplementation(() => new Promise<void>((resolve) => { finish = resolve; }));
  const acceptance = f.terms.props.onAccept();
  f.input.choices.competition.decision = 'denied'; finish(); await acceptance;
  expect(f.acceptTerms).not.toHaveBeenCalled();
  expect(f.setChoice).toHaveBeenCalledTimes(1);
});
