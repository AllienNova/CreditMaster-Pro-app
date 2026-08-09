# Wave 7 Phantom-Schema Remediation — Verification Record

> 2026-08-01. Every number below came from a command run against the tree at
> commit `a72c677`, after a full `supabase db reset` from zero, with **no agent
> edits in flight**. That last condition matters: every earlier gate result this
> session — mine included — was taken while five agents were concurrently
> editing, and was therefore scoped, partial, or a snapshot of a moving target.
> This is the first clean measurement.

## Gates

| Gate | Result |
|---|---|
| `supabase db reset` (86 migrations, from zero) | **exit 0**, 0 error lines |
| Duplicate migration versions | **none** |
| `npx tsc --noEmit` | **0 errors** |
| `npx jest` (full, not scoped) | **797/797 suites, 15,460 passed, 0 failed**, 19 skipped |
| `npm run build` (production) | **exit 0** |
| Erasure array integrity | **42/42** |

The `db reset` is the one that mattered most. Roughly 20 of those 86 migrations
landed concurrently from five agents with hand-assigned version numbers, and
version collisions had already broken the chain three times during the session.
Until this run, "the migrations work" was only ever demonstrated incrementally
against an already-populated database — which is a different and much weaker
claim than "the chain applies from zero".

## Where the numbers landed

| Metric | Session start | Now |
|---|---:|---:|
| Phantom tables (referenced, never migrated) | 147 | **15** |
| Live tables in the schema | 101 | **188** |
| User-data tables registered for GDPR erasure | 112 | **147** |
| Unregistered user-data tables | 35 | **0** |
| Phantom-column hits | unmeasured | 53 |
| Net lines | — | **≈ −25,000** |

**Erasure coverage is now complete.** Every table in the live schema carrying a
`user_id` is either registered in `delete_user_data_cascade` or is one of four
deliberate, documented exclusions:

- `payments` — revenue ledger; `user_id` is `ON DELETE SET NULL` so the
  financial record outlives the person (Art. 17(3)(b)/(e)).
- `analytics_events` — same pattern, to retain anonymised aggregates.
- `audit_logs` — security trail holding `ip_address`, `user_agent`, `actor_email`.
- `tax_audit_log` — statutory retention.

The last two remain an **open owner decision**, restated here because it is the
one compliance gap this work did not close: after an Art. 17 erasure, a user's
IP address, user agent and email REMAIN in `audit_logs`, and their IP plus
tax-field history in `tax_audit_log`. Recommended resolution is
pseudonymisation — null the `user_id` and redact the identifiers while keeping
the event row — rather than either deletion or silent retention.

## What is honestly NOT verified

- **53 phantom-column hits across 19 tables remain untriaged.** The count is a
  floor and includes known false positives (`select("count")` is a PostgREST
  aggregate idiom, not a column). See `scripts/audit-phantom-columns.js` for its
  documented limits — regex not AST, literal table names only, spreads
  unresolved, `select("*")` invisible.
- **15 phantom tables remain**, including `pctt_positions`, which is
  deliberately unresolved: its only constructors live in a directory that
  deploys as a separate Fly.io app, so reachability is not decidable from this
  repo. A guess there would be worse than an honest gap.
- **No end-to-end run against a seeded database.** Everything is verified by
  schema introspection plus mocked units. The GDPR export, the erasure RPC, and
  the revenue ledger have never been exercised against real rows with a real JWT.
- **The 44-file anon-client pass is mapped and unstarted** — see
  `docs/qa/anon-client-architecture.md`. It carries IDOR risk on every converted
  call site and wants a reviewer.
- **The orphaned payout stack is undecided** — see
  `docs/qa/orphaned-payout-stack.md`, now with the added finding that
  `payment-router.ts` expects a different shape on the same `payments` table
  name the revenue ledger now occupies.
- **`npm audit` was not run.** It is a pre-existing launch condition
  (32 vulnerabilities, 1 critical) and nothing this session touched it.

## Method note worth keeping

Three claims I published during this session turned out to be wrong, and the
pattern in all three was identical: **I verified the thing I was looking at and
not the thing beside it.**

1. Accused an agent of a bare `git stash`; it was correctly pathspec-scoped, and
   I had misread `git stash show --stat`.
2. Wrote "no test file exists" for a route whose test lived in the parent
   directory rather than the route's own.
3. Declared the Art. 15 export fixed after repairing its phantom *table*, while
   three phantom *columns* in the same function still broke it.

The mechanical checks in `scripts/audit-phantom-columns.js` and the live-schema
introspection diff exist because attention does not scale and does not repeat
reliably. Both found defects that careful reading — mine and four agents' — had
walked past. Prefer the check over the second look.
