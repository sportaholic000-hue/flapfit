import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { COMPETITION_TERMS_VERSION, useGameStore } from '@/utils/game/store';
import {
  competitionRequest,
  consumeCompetitionSubmissionNotices,
  flushPendingCompetitionResults,
  getCompetitionSupportId,
  submitCompetitionRunResult,
} from '../competitionApi';

jest.mock('@/config/release', () => ({
  ONLINE_SERVICES: {
    supabaseUrl: 'https://test.supabase.co',
    supabasePublishableKey: 'sb_publishable_test',
  },
}));

jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }));

const auth = {
  getSession: jest.fn(),
  signInAnonymously: jest.fn(),
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
  await AsyncStorage.clear();
  jest.clearAllMocks();
  useGameStore.setState({ competitionTermsVersion: COMPETITION_TERMS_VERSION });
  auth.getSession.mockResolvedValue({
    data: { session: { user: { id: 'test-user' }, access_token: 'test-token' } },
    error: null,
  });
  (createClient as jest.Mock).mockReturnValue({ auth });
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
