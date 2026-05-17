-- Migrate profiles.subscription_tier from the legacy 4-value vocabulary
-- ('free','basic','premium','enterprise') to the canonical 6-tier model
-- ('free','standard','pro','family-duo','family','family-plus').
--
-- WBH-02 / FND-018: getTierFromPriceId referenced nonexistent env vars and
-- silently landed every paid subscription on 'free'. The rebuilt tier mapping
-- (src/lib/payment/tier-mapping.ts) emits the 6-tier ids, which collide with
-- the existing CHECK constraint — so the constraint must be swapped here.
--
-- The constraint was declared inline and unnamed in 001_initial_schema.sql:14
-- and 20251217000001_cpfi_financial_suite_schema.sql:16, so Postgres assigns
-- the implicit name profiles_subscription_tier_check.

-- Backfill legacy 4-tier values to the canonical 6-tier model before swapping
-- the constraint, so existing rows remain valid against the new check.
update public.profiles set subscription_tier = 'standard' where subscription_tier = 'basic';
update public.profiles set subscription_tier = 'pro'      where subscription_tier in ('premium', 'enterprise');

alter table public.profiles drop constraint if exists profiles_subscription_tier_check;
alter table public.profiles add  constraint profiles_subscription_tier_check
  check (subscription_tier in ('free', 'standard', 'pro', 'family-duo', 'family', 'family-plus'));
