import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.109.0';
import { requiresAppleCompetitionCheck } from '../_shared/apple-consent-competition.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, apikey, content-type, x-client-info, x-flapfit-terms-version',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
};

const RESPONSE_HEADERS = {
  ...CORS_HEADERS,
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
};

const ALLOWED_EXERCISES = new Set(['pushups', 'squats', 'pullups']);
const ALLOWED_REPORT_REASONS = new Set(['inappropriate_name', 'cheating', 'harassment_or_other']);
const ALLOWED_CONTEXT_TYPES = new Set(['leaderboard', 'challenge', 'challenge_attempt']);
const BLOCKED_NAME_PATTERN =
  /(?:fuck|shit|bitch|cunt|nigg|fagg|kike|chink|rape|nazi|whore|slut|dick|cock)/i;
const CURRENT_TERMS_VERSION = '2026-09-14';
const CURRENT_RUN_RULES_VERSION = '2026-09-16.1';
const ALLOWED_RUN_KINDS = new Set(['leaderboard']);

class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function databaseApiError(error: { message?: string }): ApiError | null {
  const message = error.message ?? '';
  if (/run limit/i.test(message))
    return new ApiError(429, 'Too many game runs. Try again shortly.');
  if (/already finalized/i.test(message))
    return new ApiError(409, 'This game run was already submitted.');
  if (/expired/i.test(message))
    return new ApiError(410, 'This game run expired before it was submitted.');
  if (/not found/i.test(message)) return new ApiError(404, 'Game run not found.');
  if (/implausible|does not match|duration/i.test(message)) {
    return new ApiError(422, 'This result could not be verified.');
  }
  return null;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: RESPONSE_HEADERS });
}

async function bodyJson(req: Request): Promise<Record<string, unknown>> {
  const maxBytes = 4096;
  if (Number(req.headers.get('content-length')) > maxBytes) {
    throw new ApiError(413, 'Request body is too large.');
  }
  const reader = req.body?.getReader();
  if (!reader) return {};
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > maxBytes) {
        // Cancel before retaining more input; a failed cancellation must not
        // turn a known oversized request into an internal-server error.
        try { await reader.cancel(); } catch { /* Still reject the body. */ }
        throw new ApiError(413, 'Request body is too large.');
      }
      chunks.push(part.value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  const text = new TextDecoder().decode(bytes);
  if (!text) return {};
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new ApiError(400, 'Request body must be valid JSON.');
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ApiError(400, 'Request body must be an object.');
  }
  return value as Record<string, unknown>;
}

function cleanPlayerName(value: unknown): string {
  if (typeof value !== 'string') throw new ApiError(400, 'Enter a player name.');
  const normalized = value.normalize('NFKC');
  const withoutControls = Array.from(normalized)
    .filter((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint > 31 && codePoint !== 127;
    })
    .join('');
  const name = withoutControls.trim().replace(/\s+/g, ' ');
  if (name.length < 2 || name.length > 20) {
    throw new ApiError(400, 'Player names must be 2 to 20 characters.');
  }
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
  if (
    !/^[\p{L}\p{N}][\p{L}\p{N} _.\-']+$/u.test(name) ||
    BLOCKED_NAME_PATTERN.test(moderationName)
  ) {
    throw new ApiError(400, 'Choose a different player name.');
  }
  return name;
}

function integer(value: unknown, min: number, max: number, label: string): number {
  const number = typeof value === 'number' ? value : Number.NaN;
  if (!Number.isInteger(number) || number < min || number > max) {
    throw new ApiError(400, `${label} must be between ${min} and ${max}.`);
  }
  return number;
}

function uuid(value: unknown, label: string): string {
  if (
    typeof value !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  ) {
    throw new ApiError(400, `${label} is invalid.`);
  }
  return value;
}

function requireCurrentTerms(req: Request): string {
  const termsVersion = req.headers.get('X-FlapFit-Terms-Version');
  if (termsVersion !== CURRENT_TERMS_VERSION) {
    throw new ApiError(
      428,
      'Accept the current online competition terms before publishing results.'
    );
  }
  return termsVersion;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });

  try {
    const url = new URL(req.url);
    const marker = '/flapfit-game';
    const markerIndex = url.pathname.indexOf(marker);
    const route = markerIndex >= 0 ? url.pathname.slice(markerIndex + marker.length) || '/' : '/';
    // Closed before authentication/database work; clients should share gameplay videos.
    if (route === '/challenges' || route.startsWith('/challenges/')) {
      return json({ error: 'Friend challenge codes are no longer available. Share a gameplay video instead.' }, 410);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Service is not configured.' }, 503);

    const authHeader = req.headers.get('Authorization') ?? '';
    const accessToken = authHeader.replace(/^Bearer\s+/i, '');
    if (!accessToken) return json({ error: 'Authentication required.' }, 401);

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const userResult = await admin.auth.getUser(accessToken);
    const user = userResult.data.user;
    if (userResult.error || !user || !user.is_anonymous) {
      return json({ error: 'Anonymous game session required.' }, 401);
    }

    if (requiresAppleCompetitionCheck(req.method, route)) {
      const consentEnvironment = 'Production';
      const consent = await admin.rpc('apple_consent_user_is_revoked', {
        p_user_id: user.id, p_environment: consentEnvironment,
      });
      if (consent.error || typeof consent.data !== 'boolean') {
        return json({ error: 'Online service is temporarily unavailable.' }, 503);
      }
      if (consent.data) {
        return json({ error: 'Online participation is unavailable.', code: 'APPLE_CONSENT_REVOKED' }, 403);
      }
    }

    const requestTermsVersion =
      req.method === 'DELETE' && route === '/me' ? null : requireCurrentTerms(req);

    if (req.method === 'GET' && route === '/leaderboard') {
      const exercise = url.searchParams.get('exercise') ?? '';
      if (!ALLOWED_EXERCISES.has(exercise)) return json({ error: 'Exercise is invalid.' }, 400);

      const [scoresResult, blocksResult] = await Promise.all([
        admin
          .from('leaderboard_scores')
          .select('id,user_id,exercise,score,updated_at,profiles!inner(player_name)')
          .eq('exercise', exercise)
          .order('score', { ascending: false })
          .order('updated_at', { ascending: true })
          .limit(100),
        admin.from('player_blocks').select('blocked_id').eq('blocker_id', user.id),
      ]);
      if (scoresResult.error) throw scoresResult.error;
      if (blocksResult.error) throw blocksResult.error;
      const blocked = new Set((blocksResult.data ?? []).map((row) => row.blocked_id));
      const scores = (scoresResult.data ?? [])
        .map((row, index) => ({ row, rank: index + 1 }))
        .filter(({ row }) => !blocked.has(row.user_id))
        .slice(0, 50)
        .map(({ row, rank }) => ({
          id: row.id,
          profile_id: row.user_id,
          player_name: Array.isArray(row.profiles)
            ? row.profiles[0]?.player_name
            : (row.profiles as { player_name: string } | null)?.player_name,
          score: row.score,
          exercise: row.exercise,
          is_me: row.user_id === user.id,
          rank,
        }));
      return json({ scores });
    }

    if (req.method === 'POST' && route === '/runs') {
      const body = await bodyJson(req);
      const kind = typeof body.kind === 'string' ? body.kind : '';
      const exercise = typeof body.exercise === 'string' ? body.exercise : '';
      if (!ALLOWED_RUN_KINDS.has(kind)) return json({ error: 'Game run type is invalid.' }, 400);
      if (!ALLOWED_EXERCISES.has(exercise)) return json({ error: 'Exercise is invalid.' }, 400);
      const runResult = await admin
        .rpc('begin_game_run', {
          p_user_id: user.id,
          p_kind: kind,
          p_exercise: exercise,
          p_challenge_code: null,
          p_rules_version: CURRENT_RUN_RULES_VERSION,
        })
        .single<{ run_id: string; expires_at: string }>();
      if (runResult.error) throw databaseApiError(runResult.error) ?? runResult.error;
      return json({ run_id: runResult.data.run_id, expires_at: runResult.data.expires_at }, 201);
    }

    if (req.method === 'POST' && route === '/runs/finalize') {
      const body = await bodyJson(req);
      const runId = uuid(body.runId, 'Game run');
      const playerName = cleanPlayerName(body.playerName);
      const score = integer(body.score, 0, 100000, 'Score');
      const durationMs = integer(body.durationMs, 0, 6 * 60 * 60 * 1000, 'Run duration');
      const finalizeResult = await admin
        .rpc('finalize_game_run', {
          p_run_id: runId,
          p_user_id: user.id,
          p_player_name: playerName,
          p_score: score,
          p_duration_ms: durationMs,
          p_terms_version: requestTermsVersion ?? CURRENT_TERMS_VERSION,
          p_rules_version: CURRENT_RUN_RULES_VERSION,
        })
        .single<{ improved: boolean; result_kind: string; exercise_name: string; challenge_code: string | null }>();
      if (finalizeResult.error) {
        throw databaseApiError(finalizeResult.error) ?? finalizeResult.error;
      }
      return json({
        saved: true,
        improved: finalizeResult.data.improved,
        kind: finalizeResult.data.result_kind,
        exercise: finalizeResult.data.exercise_name,
        challenge_code: finalizeResult.data.challenge_code,
      });
    }

    if (req.method === 'POST' && route === '/leaderboard') {
      return json({ error: 'Update Flap Fit to submit verified leaderboard runs.' }, 410);
    }

    if (req.method === 'POST' && route === '/reports') {
      const body = await bodyJson(req);
      const reportedUserId = uuid(body.reportedUserId, 'Reported player');
      const contextId = uuid(body.contextId, 'Reported content');
      const contextType = typeof body.contextType === 'string' ? body.contextType : '';
      const reason = typeof body.reason === 'string' ? body.reason : '';
      if (!ALLOWED_CONTEXT_TYPES.has(contextType) || !ALLOWED_REPORT_REASONS.has(reason)) {
        return json({ error: 'Report details are invalid.' }, 400);
      }
      if (reportedUserId === user.id) return json({ error: 'You cannot report yourself.' }, 400);

      const contextTable =
        contextType === 'leaderboard'
          ? 'leaderboard_scores'
          : contextType === 'challenge'
            ? 'challenges'
            : 'challenge_attempts';
      const ownerColumn = contextType === 'challenge' ? 'creator_id' : 'user_id';
      const contextResult = await admin
        .from(contextTable)
        .select('id')
        .eq('id', contextId)
        .eq(ownerColumn, reportedUserId)
        .maybeSingle();
      if (contextResult.error) throw contextResult.error;
      if (!contextResult.data) return json({ error: 'Reported content was not found.' }, 404);

      const result = await admin.from('content_reports').insert({
        reporter_id: user.id,
        reported_user_id: reportedUserId,
        context_type: contextType,
        context_id: contextId,
        reason,
      });
      if (result.error && result.error.code !== '23505') throw result.error;
      return json({ reported: true }, 201);
    }

    if (req.method === 'POST' && route === '/blocks') {
      const body = await bodyJson(req);
      const blockedUserId = uuid(body.blockedUserId, 'Blocked player');
      if (blockedUserId === user.id) return json({ error: 'You cannot block yourself.' }, 400);
      const result = await admin.from('player_blocks').upsert({
        blocker_id: user.id,
        blocked_id: blockedUserId,
      });
      if (result.error) throw result.error;
      return json({ blocked: true }, 201);
    }

    if (req.method === 'DELETE' && route === '/me') {
      const result = await admin.auth.admin.deleteUser(user.id);
      if (result.error) throw result.error;
      return json({ deleted: true });
    }

    return json({ error: 'Not found.' }, 404);
  } catch (error) {
    console.error(error);
    if (error instanceof ApiError) {
      return json({ error: error.message }, error.status);
    }
    return json({ error: 'Online service is temporarily unavailable.' }, 500);
  }
});
