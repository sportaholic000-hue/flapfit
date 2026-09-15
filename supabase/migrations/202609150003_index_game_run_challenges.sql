create index if not exists game_runs_challenge_id_idx
  on public.game_runs (challenge_id)
  where challenge_id is not null;
