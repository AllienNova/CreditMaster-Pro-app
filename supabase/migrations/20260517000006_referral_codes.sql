-- referral_codes: schema-of-record for the affiliate referral code table (FND-027).
--
-- This table has no prior migration — it exists only in the live DB. This migration
-- adds it to the schema-of-record so deployments are reproducible.
--
-- Column names are derived verbatim from affiliate-service.ts (mapReferralCode,
-- generateReferralCode, applyReferralCode) to match what the service already reads/writes:
--   id, code, user_id, partner_id, campaign_id, uses_count, max_uses,
--   expires_at, is_active, created_at.
--
-- RLS: service/admin data — no end-user policy. Matches the service-role-only pattern
-- established in 20260501000000_credit_purchase_idempotency.sql and
-- 20260517000000_processed_webhook_events.sql.

create table if not exists public.referral_codes (
  id          uuid        primary key default gen_random_uuid(),
  code        text        not null unique,
  user_id     uuid        not null,
  partner_id  uuid,
  campaign_id text,
  uses_count  integer     not null default 0,
  max_uses    integer,
  expires_at  timestamptz,
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now()
);

alter table public.referral_codes enable row level security;

-- No end-user RLS policies — service_role only.
revoke all on public.referral_codes from public, anon, authenticated;
grant select, insert, update, delete on public.referral_codes to service_role;

create index if not exists referral_codes_user_id_idx
  on public.referral_codes (user_id);

create index if not exists referral_codes_is_active_idx
  on public.referral_codes (code, is_active);
