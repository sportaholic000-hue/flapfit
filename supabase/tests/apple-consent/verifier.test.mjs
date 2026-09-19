import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash, X509Certificate } from 'node:crypto';
import { dependency } from './dependencies.mjs';
import { APPLE_ROOTS_DER_BASE64 } from '../../functions/flapfit-apple-consent/apple-roots.ts';
const { SignedDataVerifier, Environment } = dependency('@apple/app-store-server-library');
const roots = APPLE_ROOTS_DER_BASE64.map((root) => Buffer.from(root, 'base64'));
const verifier = new SignedDataVerifier(roots, true, Environment.PRODUCTION, 'com.flapfit.game', 6813280704);
const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
test('real pinned Apple verifier rejects unsigned/forged outer and nested JWS', async () => {
  const payload = { bundleId: 'com.flapfit.game', appAppleId: 6813280704,
    receiptType: 'Production', appTransactionId: 'forged', appData: {
      bundleId: 'com.flapfit.game', appAppleId: 6813280704, environment: 'Production' } };
  for (const alg of ['none', 'HS256', 'ES256']) {
    const token = `${encode({ alg, x5c: [] })}.${encode(payload)}.ZmFrZQ`;
    await assert.rejects(verifier.verifyAndDecodeNotification(token));
    await assert.rejects(verifier.verifyAndDecodeAppTransaction(token));
  }
});
test('pinned public trust anchors are Apple self-signed certificate authorities', () => {
  for (const root of roots) {
    const cert = new X509Certificate(root);
    assert.match(cert.subject, /Apple Root CA - G[23]/);
    assert.equal(cert.ca, true);
    assert.ok(cert.verify(cert.publicKey));
    assert.equal(createHash('sha256').update(root).digest('hex').length, 64);
  }
});
test('deployed adapter pins verifier and forbids Xcode/local signature-bypass environments', async () => {
  const adapter = await readFile(new URL('../../functions/flapfit-apple-consent/verifier.ts', import.meta.url), 'utf8');
  const config = JSON.parse(await readFile(new URL('../../functions/flapfit-apple-consent/deno.json', import.meta.url), 'utf8'));
  assert.equal(config.imports['@apple/app-store-server-library'], 'npm:@apple/app-store-server-library@3.1.0');
  assert.match(adapter, /true, \/\/ Online certificate/);
  assert.doesNotMatch(adapter, /Environment\.(XCODE|LOCAL_TESTING)/);
});
