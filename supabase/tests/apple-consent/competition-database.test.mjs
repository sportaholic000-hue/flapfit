import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dependency } from './dependencies.mjs';
const { PGlite } = dependency('@electric-sql/pglite');
const OWNER = '10000000-0000-4000-8000-000000000011';
const OTHER = '10000000-0000-4000-8000-000000000012';
const RULES = '2026-09-16.1';
const migrations = [
  '202609140001_flapfit_competition.sql', '202609140002_flapfit_retention.sql',
  '202609140003_flapfit_advisor_hardening.sql', '202609150001_verified_game_runs.sql',
  '202609150002_fix_challenge_run_lookup.sql', '202609150003_index_game_run_challenges.sql',
  '202609160001_enforce_run_timing.sql', '20260917072007_bind_challenges_to_exercise.sql',
];
async function database(uniqueNames = true) {
  const db = new PGlite();
  // Hosted Auth and the cron scheduler are boundaries, not simulated providers.
  // PostgreSQL tables, grants, functions, constraints and triggers below are real.
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create schema cron; create table cron.job(id integer); create table cron.job_run_details(end_time timestamptz);
    create function cron.schedule(text,text,text) returns bigint language sql as 'select 1::bigint';
    insert into auth.users values ('${OWNER}'),('${OTHER}');`);
  for (const name of migrations) {
    const sql = await readFile(new URL('../../migrations/' + name, import.meta.url), 'utf8');
    await db.exec(sql.replace(/^create extension if not exists (?:pgcrypto|pg_cron)(?: with schema pg_catalog)?;\r?\n/gm, ''));
  }
  if (uniqueNames) await db.exec(await readFile(new URL('../../migrations/20260922042503_unique_player_names.sql', import.meta.url), 'utf8'));
  return db;
}
async function begin(db, user = OWNER) {
  return (await db.query("select * from public.begin_game_run($1,'leaderboard','pushups',null,$2)", [user, RULES])).rows[0].run_id;
}
const finalize = (db, id, user = OWNER, score = 1, duration = 2000) => db.query(
  "select * from public.finalize_game_run($1,$2,'Player',$3,$4,'2026-09-14',$5)", [id,user,score,duration,RULES]);

const claimName = (db, user, name) => db.query(`
  insert into public.profiles(user_id,player_name,terms_version,terms_accepted_at)
  values ($1,$2,'2026-09-14',now()) on conflict(user_id) do update set player_name=excluded.player_name`, [user,name]);
const nameConflict = error => error.code === '23505' && error.constraint === 'profiles_player_name_key';

test('reproduces duplicate names on the previous schema; migration refuses collisions without changing profiles', async () => {
  const db = await database(false);
  try {
    await claimName(db, OWNER, 'Codex'); await claimName(db, OTHER, ' codex ');
    const before = (await db.query('select user_id,player_name from profiles order by user_id')).rows;
    assert.equal(before.length,2);
    const migration = await readFile(new URL('../../migrations/20260922042503_unique_player_names.sql', import.meta.url), 'utf8');
    await assert.rejects(db.exec(migration), error => error.code === '23505');
    assert.deepEqual((await db.query('select user_id,player_name from profiles order by user_id')).rows,before);
  } finally { await db.close(); }
});

test('names are unique across capitalization, repeated whitespace and Unicode compatibility forms', async () => {
  const db = await database();
  try {
    await claimName(db, OWNER, 'Jay Bird');
    for (const name of ['Jay Bird','jay bird','  JAY   BIRD  ','Ｊａｙ Ｂｉｒｄ','Jay\u00a0Bird']) {
      await assert.rejects(claimName(db,OTHER,name), nameConflict);
    }
    await claimName(db, OWNER, 'Élan');
    await assert.rejects(claimName(db,OTHER,'élan'),nameConflict);
    await assert.rejects(claimName(db,OTHER,'E\u0301lan'),nameConflict);
    await claimName(db, OTHER, 'Other Player');
    await assert.rejects(claimName(db,OTHER,'Élan'),nameConflict);
    assert.equal((await db.query('select player_name from profiles where user_id=$1',[OTHER])).rows[0].player_name,'Other Player');
  } finally { await db.close(); }
});

test('two queued claims have exactly one owner; the owner can retain or change capitalization', async () => {
  const db = await database();
  try {
    const results = await Promise.allSettled([claimName(db,OWNER,'Codex'),claimName(db,OTHER,'CODEX')]);
    assert.equal(results.filter(result=>result.status==='fulfilled').length,1);
    assert.equal(results.filter(result=>result.status==='rejected' && nameConflict(result.reason)).length,1);
    const owner = (await db.query('select user_id from profiles')).rows[0].user_id;
    await claimName(db,owner,'cOdEx');
    assert.equal((await db.query('select count(*)::int n from profiles')).rows[0].n,1);
  } finally { await db.close(); }
});

test('a conflicting finalization rolls back the score and leaves the same run retryable under a free name', async () => {
  const db = await database();
  try {
    const first = await begin(db); await finalize(db,first);
    const second = await begin(db,OTHER);
    await assert.rejects(finalize(db,second,OTHER),nameConflict);
    assert.equal((await db.query('select finalized_at from game_runs where id=$1',[second])).rows[0].finalized_at,null);
    assert.equal((await db.query('select count(*)::int n from leaderboard_scores')).rows[0].n,1);
    await db.query("select * from finalize_game_run($1,$2,'Different Player',1,2000,'2026-09-14',$3)",[second,OTHER,RULES]);
    assert.equal((await db.query('select count(*)::int n from leaderboard_scores')).rows[0].n,2);
  } finally { await db.close(); }
});

test('one player keeps their name across exercises; deleting the profile releases the name', async () => {
  const db = await database();
  try {
    await claimName(db,OWNER,'Player');
    const first=await begin(db); await finalize(db,first);
    const second=(await db.query("select * from begin_game_run($1,'leaderboard','squats',null,$2)",[OWNER,RULES])).rows[0].run_id;
    await finalize(db,second);
    assert.equal((await db.query('select count(*)::int n from leaderboard_scores')).rows[0].n,2);
    await db.query('delete from auth.users where id=$1',[OWNER]);
    await claimName(db,OTHER,'PLAYER');
  } finally { await db.close(); }
});

test('competition SQL rejects another user, conflicting replay, expiry and implausible timing; exact retry is idempotent', async () => {
  const db = await database();
  try {
    const id = await begin(db);
    await assert.rejects(finalize(db,id,OTHER), /not found/i);
    assert.equal((await finalize(db,id)).rows[0].improved,true);
    assert.equal((await finalize(db,id)).rows[0].improved,false);
    await assert.rejects(finalize(db,id,OWNER,2), /already finalized/i);
    const expired = await begin(db);
    await db.query("update public.game_runs set started_at=now()-interval '8 hours',expires_at=now()-interval '1 hour' where id=$1",[expired]);
    await assert.rejects(finalize(db,expired),/expired/i);
    const forged = await begin(db);
    await assert.rejects(finalize(db,forged,OWNER,10,2000),/implausible/i);
    assert.equal((await db.query('select count(*)::int n from public.leaderboard_scores')).rows[0].n,1);
  } finally { await db.close(); }
});

test('competition SQL denies direct client table/RPC access and enforces run cost limits', async () => {
  const db = await database();
  try {
    for (const role of ['anon','authenticated']) {
      await db.exec('set role ' + role);
      await assert.rejects(db.query('select * from public.leaderboard_scores'),/permission denied/i);
      await assert.rejects(begin(db),/permission denied/i);
      await db.exec('reset role');
    }
    for (let i=0;i<30;i++) await begin(db);
    await assert.rejects(begin(db),/run limit/i);
    await db.query("update public.game_runs set started_at=now()-interval '1 hour' where user_id=$1",[OWNER]);
    await db.query("insert into public.game_runs(user_id,run_kind,exercise,rules_version,started_at) select $1,'leaderboard','pushups',$2,now()-interval '1 hour' from generate_series(1,470)",[OWNER,RULES]);
    await assert.rejects(begin(db),/daily game run limit/i);
  } finally { await db.close(); }
});

test('deletion cascades competition records but minimizes retained moderation evidence; retention removes only expired records', async () => {
  const db = await database();
  try {
    const id = await begin(db); await finalize(db,id);
    const context=(await db.query('select id from public.leaderboard_scores')).rows[0].id;
    await db.query('insert into public.player_blocks(blocker_id,blocked_id) values ($1,$2)',[OWNER,OTHER]);
    await db.query("insert into public.content_reports(reporter_id,reported_user_id,context_type,context_id,reason) values ($1,$2,'leaderboard',$3,'cheating')",[OTHER,OWNER,context]);
    await db.query('delete from auth.users where id=$1',[OWNER]);
    for (const table of ['profiles','leaderboard_scores','game_runs','player_blocks']) {
      assert.equal((await db.query(`select count(*)::int n from public.${table}`)).rows[0].n,0);
    }
    const report=(await db.query('select * from public.content_reports')).rows[0];
    assert.equal(report.reported_user_id,null); assert.equal(report.reporter_id,OTHER);
    await db.exec('select public.cleanup_flapfit_retention()');
    assert.equal((await db.query('select count(*)::int n from public.content_reports')).rows[0].n,1);
    await db.exec("update public.content_reports set status='dismissed'; update public.content_reports set resolved_at=now()-interval '181 days'");
    const retained=await begin(db,OTHER), removed=await begin(db,OTHER);
    await db.query("update public.game_runs set started_at=now()-interval '10 days', expires_at=now()-interval '8 days' where id=$1",[removed]);
    await db.exec('select public.cleanup_flapfit_retention()');
    assert.equal((await db.query('select count(*)::int n from public.content_reports')).rows[0].n,0);
    assert.deepEqual((await db.query('select id from public.game_runs')).rows.map(x=>x.id),[retained]);
  } finally { await db.close(); }
});


test('owner-requested attestation removal preserves scores, names and restricted run RPCs', async () => {
  const db = await database();
  try {
    const priorRun = await begin(db); await finalize(db, priorRun);
    const beforeScores = (await db.query('select * from leaderboard_scores order by id')).rows;
    const beforeProfiles = (await db.query('select * from profiles order by user_id')).rows;
    for (const name of ['20260922050821_attest_leaderboard_results.sql','20260922062925_remove_score_attestation.sql']) {
      await db.exec(await readFile(new URL('../../migrations/' + name, import.meta.url), 'utf8'));
    }
    assert.deepEqual((await db.query('select * from leaderboard_scores order by id')).rows, beforeScores);
    assert.deepEqual((await db.query('select * from profiles order by user_id')).rows, beforeProfiles);
    assert.equal((await db.query("select to_regclass('public.game_integrity_keys') as table_name")).rows[0].table_name, null);
    assert.equal((await db.query("select to_regprocedure('public.finalize_attested_game_run(uuid,uuid,text,integer,integer,text,text,text,bigint,text)') as rpc")).rows[0].rpc, null);
    assert.equal((await db.query("select count(*)::int n from information_schema.columns where table_schema='public' and table_name='game_runs' and column_name in ('integrity_key_id','integrity_nonce','assertion_hash')")).rows[0].n, 0);
    for (const role of ['anon','authenticated']) {
      await db.exec('set role '+role);
      await assert.rejects(begin(db), /permission denied/i);
      await assert.rejects(finalize(db,priorRun), /permission denied/i);
      await assert.rejects(db.query("insert into leaderboard_scores(user_id,exercise,score) values ($1,'pushups',999)",[OTHER]), /permission denied/i);
      await db.exec('reset role');
    }
    await db.exec('set role service_role');
    const next = await begin(db);
    assert.equal((await finalize(db,next)).rows[0].result_kind,'leaderboard');
    await assert.rejects(finalize(db,next,OWNER,2), /already finalized/i);
    const impossible = await begin(db);
    await assert.rejects(finalize(db,impossible,OWNER,100000,1), /implausible/i);
    const conflictingRun = await begin(db, OTHER);
    await assert.rejects(finalize(db,conflictingRun,OTHER),nameConflict);
    await db.exec('reset role');
    assert.equal((await db.query('select count(*)::int n from leaderboard_scores')).rows[0].n, 1);
  } finally { await db.close(); }
});


test('single-step submission keeps unique names, ownership grants and best-score retries without run rows', async () => {
  const db=await database();
  try {
    await db.exec(await readFile(new URL('../../migrations/20260922064932_single_step_leaderboard_submission.sql',import.meta.url),'utf8'));
    const submit=(user,name,score,exercise='pushups')=>db.query("select * from submit_leaderboard_score($1,$2,$3,$4,'2026-09-14')",[user,name,exercise,score]);
    for(const role of ['anon','authenticated']) {
      await db.exec('set role '+role);
      await assert.rejects(submit(OWNER,'Player',5),/permission denied/i);
      await assert.rejects(db.query('select * from leaderboard_scores'),/permission denied/i);
      await db.exec('reset role');
    }
    await db.exec('set role service_role');
    await assert.rejects(begin(db),/permission denied/i);
    assert.equal((await submit(OWNER,'Player',5)).rows[0].score,5);
    assert.equal((await submit(OWNER,'Player',5)).rows[0].score,5);
    assert.equal((await submit(OWNER,'Player',2)).rows[0].score,5);
    await assert.rejects(submit(OTHER,'PLAYER',99),nameConflict);
    assert.equal((await submit(OTHER,'Other Player',8)).rows[0].score,8);
    await assert.rejects(submit(OTHER,'Player',100),nameConflict);
    assert.equal((await submit(OWNER,'Player',7,'squats')).rows[0].score,7);
    await assert.rejects(submit(OWNER,'Player',100001),/invalid/i);
    await assert.rejects(submit(OWNER,'Player',3,'invalid'),/invalid/i);
    await db.exec('reset role');
    const scores=(await db.query('select user_id,exercise,score from leaderboard_scores order by user_id,exercise')).rows;
    assert.equal(scores.length,3);
    assert.equal(scores.find(row=>row.user_id===OTHER).score,8);
    assert.equal((await db.query('select player_name from profiles where user_id=$1',[OTHER])).rows[0].player_name,'Other Player');
    assert.equal((await db.query('select count(*)::int n from game_runs')).rows[0].n,0);
    assert.equal((await db.query("select bool_and(relrowsecurity) enabled from pg_class where relname in ('profiles','leaderboard_scores','game_runs')")).rows[0].enabled,true);
  }finally{await db.close();}
});
