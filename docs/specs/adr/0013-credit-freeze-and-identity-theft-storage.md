# ADR-0013 — Storage for the credit-freeze and identity-theft surfaces

- **Status:** Proposed — needs an owner decision before any route is written
- **Date:** 2026-08-17
- **Blocks:** 6 of the 8 entries in `scripts/web-api-baseline.json`
- **Related:** task #51

## Context

Measured against a live local Supabase on 2026-08-17, not recalled.

Two shipped pages fetch six endpoints that do not exist, and cannot be written,
because there is nowhere to read from:

| Endpoint | Page | Table |
|---|---|---|
| `/api/credit-builder/freeze-status` | `credit-builder/freeze` | none |
| `/api/credit-builder/freeze-history` | `credit-builder/freeze` | none |
| `/api/credit-builder/identity-alerts` | `credit-builder/freeze` | none |
| `/api/credit-builder/identity-theft/accounts` | `credit-builder/identity-theft` | none |
| `/api/credit-builder/identity-theft/documents` | `credit-builder/identity-theft` | `documents` exists |
| `/api/credit-builder/budget` | `credit-builder/budget` | partial |

```
select table_name from information_schema.tables
where table_schema='public' and (table_name like '%freeze%' or table_name like '%identity%');
→ 0 rows
```

Writing routes that return `[]` would make `audit:web-api` green over a product
that does not exist. That is the failure this project already corrected once;
these stay tracked as live 404s until the schema is decided.

The shapes below are **read from the pages**, not invented — they are what the
UI already renders.

## The decision that has to be made first

### D1 — Does Fynvita STORE the credit-freeze PIN? (blocking, security)

`credit-builder/freeze/page.tsx:15-16` declares:

```ts
pin?: string;
confirmationNumber?: string;
```

A credit-freeze PIN is the credential that **lifts** a freeze. Holding it turns
this table into a target whose compromise unfreezes a user's credit at all three
bureaus — strictly worse than leaking the report itself, because it is
actionable by an attacker.

Three options, and I do not think this is close:

1. **Do not store it.** The page shows freeze *state* and links out to each
   bureau. The user keeps their own PIN. `pin` leaves the interface.
2. Store it encrypted at rest with a separate KMS key and an audit trail on
   every read.
3. Store it plainly. Not acceptable; listed only to be ruled out in writing.

**Recommendation: option 1.** Fynvita does not place or lift freezes on the
user's behalf — the page links to each bureau's own site (`freezeUrl`,
`unfreezeUrl`). Nothing in the product needs the PIN, so nothing should hold it.
Option 2 is only worth its cost if we later automate lifting, which is a much
larger decision about acting on a user's credit file.

### D2 — Is freeze status OBSERVED or SELF-REPORTED?

There is no bureau API here that reports freeze state. So `freezeStatus` is
either what the user tells us, or nothing.

**Recommendation: self-reported, and labelled as such in the UI.** A "frozen"
badge the user set themselves is useful as a tracker. The same badge implying we
verified it with Experian is a false claim about their credit file.

### D3 — Do identity-theft documents reuse `documents`?

`public.documents` already exists with `user_id, type, name, s3_key, s3_url,
metadata, tags` and a working upload path.

**Recommendation: reuse it.** Add the six identity-theft values to the `type`
vocabulary rather than building a second document table with its own S3 handling
to keep in sync. `/api/credit-builder/identity-theft/documents` becomes a filter
over `documents`, not a new store.

## Proposed schema, if D1 = option 1 and D2 = self-reported

Not applied. No migration file is added by this ADR, deliberately — a file in
`supabase/migrations/` gets applied, and this is a proposal.

```sql
-- Self-reported freeze state, one row per user per bureau.
create table public.credit_freeze_status (
  user_id     uuid not null references auth.users(id) on delete cascade,
  bureau      text not null check (bureau in ('experian','equifax','transunion')),
  status      text not null check (status in ('frozen','unfrozen','unknown'))
              default 'unknown',
  -- NO pin column. See D1.
  confirmation_number text,          -- the bureau's receipt; not a credential
  reported_at timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (user_id, bureau)
);

-- Append-only; a freeze log the user can show a lender or a court.
create table public.credit_freeze_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  bureau     text not null check (bureau in ('experian','equifax','transunion')),
  action     text not null check (action in ('freeze','unfreeze','temporary_lift')),
  duration_days int,                 -- temporary lifts only
  reason     text,
  occurred_at timestamptz not null default now()
);

create table public.identity_alerts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        text not null check (type in
                ('hard_inquiry','new_account','address_change','suspicious_activity')),
  bureau      text not null,
  description text not null,
  severity    text not null check (severity in ('low','medium','high')),
  occurred_at timestamptz not null default now(),
  acknowledged_at timestamptz
);

create table public.fraudulent_accounts (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  type           text not null check (type in
                   ('credit_card','loan','utility','government','medical','other')),
  creditor       text not null,
  -- Last four only. A full account number on an account the user is
  -- DISPUTING is data we have no use for and every reason not to hold.
  account_mask   text,
  date_opened    date,
  amount_owed    numeric(14,2),
  status         text not null check (status in
                   ('reported','disputed','investigating','resolved','closed'))
                 default 'reported',
  reported_to    text[] not null default '{}',
  dispute_date   date,
  resolution_date date,
  notes          text,
  created_at     timestamptz not null default now()
);
```

Every table follows the convention already in force: grant the `authenticated`
role **nothing**, so a mis-scoped client read fails loudly with 42501 and server
routes reach them with the service role behind `withAuth` (see task #65, where
six client-side reads of `profiles` were doing exactly that).

All four must be added to the GDPR erasure cascade in the same migration.
`erasure-cascade-array-integrity.test.ts` fails otherwise, which is the intended
behaviour — it caught a dropped table once already.

## Consequences

- Until D1–D3 are answered, six endpoints stay in the `audit:web-api` baseline
  as tracked 404s with these reasons attached. The pages render empty states.
- If D1 lands on option 1, the `pin` field must come off the `Bureau` interface
  in `credit-builder/freeze/page.tsx` — the UI currently implies we hold it.
- `/api/credit-builder/budget` is deliberately excluded here. It needs
  incomes/expenses/savings-goals, and only `income_sources` exists; it is a
  budgeting-model decision, not an identity one, and deserves its own ADR.

## Revisit when

- A bureau integration that can OBSERVE freeze state is added — D2 changes.
- The product decides to lift freezes on the user's behalf — D1 reopens, and
  option 2 becomes the minimum bar.
