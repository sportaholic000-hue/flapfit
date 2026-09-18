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
    select c.id into selected_challenge_id
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

revoke all on function public.begin_game_run(uuid, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.begin_game_run(uuid, text, text, text, text) to service_role;
