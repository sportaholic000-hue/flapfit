import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dependency } from './dependencies.mjs';
const { PGlite } = dependency('@electric-sql/pglite');
const migration = await readFile(new URL('../../migrations/20260919185246_apple_consent_rescission.sql', import.meta.url), 'utf8');
const HASH = 'a'.repeat(64);
const USER = '10000000-0000-4000-8000-000000000001';
const EVENT = '20000000-0000-4000-8000-000000000001';
const DATE = '2026-09-19T12:00:00Z';
async function database() {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    insert into auth.users(id) values ('${USER}');`);
  await db.exec(migration);
  return db;
}
async function asService(db, sql, params = []) {
  await db.exec('set role service_role');
  try { return await db.query(sql, params); }
  finally { await db.exec('reset role'); }
}
const record = (db, event = EVENT, hash = HASH) => asService(db,
  'select public.record_apple_consent_revocation($1,$2,$3,$4)', [event, hash, 'Production', DATE]);
test('SQL: record UUID idempotently, reject mismatched replay, preserve original denial', async () => {
  const db = await database();
  try {
    await record(db);
    await record(db);
    assert.equal((await db.query('select count(*)::int as n from flapfit_private.apple_consent_notifications')).rows[0].n, 1);
    assert.equal((await db.query('select count(*)::int as n from flapfit_private.apple_consent_revocations')).rows[0].n, 1);
    await assert.rejects(record(db, EVENT, 'b'.repeat(64)), /Notification conflict/);
    assert.equal((await asService(db, 'select public.apple_consent_is_revoked($1) as denied', [HASH])).rows[0].denied, true);
    assert.equal((await asService(db, 'select public.apple_consent_is_revoked($1) as denied', ['b'.repeat(64)])).rows[0].denied, false);
  } finally { await db.close(); }
});
test('SQL: failed denial write rolls back notification UUID, permitting safe retry', async () => {
  const db = await database();
  try {
    await db.exec('revoke insert on flapfit_private.apple_consent_revocations from service_role');
    await assert.rejects(record(db), /permission denied/);
    assert.equal((await db.query('select count(*)::int as n from flapfit_private.apple_consent_notifications')).rows[0].n, 0);
    await db.exec('grant insert on flapfit_private.apple_consent_revocations to service_role');
    await record(db);
    assert.equal((await db.query('select count(*)::int as n from flapfit_private.apple_consent_revocations')).rows[0].n, 1);
  } finally { await db.close(); }
});
test('SQL: link before/after revocation sees denial; deletion removes only identity mapping', async () => {
  const db = await database();
  try {
    assert.equal((await asService(db, 'select public.link_apple_consent_identity($1,$2) as denied', [HASH, USER])).rows[0].denied, false);
    await record(db);
    assert.equal((await asService(db, 'select public.apple_consent_user_is_revoked($1,$2) as denied', [USER, 'Production'])).rows[0].denied, true);
    assert.equal((await asService(db, 'select public.apple_consent_user_is_revoked($1,$2) as denied', [USER, 'Sandbox'])).rows[0].denied, false);
    assert.equal((await asService(db, 'select public.link_apple_consent_identity($1,$2) as denied', [HASH, USER])).rows[0].denied, true);
    await db.query('delete from auth.users where id=$1', [USER]);
    assert.equal((await db.query('select count(*)::int as n from flapfit_private.apple_consent_identities')).rows[0].n, 0);
    assert.equal((await asService(db, 'select public.apple_consent_is_revoked($1) as denied', [HASH])).rows[0].denied, true);
    await assert.rejects(asService(db, 'select public.link_apple_consent_identity($1,$2)', [HASH, USER]), /foreign key/);
  } finally { await db.close(); }
});
test('SQL: anonymous/authenticated cannot read mappings or invoke service RPCs; service cannot clear denial', async () => {
  const db = await database();
  try {
    await record(db);
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`set role ${role}`);
      await assert.rejects(db.query('select * from flapfit_private.apple_consent_identities'), /permission denied/);
      await assert.rejects(db.query('select public.apple_consent_is_revoked($1)', [HASH]), /permission denied/);
      await assert.rejects(db.query('select public.link_apple_consent_identity($1,$2)', [HASH, USER]), /permission denied/);
      await db.exec('reset role');
    }
    await assert.rejects(asService(db, 'delete from flapfit_private.apple_consent_revocations'), /permission denied/);
    await assert.rejects(asService(db, 'update flapfit_private.apple_consent_revocations set signed_at=now()'), /permission denied/);
    const rows = (await db.query("select relrowsecurity from pg_class where relnamespace='flapfit_private'::regnamespace and relkind='r'")).rows;
    assert.equal(rows.length, 3);
    assert.ok(rows.every((row) => row.relrowsecurity));
  } finally { await db.close(); }
});
