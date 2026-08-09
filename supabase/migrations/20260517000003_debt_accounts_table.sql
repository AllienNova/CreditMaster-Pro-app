-- debt_accounts: real persistence for user debt records (MOK-03 / TASK-FIN-5).
--
-- Table name chosen to match the GDPR erasure RPC
-- (supabase/migrations/20260401000000_gdpr_erasure_rpc.sql:44) which already
-- lists 'debt_accounts' in its cascade-delete sweep — using this name means
-- the new table is automatically covered by GDPR erasure without further
-- migration changes.
--
-- RLS is the defence-in-depth layer; every application query ALSO carries an
-- explicit .eq("user_id", userId) filter.

create table if not exists public.debt_accounts (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references public.profiles(id) on delete cascade,
  name             text        not null,
  type             text        not null,
  balance          numeric     not null,
  original_balance numeric,
  interest_rate    numeric     not null,
  minimum_payment  numeric     not null,
  due_date         date,
  creditor_name    text,
  is_active        boolean     not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.debt_accounts enable row level security;

-- Every operation is scoped to the authenticated user who owns the row.
create policy "debt_accounts: owner select"
  on public.debt_accounts for select
  using (auth.uid() = user_id);

create policy "debt_accounts: owner insert"
  on public.debt_accounts for insert
  with check (auth.uid() = user_id);

create policy "debt_accounts: owner update"
  on public.debt_accounts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "debt_accounts: owner delete"
  on public.debt_accounts for delete
  using (auth.uid() = user_id);

-- Index to speed up the common user-scoped list query.
create index if not exists debt_accounts_user_id_idx
  on public.debt_accounts (user_id);
