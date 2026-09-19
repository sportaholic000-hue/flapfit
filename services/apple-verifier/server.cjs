'use strict';
const http = require('node:http');
const { timingSafeEqual } = require('node:crypto');

const MAX_BYTES = 65536;
const routes = new Map([
  ['/production/notification', ['Production', 'notification']],
  ['/production/app-transaction', ['Production', 'transaction']],
  ['/sandbox/notification', ['Sandbox', 'notification']],
  ['/sandbox/app-transaction', ['Sandbox', 'transaction']],
]);

// This server has no database access, Apple private key, storage or request logging.
function createHandler({ sharedKey, verifiers, retryableStatus }) {
  if (typeof sharedKey !== 'string' || sharedKey.length < 32) throw new Error('A strong verifier key is required.');
  const expected = Buffer.from(`Bearer ${sharedKey}`);
  return async function handle(req, res) {
    const reply = (status, value) => {
      if (res.destroyed || res.writableEnded) return;
      res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff' });
      res.end(JSON.stringify(value));
    };
    if (req.method === 'GET' && req.url === '/health') return reply(200, { ready: true });
    const supplied = Buffer.from(req.headers.authorization ?? '');
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
      return reply(401, { error: 'Unauthorized.' });
    }
    if (req.method !== 'POST') return reply(405, { error: 'Method not allowed.' });
    const route = routes.get(req.url);
    if (!route) return reply(404, { error: 'Not found.' });
    if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] ?? '')) {
      return reply(415, { error: 'JSON required.' });
    }
    if (Number(req.headers['content-length']) > MAX_BYTES) return reply(413, { error: 'Request too large.' });
    try {
      const chunks = [];
      let length = 0;
      for await (const chunk of req) {
        length += chunk.length;
        if (length > MAX_BYTES) return reply(413, { error: 'Request too large.' });
        chunks.push(chunk);
      }
      let body;
      try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
      catch { return reply(400, { error: 'Invalid request.' }); }
      const signed = body?.signedPayload;
      if (typeof signed !== 'string' || signed.length > 60000 ||
          !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(signed)) {
        return reply(400, { error: 'Invalid request.' });
      }
      const [environment, kind] = route;
      const verifier = verifiers[environment];
      let verified;
      try {
        verified = kind === 'notification'
          ? await verifier.verifyAndDecodeNotification(signed)
          : await verifier.verifyAndDecodeAppTransaction(signed);
      } catch (error) {
        // Unknown/internal errors retry. Invalid Apple data never becomes verified.
        const status = Number.isInteger(error?.status) && error.status !== retryableStatus ? 400 : 503;
        return reply(status, { error: 'Verification unavailable.' });
      }
      const result = kind === 'notification' ? {
        notificationType: verified.notificationType, notificationUUID: verified.notificationUUID,
        version: verified.version, signedDate: verified.signedDate,
        appData: verified.appData ? {
          bundleId: verified.appData.bundleId, appAppleId: verified.appData.appAppleId,
          environment: verified.appData.environment,
          signedAppTransactionInfo: verified.appData.signedAppTransactionInfo,
        } : undefined,
      } : {
        bundleId: verified.bundleId, appAppleId: verified.appAppleId,
        receiptType: verified.receiptType, appTransactionId: verified.appTransactionId,
      };
      return reply(200, { verified: result });
    } catch { return reply(503, { error: 'Verification unavailable.' }); }
  };
}

function makeVerifiers(apple, roots) {
  return Object.fromEntries(['Production', 'Sandbox'].map(environment => [environment,
    new apple.SignedDataVerifier(roots, true, apple.Environment[environment.toUpperCase()],
      'com.flapfit.game', 6813280704),
  ]));
}

if (require.main === module) {
  const apple = require('@apple/app-store-server-library');
  const roots = require('./apple-roots.json').map(root => Buffer.from(root, 'base64'));
  const server = http.createServer(createHandler({ sharedKey: process.env.APPLE_VERIFIER_SHARED_KEY,
    verifiers: makeVerifiers(apple, roots), retryableStatus: apple.VerificationStatus.RETRYABLE_VERIFICATION_FAILURE }));
  server.requestTimeout = 45000;
  server.headersTimeout = 10000;
  server.listen(Number(process.env.PORT ?? 8080), '0.0.0.0');
  process.on('SIGTERM', () => server.close());
}
module.exports = { createHandler, makeVerifiers };
