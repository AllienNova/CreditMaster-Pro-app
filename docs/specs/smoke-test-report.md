# Smoke Test Report — Fynvita

- **Date:** 2026-08-09
- **Commit:** `61a4460` on `main` (after merging PR #3 and PR #4)
- **Environment:** local Supabase (API `http://127.0.0.1:54321`, DB `:54322`), Next.js dev server on `:3001`
- **Method:** commands executed and output read. Nothing below is inferred.

> Port note: `:3000` was held by an unrelated Docker container serving a LibreChat admin panel. The first smoke run hit that and produced a misleading 404/200 pattern for Fynvita routes. Next bound to `:3001`. Any future run must confirm which process owns the port before trusting a result.

---

## 1. Gate commands

| Gate | Command | Result | Evidence |
|---|---|---|---|
| Types | `npx tsc --noEmit` | **PASS** | 0 errors |
| Lint | `npm run lint` | **PASS** | 0 errors |
| Tests | `npx jest` | **PASS** | 820 suites passed, 2 skipped; 16,599 tests passed, 19 skipped |
| Build | `npm run build` | **PASS** | exit 0 |
| Migrations | `npx supabase db reset` | **PASS** | applies clean from zero |
| Auth coverage | `npm run audit:auth` | **PASS** | 305/305 routes match their CSV guard |
| IDOR | `npm run audit:idor` | **PASS** | 0 unscoped non-insert queries |
| Phantom columns | `audit-phantom-columns.js` vs **live** schema | **PASS** | 0 hits |

> `supabase db reset` **exits 0 even when a migration fails** — the error appears only in stdout. Its exit code cannot be used as a gate. Verified: an earlier run printed `LegacyMigrationApplyError` and still returned 0.

---

## 2. Application runtime

Unauthenticated:

| Route | Status | Note |
|---|---|---|
| `/` | 200 | 416 KB, title "Fynvita — The Premier Financial Wellness Platform…" |
| `/pricing` | 200 | 81 KB |
| `/about` | 200 | |
| `/dashboard`, `/badges`, `/credit` | 307 | redirect to login — auth guard working as intended |
| `/api/health` | 200 | components: database, cache, stripe, supabase all `healthy` |
| `/api/financial/goals`, `/api/notifications`, `/api/admin/metrics` | 401 | guard rejects unauthenticated |

Authenticated with a genuine Supabase **ES256** access token:

| Route | Status | Body |
|---|---|---|
| `/api/notifications` | 200 | `{"notifications":[],"unreadCount":0}` |
| `/api/gamification/achievements` | 200 | restored route, reading the new tables |
| `/api/financial/budgets` | 200 | `{"success":true,"data":[],"count":0}` |
| `/api/activity` | 200 | `{"activities":[]}` |
| `/api/privacy/export` | 200 | returns a real export payload |

**Visual:** homepage screenshot captured at `~/.claude/screenshots/Fynvita/current/web/home.png` (505 KB) — full branding, navigation, hero, product imagery, no error state. `pricing.png` (198 KB) likewise.

---

## 3. Defects this smoke test found that every gate had missed

All four were present while types, lint, 16,599 tests and the build were green.

| # | Defect | Evidence | Why the suite could not catch it |
|---|---|---|---|
| 1 | **Signup was broken.** `POST /auth/v1/admin/users` → 500 `Database error creating new user` | Postgres log: `supabase_auth_admin@postgres ERROR: relation "profiles" does not exist at character 8`. Cause: `sync_user_email_to_profile()` used unqualified `profiles`; GoTrue's role has no `public` in `search_path`. | Tests mock the DB. A direct `psql` probe also passed — `postgres` *does* have `public` in its path, which made the first probe actively misleading. |
| 2 | **Every authenticated request 401'd.** | `jose` verify: `invalid algorithm`. Token header `{"alg":"ES256","kid":"…"}`, payload has `sub`, no `userId`. Validator required HS256 + a `userId` claim. | The 611-test negative-auth suite only asserts that *unauthenticated* requests are rejected. No test ever presented a real token. |
| 3 | **`audit:auth` was failing** — 11 offenders on a gate the launch checklist marks BLOCKING. | `audit:auth FAILED - 11 offender(s) across 305 API routes` | The gate exists but was not being run. |
| 4 | **`service_role` could not read 163 relations.** | PostgREST: `{"code":"42501","message":"permission denied for table notifications"}`. Migrations run as `postgres`, which does not inherit Supabase's default privileges. | Tests mock the Supabase client, so a missing GRANT cannot fail them. |

Fixes landed in `e237cb2`. Re-verified: all gates above green, all endpoints 200.

---

## 4. The strongest single piece of evidence

`src/lib/financial/__tests__/financial-aggregation-service.integration.test.ts` had been **silently skipping**. Its own header names the cause: *"local Supabase Auth cannot create users … skipping real-DB proof"* — which is defect 1 above.

With signup fixed, it runs. All 6 cases pass against a real Postgres:

- resolves a real, non-zero net worth from a seeded account (the `$0 net worth` bug)
- resolves the real seeded user profile
- resolves real seeded debt
- resolves real seeded credit score
- resolves real seeded investment portfolio
- resolves real seeded financial goals

This converts the anon-client→service-role migration from *argued* to *observed*.

---

## 5. What was NOT tested

Stated plainly rather than implied by omission.

- **Mobile.** No Expo build, no simulator run, no mobile test execution. Mobile coverage remains 0%.
- **Hosted environments.** Everything here is a local Supabase. Nothing proves the hosted staging or production schema matches `supabase/migrations/`.
- **The 34 restored orphan modules.** Not exercised at runtime — they have no importer, and 63 of the tables they query do not exist.
- **Provider sandboxes.** No TrueLayer or Stripe sandbox round-trip. Gate D is untested.
- **The HS256 legacy branch** of JWT validation — only the ES256/JWKS path was exercised live.
- **Browser interaction.** Screenshots only; no click-through, form submission, or console-error capture.
- **Load, performance, accessibility.** Not attempted.

---

## Revision History

| Date | Change |
|---|---|
| 2026-08-09 | Created. Post-merge verification of `main` @ `61a4460`, including the four defects found by running the app and the six now-live integration proofs. |
