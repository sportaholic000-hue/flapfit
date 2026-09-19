'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { createHandler } = require('./server.cjs');
const key = 'local-test-key-not-a-deployment-secret-1234';
const signedPayload = 'ZmFrZQ.ZmFrZQ.ZmFrZQ';
async function fixture(t, verify = async () => ({ notificationType: 'TEST', version: '2.0', secretExtra: 'never returned' })) {
  const calls = [];
  const verifiers = Object.fromEntries(['Production', 'Sandbox'].map(environment => [environment, {
    verifyAndDecodeNotification: async signed => { calls.push([environment, 'notification']); return verify(signed); },
    verifyAndDecodeAppTransaction: async signed => { calls.push([environment, 'transaction']); return verify(signed); },
  }]));
  const server = http.createServer(createHandler({sharedKey:key,verifiers,retryableStatus:2}));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => {server.closeAllConnections();server.close(resolve);}));
  return { calls, request: (route, options = {}) => fetch(`http://127.0.0.1:${server.address().port}${route}`, {
    method: 'POST', headers: {'Content-Type':'application/json',Authorization:`Bearer ${key}`},
    body:JSON.stringify({signedPayload}), ...options,
  }) };
}
test('requires strong configured authentication', () => assert.throws(() => createHandler({sharedKey:'short'})));
test('refuses missing or wrong authentication before invoking Apple', async t => {
  const f=await fixture(t);
  for(const headers of [{},{Authorization:'Bearer wrong'}]) assert.equal((await f.request('/sandbox/notification',{headers})).status,401);
  assert.equal(f.calls.length,0);
});
test('fixed paths bind both environment and kind and only return required fields', async t => {
  const f=await fixture(t);
  for(const env of ['production','sandbox']) for(const kind of ['notification','app-transaction']) {
    const r=await f.request(`/${env}/${kind}`); assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');
    assert.equal(JSON.stringify(await r.json()).includes('secretExtra'),false);
  }
  assert.deepEqual(f.calls,[['Production','notification'],['Production','transaction'],['Sandbox','notification'],['Sandbox','transaction']]);
});
test('rejects malformed and excessive input without verifier work', async t => {
  const f=await fixture(t);
  for(const body of ['{',JSON.stringify({signedPayload:'bad'}),JSON.stringify({signedPayload:null})]) {
    assert.equal((await f.request('/sandbox/notification',{body})).status,400);
  }
  assert.equal((await f.request('/sandbox/notification',{body:'x'.repeat(65537)})).status,413);
  assert.equal(f.calls.length,0);
});
test('invalid signatures fail closed and never retry another environment', async t => {
  const f=await fixture(t,async()=>{throw Object.assign(new Error(),{status:1});});
  const r=await f.request('/production/notification');assert.equal(r.status,400);assert.deepEqual(f.calls,[['Production','notification']]);
});
test('network and internal errors remain retryable and redacted', async t => {
  for(const error of [Object.assign(new Error('sensitive test value'),{status:2}),new Error('sensitive test value')]) {
    const f=await fixture(t,async()=>{throw error;});const r=await f.request('/sandbox/notification');
    assert.equal(r.status,503);assert.equal((await r.text()).includes('sensitive'),false);
  }
});
