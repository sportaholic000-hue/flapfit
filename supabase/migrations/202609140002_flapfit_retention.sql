create extension if not exists pg_cron with schema pg_catalog;

grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

alter table public.content_reports
  drop constraint content_reports_reporter_id_fkey,
  drop constraint content_reports_reported_user_id_fkey,
  alter column reporter_id drop not null,
  alter column reported_user_id drop not null,
  add column resolved_at timestamptz,
  add constraint content_reports_reporter_id_fkey
    foreign key (reporter_id) references auth.users(id) on delete set null,
  add constraint content_reports_reported_user_id_fkey
    foreign key (reported_user_id) references auth.users(id) on delete set null;

create index content_reports_retention_idx
  on public.content_reports (resolved_at)
  where status in ('reviewed', 'actioned', 'dismissed');

create or replace function public.set_content_report_resolved_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status in ('reviewed', 'actioned', 'dismissed') and
     (old.status is distinct from new.status or new.resolved_at is null) then
    new.resolved_at := pg_catalog.now();
  elsif new.status = 'pending' then
    new.resolved_at := null;
  end if;
  return new;
end;
$$;

create trigger content_reports_set_resolved_at
before update of status on public.content_reports
for each row
execute function public.set_content_report_resolved_at();

create or replace function public.cleanup_flapfit_retention()
returns void
language plpgsql
set search_path = ''
as $$
begin
  delete from public.challenges
  where expires_at < pg_catalog.now();

  delete from public.content_reports
  where status in ('reviewed', 'actioned', 'dismissed')
    and resolved_at < pg_catalog.now() - interval '180 days';
end;
$$;

revoke all on function public.set_content_report_resolved_at() from public, anon, authenticated;
revoke all on function public.cleanup_flapfit_retention() from public, anon, authenticated;

select cron.schedule(
  'flapfit-retention-cleanup',
  '17 3 * * *',
  'select public.cleanup_flapfit_retention();'
);

select cron.schedule(
  'flapfit-cron-history-cleanup',
  '47 3 * * 0',
  $$
    delete from cron.job_run_details
    where end_time < pg_catalog.now() - interval '30 days';
  $$
);
