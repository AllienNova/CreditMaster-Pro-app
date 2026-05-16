# Foundation Block (Wave 7 Phase 0 + Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the Wave 7 prerequisites and rebuild the auth/RBAC layer so every API route is authenticated by default — the unblocking foundation every MVP vertical sits on.

**Architecture:** Phase 0 publishes an honest re-baseline and stands up the safety rails (branch policy, feature flags, lint guards). Phase 1 rebuilds auth: roles come from the database `profiles` table (never `user_metadata`), all 294 API routes are wrapped in the existing `withAuth` guard, and `src/middleware.ts` flips `/api/*` from allow-all to deny-by-default against an explicit `PUBLIC_ROUTES` allowlist.

**Tech Stack:** Next.js 15 App Router, TypeScript 5.7 strict, Supabase (Auth + Postgres + RLS), Jest + ts-jest (`@jest-environment node` for route tests), Upstash Redis.

**Scope:** This plan is the Foundation block only. The 6 verticals and 3 cross-cutting tracks are planned just-in-time per the roadmap spec (`docs/superpowers/specs/2026-05-15-mvp-launch-roadmap-design.md`).

**Closes (CRITICAL):** FND-001, 002, 003, 004, 005, 006, 041, 042, 043, 044, 049, 050, 051 (13 of the enumerated 32). **Also closes (HIGH):** FND-007, 008, 009, 010, 011, 012, 013.

---

## File Structure

| File | Responsibility | Action |
|------|----------------|--------|
| `src/lib/auth/roles.ts` | **New.** Single source of role types + hierarchy. Replaces the 3 conflicting definitions. | Create |
| `src/lib/auth/session.ts` | `getUser`/`getUserRole` — role now from `profiles.role`, not `user_metadata`. | Modify |
| `src/lib/auth/rbac.ts` | RBAC permission model; imports `Role` from `roles.ts`; drops `user_metadata` fallback. | Modify |
| `src/lib/security/auth-middleware.ts` | Imports `Role` from `roles.ts`; `validateAPIKey` no longer mints an `enterprise` user. | Modify |
| `src/app/api/admin/auth/route.ts` | Admin status from `profiles.role === 'admin'`; whitelist + enterprise-grant deleted. | Modify |
| `src/lib/auth/PUBLIC_ROUTES.ts` | **New.** Explicit allowlist of unauthenticated API paths. | Create |
| `src/middleware.ts` | `/api/*` deny-by-default against `PUBLIC_ROUTES`. | Modify |
| `src/lib/flags/` | **New.** Supabase-backed feature-flag reader. | Create |
| `src/lib/security/redis-rate-limiting.ts` | The single surviving rate limiter. | Keep |
| `src/lib/rate-limit.ts`, `src/lib/security/rate-limiting.ts`, `src/lib/security/rate-limiter.ts` | Redundant rate limiters. | Delete |
| `scripts/verify-auth-coverage.ts` | **New.** CI audit: every route is `withAuth`-wrapped or in `PUBLIC_ROUTES`. | Create |
| `eslint-rules/no-math-random-in-prod.js` | **New.** Custom lint rule. | Create |
| `supabase/migrations/*_feature_flags.sql` | **New.** `feature_flags` table. | Create |

**Test conventions (match existing):** route tests use `/** @jest-environment node */`, `jest.mock(...)` before importing the handler, mock `@supabase/supabase-js` `createClient` at the client boundary. Run: `npm test`. Type-check: `npm run type-check`.

---

# Phase 0 — Immediate Prereqs

Phase 0 has procedural tasks (no TDD) and code tasks (TDD). Procedural tasks list a checklist; code tasks use bite-sized steps.

### Task PRE-01: Honest re-baseline

**Files:** Modify `docs/ssot/health_metrics.md`, `docs/ssot/SSOT.md`, `CLAUDE.md`, `docs/ssot/gap_analysis.md`.

- [ ] **Step 1: Re-run all gates, capture output**

```bash
npm run lint 2>&1 | tee /tmp/rebaseline-lint.txt
npm run type-check 2>&1 | tee /tmp/rebaseline-types.txt
npm test 2>&1 | tail -30 | tee /tmp/rebaseline-test.txt
npm run build 2>&1 | tail -20 | tee /tmp/rebaseline-build.txt
npm audit 2>&1 | tee /tmp/rebaseline-audit.txt
```

- [ ] **Step 2: Update `health_metrics.md`** with the captured numbers (test pass/fail, lint errors/warnings, type errors, build status, `npm audit` prod/dev split). Replace any stale VERSION-013 figures.

- [ ] **Step 3: Update `SSOT.md`** banner to "Wave 7 in flight"; in `CLAUDE.md` remove the "Phase: All 7 waves DONE (125/125)" line and the stale §9 numbers, point them at `health_metrics.md`.

- [ ] **Step 4: Mark legacy tasks** — in `MASTER-IMPLEMENTATION-PLAN.md`, all 125 Waves 0–6 tasks `NEEDS_VERIFICATION` except any with a linked passing integration test. **Reconcile the CRITICAL-count off-by-one** (the explicit list in Exit-Criteria-1 enumerates 32 items but is labelled "33") — either find the dropped 33rd finding or correct the count; record the resolution.

- [ ] **Step 5: Commit**

```bash
git add docs/ssot/ CLAUDE.md
git commit -m "docs(ssot): TASK-PRE-01 honest re-baseline; reconcile CRITICAL count"
```

### Task PRE-02: Branch + freeze policy (procedural)

- [ ] **Step 1:** Create the `remediation/wave-7-*` branch namespace convention; document it in `SECURITY.md` (created in PRE-04).
- [ ] **Step 2:** In GitHub repo settings, protect `main` — only `hotfix/*` and `remediation/*` may open PRs into it; require 1 review.
- [ ] **Step 3:** Add `.github/CODEOWNERS` gating `src/lib/auth/`, `src/lib/security/`, `src/lib/commerce/`, `src/lib/payment/`, `supabase/migrations/` to a SEC reviewer.
- [ ] **Step 4:** Add a PR template (`.github/pull_request_template.md`) with a required "FND-### addressed" field and the test-class checkboxes (negative-auth / integer-cents / webhook-replay / cross-user-403).
- [ ] **Step 5:** Commit `.github/` changes: `git commit -m "chore: TASK-PRE-02 branch protection + CODEOWNERS + PR template"`.

### Task PRE-04: Communication + incident channel (procedural)

- [ ] **Step 1:** Create `SECURITY.md` at repo root — vulnerability-reporting policy, the Wave 7 rollback playbook per phase, the chunked-push procedure (for PRE-06).
- [ ] **Step 2:** Create the private "wave-7-remediation" channel; note daily standup cadence in `SECURITY.md`.
- [ ] **Step 3:** Commit: `git commit -m "docs: TASK-PRE-04 add SECURITY.md + rollback playbook"`.

### Task PRE-03: Feature-flag infrastructure

**Files:**
- Create: `supabase/migrations/20260516000000_feature_flags.sql`, `src/lib/flags/index.ts`, `src/lib/flags/types.ts`
- Test: `src/lib/flags/__tests__/index.test.ts`

- [ ] **Step 1: Write the migration**

`supabase/migrations/20260516000000_feature_flags.sql`:
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
insert into public.feature_flags (key, enabled, description) values
  ('auth.deny_by_default', false, 'Wave 7 AUTH-04 kill-switch'),
  ('webhooks.enabled', true, 'Webhook processing kill-switch'),
  ('payouts.enabled', true, 'Payout processing kill-switch')
on conflict (key) do nothing;
```

- [ ] **Step 2: Write the failing test**

`src/lib/flags/__tests__/index.test.ts`:
```ts
/** @jest-environment node */
const mockFrom = jest.fn();
jest.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ from: mockFrom }),
}));
import { isFlagEnabled, __clearFlagCache } from "../index";

function flagRow(enabled: boolean) {
  return { data: { key: "x", enabled }, error: null };
}

describe("isFlagEnabled", () => {
  beforeEach(() => { jest.clearAllMocks(); __clearFlagCache(); });

  it("returns the flag value from the database", async () => {
    mockFrom.mockReturnValue({
      select: () => ({ eq: () => ({ single: () => Promise.resolve(flagRow(true)) }) }),
    });
    expect(await isFlagEnabled("auth.deny_by_default")).toBe(true);
  });

  it("defaults to false when the flag row is missing", async () => {
    mockFrom.mockReturnValue({
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: { code: "PGRST116" } }) }) }),
    });
    expect(await isFlagEnabled("auth.deny_by_default")).toBe(false);
  });

  it("caches reads (second call does not hit the database)", async () => {
    mockFrom.mockReturnValue({
      select: () => ({ eq: () => ({ single: () => Promise.resolve(flagRow(true)) }) }),
    });
    await isFlagEnabled("webhooks.enabled");
    await isFlagEnabled("webhooks.enabled");
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 3: Run the test — expect FAIL**

Run: `npm test -- src/lib/flags`
Expected: FAIL — `Cannot find module '../index'`.

- [ ] **Step 4: Implement `src/lib/flags/types.ts` and `src/lib/flags/index.ts`**

`types.ts`:
```ts
export type FlagKey = "auth.deny_by_default" | "webhooks.enabled" | "payouts.enabled";
```

`index.ts`:
```ts
import { createClient } from "@supabase/supabase-js";
import type { FlagKey } from "./types";

const CACHE_TTL_MS = 1_000;
const cache = new Map<string, { value: boolean; at: number }>();

export function __clearFlagCache(): void { cache.clear(); }

export async function isFlagEnabled(key: FlagKey): Promise<boolean> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const { data } = await supabase
    .from("feature_flags")
    .select("key, enabled")
    .eq("key", key)
    .single();

  const value = data?.enabled ?? false;
  cache.set(key, { value, at: Date.now() });
  return value;
}
```

- [ ] **Step 5: Run the test — expect PASS**

Run: `npm test -- src/lib/flags`
Expected: PASS, 3 passing.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260516000000_feature_flags.sql src/lib/flags/
git commit -m "feat: TASK-PRE-03 Supabase-backed feature flags"
```

### Task PRE-05: Lint guards (mock-data + secrets)

**Files:** Create `eslint-rules/no-math-random-in-prod.js`; modify `.eslintrc.*` (flat or legacy — match the project); modify CI workflow.

- [ ] **Step 1: Write the ESLint rule** `eslint-rules/no-math-random-in-prod.js` — flags `Math.random()` outside `__tests__/` and `src/lib/random/`. Report node, message "Math.random() is banned in production code (TASK-PRE-05)."

- [ ] **Step 2: Wire it** into the ESLint config as a plugin rule at **warning** severity; add `no-restricted-imports` blocking `**/__mocks__/**` and `**/*.fixture.*` from non-test files.

- [ ] **Step 3: Add the CI grep step** to the workflow:
```bash
rg -n 'Math\.random\(|faker\.|mockData|MOCK_' src/ --glob '!**/__tests__/**' --glob '!**/*.test.*' || true
```
(Reports only; non-blocking until Phase 4 escalates via TASK-MOK-06.)

- [ ] **Step 4: Run lint** — `npm run lint` — confirm the rule loads and emits warnings, not errors.

- [ ] **Step 5: Commit** — `git commit -m "feat: TASK-PRE-05 lint guards for mock data (warning level)"`.

### Task PRE-06: Branch hygiene (procedural)

- [ ] **Step 1:** `git rm strativion-autonomous-trading-package.zip` (24 MB) — committed deletion.
- [ ] **Step 2:** Document the chunked-push procedure in `SECURITY.md`; note `git filter-repo` history-purge needs a separate maintainer-run consultation (do **not** rewrite shared history unprompted).
- [ ] **Step 3:** Verify: `test ! -f strativion-autonomous-trading-package.zip && echo gone`.
- [ ] **Step 4:** Commit: `git commit -m "chore: TASK-PRE-06 remove 24MB zip from tree"`.

### Task PRE-07: Security re-review of 92 prior commits (procedural)

- [ ] **Step 1:** `git log feat/asset-system-regen ^main --stat` — list every commit touching `src/lib/auth/`, `src/lib/security/`, `src/lib/payment/`, `src/lib/commerce/`, `src/middleware.ts`, `supabase/migrations/`.
- [ ] **Step 2:** Re-read each such commit's diff. File any latent issue as a new `FND-###` in `gap_analysis.md`.
- [ ] **Step 3:** Produce a tracking issue: each scoped commit hash + verdict (CLEAN / FOLLOWUP / RE-FIX). SEC sign-off comment required.
- [ ] **Step 4:** Commit any new findings: `git commit -m "docs: TASK-PRE-07 security re-review of 92 commits"`.

**Phase 0 gate:** re-baseline published; branch protection + CODEOWNERS live; feature flags + lint guards merged; 24 MB zip gone; 92-commit re-review signed off.

---

# Phase 1 — Auth/RBAC Rebuild

### Task AUTH-12: Single source of role types

> Sequenced first — AUTH-01/02/03 all import from it. (Master plan lists it last; dependency order puts it first.)

**Files:**
- Create: `src/lib/auth/roles.ts`
- Test: `src/lib/auth/__tests__/roles.test.ts`
- Modify (later steps): `src/lib/auth/rbac.ts:10`, `src/lib/security/auth-middleware.ts:41,50`, `src/lib/auth/api-guard.ts:103-104`

- [ ] **Step 1: Write the failing test** `src/lib/auth/__tests__/roles.test.ts`:
```ts
import { ROLES, roleRank, isAtLeast, type Role } from "../roles";

describe("roles", () => {
  it("defines exactly the four canonical roles", () => {
    expect([...ROLES].sort()).toEqual(["admin", "premium", "super_admin", "user"]);
  });
  it("ranks roles user < premium < admin < super_admin", () => {
    expect(roleRank("user")).toBeLessThan(roleRank("premium"));
    expect(roleRank("premium")).toBeLessThan(roleRank("admin"));
    expect(roleRank("admin")).toBeLessThan(roleRank("super_admin"));
  });
  it("isAtLeast is true when the user meets or exceeds the required role", () => {
    expect(isAtLeast("admin", "premium")).toBe(true);
    expect(isAtLeast("user", "admin")).toBe(false);
  });
});
```

- [ ] **Step 2: Run — expect FAIL** (`npm test -- src/lib/auth/__tests__/roles.test.ts`).

- [ ] **Step 3: Implement `src/lib/auth/roles.ts`**
```ts
export const ROLES = ["user", "premium", "admin", "super_admin"] as const;
export type Role = (typeof ROLES)[number];

const RANK: Record<Role, number> = { user: 0, premium: 1, admin: 2, super_admin: 3 };

export function roleRank(role: Role): number { return RANK[role]; }
export function isAtLeast(actual: Role, required: Role): boolean {
  return RANK[actual] >= RANK[required];
}
export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}
```

- [ ] **Step 4: Run — expect PASS.**

- [ ] **Step 5: Migrate the three definitions** — `rbac.ts:10`, `auth-middleware.ts:41,50`, and the inline hierarchy in `api-guard.ts:103-104` all `import { Role } from "@/lib/auth/roles"`. **`enterprise` is removed** — replace `enterprise` references with `premium` (the auth map confirms `enterprise` only ever functioned as an alias). Run `npm run type-check`; fix every resulting error.

- [ ] **Step 6: Run full suite** — `npm test` — 0 failures.

- [ ] **Step 7: Commit** — `git commit -m "refactor: TASK-AUTH-12 single source of role types (FND-012)"`.

### Task AUTH-01: Remove `user_metadata` role read

**Files:**
- Modify: `src/lib/auth/session.ts:31-67,94-97`, `src/lib/auth/rbac.ts:304-327`
- Test: `src/lib/auth/__tests__/session.test.ts`

- [ ] **Step 1: Write the failing test** — assert role comes from `profiles.role`, and that a forged `user_metadata.role: "admin"` is ignored:
```ts
/** @jest-environment node */
const mockGetUser = jest.fn();
const mockFrom = jest.fn();
jest.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ auth: { getUser: mockGetUser }, from: mockFrom }),
}));
import { getUserRole } from "../session";

describe("getUserRole", () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it("reads role from the profiles table", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", user_metadata: {} } }, error: null });
    mockFrom.mockReturnValue({ select: () => ({ eq: () => ({ single: () =>
      Promise.resolve({ data: { role: "admin" }, error: null }) }) }) });
    expect(await getUserRole()).toBe("admin");
  });

  it("IGNORES a forged user_metadata.role and returns the profiles role", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u1", user_metadata: { role: "super_admin" } } }, error: null,
    });
    mockFrom.mockReturnValue({ select: () => ({ eq: () => ({ single: () =>
      Promise.resolve({ data: { role: "user" }, error: null }) }) }) });
    expect(await getUserRole()).toBe("user");
  });

  it("returns 'user' when the profile has no role", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", user_metadata: {} } }, error: null });
    mockFrom.mockReturnValue({ select: () => ({ eq: () => ({ single: () =>
      Promise.resolve({ data: { role: null }, error: null }) }) }) });
    expect(await getUserRole()).toBe("user");
  });
});
```

- [ ] **Step 2: Run — expect FAIL** (the forged-metadata test fails: current code returns `super_admin`).

- [ ] **Step 3: Rewrite role resolution** — in `session.ts`, `getUser()` must stop setting `role` from `user_metadata?.role` (line 59). `getUserRole()` queries `profiles.role` for the authenticated `user.id`, defaulting to `"user"`. In `rbac.ts:304-327`, delete the `user_metadata.role` and `app_metadata.role` fallbacks — role is passed in from the `profiles`-sourced value only.

- [ ] **Step 4: Run — expect PASS** (all 3).

- [ ] **Step 5: Run full suite + type-check** — fix fallout.

- [ ] **Step 6: Commit** — `git commit -m "fix: TASK-AUTH-01 role from profiles table, not user_metadata (FND-005)"`.

### Task AUTH-02: Remove admin email whitelist + enterprise=admin grant

**Files:**
- Modify: `src/app/api/admin/auth/route.ts:16-21,74,83-87`
- Test: `src/app/api/admin/auth/__tests__/route.test.ts` (extend existing)

- [ ] **Step 1: Write failing tests** — a whitelisted email with `profiles.role !== 'admin'` is **not** admin; an `enterprise`-tier user is **not** admin; only `profiles.role === 'admin'` is admin:
```ts
it("denies admin to a whitelisted email whose profile role is 'user'", async () => {
  mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "khonour@yahoo.com" } }, error: null });
  mockProfile({ role: "user", subscription_tier: "free" });
  const res = await GET(makeRequest());
  expect((await res.json()).isAdmin).toBe(false);
});
it("denies admin to an enterprise-tier user whose profile role is not admin", async () => {
  mockGetUser.mockResolvedValue({ data: { user: { id: "u2", email: "x@y.com" } }, error: null });
  mockProfile({ role: "user", subscription_tier: "enterprise" });
  const res = await GET(makeRequest());
  expect((await res.json()).isAdmin).toBe(false);
});
it("grants admin only when profiles.role === 'admin'", async () => {
  mockGetUser.mockResolvedValue({ data: { user: { id: "u3", email: "x@y.com" } }, error: null });
  mockProfile({ role: "admin", subscription_tier: "free" });
  const res = await GET(makeRequest());
  expect((await res.json()).isAdmin).toBe(true);
});
```

- [ ] **Step 2: Run — expect FAIL** (current code returns `isAdmin: true` for the whitelisted email and the enterprise user).

- [ ] **Step 3: Delete** the `ADMIN_EMAILS` array (lines 16-21), the `ADMIN_EMAILS.includes(...)` check (line 74), and the `hasAdminTier`/`subscription_tier === "enterprise"` grant (lines 83-87). Replace with `const isAdmin = profile?.role === "admin";`.

- [ ] **Step 4: Run — expect PASS.**

- [ ] **Step 5: Commit** — `git commit -m "fix: TASK-AUTH-02 admin from profiles.role only (FND-003, FND-004)"`.

### Task AUTH-05: Remove AIML key reuse as inbound auth

**Files:**
- Modify: `src/lib/security/auth-middleware.ts:283-312`
- Test: `src/lib/security/__tests__/auth-middleware.test.ts`

- [ ] **Step 1: Write the failing test** — presenting `AIML_API_KEY` as an inbound credential must NOT authenticate:
```ts
it("does not authenticate a caller presenting the AIML_API_KEY value", async () => {
  process.env.AIML_API_KEY = "secret-aiml-key";
  const result = await validateAPIKey("secret-aiml-key");
  expect(result.authenticated).toBe(false);
});
```

- [ ] **Step 2: Run — expect FAIL** (current code returns `authenticated: true, role: "enterprise"`).

- [ ] **Step 3: Fix** — `validateAPIKey` must not compare against `process.env.AIML_API_KEY`. Inbound API-key auth, if needed, validates against a dedicated `api_keys` table with hashed keys; until that exists, `validateAPIKey` returns `{ authenticated: false }`. Remove the synthetic `role: "enterprise"` user entirely.

- [ ] **Step 4: Run — expect PASS;** run full suite, fix fallout.

- [ ] **Step 5: Commit** — `git commit -m "fix: TASK-AUTH-05 AIML key is not an auth credential (FND-002)"`.

### Task AUTH-06: Consolidate to one rate limiter

**Files:**
- Keep: `src/lib/security/redis-rate-limiting.ts`
- Delete: `src/lib/rate-limit.ts`, `src/lib/security/rate-limiting.ts`, `src/lib/security/rate-limiter.ts`
- Test: `src/lib/security/__tests__/redis-rate-limiting.test.ts` (extend)

- [ ] **Step 1:** `grep -rl "rate-limit\b\|rate-limiter\|rate-limiting" src/ --include=*.ts` — list every importer of the three doomed limiters.
- [ ] **Step 2:** Repoint each importer to `redis-rate-limiting.ts`; reconcile the `defaultLimits`/presets (`api`, `auth`, `disputes`) into it if any caller relied on them.
- [ ] **Step 3:** Write/extend a test asserting the surviving limiter enforces a window (Nth call over limit → blocked).
- [ ] **Step 4:** `git rm` the three redundant files. Run `npm run type-check` + `npm test` — fix fallout.
- [ ] **Step 5: Commit** — `git commit -m "refactor: TASK-AUTH-06 single rate limiter (FND-013)"`.

### Tasks AUTH-07 to AUTH-11 (security hardening — TDD each)

Each follows the write-test → fail → fix → pass → commit cycle. Targeted scope:

- [ ] **AUTH-07** — replace the in-memory session `Map` with the Redis store (or remove it if sessions are fully Supabase-managed). Test: session survives a simulated process restart. Commit `fix: TASK-AUTH-07 Redis-backed sessions (FND-007)`.
- [ ] **AUTH-08** — `crypto.timingSafeEqual` for every secret comparison (API keys, webhook secrets, CSRF tokens). Test: comparison helper is constant-time-shaped (equal-length buffers, throws on mismat? assert via the helper contract). Commit `fix: TASK-AUTH-08 timing-safe secret comparison (FND-011)`.
- [ ] **AUTH-09** — CSRF secret: hard-fail (`throw`) on missing env in production (`NODE_ENV === "production"`). Test: missing `CSRF_SECRET` in prod throws; in dev it warns. Commit `fix: TASK-AUTH-09 CSRF secret hard-fail in prod (FND-008)`.
- [ ] **AUTH-10** — backup-code TOCTOU: single Postgres RPC with `FOR UPDATE` row lock (reuse the `d64e8d5` atomic-RPC template). Test: concurrent redemption of the same backup code → exactly one succeeds. Commit `fix: TASK-AUTH-10 atomic backup-code redemption (FND-010)`.
- [ ] **AUTH-11** — atomic signup: profile insert in a DB trigger, or roll back the auth user on profile-insert failure. Test: a forced profile-insert failure leaves no orphaned auth user. Commit `fix: TASK-AUTH-11 atomic signup (FND-009)`.

### Task AUTH-03: Wrap all 294 API routes in `withAuth`

> Sub-batched a–f (master plan). Each sub-batch is its own PR. The pattern below applies to every route; the negative-auth test class (one anonymous + one wrong-role assertion per route, ≥568 tests total) is the Phase 1 regression floor.

**Per-route pattern** (apply to each `route.ts`):

- [ ] **Step A: Wrap the handler.** Convert `export async function GET(req) {...}` to:
```ts
import { withAuth } from "@/lib/auth/api-guard";
import type { JWTUser } from "@/lib/auth/jwt-validation";

export const GET = withAuth(async (req, user: JWTUser) => {
  // existing body; replace ad-hoc getUser() calls with the `user` param
});
```
For role-gated routes use `withRole("admin", ...)`. Routes that are genuinely public go in `PUBLIC_ROUTES.ts` (Task AUTH-04) instead of being wrapped.

- [ ] **Step B: Write the negative-auth test** for the route — co-located `__tests__/route.test.ts`:
```ts
it("returns 401 to an anonymous caller", async () => {
  mockValidateFromHeaders.mockResolvedValue(null); // no valid JWT
  const res = await GET(makeRequest());
  expect(res.status).toBe(401);
});
it("returns 403 to a wrong-role caller", async () => {       // role-gated routes only
  mockValidateFromHeaders.mockResolvedValue({ id: "u1", role: "user" });
  const res = await GET(makeRequest());
  expect(res.status).toBe(403);
});
```

- [ ] **Step C:** Run the route's tests — expect PASS. Commit per ~10 routes: `git commit -m "feat: TASK-AUTH-03<x> wrap <domain> routes in withAuth"`.

**Sub-batch order and gating:**

- [ ] **AUTH-03a** — `src/app/api/admin/**` (~25 routes) — closes FND-049, 050, 051. **SEC review required.**
- [ ] **AUTH-03b** — `src/app/api/notifications/**` (~12 routes) — closes FND-041, 042, 043, 044.
- [ ] **AUTH-03d** — `src/app/api/strategies/**` (~6 routes) — closes FND-006.
- [ ] **AUTH-03c** — `src/app/api/financial/**`, `credit/**`, `documents/**` (~80 routes).
- [ ] **AUTH-03e** — `src/app/api/trading/**`, `investments/**` (~35 routes). **SEC review required.**
- [ ] **AUTH-03f** — remaining `src/app/api/**` (~120 routes).

- [ ] **After each sub-batch:** run `npx tsc --noEmit` over the WHOLE project (catches deferred trading/commerce code broken by the shared-surface change — the TASK-DEFER-COMPILE obligation from the spec §4.2). Fix any deferred-code compile errors in the same PR.

### Task AUTH-04 + AUTH-04-staging: Middleware deny-by-default

**Files:**
- Create: `src/lib/auth/PUBLIC_ROUTES.ts`
- Modify: `src/middleware.ts:159-170`
- Test: `src/__tests__/middleware.test.ts`, `scripts/verify-auth-coverage.ts`

- [ ] **Step 1: Create `PUBLIC_ROUTES.ts`** — explicit allowlist, each entry with a justification comment:
```ts
/** API paths reachable without authentication. Every entry needs a reason. SEC-reviewed. */
export const PUBLIC_API_ROUTES: readonly string[] = [
  "/api/health",                  // uptime probe
  "/api/auth/login",              // pre-auth
  "/api/auth/signup",             // pre-auth
  "/api/auth/callback",           // OAuth callback
  "/api/csrf",                    // CSRF token issuance
  "/api/payment/webhook",         // Stripe — verified by signature, not session
  // ...plaid + affiliate webhooks, added with justification
] as const;

export function isPublicApiRoute(pathname: string): boolean {
  return PUBLIC_API_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));
}
```

- [ ] **Step 2: Write the failing middleware test** — an `/api/*` path NOT in `PUBLIC_API_ROUTES` and with no session → 401; a public one → passes through.

- [ ] **Step 3: Run — expect FAIL** (current middleware waves all `/api/*` through at lines 159-170).

- [ ] **Step 4: Rewrite the `/api/*` branch** of `middleware.ts` — remove `pathname.startsWith("/api")` from the allow-all block; for `/api/*`, if `!isPublicApiRoute(pathname)` and no valid session, return `401`. **Gate the flip behind the feature flag:** `if (await isFlagEnabled("auth.deny_by_default")) { ...enforce... }` so it can be killed instantly.

- [ ] **Step 5: Run — expect PASS.**

- [ ] **Step 6: Write `scripts/verify-auth-coverage.ts`** — walks every `src/app/api/**/route.ts`, asserts each is `withAuth`/`withRole`-wrapped OR its path is in `PUBLIC_API_ROUTES`; exits non-zero otherwise. Add to CI.

- [ ] **Step 7: AUTH-04-staging** — deploy to staging with `auth.deny_by_default` ON; run synthetic monitoring covering all webhooks (Stripe, Plaid, Affiliate), signup, login, OAuth callbacks for **24h green** before flipping the flag in prod. This is a hard sub-gate.

- [ ] **Step 8: Commit** — `git commit -m "feat: TASK-AUTH-04 middleware deny-by-default for /api (FND-001)"`.

**Phase 1 gate:** `scripts/verify-auth-coverage.ts` exits 0 in CI; the lint rule blocks new routes lacking `withAuth`; SEC sign-off on `PUBLIC_ROUTES.ts`; `npm run test:auth-negative` ≥ 568 passing; AUTH-04-staging synthetic monitoring green 24h before the prod flag flip.

---

## Verification (run before declaring the Foundation block done)

```
npm run lint            # 0 errors
npm run type-check      # 0 errors (whole project, incl. deferred code)
npm test                # 0 failures; test:auth-negative ≥ 568 passing
npm run build           # exit 0
node scripts/verify-auth-coverage.ts   # exit 0
npm run test:coverage:changed          # ≥85% on changed lines
```

All 13 Foundation CRITICALs (FND-001–006, 041–044, 049–051) and 7 HIGHs (FND-007–013) closed and evidenced. Then the Payments vertical plan is authored (just-in-time) per the roadmap spec.
