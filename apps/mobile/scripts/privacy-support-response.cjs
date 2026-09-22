#!/usr/bin/env node
// Offline operator tool. Never publish the private key or issue a code merely
// because someone wants commercial ad removal. See the privacy support runbook.
const { createPrivateKey, createPublicKey, sign } = require('node:crypto');
const { readFileSync } = require('node:fs');
const { parseArgs } = require('node:util');

function issue({ request, key, days = '7' }) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(request ?? '')) throw Error('A valid device request ID is required.');
  if (!key || !/^(?:[1-9]|[12][0-9]|30)$/.test(days)) throw Error('Provide --key and --days 1–30.');
  const privateKey = createPrivateKey(readFileSync(key));
  const publicKey = createPublicKey(privateKey).export({ format: 'jwk' });
  const expected = readFileSync(require('node:path').join(__dirname, '../src/services/privacy/supportResponseSignature.ts'), 'utf8').match(/PUBLIC_KEY = '([0-9a-f]{64})'/)?.[1];
  if (publicKey.crv !== 'Ed25519' || Buffer.from(publicKey.x, 'base64url').toString('hex') !== expected) throw Error('This key does not match the application verification key.');
  const expires = String(Math.floor(Date.now() / 1000) + Number(days) * 86400);
  const message = Buffer.from(`FlapFit privacy response|1|google-processing-withdrawal|${request}|${expires}`);
  return `FFPR1.${request}.${expires}.${sign(null, message, privateKey).toString('hex')}`;
}
if (require.main === module) {
  try {
    const { values } = parseArgs({ options: { request: { type: 'string' }, key: { type: 'string' }, days: { type: 'string' }, scope: { type: 'string' } } });
    if (values.scope !== 'google-processing-withdrawal') throw Error('Explicit --scope google-processing-withdrawal is required after assessing the privacy request.');
    process.stdout.write(issue(values) + '\n');
  } catch (error) { process.stderr.write(error.message + '\n'); process.exitCode = 1; }
}
module.exports = { issue };
