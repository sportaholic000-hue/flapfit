import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { dependency } from './dependencies.mjs';
import { APPLE_ROOTS_DER_BASE64 } from '../../functions/flapfit-apple-consent/apple-roots.ts';

const { X509, KEYUTIL, hextopem } = dependency('jsrsasign');
const { SignedDataVerifier, Environment } = dependency('@apple/app-store-server-library');
const source = readFileSync(new URL('../../functions/flapfit-apple-consent/crypto-compat.ts', import.meta.url), 'utf8');
const executable = stripTypeScriptTypes(source.replace(/^import .+;\r?\n/gm, ''), { mode: 'transform' });
const roots = APPLE_ROOTS_DER_BASE64.map(value => Buffer.from(value, 'base64'));
const fixtureSource = readFileSync(dependency.resolve('@apple/app-store-server-library/dist/tests/unit-tests/jws_verification.test.js'), 'utf8');
const fixture = (name) => Buffer.from(new RegExp(`const ${name} = "([^"]+)"`).exec(fixtureSource)[1], 'base64');

function compatible(runtime = '2.1.4', createPublicKey = crypto.createPublicKey) {
  // Scope all mutable built-ins to this test context; no process-wide monkey patch.
  const scopedCrypto = { ...crypto, createPublicKey };
  vm.runInNewContext(executable, { crypto: scopedCrypto, Buffer, X509, KEYUTIL, hextopem, Deno: { version: { deno: runtime } } });
  return scopedCrypto;
}

test('newer runtimes retain native certificate and key APIs', () => {
  const result = compatible('2.9.6');
  assert.equal(result.X509Certificate, crypto.X509Certificate);
  assert.equal(result.createPublicKey, crypto.createPublicKey);
});

test('compatibility preserves public roots, native metadata and immutable DER copies', () => {
  const result = compatible();
  for (const bytes of roots) {
    const expected = new crypto.X509Certificate(bytes);
    const actual = new result.X509Certificate(bytes);
    assert.deepEqual(actual.raw, expected.raw);
    assert.equal(new crypto.X509Certificate(actual.toString()).fingerprint256, expected.fingerprint256);
    for (const key of ['ca','subject','issuer','validFrom','validTo']) assert.equal(actual[key], expected[key]);
    assert.equal(actual.verify(expected.publicKey), true);
    actual.raw.fill(0);
    assert.deepEqual(actual.raw, expected.raw);
  }
});

test('tampered certificate signatures and unrelated issuer keys reject', () => {
  const result = compatible();
  const changed = Buffer.from(roots[1]); changed[changed.length - 1] ^= 1;
  const actual = new result.X509Certificate(changed);
  assert.equal(actual.verify(new crypto.X509Certificate(roots[1]).publicKey), false);
  assert.equal(new result.X509Certificate(roots[1]).verify(new crypto.X509Certificate(roots[0]).publicKey), false);
  assert.throws(() => new result.X509Certificate(Buffer.from('not a certificate')));
});

test('AIA endpoints match native parsing without dropping the OCSP responder', () => {
  const bytes = fixture('REAL_APPLE_SIGNING_CERTIFICATE_BASE64_ENCODED');
  const expected = new crypto.X509Certificate(bytes);
  const actual = new (compatible().X509Certificate)(bytes);
  assert.deepEqual(actual.infoAccess.split('\n').sort(), expected.infoAccess.split('\n').sort());
});

test('Deno curve aliases normalize only when the actual JWK curve agrees', () => {
  const bytes = fixture('LEAF_CERT_BASE64_ENCODED');
  const pem = new crypto.X509Certificate(bytes).publicKey.export({ format:'pem', type:'spki' });
  const withAlias = (alias) => () => {
    const key = crypto.createPublicKey(pem);
    Object.defineProperty(key, 'asymmetricKeyDetails', { value: { namedCurve: alias }, configurable: true });
    return key;
  };
  const repaired = compatible('2.1.4', withAlias('p256')).createPublicKey(pem);
  assert.equal(repaired.asymmetricKeyDetails.namedCurve, 'prime256v1');
  assert.equal(repaired.export({ format: 'jwk' }).crv, 'P-256');
  assert.throws(() => compatible('2.1.4', withAlias('p384')).createPublicKey(pem), /Curve metadata mismatch/);
});

test('actual Apple verifier retains chain, validity and required-OID rejection', async () => {
  const { X509Certificate } = compatible();
  const root = fixture('ROOT_CA_BASE64_ENCODED');
  const verifier = new SignedDataVerifier([root], false, Environment.PRODUCTION, 'com.example', 1234);
  const check = (leaf, intermediate, date = new Date('2026-09-19T00:00:00Z'), trust = [new X509Certificate(root)]) =>
    verifier.verifyCertificateChainWithoutCaching(trust, new X509Certificate(fixture(leaf)), new X509Certificate(fixture(intermediate)), date);
  await check('LEAF_CERT_BASE64_ENCODED','INTERMEDIATE_CA_BASE64_ENCODED');
  await assert.rejects(check('LEAF_CERT_INVALID_OID_BASE64_ENCODED','INTERMEDIATE_CA_BASE64_ENCODED'));
  await assert.rejects(check('LEAF_CERT_FOR_INTERMEDIATE_CA_INVALID_OID_BASE64_ENCODED','INTERMEDIATE_CA_INVALID_OID_BASE64_ENCODED'));
  await assert.rejects(check('LEAF_CERT_BASE64_ENCODED','INTERMEDIATE_CA_BASE64_ENCODED',new Date('2040-01-01T00:00:00Z')));
  await assert.rejects(check('LEAF_CERT_BASE64_ENCODED','INTERMEDIATE_CA_BASE64_ENCODED',new Date('2026-09-19T00:00:00Z'),[]));
});

test('hosted Supabase compatibility-version string enables the same adapter', () => {
  const result = compatible('supabase-edge-runtime-1.76.0 (compatible with Deno v2.1.4)');
  assert.notEqual(result.X509Certificate, crypto.X509Certificate);
  assert.equal(new result.X509Certificate(roots[1]).verify(new crypto.X509Certificate(roots[1]).publicKey), true);
});
