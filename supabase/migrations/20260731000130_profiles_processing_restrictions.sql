-- profiles.processing_restrictions: the column GDPR Art. 18 needs.
--
-- restrictProcessing() (src/lib/compliance/gdpr-ccpa.ts:301) updates
-- profiles.processing_restrictions, which does not exist. It throws on error,
-- so the right to restriction of processing has always failed outright.
--
-- Found by scripts/audit-phantom-columns.js, not by reading. The column axis
-- had gone unmeasured for most of Wave 7; this was one of 62 hits on its first
-- run, alongside three more in this same file that broke the Art. 15 export
-- (profiles.name, credit_reports.items, disputes.description).
--
-- Reachability: currently NONE. The Art. 18 surface was never wired to a route
-- (2aef1d8 built /api/privacy/export, /delete and /consent, and deliberately
-- left rectify/restrict/object alone). So this is UNBUILT, not broken-in-
-- production. It is built rather than deleted because Art. 18 is a statutory
-- right, the service method already implements it correctly apart from the
-- missing column, and deleting a data-subject right to satisfy a schema audit
-- would be the wrong direction entirely.
--
-- TEXT[] rather than jsonb: the method's signature is `restrictions: string[]`
-- and it writes the array verbatim. A text array keeps that honest and stays
-- queryable with the array operators, where jsonb would invite a shape nobody
-- has specified.
--
-- Additive and idempotent; no default, so an absent value stays NULL and is
-- distinguishable from an explicit empty restriction set.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS processing_restrictions TEXT[];

COMMENT ON COLUMN public.profiles.processing_restrictions IS
  'GDPR Art. 18 restriction of processing. Written by GDPRComplianceService.restrictProcessing(). NULL = no restrictions recorded; empty array = restrictions explicitly cleared.';
