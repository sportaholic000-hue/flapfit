import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type Session, type SupabaseClient, type User } from '@supabase/supabase-js';
import { AppState, type AppStateStatus } from 'react-native';
import 'react-native-url-polyfill/auto';
import { ONLINE_SERVICES } from '@/config/release';
import { getProcessingAccess, subscribeProcessingAccess } from './privacy/processingAccess';
import { COMPETITION_TERMS_VERSION, useGameStore } from '@/utils/game/store';

const FUNCTION_NAME = 'flapfit-game';

let client: SupabaseClient | null = null;
let privacyRightsClient: SupabaseClient | null = null;
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

export class CompetitionAccessRequiredError extends CompetitionUnavailableError {
  constructor() {
    super('Online competition is unavailable until its privacy requirements are satisfied. Local progress is safe.');
    this.name = 'CompetitionAccessRequiredError';
  }
}

function competitionAccessAllowed() {
  return getProcessingAccess().competition.allowed &&
    useGameStore.getState().competitionTermsVersion === COMPETITION_TERMS_VERSION;
}

// An analytics-only choice must not interrupt competition. Invalidate only this
// purpose's access, including a brief withdrawal followed by a new grant.
let accessGeneration = 0;
let observedAccess = competitionAccessAllowed();
const activeRequests = new Set<() => void>();
function processingAccessChanged() {
  const allowed = competitionAccessAllowed();
  if (allowed !== observedAccess) {
    observedAccess = allowed;
    ++accessGeneration;
    for (const invalidate of [...activeRequests]) invalidate();
    updateAutoRefresh(AppState.currentState);
  }
}
subscribeProcessingAccess(processingAccessChanged);
useGameStore.subscribe((state, previous) => {
  if (state.competitionTermsVersion !== previous.competitionTermsVersion) processingAccessChanged();
});

type CompetitionAccess = { assert: () => void; signal: AbortSignal };
async function withCompetitionAccess<T>(operation: (access: CompetitionAccess) => Promise<T>): Promise<T> {
  if (!competitionAccessAllowed()) throw new CompetitionAccessRequiredError();
  const generation = accessGeneration;
  const controller = new AbortController();
  const assert = () => {
    if (generation !== accessGeneration || !competitionAccessAllowed()) throw new CompetitionAccessRequiredError();
  };
  let invalidate: () => void = () => undefined;
  const revoked = new Promise<never>((_, reject) => {
    invalidate = () => {
      controller.abort();
      reject(new CompetitionAccessRequiredError());
    };
  });
  activeRequests.add(invalidate);
  try {
    const result = await Promise.race([operation({ assert, signal: controller.signal }), revoked]);
    assert();
    return result;
  } finally {
    activeRequests.delete(invalidate);
    controller.abort();
  }
}

// Supabase can refresh an expired session inside getSession(), even when its
// periodic refresh timer is stopped. Gate its transport as well as Edge calls.
const competitionFetch: typeof fetch = (input, init) => withCompetitionAccess(async (access) => {
  const abort = () => controller.abort();
  const controller = new AbortController();
  const callerSignal = init?.signal;
  const identityOperation = pendingAnonymousIdentity;
  access.signal.addEventListener('abort', abort);
  callerSignal?.addEventListener('abort', abort);
  identityOperation?.controller.signal.addEventListener('abort', abort);
  if (callerSignal?.aborted || access.signal.aborted) controller.abort();
  try {
    access.assert();
    identityOperation?.assert();
    const response = await fetch(input, { ...init, signal: controller.signal });
    access.assert();
    identityOperation?.assert();
    // Auth reads the body after fetch resolves. Keep that second asynchronous
    // boundary revocable as well, so a late refresh cannot install a session.
    const protectBody = <T,>(read: () => Promise<T>) => () => withCompetitionAccess(async (bodyAccess) => {
      access.assert();
      identityOperation?.assert();
      bodyAccess.signal.addEventListener('abort', abort);
      identityOperation?.controller.signal.addEventListener('abort', abort);
      try {
        const body = await read();
        access.assert();
        bodyAccess.assert();
        identityOperation?.assert();
        return body;
      } finally {
        bodyAccess.signal.removeEventListener('abort', abort);
        identityOperation?.controller.signal.removeEventListener('abort', abort);
      }
    });
    response.json = protectBody(response.json.bind(response));
    response.text = protectBody(response.text.bind(response));
    return response;
  } finally {
    access.signal.removeEventListener('abort', abort);
    callerSignal?.removeEventListener('abort', abort);
    identityOperation?.controller.signal.removeEventListener('abort', abort);
  }
});

function updateAutoRefresh(state: AppStateStatus) {
  if (!client) return;
  if (state === 'active' && competitionAccessAllowed()) client.auth.startAutoRefresh();
  else client.auth.stopAutoRefresh();
}

function getClient(privacyRights = false): SupabaseClient {
  if (!competitionIsConfigured) throw new CompetitionUnavailableError();
  if (!privacyRights && !competitionAccessAllowed()) throw new CompetitionAccessRequiredError();
  const existing = privacyRights ? privacyRightsClient : client;
  if (existing) return existing;

  const created = createClient(ONLINE_SERVICES.supabaseUrl, ONLINE_SERVICES.supabasePublishableKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: false,
      persistSession: true,
      detectSessionInUrl: false,
    },
    ...(privacyRights ? {} : { global: { fetch: competitionFetch } }),
  });

  // Only explicit privacy-rights actions use this client. It never starts an
  // automatic refresh or creates an anonymous user, even after withdrawal.
  if (privacyRights) { privacyRightsClient = created; return created; }
  client = created;
  appStateSubscription ??= AppState.addEventListener('change', updateAutoRefresh);
  updateAutoRefresh(AppState.currentState);
  return client;
}

type AnonymousCompetitionIdentity = { client: SupabaseClient; user: User; session: Session };
type PendingAnonymousIdentity = {
  promise: Promise<AnonymousCompetitionIdentity>;
  controller: AbortController;
  assert: () => void;
  waiters: number;
};
let pendingAnonymousIdentity: PendingAnonymousIdentity | null = null;

function createAnonymousIdentityOperation(): PendingAnonymousIdentity {
  const controller = new AbortController();
  const generation = accessGeneration;
  const assert = () => {
    if (generation !== accessGeneration || !competitionAccessAllowed()) throw new CompetitionAccessRequiredError();
    if (controller.signal.aborted) throw new CompetitionRequestError('Online request timed out. It will be retried.', 408);
  };
  const operation: PendingAnonymousIdentity = {
    controller, assert, waiters: 0,
    promise: Promise.resolve(null as unknown as AnonymousCompetitionIdentity),
  };
  // Install the shared operation before Auth can enter the guarded transport.
  pendingAnonymousIdentity = operation;
  operation.promise = readAnonymousIdentity(assert).finally(() => {
    if (pendingAnonymousIdentity === operation) pendingAnonymousIdentity = null;
  });
  return operation;
}

async function anonymousUser(
  assertAccess: () => void,
  callerSignal: AbortSignal
): Promise<AnonymousCompetitionIdentity> {
  assertAccess();
  if (callerSignal.aborted) throw new CompetitionRequestError('Online request timed out. It will be retried.', 408);
  // Concurrent first-use reads/runs share one session read and signup. A caller
  // timing out releases only its own wait; the last caller cancels stale Auth.
  const operation = pendingAnonymousIdentity ?? createAnonymousIdentityOperation();
  ++operation.waiters;
  let abort: () => void = () => undefined;
  const cancelled = new Promise<never>((_, reject) => {
    abort = () => reject(new CompetitionRequestError('Online request timed out. It will be retried.', 408));
    callerSignal.addEventListener('abort', abort);
    if (callerSignal.aborted) abort();
  });
  try {
    const identity = await Promise.race([operation.promise, cancelled]);
    assertAccess();
    return identity;
  } finally {
    callerSignal.removeEventListener('abort', abort);
    if (--operation.waiters === 0) {
      operation.controller.abort();
      if (pendingAnonymousIdentity === operation) pendingAnonymousIdentity = null;
    }
  }
}

async function readAnonymousIdentity(assertAccess: () => void): Promise<AnonymousCompetitionIdentity> {
  assertAccess();
  const supabase = getClient();
  const sessionResult = await supabase.auth.getSession();
  assertAccess();
  if (sessionResult.error) throw sessionResult.error;
  if (sessionResult.data.session?.user) {
    return { client: supabase, user: sessionResult.data.session.user, session: sessionResult.data.session };
  }

  assertAccess();
  const signInResult = await supabase.auth.signInAnonymously();
  assertAccess();
  if (signInResult.error || !signInResult.data.user || !signInResult.data.session) {
    throw signInResult.error ?? new Error('Could not create an anonymous game profile.');
  }
  return { client: supabase, user: signInResult.data.user, session: signInResult.data.session };
}

type CompetitionRequestOptions = {
  method?: 'GET' | 'POST' | 'DELETE';
  body?: unknown;
  timeoutMs?: number;
  // Deletion must use the existing identity, never create a replacement guest.
  existingSession?: { access_token: string; user: { id: string } };
};

export type CompetitionRunKind = 'leaderboard';

export type CompetitionRunSession = {
  runId: string;
  expiresAt: string;
};

type PendingCompetitionResult = {
  runId: string;
  playerName: string;
  score: number;
  durationMs: number;
  expiresAt: string;
  createdAt: string;
};

export type CompetitionSubmissionNotice = {
  runId: string;
  status: number;
  message: string;
};

export type CompetitionFlushResult = {
  submitted: number;
  pending: number;
  submittedRunIds: string[];
  pendingRunIds: string[];
  rejected: CompetitionSubmissionNotice[];
};

export type CompetitionSubmissionOutcome = {
  status: 'accepted' | 'pending' | 'rejected' | 'local';
  message: string;
};

const COMPETITION_OUTBOX_KEY = '@flapfit/competition-result-outbox-v1';
const COMPETITION_NOTICE_KEY = '@flapfit/competition-result-notices-v1';
const COMPETITION_DELETION_KEY = '@flapfit/competition-deletion-v1';
const MAX_PENDING_RESULTS = 25;
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

function isBlockedCompetitionPlayerName(name: string): boolean {
  const moderationName = name
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[0@]/g, 'o')
    .replace(/[1!|]/g, 'i')
    .replace(/[3]/g, 'e')
    .replace(/[4]/g, 'a')
    .replace(/[5$]/g, 's')
    .replace(/[7+]/g, 't')
    .replace(/[^a-z0-9]/g, '');
  return /(?:fuck|shit|bitch|cunt|nigg|fagg|kike|chink|rape|nazi|whore|slut|dick|cock)/i.test(
    moderationName
  );
}

export function competitionPlayerNameError(value: string): string | null {
  const name = normalizeCompetitionPlayerName(value);
  if (name.length < 2 || name.length > 20) return 'Player names must be 2 to 20 characters.';
  if (!/^[\p{L}\p{N}][\p{L}\p{N} _.\-']+$/u.test(name)) {
    return 'Use letters, numbers, spaces, apostrophes, periods, underscores, or hyphens.';
  }
  if (isBlockedCompetitionPlayerName(name)) {
    return 'Choose a different player name.';
  }
  return null;
}

async function readCompetitionOutbox(): Promise<PendingCompetitionResult[]> {
  const stored = await AsyncStorage.getItem(COMPETITION_OUTBOX_KEY);
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry): PendingCompetitionResult | null => {
        if (!entry || typeof entry !== 'object') return null;
        const candidate = entry as Partial<PendingCompetitionResult>;
        const createdAt = typeof candidate.createdAt === 'string' ? candidate.createdAt : '';
        const createdAtMs = Date.parse(createdAt);
        const legacyExpiry = Number.isFinite(createdAtMs)
          ? new Date(createdAtMs + 6 * 60 * 60 * 1000).toISOString()
          : '';
        return {
          ...candidate,
          expiresAt: typeof candidate.expiresAt === 'string' ? candidate.expiresAt : legacyExpiry,
        } as PendingCompetitionResult;
      })
      .filter(
        (candidate): candidate is PendingCompetitionResult =>
          candidate !== null &&
          typeof candidate.runId === 'string' &&
          typeof candidate.playerName === 'string' &&
          Number.isInteger(candidate.score) &&
          Number.isInteger(candidate.durationMs) &&
          typeof candidate.createdAt === 'string' &&
          Number.isFinite(Date.parse(candidate.createdAt)) &&
          typeof candidate.expiresAt === 'string' &&
          Number.isFinite(Date.parse(candidate.expiresAt))
      );
  } catch {
    return [];
  }
}

async function writeCompetitionOutbox(entries: PendingCompetitionResult[]) {
  if (entries.length === 0) {
    await AsyncStorage.removeItem(COMPETITION_OUTBOX_KEY);
    return;
  }
  await AsyncStorage.setItem(COMPETITION_OUTBOX_KEY, JSON.stringify(entries));
}

async function appendCompetitionSubmissionNotices(notices: CompetitionSubmissionNotice[]) {
  if (notices.length === 0) return;
  let existing: CompetitionSubmissionNotice[] = [];
  try {
    const stored = await AsyncStorage.getItem(COMPETITION_NOTICE_KEY);
    const parsed = stored ? (JSON.parse(stored) as unknown) : [];
    if (Array.isArray(parsed)) {
      existing = parsed.filter(
        (notice): notice is CompetitionSubmissionNotice =>
          !!notice &&
          typeof notice === 'object' &&
          typeof (notice as CompetitionSubmissionNotice).runId === 'string' &&
          typeof (notice as CompetitionSubmissionNotice).status === 'number' &&
          typeof (notice as CompetitionSubmissionNotice).message === 'string'
      );
    }
  } catch {
    existing = [];
  }
  await AsyncStorage.setItem(
    COMPETITION_NOTICE_KEY,
    JSON.stringify([...existing, ...notices].slice(-10))
  );
}

export async function consumeCompetitionSubmissionNotices(): Promise<
  CompetitionSubmissionNotice[]
> {
  const stored = await AsyncStorage.getItem(COMPETITION_NOTICE_KEY);
  if (!stored) return [];
  await AsyncStorage.removeItem(COMPETITION_NOTICE_KEY);
  try {
    const parsed = JSON.parse(stored) as CompetitionSubmissionNotice[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
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
  if ((options.method ?? 'GET') === 'DELETE' && path === '/me') {
    // A privacy-rights exception must never fall through to guest creation.
    if (!options.existingSession) throw new CompetitionUnavailableError('An existing online session is required for deletion.');
    return performCompetitionRequest<T>(path, options);
  }
  if (useGameStore.getState().competitionTermsVersion !== COMPETITION_TERMS_VERSION) {
    throw new CompetitionTermsRequiredError();
  }
  return withCompetitionAccess((access) => performCompetitionRequest<T>(path, options, access));
}

async function performCompetitionRequest<T>(
  path: string,
  options: CompetitionRequestOptions,
  access?: CompetitionAccess
): Promise<T> {
  const method = options.method ?? 'GET';
  const requiresCurrentTerms = !(method === 'DELETE' && path === '/me');
  if (
    requiresCurrentTerms &&
    useGameStore.getState().competitionTermsVersion !== COMPETITION_TERMS_VERSION
  ) {
    throw new CompetitionTermsRequiredError();
  }

  const controller = new AbortController();
  const abort = () => controller.abort();
  access?.signal.addEventListener('abort', abort);
  access?.assert();
  let didTimeout = false;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      didTimeout = true;
      controller.abort();
      reject(new CompetitionRequestError('Online request timed out. It will be retried.', 408));
    }, options.timeoutMs ?? 15000);
  });

  try {
    return await Promise.race([
      (async () => {
        const session =
          options.existingSession ??
          (await (async () => {
            if (await AsyncStorage.getItem(COMPETITION_DELETION_KEY)) {
              throw new CompetitionUnavailableError(
                'Finish deleting your online profile from Info before using Compete.'
              );
            }
            access?.assert();
            const identity = await anonymousUser(() => access?.assert(), controller.signal);
            return identity.session;
          })());
        access?.assert();
        if (controller.signal.aborted)
          throw new CompetitionRequestError('Online request timed out. It will be retried.', 408);
        const accessToken = session?.access_token;
        if (!accessToken) {
          throw new CompetitionUnavailableError('Online session could not be started.');
        }

        const response = await fetch(
          `${ONLINE_SERVICES.supabaseUrl}/functions/v1/${FUNCTION_NAME}${path}`,
          {
            method,
            headers: {
              apikey: ONLINE_SERVICES.supabasePublishableKey,
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              ...(requiresCurrentTerms
                ? { 'X-FlapFit-Terms-Version': COMPETITION_TERMS_VERSION }
                : {}),
            },
            body: options.body === undefined ? undefined : JSON.stringify(options.body),
            signal: controller.signal,
          }
        );

        const payload = (await response.json().catch(() => null)) as
          | (T & { error?: string })
          | null;
        access?.assert();
        if (!response.ok) {
          throw new CompetitionRequestError(
            payload?.error || `Online request failed (${response.status}).`,
            response.status
          );
        }
        if (payload == null) throw new Error('Online service returned an empty response.');
        return payload;
      })(),
      timeoutPromise,
    ]);
  } catch (error) {
    access?.assert();
    if (didTimeout || (error instanceof Error && error.name === 'AbortError')) {
      throw new CompetitionRequestError('Online request timed out. It will be retried.', 408);
    }
    throw error;
  } finally {
    if (timeout) clearTimeout(timeout);
    access?.signal.removeEventListener('abort', abort);
    controller.abort();
  }
}

export async function beginCompetitionRun(input: {
  kind: CompetitionRunKind;
  exercise: string;
}): Promise<CompetitionRunSession> {
  const response = await competitionRequest<{ run_id: string; expires_at: string }>('/runs', {
    method: 'POST',
    body: {
      kind: input.kind,
      exercise: input.exercise,
    },
  });
  return { runId: response.run_id, expiresAt: response.expires_at };
}

// Keep an intentional local run distinct from an online session that failed.
// This disposition is captured once per run and never promoted after a later grant.
export type CompetitionRunDisposition =
  | { kind: 'local' }
  | { kind: 'online'; session: CompetitionRunSession }
  | { kind: 'unavailable'; error: unknown };

const localCompetitionOutcome = (): CompetitionSubmissionOutcome => ({
  status: 'local',
  message: 'Result saved on this device.',
});

export async function prepareCompetitionRun(input: {
  kind: CompetitionRunKind;
  exercise: string;
}): Promise<CompetitionRunDisposition> {
  if (!competitionIsConfigured || !competitionAccessAllowed()) return { kind: 'local' };
  try {
    return { kind: 'online', session: await beginCompetitionRun(input) };
  } catch (error) {
    if (error instanceof CompetitionAccessRequiredError || error instanceof CompetitionTermsRequiredError) {
      return { kind: 'local' };
    }
    return { kind: 'unavailable', error };
  }
}

export async function submitPreparedCompetitionRunResult(
  run: CompetitionRunDisposition,
  input: { playerName: string; score: number; durationMs: number },
  onPublishing: () => void
): Promise<CompetitionSubmissionOutcome> {
  if (run.kind === 'local') return localCompetitionOutcome();
  if (run.kind === 'unavailable') {
    return competitionAccessAllowed()
      ? { status: 'rejected', message: 'Online verification did not start, so this result was not published.' }
      : localCompetitionOutcome();
  }
  // A previously requested online run can remain in the local outbox after
  // withdrawal, but must not show upload activity while processing is off.
  if (competitionAccessAllowed()) onPublishing();
  return submitCompetitionRunResult({ ...run.session, ...input });
}

function emptyCompetitionFlushResult(): CompetitionFlushResult {
  return {
    submitted: 0,
    pending: 0,
    submittedRunIds: [],
    pendingRunIds: [],
    rejected: [],
  };
}

async function flushCompetitionOutbox(): Promise<CompetitionFlushResult> {
  if (!competitionIsConfigured) return emptyCompetitionFlushResult();
  if (useGameStore.getState().competitionTermsVersion !== COMPETITION_TERMS_VERSION) {
    return emptyCompetitionFlushResult();
  }

  {
    const pending = await readCompetitionOutbox();
    if (pending.length === 0) return emptyCompetitionFlushResult();

    if (!competitionAccessAllowed()) {
      return { ...emptyCompetitionFlushResult(), pending: pending.length, pendingRunIds: pending.map((entry) => entry.runId) };
    }
    const generation = accessGeneration;
    const remaining: PendingCompetitionResult[] = [];
    const submittedRunIds: string[] = [];
    const rejected: CompetitionSubmissionNotice[] = [];
    let retryLater = false;
    for (const entry of pending) {
      if (!competitionAccessAllowed() || generation !== accessGeneration) { remaining.push(entry); continue; }
      if (Date.parse(entry.expiresAt) <= Date.now()) {
        rejected.push({
          runId: entry.runId,
          status: 410,
          message: 'This online run expired before it could be published.',
        });
        continue;
      }
      if (retryLater) {
        remaining.push(entry);
        continue;
      }
      try {
        await competitionRequest('/runs/finalize', { method: 'POST', body: entry });
        if (!competitionAccessAllowed() || generation !== accessGeneration) { remaining.push(entry); continue; }
        submittedRunIds.push(entry.runId);
      } catch (error) {
        const permanent =
          error instanceof CompetitionRequestError &&
          [400, 404, 409, 410, 422].includes(error.status);
        if (permanent) {
          rejected.push({
            runId: entry.runId,
            status: error.status,
            message: error.message,
          });
        } else {
          remaining.push(entry);
          retryLater = true;
        }
      }
    }
    await writeCompetitionOutbox(remaining);
    await appendCompetitionSubmissionNotices(rejected);
    return {
      submitted: submittedRunIds.length,
      pending: remaining.length,
      submittedRunIds,
      pendingRunIds: remaining.map((entry) => entry.runId),
      rejected,
    };
  }
}

export function flushPendingCompetitionResults(): Promise<CompetitionFlushResult> {
  return withOutboxLock(async () => {
    if (await AsyncStorage.getItem(COMPETITION_DELETION_KEY)) return emptyCompetitionFlushResult();
    return flushCompetitionOutbox();
  });
}

// One foreground attempt, plus the visible refresh control, avoids unbounded polling.
export function startCompetitionForegroundRetry(onSubmitted: () => void): () => void {
  let active = true;
  let inFlight = false;
  const subscription = AppState.addEventListener('change', (state) => {
    if (state !== 'active' || inFlight || !useGameStore.getState().hydrated || !competitionAccessAllowed()) return;
    const generation = accessGeneration;
    inFlight = true;
    void flushPendingCompetitionResults()
      .then((result) => {
        if (active && competitionAccessAllowed() && generation === accessGeneration && result.submitted > 0) onSubmitted();
      })
      .catch(() => undefined)
      .finally(() => {
        inFlight = false;
      });
  });
  return () => {
    active = false;
    subscription.remove();
  };
}

export async function submitCompetitionRunResult(input: {
  runId: string;
  expiresAt: string;
  playerName: string;
  score: number;
  durationMs: number;
}): Promise<CompetitionSubmissionOutcome> {
  if (await AsyncStorage.getItem(COMPETITION_DELETION_KEY)) {
    return {
      status: 'local',
      message: 'Result saved on this device. Online profile deletion is pending.',
    };
  }
  const entry: PendingCompetitionResult = {
    runId: input.runId,
    expiresAt: input.expiresAt,
    playerName: normalizeCompetitionPlayerName(input.playerName),
    score: Math.max(0, Math.trunc(input.score)),
    durationMs: Math.max(0, Math.trunc(input.durationMs)),
    createdAt: new Date().toISOString(),
  };
  // Enqueue and resolve this run under the same lock: another flush cannot consume its outcome.
  return withOutboxLock(async () => {
    // Recheck inside the lock: deletion may have completed while this submission waited.
    if (useGameStore.getState().competitionTermsVersion !== COMPETITION_TERMS_VERSION ||
        await AsyncStorage.getItem(COMPETITION_DELETION_KEY)) {
      return localCompetitionOutcome();
    }
    const queued = await (async () => {
      const pending = await readCompetitionOutbox();
      if (pending.some((item) => item.runId === entry.runId)) return true;
      if (pending.length >= MAX_PENDING_RESULTS) return false;
      await writeCompetitionOutbox([...pending, entry]);
      return true;
    })();
    if (!queued) {
      if (!competitionAccessAllowed()) return localCompetitionOutcome();
      const message =
        'Online result was not published: the offline queue is full. Your local training progress is safe.';
      await appendCompetitionSubmissionNotices([{ runId: entry.runId, status: 429, message }]);
      return { status: 'rejected', message };
    }
    const result = await flushCompetitionOutbox();
    if (!competitionAccessAllowed()) return localCompetitionOutcome();
    if (result.submittedRunIds.includes(entry.runId)) {
      return { status: 'accepted', message: 'Online result saved.' };
    }
    const rejection = result.rejected.find((notice) => notice.runId === entry.runId);
    if (rejection) {
      return {
        status: 'rejected',
        message: `Online result was not published: ${rejection.message}`,
      };
    }
    return competitionAccessAllowed()
      ? { status: 'pending', message: 'Online result queued. Return to Flap Fit or tap Refresh in Compete to retry.' }
      : localCompetitionOutcome();
  });
}

export async function clearPendingCompetitionResults(): Promise<void> {
  await withOutboxLock(() => writeCompetitionOutbox([]));
  await AsyncStorage.removeItem(COMPETITION_NOTICE_KEY);
}

export async function getCompetitionSupportId(): Promise<string | null> {
  if (!competitionIsConfigured) return null;
  const supabase = getClient(true);
  const sessionResult = await supabase.auth.getSession();
  if (sessionResult.error) throw sessionResult.error;
  return sessionResult.data.session?.user.id ?? null;
}

/** Reconcile a lost DELETE acknowledgement without interpreting a generic 401 as deletion. */
export async function deleteCompetitionIdentity(): Promise<void> {
  if (!competitionIsConfigured) return;
  return withOutboxLock(async () => {
    const supabase = getClient(true);
    const saved = await AsyncStorage.getItem(COMPETITION_DELETION_KEY);
    let pending = saved ? (JSON.parse(saved) as { userId: string; confirmed: boolean }) : null;
    const sessionResult = await supabase.auth.getSession();
    if (sessionResult.error) throw sessionResult.error;
    const session = sessionResult.data.session;
    if (pending && session && pending.userId !== session.user.id) {
      throw new Error(
        'The online profile changed. Contact support to reconcile the deletion request.'
      );
    }
    if (!pending?.confirmed && session) {
      pending = { userId: session.user.id, confirmed: false };
      await AsyncStorage.setItem(COMPETITION_DELETION_KEY, JSON.stringify(pending));
      try {
        const response = await competitionRequest<{ deleted: boolean }>('/me', {
          method: 'DELETE',
          existingSession: session,
        });
        if (response.deleted !== true) throw new Error('The server did not confirm deletion.');
      } catch (error) {
        // The Auth server explicitly distinguishes a missing user from an expired token,
        // revoked session, server outage or network failure. Only missing-user proves removal.
        let timer: ReturnType<typeof setTimeout> | undefined;
        const verification = await Promise.race([
          supabase.auth.getUser(session.access_token),
          new Promise<never>((_, reject) => {
            timer = setTimeout(
              () => reject(new Error('Deletion verification timed out. Please retry.')),
              15000
            );
          }),
        ]).finally(() => {
          if (timer) clearTimeout(timer);
        });
        if (verification.error?.code !== 'user_not_found') throw error;
      }
      pending.confirmed = true;
      await AsyncStorage.setItem(COMPETITION_DELETION_KEY, JSON.stringify(pending));
    } else if (pending && !pending.confirmed) {
      throw new Error(
        'Deletion could not be confirmed. Contact support; do not create a new profile yet.'
      );
    }

    await writeCompetitionOutbox([]);
    await AsyncStorage.removeItem(COMPETITION_NOTICE_KEY);
    if (session || pending) {
      const signedOut = await supabase.auth.signOut({ scope: 'local' });
      if (signedOut?.error) throw signedOut.error;
    }
    client?.auth.stopAutoRefresh();
    client = null;
    privacyRightsClient = null;
    useGameStore.getState().resetCompetitionProfile();
    await AsyncStorage.removeItem(COMPETITION_DELETION_KEY);
  });
}
