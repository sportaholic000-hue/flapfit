import type { SupabaseClient } from '@supabase/supabase-js';

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
};
const response = (body: object = {}) => ({ ok: true, status: 200, json: async () => body }) as Response;
const session = { user: { id: 'existing-user' }, access_token: 'existing-token' };

let api: typeof import('../competitionApi');
let storage: typeof import('@react-native-async-storage/async-storage').default;
let store: typeof import('@/utils/game/store');
let createClient: jest.Mock;
let appleRequired = false;
let appleStatus: { status: string; revision: number };
let appleFresh = false;
let appleCheck: jest.Mock;
let appleLink: jest.Mock;
let startAppleMonitor: jest.Mock;
let stopAppleMonitor: jest.Mock;
let auth: Record<string, jest.Mock>;
let listeners: Set<() => void>;
let appListeners: Set<(state: string) => void>;
let policy: { competition: { allowed: boolean }; revenueCat: { allowed: boolean }; revision: number };
function setAccess(allowed: boolean) {
  policy = { ...policy, competition: { allowed }, revision: policy.revision + 1 };
  listeners.forEach((listener) => listener());
}

beforeEach(async () => {
  jest.resetModules();
  appleRequired = false;
  appleFresh = true;
  appleStatus = { status: 'no-revocation-recorded', revision: 1 };
  appleCheck = jest.fn().mockImplementation(async () => appleStatus);
  appleLink = jest.fn().mockImplementation(async () => { appleStatus = { ...appleStatus, revision: appleStatus.revision + 1 }; return appleStatus; });
  stopAppleMonitor = jest.fn();
  startAppleMonitor = jest.fn(() => stopAppleMonitor);
  listeners = new Set();
  appListeners = new Set();
  policy = { competition: { allowed: false }, revenueCat: { allowed: false }, revision: 1 };
  auth = {
    getSession: jest.fn().mockResolvedValue({ data: { session }, error: null }),
    getUser: jest.fn().mockResolvedValue({ data: { user: session.user }, error: null }),
    signInAnonymously: jest.fn(),
    signOut: jest.fn().mockResolvedValue({ error: null }),
    startAutoRefresh: jest.fn(),
    stopAutoRefresh: jest.fn(),
  };
  createClient = jest.fn().mockReturnValue({ auth } as unknown as SupabaseClient);
  jest.doMock('@supabase/supabase-js', () => ({ createClient }));
  jest.doMock('../privacy/processingAccess', () => ({
    getProcessingAccess: () => policy,
    getProcessingInputs: () => ({ appleRequirement: appleRequired ? 'required' : 'not-required' }),
    subscribeProcessingAccess: (listener: () => void) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  }));
  jest.doMock('../privacy/appleRescission', () => ({
    ensureCurrentAppleRescissionStatus: () => appleCheck(),
    getAppleRescissionStatus: () => appleStatus,
    isAppleRescissionStatusFresh: () => appleFresh,
    linkAppleRescissionToExistingAccount: (token: string) => appleLink(token),
    startAppleRescissionMonitoring: () => startAppleMonitor(),
  }));
  jest.doMock('@/config/release', () => ({ ONLINE_SERVICES: {
    supabaseUrl: 'https://test.supabase.co', supabasePublishableKey: 'public-test',
  } }));
  jest.doMock('react-native-url-polyfill/auto', () => ({}));
  jest.doMock('react-native', () => ({ Platform: { OS: 'ios' }, AppState: {
    currentState: 'active',
    addEventListener: (_event: string, listener: (state: string) => void) => {
      appListeners.add(listener);
      return { remove: () => appListeners.delete(listener) };
    },
  } }));
  const storageModule = require('@react-native-async-storage/async-storage');
  storage = storageModule.default ?? storageModule;
  await storage.clear();
  store = require('@/utils/game/store');
  store.useGameStore.setState({ competitionTermsVersion: store.COMPETITION_TERMS_VERSION, hydrated: true });
  api = require('../competitionApi');
  global.fetch = jest.fn().mockResolvedValue(response());
});

test('unknown eligibility blocks public reads and run creation before anonymous Auth', async () => {
  await expect(api.competitionRequest('/leaderboard')).rejects.toBeInstanceOf(api.CompetitionAccessRequiredError);
  await expect(api.beginCompetitionRun({ kind: 'leaderboard', exercise: 'squats' })).rejects.toBeInstanceOf(api.CompetitionAccessRequiredError);
  expect(createClient).not.toHaveBeenCalled();
  expect(global.fetch).not.toHaveBeenCalled();
});

test('competition remains available when RevenueCat analytics is refused', async () => {
  setAccess(true);
  const body = deferred<Response>();
  (global.fetch as jest.Mock).mockReturnValue(body.promise);
  const request = api.competitionRequest('/leaderboard');
  // A central revision change for another purpose must not revoke this request.
  policy = { ...policy, revision: policy.revision + 1, revenueCat: { allowed: false } };
  listeners.forEach((listener) => listener());
  body.resolve(response({ scores: [] }));
  await expect(request).resolves.toEqual({ scores: [] });
  expect(policy.revenueCat.allowed).toBe(false);
});

test('community terms remain necessary even with independently allowed processing', async () => {
  setAccess(true);
  store.useGameStore.setState({ competitionTermsVersion: null });
  await expect(api.competitionRequest('/leaderboard')).rejects.toBeInstanceOf(api.CompetitionTermsRequiredError);
  expect(createClient).not.toHaveBeenCalled();
});

test('withdrawal during session loading cannot create a guest or later send a request', async () => {
  setAccess(true);
  const started = deferred<void>();
  const sessionRead = deferred<{ data: { session: null }; error: null }>();
  auth.getSession.mockImplementation(() => { started.resolve(); return sessionRead.promise; });
  const request = api.competitionRequest('/leaderboard');
  const expected = expect(request).rejects.toBeInstanceOf(api.CompetitionAccessRequiredError);
  await started.promise;
  setAccess(false);
  sessionRead.resolve({ data: { session: null }, error: null });
  await expected;
  expect(auth.signInAnonymously).not.toHaveBeenCalled();
  expect(global.fetch).not.toHaveBeenCalled();
  expect(auth.stopAutoRefresh).toHaveBeenCalled();
});

test('withdrawal aborts an in-flight request and ignores its late success after regrant', async () => {
  setAccess(true);
  const started = deferred<AbortSignal>();
  const pending = deferred<Response>();
  (global.fetch as jest.Mock).mockImplementation((_url, init: RequestInit) => {
    started.resolve(init.signal as AbortSignal);
    return pending.promise;
  });
  const request = api.competitionRequest('/leaderboard');
  const expected = expect(request).rejects.toBeInstanceOf(api.CompetitionAccessRequiredError);
  const signal = await started.promise;
  setAccess(false);
  setAccess(true);
  expect(signal.aborted).toBe(true);
  pending.resolve(response({ scores: ['stale'] }));
  await expected;
});

test('Supabase transport is gated independently of periodic refresh', async () => {
  setAccess(true);
  await api.competitionRequest('/leaderboard');
  const options = createClient.mock.calls[0][2];
  expect(options.auth.autoRefreshToken).toBe(false);
  setAccess(false);
  (global.fetch as jest.Mock).mockClear();
  await expect(options.global.fetch('https://test.supabase.co/auth/v1/token', { method: 'POST' }))
    .rejects.toBeInstanceOf(api.CompetitionAccessRequiredError);
  appListeners.forEach((listener) => listener('active'));
  expect(global.fetch).not.toHaveBeenCalled();
});

test('withdrawal preserves queued local scores and foreground retry sends nothing until reauthorized', async () => {
  const input = { runId: 'existing-run', expiresAt: new Date(Date.now() + 60_000).toISOString(), playerName: 'Bird', score: 5, durationMs: 10000 };
  const result = await api.submitCompetitionRunResult(input);
  expect(result.status).toBe('local');
  const saved = await storage.getItem('@flapfit/competition-result-outbox-v1');
  expect(saved).toContain('existing-run');
  const onSubmitted = jest.fn();
  const stop = api.startCompetitionForegroundRetry(onSubmitted);
  appListeners.forEach((listener) => listener('active'));
  await expect(api.flushPendingCompetitionResults()).resolves.toMatchObject({ pending: 1, submitted: 0 });
  expect(await storage.getItem('@flapfit/competition-result-outbox-v1')).toBe(saved);
  expect(createClient).not.toHaveBeenCalled();
  expect(global.fetch).not.toHaveBeenCalled();
  expect(onSubmitted).not.toHaveBeenCalled();
  setAccess(true);
  await expect(api.flushPendingCompetitionResults()).resolves.toMatchObject({ submitted: 1, pending: 0 });
  stop();
});

test('revocation during score submission preserves it and suppresses foreground success', async () => {
  const pendingEntry = { runId: 'in-flight', expiresAt: new Date(Date.now() + 60_000).toISOString(), createdAt: new Date().toISOString(), playerName: 'Bird', score: 5, durationMs: 10000 };
  await storage.setItem('@flapfit/competition-result-outbox-v1', JSON.stringify([pendingEntry]));
  setAccess(true);
  const started = deferred<void>();
  const result = deferred<Response>();
  (global.fetch as jest.Mock).mockImplementation(() => { started.resolve(); return result.promise; });
  const onSubmitted = jest.fn();
  const stop = api.startCompetitionForegroundRetry(onSubmitted);
  appListeners.forEach((listener) => listener('active'));
  await started.promise;
  setAccess(false);
  result.resolve(response({ accepted: true }));
  const remaining = await api.flushPendingCompetitionResults();
  expect(remaining.pendingRunIds).toEqual(['in-flight']);
  expect(onSubmitted).not.toHaveBeenCalled();
  stop();
});

test('withdrawal does not block deletion of an existing identity or create a replacement guest', async () => {
  (global.fetch as jest.Mock).mockResolvedValue(response({ deleted: true }));
  await api.deleteCompetitionIdentity();
  expect(createClient.mock.calls[0][2]).toMatchObject({ auth: { autoRefreshToken: false } });
  expect(createClient.mock.calls[0][2].global).toBeUndefined();
  expect(auth.startAutoRefresh).not.toHaveBeenCalled();
  expect(auth.signInAnonymously).not.toHaveBeenCalled();
  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect((global.fetch as jest.Mock).mock.calls[0][1].method).toBe('DELETE');
  await expect(api.competitionRequest('/me', { method: 'DELETE' })).rejects.toThrow('existing online session');
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test('support ID lookup after withdrawal only uses an existing identity', async () => {
  await expect(api.getCompetitionSupportId()).resolves.toBe('existing-user');
  expect(auth.signInAnonymously).not.toHaveBeenCalled();
  expect(auth.startAutoRefresh).not.toHaveBeenCalled();
});

test('a late Supabase Auth response body cannot complete after withdrawal', async () => {
  setAccess(true);
  await api.competitionRequest('/leaderboard');
  const transport = createClient.mock.calls[0][2].global.fetch;
  const pendingBody = deferred<object>();
  const started = deferred<void>();
  const nativeResponse = {
    ok: true, status: 200,
    json: () => { started.resolve(); return pendingBody.promise; },
    text: async () => '',
  };
  let networkSignal: AbortSignal | undefined;
  (global.fetch as jest.Mock).mockImplementation((_url, init: RequestInit) => {
    networkSignal = init.signal as AbortSignal;
    return Promise.resolve(nativeResponse);
  });
  const headers = await transport('https://test.supabase.co/auth/v1/token', { method: 'POST' });
  const body = headers.json();
  const expected = expect(body).rejects.toBeInstanceOf(api.CompetitionAccessRequiredError);
  await started.promise;
  setAccess(false);
  expect(networkSignal?.aborted).toBe(true);
  pendingBody.resolve({ access_token: 'too-late' });
  await expected;
});

test('concurrent first-use requests share one anonymous identity and its returned token', async () => {
  setAccess(true);
  const signupStarted = deferred<void>();
  const signup = deferred<{ data: { user: typeof session.user; session: typeof session }; error: null }>();
  let savedSession: typeof session | null = null;
  auth.getSession.mockImplementation(async () => ({ data: { session: savedSession }, error: null }));
  auth.signInAnonymously.mockImplementation(() => {
    signupStarted.resolve();
    return signup.promise.then((result) => { savedSession = result.data.session; return result; });
  });

  const read = api.competitionRequest('/leaderboard');
  await signupStarted.promise;
  const run = api.beginCompetitionRun({ kind: 'leaderboard', exercise: 'squats' });
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(auth.signInAnonymously).toHaveBeenCalledTimes(1);
  expect(global.fetch).not.toHaveBeenCalled();
  signup.resolve({ data: { user: session.user, session }, error: null });

  await Promise.all([read, run]);
  expect(auth.signInAnonymously).toHaveBeenCalledTimes(1);
  expect(global.fetch).toHaveBeenCalledTimes(2);
  for (const [, init] of (global.fetch as jest.Mock).mock.calls) {
    expect(init.headers.Authorization).toBe('Bearer existing-token');
  }
  await api.competitionRequest('/leaderboard');
  expect(auth.signInAnonymously).toHaveBeenCalledTimes(1);
});

test('a failed shared signup is cleared so a later request can recover', async () => {
  setAccess(true);
  const signupStarted = deferred<void>();
  const signup = deferred<{ data: { user: null; session: null }; error: Error }>();
  auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  auth.signInAnonymously.mockImplementationOnce(() => { signupStarted.resolve(); return signup.promise; });

  const first = api.competitionRequest('/leaderboard');
  await signupStarted.promise;
  const second = api.beginCompetitionRun({ kind: 'leaderboard', exercise: 'pullups' });
  const outcomes = Promise.allSettled([first, second]);
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(auth.signInAnonymously).toHaveBeenCalledTimes(1);
  signup.resolve({ data: { user: null, session: null }, error: new Error('Temporary signup failure') });
  expect((await outcomes).map((result) => result.status)).toEqual(['rejected', 'rejected']);
  expect(global.fetch).not.toHaveBeenCalled();

  auth.signInAnonymously.mockResolvedValue({ data: { user: session.user, session }, error: null });
  await expect(api.competitionRequest('/leaderboard')).resolves.toEqual({});
  expect(auth.signInAnonymously).toHaveBeenCalledTimes(2);
  expect((global.fetch as jest.Mock).mock.calls[0][1].headers.Authorization).toBe('Bearer existing-token');
});

test.each(['privacy denied', 'terms missing'])('an intentionally local run has a local outcome without upload activity: %s', async (reason) => {
  if (reason === 'terms missing') {
    setAccess(true);
    store.useGameStore.setState({ competitionTermsVersion: null });
  }
  const run = await api.prepareCompetitionRun({ kind: 'leaderboard', exercise: 'squats' });
  const publishStatus = jest.fn();
  const result = await api.submitPreparedCompetitionRunResult(run, {
    playerName: 'Bird', score: 4, durationMs: 8000,
  }, publishStatus);
  expect(run).toEqual({ kind: 'local' });
  expect(result.status).toBe('local');
  expect(publishStatus).not.toHaveBeenCalled();
  expect(createClient).not.toHaveBeenCalled();
  expect(global.fetch).not.toHaveBeenCalled();
  expect(await storage.getItem('@flapfit/competition-result-outbox-v1')).toBeNull();
});

test('granting processing later does not retroactively publish a run that began locally', async () => {
  const run = await api.prepareCompetitionRun({ kind: 'leaderboard', exercise: 'pullups' });
  setAccess(true);
  const publishStatus = jest.fn();
  await expect(api.submitPreparedCompetitionRunResult(run, {
    playerName: 'Bird', score: 4, durationMs: 8000,
  }, publishStatus)).resolves.toMatchObject({ status: 'local' });
  expect(publishStatus).not.toHaveBeenCalled();
  expect(global.fetch).not.toHaveBeenCalled();
  expect(createClient).not.toHaveBeenCalled();
});

test('actual online run creation failure stays distinct from a deliberate local run', async () => {
  setAccess(true);
  (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 503, json: async () => ({ error: 'Temporarily unavailable' }) });
  const run = await api.prepareCompetitionRun({ kind: 'leaderboard', exercise: 'squats' });
  expect(run.kind).toBe('unavailable');
  const publishStatus = jest.fn();
  await expect(api.submitPreparedCompetitionRunResult(run, {
    playerName: 'Bird', score: 4, durationMs: 8000,
  }, publishStatus)).resolves.toMatchObject({ status: 'rejected' });
  expect(publishStatus).not.toHaveBeenCalled();
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test('withdrawal during run creation settles as local even after an immediate regrant', async () => {
  setAccess(true);
  const started = deferred<void>();
  const reply = deferred<Response>();
  (global.fetch as jest.Mock).mockImplementation(() => { started.resolve(); return reply.promise; });
  const runPromise = api.prepareCompetitionRun({ kind: 'leaderboard', exercise: 'squats' });
  await started.promise;
  setAccess(false);
  setAccess(true);
  reply.resolve(response({ run_id: 'late-run', expires_at: new Date(Date.now() + 60_000).toISOString() }));
  const run = await runPromise;
  expect(run.kind).toBe('local');
  const publishStatus = jest.fn();
  await expect(api.submitPreparedCompetitionRunResult(run, {
    playerName: 'Bird', score: 4, durationMs: 8000,
  }, publishStatus)).resolves.toMatchObject({ status: 'local' });
  expect(publishStatus).not.toHaveBeenCalled();
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test('withdrawal after online run creation keeps its score locally without publishing status or transport', async () => {
  setAccess(true);
  (global.fetch as jest.Mock).mockResolvedValue(response({ run_id: 'authorized-run', expires_at: new Date(Date.now() + 60_000).toISOString() }));
  const run = await api.prepareCompetitionRun({ kind: 'leaderboard', exercise: 'squats' });
  setAccess(false);
  (global.fetch as jest.Mock).mockClear();
  const publishStatus = jest.fn();
  await expect(api.submitPreparedCompetitionRunResult(run, {
    playerName: 'Bird', score: 4, durationMs: 8000,
  }, publishStatus)).resolves.toMatchObject({ status: 'local' });
  expect(publishStatus).not.toHaveBeenCalled();
  expect(global.fetch).not.toHaveBeenCalled();
  expect(await storage.getItem('@flapfit/competition-result-outbox-v1')).toContain('authorized-run');
});

test('the result-status callback reports a real online upload and accepted outcome', async () => {
  setAccess(true);
  (global.fetch as jest.Mock).mockResolvedValueOnce(response({ run_id: 'online-run', expires_at: new Date(Date.now() + 60_000).toISOString() }));
  const run = await api.prepareCompetitionRun({ kind: 'leaderboard', exercise: 'squats' });
  const statuses: string[] = [];
  const outcome = await api.submitPreparedCompetitionRunResult(run, {
    playerName: 'Bird', score: 4, durationMs: 8000,
  }, () => { statuses.push('publishing'); });
  statuses.push(outcome.status);
  expect(statuses).toEqual(['publishing', 'accepted']);
  expect(global.fetch).toHaveBeenCalledTimes(2);
});

test('withdrawal while publishing yields local status rather than a failed upload message', async () => {
  setAccess(true);
  (global.fetch as jest.Mock).mockResolvedValueOnce(response({ run_id: 'withdrawn-upload', expires_at: new Date(Date.now() + 60_000).toISOString() }));
  const run = await api.prepareCompetitionRun({ kind: 'leaderboard', exercise: 'squats' });
  const started = deferred<void>();
  const reply = deferred<Response>();
  (global.fetch as jest.Mock).mockImplementation(() => { started.resolve(); return reply.promise; });
  const statuses: string[] = [];
  const result = api.submitPreparedCompetitionRunResult(run, {
    playerName: 'Bird', score: 4, durationMs: 8000,
  }, () => { statuses.push('publishing'); });
  await started.promise;
  setAccess(false);
  reply.resolve(response({ accepted: true }));
  statuses.push((await result).status);
  expect(statuses).toEqual(['publishing', 'local']);
  expect(await storage.getItem('@flapfit/competition-result-outbox-v1')).toContain('withdrawn-upload');
});

test('a full online outbox does not turn a withdrawn run into an upload failure', async () => {
  const entries = Array.from({ length: 25 }, (_, index) => ({
    runId: 'existing-' + index, expiresAt: new Date(Date.now() + 60_000).toISOString(),
    createdAt: new Date().toISOString(), playerName: 'Bird', score: 2, durationMs: 4000,
  }));
  const saved = JSON.stringify(entries);
  await storage.setItem('@flapfit/competition-result-outbox-v1', saved);
  const publishStatus = jest.fn();
  await expect(api.submitPreparedCompetitionRunResult({
    kind: 'online', session: { runId: 'withdrawn-new-run', expiresAt: new Date(Date.now() + 60_000).toISOString() },
  }, { playerName: 'Bird', score: 4, durationMs: 8000 }, publishStatus)).resolves.toMatchObject({ status: 'local' });
  expect(publishStatus).not.toHaveBeenCalled();
  expect(global.fetch).not.toHaveBeenCalled();
  expect(await storage.getItem('@flapfit/competition-result-outbox-v1')).toBe(saved);
  expect(await storage.getItem('@flapfit/competition-result-notices-v1')).toBeNull();
});

test('one first-use caller timing out does not cancel another caller sharing its identity lookup', async () => {
  jest.useFakeTimers();
  try {
    setAccess(true);
    const started = deferred<void>();
    const lookup = deferred<{ data: { session: typeof session }; error: null }>();
    auth.getSession.mockImplementation(() => { started.resolve(); return lookup.promise; });
    const first = api.competitionRequest('/leaderboard', { timeoutMs: 100 });
    const rejected = expect(first).rejects.toMatchObject({ status: 408 });
    await started.promise;
    const second = api.competitionRequest('/leaderboard', { timeoutMs: 200 });
    await jest.advanceTimersByTimeAsync(100);
    await rejected;
    lookup.resolve({ data: { session }, error: null });
    await expect(second).resolves.toEqual({});
    expect(auth.getSession).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  } finally {
    jest.useRealTimers();
  }
});

test('a timed-out identity lookup cannot poison retries or create a guest from its late result', async () => {
  jest.useFakeTimers();
  try {
    setAccess(true);
    const started = deferred<void>();
    const lookup = deferred<{ data: { session: null }; error: null }>();
    auth.getSession.mockImplementationOnce(() => { started.resolve(); return lookup.promise; });
    const first = api.competitionRequest('/leaderboard', { timeoutMs: 100 });
    const rejected = expect(first).rejects.toMatchObject({ status: 408 });
    await started.promise;
    await jest.advanceTimersByTimeAsync(100);
    await rejected;
    await expect(api.competitionRequest('/leaderboard')).resolves.toEqual({});
    lookup.resolve({ data: { session: null }, error: null });
    await Promise.resolve();
    await Promise.resolve();
    expect(auth.signInAnonymously).not.toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  } finally {
    jest.useRealTimers();
  }
});

test('the last caller timing out aborts shared Auth transport and rejects its late body', async () => {
  setAccess(true);
  await api.competitionRequest('/leaderboard');
  const transport = createClient.mock.calls[0][2].global.fetch;
  jest.useFakeTimers();
  try {
    const started = deferred<void>();
    const body = deferred<object>();
    const sessionInstalled = jest.fn();
    const lateAuth = deferred<void>();
    let networkSignal: AbortSignal | undefined;
    (global.fetch as jest.Mock).mockImplementation((_url, init: RequestInit) => {
      networkSignal = init.signal as AbortSignal;
      return Promise.resolve({
        ok: true, status: 200,
        json: () => { started.resolve(); return body.promise; },
        text: async () => '',
      });
    });
    auth.getSession.mockImplementationOnce(async () => {
      try {
        const headers = await transport('https://test.supabase.co/auth/v1/token', { method: 'POST' });
        await headers.json();
        sessionInstalled();
        return { data: { session }, error: null };
      } finally {
        lateAuth.resolve();
      }
    });
    const request = api.competitionRequest('/leaderboard', { timeoutMs: 100 });
    const rejected = expect(request).rejects.toMatchObject({ status: 408 });
    await started.promise;
    await jest.advanceTimersByTimeAsync(100);
    await rejected;
    expect(networkSignal?.aborted).toBe(true);
    body.resolve({ access_token: 'late-token' });
    await lateAuth.promise;
    expect(sessionInstalled).not.toHaveBeenCalled();
    (global.fetch as jest.Mock).mockResolvedValue(response());
    await expect(api.competitionRequest('/leaderboard')).resolves.toEqual({});
  } finally {
    jest.useRealTimers();
  }
});


test('required Apple status is checked before any anonymous identity exists', async () => {
  appleRequired = true; setAccess(true);
  appleStatus = { status: 'unavailable', revision: 2 }; appleFresh = false;
  await expect(api.competitionRequest('/leaderboard')).rejects.toBeInstanceOf(api.CompetitionAccessRequiredError);
  expect(appleCheck).toHaveBeenCalledTimes(1); expect(createClient).not.toHaveBeenCalled();
  expect(auth.signInAnonymously).not.toHaveBeenCalled(); expect(global.fetch).not.toHaveBeenCalled();
});

test('required first use shares one identity and waits for verified link before all competition dispatches', async () => {
  appleRequired = true; setAccess(true);
  auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  auth.signInAnonymously.mockResolvedValue({ data: { user: session.user, session }, error: null });
  const started = deferred<void>(); const link = deferred<{ status: string; revision: number }>();
  appleLink.mockImplementation(() => { started.resolve(); return link.promise; });
  const first = api.competitionRequest('/leaderboard');
  const second = api.competitionRequest('/leaderboard');
  await started.promise;
  expect(appleLink).toHaveBeenCalledWith('existing-token'); expect(auth.signInAnonymously).toHaveBeenCalledTimes(1);
  expect(global.fetch).not.toHaveBeenCalled();
  appleStatus = { status: 'no-revocation-recorded', revision: 3 }; link.resolve(appleStatus);
  await expect(Promise.all([first,second])).resolves.toEqual([{},{}]);
  expect(global.fetch).toHaveBeenCalledTimes(2); expect(appleLink).toHaveBeenCalledTimes(1);
});

test('fresh linked profile is reused without repeatedly starting link checks', async () => {
  appleRequired = true; setAccess(true);
  await api.competitionRequest('/leaderboard'); await api.competitionRequest('/leaderboard');
  expect(appleLink).toHaveBeenCalledTimes(1); expect(global.fetch).toHaveBeenCalledTimes(2);
});

test.each(['revoked','unavailable'])('required link %s cannot dispatch a game request', async (status) => {
  appleRequired = true; setAccess(true);
  appleLink.mockImplementation(async () => { appleStatus = { status, revision: 3 }; appleFresh=false; return appleStatus; });
  await expect(api.competitionRequest('/leaderboard')).rejects.toBeInstanceOf(api.CompetitionAccessRequiredError);
  expect(global.fetch).not.toHaveBeenCalled();
});

test('a status invalidated during required authentication prevents linking or dispatch', async () => {
  appleRequired = true; setAccess(true);
  const started=deferred<void>(); const lookup=deferred<{data:{session:typeof session};error:null}>();
  auth.getSession.mockImplementation(() => {started.resolve(); return lookup.promise;});
  const request=api.competitionRequest('/leaderboard'); const failure=expect(request).rejects.toBeInstanceOf(api.CompetitionAccessRequiredError);
  await started.promise; appleFresh=false; appleStatus={status:'unknown',revision:4};
  lookup.resolve({data:{session},error:null}); await failure;
  expect(appleLink).not.toHaveBeenCalled(); expect(global.fetch).not.toHaveBeenCalled();
});

test('stale link completion cannot dispatch or bypass an independent competition refusal', async () => {
  appleRequired = true; setAccess(true);
  const started=deferred<void>();const link=deferred<{status:string;revision:number}>();
  appleLink.mockImplementation(() => {started.resolve();return link.promise;});
  const request=api.competitionRequest('/leaderboard');const failure=expect(request).rejects.toBeInstanceOf(api.CompetitionAccessRequiredError);
  await started.promise;setAccess(false);link.resolve(appleStatus);await failure;
  expect(global.fetch).not.toHaveBeenCalled();
});

test('required Apple denial still permits authenticated deletion and support without status, link, or signup', async () => {
  appleRequired=true;appleFresh=false;appleStatus={status:'revoked',revision:3};
  expect(await api.getCompetitionSupportId()).toBe('existing-user');
  (global.fetch as jest.Mock).mockResolvedValue(response({deleted:true}));
  await api.deleteCompetitionIdentity();
  expect(appleCheck).not.toHaveBeenCalled();expect(appleLink).not.toHaveBeenCalled();
  expect(auth.signInAnonymously).not.toHaveBeenCalled();
  expect((global.fetch as jest.Mock).mock.calls[0][1].method).toBe('DELETE');
});


test('the existing root foreground service already starts required Apple monitoring without competition participation', () => {
  store.useGameStore.setState({ competitionTermsVersion: null });
  const stop = api.startCompetitionForegroundRetry(jest.fn());
  expect(startAppleMonitor).not.toHaveBeenCalled();
  appleRequired = true; listeners.forEach(listener => listener());
  expect(startAppleMonitor).toHaveBeenCalledTimes(1);
  expect(createClient).not.toHaveBeenCalled(); expect(auth.signInAnonymously).not.toHaveBeenCalled();
  expect(global.fetch).not.toHaveBeenCalled();
  listeners.forEach(listener => listener()); expect(startAppleMonitor).toHaveBeenCalledTimes(1);
  stop(); expect(stopAppleMonitor).toHaveBeenCalledTimes(1);
});

test('an already-required duty starts monitoring at root-service mount without an Auth session', () => {
  appleRequired = true;
  const stop = api.startCompetitionForegroundRetry(jest.fn());
  expect(startAppleMonitor).toHaveBeenCalledTimes(1); expect(createClient).not.toHaveBeenCalled();
  stop(); listeners.forEach(listener => listener());
  expect(startAppleMonitor).toHaveBeenCalledTimes(1);
});

test('required monitoring is not duplicated by synchronous restriction publication and stops when the duty clears', () => {
  startAppleMonitor.mockImplementation(() => { listeners.forEach(listener => listener()); return stopAppleMonitor; });
  const stop = api.startCompetitionForegroundRetry(jest.fn());
  appleRequired = true; listeners.forEach(listener => listener());
  expect(startAppleMonitor).toHaveBeenCalledTimes(1);
  appleRequired = false; listeners.forEach(listener => listener());
  expect(stopAppleMonitor).toHaveBeenCalledTimes(1);
  stop(); expect(stopAppleMonitor).toHaveBeenCalledTimes(1);
});
