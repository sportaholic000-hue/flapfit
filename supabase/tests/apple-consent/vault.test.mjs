import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dependency } from './dependencies.mjs';
const { PGlite } = dependency('@electric-sql/pglite');
const baseMigration = await readFile(new URL('../../migrations/20260919185246_apple_consent_rescission.sql', import.meta.url), 'utf8');
const vaultMigration = await readFile(new URL('../../migrations/20260919194303_apple_consent_vault.sql', import.meta.url), 'utf8');
async function database() {
  const db = new PGlite();
  // Contract fixture only: does not emulate or claim to verify Vault encryption.
  // Actual installed Vault and pgcrypto functions were verified read-only in Supabase.
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create schema extensions;
    create function extensions.gen_random_bytes(integer) returns bytea language sql as
      $$ select decode(repeat('ab', $1), 'hex') $$;
    create schema vault;
    create table vault.secrets(id uuid primary key default gen_random_uuid(),
      name text unique, decrypted_secret text not null, description text);
    create view vault.decrypted_secrets as select name, decrypted_secret from vault.secrets;
    create function vault.create_secret(new_secret text, new_name text, new_description text,
      new_key_id uuid default null) returns uuid language plpgsql as $$
      declare new_id uuid;
      begin
        insert into vault.secrets(name,decrypted_secret,description)
          values(new_name,new_secret,new_description) returning id into new_id;
        return new_id;
      end; $$;
    revoke all on schema vault from public, anon, authenticated, service_role;
  `);
  await db.exec(baseMigration);
  await db.exec(vaultMigration);
  return db;
}
async function service(db, sql, params = []) {
  await db.exec('set role service_role');
  try { return await db.query(sql, params); }
  finally { await db.exec('reset role'); }
}
test('Vault migration creates once, retains existing key, and service RPC exposes only fixed secret', async () => {
  const db = await database();
  try {
    const first = (await db.query("select id from vault.secrets where name='flapfit_apple_consent_hmac_v1'")).rows[0].id;
    await db.exec(vaultMigration);
    const second = (await db.query("select id from vault.secrets where name='flapfit_apple_consent_hmac_v1'")).rows[0].id;
    assert.equal(second, first);
    await db.exec("select vault.create_secret(repeat('cd',32), 'unrelated_secret', 'test only')");
    const result = await service(db, "select public.get_apple_consent_hmac_key() = repeat('ab',32) as correct");
    assert.equal(result.rows[0].correct, true); // Never print a key value.
    await assert.rejects(service(db, 'select * from vault.decrypted_secrets'), /permission denied/);
    await assert.rejects(service(db, "select vault.create_secret('x','another','test')"), /permission denied/);
  } finally { await db.close(); }
});
test('Vault RPC rejects anonymous/authenticated, user subjects, missing and malformed keys', async () => {
  const db = await database();
  try {
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`set role ${role}`);
      await assert.rejects(db.query('select public.get_apple_consent_hmac_key()'), /permission denied/);
      await assert.rejects(db.query('select flapfit_private.read_apple_consent_hmac_key()'), /permission denied/);
      await db.exec('reset role');
    }
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", ['10000000-0000-4000-8000-000000000001']);
    await assert.rejects(service(db, 'select public.get_apple_consent_hmac_key()'), /Service access required/);
    await db.exec("select set_config('request.jwt.claim.sub','',false)");
    await db.exec("update vault.secrets set decrypted_secret='invalid' where name='flapfit_apple_consent_hmac_v1'");
    await assert.rejects(service(db, 'select public.get_apple_consent_hmac_key()'), /key unavailable/);
    await db.exec("delete from vault.secrets where name='flapfit_apple_consent_hmac_v1'");
    await assert.rejects(service(db, 'select public.get_apple_consent_hmac_key()'), /no rows/);
    await db.exec("insert into flapfit_private.apple_consent_revocations(transaction_hash,environment,signed_at) values(repeat('f',64),'Production',now())");
    await assert.rejects(db.exec(vaultMigration), /Restore the existing Apple consent key/);
    assert.equal((await db.query('select count(*)::int as n from vault.secrets')).rows[0].n, 0);
  } finally { await db.close(); }
});
test('Production and Sandbox entrypoints are fixed, and launch game never follows a shared env flag', async () => {
  const production = await readFile(new URL('../../functions/flapfit-apple-consent/index.ts', import.meta.url), 'utf8');
  const sandbox = await readFile(new URL('../../functions/flapfit-apple-consent-sandbox/index.ts', import.meta.url), 'utf8');
  const runtime = await readFile(new URL('../../functions/flapfit-apple-consent/runtime.ts', import.meta.url), 'utf8');
  const game = await readFile(new URL('../../functions/flapfit-game/index.ts', import.meta.url), 'utf8');
  assert.match(production, /serveAppleConsent\('Production'\)/);
  assert.match(sandbox, /serveAppleConsent\('Sandbox'\)/);
  assert.match(game, /const consentEnvironment = 'Production'/);
  assert.doesNotMatch(runtime + game, /Deno\.env\.get\('APPLE_CONSENT_(HASH_KEY|ENVIRONMENT)'\)/);
  assert.match(runtime, /rpc\('get_apple_consent_hmac_key', \{\}\)/);
});
