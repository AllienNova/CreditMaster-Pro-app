-- processed_webhook_events: idempotency sentinel for inbound provider webhooks.
--
-- Claim-AFTER-success semantics (FND-022): a webhook handler does multiple
-- network/HTTP side-effects, so it cannot be wrapped in one Postgres transaction
-- with the sentinel insert (unlike add_credits). The dispatcher therefore needs
-- TWO RPCs — a check before dispatch and a mark only after the handler succeeds.
-- On handler failure the sentinel is NOT marked, so the route 400s and the
-- provider retries (at-least-once; per-handler side-effects must be idempotent).
--
-- Hardening mirrors commit d64e8d5 / 20260501000000_credit_purchase_idempotency.sql:
-- RLS enabled, all access revoked from public/anon/authenticated, granted only
-- to service_role; SECURITY DEFINER functions with EXECUTE revoked from PUBLIC.

create table if not exists public.processed_webhook_events (
  provider     text not null,
  event_id     text not null,
  processed_at timestamptz not null default now(),
  primary key (provider, event_id)
);
alter table public.processed_webhook_events enable row level security;
revoke all on public.processed_webhook_events from public, anon, authenticated;
grant select, insert on public.processed_webhook_events to service_role;

create or replace function public.is_webhook_event_processed(p_provider text, p_event_id text)
returns boolean language sql security definer set search_path = public as $$
  select exists (select 1 from public.processed_webhook_events
                 where provider = p_provider and event_id = p_event_id);
$$;

create or replace function public.mark_webhook_event_processed(p_provider text, p_event_id text)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.processed_webhook_events (provider, event_id)
  values (p_provider, p_event_id)
  on conflict (provider, event_id) do nothing;
end; $$;

revoke execute on function public.is_webhook_event_processed(text,text) from public, anon, authenticated;
revoke execute on function public.mark_webhook_event_processed(text,text) from public, anon, authenticated;
grant execute on function public.is_webhook_event_processed(text,text) to service_role;
grant execute on function public.mark_webhook_event_processed(text,text) to service_role;
