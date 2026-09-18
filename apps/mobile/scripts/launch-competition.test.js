/** @jest-environment node */
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function createHandler(admin) {
  const source = fs.readFileSync(path.join(__dirname, '../../../supabase/functions/flapfit-game/index.ts'), 'utf8')
    .replace(/^import .+;[\r\n]*/gm, '');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  let handler;
  const createClient = jest.fn(() => admin);
  new Function('Deno', 'createClient', compiled)({
    env: { get: () => 'configured' }, serve: fn => { handler = fn; },
  }, createClient);
  return { handler, createClient };
}

function request(route, body) {
  return new Request('https://test.invalid/functions/v1/flapfit-game' + route, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { Authorization: 'Bearer fixture', 'X-FlapFit-Terms-Version': '2026-09-14' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

test.each([
  ['/challenges?code=ABC234', undefined],
  ['/challenges', { creatorName: 'Tester', targetScore: 10, exercise: 'pushups' }],
  ['/challenges/attempts', { score: 10 }],
])('retired route %s closes before any auth or database client work', async (route, body) => {
  const { handler, createClient } = createHandler({});
  const response = await handler(request(route, body));
  expect(response.status).toBe(410);
  expect(createClient).not.toHaveBeenCalled();
});

test('friend run tickets cannot be issued, while verified leaderboard tickets still work', async () => {
  const admin = {
    auth: { getUser: jest.fn(async () => ({ data: { user: { id: 'viewer', is_anonymous: true } } })) },
    rpc: jest.fn(() => ({ single: async () => ({ data: { run_id: 'run', expires_at: 'later' } }) })),
  };
  const { handler } = createHandler(admin);
  expect((await handler(request('/runs', { kind: 'challenge', exercise: 'pushups', challengeCode: 'ABC234' }))).status).toBe(400);
  expect(admin.rpc).not.toHaveBeenCalled();
  expect((await handler(request('/runs', { kind: 'leaderboard', exercise: 'pushups' }))).status).toBe(201);
  expect(admin.rpc).toHaveBeenCalledWith('begin_game_run', expect.objectContaining({ p_kind: 'leaderboard', p_challenge_code: null }));
});

test.each(['pushups', 'squats', 'pullups'])('%s retains 50 entries, global ranks and blocked-player filtering', async exercise => {
  const admin = {
    auth: { getUser: async () => ({ data: { user: { id: 'p2', is_anonymous: true } } }) },
    from(table) {
      if (table === 'player_blocks') return { select() { return this; }, eq: async () => ({ data: [{ blocked_id: 'p1' }] }) };
      expect(table).toBe('leaderboard_scores');
      return {
        select() { return this; }, eq() { return this; }, order() { return this; },
        limit: async () => ({ data: Array.from({ length: 75 }, (_, i) => ({ id: String(i), user_id: 'p' + (i + 1), score: 100 - i, exercise, profiles: { player_name: 'Player' } })) }),
      };
    },
  };
  const { handler } = createHandler(admin);
  const response = await handler(request('/leaderboard?exercise=' + exercise));
  expect(response.status).toBe(200);
  const { scores } = await response.json();
  expect(scores).toHaveLength(50);
  expect(scores[0]).toMatchObject({ rank: 2, is_me: true, exercise });
  expect(scores.at(-1).rank).toBe(51);
  expect(scores.some(row => row.profile_id === 'p1')).toBe(false);
});
