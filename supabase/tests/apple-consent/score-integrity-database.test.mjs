import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dependency } from './dependencies.mjs';
const { PGlite } = dependency('@electric-sql/pglite');
const owner='10000000-0000-4000-8000-000000000001';
const other='10000000-0000-4000-8000-000000000002';
const key='a'.repeat(43)+'=';
const nonce='b'.repeat(64);
const rules='2026-09-16.1';

test('attested scores: real PostgreSQL registration, grants, replay and atomic publication', async t => {
  const db=new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key);
      create schema cron; create table cron.job(id integer); create table cron.job_run_details(end_time timestamptz);
      create function cron.schedule(text,text,text) returns bigint language sql as 'select 1::bigint';
      insert into auth.users values ('${owner}'),('${other}');`);
    for(const name of ['202609140001_flapfit_competition.sql','202609140002_flapfit_retention.sql',
      '202609140003_flapfit_advisor_hardening.sql','202609150001_verified_game_runs.sql',
      '202609150002_fix_challenge_run_lookup.sql','202609160001_enforce_run_timing.sql',
      '20260922042503_unique_player_names.sql','20260922050821_attest_leaderboard_results.sql']) {
      const sql=await readFile(new URL('../../migrations/'+name,import.meta.url),'utf8');
      await db.exec(sql.replace(/^create extension if not exists (?:pgcrypto|pg_cron)(?: with schema pg_catalog)?;\r?\n/gm,''));
    }
    const begin=async(user=owner,k=key)=>(await db.query('select * from begin_attested_game_run($1,$2,$3,\'leaderboard\',\'pushups\',$4)',[user,k,nonce,rules])).rows[0].run_id;
    const finalize=(id,counter,hash='c'.repeat(64),score=1,user=owner,name='Player')=>db.query(
      'select * from finalize_attested_game_run($1,$2,$3,$4,2000,\'2026-09-14\',$5,$6,$7,$8)',[id,user,name,score,rules,key,counter,hash]);
    const count=async()=>(await db.query('select count(*)::int n from leaderboard_scores')).rows[0].n;
    const counter=async()=>(await db.query('select sign_count from game_integrity_keys where key_id=$1',[key])).rows[0].sign_count;
    await t.test('unregistered key cannot start an eligible run; enrollment challenge is owner-bound, expiring and single-use',async()=>{
      await assert.rejects(begin(),/integrity/i);
      await db.exec('set role service_role');
      await db.query('select * from game_integrity_challenge($1,$2,$3)',[owner,key,nonce]);
      await assert.rejects(db.query('select register_game_integrity_key($1,$2,$3,\'test key\')',[other,key,nonce]),/expired|match/i);
      await assert.rejects(db.query('select register_game_integrity_key($1,$2,$3,\'test key\')',[owner,key,'d'.repeat(64)]),/expired|match/i);
      await db.query('select register_game_integrity_key($1,$2,$3,\'test key\')',[owner,key,nonce]);
      assert.equal((await db.query('select count(*)::int n from game_integrity_challenges')).rows[0].n,0);
      await db.query('select register_game_integrity_key($1,$2,$3,\'test key\')',[owner,key,nonce]); // Lost acknowledgment.
      await assert.rejects(begin(other),/integrity/i);
      await begin();
      await db.exec('reset role');
    });
    await t.test('clients cannot access integrity tables or call any score-writing RPC, including the old bypass',async()=>{
      assert.equal((await db.query("select count(*)::int n from pg_class where relname in ('game_integrity_keys','game_integrity_challenges','game_runs') and relrowsecurity")).rows[0].n,3);
      for(const role of ['anon','authenticated','service_role']) {
        await db.exec('set role '+role);
        await assert.rejects(db.query('select * from finalize_game_run_internal($1,$2,\'Player\',1,2000,\'2026-09-14\',$3)',[owner,owner,rules]),/permission denied/i);
        if(role!=='service_role') {
          await assert.rejects(begin(),/permission denied/i);
          await assert.rejects(db.query('select * from game_integrity_keys'),/permission denied/i);
          await assert.rejects(finalize(owner,1),/permission denied/i);
          await assert.rejects(db.query('select register_game_integrity_key($1,$2,$3,\'fake\')',[owner,key,nonce]),/permission denied/i);
        }
        await db.exec('reset role');
      }
      await assert.rejects(db.query('select * from finalize_game_run($1,$2,\'Player\',1,2000,\'2026-09-14\',$3)',[owner,owner,rules]),/does not exist/i);
    });
    await t.test('counter, score and proof receipt commit together; exact retry works after a newer result',async()=>{
      const first=await begin();
      await db.exec('set role service_role');
      assert.equal((await finalize(first,1)).rows[0].improved,true);
      await db.exec('reset role');
      assert.equal(Number(await counter()),1);
      const second=await begin();
      await finalize(second,2,'d'.repeat(64));
      assert.equal((await finalize(first,1)).rows[0].improved,false);
      await assert.rejects(finalize(first,1,'e'.repeat(64)),/already finalized/i);
      await assert.rejects(finalize(first,1,'c'.repeat(64),2),/already finalized/i);
      assert.equal(await count(),1);
    });
    await t.test('another owner, repeated counter, missing proof and impossible score are rejected without consuming counters',async()=>{
      const id=await begin();
      await assert.rejects(finalize(id,3,'e'.repeat(64),1,other),/integrity/i);
      await assert.rejects(finalize(id,2),/counter/i);
      await assert.rejects(finalize(id,3,null),/proof/i);
      await assert.rejects(finalize(id,3,'e'.repeat(64),900),/implausible/i);
      assert.equal(Number(await counter()),2);
      assert.equal((await db.query('select finalized_at from game_runs where id=$1',[id])).rows[0].finalized_at,null);
    });
    await t.test('name collision rolls back the counter; correction can publish the same signed score',async()=>{
      await db.query("insert into profiles(user_id,player_name,terms_version,terms_accepted_at) values($1,'Taken','2026-09-14',now())",[other]);
      const id=await begin();
      await assert.rejects(finalize(id,3,'e'.repeat(64),1,owner,'TAKEN'),e=>e.code==='23505');
      assert.equal(Number(await counter()),2);
      await finalize(id,3,'e'.repeat(64),1,owner,'Available');
      assert.equal(Number(await counter()),3);
    });
    await t.test('expired and legacy unsigned runs cannot publish; deletion cascades integrity records',async()=>{
      const expired=await begin();
      await db.query("update game_runs set started_at=now()-interval '8 hours',expires_at=now()-interval '1 hour' where id=$1",[expired]);
      await assert.rejects(finalize(expired,4),/expired/i);
      const old=(await db.query("select * from begin_game_run($1,'leaderboard','pushups',null,$2)",[owner,rules])).rows[0].run_id;
      await assert.rejects(finalize(old,4),/proof/i);
      await db.query('select * from game_integrity_challenge($1,$2,$3)',[owner,'d'.repeat(43)+'=',nonce]);
      await db.query('delete from auth.users where id=$1',[owner]);
      for(const table of ['game_integrity_keys','game_integrity_challenges','game_runs','leaderboard_scores'])
        assert.equal((await db.query('select count(*)::int n from '+table)).rows[0].n,0);
    });
  } finally { await db.close(); }
});
