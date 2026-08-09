-- revenue_events: persistent storage for affiliate revenue events (FND-025).
--
-- Replaces the process-local in-memory array in revenue-tracker.ts.
-- Every serverless cold start previously lost all events; this table survives restarts.
--
-- Notes:
-- * event_id is a synthetic key minted by trackEvent (`rev_<uuid>`). It is unique
--   within this table but NOT a duplicate-delivery guard — a re-delivered partner
--   webhook mints a new event_id and inserts a second row. Dedup of partner-webhook
--   re-deliveries is a follow-up task (pass the provider's stable event id as event_id).
-- * commission_amount_cents stores integer cents; revenue-tracker converts dollars→cents
--   on write and cents→dollars on read so callers always see dollar values.
-- * created_at maps from RevenueEvent.timestamp; getReport period filtering uses it.
--
-- RLS: service/admin data — no end-user policy. Matches the service-role-only pattern
-- established in 20260501000000_credit_purchase_idempotency.sql and
-- 20260517000000_processed_webhook_events.sql.

create table if not exists public.revenue_events (
  id                    uuid        primary key default gen_random_uuid(),
  event_id              text        not null unique,
  user_id               uuid        not null,
  product_id            text        not null,
  partner_id            text        not null,
  event_type            text        not null,
  commission_amount_cents integer   null,
  commission_currency   text        null,
  metadata              jsonb       null,
  created_at            timestamptz not null default now()
);

alter table public.revenue_events enable row level security;

-- No end-user RLS policies — service_role only.
revoke all on public.revenue_events from public, anon, authenticated;
grant select, insert, update, delete on public.revenue_events to service_role;

create index if not exists revenue_events_partner_created_idx
  on public.revenue_events (partner_id, created_at);

create index if not exists revenue_events_product_id_idx
  on public.revenue_events (product_id);
