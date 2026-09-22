const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('node:crypto');
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error('Supabase public configuration is required.');
const client = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
const checks = [];
let token;
async function request(path, { method = 'GET', body, raw, includeTerms = true, rest = false } = {}) {
  const response = await fetch(url + (rest ? '/rest/v1' : '/functions/v1/flapfit-game') + path, {
    method, headers: { apikey: key, ...(token ? { Authorization: 'Bearer ' + token } : {}),
      'Content-Type': 'application/json', ...(includeTerms ? { 'X-FlapFit-Terms-Version': '2026-09-14' } : {}) },
    body: raw ?? (body === undefined ? undefined : JSON.stringify(body)), signal: AbortSignal.timeout(30000),
  });
  return { status: response.status, data: await response.json().catch(() => null) };
}
function check(label, result, status, code) {
  if (result.status !== status || (code && result.data?.code !== code)) throw new Error(label + ': ' + result.status + ' ' + JSON.stringify(result.data));
  checks.push({ label, status, ...(code ? { code } : {}) }); return result.data;
}
async function main() {
  check('Function startup', await request('/', { method: 'OPTIONS' }), 204);
  check('Unauthenticated submission denied', await request('/leaderboard', { method: 'POST', body: {} }), 401);
  const auth = await client.auth.signInAnonymously();
  if (auth.error || !auth.data.session) throw auth.error ?? new Error('Missing test session');
  token = auth.data.session.access_token;
  try {
    check('Terms required', await request('/leaderboard', { method: 'POST', body: {}, includeTerms: false }), 428);
    const board = check('Leaderboard read', await request('/leaderboard?exercise=pushups'), 200);
    const previousName = board.scores?.[0]?.player_name;
    if (!previousName) throw new Error('Existing name required for collision verification');
    check('Unique name enforced on score submission', await request('/leaderboard', { method: 'POST', body: { playerName: previousName.toUpperCase(), exercise: 'pushups', score: 1 } }), 409, 'PLAYER_NAME_TAKEN');
    check('Run ticket creation retired', await request('/runs', { method: 'POST', body: { kind: 'leaderboard', exercise: 'pushups' } }), 410);
    check('Body byte limit retained', await request('/leaderboard', { method: 'POST', raw: JSON.stringify({ padding: 'x'.repeat(4096) }) }), 413);
    check('Invalid score rejected', await request('/leaderboard', { method: 'POST', body: { playerName: 'FlowProbe', exercise: 'pushups', score: -1 } }), 400);
    const name = 'Flow' + randomUUID().replaceAll('-', '').slice(0, 12);
    const body = { playerName: name, exercise: 'pushups', score: 1, userId: randomUUID() };
    check('One-step score accepted', await request('/leaderboard', { method: 'POST', body }), 200);
    check('Identical retry accepted', await request('/leaderboard', { method: 'POST', body }), 200);
    const lower = check('Lower retry preserves best score', await request('/leaderboard', { method: 'POST', body: { ...body, score: 0 } }), 200);
    if (lower.score !== 1) throw new Error('Retry changed best score');
    const updated = check('Submitted result readable', await request('/leaderboard?exercise=pushups'), 200);
    const mine = updated.scores.filter(row => row.profile_id === auth.data.user.id);
    if (mine.length !== 1 || mine[0].score !== 1 || mine[0].player_name !== name) throw new Error('Ownership/best score verification failed');
    check('Direct score table access denied', await request('/leaderboard_scores?select=score', { rest: true }), 403, '42501');
    check('Direct scoring RPC denied', await request('/rpc/submit_leaderboard_score', { rest: true, method: 'POST', body: {
      p_user_id: auth.data.user.id, p_player_name: name, p_exercise: 'pushups', p_score: 1, p_terms_version: '2026-09-14',
    } }), 403, '42501');
  } finally {
    check('Temporary identity and score deleted', await request('/me', { method: 'DELETE', includeTerms: false }), 200);
    await client.auth.signOut({ scope: 'local' });
  }
  console.log(JSON.stringify({ passed: true, checkedAt: new Date().toISOString(), checks }, null, 2));
}
main().catch(error => { console.error(JSON.stringify({ passed: false, checks, error: error.message })); process.exitCode = 1; });
