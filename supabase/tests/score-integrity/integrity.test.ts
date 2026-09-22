import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import crypto from 'node:crypto';
import cbor from 'cbor';
import { attestKey, resultPayload, verifyResult } from '../../functions/flapfit-game/integrity.ts';
import production from './fixtures/attestation-production.json' with { type:'json' };
import development from './fixtures/attestation-development.json' with { type:'json' };

const example={teamIdentifier:'V8H6LQ9448',bundleIdentifier:'io.uebelacker.AppAttestExample'};
const oldDate=Date.parse('2024-02-08T00:00:00Z');
const realAssertion='omlzaWduYXR1cmVYRzBFAiBB8BGAwkmFCg1M5J0mOYEun0SUN1/lse79/7ypG9WiMQIhAIHvqj7eg59B1PMFX1CN4GMGlsgfFtdL30pHCf7G/dNRcWF1dGhlbnRpY2F0b3JEYXRhWCXKPdw7T3iujcFZbHVrHX0mDSMrNms5PzEbrFbQPRA6rEAAAAAB';
const realPublicKey='-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEg69t2YzgcPTLUx8Zgu+rbcikeaEL\n8Ppb+HG0QTIulz8YUB9tgv1pDRruWk87nZC3our56pzIWaqXEbaWyamdzA==\n-----END PUBLIC KEY-----\n';
const realPayload='{"subject":"Lorem ipsum","message":"Lorem ipsum dolor sit amet, consectetur adipiscing elit."}';
const pair=crypto.generateKeyPairSync('ec',{namedCurve:'prime256v1'});
const publicKey=pair.publicKey.export({format:'pem',type:'spki'}).toString();
const run='10000000-0000-4000-8000-000000000001',nonce='a'.repeat(64);
const payload=resultPayload(run,nonce,5,10000);
async function signed({counter=1,app='KM48R8T97P.com.flapfit.game',category=undefined as number|undefined,build='5'}={}) {
  const data=Buffer.alloc(37); crypto.createHash('sha256').update(app).digest().copy(data);
  data.writeUInt32BE(counter,33); data[32]=0x40;
  let auth=data;
  if(category!==undefined){
    data[32]|=0x80; const value=Buffer.alloc(4);value.writeUInt32LE(category);
    auth=Buffer.concat([data,await cbor.encodeAsync({apple_validation_category_01:value,apple_bundle_version_01:build})]);
  }
  const hash=crypto.createHash('sha256').update(payload).digest();
  const digest=crypto.createHash('sha256').update(Buffer.concat([auth,hash])).digest();
  return (await cbor.encodeAsync({signature:crypto.sign('sha256',digest,pair.privateKey),authenticatorData:auth})).toString('base64');
}
Deno.test('real Apple production attestation validates at issuance; another App ID does not',()=>{
  assert.equal(attestKey(production.keyId,production.attestation,Buffer.from(production.challenge,'base64'),oldDate,example).environment,'production');
  assert.throws(()=>attestKey(production.keyId,production.attestation,Buffer.from(production.challenge,'base64'),oldDate),/appId/);
});
Deno.test('real Apple assertion validates; unsigned, wrong-app and modified-payload submissions fail',()=>{
  assert.equal(verifyResult(realAssertion,realPublicKey,realPayload,example).counter,1);
  assert.throws(()=>verifyResult(realAssertion,realPublicKey,realPayload));
  assert.throws(()=>verifyResult(realAssertion,realPublicKey,realPayload+' ',example),/signature/);
  assert.throws(()=>verifyResult(undefined,realPublicKey,realPayload,example));
});
Deno.test('expired, wrong-challenge and development attestations fail closed',()=>{
  assert.throws(()=>attestKey(production.keyId,production.attestation,Buffer.from(production.challenge,'base64'),Date.now(),example),/Expired/);
  assert.throws(()=>attestKey(production.keyId,production.attestation,'invented',oldDate,example),/nonce/);
  assert.throws(()=>attestKey(development.keyId,development.attestation,Buffer.from(development.challenge,'base64'),oldDate,example),/development/);
});
Deno.test('certificate substitution or signature corruption cannot register a key',async()=>{
  const value=cbor.decodeFirstSync(Buffer.from(production.attestation,'base64'));
  value.attStmt.x5c[0][value.attStmt.x5c[0].length-1]^=1;
  const corrupted = (await cbor.encodeAsync(value)).toString('base64');
  assert.throws(()=>attestKey(production.keyId,corrupted,Buffer.from(production.challenge,'base64'),oldDate,example));
});
Deno.test('signed FlapFit score cannot be changed, moved to another run, or assigned another nonce',async()=>{
  const proof=await signed(); assert.equal(verifyResult(proof,publicKey,payload).counter,1);
  for(const changed of [resultPayload(run,nonce,500,10000),resultPayload(run,nonce,5,20000),resultPayload(run.replace(/1$/,'2'),nonce,5,10000),resultPayload(run,'b'.repeat(64),5,10000)])
    assert.throws(()=>verifyResult(proof,publicKey,changed),/signature/);
  const other=crypto.generateKeyPairSync('ec',{namedCurve:'prime256v1'}).publicKey.export({format:'pem',type:'spki'}).toString();
  assert.throws(()=>verifyResult(proof,other,payload),/signature/);
});
Deno.test('iOS 27 distribution signals reject re-signed/development/unknown apps',async()=>{
  for(const category of [2,4,5]) assert.equal(verifyResult(await signed({category}),publicKey,payload).counter,1);
  for(const category of [0,1,3,6,99]) { const proof=await signed({category}); assert.throws(()=>verifyResult(proof,publicKey,payload),/distribution/); }
  const invalidBuild=await signed({category:4,build:'invalid'}); assert.throws(()=>verifyResult(invalidBuild,publicKey,payload),/build/);
});
Deno.test('wrong RP ID, zero counter, trailing CBOR items and oversized proofs fail',async()=>{
  const wrongApp=await signed({app:'other.app'}); assert.throws(()=>verifyResult(wrongApp,publicKey,payload),/appId/);
  const zero=await signed({counter:0}); assert.throws(()=>verifyResult(zero,publicKey,payload),/counter/);
  const trailing=Buffer.concat([Buffer.from(await signed(),'base64'),Buffer.from([0])]).toString('base64');
  assert.throws(()=>verifyResult(trailing,publicKey,payload));
  assert.throws(()=>verifyResult(Buffer.alloc(2049).toString('base64'),publicKey,payload));
});
