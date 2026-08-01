-- user_attributions: schema-of-record for referral attribution tracking.
--
-- affiliate-service.ts (createAttribution/getUserAttribution/updateLastClick/
-- getReferrer) has queried this table since Wave 6 (f69d350, 2026-03-02) and
-- it has never had a migration. Unlike most phantom-table findings in this
-- audit, this is NOT dead legacy code: applyReferralCode() -- the caller of
-- createAttribution() -- was extended with an atomic increment_referral_use()
-- RPC and a self-referral guard as recently as TASK-MNY-02/03 (37c7531,
-- 2026-05-17, FND-027) and carries full test coverage in
-- affiliate-service.test.ts (createAttribution/getUserAttribution/
-- updateLastClick/getReferrer describe blocks, plus the applyReferralCode
-- suite's attribution-upsert assertions). No route calls applyReferralCode()
-- yet, so triage correctly flagged this table as unreachable-today, but
-- deleting the attribution methods would discard tested, money-adjacent
-- (attribution -> commission) code that is one migration away from working,
-- not a legacy dead end. Building the table is the smaller, additive,
-- zero-risk change: every consumer already handles a missing/expired row
-- correctly (getUserAttribution narrows to PGRST116, createAttribution
-- propagates real errors), so this migration changes no behavior for any
-- code path that exists today.
--
-- Column derivation (verbatim from affiliate-service.ts's attributionData /
-- mapAttribution, and types.ts's Attribution interface -- no invented
-- columns, none omitted): user_id, referral_code, referrer_id, partner_id,
-- campaign_id, first_click_id, last_click_id, attributed_at, expires_at.
-- `id` is added as a synthetic PK for consistency with every sibling table
-- in this domain (affiliate_partners, commission_rules, referral_codes);
-- Attribution/mapAttribution never read it back, so its presence is inert
-- from the application's point of view.
--
-- Upsert target: createAttribution() upserts with
-- `onConflict: "user_id", ignoreDuplicates: false` -- Postgres requires a
-- unique constraint or index matching the conflict target, hence
-- `user_id UUID NOT NULL UNIQUE` below. This also encodes the intended
-- semantics directly in the schema: one attribution record per user
-- (last-referral-wins), matching the "Use upsert to handle existing
-- attribution" comment at the call site.
--
-- partner_id has no FK to affiliate_partners: referral_codes.partner_id
-- (20260517000006_referral_codes.sql), which is the immediate upstream
-- source of this same value in applyReferralCode(), is likewise untyped
-- against affiliate_partners(id). Matching that established precedent for
-- the identical conceptual field, sourced from the identical code path,
-- keeps the two tables' typing consistent rather than introducing an
-- FK asymmetry between them.
--
-- RLS: user_attributions carries a user_id column, but every reader/writer
-- in affiliate-service.ts uses the module's service-role Supabase client
-- (see the lazy-Proxy client at the top of that file) -- no client-scoped/
-- RLS-bound caller exists anywhere in the codebase (grep confirms). Matches
-- the service-role-only pattern already established for referral_codes:
-- no end-user policy; RLS is enabled purely so the default-deny posture
-- holds if a future caller ever reaches this table through an RLS-scoped
-- client by mistake.
--
-- GRANTs: this instance's CREATE TABLE default privileges do not include
-- base SELECT/INSERT/UPDATE/DELETE for service_role (verified against a
-- fresh local `supabase db reset` for the sibling affiliate_partners/
-- commission_rules migration) -- service_role has BYPASSRLS, so explicit
-- GRANTs are what actually gate access, not the RLS policy. Matches the
-- identical GRANT already carried by referral_codes and affiliate_partners.
--
-- GDPR erasure cascade: NOT registered by this migration. Per the shared
-- coordinator's hard constraint, delete_user_data_cascade() is redefined
-- wholesale from a single hardcoded array and concurrent edits from
-- multiple migrations silently drop each other's tables -- that step is
-- serialised through the lead. user_attributions DOES have a user_id
-- column (unlike affiliate_partners/commission_rules, which are correctly
-- out of scope for erasure) and personal referral/click data, so it SHOULD
-- be added to the array -- flagged for the lead to fold into the next
-- consolidated erasure migration rather than added here.

create table if not exists public.user_attributions (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null unique,
  referral_code   text,
  referrer_id     uuid,
  partner_id      uuid,
  campaign_id     text,
  first_click_id  text,
  last_click_id   text,
  attributed_at   timestamptz not null default now(),
  expires_at      timestamptz,
  created_at      timestamptz not null default now()
);

alter table public.user_attributions enable row level security;

-- No end-user RLS policies — service_role only, matching referral_codes.
revoke all on public.user_attributions from public, anon, authenticated;
grant select, insert, update, delete on public.user_attributions to service_role;

-- Matches getReferrer()/getUserAttribution()'s .eq("user_id", userId) lookup.
-- (Also enforced as UNIQUE above, which already creates a btree index; this
-- explicit index is kept only for symmetry/discoverability with the sibling
-- tables' idx_* naming — Postgres will use the UNIQUE constraint's index
-- either way.)
create index if not exists idx_user_attributions_referrer_id
  on public.user_attributions (referrer_id);
