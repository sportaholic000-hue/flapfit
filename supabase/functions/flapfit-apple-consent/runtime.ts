import { createClient } from '@supabase/supabase-js';
import { createHmac } from 'node:crypto';
import { createConsentHandler, ConsentRequestError } from './core.ts';
import type { AppleEnvironment, ConsentStatus } from './core.ts';
import { createAppleVerifier } from './verifier.ts';

async function configuredHandler(environment: AppleEnvironment) {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) throw new ConsentRequestError(503);
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  async function rpc(name: string, args: Record<string, unknown>) {
    const { data, error } = await admin.rpc(name, args);
    if (error) throw new ConsentRequestError(503);
    return data;
  }
  // Vault decrypts only this service-only value. It stays in this isolate's memory.
  const hashKey = await rpc('get_apple_consent_hmac_key', {});
  if (typeof hashKey !== 'string' || !/^[0-9a-f]{64}$/i.test(hashKey)) {
    throw new ConsentRequestError(503);
  }
  function status(value: unknown): ConsentStatus {
    if (typeof value !== 'boolean') throw new ConsentRequestError(503);
    return value ? 'revoked' : 'no-revocation-recorded';
  }
  return createConsentHandler({
    environment,
    ...createAppleVerifier(environment),
    hashTransaction: (id: string, env: AppleEnvironment) => Promise.resolve(createHmac('sha256',
      Uint8Array.from(hashKey.match(/../g)!.map((byte) => Number.parseInt(byte, 16))))
      .update(`flapfit-apple-consent-v1\0${env}\0${id}`).digest('hex')),
    recordRevocation: async (record) => {
      await rpc('record_apple_consent_revocation', {
        p_notification_id: record.notificationId, p_transaction_hash: record.transactionHash,
        p_environment: record.environment, p_signed_at: record.signedAt,
      });
    },
    readStatus: async (hash) => status(await rpc('apple_consent_is_revoked', { p_transaction_hash: hash })),
    linkIdentity: async (hash, userId) => status(await rpc('link_apple_consent_identity', {
      p_transaction_hash: hash, p_user_id: userId,
    })),
    authenticate: async (bearer) => {
      const { data, error } = await admin.auth.getUser(bearer);
      return error ? null : data.user?.id ?? null;
    },
    now: Date.now,
  });
}

export function serveAppleConsent(environment: AppleEnvironment) {
  // The entrypoint, never a request/header/project-wide flag, selects the signed environment.
  if (environment !== 'Production' && environment !== 'Sandbox') throw new ConsentRequestError(503);
  let pending: Promise<ReturnType<typeof createConsentHandler>> | undefined;
  Deno.serve(async (req: Request) => {
    const attempt = pending ??= configuredHandler(environment);
    try {
      return await (await attempt)(req);
    } catch {
      // A temporary cold-start failure remains retryable. Never cache a rejected key load.
      if (pending === attempt) pending = undefined;
      return new Response(JSON.stringify({ error: 'Apple consent status is unavailable.' }), {
        status: 503, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      });
    }
  });
}
