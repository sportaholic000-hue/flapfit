import { hashes, verify } from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha2.js';

// Verification only. The offline signing key is never an app/build input.
export const SUPPORT_RESPONSE_PUBLIC_KEY = '88174e29c90055c23de62011616dfb3befdcedf33bbbb2984a750d7b5bb003dc';
export const REQUEST_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
hashes.sha512 = sha512;

export function supportResponseMessage(requestId: string, expires: string): Uint8Array {
  // All fields and this domain separator are ASCII; no WebCrypto or native SDK.
  return Uint8Array.from(`FlapFit privacy response|1|google-processing-withdrawal|${requestId}|${expires}`, c => c.charCodeAt(0));
}
function fromHex(value: string): Uint8Array {
  return Uint8Array.from(value.match(/../g) ?? [], byte => parseInt(byte, 16));
}
export function verifySupportResponse(code: string, requestId: string, now = Date.now(), publicKey = SUPPORT_RESPONSE_PUBLIC_KEY): boolean {
  if (code.length > 256 || !REQUEST_ID_PATTERN.test(requestId) || !/^[0-9a-f]{64}$/.test(publicKey)) return false;
  const parts = code.trim().split('.');
  if (parts.length !== 4) return false;
  const [version, id, expires, signature] = parts;
  if (version !== 'FFPR1' || id !== requestId || !/^[0-9]{10}$/.test(expires) || !/^[0-9a-f]{128}$/.test(signature)) return false;
  const expiryMs = Number(expires) * 1000;
  if (!Number.isFinite(now) || expiryMs <= now || expiryMs > now + 31 * 86400_000) return false;
  try { return verify(fromHex(signature), supportResponseMessage(id, expires), fromHex(publicKey), { zip215: false }); }
  catch { return false; }
}
