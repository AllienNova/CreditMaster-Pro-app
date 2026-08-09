# Foundation Block (Wave 7 Phase 0 + Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the Wave 7 prerequisites and rebuild the auth/RBAC layer so every API route is authenticated by default and every authorization decision uses a database-sourced role — the unblocking foundation every MVP vertical sits on.

**Architecture:** Phase 0 publishes an honest re-baseline and stands up safety rails (branch policy, feature flags, lint guards). Phase 1 rebuilds auth on one principle: **the JWT establishes verified identity (`user.id`); the role is looked up fresh from the `profiles` table on every request.** JWT role claims and `user_metadata`/`app_metadata` are never trusted for authorization. All 294 API routes are wrapped in `withAuth`/`withRole`, and `src/middleware.ts` flips `/api/*` from allow-all to deny-by-default against an explicit `PUBLIC_ROUTES` allowlist.

**Tech Stack:** Next.js 15 App Router, TypeScript 5.7 strict, Supabase (Auth + Postgres + RLS), Jest + ts-jest (`@jest-environment node` for route tests), Upstash Redis.

**Scope:** Foundation block only. The 6 verticals and 3 cross-cutting tracks are planned just-in-time per the roadmap spec (`docs/superpowers/specs/2026-05-15-mvp-launch-roadmap-design.md`).

**Closes (CRITICAL):** FND-001, 002, 003, 004, 005, 006, 041, 042, 043, 044, 049, 050, 051 (13 of the enumerated 32). **Closes (HIGH):** FND-007, 008, 009, 010, 011, 012, 013.

---

## File Structure

| File | Responsibility | Action |
|------|----------------|--------|
| `src/lib/auth/roles.ts` | **New.** Single source of role types + hierarchy. Replaces the 3 conflicting definitions. | Create |
| `src/lib/auth/resolve-role.ts` | **New.** `resolveRoleFromDb(userId)` — the one trusted role lookup (`profiles.role`); module-level client + short-TTL cache. | Create |
| `src/lib/auth/api-guard.ts` (`AuthedUser`) | **New exported type** `{ id; email; role: Role }` — the shape handlers receive after AUTH-01. | Create (in api-guard) |
| `src/lib/auth/session.ts` | `getUser`/`getUserRole` — role via `resolveRoleFromDb`, not `user_metadata`. | Modify |
| `src/lib/auth/api-guard.ts` | `withAuth`/`withRole`/`withPermission` resolve role from DB per-request, not from the JWT claim. | Modify |
| `src/lib/auth/rbac.ts` | RBAC permission model; imports `Role` from `roles.ts`; internal `getUserRole` drops claim fallbacks. | Modify |
| `src/lib/security/auth-middleware.ts` | Imports `Role` from `roles.ts`; `validateAPIKey` no longer mints an `enterprise` user. | Modify |
| `src/app/api/admin/auth/route.ts` | Admin status from `profiles.role === 'admin'`; whitelist + enterprise-grant deleted. | Modify |
| `src/lib/auth/PUBLIC_ROUTES.ts` | **New.** Explicit allowlist of unauthenticated API paths. | Create |
| `src/middleware.ts` | `/api/*` deny-by-default; admin branch reads `profiles.role`. | Modify |
| `src/lib/flags/` | **New.** Supabase-backed feature-flag reader. | Create |
| `src/lib/security/redis-rate-limiting.ts` | The single surviving rate limiter. | Keep |
| `src/lib/rate-limit.ts`, `src/lib/security/rate-limiting.ts`, `src/lib/security/rate-limiter.ts` | Redundant rate limiters. | Delete |
| `scripts/verify-auth-coverage.ts` | **New.** CI audit: every route is guarded or in `PUBLIC_ROUTES`. | Create |
| `eslint-rules/no-math-random-in-prod.js` | **New.** Custom lint rule. | Create |
| `supabase/migrations/*_feature_flags.sql` | **New.** `feature_flags` table. | Create |

**Test conventions (match existing — verified against `src/app/api/financial/goals/__tests__/route.test.ts`):** route tests use `/** @jest-environment node */`, `jest.mock("@/lib/auth/jwt-validation")` before importing the handler, and `(jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({ valid, user })`. Run: `npm test`. Type-check: `npm run type-check`.

---

# Phase 0 — Immediate Prereqs

Procedural tasks list a checklist; code tasks use bite-sized TDD steps.

### Task PRE-01: Honest re-baseline

**Files:** Modify `docs/ssot/health_metrics.md`, `SSOT.md`, `CLAUDE.md`, `gap_analysis.md`.

- [ ] **Step 1: Re-run all gates, capture output**
```bash
npm run lint 2>&1 | tee /tmp/rebaseline-lint.txt
npm run type-check 2>&1 | tee /tmp/rebaseline-types.txt
npm test 2>&1 | tail -30 | tee /tmp/rebaseline-test.txt
npm run build 2>&1 | tail -20 | tee /tmp/rebaseline-build.txt
npm audit 2>&1 | tee /tmp/rebaseline-audit.txt
```
- [ ] **Step 2:** Update `health_metrics.md` with the captured numbers; replace stale VERSION-013 figures.
- [ ] **Step 3:** `SSOT.md` banner → "Wave 7 in flight"; in `CLAUDE.md` remove the "All 7 waves DONE (125/125)" line and the stale §9 numbers.
- [ ] **Step 4:** Mark the 125 Waves 0–6 tasks `NEEDS_VERIFICATION` except those with a linked passing integration test. **Reconcile the CRITICAL-count off-by-one** (the explicit Exit-Criteria-1 list enumerates 32 but is labelled "33") — find the dropped finding or correct the count; record the resolution.
- [ ] **Step 5: Commit** — `git commit -m "docs(ssot): TASK-PRE-01 honest re-baseline; reconcile CRITICAL count"`.

### Task PRE-02: Branch + freeze policy (procedural)

- [ ] **Step 1:** Establish the `remediation/wave-7-*` branch namespace; document in `SECURITY.md`.
- [ ] **Step 2:** Protect `main` — only `hotfix/*` and `remediation/*` PRs; require 1 review.
- [ ] **Step 3:** `.github/CODEOWNERS` gating `src/lib/auth/`, `src/lib/security/`, `src/lib/commerce/`, `src/lib/payment/`, `supabase/migrations/` to a SEC reviewer.
- [ ] **Step 4:** `.github/pull_request_template.md` with a required "FND-### addressed" field + test-class checkboxes.
- [ ] **Step 5: Commit** — `chore: TASK-PRE-02 branch protection + CODEOWNERS + PR template`.

### Task PRE-04: Communication + incident channel (procedural)

- [ ] **Step 1:** Create `SECURITY.md` — vuln-reporting policy, per-phase rollback playbook, chunked-push procedure.
- [ ] **Step 2:** Create the private "wave-7-remediation" channel; note standup cadence in `SECURITY.md`.
- [ ] **Step 3: Commit** — `docs: TASK-PRE-04 add SECURITY.md + rollback playbook`.

### Task PRE-03: Feature-flag infrastructure

**Files:** Create `supabase/migrations/20260516000000_feature_flags.sql`, `src/lib/flags/index.ts`, `src/lib/flags/types.ts`; Test `src/lib/flags/__tests__/index.test.ts`.

- [ ] **Step 1: Write the migration** `20260516000000_feature_flags.sql`:
```sql
create table if not exists public.feature_flags (
  key text primary key,
  enabled boolean not null default false,
  description text,
  updated_at timestamptz not null default now()
);
alter table public.feature_flags enable row level security;
revoke all on public.feature_flags from public, anon, authenticated;
grant select on public.feature_flags to service_role;
-- No anon/authenticated policy by design: flags are ONLY read via the
-- service-role client (see src/lib/flags/index.ts). A non-service-role read
-- returns empty → flags default false. The AUTH-04 kill-switch depends on a
-- service-role read; see Step 6.
insert into public.feature_flags (key, enabled, description) values
  ('auth.deny_by_default', false, 'Wave 7 AUTH-04 kill-switch'),
  ('webhooks.enabled', true, 'Webhook processing kill-switch'),
  ('payouts.enabled', true, 'Payout processing kill-switch')
on conflict (key) do nothing;
```

- [ ] **Step 2: Write the failing test** `src/lib/flags/__tests__/index.test.ts` — uses an injectable clock so the cache test is deterministic (no wall-clock reliance):
```ts
/** @jest-environment node */
const mockFrom = jest.fn();
jest.mock("@supabase/supabase-js", () => ({ createClient: () => ({ from: mockFrom }) }));
import { isFlagEnabled, __clearFlagCache, __setNow } from "../index";

const ok = (enabled: boolean) => ({
  select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { key: "x", enabled }, error: null }) }) }),
});

describe("isFlagEnabled", () => {
  beforeEach(() => { jest.clearAllMocks(); __clearFlagCache(); __setNow(() => 1_000); });

  it("returns the flag value from the database", async () => {
    mockFrom.mockReturnValue(ok(true));
    expect(await isFlagEnabled("auth.deny_by_default")).toBe(true);
  });
  it("defaults to false when the flag row is missing", async () => {
    mockFrom.mockReturnValue({ select: () => ({ eq: () => ({ single: () =>
      Promise.resolve({ data: null, error: { code: "PGRST116" } }) }) }) });
    expect(await isFlagEnabled("auth.deny_by_default")).toBe(false);
  });
  it("caches within the TTL (second call does not hit the database)", async () => {
    mockFrom.mockReturnValue(ok(true));
    await isFlagEnabled("webhooks.enabled");
    __setNow(() => 1_500);                       // +500ms, within 1000ms TTL
    await isFlagEnabled("webhooks.enabled");
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });
  it("re-reads after the TTL expires", async () => {
    mockFrom.mockReturnValue(ok(true));
    await isFlagEnabled("payouts.enabled");
    __setNow(() => 2_500);                       // +1500ms, past TTL
    await isFlagEnabled("payouts.enabled");
    expect(mockFrom).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 3: Run — expect FAIL** (`npm test -- src/lib/flags`).

- [ ] **Step 4: Implement** `types.ts` (`export type FlagKey = "auth.deny_by_default" | "webhooks.enabled" | "payouts.enabled";`) and `index.ts`:
```ts
import { createClient } from "@supabase/supabase-js";
import type { FlagKey } from "./types";

const CACHE_TTL_MS = 1_000;
const cache = new Map<string, { value: boolean; at: number }>();
let now: () => number = () => Date.now();

export function __clearFlagCache(): void { cache.clear(); }
export function __setNow(fn: () => number): void { now = fn; }

export async function isFlagEnabled(key: FlagKey): Promise<boolean> {
  const hit = cache.get(key);
  if (hit && now() - hit.at < CACHE_TTL_MS) return hit.value;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,   // service-role: bypasses RLS
  );
  const { data } = await supabase.from("feature_flags").select("key, enabled").eq("key", key).single();
  const value = data?.enabled ?? false;
  cache.set(key, { value, at: now() });
  return value;
}
```

- [ ] **Step 5: Run — expect PASS** (4 passing).

- [ ] **Step 6: Add a boot-time reachability assertion.** In the app's server bootstrap (or a `src/lib/flags/assert-reachable.ts` called at startup), call `isFlagEnabled("webhooks.enabled")` once and **throw** if the Supabase call errors — so a misconfigured `SUPABASE_SERVICE_ROLE_KEY` fails loudly instead of silently defaulting every flag (incl. the AUTH-04 kill-switch) to `false`.

- [ ] **Step 7: Commit** — `feat: TASK-PRE-03 Supabase-backed feature flags`.

### Task PRE-05: Lint guards + Wave 7 test/audit npm scripts

**Files:** Create `eslint-rules/no-math-random-in-prod.js`; modify ESLint config, `package.json`, CI workflow.

- [ ] **Step 1:** Write `eslint-rules/no-math-random-in-prod.js` — flags `Math.random()` outside `__tests__/` and `src/lib/random/`.
- [ ] **Step 2:** Wire it as a plugin rule at **warning** severity; add `no-restricted-imports` blocking `**/__mocks__/**` and `**/*.fixture.*` from non-test files.
- [ ] **Step 3:** Add the CI grep step (reports only): `rg -n 'Math\.random\(|faker\.|mockData|MOCK_' src/ --glob '!**/__tests__/**' --glob '!**/*.test.*' || true`.
- [ ] **Step 4: Add the Wave 7 npm scripts** to `package.json` (the Phase 1 gate needs `test:auth-negative`, which does not exist yet):
```json
"test:auth-negative": "jest --testPathPattern='api/.*/__tests__/.*route\\.test\\.ts$' -t 'negative-auth'",
"audit:auth": "tsx scripts/verify-auth-coverage.ts"
```
Negative-auth tests are tagged by wrapping them in `describe("negative-auth", ...)` so `-t 'negative-auth'` selects exactly them and the count is meaningful (see AUTH-03 Step B and the ≥568 derivation there).
- [ ] **Step 5:** `npm run lint` — confirm the rule loads at warning level.
- [ ] **Step 6: Commit** — `feat: TASK-PRE-05 lint guards + Wave 7 test/audit scripts`.

### Task PRE-06: Branch hygiene (procedural)

- [ ] **Step 1:** `git rm strativion-autonomous-trading-package.zip` (24 MB).
- [ ] **Step 2:** Document the chunked-push procedure in `SECURITY.md`; note `git filter-repo` history-purge needs a separate maintainer consultation (do not rewrite shared history unprompted).
- [ ] **Step 3:** Verify `test ! -f strativion-autonomous-trading-package.zip && echo gone`.
- [ ] **Step 4: Commit** — `chore: TASK-PRE-06 remove 24MB zip from tree`.

### Task PRE-07: Security re-review of 92 prior commits (procedural)

- [ ] **Step 1:** `git log feat/asset-system-regen ^main --stat` — list commits touching `src/lib/auth/`, `src/lib/security/`, `src/lib/payment/`, `src/lib/commerce/`, `src/middleware.ts`, `supabase/migrations/`.
- [ ] **Step 2:** Re-read each diff; file latent issues as new `FND-###` in `gap_analysis.md`.
- [ ] **Step 3:** Tracking issue: each commit hash + verdict (CLEAN / FOLLOWUP / RE-FIX); SEC sign-off.
- [ ] **Step 4: Commit** — `docs: TASK-PRE-07 security re-review of 92 commits`.

**Phase 0 gate:** re-baseline published; branch protection + CODEOWNERS live; feature flags + lint guards + Wave 7 npm scripts merged; 24 MB zip gone; 92-commit re-review signed off.

---

# Phase 1 — Auth/RBAC Rebuild

### Task AUTH-12: Single source of role types

> Sequenced first — AUTH-01/02/05 import from it.

**Files:** Create `src/lib/auth/roles.ts`; Test `src/lib/auth/__tests__/roles.test.ts`; Modify `src/lib/auth/rbac.ts:10`, `src/lib/security/auth-middleware.ts:41,50`, `src/lib/auth/api-guard.ts:104` (role union in `withRole`'s signature) **and** `:123` (the inline hierarchy array).

- [ ] **Step 1: Write the failing test** `roles.test.ts`:
```ts
import { ROLES, roleRank, isAtLeast } from "../roles";
describe("roles", () => {
  it("defines exactly the four canonical roles", () => {
    expect([...ROLES].sort()).toEqual(["admin", "premium", "super_admin", "user"]);
  });
  it("ranks user < premium < admin < super_admin", () => {
    expect(roleRank("user")).toBeLessThan(roleRank("premium"));
    expect(roleRank("premium")).toBeLessThan(roleRank("admin"));
    expect(roleRank("admin")).toBeLessThan(roleRank("super_admin"));
  });
  it("isAtLeast is true when actual meets or exceeds required", () => {
    expect(isAtLeast("admin", "premium")).toBe(true);
    expect(isAtLeast("user", "admin")).toBe(false);
  });
});
```
- [ ] **Step 2: Run — expect FAIL.**
- [ ] **Step 3: Implement `roles.ts`:**
```ts
export const ROLES = ["user", "premium", "admin", "super_admin"] as const;
export type Role = (typeof ROLES)[number];
const RANK: Record<Role, number> = { user: 0, premium: 1, admin: 2, super_admin: 3 };
export function roleRank(role: Role): number { return RANK[role]; }
export function isAtLeast(actual: Role, required: Role): boolean { return RANK[actual] >= RANK[required]; }
export function isRole(v: unknown): v is Role { return typeof v === "string" && (ROLES as readonly string[]).includes(v); }
```
- [ ] **Step 4: Run — expect PASS.**
- [ ] **Step 5: Migrate all definitions.** `rbac.ts:10`, `auth-middleware.ts:41,50`, and `api-guard.ts:104` (the `withRole` parameter union) + `:123` (the hierarchy array) all `import { Role, isAtLeast } from "@/lib/auth/roles"`. **`enterprise` is removed everywhere** — replace each `enterprise` reference with `premium`. Run `npm run type-check`; fix every error.
- [ ] **Step 6: Run TASK-DEFER-COMPILE** (below) — the role-type change is shared surface; deferred trading/commerce code may reference `enterprise`.
- [ ] **Step 7: Run `npm test`** — 0 failures. **Commit** — `refactor: TASK-AUTH-12 single source of role types (FND-012)`.

### Task DEFER-COMPILE: deferred-code compile guard (standing task)

> Created here per roadmap spec §4.2 / D1. Run as the **last step of every Phase 1 task that touches shared surface** (AUTH-12, AUTH-01, AUTH-05, AUTH-06, every AUTH-03 sub-batch).

- [ ] **Step 1:** `npx tsc --noEmit` over the whole project (compiles flag-gated/deferred trading + commerce code too).
- [ ] **Step 2:** Fix any compile error in deferred `src/app/api/trading/**`, `src/app/api/marketplace/**`, `src/app/api/affiliate/**` or their `src/lib/**` deps — caused by the shared-surface change. Do **not** delete or `.skip` deferred code; fix it.
- [ ] **Step 3:** Include the fixes in the same task's commit/PR; note "DEFER-COMPILE: clean" in the PR description.

### Task AUTH-01: Role resolved from the database on every request (FND-005)

> This is the load-bearing task. It is not enough to fix `session.ts` — the live API authorization path (`withAuth`/`withRole`/`withPermission`/`rbac`) currently trusts the **JWT role claim**, which a forged or stale token controls. AUTH-01 makes `profiles.role` the single trusted source for *every* authorization decision.

**Files:** Create `src/lib/auth/resolve-role.ts`; Modify `src/lib/auth/session.ts:31-67,94-97`, `src/lib/auth/api-guard.ts:40-139`, `src/lib/auth/rbac.ts:304-327`; Test `src/lib/auth/__tests__/resolve-role.test.ts`, `src/lib/auth/__tests__/api-guard.test.ts`.

- [ ] **Step 1: Write the failing test for `resolveRoleFromDb`** (`resolve-role.test.ts`):
```ts
/** @jest-environment node */
const mockFrom = jest.fn();
jest.mock("@supabase/supabase-js", () => ({ createClient: () => ({ from: mockFrom }) }));
import { resolveRoleFromDb, __clearRoleCache, __setNow } from "../resolve-role";

const profile = (role: string | null) => ({
  select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { role }, error: null }) }) }),
});

describe("resolveRoleFromDb", () => {
  beforeEach(() => { jest.clearAllMocks(); __clearRoleCache(); __setNow(() => 1_000); });

  it("returns the role from the profiles table", async () => {
    mockFrom.mockReturnValue(profile("admin"));
    expect(await resolveRoleFromDb("u1")).toBe("admin");
  });
  it("defaults to 'user' when the profile has no role", async () => {
    mockFrom.mockReturnValue(profile(null));
    expect(await resolveRoleFromDb("u1")).toBe("user");
  });
  it("defaults to 'user' on an unknown role value (never trusts arbitrary strings)", async () => {
    mockFrom.mockReturnValue(profile("hacker"));
    expect(await resolveRoleFromDb("u1")).toBe("user");
  });
  it("caches per userId within the TTL (one DB call for repeated lookups)", async () => {
    mockFrom.mockReturnValue(profile("admin"));
    await resolveRoleFromDb("u1");
    __setNow(() => 6_000);                       // +5s, within 15s TTL
    await resolveRoleFromDb("u1");
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });
  it("re-reads after the TTL expires (bounds demotion staleness)", async () => {
    mockFrom.mockReturnValue(profile("admin"));
    await resolveRoleFromDb("u1");
    __setNow(() => 20_000);                      // +19s, past 15s TTL
    await resolveRoleFromDb("u1");
    expect(mockFrom).toHaveBeenCalledTimes(2);
  });
});
```
- [ ] **Step 2: Run — expect FAIL.**
- [ ] **Step 3: Implement `resolve-role.ts`** — module-level client (not re-constructed per request) + a 15s per-`userId` cache so an authenticated request does ~1 lookup, not N:
```ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isRole, type Role } from "./roles";

const ROLE_CACHE_TTL_MS = 15_000;
const cache = new Map<string, { role: Role; at: number }>();
let client: SupabaseClient | null = null;
let now: () => number = () => Date.now();

export function __clearRoleCache(): void { cache.clear(); }
export function __setNow(fn: () => number): void { now = fn; }

function getClient(): SupabaseClient {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,   // service-role: bypasses RLS
    );
  }
  return client;
}

export async function resolveRoleFromDb(userId: string): Promise<Role> {
  const hit = cache.get(userId);
  if (hit && now() - hit.at < ROLE_CACHE_TTL_MS) return hit.role;
  const { data } = await getClient().from("profiles").select("role").eq("id", userId).single();
  const role: Role = isRole(data?.role) ? data!.role : "user";
  cache.set(userId, { role, at: now() });
  return role;
}
```
**Accepted tradeoff:** a role demotion takes effect within ≤15s (the TTL), not instantly. This is strictly better than the status quo (JWT claim stale until token expiry, ~1h) and acceptable for this app. Document it in `SECURITY.md`.

- [ ] **Step 4: Run — expect PASS** (5 passing, incl. the two cache tests).

- [ ] **Step 5: Write the failing `api-guard` test** (`api-guard.test.ts`) — the actual FND-005 attack: a JWT that *claims* admin must be denied admin when `profiles` says `user`:
```ts
/** @jest-environment node */
import * as jwtValidation from "@/lib/auth/jwt-validation";
jest.mock("@/lib/auth/jwt-validation");
const mockResolve = jest.fn();
jest.mock("@/lib/auth/resolve-role", () => ({ resolveRoleFromDb: (...a: unknown[]) => mockResolve(...a) }));
import { withRole, withPermission } from "../api-guard";
import { NextResponse } from "next/server";

const handler = withRole("admin", async () => NextResponse.json({ ok: true }));
const req = () => new Request("http://t/api/admin/x") as never;

describe("withRole — DB-sourced role", () => {
  beforeEach(() => jest.clearAllMocks());
  it("DENIES (403) a JWT that claims admin when profiles.role is 'user'", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true, user: { id: "u1", email: "e", role: "admin" },   // forged/stale claim
    });
    mockResolve.mockResolvedValue("user");                          // DB truth
    expect((await handler(req())).status).toBe(403);
  });
  it("ALLOWS (200) when profiles.role is 'admin'", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true, user: { id: "u1", email: "e", role: "user" },
    });
    mockResolve.mockResolvedValue("admin");
    expect((await handler(req())).status).toBe(200);
  });
  it("returns 401 when the JWT is invalid", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({ valid: false, user: null });
    expect((await handler(req())).status).toBe(401);
  });
});

// withPermission must also use the DB role — real rbac, no rbac mock.
describe("withPermission — DB-sourced role", () => {
  const permHandler = withPermission("admin:read", async () => NextResponse.json({ ok: true }));
  beforeEach(() => jest.clearAllMocks());

  it("DENIES (403) a JWT claiming admin when profiles.role is 'user'", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true, user: { id: "u1", email: "e", role: "admin" },
    });
    mockResolve.mockResolvedValue("user");
    expect((await permHandler(req())).status).toBe(403);
  });
  it("ALLOWS (200) when profiles.role grants the permission", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true, user: { id: "u1", email: "e", role: "user" },
    });
    mockResolve.mockResolvedValue("admin");
    expect((await permHandler(req())).status).toBe(200);
  });
});
```
(Use a real admin-category permission name from `rbac.ts` for `"admin:read"` — verify it exists.)

- [ ] **Step 6: Run — expect FAIL** (current `withRole`/`withPermission` rank `validation.user.role` — the claim — so the forged-admin tests return 200).

- [ ] **Step 7: Rewrite `api-guard.ts`.**
  - **Define and export the handler-facing user type:** `export type AuthedUser = { id: string; email: string; role: Role };` (`Role` from `roles.ts`). Change `AuthenticatedHandler`'s second parameter from `JWTUser` to `AuthedUser`.
  - After `validateFromHeaders` confirms `valid` + `user.id`, **discard the JWT `role` claim** and call `const role = await resolveRoleFromDb(user.id)`. Build `const authedUser: AuthedUser = { id: user.id, email: user.email, role }`.
  - `withAuth` passes `authedUser` to the handler. `withRole(required, ...)` compares `isAtLeast(authedUser.role, required)` → 403 on fail. `withPermission(perm, ...)` calls `rbac.hasPermission(authedUser, perm)` — **passing `authedUser` (DB role), never `validation.user` (JWT claim)**; this ordering is load-bearing for FND-005 on the `withPermission` path.
  - `withOptionalAuth`: when a valid JWT is present it must also resolve the DB role into `authedUser` (so optional-auth routes that branch on role are not claim-trusting); when absent it passes `null`.

- [ ] **Step 8: Fix `session.ts` and `rbac.ts`.** `session.ts` `getUser()` stops setting `role` from `user_metadata` (line 59); `getUserRole()` delegates to `resolveRoleFromDb`. In `rbac.ts:304-327`, delete the `user.role` / `app_metadata.role` / `user_metadata.role` fallbacks — `rbac` receives the DB-resolved role only.

- [ ] **Step 9: Run — expect PASS;** run `npm test` + `npm run type-check`; run **TASK-DEFER-COMPILE**.

- [ ] **Step 10: Commit** — `fix: TASK-AUTH-01 authorization role resolved from profiles, never the JWT claim (FND-005)`.

### Task AUTH-02: Remove admin email whitelist + enterprise=admin grant

**Files:** Modify `src/app/api/admin/auth/route.ts:16-21,74,83-87`; Test extends `src/app/api/admin/auth/__tests__/route.test.ts`.

- [ ] **Step 1: Write failing tests** — whitelisted email with non-admin profile → not admin; enterprise-tier user → not admin; only `profiles.role === 'admin'` → admin (use the file's existing `mockGetUser`/`mockProfile` helpers).
- [ ] **Step 2: Run — expect FAIL.**
- [ ] **Step 3:** Delete `ADMIN_EMAILS` (16-21), the `.includes()` check (74), the `hasAdminTier`/`enterprise` grant (83-87). Replace with `const isAdmin = profile?.role === "admin";`.
- [ ] **Step 4: Run — expect PASS.**
- [ ] **Step 5: Commit** — `fix: TASK-AUTH-02 admin from profiles.role only (FND-003, FND-004)`.

### Task AUTH-05: Remove AIML key reuse as inbound auth (FND-002)

**Files:** Modify `src/lib/security/auth-middleware.ts:283-312`; Test `src/lib/security/__tests__/auth-middleware.test.ts`.

- [ ] **Step 0: Audit callers** — `grep -rn "validateAPIKey" src/`. Document each caller. Outbound AIML calls (passing the key *out*) are unaffected. If any **inbound** route authenticates via `validateAPIKey`, it must move to `PUBLIC_ROUTES` or get a real credential **before** this task lands, or AUTH-04 will 401 it in prod.
- [ ] **Step 1: Write the failing test** — `validateAPIKey(process.env.AIML_API_KEY)` must return `{ authenticated: false }`.
- [ ] **Step 2: Run — expect FAIL.**
- [ ] **Step 3:** Remove the `process.env.AIML_API_KEY` comparison and the synthetic `role: "enterprise"` user; `validateAPIKey` returns `{ authenticated: false }` until a hashed `api_keys` table exists. (The `enterprise` role member is removed by AUTH-12 — if AUTH-05 lands after AUTH-12 this is already consistent; reconcile in whichever lands second.)
- [ ] **Step 4: Run — expect PASS;** `npm test`; **TASK-DEFER-COMPILE**.
- [ ] **Step 5: Commit** — `fix: TASK-AUTH-05 AIML key is not an auth credential (FND-002)`.

### Task AUTH-06: Consolidate to one rate limiter (FND-013)

**Files:** Keep `src/lib/security/redis-rate-limiting.ts`; Delete `src/lib/rate-limit.ts`, `src/lib/security/rate-limiting.ts`, `src/lib/security/rate-limiter.ts`.

- [ ] **Step 1:** `grep -rl "rate-limit\|rate-limiter\|rate-limiting" src/ --include=*.ts` — list importers.
- [ ] **Step 2:** Repoint each importer to `redis-rate-limiting.ts`; merge the `defaultLimits` presets (`api`, `auth`, `disputes`) into it.
- [ ] **Step 3:** Extend its test — Nth call over the window → blocked.
- [ ] **Step 4:** `git rm` the three redundant files; `npm run type-check` + `npm test`; **TASK-DEFER-COMPILE**.
- [ ] **Step 5: Commit** — `refactor: TASK-AUTH-06 single rate limiter (FND-013)`.

### Tasks AUTH-07 to AUTH-11 (security hardening — TDD each)

- [ ] **AUTH-07** — replace the in-memory session `Map` with the Redis store (or remove if sessions are fully Supabase-managed). Test: session survives a simulated restart. Commit `fix: TASK-AUTH-07 Redis-backed sessions (FND-007)`.
- [ ] **AUTH-08** — `crypto.timingSafeEqual` for every secret comparison (API keys, webhook secrets, CSRF). Test: helper rejects unequal-length buffers, compares constant-time. Commit `fix: TASK-AUTH-08 timing-safe secret comparison (FND-011)`.
- [ ] **AUTH-09** — CSRF secret hard-fail (`throw`) on missing env when `NODE_ENV === "production"`. Test: missing `CSRF_SECRET` in prod throws; in dev warns. Commit `fix: TASK-AUTH-09 CSRF secret hard-fail in prod (FND-008)`.
- [ ] **AUTH-10** — backup-code TOCTOU: single Postgres RPC with `FOR UPDATE` (reuse the `d64e8d5` template). Test: concurrent redemption of one code → exactly one succeeds. Commit `fix: TASK-AUTH-10 atomic backup-code redemption (FND-010)`.
- [ ] **AUTH-11** — atomic signup: profile insert in a DB trigger, or roll back the auth user on failure. Test: a forced profile-insert failure leaves no orphaned auth user. Commit `fix: TASK-AUTH-11 atomic signup (FND-009)`.

### Task AUTH-03: Wrap all 294 API routes (sub-batched a–f)

> 294 route files / 466 HTTP-method handlers. Per-route auth is heterogeneous (bare `getUser()` ×87, `requireRole` ×25, inline `validateFromHeaders`, 3 already on `withAuth`, ~180 unguarded). This task first **classifies** every route, then wraps in batches.

- [ ] **Step 1: Build the route inventory.** Generate `docs/superpowers/auth-route-inventory.csv` — one row per `src/app/api/**/route.ts` with columns: `path, methods, current_authn, current_authz, proposed_guard`.
  - `current_authn` = the existing *authentication* mechanism (bare `getUser()`, inline `validateFromHeaders`, `requireRole`, `withAuth`, none).
  - `current_authz` = any existing *authorization* check — most importantly inline `rbac.hasPermission(...)` calls or `requireRole` role checks. **This column is mandatory** — an inline permission check is NOT redundant with `withAuth` and must not be lost.
  - `proposed_guard` ∈ `withAuth` (authenticated, any role) | `withRole(<role>)` | `withPermission(<perm>)` (when `current_authz` has an inline `rbac.hasPermission`) | `PUBLIC`.
  - **SEC reviews and signs off the CSV before any wrapping** — classification is decided once here, not per-file by the executor.

**Per-route wrapping pattern** (apply per the CSV):

- [ ] **Step A: Wrap the handler and remove the old inline guard.** Convert `export async function GET(req) {...}` to:
```ts
import { withAuth } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";

export const GET = withAuth(async (req, user: AuthedUser) => {
  // existing body. DELETE the route's old inline *authentication* — bare
  // getUser(), jwtValidation.validateFromHeaders, requireRole(...) — and use `user`.
});
```
**Preserve authorization — do not just delete it.** If the CSV's `current_authz` column shows an inline `rbac.hasPermission("x:y", ...)` or a role check, the route's `proposed_guard` must be `withPermission("x:y", ...)` or `withRole(<role>, ...)` — the inline authorization is *promoted into the wrapper*, never dropped. Deleting an inline `rbac.hasPermission` while wrapping in plain `withAuth` silently downgrades a premium/admin-gated route to any-authenticated-user — an authorization regression. Genuinely public routes are not wrapped — they go in `PUBLIC_ROUTES.ts` (AUTH-04).

- [ ] **Step B: Write the negative-auth test** — co-located `__tests__/route.test.ts`, wrapped in `describe("negative-auth", ...)` so `npm run test:auth-negative` selects it:
```ts
/** @jest-environment node */
import * as jwtValidation from "@/lib/auth/jwt-validation";
jest.mock("@/lib/auth/jwt-validation");
jest.mock("@/lib/auth/resolve-role", () => ({ resolveRoleFromDb: jest.fn() }));
import { resolveRoleFromDb } from "@/lib/auth/resolve-role";
import { GET } from "../route";

const req = () => new Request("http://t/api/...") as never;

describe("negative-auth", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 to an anonymous caller", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({ valid: false, user: null });
    expect((await GET(req())).status).toBe(401);
  });

  it("returns 403 to a wrong-role caller", async () => {        // role-gated routes only
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true, user: { id: "u1", email: "e", role: "user" },
    });
    (resolveRoleFromDb as jest.Mock).mockResolvedValue("user");
    expect((await GET(req())).status).toBe(403);
  });
});
```

- [ ] **Step C:** Run the route's tests — expect PASS. Commit per ~10 routes.

**Sub-batch order and gating** (run **TASK-DEFER-COMPILE** after each):

- [ ] **AUTH-03a** — `src/app/api/admin/**` (~25 routes) — FND-049, 050, 051. **SEC review.**
- [ ] **AUTH-03b** — `src/app/api/notifications/**` (~12) — FND-041, 042, 043, 044.
- [ ] **AUTH-03d** — `src/app/api/strategies/**` (~6) — FND-006.
- [ ] **AUTH-03c** — `src/app/api/financial/**`, `credit/**`, `documents/**` (~80).
- [ ] **AUTH-03e** — `src/app/api/trading/**`, `investments/**` (~35). **SEC review.**
- [ ] **AUTH-03f** — remaining `src/app/api/**` (~120).

**≥568-test floor — derivation:** 466 HTTP-method handlers → one 401 (anonymous) test per handler = 466. Plus one 403 (wrong-role) test per role-gated handler (~100+ across admin/trading/investments/etc.) ≈ 466 + ~110 = **≥568 negative-auth tests**. `npm run test:auth-negative` (PRE-05) must report ≥ 568 passing.

### Task AUTH-04 + AUTH-04-staging: Middleware deny-by-default

**Files:** Create `src/lib/auth/PUBLIC_ROUTES.ts`; Modify `src/middleware.ts:159-170` (the `/api/*` allow-all branch) **and** `:186-239` (the admin-role branch); Test `src/__tests__/middleware.test.ts`; Create `scripts/verify-auth-coverage.ts`.

- [ ] **Step 1: Create `PUBLIC_ROUTES.ts`** — explicit allowlist, each entry justified:
```ts
/** API paths reachable without authentication. Every entry needs a reason. SEC-reviewed. */
export const PUBLIC_API_ROUTES: readonly string[] = [
  "/api/health",            // uptime probe
  "/api/auth/login",        // pre-auth
  "/api/auth/signup",       // pre-auth
  "/api/auth/callback",     // OAuth callback
  "/api/csrf",              // CSRF token issuance
  "/api/payment/webhook",   // Stripe — verified by signature, not session
  // plaid + affiliate webhooks added here with justification
] as const;
export function isPublicApiRoute(p: string): boolean {
  return PUBLIC_API_ROUTES.some((r) => p === r || p.startsWith(r + "/"));
}
```
- [ ] **Step 2: Write the failing middleware test** — `/api/*` not in the allowlist + no session → 401; public path → passes; and the admin-branch test: a page request whose session JWT *claims* admin but whose `profiles.role` is `user` does **not** get admin page access.
- [ ] **Step 3: Run — expect FAIL.**
- [ ] **Step 4: Rewrite the `/api/*` branch** (`middleware.ts:159-170`) — remove `pathname.startsWith("/api")` from the allow-all block; for `/api/*`, if `!isPublicApiRoute(pathname)` and no valid session → `401`. Gate the flip behind the flag: `if (await isFlagEnabled("auth.deny_by_default")) { ...enforce... }`.
- [ ] **Step 5: Fix the admin-role branch** (`middleware.ts:186-239`, esp. line 213). It currently reads `user.app_metadata?.role || user.user_metadata?.role` then falls back to a `profiles.role` query at 218-222. **Do not import `resolveRoleFromDb` here** — `middleware.ts` runs in the **Edge runtime** (no `runtime` export) and uses the Edge-safe `@supabase/ssr` cookie-scoped client at `:189`; `resolveRoleFromDb` uses the heavier `@supabase/supabase-js` + service-role key, which risks an Edge bundling/runtime break and widens service-role-key exposure. Instead: **delete the `app_metadata`/`user_metadata` read at line 213 and make the existing `:218-222` `profiles.role` query (via the existing `@supabase/ssr` client) the *only* path** for the admin gate.
- [ ] **Step 6: Run — expect PASS.**
- [ ] **Step 7: Write `scripts/verify-auth-coverage.ts`** — walks every `src/app/api/**/route.ts` and **cross-checks each route's actual wrapper against the SEC-signed `auth-route-inventory.csv` `proposed_guard` column**: a route must be wrapped at the level the CSV specifies (`withAuth`/`withRole`/`withPermission`) or be in `PUBLIC_API_ROUTES`. A route downgraded from `withRole`/`withPermission` to plain `withAuth` **fails** the script — this catches the S9 under-authorization regression, not just missing authentication. Exits non-zero on any mismatch. This is the `audit:auth` script (PRE-05). Add to CI; the CSV becomes a durable committed artifact.
- [ ] **Step 8: AUTH-04-staging** — deploy to staging with `auth.deny_by_default` ON; run synthetic monitoring over all webhooks (Stripe, Plaid, Affiliate), signup, login, OAuth callbacks for **24h green** before flipping the prod flag. Hard sub-gate.
- [ ] **Step 9: Commit** — `feat: TASK-AUTH-04 middleware deny-by-default + admin role from profiles (FND-001)`.

**Phase 1 gate:** `scripts/verify-auth-coverage.ts` exits 0 in CI; the lint rule blocks new routes lacking `withAuth`; SEC sign-off on `PUBLIC_ROUTES.ts` and the route-inventory CSV; `npm run test:auth-negative` ≥ 568 passing; AUTH-04-staging synthetic monitoring green 24h before the prod flag flip.

---

## Verification (run before declaring the Foundation block done)

```
npm run lint                           # 0 errors
npm run type-check                     # 0 errors (whole project, incl. deferred code)
npm test                               # 0 failures
npm run test:auth-negative             # ≥ 568 passing
npm run build                          # exit 0
npm run audit:auth                     # exit 0
npm run test:coverage:changed          # ≥85% on changed lines
```

All 13 Foundation CRITICALs (FND-001–006, 041–044, 049–051) and 7 HIGHs (FND-007–013) closed and evidenced — including the FND-005 attack test (JWT claims admin, `profiles` says user → 403). Then the Payments vertical plan is authored just-in-time per the roadmap spec.

---

## Revision Note (2026-05-16)

Revised after an adversarial plan review. Blocking fixes:
- **B1** — AUTH-01 rewritten: role for *all* authorization is resolved from `profiles` per-request (`resolve-role.ts`); `withAuth`/`withRole`/`withPermission`/`rbac` and the `middleware.ts` admin branch no longer trust the JWT role claim or `app_metadata`/`user_metadata`. New `api-guard` test asserts the actual FND-005 attack (JWT claims admin → 403 when `profiles` says user).
- **B2** — AUTH-03 negative-auth test scaffold rewritten to mock `validateFromHeaders`'s real `{ valid, user }` shape (was mocking a nonexistent `null`/bare-user return).
- **B3** — AUTH-03 gains a route-inventory CSV classification step (SEC-signed) before wrapping; the pattern now explicitly removes pre-existing inline guards.
Should-fix: `test:auth-negative`/`audit:auth` npm scripts created in PRE-05 (S1); ≥568 floor derived from 466 handlers (S2); TASK-DEFER-COMPILE created as an explicit standing task (S3); AUTH-05/AUTH-12 `enterprise` ordering noted (S4); AUTH-05 gains a caller-audit Step 0 (S5); PRE-03 cache test made deterministic via injectable clock (S6); PRE-03 gains a service-role-read note + boot-time reachability assertion (S7).

**Second-pass fixes (iteration 3):**
- **N1** — `resolve-role.ts` now uses a module-level Supabase client (not per-request `createClient`) and a 15s per-`userId` cache, so an authenticated request does ~1 role lookup, not N. The ≤15s demotion-staleness tradeoff is documented.
- **N2** — AUTH-04 Step 5 no longer reuses `resolveRoleFromDb` inside `middleware.ts` (Edge runtime; `@supabase/supabase-js` + service-role key is unsafe there). The admin gate uses the existing Edge-safe `@supabase/ssr` cookie client's `profiles.role` query as its only path.
- **S8** — `AuthedUser` type is now explicitly defined and exported by AUTH-01 Step 7; `AuthenticatedHandler` takes it.
- **S9** — the AUTH-03 route-inventory CSV gains a mandatory `current_authz` column; inline `rbac.hasPermission` checks are promoted into `withPermission`, never deleted — preventing silent authorization downgrades.
- **S10** — AUTH-01 Step 7 specifies how `withPermission` feeds the DB role to `rbac` (build `authedUser`, pass that); a `withPermission` forged-JWT bypass test is added.
- **S11** — `verify-auth-coverage.ts` cross-checks each route's wrapper against the CSV `proposed_guard`, catching under-authorization (downgrade to plain `withAuth`), not just missing authentication.
