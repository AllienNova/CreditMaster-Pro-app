-- Backfill financial_accounts.connection_id.
--
-- WHAT WAS BROKEN. 20260801000020 generalised plaid_items into
-- bank_connections. In doing so it had to drop the foreign key
-- financial_accounts.item_id -> plaid_items(item_id), because Postgres will
-- not drop a primary key an FK depends on. It replaced that link with a new
-- column:
--
--   ALTER TABLE public.financial_accounts
--     ADD COLUMN IF NOT EXISTS connection_id UUID
--       REFERENCES public.bank_connections(id) ON DELETE CASCADE;
--
-- and then never populated it — neither for the rows that already existed nor
-- for new ones, because plaid-service.storeAccount did not write the column.
-- Every financial_accounts row therefore carried connection_id IS NULL.
--
-- The consequence is not cosmetic. The ON DELETE CASCADE above is the only
-- remaining declared relationship between an account and the connection that
-- produced it, and a NULL never cascades. Deleting a bank connection left its
-- accounts behind, still visible to the user, with no row left in the database
-- that could be deleted to remove them. That defect had never fired only
-- because nothing could delete a connection: there was no disconnect path in
-- the product at all until the connections route added one.
--
-- WHAT THIS DOES. Matches each account to its connection on the pair that
-- identifies a connection at its provider — (user_id, provider, item_id) —
-- which 20260801000020 made unique on bank_connections and which is present on
-- every financial_accounts row. Rows that match nothing are left NULL: an
-- account whose connection row is already gone is an orphan, and inventing a
-- link for it would attach it to the wrong bank.
--
-- WHY connection_id IS NOT MADE NOT NULL. Precisely because those orphans may
-- exist in a live database. A NOT NULL added here would fail the migration on
-- exactly the data that motivated it. The application now always writes the
-- column (plaid-service.storeAccount), so new rows carry it; this statement
-- repairs the history.
--
-- IDEMPOTENT: re-running matches the same rows and writes the same values. The
-- WHERE connection_id IS NULL guard means a second run updates nothing.

UPDATE public.financial_accounts AS fa
SET connection_id = bc.id
FROM public.bank_connections AS bc
WHERE fa.connection_id IS NULL
  AND fa.user_id  = bc.user_id
  AND fa.provider = bc.provider
  AND fa.item_id  = bc.item_id;

COMMENT ON COLUMN public.financial_accounts.connection_id IS
  'The bank_connections row that produced this account. ON DELETE CASCADE, so removing a connection removes its accounts. Added in 20260801000020, populated from 20260817000000 onward; nullable only to tolerate accounts whose connection row was already deleted before the link existed.';
