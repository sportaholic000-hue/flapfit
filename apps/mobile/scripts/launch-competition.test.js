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
  const sharedSource = fs.readFileSync(path.join(__dirname, '../../../supabase/functions/_shared/apple-consent-competition.ts'), 'utf8');
  const sharedCompiled = ts.transpileModule(sharedSource, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const shared = {};
  new Function('exports', sharedCompiled)(shared);
  let handler;
  const createClient = jest.fn(() => admin);
  new Function('Deno', 'createClient', 'requiresAppleCompetitionCheck', compiled)({
    env: { get: () => 'configured' }, serve: fn => { handler = fn; },
  }, createClient, shared.requiresAppleCompetitionCheck);
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
    rpc: jest.fn((name) => name === 'apple_consent_user_is_revoked'
      ? Promise.resolve({ data: false, error: null })
      : { single: async () => ({ data: { run_id: 'run', expires_at: 'later' } }) }),
  };
  const { handler } = createHandler(admin);
  expect((await handler(request('/runs', { kind: 'challenge', exercise: 'pushups', challengeCode: 'ABC234' }))).status).toBe(400);
  expect(admin.rpc).not.toHaveBeenCalledWith('begin_game_run', expect.anything());
  expect((await handler(request('/runs', { kind: 'leaderboard', exercise: 'pushups' }))).status).toBe(201);
  expect(admin.rpc).toHaveBeenCalledWith('begin_game_run', expect.objectContaining({ p_kind: 'leaderboard', p_challenge_code: null }));
});

test.each(['pushups', 'squats', 'pullups'])('%s retains 50 entries, global ranks and blocked-player filtering', async exercise => {
  const admin = {
    auth: { getUser: async () => ({ data: { user: { id: 'p2', is_anonymous: true } } }) },
    rpc: jest.fn(async (name) => { expect(name).toBe('apple_consent_user_is_revoked'); return { data: false, error: null }; }),
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

// Exercise the actual shared route guard as well as the live handler ordering.
test.each([
  { data: true, error: null, status: 403 },
  { data: null, error: { message: 'unavailable' }, status: 503 },
  { data: null, error: null, status: 503 },
])('Apple denial/status failure blocks competition before data access: %j', async ({ data, error, status }) => {
  const admin = {
    auth: { getUser: jest.fn(async () => ({ data: { user: { id: 'viewer', is_anonymous: true } } })) },
    rpc: jest.fn(async () => ({ data, error })), from: jest.fn(),
  };
  const { handler } = createHandler(admin);
  const response = await handler(request('/leaderboard?exercise=pushups'));
  expect(response.status).toBe(status); expect(admin.from).not.toHaveBeenCalled();
  expect(admin.rpc).toHaveBeenCalledWith('apple_consent_user_is_revoked', { p_user_id: 'viewer', p_environment: 'Production' });
});

test('authenticated deletion bypasses revoked participation and renewed terms', async () => {
  const admin = {
    auth: {
      getUser: jest.fn(async () => ({ data: { user: { id: 'viewer', is_anonymous: true } } })),
      admin: { deleteUser: jest.fn(async () => ({ error: null })) },
    },
    rpc: jest.fn(),
  };
  const { handler } = createHandler(admin);
  const response = await handler(new Request('https://test.invalid/functions/v1/flapfit-game/me', {
    method: 'DELETE', headers: { Authorization: 'Bearer fixture' },
  }));
  expect(response.status).toBe(200); expect(admin.rpc).not.toHaveBeenCalled();
  expect(admin.auth.admin.deleteUser).toHaveBeenCalledWith('viewer');
});

test.each([
  { label: 'missing token', token: '', result: { data: { user: null } } },
  { label: 'invalid/deleted session', token: 'expired', result: { data: { user: null }, error: { message: 'Invalid token' } } },
  { label: 'non-anonymous identity', token: 'fixture', result: { data: { user: { id: 'other', is_anonymous: false } } } },
])('$label cannot reach competition data or privileged RPCs', async ({ token, result }) => {
  const admin = { auth: { getUser: jest.fn(async () => result) }, rpc: jest.fn(), from: jest.fn() };
  const { handler } = createHandler(admin);
  const response = await handler(new Request('https://test.invalid/flapfit-game/leaderboard?exercise=pushups', {
    headers: { Authorization: token ? `Bearer ${token}` : '', 'X-FlapFit-Terms-Version': '2026-09-14' },
  }));
  expect(response.status).toBe(401); expect(admin.rpc).not.toHaveBeenCalled(); expect(admin.from).not.toHaveBeenCalled();
});

function bodyLimitFixture() {
  const admin = {
    auth: { getUser: jest.fn(async () => ({ data: { user: { id: 'viewer', is_anonymous: true } } })) },
    rpc: jest.fn(name => name === 'apple_consent_user_is_revoked' ? Promise.resolve({ data: false, error: null })
      : { single: async () => ({ data: { run_id: 'run', expires_at: 'later' } }) }),
  };
  return { ...createHandler(admin), admin };
}

test('streamed body stops at the byte limit without buffering the remainder', async () => {
  const { handler, admin } = bodyLimitFixture();
  const cancel = jest.fn(); let reads = 0;
  const stream = new ReadableStream({
    pull(controller) { ++reads; if (reads <= 3) controller.enqueue(new Uint8Array(2049)); else controller.close(); }, cancel,
  }, { highWaterMark: 0 });
  const response = await handler(new Request('https://test.invalid/flapfit-game/runs', {
    method: 'POST', headers: { Authorization: 'Bearer fixture', 'X-FlapFit-Terms-Version': '2026-09-14' }, body: stream, duplex: 'half',
  }));
  expect(response.status).toBe(413); expect(cancel).toHaveBeenCalledTimes(1); expect(reads).toBe(2);
  expect(admin.rpc).not.toHaveBeenCalledWith('begin_game_run', expect.anything());
});

test('body limit counts UTF-8 bytes, not JavaScript characters', async () => {
  const { handler, admin } = bodyLimitFixture();
  const response = await handler(request('/runs', { kind: 'leaderboard', exercise: 'pushups', unused: 'é'.repeat(2050) }));
  expect(response.status).toBe(413); expect(admin.rpc).not.toHaveBeenCalledWith('begin_game_run', expect.anything());
});

test('declared oversize body is rejected without reading it', async () => {
  const { handler } = bodyLimitFixture();
  const pull = jest.fn(controller => controller.close());
  const response = await handler(new Request('https://test.invalid/flapfit-game/runs', {
    method: 'POST', headers: { Authorization: 'Bearer fixture', 'X-FlapFit-Terms-Version': '2026-09-14', 'Content-Length': '9000' },
    body: new ReadableStream({ pull }, { highWaterMark: 0 }), duplex: 'half',
  }));
  expect(response.status).toBe(413); expect(pull).not.toHaveBeenCalled();
});

test('run ownership comes from the verified session, never a body user identifier', async () => {
  const { handler, admin } = bodyLimitFixture();
  expect((await handler(request('/runs', { kind: 'leaderboard', exercise: 'pushups', userId: 'victim' }))).status).toBe(201);
  expect(admin.rpc).toHaveBeenCalledWith('begin_game_run', expect.objectContaining({ p_user_id: 'viewer' }));
});

test.each(['[]', 'null', '{broken'])('invalid body %s performs no game mutation', async body => {
  const { handler, admin } = bodyLimitFixture();
  const response = await handler(new Request('https://test.invalid/flapfit-game/runs', {
    method: 'POST', headers: { Authorization: 'Bearer fixture', 'X-FlapFit-Terms-Version': '2026-09-14' }, body,
  }));
  expect(response.status).toBe(400); expect(admin.rpc).not.toHaveBeenCalledWith('begin_game_run', expect.anything());
});
