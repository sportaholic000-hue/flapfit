-- Owner-requested removal of result attestation. Restore the previous request
-- pattern and server-only scoring RPCs; keep unique names and timing checks.
-- This intentionally supersedes the prior no-rollback recommendation.
drop function public.finalize_attested_game_run(uuid,uuid,text,integer,integer,text,text,text,bigint,text);
drop function public.begin_attested_game_run(uuid,text,text,text,text,text);
drop function public.register_game_integrity_key(uuid,text,text,text);
drop function public.game_integrity_challenge(uuid,text,text);
alter function public.finalize_game_run_internal(uuid,uuid,text,integer,integer,text,text) rename to finalize_game_run;
revoke all on function public.finalize_game_run(uuid,uuid,text,integer,integer,text,text) from public,anon,authenticated;
revoke all on function public.begin_game_run(uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.finalize_game_run(uuid,uuid,text,integer,integer,text,text) to service_role;
grant execute on function public.begin_game_run(uuid,text,text,text,text) to service_role;
alter table public.game_runs drop column integrity_key_id;
alter table public.game_runs drop column integrity_nonce;
alter table public.game_runs drop column assertion_hash;
drop table public.game_integrity_challenges;
drop table public.game_integrity_keys;
