/** Deno 2.1.4 compatibility for Apple's pinned Node verifier. No checks are skipped.
 * Uses Apple's existing jsrsasign dependency for its missing X509 operations.
 * Newer runtimes keep their native implementations. Import before the Apple SDK.
 */
import crypto from 'node:crypto';
import { Buffer } from 'node:buffer';
import { X509, KEYUTIL, hextopem } from 'jsrsasign';

const legacyRuntime = Deno.version.deno === '2.1.4' ||
  /^supabase-edge-runtime-\d+\.\d+\.\d+ \(compatible with Deno v2\.1\.4\)$/.test(Deno.version.deno);
if (legacyRuntime) {
  const NativeX509 = crypto.X509Certificate;
  const nativeCreatePublicKey = crypto.createPublicKey;
  const aliases: Record<string, readonly [string, string]> = {
    p256: ['P-256', 'prime256v1'], p384: ['P-384', 'secp384r1'], p521: ['P-521', 'secp521r1'],
  };

  const normalizePublicKey = (key: crypto.KeyObject): crypto.KeyObject => {
    if (key.asymmetricKeyType !== 'ec') return key;
    const details = key.asymmetricKeyDetails;
    const mapping = aliases[details?.namedCurve ?? ''];
    if (mapping) {
      // Deno's alias is accepted only when its actual exported curve agrees.
      // jsonwebtoken's algorithm/curve validation remains enabled and unchanged.
      if (key.export({ format: 'jwk' }).crv !== mapping[0]) throw new Error('Curve metadata mismatch');
      Object.defineProperty(key, 'asymmetricKeyDetails', {
        value: { ...details, namedCurve: mapping[1] },
      });
    }
    return key;
  };

  class CompatibleX509 extends NativeX509 {
    #parsed: X509;
    #bytes: Buffer;
    constructor(input: crypto.BinaryLike) {
      super(input); // Retain native parsing, CA, issuer, subject, validity and public key.
      this.#parsed = new X509();
      const bytes = typeof input === 'string' ? Buffer.from(input)
        : Buffer.from(input.buffer, input.byteOffset, input.byteLength);
      if (bytes.subarray(0, 27).toString() === '-----BEGIN CERTIFICATE-----') {
        this.#parsed.readCertPEM(bytes.toString());
        this.#bytes = Buffer.from(this.#parsed.hex, 'hex');
      } else {
        this.#bytes = Buffer.from(bytes);
        this.#parsed.readCertHex(bytes.toString('hex'));
      }
      const publicKey = normalizePublicKey(this.publicKey);
      // Node's type declarations describe these runtime getters as properties.
      Object.defineProperties(this, {
        raw: { get: () => Buffer.from(this.#bytes) },
        publicKey: { value: publicKey },
        infoAccess: { get: () => this.readInfoAccess() },
      });
    }
    override toString(): string { return hextopem(this.#bytes.toString('hex'), 'CERTIFICATE'); }
    private readInfoAccess(): string | undefined {
      const aia = this.#parsed.getExtAIAInfo();
      if (!aia) return undefined;
      const lines: string[] = [];
      for (const [type, urls] of [['OCSP', aia.ocsp], ['CA Issuers', aia.caissuer]] as const) {
        for (const url of urls ?? []) {
          if (/[\r\n]/.test(url)) throw new Error('Invalid AIA URI');
          lines.push(`${type} - URI:${url}`);
        }
      }
      return lines.length ? lines.join('\n') : undefined;
    }
    override verify(key: crypto.KeyObject): boolean {
      if (key.type !== 'public') throw new TypeError('A public KeyObject is required');
      try {
        return this.#parsed.verifySignature(KEYUTIL.getKey(key.export({ format: 'pem', type: 'spki' })));
      } catch {
        return false; // Malformed/incompatible/invalid signatures always reject the chain.
      }
    }
  }
  crypto.X509Certificate = CompatibleX509;
  crypto.createPublicKey = (key) => normalizePublicKey(nativeCreatePublicKey(key));
}
