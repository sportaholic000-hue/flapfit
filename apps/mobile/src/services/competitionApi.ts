import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { AppState, type AppStateStatus } from 'react-native';
import 'react-native-url-polyfill/auto';
import { ONLINE_SERVICES } from '@/config/release';
import { COMPETITION_TERMS_VERSION, useGameStore } from '@/utils/game/store';

const FUNCTION_NAME = 'flapfit-game';

let client: SupabaseClient | null = null;
let appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;

export class CompetitionUnavailableError extends Error {
  constructor(message = 'Online competition is not available yet.') {
    super(message);
    this.name = 'CompetitionUnavailableError';
  }
}

export class CompetitionTermsRequiredError extends Error {
  constructor(message = 'Accept the online competition terms before using Compete.') {
    super(message);
    this.name = 'CompetitionTermsRequiredError';
  }
}

export const competitionIsConfigured = Boolean(
  ONLINE_SERVICES.supabaseUrl && ONLINE_SERVICES.supabasePublishableKey
);

function updateAutoRefresh(state: AppStateStatus) {
  if (!client) return;
  if (state === 'active') client.auth.startAutoRefresh();
  else client.auth.stopAutoRefresh();
}

function getClient(): SupabaseClient {
  if (!competitionIsConfigured) throw new CompetitionUnavailableError();
  if (client) return client;

  client = createClient(ONLINE_SERVICES.supabaseUrl, ONLINE_SERVICES.supabasePublishableKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });

  appStateSubscription ??= AppState.addEventListener('change', updateAutoRefresh);
  updateAutoRefresh(AppState.currentState);
  return client;
}

async function anonymousUser(): Promise<{ client: SupabaseClient; user: User }> {
  const supabase = getClient();
  const sessionResult = await supabase.auth.getSession();
  if (sessionResult.error) throw sessionResult.error;
  if (sessionResult.data.session?.user) {
    return { client: supabase, user: sessionResult.data.session.user };
  }

  const signInResult = await supabase.auth.signInAnonymously();
  if (signInResult.error || !signInResult.data.user || !signInResult.data.session) {
    throw signInResult.error ?? new Error('Could not create an anonymous game profile.');
  }
  return { client: supabase, user: signInResult.data.user };
}

type CompetitionRequestOptions = {
  method?: 'GET' | 'POST' | 'DELETE';
  body?: unknown;
  timeoutMs?: number;
};

export type CompetitionRunKind = 'leaderboard' | 'challenge';

export type CompetitionRunSession = {
  runId: string;
  expiresAt: string;
};

type PendingCompetitionResult = {
  runId: string;
  playerName: string;
  score: number;
  durationMs: number;
  createdAt: string;
};

const COMPETITION_OUTBOX_KEY = '@flapfit/competition-result-outbox-v1';
const MAX_PENDING_RESULTS = 25;
const MAX_PENDING_RESULT_AGE_MS = 7 * 24 * 60 * 60 * 1000;
let outboxOperation = Promise.resolve();

export class CompetitionRequestError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = 'CompetitionRequestError';
  }
}

export function normalizeCompetitionPlayerName(value: string): string {
  return Array.from(value.normalize('NFKC'))
    .filter((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint > 31 && codePoint !== 127;
    })
    .join('')
    .trim()
    .replace(/\s+/g, ' ');
}

export function competitionPlayerNameError(value: string): string | null {
  const name = normalizeCompetitionPlayerName(value);
  if (name.length < 2 || name.length > 20) return 'Player names must be 2 to 20 characters.';
  if (!/^[\p{L}\p{N}][\p{L}\p{N} _.\-']+$/u.test(name)) {
    return 'Use letters, numbers, spaces, apostrophes, periods, underscores, or hyphens.';
  }
  return null;
}

async function readCompetitionOutbox(): Promise<PendingCompetitionResult[]> {
  const stored = await AsyncStorage.getItem(COMPETITION_OUTBOX_KEY);
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored) as unknown;
    if (!Array.isArray(parsed)) return [];
    const oldestAllowed = Date.now() - MAX_PENDING_RESULT_AGE_MS;
    return parsed.filter((entry): entry is PendingCompetitionResult => {
      if (!entry || typeof entry !== 'object') return false;
      const candidate = entry as Partial<PendingCompetitionResult>;
      return (
        typeof candidate.runId === 'string' &&
        typeof candidate.playerName === 'string' &&
        Number.isInteger(candidate.score) &&
        Number.isInteger(candidate.durationMs) &&
        typeof candidate.createdAt === 'string' &&
        Date.parse(candidate.createdAt) >= oldestAllowed
      );
    });
  } catch {
    return [];
  }
}

async function writeCompetitionOutbox(entries: PendingCompetitionResult[]) {
  if (entries.length === 0) {
    await AsyncStorage.removeItem(COMPETITION_OUTBOX_KEY);
    return;
  }
  await AsyncStorage.setItem(
    COMPETITION_OUTBOX_KEY,
    JSON.stringify(entries.slice(-MAX_PENDING_RESULTS))
  );
}

function withOutboxLock<T>(operation: () => Promise<T>): Promise<T> {
  const next = outboxOperation.then(operation, operation);
  outboxOperation = next.then(
    () => undefined,
    () => undefined
  );
  return next;
}

export async function competitionRequest<T>(
  path: string,
  options: CompetitionRequestOptions = {}
): Promise<T> {
  const method = options.method ?? 'GET';
  const requiresCurrentTerms = !(method === 'DELETE' && path === '/me');
  if (
    requiresCurrentTerms &&
    useGameStore.getState().competitionTermsVersion !== COMPETITION_TERMS_VERSION
  ) {
    throw new CompetitionTermsRequiredError();
  }

  const { client: supabase } = await anonymousUser();
  const sessionResult = await supabase.auth.getSession();
  const accessToken = sessionResult.data.session?.access_token;
  if (!accessToken) throw new CompetitionUnavailableError('Online session could not be started.');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 15000);
  let response: Response;
  try {
    response = await fetch(`${ONLINE_SERVICES.supabaseUrl}/functions/v1/${FUNCTION_NAME}${path}`, {
      method,
      headers: {
        apikey: ONLINE_SERVICES.supabasePublishableKey,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...(requiresCurrentTerms ? { 'X-FlapFit-Terms-Version': COMPETITION_TERMS_VERSION } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new CompetitionRequestError('Online request timed out. It will be retried.', 408);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  const payload = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!response.ok) {
    throw new CompetitionRequestError(
      payload?.error || `Online request failed (${response.status}).`,
      response.status
    );
  }
  if (payload == null) throw new Error('Online service returned an empty response.');
  return payload;
}

export async function beginCompetitionRun(input: {
  kind: CompetitionRunKind;
  exercise: string;
  challengeCode?: string | null;
}): Promise<CompetitionRunSession> {
  const response = await competitionRequest<{ run_id: string; expires_at: string }>('/runs', {
    method: 'POST',
    body: {
      kind: input.kind,
      exercise: input.exercise,
      ...(input.challengeCode ? { challengeCode: input.challengeCode } : {}),
    },
  });
  return { runId: response.run_id, expiresAt: response.expires_at };
}

export async function flushPendingCompetitionResults(): Promise<number> {
  if (!competitionIsConfigured) return 0;
  if (useGameStore.getState().competitionTermsVersion !== COMPETITION_TERMS_VERSION) return 0;

  return withOutboxLock(async () => {
    const pending = await readCompetitionOutbox();
    if (pending.length === 0) return 0;

    const remaining: PendingCompetitionResult[] = [];
    let submitted = 0;
    let retryLater = false;
    for (const entry of pending) {
      if (retryLater) {
        remaining.push(entry);
        continue;
      }
      try {
        await competitionRequest('/runs/finalize', { method: 'POST', body: entry });
        submitted += 1;
      } catch (error) {
        const permanent =
          error instanceof CompetitionRequestError &&
          [400, 404, 409, 410, 422].includes(error.status);
        if (!permanent) {
          remaining.push(entry);
          retryLater = true;
        }
      }
    }
    await writeCompetitionOutbox(remaining);
    return submitted;
  });
}

export async function submitCompetitionRunResult(input: {
  runId: string;
  playerName: string;
  score: number;
  durationMs: number;
}): Promise<number> {
  const entry: PendingCompetitionResult = {
    runId: input.runId,
    playerName: normalizeCompetitionPlayerName(input.playerName),
    score: Math.max(0, Math.trunc(input.score)),
    durationMs: Math.max(0, Math.trunc(input.durationMs)),
    createdAt: new Date().toISOString(),
  };
  await withOutboxLock(async () => {
    const pending = await readCompetitionOutbox();
    const withoutDuplicate = pending.filter((item) => item.runId !== entry.runId);
    await writeCompetitionOutbox([...withoutDuplicate, entry]);
  });
  return flushPendingCompetitionResults();
}

export async function clearPendingCompetitionResults(): Promise<void> {
  await withOutboxLock(() => writeCompetitionOutbox([]));
}

export async function deleteCompetitionIdentity(): Promise<void> {
  if (!competitionIsConfigured) return;
  const supabase = getClient();
  const sessionResult = await supabase.auth.getSession();
  if (sessionResult.error) throw sessionResult.error;
  if (!sessionResult.data.session?.user) {
    await clearPendingCompetitionResults();
    return;
  }

  await competitionRequest<{ deleted: true }>('/me', { method: 'DELETE' });
  await clearPendingCompetitionResults();
  await supabase.auth.signOut({ scope: 'local' });
}
