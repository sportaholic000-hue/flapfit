create extension if not exists pgcrypto;

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  player_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_player_name_length check (char_length(player_name) between 2 and 20),
  constraint profiles_player_name_no_controls check (player_name !~ '[[:cntrl:]]')
);

create table public.leaderboard_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  exercise text not null,
  score integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leaderboard_exercise_allowed check (exercise in ('pushups', 'squats', 'pullups')),
  constraint leaderboard_score_range check (score between 0 and 100000),
  constraint leaderboard_one_score_per_exercise unique (user_id, exercise)
);

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  creator_id uuid not null references public.profiles(user_id) on delete cascade,
  target_score integer not null,
  level_id integer not null default 3,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  constraint challenges_code_format check (code ~ '^[A-Z2-9]{6}$'),
  constraint challenges_target_playable check (target_score between 1 and 60),
  constraint challenges_level_positive check (level_id > 0)
);

create table public.challenge_attempts (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  score integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint challenge_attempt_score_playable check (score between 0 and 60),
  constraint challenge_one_attempt_per_player unique (challenge_id, user_id)
);

create table public.player_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint player_cannot_block_self check (blocker_id <> blocked_id)
);

create table public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid not null references auth.users(id) on delete cascade,
  context_type text not null,
  context_id uuid not null,
  reason text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  constraint reports_context_allowed check (context_type in ('leaderboard', 'challenge_attempt')),
  constraint reports_reason_allowed check (
    reason in ('inappropriate_name', 'cheating', 'harassment_or_other')
  ),
  constraint reports_status_allowed check (status in ('pending', 'reviewed', 'actioned', 'dismissed')),
  constraint player_cannot_report_self check (reporter_id <> reported_user_id),
  constraint one_report_per_reason unique (reporter_id, context_type, context_id, reason)
);

create index leaderboard_rank_idx
  on public.leaderboard_scores (exercise, score desc, updated_at asc);
create index challenges_code_active_idx
  on public.challenges (code, expires_at);
create index challenge_attempt_rank_idx
  on public.challenge_attempts (challenge_id, score desc, updated_at asc);
create index pending_reports_idx
  on public.content_reports (status, created_at asc);
create index blocked_player_lookup_idx
  on public.player_blocks (blocked_id, blocker_id);

alter table public.profiles enable row level security;
alter table public.leaderboard_scores enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_attempts enable row level security;
alter table public.player_blocks enable row level security;
alter table public.content_reports enable row level security;

-- Mobile clients have no direct table privileges. The authenticated Edge
-- Function is the only public API and uses the service role after validating
-- each anonymous user's JWT.
revoke all on table public.profiles from anon, authenticated;
revoke all on table public.leaderboard_scores from anon, authenticated;
revoke all on table public.challenges from anon, authenticated;
revoke all on table public.challenge_attempts from anon, authenticated;
revoke all on table public.player_blocks from anon, authenticated;
revoke all on table public.content_reports from anon, authenticated;

create or replace function public.upsert_leaderboard_score(
  p_user_id uuid,
  p_exercise text,
  p_score integer
) returns public.leaderboard_scores
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.leaderboard_scores;
begin
  insert into public.leaderboard_scores (user_id, exercise, score)
  values (p_user_id, p_exercise, p_score)
  on conflict (user_id, exercise) do update
    set score = greatest(public.leaderboard_scores.score, excluded.score),
        updated_at = case
          when excluded.score > public.leaderboard_scores.score then now()
          else public.leaderboard_scores.updated_at
        end
  returning * into result;
  return result;
end;
$$;

create or replace function public.upsert_challenge_attempt(
  p_user_id uuid,
  p_challenge_id uuid,
  p_score integer
) returns public.challenge_attempts
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.challenge_attempts;
begin
  insert into public.challenge_attempts (challenge_id, user_id, score)
  values (p_challenge_id, p_user_id, p_score)
  on conflict (challenge_id, user_id) do update
    set score = greatest(public.challenge_attempts.score, excluded.score),
        updated_at = case
          when excluded.score > public.challenge_attempts.score then now()
          else public.challenge_attempts.updated_at
        end
  returning * into result;
  return result;
end;
$$;

revoke all on function public.upsert_leaderboard_score(uuid, text, integer)
  from public, anon, authenticated;
revoke all on function public.upsert_challenge_attempt(uuid, uuid, integer)
  from public, anon, authenticated;
grant execute on function public.upsert_leaderboard_score(uuid, text, integer) to service_role;
grant execute on function public.upsert_challenge_attempt(uuid, uuid, integer) to service_role;
