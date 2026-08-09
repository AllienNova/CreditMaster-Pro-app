create table if not exists public.feature_flags (
  key text primary key,
  enabled boolean not null default false,
  description text,
  updated_at timestamptz not null default now()
);
alter table public.feature_flags enable row level security;
revoke all on public.feature_flags from public, anon, authenticated;
grant select on public.feature_flags to service_role;
-- No anon/authenticated policy by design: flags are ONLY read via the
-- service-role client (see src/lib/flags/index.ts). A non-service-role read
-- returns empty -> flags default false. The AUTH-04 kill-switch depends on a
-- service-role read.
insert into public.feature_flags (key, enabled, description) values
  ('auth.deny_by_default', false, 'Wave 7 AUTH-04 kill-switch'),
  ('webhooks.enabled', true, 'Webhook processing kill-switch'),
  ('payouts.enabled', true, 'Payout processing kill-switch')
on conflict (key) do nothing;
