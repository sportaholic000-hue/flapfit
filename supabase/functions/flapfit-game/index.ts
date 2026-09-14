import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.109.0';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
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
const ALLOWED_CONTEXT_TYPES = new Set(['leaderboard', 'challenge_attempt']);
const BLOCKED_NAME_PATTERN =
  /(?:fuck|shit|bitch|cunt|nigg|fagg|kike|chink|rape|nazi|whore|slut|dick|cock)/i;
const MAX_DAILY_CHALLENGES = 10;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: RESPONSE_HEADERS });
}

async function bodyJson(req: Request): Promise<Record<string, unknown>> {
  const text = await req.text();
  if (text.length > 4096) throw new Error('Request body is too large.');
  if (!text) return {};
  const value = JSON.parse(text);
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Request body must be an object.');
  }
  return value as Record<string, unknown>;
}

function cleanPlayerName(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Enter a player name.');
  const normalized = value.normalize('NFKC');
  const withoutControls = Array.from(normalized)
    .filter((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint > 31 && codePoint !== 127;
    })
    .join('');
  const name = withoutControls.trim().replace(/\s+/g, ' ');
  if (name.length < 2 || name.length > 20) {
    throw new Error('Player names must be 2 to 20 characters.');
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
    throw new Error('Choose a different player name.');
  }
  return name;
}

function integer(value: unknown, min: number, max: number, label: string): number {
  const number = typeof value === 'number' ? value : Number.NaN;
  if (!Number.isInteger(number) || number < min || number > max) {
    throw new Error(`${label} must be between ${min} and ${max}.`);
  }
  return number;
}

function uuid(value: unknown, label: string): string {
  if (
    typeof value !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  ) {
    throw new Error(`${label} is invalid.`);
  }
  return value;
}

function challengeCode(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Challenge code is invalid.');
  const code = value.trim().toUpperCase();
  if (!/^[A-Z2-9]{6}$/.test(code)) throw new Error('Challenge code is invalid.');
  return code;
}

function randomCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });

  try {
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

    const url = new URL(req.url);
    const marker = '/flapfit-game';
    const markerIndex = url.pathname.indexOf(marker);
    const route = markerIndex >= 0 ? url.pathname.slice(markerIndex + marker.length) || '/' : '/';

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
        .filter((row) => !blocked.has(row.user_id))
        .slice(0, 20)
        .map((row) => ({
          id: row.id,
          profile_id: row.user_id,
          player_name: Array.isArray(row.profiles)
            ? row.profiles[0]?.player_name
            : row.profiles?.player_name,
          score: row.score,
          exercise: row.exercise,
          is_me: row.user_id === user.id,
        }));
      return json({ scores });
    }

    if (req.method === 'POST' && route === '/leaderboard') {
      const body = await bodyJson(req);
      const playerName = cleanPlayerName(body.playerName);
      const exercise = typeof body.exercise === 'string' ? body.exercise : '';
      if (!ALLOWED_EXERCISES.has(exercise)) return json({ error: 'Exercise is invalid.' }, 400);
      const score = integer(body.score, 0, 100000, 'Score');
      const now = new Date().toISOString();
      const profileResult = await admin
        .from('profiles')
        .upsert({ user_id: user.id, player_name: playerName, updated_at: now });
      if (profileResult.error) throw profileResult.error;
      const scoreResult = await admin.rpc('upsert_leaderboard_score', {
        p_user_id: user.id,
        p_exercise: exercise,
        p_score: score,
      });
      if (scoreResult.error) throw scoreResult.error;
      return json({ saved: true });
    }

    if (req.method === 'POST' && route === '/challenges') {
      const body = await bodyJson(req);
      const playerName = cleanPlayerName(body.creatorName);
      const targetScore = integer(body.targetScore, 1, 60, 'Target score');
      const now = new Date().toISOString();
      const profileResult = await admin
        .from('profiles')
        .upsert({ user_id: user.id, player_name: playerName, updated_at: now });
      if (profileResult.error) throw profileResult.error;

      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const recentResult = await admin
        .from('challenges')
        .select('id', { count: 'exact', head: true })
        .eq('creator_id', user.id)
        .gte('created_at', since);
      if (recentResult.error) throw recentResult.error;
      if ((recentResult.count ?? 0) >= MAX_DAILY_CHALLENGES) {
        return json({ error: 'Challenge limit reached. Try again later.' }, 429);
      }

      for (let attempt = 0; attempt < 5; attempt += 1) {
        const code = randomCode();
        const result = await admin.from('challenges').insert({
          code,
          creator_id: user.id,
          target_score: targetScore,
          level_id: 3,
        });
        if (!result.error) return json({ code }, 201);
        if (result.error.code !== '23505') throw result.error;
      }
      return json({ error: 'Could not create a unique challenge code.' }, 503);
    }

    if (req.method === 'GET' && route === '/challenges') {
      const code = challengeCode(url.searchParams.get('code'));
      const challengeResult = await admin
        .from('challenges')
        .select('id,code,creator_id,target_score,level_id,expires_at,profiles!inner(player_name)')
        .eq('code', code)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();
      if (challengeResult.error) throw challengeResult.error;
      if (!challengeResult.data) return json({ error: 'Challenge not found.' }, 404);

      const blockedResult = await admin
        .from('player_blocks')
        .select('blocked_id')
        .eq('blocker_id', user.id);
      if (blockedResult.error) throw blockedResult.error;
      const blocked = new Set((blockedResult.data ?? []).map((row) => row.blocked_id));
      if (blocked.has(challengeResult.data.creator_id))
        return json({ error: 'Challenge not found.' }, 404);

      const attemptsResult = await admin
        .from('challenge_attempts')
        .select('id,user_id,score,updated_at,profiles!inner(player_name)')
        .eq('challenge_id', challengeResult.data.id)
        .order('score', { ascending: false })
        .order('updated_at', { ascending: true })
        .limit(50);
      if (attemptsResult.error) throw attemptsResult.error;
      const attempts = (attemptsResult.data ?? [])
        .filter((row) => !blocked.has(row.user_id))
        .slice(0, 10)
        .map((row) => ({
          id: row.id,
          profile_id: row.user_id,
          player_name: Array.isArray(row.profiles)
            ? row.profiles[0]?.player_name
            : row.profiles?.player_name,
          score: row.score,
          is_me: row.user_id === user.id,
        }));
      const creatorProfile = challengeResult.data.profiles;
      return json({
        challenge: {
          id: challengeResult.data.id,
          code: challengeResult.data.code,
          creator_profile_id: challengeResult.data.creator_id,
          creator_name: Array.isArray(creatorProfile)
            ? creatorProfile[0]?.player_name
            : creatorProfile?.player_name,
          target_score: challengeResult.data.target_score,
          level_id: challengeResult.data.level_id,
        },
        attempts,
      });
    }

    if (req.method === 'POST' && route === '/challenges/attempts') {
      const body = await bodyJson(req);
      const code = challengeCode(body.code);
      const playerName = cleanPlayerName(body.playerName);
      const score = integer(body.score, 0, 60, 'Score');
      const challengeResult = await admin
        .from('challenges')
        .select('id')
        .eq('code', code)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();
      if (challengeResult.error) throw challengeResult.error;
      if (!challengeResult.data) return json({ error: 'Challenge not found.' }, 404);
      const now = new Date().toISOString();
      const profileResult = await admin
        .from('profiles')
        .upsert({ user_id: user.id, player_name: playerName, updated_at: now });
      if (profileResult.error) throw profileResult.error;
      const attemptResult = await admin.rpc('upsert_challenge_attempt', {
        p_user_id: user.id,
        p_challenge_id: challengeResult.data.id,
        p_score: score,
      });
      if (attemptResult.error) throw attemptResult.error;
      return json({ saved: true });
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
        contextType === 'leaderboard' ? 'leaderboard_scores' : 'challenge_attempts';
      const contextResult = await admin
        .from(contextTable)
        .select('id')
        .eq('id', contextId)
        .eq('user_id', reportedUserId)
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
    const message = error instanceof Error ? error.message : 'Request failed.';
    const clientError = /invalid|must|enter|choose|between|not found/i.test(message);
    return json(
      { error: clientError ? message : 'Online service is temporarily unavailable.' },
      clientError ? 400 : 500
    );
  }
});
