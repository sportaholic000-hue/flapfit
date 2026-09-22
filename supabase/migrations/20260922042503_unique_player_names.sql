-- Names belong to one profile across every exercise. Keep display spelling,
-- but compare Unicode-normalized names without case or whitespace variations.
-- A unique index arbitrates simultaneous claims, including profile upserts and
-- score finalization. Existing collisions abort migration without renaming or
-- deleting anyone; check counts before deployment.
create unique index profiles_player_name_key on public.profiles (
  lower(btrim(regexp_replace(normalize(player_name, NFKC), '[[:space:]]+', ' ', 'g')))
);
