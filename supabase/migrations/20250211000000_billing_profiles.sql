-- Create billing_profiles table for persisting Stripe metadata
create table if not exists public.billing_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  profile jsonb not null,
  inserted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists billing_profiles_profile_idx
  on public.billing_profiles using gin (profile);

alter table public.billing_profiles enable row level security;

create policy "billing_profiles_owner_select"
  on public.billing_profiles
  for select
  using (auth.uid() = user_id);

create policy "billing_profiles_owner_insert"
  on public.billing_profiles
  for insert
  with check (auth.uid() = user_id);

create policy "billing_profiles_owner_update"
  on public.billing_profiles
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace trigger billing_profiles_set_timestamp
  before update on public.billing_profiles
  for each row
  execute procedure trigger_set_timestamp();
