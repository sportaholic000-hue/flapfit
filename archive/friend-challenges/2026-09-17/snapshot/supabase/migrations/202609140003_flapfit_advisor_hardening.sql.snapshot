-- Direct table access stays closed to mobile clients. The flapfit-game Edge
-- Function validates each anonymous user's JWT, then performs narrowly scoped
-- operations with the service role. These explicit policies provide a second
-- default-deny layer if table grants are ever changed accidentally.
create policy profiles_deny_direct_client_access
  on public.profiles for all to anon, authenticated
  using (false) with check (false);

create policy leaderboard_scores_deny_direct_client_access
  on public.leaderboard_scores for all to anon, authenticated
  using (false) with check (false);

create policy challenges_deny_direct_client_access
  on public.challenges for all to anon, authenticated
  using (false) with check (false);

create policy challenge_attempts_deny_direct_client_access
  on public.challenge_attempts for all to anon, authenticated
  using (false) with check (false);

create policy player_blocks_deny_direct_client_access
  on public.player_blocks for all to anon, authenticated
  using (false) with check (false);

create policy content_reports_deny_direct_client_access
  on public.content_reports for all to anon, authenticated
  using (false) with check (false);

-- Cover foreign keys used during profile deletion and relationship checks.
create index challenge_attempts_user_idx
  on public.challenge_attempts (user_id);

create index challenges_creator_idx
  on public.challenges (creator_id);

create index content_reports_reported_user_idx
  on public.content_reports (reported_user_id);
