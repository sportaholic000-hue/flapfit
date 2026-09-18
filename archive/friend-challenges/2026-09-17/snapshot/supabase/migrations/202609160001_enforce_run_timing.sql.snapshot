-- Enforce the fastest physically possible pipe cadence for the versioned
-- mobile run clock. Older queued runs keep their original validation rules.

create or replace function public.flapfit_minimum_run_duration_ms(
  p_run_kind text,
  p_score integer
) returns bigint
language plpgsql
immutable
set search_path = ''
as $$
declare
  minimum_ms bigint := 0;
  interval_index integer;
  interval_count integer;
  base_spawn_ms integer;
  speed_value integer;
begin
  if p_score <= 0 then
    return 0;
  end if;

  -- The first obstacle is spawned 600 ms after gameplay begins.
  minimum_ms := 600;
  interval_count := greatest(p_score - 1, 0);

  if p_run_kind = 'challenge' then
    minimum_ms := minimum_ms + interval_count::bigint * 2300;
  elsif p_run_kind = 'leaderboard' then
    -- Endless mode accelerates exactly as the mobile game does. Indexes 67+
    -- are at both the 1500 ms base floor and the 420 speed cap.
    if interval_count > 0 then
      for interval_index in 0..least(interval_count - 1, 66) loop
        base_spawn_ms := greatest(1500, 2300 - interval_index * 12);
        speed_value := least(150 + interval_index * 5, 420);
        minimum_ms :=
          minimum_ms + floor(base_spawn_ms * 150.0 / speed_value)::bigint;
      end loop;
      if interval_count > 67 then
        minimum_ms := minimum_ms + (interval_count - 67)::bigint * 535;
      end if;
    end if;
  else
    return 0;
  end if;

  -- Two seconds covers bridge scheduling and frame-boundary differences while
  -- remaining far below any legitimate pipe interval sequence.
  return greatest(0, minimum_ms - 2000);
end;
$$;

create or replace function public.flapfit_enforce_run_timing()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  minimum_ms bigint;
begin
  if new.finalized_at is not null
    and old.finalized_at is null
    and new.rules_version = '2026-09-16.1'
  then
    minimum_ms := public.flapfit_minimum_run_duration_ms(
      new.run_kind,
      coalesce(new.final_score, 0)
    );
    if coalesce(new.duration_ms, -1) < minimum_ms then
      raise exception 'Game score is implausible for its duration.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists flapfit_game_run_timing_guard on public.game_runs;
create trigger flapfit_game_run_timing_guard
before update of finalized_at, final_score, duration_ms on public.game_runs
for each row
execute function public.flapfit_enforce_run_timing();

revoke all on function public.flapfit_minimum_run_duration_ms(text, integer)
  from public, anon, authenticated;
revoke all on function public.flapfit_enforce_run_timing()
  from public, anon, authenticated;
grant execute on function public.flapfit_minimum_run_duration_ms(text, integer)
  to service_role;

comment on function public.flapfit_minimum_run_duration_ms(text, integer) is
  'Returns the conservative minimum active run duration for versioned Flap Fit score validation.';
