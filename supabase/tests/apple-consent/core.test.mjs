import test from 'node:test';
import assert from 'node:assert/strict';
import { createConsentHandler, ConsentRequestError } from '../../functions/flapfit-apple-consent/core.ts';
import { requiresAppleCompetitionCheck } from '../../functions/_shared/apple-consent-competition.ts';

const JWS = 'eyJhbGciOiJFUzI1NiJ9.eyJ0ZXN0Ijp0cnVlfQ.c2lnbmF0dXJl';
const NOW = Date.parse('2026-09-19T12:00:00Z');
const TX = { bundleId: 'com.flapfit.game', appAppleId: 6813280704,
  receiptType: 'Production', appTransactionId: 'private-apple-id' };
const NOTIFICATION = { notificationType: 'RESCIND_CONSENT', version: '2.0',
  notificationUUID: '7c295fda-f615-4e86-bc69-8e65c9a8d836', signedDate: NOW,
  appData: { bundleId: 'com.flapfit.game', appAppleId: 6813280704,
    environment: 'Production', signedAppTransactionInfo: JWS } };
function fixture(overrides = {}) {
  const calls = [];
  const denied = new Set();
  const deps = {
    environment: 'Production', now: () => NOW,
    verifyNotification: async () => { calls.push('outer'); return structuredClone(NOTIFICATION); },
    verifyAppTransaction: async () => { calls.push('inner'); return { ...TX }; },
    hashTransaction: async (id, env) => { calls.push(['hash', id, env]); return 'a'.repeat(64); },
    recordRevocation: async (record) => { calls.push(['persist', record]); denied.add(record.transactionHash); },
    readStatus: async (hash) => denied.has(hash) ? 'revoked' : 'no-revocation-recorded',
    linkIdentity: async (hash, user) => { calls.push(['link', user]); return deps.readStatus(hash); },
    authenticate: async (bearer) => { calls.push(['auth', bearer]); return bearer === 'live-user' ? 'authenticated-id' : null; },
    ...overrides,
  };
  return { handler: createConsentHandler(deps), calls, denied, deps };
}
function request(route, body = {}, token) {
  return new Request(`https://example.test/functions/v1/flapfit-apple-consent/${route}`, {
    method: 'POST', headers: { 'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body),
  });
}
test('outer and nested signatures verified, denial persisted before acknowledgement', async () => {
  const f = fixture();
  const r = await f.handler(request('notifications', { signedPayload: JWS }));
  assert.equal(r.status, 200);
  assert.deepEqual(f.calls.slice(0, 2), ['outer', 'inner']);
  assert.equal(f.calls[3][0], 'persist');
  assert.equal(f.calls[3][1].transactionHash, 'a'.repeat(64));
  assert.equal(f.denied.size, 1);
  assert.equal((await f.handler(request('status', { signedAppTransaction: JWS }))).status, 200);
  assert.equal((await (await f.handler(request('status', { signedAppTransaction: JWS }))).json()).status, 'revoked');
});
for (const step of ['verifyNotification', 'verifyAppTransaction']) {
  test(`rejects forged ${step} without recording or leaking details`, async () => {
    const f = fixture({ [step]: async () => { throw new ConsentRequestError(400); } });
    const response = await f.handler(request('notifications', { signedPayload: JWS }));
    assert.equal(response.status, 400);
    assert.equal(f.denied.size, 0);
    assert.doesNotMatch(await response.text(), /private-apple-id|eyJ/);
  });
}
test('database failure returns retryable 503 and never ACKs', async () => {
  const f = fixture({ recordRevocation: async () => { throw new Error(JWS); } });
  const response = await f.handler(request('notifications', { signedPayload: JWS }));
  assert.equal(response.status, 503);
  assert.doesNotMatch(await response.text(), /eyJ/);
});
for (const patch of [
  { bundleId: 'com.other.app' }, { appAppleId: 1 }, { appAppleId: undefined },
  { receiptType: 'Sandbox' }, { receiptType: 'Xcode' }, { appTransactionId: '' },
]) test(`rejects nested scope mismatch ${JSON.stringify(patch)}`, async () => {
  const f = fixture({ verifyAppTransaction: async () => ({ ...TX, ...patch }) });
  assert.equal((await f.handler(request('notifications', { signedPayload: JWS }))).status, 400);
  assert.equal(f.denied.size, 0);
});
for (const patch of [
  { bundleId: 'com.other.app' }, { appAppleId: 1 }, { appAppleId: undefined },
  { environment: 'Sandbox' }, { signedAppTransactionInfo: undefined },
]) test(`rejects outer scope mismatch ${JSON.stringify(patch)}`, async () => {
  const f = fixture({ verifyNotification: async () => ({ ...NOTIFICATION,
    appData: { ...NOTIFICATION.appData, ...patch } }) });
  assert.equal((await f.handler(request('notifications', { signedPayload: JWS }))).status, 400);
});
test('status needs no auth or competition identity and never returns permission or IDs', async () => {
  const f = fixture();
  const response = await f.handler(request('status', { signedAppTransaction: JWS }));
  assert.deepEqual(await response.json(), { status: 'no-revocation-recorded', checkedAt: new Date(NOW).toISOString() });
  assert.equal(f.calls.some((v) => Array.isArray(v) && ['auth', 'link'].includes(v[0])), false);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});
test('replayed valid download or new live auth cannot clear existing denial', async () => {
  const f = fixture();
  await f.handler(request('notifications', { signedPayload: JWS }));
  const response = await f.handler(request('link', { signedAppTransaction: JWS, userId: 'spoof' }, 'live-user'));
  assert.equal((await response.json()).status, 'revoked');
  assert.deepEqual(f.calls.at(-1), ['link', 'authenticated-id']);
});
test('link rejects missing, expired or deleted-user auth before inspecting signed data', async () => {
  for (const token of [undefined, 'expired', 'deleted-user']) {
    const f = fixture();
    assert.equal((await f.handler(request('link', { signedAppTransaction: JWS }, token))).status, 401);
    assert.equal(f.calls.includes('inner'), false);
  }
});
test('signature-valid old notifications still revoke; future/malformed dates do not', async () => {
  for (const signedDate of [NOW - 365 * 86400000, NOW + 300001, Number.NaN]) {
    const f = fixture({ verifyNotification: async () => ({ ...NOTIFICATION, signedDate }) });
    assert.equal((await f.handler(request('notifications', { signedPayload: JWS }))).status,
      signedDate < NOW ? 200 : 400);
  }
});
test('unknown routes and unsupported bodies cannot invoke verification', async () => {
  const f = fixture();
  assert.equal((await f.handler(request('restore-consent', {}))).status, 404);
  assert.equal((await f.handler(request('status', { signedAppTransaction: 'invalid' }))).status, 400);
  assert.equal((await f.handler(request('status', { signedAppTransaction: 'x'.repeat(70000) }))).status, 413);
  assert.equal(f.calls.length, 0);
});
test('unrelated authenticated Apple notification never grants or clears consent', async () => {
  const f = fixture({ verifyNotification: async () => ({ notificationType: 'TEST' }) });
  assert.equal((await f.handler(request('notifications', { signedPayload: JWS }))).status, 200);
  assert.deepEqual(f.calls, []);
  assert.equal(f.denied.size, 0);
});
test('competition blocks are scoped; account deletion and safety/support remain reachable', () => {
  for (const [method, route] of [['GET', '/leaderboard'], ['POST', '/runs'], ['POST', '/runs/finalize']]) {
    assert.equal(requiresAppleCompetitionCheck(method, route), true);
  }
  for (const [method, route] of [['DELETE', '/me'], ['POST', '/reports'], ['POST', '/blocks'], ['GET', '/support']]) {
    assert.equal(requiresAppleCompetitionCheck(method, route), false);
  }
});
