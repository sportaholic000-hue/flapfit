create table public.game_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  run_kind text not null,
  exercise text not null,
  challenge_id uuid references public.challenges(id) on delete cascade,
  rules_version text not null,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '6 hours'),
  finalized_at timestamptz,
  final_score integer,
  duration_ms integer,
  constraint game_runs_kind_allowed check (run_kind in ('leaderboard', 'challenge')),
  constraint game_runs_exercise_allowed check (
    exercise in ('pushups', 'squats', 'pullups', 'biceps', 'lateralraise', 'shoulderpress')
  ),
  constraint game_runs_challenge_matches_kind check (
    (run_kind = 'challenge' and challenge_id is not null) or
    (run_kind = 'leaderboard' and challenge_id is null)
  ),
  constraint game_runs_expiry_after_start check (expires_at > started_at),
  constraint game_runs_score_range check (final_score is null or final_score between 0 and 100000),
  constraint game_runs_duration_range check (
    duration_ms is null or duration_ms between 0 and 21600000
  )
);

create index game_runs_user_started_idx
  on public.game_runs (user_id, started_at desc);
create index game_runs_expiry_idx
  on public.game_runs (expires_at);

alter table public.game_runs enable row level security;
revoke all on table public.game_runs from anon, authenticated;

create policy game_runs_deny_direct_client_access
  on public.game_runs for all to anon, authenticated
  using (false) with check (false);

create or replace function public.begin_game_run(
  p_user_id uuid,
  p_kind text,
  p_exercise text,
  p_challenge_code text,
  p_rules_version text
) returns table(run_id uuid, expires_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  recent_count integer;
  daily_count integer;
  selected_challenge_id uuid;
  created_run_id uuid;
  created_expires_at timestamptz;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 641923));

  if p_kind not in ('leaderboard', 'challenge') then
    raise exception 'Game run type is invalid.';
  end if;
  if p_exercise not in ('pushups', 'squats', 'pullups', 'biceps', 'lateralraise', 'shoulderpress') then
    raise exception 'Exercise is invalid.';
  end if;
  if p_kind = 'leaderboard' and p_exercise not in ('pushups', 'squats', 'pullups') then
    raise exception 'Exercise is invalid for the leaderboard.';
  end if;
  if nullif(trim(p_rules_version), '') is null then
    raise exception 'Rules version is invalid.';
  end if;

  select count(*) into recent_count
  from public.game_runs
  where user_id = p_user_id
    and started_at >= now() - interval '10 minutes';
  if recent_count >= 30 then
    raise exception 'Game run limit reached.';
  end if;

  select count(*) into daily_count
  from public.game_runs
  where user_id = p_user_id
    and started_at >= now() - interval '24 hours';
  if daily_count >= 500 then
    raise exception 'Daily game run limit reached.';
  end if;

  if p_kind = 'challenge' then
    select id into selected_challenge_id
    from public.challenges c
    where c.code = p_challenge_code
      and c.expires_at > now();
    if selected_challenge_id is null then
      raise exception 'Challenge not found.';
    end if;
  elsif p_challenge_code is not null then
    raise exception 'Challenge does not match this run.';
  end if;

  insert into public.game_runs (
    user_id,
    run_kind,
    exercise,
    challenge_id,
    rules_version
  ) values (
    p_user_id,
    p_kind,
    p_exercise,
    selected_challenge_id,
    p_rules_version
  )
  returning id, game_runs.expires_at into created_run_id, created_expires_at;

  return query select created_run_id, created_expires_at;
end;
$$;

create or replace function public.finalize_game_run(
  p_run_id uuid,
  p_user_id uuid,
  p_player_name text,
  p_score integer,
  p_duration_ms integer,
  p_terms_version text,
  p_rules_version text
) returns table(
  improved boolean,
  result_kind text,
  exercise_name text,
  challenge_code text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  selected_run public.game_runs%rowtype;
  selected_challenge public.challenges%rowtype;
  wall_elapsed_ms bigint;
  was_improved boolean := false;
  returned_code text := null;
begin
  select gr.* into selected_run
  from public.game_runs gr
  where gr.id = p_run_id
    and gr.user_id = p_user_id
  for update;

  if not found then
    raise exception 'Game run not found.';
  end if;
  if selected_run.rules_version <> p_rules_version then
    raise exception 'Game run rules version does not match.';
  end if;

  if selected_run.finalized_at is not null then
    if selected_run.final_score = p_score and selected_run.duration_ms = p_duration_ms then
      if selected_run.challenge_id is not null then
        select code into returned_code from public.challenges where id = selected_run.challenge_id;
      end if;
      return query select false, selected_run.run_kind, selected_run.exercise, returned_code;
      return;
    end if;
    raise exception 'Game run was already finalized.';
  end if;

  if selected_run.expires_at <= now() then
    raise exception 'Game run expired.';
  end if;
  if p_score < 0 or p_score > 100000 then
    raise exception 'Game score is implausible.';
  end if;
  if p_duration_ms < 0 or p_duration_ms > 21600000 then
    raise exception 'Game duration is invalid.';
  end if;

  wall_elapsed_ms := floor(extract(epoch from (now() - selected_run.started_at)) * 1000);
  if p_duration_ms > wall_elapsed_ms + 30000 then
    raise exception 'Game duration does not match the server run.';
  end if;
  if p_score > floor(p_duration_ms / 250.0) + 5 then
    raise exception 'Game score is implausible for its duration.';
  end if;

  if selected_run.run_kind = 'challenge' then
    select c.* into selected_challenge
    from public.challenges c
    where c.id = selected_run.challenge_id
      and c.expires_at > now();
    if not found then
      raise exception 'Challenge expired.';
    end if;
    if p_score > 60 then
      raise exception 'Challenge score is implausible.';
    end if;
    returned_code := selected_challenge.code;
  end if;

  insert into public.profiles (
    user_id,
    player_name,
    terms_version,
    terms_accepted_at,
    updated_at
  ) values (
    p_user_id,
    p_player_name,
    p_terms_version,
    now(),
    now()
  )
  on conflict (user_id) do update
    set player_name = excluded.player_name,
        terms_version = excluded.terms_version,
        terms_accepted_at = excluded.terms_accepted_at,
        updated_at = excluded.updated_at;

  if selected_run.run_kind = 'leaderboard' then
    insert into public.leaderboard_scores (user_id, exercise, score)
    values (p_user_id, selected_run.exercise, p_score)
    on conflict (user_id, exercise) do update
      set score = excluded.score,
          updated_at = now()
      where excluded.score > public.leaderboard_scores.score
    returning true into was_improved;
  else
    insert into public.challenge_attempts (challenge_id, user_id, score)
    values (selected_run.challenge_id, p_user_id, p_score)
    on conflict (challenge_id, user_id) do update
      set score = excluded.score,
          updated_at = now()
      where excluded.score > public.challenge_attempts.score
    returning true into was_improved;
  end if;

  update public.game_runs
  set finalized_at = now(),
      final_score = p_score,
      duration_ms = p_duration_ms
  where id = selected_run.id;

  return query select coalesce(was_improved, false), selected_run.run_kind,
    selected_run.exercise, returned_code;
end;
$$;

create or replace function public.create_challenge_limited(
  p_user_id uuid,
  p_player_name text,
  p_terms_version text,
  p_target_score integer,
  p_code text
) returns table(code text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  recent_count integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 928417));
  if p_target_score < 1 or p_target_score > 60 then
    raise exception 'Target score must be between 1 and 60.';
  end if;
  if p_code !~ '^[A-Z2-9]{6}$' then
    raise exception 'Challenge code is invalid.';
  end if;

  insert into public.profiles (
    user_id,
    player_name,
    terms_version,
    terms_accepted_at,
    updated_at
  ) values (
    p_user_id,
    p_player_name,
    p_terms_version,
    now(),
    now()
  )
  on conflict (user_id) do update
    set player_name = excluded.player_name,
        terms_version = excluded.terms_version,
        terms_accepted_at = excluded.terms_accepted_at,
        updated_at = excluded.updated_at;

  select count(*) into recent_count
  from public.challenges
  where creator_id = p_user_id
    and created_at >= now() - interval '24 hours';
  if recent_count >= 10 then
    raise exception 'Challenge limit reached.';
  end if;

  insert into public.challenges (code, creator_id, target_score, level_id)
  values (p_code, p_user_id, p_target_score, 3);

  return query select p_code;
end;
$$;

revoke all on function public.begin_game_run(uuid, text, text, text, text)
  from public, anon, authenticated;
revoke all on function public.finalize_game_run(uuid, uuid, text, integer, integer, text, text)
  from public, anon, authenticated;
revoke all on function public.create_challenge_limited(uuid, text, text, integer, text)
  from public, anon, authenticated;
grant execute on function public.begin_game_run(uuid, text, text, text, text) to service_role;
grant execute on function public.finalize_game_run(uuid, uuid, text, integer, integer, text, text)
  to service_role;
grant execute on function public.create_challenge_limited(uuid, text, text, integer, text)
  to service_role;

create or replace function public.cleanup_flapfit_retention()
returns void
language plpgsql
set search_path = ''
as $$
begin
  delete from public.game_runs
  where expires_at < pg_catalog.now() - interval '7 days';

  delete from public.challenges
  where expires_at < pg_catalog.now();

  delete from public.content_reports
  where status in ('reviewed', 'actioned', 'dismissed')
    and resolved_at < pg_catalog.now() - interval '180 days';
end;
$$;

revoke all on function public.cleanup_flapfit_retention() from public, anon, authenticated;
