-- Replace pre-play run tickets with one authenticated best-score submission.
-- No per-run row, proof, receipt, verification service or additional request.
create function public.submit_leaderboard_score(
  p_user_id uuid, p_player_name text, p_exercise text, p_score integer, p_terms_version text
) returns table(score integer)
language plpgsql security definer set search_path = '' as $$
declare saved public.leaderboard_scores;
begin
  if p_user_id is null or p_exercise is null or p_exercise not in ('pushups','squats','pullups')
    or p_score is null or p_score < 0 or p_score > 100000
    or p_player_name is null or char_length(p_player_name) not between 2 and 20
    or p_terms_version is distinct from '2026-09-14' then
    raise exception 'Invalid leaderboard submission.';
  end if;
  insert into public.profiles(user_id,player_name,terms_version,terms_accepted_at,updated_at)
    values(p_user_id,p_player_name,p_terms_version,now(),now())
    on conflict(user_id) do update set player_name=excluded.player_name,
      terms_version=excluded.terms_version,terms_accepted_at=excluded.terms_accepted_at,updated_at=excluded.updated_at;
  select * into saved from public.upsert_leaderboard_score(p_user_id,p_exercise,p_score);
  return query select saved.score;
end;
$$;
revoke all on function public.submit_leaderboard_score(uuid,text,text,integer,text) from public,anon,authenticated;
grant execute on function public.submit_leaderboard_score(uuid,text,text,integer,text) to service_role;
-- Existing queued results may still finalize; no new ticket may be created.
revoke all on function public.begin_game_run(uuid,text,text,text,text) from public,anon,authenticated,service_role;
