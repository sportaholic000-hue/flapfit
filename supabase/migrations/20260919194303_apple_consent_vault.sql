-- This migration never returns, logs, hardcodes, or overwrites the HMAC value.
-- Supabase Vault/pgcrypto already installed on the target project (read-only verified).
do $$
begin
  if to_regclass('vault.decrypted_secrets') is null
     or to_regprocedure('extensions.gen_random_bytes(integer)') is null then
    raise exception 'Supabase Vault and pgcrypto are required';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('flapfit_apple_consent_hmac_v1', 0));
  if not exists (select 1 from vault.secrets where name = 'flapfit_apple_consent_hmac_v1') then
    if exists(select 1 from flapfit_private.apple_consent_revocations)
       or exists(select 1 from flapfit_private.apple_consent_notifications)
       or exists(select 1 from flapfit_private.apple_consent_identities) then
      raise exception 'Restore the existing Apple consent key before proceeding';
    end if;
    perform vault.create_secret(
      pg_catalog.encode(extensions.gen_random_bytes(32), 'hex'),
      'flapfit_apple_consent_hmac_v1',
      'Stable internal Apple consent transaction HMAC; never rotate without preserving denial hashes'
    );
  end if;
end;
$$;

-- Only this fixed secret may be read. No service-role SELECT grant on the Vault view.
-- SECURITY DEFINER is confined to the private schema because Vault is deliberately not
-- readable by callers. The invoker must be the actual Postgres service role, with no user
-- subject; neither editable user metadata nor a body parameter participates in authority.
create or replace function flapfit_private.read_apple_consent_hmac_key()
returns text language plpgsql security definer set search_path = '' as $$
declare
  key_value text;
begin
  if pg_catalog.current_setting('role', true) is distinct from 'service_role'
     or auth.uid() is not null then
    raise exception 'Service access required' using errcode = '42501';
  end if;
  select decrypted_secret into strict key_value from vault.decrypted_secrets
    where name = 'flapfit_apple_consent_hmac_v1';
  if key_value is null or key_value !~ '^[0-9a-fA-F]{64}$' then
    raise exception 'Apple consent key unavailable';
  end if;
  return key_value;
end;
$$;
revoke all on function flapfit_private.read_apple_consent_hmac_key() from public, anon, authenticated;
grant execute on function flapfit_private.read_apple_consent_hmac_key() to service_role;

-- The exposed wrapper is invoker-only and executable solely by the service-role client.
create or replace function public.get_apple_consent_hmac_key()
returns text language sql security invoker set search_path = '' as $$
  select flapfit_private.read_apple_consent_hmac_key();
$$;
revoke all on function public.get_apple_consent_hmac_key() from public, anon, authenticated;
grant execute on function public.get_apple_consent_hmac_key() to service_role;
