-- Private denial records: no Apple JWS, raw transaction identifier, age, or advertising ID.
create schema if not exists flapfit_private;
revoke all on schema flapfit_private from public, anon, authenticated;
grant usage on schema flapfit_private to service_role;

create table flapfit_private.apple_consent_revocations (
  transaction_hash text primary key check (transaction_hash ~ '^[0-9a-f]{64}$'),
  environment text not null check (environment in ('Production', 'Sandbox')),
  signed_at timestamptz not null,
  recorded_at timestamptz not null default now()
);
create table flapfit_private.apple_consent_notifications (
  notification_id uuid primary key,
  transaction_hash text not null check (transaction_hash ~ '^[0-9a-f]{64}$'),
  environment text not null check (environment in ('Production', 'Sandbox')),
  signed_at timestamptz not null
);
create table flapfit_private.apple_consent_identities (
  transaction_hash text not null check (transaction_hash ~ '^[0-9a-f]{64}$'),
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (transaction_hash, user_id)
);
create index apple_consent_identity_user on flapfit_private.apple_consent_identities(user_id);
alter table flapfit_private.apple_consent_revocations enable row level security;
alter table flapfit_private.apple_consent_notifications enable row level security;
alter table flapfit_private.apple_consent_identities enable row level security;
revoke all on flapfit_private.apple_consent_revocations,
  flapfit_private.apple_consent_notifications, flapfit_private.apple_consent_identities
  from public, anon, authenticated;
grant select, insert on flapfit_private.apple_consent_revocations,
  flapfit_private.apple_consent_notifications, flapfit_private.apple_consent_identities
  to service_role;

create function public.record_apple_consent_revocation(
  p_notification_id uuid, p_transaction_hash text, p_environment text, p_signed_at timestamptz
) returns void language plpgsql security invoker set search_path = '' as $$
declare
  inserted_id uuid;
  existing flapfit_private.apple_consent_notifications%rowtype;
begin
  insert into flapfit_private.apple_consent_notifications
    (notification_id, transaction_hash, environment, signed_at)
    values (p_notification_id, p_transaction_hash, p_environment, p_signed_at)
    on conflict (notification_id) do nothing returning notification_id into inserted_id;
  if inserted_id is null then
    select * into strict existing from flapfit_private.apple_consent_notifications
      where notification_id = p_notification_id;
    if existing.transaction_hash <> p_transaction_hash or existing.environment <> p_environment
       or existing.signed_at <> p_signed_at then
      raise exception 'Notification conflict' using errcode = '22023';
    end if;
  end if;
  -- Always ensure denial exists, even on a duplicate. Both writes commit or roll back together.
  insert into flapfit_private.apple_consent_revocations (transaction_hash, environment, signed_at)
    values (p_transaction_hash, p_environment, p_signed_at) on conflict do nothing;
end;
$$;

create function public.apple_consent_is_revoked(p_transaction_hash text)
returns boolean language sql stable security invoker set search_path = '' as $$
  select exists(select 1 from flapfit_private.apple_consent_revocations
    where transaction_hash = p_transaction_hash);
$$;

create function public.link_apple_consent_identity(p_transaction_hash text, p_user_id uuid)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  -- Caller is the service-only verified-JWS handler; the FK also rejects deleted identities.
  insert into flapfit_private.apple_consent_identities(transaction_hash, user_id)
    values (p_transaction_hash, p_user_id) on conflict do nothing;
  return public.apple_consent_is_revoked(p_transaction_hash);
end;
$$;

create function public.apple_consent_user_is_revoked(p_user_id uuid, p_environment text)
returns boolean language sql stable security invoker set search_path = '' as $$
  select exists(select 1 from flapfit_private.apple_consent_identities i
    join flapfit_private.apple_consent_revocations r using (transaction_hash)
    where i.user_id = p_user_id and r.environment = p_environment);
$$;

revoke all on function public.record_apple_consent_revocation(uuid,text,text,timestamptz) from public, anon, authenticated;
revoke all on function public.apple_consent_is_revoked(text) from public, anon, authenticated;
revoke all on function public.link_apple_consent_identity(text,uuid) from public, anon, authenticated;
revoke all on function public.apple_consent_user_is_revoked(uuid,text) from public, anon, authenticated;
grant execute on function public.record_apple_consent_revocation(uuid,text,text,timestamptz) to service_role;
grant execute on function public.apple_consent_is_revoked(text) to service_role;
grant execute on function public.link_apple_consent_identity(text,uuid) to service_role;
grant execute on function public.apple_consent_user_is_revoked(uuid,text) to service_role;

-- No un-revoke/update API: another valid download or refreshed JWT cannot reset denial.
-- Account deletion cascades its identity link; denial remains to honor subsequent reinstalls.
