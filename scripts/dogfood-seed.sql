-- Rows the dogfood sweep needs to exercise dynamic page routes.
--
-- Run after `supabase db reset`:
--   docker exec -i supabase_db_wave-7-foundation psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < scripts/dogfood-seed.sql
--
-- WHY THIS FILE EXISTS. Every id below must belong to the user the sweep
-- authenticates as. The API scopes these resources by owner and answers 404 —
-- not 403, so it does not leak existence — for a row belonging to someone else.
-- A foreign id therefore produces a page failure indistinguishable from a
-- broken endpoint. That is exactly what happened: the ids were seeded for
-- m@t.co while the sweep signed in as dogios@fynvita.test, and four pages
-- reported failures against correct code. scripts/dogfood-sweep.mjs now
-- preflights ownership and refuses to run on a mismatch.
--
-- The ids are fixed (d09000NN-…) rather than generated so re-running is
-- idempotent and scripts/dogfood-seeds.json never goes stale.

\set dog '0ae37503-d192-4bdf-acd9-cd7dc169103a'

insert into disputes (id, user_id, bureau, item_type, item_description, reason, letter_content)
values ('d0900001-0000-4000-8000-000000000001', :'dog', 'experian', 'collection',
        'Dogfood seed item', 'not_mine', 'Dogfood seed letter body.')
on conflict (id) do nothing;

insert into documents (id, user_id, type, name, original_name, size, mime_type, s3_key)
values ('d0900002-0000-4000-8000-000000000002', :'dog', 'credit_report',
        'dogfood-seed.pdf', 'dogfood-seed.pdf', 1024, 'application/pdf', 'dogfood/seed.pdf')
on conflict (id) do nothing;

insert into financial_goals (id, user_id, type, name, target_amount)
values ('d0900003-0000-4000-8000-000000000003', :'dog', 'savings', 'Dogfood seed goal', 5000)
on conflict (id) do nothing;

-- category is constrained: momentum | mean_reversion | breakout | trend_following
-- | volatility | multi_factor | income | defensive | custom. 'trend' is rejected.
insert into strategy_library (id, user_id, name, slug, category, config)
values ('d0900004-0000-4000-8000-000000000004', :'dog', 'Dogfood seed strategy',
        'dogfood-seed-strategy', 'custom', '{}'::jsonb)
on conflict (id) do nothing;

select 'disputes' as t, count(*) from disputes where user_id = :'dog'
union all select 'documents', count(*) from documents where user_id = :'dog'
union all select 'goals', count(*) from financial_goals where user_id = :'dog'
union all select 'strategy', count(*) from strategy_library where user_id = :'dog';
