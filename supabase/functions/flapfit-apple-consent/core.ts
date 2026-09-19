// Independent of Supabase and Apple's verifier so failure paths can be tested.
export const APP_BUNDLE_ID = 'com.flapfit.game';
export const APP_APPLE_ID = 6813280704;
export type AppleEnvironment = 'Production' | 'Sandbox';
export type ConsentStatus = 'revoked' | 'no-revocation-recorded';
export interface VerifiedAppTransaction {
  bundleId?: string;
  appAppleId?: number;
  receiptType?: string;
  appTransactionId?: string;
}
export interface VerifiedNotification {
  notificationType?: string;
  notificationUUID?: string;
  version?: string;
  signedDate?: number;
  appData?: {
    bundleId?: string;
    appAppleId?: number;
    environment?: string;
    signedAppTransactionInfo?: string;
  };
}
export interface ConsentDependencies {
  environment: AppleEnvironment;
  verifyNotification: (jws: string) => Promise<VerifiedNotification>;
  verifyAppTransaction: (jws: string) => Promise<VerifiedAppTransaction>;
  hashTransaction: (id: string, environment: AppleEnvironment) => Promise<string>;
  recordRevocation: (record: {
    notificationId: string;
    transactionHash: string;
    environment: AppleEnvironment;
    signedAt: string;
  }) => Promise<void>;
  readStatus: (hash: string) => Promise<ConsentStatus>;
  linkIdentity: (hash: string, userId: string) => Promise<ConsentStatus>;
  authenticate: (bearer: string) => Promise<string | null>;
  now: () => number;
}
export class ConsentRequestError extends Error {
  status: number;
  constructor(status: number) {
    super('Apple consent request could not be completed.');
    this.status = status;
  }
}
const headers = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
};
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BODY_BYTES = 65_536;
async function body(req: Request): Promise<Record<string, unknown>> {
  if (!req.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    throw new ConsentRequestError(415);
  }
  if (Number(req.headers.get('content-length')) > MAX_BODY_BYTES) throw new ConsentRequestError(413);
  const reader = req.body?.getReader();
  if (!reader) throw new ConsentRequestError(400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new ConsentRequestError(413);
      }
      chunks.push(part.value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  let value: unknown;
  try { value = JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw new ConsentRequestError(400); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ConsentRequestError(400);
  return value as Record<string, unknown>;
}
function signedString(value: unknown): string {
  if (typeof value !== 'string' || value.length < 20 || value.length > 60_000 ||
      !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value)) {
    throw new ConsentRequestError(400);
  }
  return value;
}
async function verifiedHash(jws: string, deps: ConsentDependencies): Promise<string> {
  const transaction = await deps.verifyAppTransaction(jws);
  if (transaction.bundleId !== APP_BUNDLE_ID || transaction.receiptType !== deps.environment ||
      (deps.environment === 'Production' && transaction.appAppleId !== APP_APPLE_ID) ||
      (transaction.appAppleId !== undefined && transaction.appAppleId !== APP_APPLE_ID) ||
      typeof transaction.appTransactionId !== 'string' ||
      transaction.appTransactionId.length === 0 || transaction.appTransactionId.length > 256) {
    throw new ConsentRequestError(400);
  }
  return deps.hashTransaction(transaction.appTransactionId, deps.environment);
}
export function createConsentHandler(deps: ConsentDependencies) {
  return async (req: Request): Promise<Response> => {
    try {
      if (req.method !== 'POST') return reply({ error: 'Method not allowed.' }, 405);
      const route = new URL(req.url).pathname.split('/').filter(Boolean).at(-1);
      if (!['notifications', 'status', 'link'].includes(route ?? '')) return reply({ error: 'Not found.' }, 404);
      // Link an existing identity only; never sign up or trust a body user ID.
      let userId: string | null = null;
      if (route === 'link') {
        const match = /^Bearer ([^\s]+)$/i.exec(req.headers.get('authorization') ?? '');
        if (!match) throw new ConsentRequestError(401);
        userId = await deps.authenticate(match[1]);
        if (!userId) throw new ConsentRequestError(401);
      }
      const input = await body(req);
      if (route === 'notifications') {
        const notification = await deps.verifyNotification(signedString(input.signedPayload));
        // Apple's verifier validates even notifications unrelated to consent.
        if (notification.notificationType !== 'RESCIND_CONSENT') return reply({ received: true, relevant: false });
        const app = notification.appData;
        if (notification.version !== '2.0' || !UUID.test(notification.notificationUUID ?? '') ||
            !Number.isSafeInteger(notification.signedDate) || (notification.signedDate ?? 0) <= 0 ||
            (notification.signedDate ?? 0) > deps.now() + 300_000 ||
            app?.bundleId !== APP_BUNDLE_ID || app.environment !== deps.environment ||
            (deps.environment === 'Production' && app.appAppleId !== APP_APPLE_ID) ||
            (app.appAppleId !== undefined && app.appAppleId !== APP_APPLE_ID)) throw new ConsentRequestError(400);
        const transactionHash = await verifiedHash(signedString(app.signedAppTransactionInfo), deps);
        // Commit the UUID and permanent denial atomically before acknowledging.
        await deps.recordRevocation({
          notificationId: notification.notificationUUID!.toLowerCase(), transactionHash,
          environment: deps.environment, signedAt: new Date(notification.signedDate!).toISOString(),
        });
        return reply({ received: true });
      }
      const hash = await verifiedHash(signedString(input.signedAppTransaction), deps);
      const status = route === 'link' ? await deps.linkIdentity(hash, userId!) : await deps.readStatus(hash);
      if (status !== 'revoked' && status !== 'no-revocation-recorded') throw new ConsentRequestError(503);
      // No Apple identifier, age, or affirmative processing permission in the response.
      return reply({ status, checkedAt: new Date(deps.now()).toISOString() });
    } catch (error) {
      const status = error instanceof ConsentRequestError ? error.status : 503;
      // Never log verifier/HTTP exceptions: they may contain signed data or identifiers.
      return reply({ error: 'Apple consent status is unavailable.' }, status);
    }
  };
}
