type Api = typeof import('../competitionApi');
let AsyncStorage: typeof import('@react-native-async-storage/async-storage').default;
let createClient: typeof import('@supabase/supabase-js').createClient;
let COMPETITION_TERMS_VERSION: string;
let useGameStore: typeof import('@/utils/game/store').useGameStore;
let competitionRequest: Api['competitionRequest'];
let consumeCompetitionSubmissionNotices: Api['consumeCompetitionSubmissionNotices'];
let deleteCompetitionIdentity: Api['deleteCompetitionIdentity'];
let flushPendingCompetitionResults: Api['flushPendingCompetitionResults'];
let getCompetitionSupportId: Api['getCompetitionSupportId'];
let submitCompetitionRunResult: Api['submitCompetitionRunResult'];
let startCompetitionForegroundRetry: Api['startCompetitionForegroundRetry'];

jest.mock('@/config/release', () => ({
  ONLINE_SERVICES: {
    supabaseUrl: 'https://test.supabase.co',
    supabasePublishableKey: 'sb_publishable_test',
  },
}));

jest.mock('../privacy/processingAccess', () => ({
  getProcessingInputs: () => ({ appleRequirement: 'not-required' }),
  getProcessingAccess: () => ({ competition: { allowed: true }, revision: 1 }),
  subscribeProcessingAccess: () => () => undefined,
}));

jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }));

const auth = {
  getSession: jest.fn(),
  getUser: jest.fn(),
  signInAnonymously: jest.fn(),
  signOut: jest.fn(),
  startAutoRefresh: jest.fn(),
  stopAutoRefresh: jest.fn(),
};
const run = (runId: string, expiresAt = new Date(Date.now() + 60_000).toISOString()) => ({
  runId,
  expiresAt,
  playerName: 'Jay Bird',
  score: 5,
  durationMs: 10000,
});
const reply = (status: number, payload: object = {}) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => payload }) as Response;

beforeEach(async () => {
  // Deletion state is intentionally process-wide; each independent test gets a fresh service.
  jest.resetModules();
  const storageModule = require('@react-native-async-storage/async-storage');
  AsyncStorage = storageModule.default ?? storageModule;
  ({ createClient } = require('@supabase/supabase-js'));
  ({ COMPETITION_TERMS_VERSION, useGameStore } = require('@/utils/game/store'));
  ({ competitionRequest, consumeCompetitionSubmissionNotices, deleteCompetitionIdentity, flushPendingCompetitionResults, getCompetitionSupportId, submitCompetitionRunResult, startCompetitionForegroundRetry } = require('../competitionApi'));
  await AsyncStorage.clear();
  jest.clearAllMocks();
  useGameStore.setState({ competitionTermsVersion: COMPETITION_TERMS_VERSION });
  auth.getSession.mockResolvedValue({
    data: { session: { user: { id: 'test-user' }, access_token: 'test-token' } },
    error: null,
  });
  (createClient as jest.Mock).mockReturnValue({ auth });
  auth.getUser.mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null });
  auth.signOut.mockResolvedValue({ error: null });
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('online result delivery', () => {
  test('a permanent name rejection is visible and never retried', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      reply(400, { error: 'Choose a different player name.' })
    );
    const result = await submitCompetitionRunResult(run('bad-name'));
    expect(result.status).toBe('rejected');
    expect(result.message).toContain('Choose a different player name.');
    expect((await consumeCompetitionSubmissionNotices())[0]?.status).toBe(400);
    expect((await flushPendingCompetitionResults()).pending).toBe(0);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('an expired run is rejected locally, not promised an overnight retry', async () => {
    const result = await submitCompetitionRunResult(
      run('expired', new Date(Date.now() - 1).toISOString())
    );
    expect(result.status).toBe('rejected');
    expect(result.message).toContain('expired');
    expect(global.fetch).not.toHaveBeenCalled();
    expect((await flushPendingCompetitionResults()).pending).toBe(0);
  });

  test('a server outage keeps the result pending and a later flush accepts it', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(reply(500, { error: 'Temporary outage' }))
      .mockResolvedValueOnce(reply(200, { accepted: true }));
    const first = await submitCompetitionRunResult(run('retry'));
    expect(first.status).toBe('pending');
    const retry = await flushPendingCompetitionResults();
    expect(retry.submittedRunIds).toEqual(['retry']);
    expect(retry.pending).toBe(0);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  test('a server-expired response is visible and removed', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(reply(410, { error: 'Run expired.' }));
    const result = await submitCompetitionRunResult(run('server-expired'));
    expect(result.status).toBe('rejected');
    expect(result.message).toContain('Run expired.');
    expect((await flushPendingCompetitionResults()).pending).toBe(0);
  });

  test('reading a support ID does not create an anonymous account', async () => {
    auth.getSession.mockResolvedValueOnce({ data: { session: null }, error: null });
    expect(await getCompetitionSupportId()).toBeNull();
    expect(auth.signInAnonymously).not.toHaveBeenCalled();
  });

  test('a full offline queue keeps earlier results and visibly rejects the new run', async () => {
    const key = '@flapfit/competition-result-outbox-v1';
    const pending = Array.from({ length: 25 }, (_, index) => ({
      ...run(`queued-${index}`),
      createdAt: new Date().toISOString(),
    }));
    await AsyncStorage.setItem(key, JSON.stringify(pending));
    const savedBefore = await AsyncStorage.getItem(key);

    const result = await submitCompetitionRunResult(run('new-run'));

    expect(result.status).toBe('rejected');
    expect(result.message).toContain('queue is full');
    expect(await AsyncStorage.getItem(key)).toBe(savedBefore);
    expect((await consumeCompetitionSubmissionNotices())[0]?.status).toBe(429);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('retrying an existing run does not evict another entry at capacity', async () => {
    const key = '@flapfit/competition-result-outbox-v1';
    const pending = Array.from({ length: 25 }, (_, index) => ({
      ...run(`queued-${index}`),
      createdAt: new Date().toISOString(),
    }));
    await AsyncStorage.setItem(key, JSON.stringify(pending));
    (global.fetch as jest.Mock).mockResolvedValue(reply(500));

    const result = await submitCompetitionRunResult({ ...run('queued-0'), score: 99 });
    const saved = JSON.parse((await AsyncStorage.getItem(key)) ?? '[]') as { runId: string }[];

    expect(result.status).toBe('pending');
    expect(saved).toHaveLength(25);
    expect(saved.filter((entry) => entry.runId === 'queued-0')).toHaveLength(1);
    expect(saved.some((entry) => entry.runId === 'queued-1')).toBe(true);
    expect(saved.find((entry) => entry.runId === 'queued-0')).toMatchObject({ score: 5 });
  });

  test('deleting the online identity clears pending results and notices', async () => {
    const key = '@flapfit/competition-result-outbox-v1';
    const noticesKey = '@flapfit/competition-result-notices-v1';
    await AsyncStorage.setItem(
      key,
      JSON.stringify([{ ...run('delete-me'), createdAt: new Date().toISOString() }])
    );
    await AsyncStorage.setItem(
      noticesKey,
      JSON.stringify([{ runId: 'old', status: 400, message: 'Old' }])
    );
    (global.fetch as jest.Mock).mockResolvedValue(reply(200, { deleted: true }));

    await deleteCompetitionIdentity();

    expect(await AsyncStorage.getItem(key)).toBeNull();
    expect(await AsyncStorage.getItem(noticesKey)).toBeNull();
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });
});

describe('whole-request timeout', () => {
  test('covers a stalled session read', async () => {
    jest.useFakeTimers();
    auth.getSession.mockImplementation(() => new Promise(() => undefined));
    const request = competitionRequest('/leaderboard', { timeoutMs: 100 });
    const rejection = expect(request).rejects.toMatchObject({ status: 408 });
    await jest.advanceTimersByTimeAsync(100);
    await rejection;
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('covers a stalled response body', async () => {
    jest.useFakeTimers();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => new Promise(() => undefined),
    });
    const request = competitionRequest('/leaderboard', { timeoutMs: 100 });
    const rejection = expect(request).rejects.toMatchObject({ status: 408 });
    await jest.advanceTimersByTimeAsync(100);
    await rejection;
  });
});

describe('launch audit regressions', () => {
  test('overlapping successful submissions each report their own accepted result', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(reply(200, { accepted: true }));
    const results = await Promise.all([
      submitCompetitionRunResult(run('overlap-a')),
      submitCompetitionRunResult(run('overlap-b')),
      flushPendingCompetitionResults(),
    ]);
    expect(results[0]).toMatchObject({ status: 'accepted' });
    expect(results[1]).toMatchObject({ status: 'accepted' });
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect((await flushPendingCompetitionResults()).pending).toBe(0);
  });

  test("an overlapping rejection never borrows another run's successful status", async () => {
    (global.fetch as jest.Mock).mockImplementation(async (_url: string, options: RequestInit) => {
      const entry = JSON.parse(String(options.body));
      return entry.runId === 'rejected-overlap'
        ? reply(422, { error: 'Score invalid' })
        : reply(200);
    });
    const results = await Promise.all([
      submitCompetitionRunResult(run('accepted-overlap')),
      submitCompetitionRunResult(run('rejected-overlap')),
    ]);
    expect(results.map((result) => result.status)).toEqual(['accepted', 'rejected']);
  });

  test('a lost deletion acknowledgement is reconciled only after Auth confirms user removal', async () => {
    await AsyncStorage.setItem(
      '@flapfit/competition-result-outbox-v1',
      JSON.stringify([{ ...run('pending-deletion'), createdAt: new Date().toISOString() }])
    );
    const progress = { totalPipes: 73, totalTutSeconds: 615, unlockedLevel: 6 };
    useGameStore.setState(progress);
    (global.fetch as jest.Mock).mockRejectedValue(
      new Error('Connection lost after server deletion')
    );
    auth.getUser.mockResolvedValue({ data: { user: null }, error: { code: 'user_not_found' } });
    await deleteCompetitionIdentity();
    expect(auth.getUser).toHaveBeenCalledWith('test-token');
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(await AsyncStorage.getItem('@flapfit/competition-result-outbox-v1')).toBeNull();
    expect(useGameStore.getState()).toMatchObject(progress);
    expect(auth.signInAnonymously).not.toHaveBeenCalled();
  });

  test('retry completes cleanup after an ambiguous delete followed by a 401', async () => {
    (global.fetch as jest.Mock)
      .mockRejectedValueOnce(new Error('Connection lost'))
      .mockResolvedValueOnce(reply(401, { error: 'Anonymous game session required.' }));
    auth.getUser
      .mockResolvedValueOnce({ data: { user: null }, error: { code: 'unexpected_failure' } })
      .mockResolvedValueOnce({ data: { user: null }, error: { code: 'user_not_found' } });
    await expect(deleteCompetitionIdentity()).rejects.toThrow('Connection lost');
    expect(auth.signOut).not.toHaveBeenCalled();
    await deleteCompetitionIdentity();
    expect(auth.signOut).toHaveBeenCalledTimes(1);
    expect(await AsyncStorage.getItem('@flapfit/competition-deletion-v1')).toBeNull();
  });

  test('a 401 or expired session is not proof of deletion and does not clear pending scores', async () => {
    const pending = JSON.stringify([
      { ...run('keep-pending'), createdAt: new Date().toISOString() },
    ]);
    await AsyncStorage.setItem('@flapfit/competition-result-outbox-v1', pending);
    (global.fetch as jest.Mock).mockResolvedValue(reply(401, { error: 'Expired session' }));
    auth.getUser.mockResolvedValue({ data: { user: null }, error: { code: 'bad_jwt' } });
    await expect(deleteCompetitionIdentity()).rejects.toMatchObject({ status: 401 });
    expect(await AsyncStorage.getItem('@flapfit/competition-result-outbox-v1')).toBe(pending);
    expect(auth.signOut).not.toHaveBeenCalled();
    await expect(competitionRequest('/leaderboard')).rejects.toThrow('Finish deleting');
    expect(auth.signInAnonymously).not.toHaveBeenCalled();
  });

  test('a confirmed deletion survives local signout failure and does not resend DELETE', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(reply(200, { deleted: true }));
    auth.signOut
      .mockResolvedValueOnce({ error: new Error('Local storage failed') })
      .mockResolvedValueOnce({ error: null });
    await expect(deleteCompetitionIdentity()).rejects.toThrow('Local storage failed');
    await deleteCompetitionIdentity();
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(auth.signOut).toHaveBeenCalledTimes(2);
    expect(await AsyncStorage.getItem('@flapfit/competition-deletion-v1')).toBeNull();
  });

  test('a missing session after an uncertain deletion cannot create a new guest or claim success', async () => {
    await AsyncStorage.setItem(
      '@flapfit/competition-deletion-v1',
      JSON.stringify({ userId: 'test-user', confirmed: false })
    );
    auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    await expect(deleteCompetitionIdentity()).rejects.toThrow('could not be confirmed');
    expect(auth.signInAnonymously).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('bounded foreground recovery', () => {
  test('returning to the app retries pending scores once and refreshes rankings', async () => {
    const { AppState } = require('react-native');
    let changed: (state: string) => void = () => undefined;
    const remove = jest.fn();
    const listener = jest.spyOn(AppState, 'addEventListener').mockImplementation((_event: unknown, callback: unknown) => {
      changed = callback as (state: string) => void;
      return { remove };
    });
    useGameStore.setState({ hydrated: true });
    await AsyncStorage.setItem('@flapfit/competition-result-outbox-v1', JSON.stringify([{ ...run('foreground'), createdAt: new Date().toISOString() }]));
    (global.fetch as jest.Mock).mockResolvedValue(reply(200));
    const refreshed = jest.fn();
    const stop = startCompetitionForegroundRetry(refreshed);
    changed('background');
    expect(global.fetch).not.toHaveBeenCalled();
    changed('active');
    changed('active');
    await flushPendingCompetitionResults();
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(refreshed).toHaveBeenCalledTimes(1);
    stop();
    expect(remove).toHaveBeenCalledTimes(1);
    listener.mockRestore();
  });

  test('deletion verification times out without claiming success or discarding the session', async () => {
    jest.useFakeTimers();
    (global.fetch as jest.Mock).mockResolvedValue(reply(401));
    auth.getUser.mockImplementation(() => new Promise(() => undefined));
    const deleting = deleteCompetitionIdentity();
    const expected = expect(deleting).rejects.toThrow('verification timed out');
    await jest.advanceTimersByTimeAsync(15001);
    await expected;
    expect(auth.signOut).not.toHaveBeenCalled();
  });
});

test('a submission waiting behind deletion cannot recreate a guest or repopulate the outbox', async () => {
  (global.fetch as jest.Mock).mockResolvedValue(reply(200, { deleted: true }));
  const deletion = deleteCompetitionIdentity();
  const submission = submitCompetitionRunResult(run('stale-after-delete'));
  await deletion;
  expect(await submission).toMatchObject({ status: 'local' });
  expect(auth.signInAnonymously).not.toHaveBeenCalled();
  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(await AsyncStorage.getItem('@flapfit/competition-result-outbox-v1')).toBeNull();
});
