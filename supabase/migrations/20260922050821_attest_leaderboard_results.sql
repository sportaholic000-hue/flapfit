-- A guest JWT and plausible elapsed time are not proof of a real app run.
-- Only the Edge verifier may register Apple keys and publish signed results.
create table public.game_integrity_keys (
  key_id text primary key check (length(key_id) = 44),
  user_id uuid not null references auth.users(id) on delete cascade,
  public_key text not null,
  sign_count bigint not null default 0 check (sign_count between 0 and 4294967295),
  created_at timestamptz not null default now()
);
create index game_integrity_keys_user_idx on public.game_integrity_keys(user_id);
create table public.game_integrity_challenges (
  user_id uuid primary key references auth.users(id) on delete cascade,
  key_id text not null,
  nonce text not null,
  expires_at timestamptz not null default (now() + interval '15 minutes')
);
alter table public.game_integrity_keys enable row level security;
alter table public.game_integrity_challenges enable row level security;
revoke all on public.game_integrity_keys, public.game_integrity_challenges from public, anon, authenticated;
grant select, insert, update, delete on public.game_integrity_keys, public.game_integrity_challenges to service_role;

alter table public.game_runs add column integrity_key_id text references public.game_integrity_keys(key_id);
alter table public.game_runs add column integrity_nonce text;
alter table public.game_runs add column assertion_hash text;
create index game_runs_integrity_key_idx on public.game_runs(integrity_key_id);

create function public.game_integrity_challenge(p_user_id uuid, p_key_id text, p_nonce text)
returns table(nonce text, expires_at timestamptz)
language plpgsql security invoker set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 518832));
  if p_key_id is null or length(p_key_id) <> 44 or p_nonce is null or p_nonce !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid integrity challenge.';
  end if;
  if (select count(*) from public.game_integrity_keys where user_id=p_user_id and created_at > now()-interval '1 day') >= 10 then
    raise exception 'Integrity registration limit reached.';
  end if;
  insert into public.game_integrity_challenges(user_id,key_id,nonce) values(p_user_id,p_key_id,p_nonce)
    on conflict(user_id) do update set key_id=excluded.key_id,nonce=excluded.nonce,expires_at=excluded.expires_at
    where game_integrity_challenges.expires_at <= now() or game_integrity_challenges.key_id <> p_key_id;
  return query select c.nonce,c.expires_at from public.game_integrity_challenges c where c.user_id=p_user_id;
end;
$$;

create function public.register_game_integrity_key(p_user_id uuid, p_key_id text, p_nonce text, p_public_key text)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 518832));
  if exists(select 1 from public.game_integrity_keys where key_id=p_key_id and user_id=p_user_id and public_key=p_public_key) then return; end if;
  if not exists(select 1 from public.game_integrity_challenges where user_id=p_user_id and key_id=p_key_id and nonce=p_nonce and expires_at>now()) then
    raise exception 'Integrity challenge expired or does not match.';
  end if;
  insert into public.game_integrity_keys(key_id,user_id,public_key) values(p_key_id,p_user_id,p_public_key);
  delete from public.game_integrity_challenges where user_id=p_user_id;
end;
$$;

-- Keep the proven scoring/timing transaction private to the attested wrapper.
-- An old API deployment cannot continue accepting unsigned scores after this migration.
alter function public.finalize_game_run(uuid,uuid,text,integer,integer,text,text) rename to finalize_game_run_internal;
revoke all on function public.finalize_game_run_internal(uuid,uuid,text,integer,integer,text,text) from public,anon,authenticated,service_role;
revoke all on function public.begin_game_run(uuid,text,text,text,text) from service_role;

create function public.begin_attested_game_run(p_user_id uuid,p_key_id text,p_nonce text,p_kind text,p_exercise text,p_rules_version text)
returns table(run_id uuid,expires_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare result record;
begin
  if not exists(select 1 from public.game_integrity_keys where key_id=p_key_id and user_id=p_user_id) then
    raise exception 'App integrity verification required.';
  end if;
  if p_nonce is null or p_nonce !~ '^[a-f0-9]{64}$' or p_kind <> 'leaderboard' then raise exception 'Invalid integrity run.'; end if;
  select * into result from public.begin_game_run(p_user_id,p_kind,p_exercise,null,p_rules_version);
  update public.game_runs set integrity_key_id=p_key_id,integrity_nonce=p_nonce where id=result.run_id;
  return query select result.run_id::uuid,result.expires_at::timestamptz;
end;
$$;

create function public.finalize_attested_game_run(
  p_run_id uuid,p_user_id uuid,p_player_name text,p_score integer,p_duration_ms integer,
  p_terms_version text,p_rules_version text,p_key_id text,p_counter bigint,p_assertion_hash text
) returns table(improved boolean,result_kind text,exercise_name text,challenge_code text)
language plpgsql security definer set search_path = '' as $$
declare selected_run public.game_runs%rowtype; previous_counter bigint;
begin
  -- Lock in a consistent order across all runs signed by the same key.
  select sign_count into previous_counter from public.game_integrity_keys
    where key_id=p_key_id and user_id=p_user_id for update;
  if not found then raise exception 'App integrity verification required.'; end if;
  select * into selected_run from public.game_runs where id=p_run_id and user_id=p_user_id for update;
  if not found then raise exception 'Game run not found.'; end if;
  if selected_run.integrity_key_id is distinct from p_key_id or selected_run.integrity_nonce is null or
     p_assertion_hash is null or p_assertion_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'App integrity proof does not match the run.';
  end if;
  if selected_run.finalized_at is not null then
    if selected_run.assertion_hash is distinct from p_assertion_hash or
       selected_run.final_score is distinct from p_score or selected_run.duration_ms is distinct from p_duration_ms then
      raise exception 'Game run was already finalized.';
    end if;
    return query select * from public.finalize_game_run_internal(p_run_id,p_user_id,p_player_name,p_score,p_duration_ms,p_terms_version,p_rules_version);
    return;
  end if;
  if p_counter is null or p_counter <= previous_counter or p_counter > 4294967295 then raise exception 'App integrity counter does not match.'; end if;
  -- Counter advancement, score publication and proof receipt commit together.
  -- Any name collision/timing failure rolls everything back so the same proof can retry.
  return query select * from public.finalize_game_run_internal(p_run_id,p_user_id,p_player_name,p_score,p_duration_ms,p_terms_version,p_rules_version);
  update public.game_integrity_keys set sign_count=p_counter where key_id=p_key_id;
  update public.game_runs set assertion_hash=p_assertion_hash where id=p_run_id;
end;
$$;

revoke all on function public.game_integrity_challenge(uuid,text,text) from public,anon,authenticated;
revoke all on function public.register_game_integrity_key(uuid,text,text,text) from public,anon,authenticated;
revoke all on function public.begin_attested_game_run(uuid,text,text,text,text,text) from public,anon,authenticated;
revoke all on function public.finalize_attested_game_run(uuid,uuid,text,integer,integer,text,text,text,bigint,text) from public,anon,authenticated;
grant execute on function public.game_integrity_challenge(uuid,text,text) to service_role;
grant execute on function public.register_game_integrity_key(uuid,text,text,text) to service_role;
grant execute on function public.begin_attested_game_run(uuid,text,text,text,text,text) to service_role;
grant execute on function public.finalize_attested_game_run(uuid,uuid,text,integer,integer,text,text,text,bigint,text) to service_role;
