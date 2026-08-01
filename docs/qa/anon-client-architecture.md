# The anon-key client on server-side code — mapped, mostly unstarted

> 2026-08-01. Every claim below was verified against the running database with
> the commands shown. **Two independent defects are tangled here and they have
> very different blast radii — separating them is the point of this document.**

## The claim I am correcting

Three agents independently reported the same root cause: server-side code uses
the module-level `getSupabase()` singleton (anon key), and therefore gets
**`42501 permission denied`** because `anon` / `authenticated` hold no table
GRANTs. One concluded from this that "net worth stays $0 in production".

The `42501` is real locally. **It is probably not what production does**, and if
we fix for it we will write tests that prove the wrong thing.

## Leg 1 — missing table GRANTs (42501). Most likely a LOCAL artifact.

Verified locally:

```
has_table_privilege('anon','public.transactions','SELECT')          -> false
has_table_privilege('authenticated','public.transactions','SELECT') -> false
has_table_privilege('service_role','public.transactions','SELECT')  -> false

SET ROLE anon; SELECT count(*) FROM public.transactions;
-> ERROR: permission denied for table transactions
```

Note `service_role` is in that list too — so the "just switch to service-role"
fix would *also* fail locally on most tables, and `rolbypassrls` does not help
(RLS bypass and table GRANTs are independent permission layers).

**But the ownership evidence points to a local reset artifact, not a schema
defect:**

```
all 136 public tables      -> owner = postgres
pg_default_acl (postgres,r)-> anon=arwdDxtm, authenticated=arwdDxtm,
                              service_role=arwdDxtm
```

The default ACL is permissive and matches the table owner. `ALTER DEFAULT
PRIVILEGES` only applies to objects created **after** it is set, so the missing
grants mean that ACL post-dates these tables. On hosted Supabase the default
ACLs are configured at project bootstrap, before any user migration runs, so
migration-created tables inherit them.

**Stated honestly: "most likely local-only" — not certain.** It cannot be
confirmed from this repo; it needs one `has_table_privilege` query against the
hosted project. Until someone runs that, treat 42501 as unproven in production.

## Leg 2 — `auth.uid()` is NULL under RLS. REAL, and it fails SILENTLY.

This is the actual defect, and it is worse than the one being reported.

```
transactions, budgets, financial_goals, debt_accounts, profiles
  -> relrowsecurity = true
  -> policy: (auth.uid() = user_id)
```

`getSupabase()` is a **module-level singleton created with the anon key and no
forwarded JWT**. `auth.uid()` is therefore NULL, the policy matches no row, and
PostgREST returns **zero rows with no error at all**.

There is no exception to catch and no error to swallow. A user with data and a
user with none are indistinguishable. This is the same class as every phantom
table in Wave 7 — a confident, wrong answer — except there is not even an
`{error}` object to check.

**This is the real "$0 net worth" mechanism, and it is production-affecting
regardless of how Leg 1 resolves.**

## Why this matters for the tests being written right now

A red-before-green test that asserts a **thrown error / "permission denied"** is
asserting Leg 1 — the local artifact. It will go green after the service-role
conversion, but it will not have proven the production bug.

The correct assertion for Leg 2 is: **pre-fix returns an empty array / zero
total and raises nothing**; post-fix returns the seeded rows.

## Scope — measured, not estimated

```
files importing @/lib/supabase/client (excl. tests)          81
  ... of which issue .from("<table>")                        57
       API routes   12
       lib services 44
       other         1
```

**2 of the 57 are being fixed** (`financial-aggregation-service.ts`,
`plaid-webhook-handler.ts`). A handful more were converted per-file as clusters
touched them (`plaid-service.ts`, `wellness-gate.ts`,
`savings-automation-service.ts`, `savings-optimizer.ts`).

The rest is **mapped and deliberately unstarted.** It is a cross-cutting
architectural pass, not a bug fix, and doing it piecemeal across five concurrent
agents is how conflicting half-conversions get shipped.

## The trap in the fix — read before converting anything

Switching a query to a service-role client **bypasses RLS entirely**. On these
tables RLS was the *only* thing scoping reads to the current user. So every
converted query MUST add an explicit `.eq("user_id", userId)`.

Omitting it converts an RLS-protected read into an **IDOR**. That is not
hypothetical: FND-030 was exactly this defect in `portfolio-service`, where the
`user_id` filter was deliberately omitted and any authenticated user could read
another user's holdings.

So the conversion trades a silent-empty bug for an IDOR unless every single call
site is checked. That is precisely why this should be one deliberate pass with a
reviewer, not 44 opportunistic edits.

## Recommendation

1. **First**, run `has_table_privilege('anon', '<table>', 'SELECT')` against the
   hosted project. That single query decides whether Leg 1 exists at all and
   changes the shape of the work.
2. Fix Leg 2 as one reviewed pass over the 44 lib services, with an IDOR
   checklist per converted call site.
3. Consider making `getSupabase()` throw when imported from server-side code, so
   the next instance of this is a build error rather than a silent zero.

## Method

```bash
grep -rln 'from "@/lib/supabase/client"' src/ --include='*.ts' --include='*.tsx' \
  | grep -v '__tests__'          # 81

psql -At -c "select has_table_privilege('anon','public.transactions','SELECT')"
psql -At -c "select tableowner, count(*) from pg_tables
             where schemaname='public' group by 1"
psql -At -c "select defaclrole::regrole::text, defaclobjtype::text,
                    array_to_string(defaclacl,',') from pg_default_acl"
psql -At -c "select pg_get_expr(polqual, polrelid) from pg_policy p
             join pg_class c on c.oid = p.polrelid where c.relname='transactions'"
```
