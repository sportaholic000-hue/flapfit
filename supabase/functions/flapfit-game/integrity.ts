// Import the existing, tested Deno X509 compatibility layer before the verifier.
import '../flapfit-apple-consent/crypto-compat.ts';
import crypto from 'node:crypto';
import { Buffer } from 'node:buffer';
import cbor from 'cbor';
import verifyAttestation from './app-attest/verifyAttestation.js';
import verifyAssertion from './app-attest/verifyAssertion.js';

// App ID prefix verified against the signed provisioning profile of build 2.
const teamIdentifier = 'KM48R8T97P';
const bundleIdentifier = 'com.flapfit.game';
const identity = { teamIdentifier, bundleIdentifier };

export function proofBytes(value: unknown, maximum: number): Buffer {
  if (typeof value !== 'string' || value.length === 0 || value.length > maximum * 4 / 3 + 4 ||
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
    throw new Error('Invalid integrity proof');
  }
  const result = Buffer.from(value, 'base64');
  if (result.length > maximum || result.toString('base64') !== value) throw new Error('Invalid integrity proof');
  return result;
}

function decoded(value: Buffer): Record<string, unknown> {
  // Reject trailing items, duplicate map keys and pathological nesting before
  // passing the bounded object to the upstream verifier.
  const result = cbor.decodeAllSync(value, { preventDuplicateKeys: true, max_depth: 12 });
  if (result.length !== 1 || !result[0] || typeof result[0] !== 'object') throw new Error('Invalid integrity proof');
  return result[0];
}

function checkExtensions(data: Buffer, attestation: boolean) {
  if (data.length < 37) throw new Error('Invalid authenticator data');
  const flags = data[32];
  // App Attest assertions can retain the AT flag without credential data;
  // Apple's real assertion format has a 37-byte prefix in that case too.
  if (attestation && !(flags & 0x40)) throw new Error('Invalid authenticator flags');
  let offset = 37;
  if (attestation) {
    if (data.length < 55 || data.readUInt16BE(53) !== 32) throw new Error('Invalid credential');
    offset = 87;
    // Credential public key precedes any extensions. Extended decoder reports
    // exactly how many bytes it consumed rather than scanning for a delimiter.
    const credential = cbor.decodeFirstSync(data.subarray(offset), { extendedResults: true, preventDuplicateKeys: true, max_depth: 12 });
    offset += credential.length;
  }
  if (!(flags & 0x80)) {
    if (offset !== data.length) throw new Error('Unexpected authenticator data');
    return; // iOS versions before 27 do not include these extensions.
  }
  const extensions = decoded(data.subarray(offset));
  const category = extensions.apple_validation_category_01;
  // Apple's iOS 27 field is a four-byte little-endian uint32.
  if (!Buffer.isBuffer(category) || category.length !== 4 || ![2, 4, 5].includes(category.readUInt32LE())) {
    throw new Error('Unapproved app distribution');
  }
  if (typeof extensions.apple_bundle_version_01 !== 'string' ||
      !/^\d+(?:\.\d+){0,2}$/.test(extensions.apple_bundle_version_01)) throw new Error('Invalid app build');
}

export function attestKey(keyId: string, proof: unknown, challenge: string | Buffer, now = Date.now(), appIdentity = identity) {
  if (proofBytes(keyId, 32).length !== 32) throw new Error('Invalid key identifier');
  const attestation = proofBytes(proof, 16000);
  const object = decoded(attestation);
  const statement = object.attStmt as { x5c?: unknown[] };
  if (!Array.isArray(statement?.x5c) || statement.x5c.length !== 2 || !Buffer.isBuffer(object.authData)) throw new Error('Invalid attestation');
  const certificates = statement.x5c.map(value => {
    if (!Buffer.isBuffer(value)) throw new Error('Invalid certificate');
    const cert = new crypto.X509Certificate(value);
    if (!(Date.parse(cert.validFrom) <= now && now <= Date.parse(cert.validTo))) throw new Error('Expired certificate');
    return cert;
  });
  if (certificates[0].ca || !certificates[1].ca || certificates[0].issuer !== certificates[1].subject) throw new Error('Invalid certificate chain');
  checkExtensions(object.authData, true);
  // Upstream checks the pinned Apple root, signatures, challenge nonce, RP ID,
  // public-key hash, credential ID, zero counter and production AAGUID.
  return verifyAttestation({ ...appIdentity, keyId, attestation, challenge, allowDevelopmentEnvironment: false });
}

export function resultPayload(runId: string, nonce: string, score: number, durationMs: number): string {
  // Names are deliberately outside the signed result: a name collision can be
  // corrected without changing or re-signing the score.
  return JSON.stringify(['flapfit-result-v1', runId, nonce, score, durationMs]);
}

export function verifyResult(proof: unknown, publicKey: string, payload: string, appIdentity = identity) {
  const assertion = proofBytes(proof, 2048);
  const object = decoded(assertion);
  if (!Buffer.isBuffer(object.authenticatorData) || !Buffer.isBuffer(object.signature)) throw new Error('Invalid assertion');
  checkExtensions(object.authenticatorData, false);
  // Check the unsigned 32-bit counter here. The database enforces strict
  // monotonicity atomically with publication, including exact retry handling.
  const counter = object.authenticatorData.readUInt32BE(33);
  if (counter === 0 || counter > 2147483647) throw new Error('Invalid assertion counter');
  verifyAssertion({ ...appIdentity, assertion, payload, publicKey, signCount: 0 });
  return { counter, hash: crypto.createHash('sha256').update(assertion).digest('hex') };
}
