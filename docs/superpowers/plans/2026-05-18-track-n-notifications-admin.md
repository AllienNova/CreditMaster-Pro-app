# Track N — Notifications & Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development — ONE task per subagent, hard stop, two-stage review between tasks. Never batch. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Close the notifications and admin findings — an IDOR on mark-read/delete, in-app notifications and preferences held in process-local memory, stored XSS in transactional emails, mass-assignment on the admin dispute PATCH, fabricated admin analytics, and an unbounded query `limit`.

**Architecture:** Cross-cutting fix track over `src/app/api/notifications/**`, `src/lib/notifications/**`, and `src/app/api/admin/**`. Recurring patterns: (a) **identity & ownership from the server** — a Supabase query keyed by a resource id must also carry `.eq("user_id", <session user>)`; (b) **durable persistence** — notification state lives in Postgres, never a process-local `Map`/`Record`; (c) **honest data** — an admin metric is a real DB query result or an explicit error, never `Math.random()` or a hardcoded fallback; (d) **field whitelists** — a DB `update()` writes only an explicit allowed set, never a raw spread of caller input; (e) **bounded input** — a `limit` is clamped.

**Tech Stack:** Next.js 15 App Router, TypeScript 5.7 strict, Supabase (Postgres + RLS), Jest + ts-jest.

---

## Pre-state (verified against HEAD `e1f7946` — `remediation/wave-7-foundation`)

- Branch: `remediation/wave-7-foundation` (Foundation + 6 verticals + Track M + Track C merged & pushed). Full web suite green (16,106 passing / 0 failures).
- AUTH-03 (Phase 1) already wrapped **every** API route — notifications routes use `withAuth`, admin routes use `withRole`. This **invalidates the "zero auth" half** of FND-041..044 / FND-049..051. The findings' register text is stale; this plan's table below is the corrected reference.

### Findings — **re-verified against HEAD; `gap_analysis.md` text corrected here**

| Finding | Sev (orig) | Verified state at HEAD | Plan task |
|---|---|---|---|
| FND-041 | CRITICAL | `notifications/route.ts` — **already remediated by AUTH-03**: all 4 verbs are `withAuth`-wrapped and the handlers use `user.id` (the session user), not body/query `userId`. NTF-1 verifies + adds a regression test; if any residual body-`userId` path exists, NTF-1 closes it. | NTF-1 |
| FND-042 | CRITICAL | `notifications/preferences/route.ts` — **already remediated**: `withAuth`-wrapped; `preferencesStore[user.id]` keyed by the session user; no `x-user-id` / `demo-user` remains. (Its in-memory `preferencesStore` is the live defect — FND-048.) | NTF-1 (verify), NTF-3 (the Record) |
| FND-043 | CRITICAL | `notifications/push/send/route.ts` — `withAuth`-wrapped. NTF-1 verifies the handler floods only the *session* user / proper authz, no body-`userId` trust. | NTF-1 |
| FND-044 | CRITICAL | `notifications/push/subscribe/route.ts` — `withAuth`-wrapped (POST/DELETE/GET). NTF-1 verifies subscription register/enumerate is scoped to `user.id`. | NTF-1 |
| FND-046 | HIGH | **OPEN — real IDOR.** `notification-service-db.ts:123` `markAsRead(notificationId)` → `.update().eq("id", notificationId)` with NO `user_id` filter; `:160` `deleteNotification(notificationId)` → `.delete().eq("id", notificationId)`, same. Any authenticated user can mark-read / delete ANY notification by id. | NTF-2 |
| FND-047 | HIGH | **OPEN.** `notification-service.ts:52` — in-app notifications in a process-local `Map` → lost on every cold start. NB: `notifications/route.ts` calls THIS in-memory `notificationService`, while a DB-backed `notification-service-db.ts` also exists — reconcile. | NTF-3 |
| FND-048 | HIGH | **OPEN.** `notifications/preferences/route.ts:25-44` — `preferencesStore` is a module-level `Record` → race + cold-start loss. | NTF-3 |
| FND-045 | HIGH | **OPEN.** `notification-service.ts` email templates interpolate user-controlled strings unsanitised → stored XSS in transactional emails. | NTF-4 |
| FND-049 | CRITICAL | `admin/audit/route.ts` POST — **already `withRole`-wrapped** (AUTH-03). ADM-3 verifies the role gate is correct (audit writes are admin-only). | ADM-3 (verify) |
| FND-050 | CRITICAL | `admin/subscriptions/route.ts` DELETE — **already `withRole`-wrapped**. ADM-3 verifies. | ADM-3 (verify) |
| FND-051 | CRITICAL | `admin/disputes/route.ts` PATCH — **already `withRole`-wrapped**; the OPEN part is the mass-assignment (same as FND-054). | ADM-1 |
| FND-052 | CRITICAL | **OPEN.** `admin/analytics/route.ts` — returns `Math.random()` data (`:33,:58,:64-67`), never queries the DB. | ADM-2 |
| FND-053 | CRITICAL | **OPEN.** `admin/stats/route.ts`, `audit/route.ts` (`:136-141`), `logs/route.ts` — hardcoded mock numbers / `Math.random()` rows as a fallback on DB error → operators read fabricated metrics. | ADM-2 |
| FND-054 | HIGH | **OPEN.** `admin/disputes/route.ts:175` — `update(updates)` spreads raw caller input, no field whitelist → caller can overwrite `user_id`, `status`, etc. | ADM-1 |
| FND-055 | HIGH | **OPEN.** `admin/audit/route.ts:26`, `logs/route.ts:26` — `limit` parsed with no upper bound → unbounded query / OOM. | ADM-3 |

### CRITICAL codebase facts the executor must know (verified at HEAD)

1. **AUTH-03 already wrapped every route.** Do NOT "add auth" to a route that has `withAuth`/`withRole` — that is done. The remaining work is IDOR (ownership scoping), persistence, XSS, mass-assignment, mock data, and input bounds.
2. **Two notification services exist** — `src/lib/notifications/notification-service.ts` (in-memory `Map`, FND-047) and `src/lib/notifications/notification-service-db.ts` (Supabase-backed, has the FND-046 IDOR). `notifications/route.ts` currently calls the in-memory one. NTF-3 must reconcile: the DB-backed service should be the one in use.
3. **`withAuth` passes the authenticated `user` to the handler** — handlers already receive `user.id`. The IDOR risk is a SERVICE-layer query that omits `user_id`, not the route.
4. `ls` is permission-blocked in this sandbox — use `grep`/`find`/`Read`.

## Scope

**In scope:** FND-041..055 (the notifications + admin finding set). **Out of scope:** the `TASK-NTF-04/05` and `TASK-ADM-04/05` feature work (smart scheduling, trading notifications, bulk ops, mobile admin — these are feature tasks, not remediation findings); a broader admin-panel audit beyond these findings.

---

## File Structure

| File / area | Responsibility | Task |
|---|---|---|
| `src/app/api/notifications/**` + `__tests__` | verify session-scoped identity; regression tests | NTF-1 |
| `src/lib/notifications/notification-service-db.ts` | `markAsRead`/`deleteNotification` → add `user_id` ownership filter | NTF-2 |
| `src/lib/notifications/notification-service.ts` + the routes/preferences | in-app notifications + preferences → DB persistence | NTF-3 |
| `supabase/migrations/<ts>_notification_preferences.sql` | CREATE if no preferences table exists | NTF-3 |
| `src/lib/notifications/notification-service.ts` (email templates) | escape user-controlled interpolation | NTF-4 |
| `src/app/api/admin/disputes/route.ts` | PATCH field whitelist | ADM-1 |
| `src/app/api/admin/analytics/route.ts`, `stats/route.ts`, `audit/route.ts`, `logs/route.ts` | real DB queries; remove `Math.random()` + mock fallbacks | ADM-2 |
| `src/app/api/admin/audit/route.ts`, `logs/route.ts` | clamp `limit`; verify FND-049/050 role gates | ADM-3 |
| co-located `__tests__/` | regression tests per task | all |

---

### Task NTF-1: Notifications inventory + verify session-scoped identity (FND-041/042/043/044)

**Files:** Read `src/app/api/notifications/**`; add regression tests; modify only if a residual body-`userId` path exists.

AUTH-03 wrapped these routes and the handlers appear to use `user.id`. NTF-1 confirms that and locks it with tests — it is mostly verification, not rework.

- [ ] **Step 1: Inventory.** Read every handler in `notifications/route.ts`, `preferences/route.ts`, `push/send/route.ts`, `push/subscribe/route.ts`. For EACH verb, confirm: (a) `withAuth`-wrapped; (b) the userId used for every DB/service call is the authenticated `user.id`, NEVER a value read from the request body or query or an `x-user-id` header. Produce a per-verb table: CLEAN / NEEDS-FIX.
- [ ] **Step 2: Write regression tests** — for each route, a test that an authenticated user A passing `userId: B` (in body/query) does NOT read or affect user B's data — the route acts only on A. If a route is genuinely CLEAN, the test still belongs (it locks the behaviour).
- [ ] **Step 3: Run.** If all routes are CLEAN, the tests pass immediately — that is the expected outcome; note it. If a route has a residual body-`userId` path, the test fails RED.
- [ ] **Step 4: Fix** any NEEDS-FIX route — derive the user from the session, ignore any request-supplied id.
- [ ] **Step 5: Run — expect PASS.** Full suite (`npm run test`) 0 failures; `npm run type-check` 0 errors.
- [ ] **Step 6: Commit** — `test: TASK-NTF-01 verify + lock session-scoped identity on notification routes (FND-041..044)`.

---

### Task NTF-2: Close the mark-read / delete IDOR (FND-046, HIGH)

**Files:** Modify `src/lib/notifications/notification-service-db.ts` (`markAsRead` ~:123, `deleteNotification` ~:160); test.

`markAsRead`/`deleteNotification` filter only by notification `id` — any authenticated user can mark-read or delete any other user's notification.

- [ ] **Step 1: Verify.** Read both methods. Confirm the `.update()`/`.delete()` chains carry only `.eq("id", notificationId)`. Find their callers (`notifications/route.ts`) — confirm a `userId` is available at the call site (it is — `user.id` from `withAuth`).
- [ ] **Step 2: Write the failing IDOR test** — `markAsRead`/`deleteNotification` called with user A's id for a notification owned by user B → the row is NOT modified/deleted; called with the correct owner → it is. Co-locate as a `*.idor.test.ts` so `npm run test:idor` covers it.
- [ ] **Step 3: Run — expect FAIL.**
- [ ] **Step 4: Fix** — change both method signatures to take `userId` and add `.eq("user_id", userId)` to the `.update()`/`.delete()` chains. Update the call sites in `notifications/route.ts` to pass `user.id`.
- [ ] **Step 5: Run — expect PASS.** Full suite 0 failures; `npm run type-check` 0 errors; `npm run test:idor` green.
- [ ] **Step 6: Commit** — `fix: TASK-IDR-04 close mark-read/delete IDOR — user_id ownership filter (FND-046)`.

---

### Task NTF-3: Persist in-app notifications + preferences (FND-047/048, HIGH)

**Files:** Modify `src/lib/notifications/notification-service.ts`, `notifications/route.ts`, `notifications/preferences/route.ts`; possibly a migration; tests.

In-app notifications live in a process-local `Map`; preferences live in a module-level `Record`. Both lose all data on every serverless cold start.

- [ ] **Step 1: Survey.** Read `notification-service.ts` (the in-memory `Map`) and `notification-service-db.ts` (Supabase-backed). Determine: does the DB-backed service already cover everything `notifications/route.ts` needs? If yes, NTF-3 is a re-wire (route → DB service) + deletion of the in-memory `Map`. Read `preferences/route.ts`'s `preferencesStore` and check `supabase/migrations/` for an existing `notification_preferences` table.
- [ ] **Step 2: Notifications** — point `notifications/route.ts` at the DB-backed `notification-service-db.ts` (post-NTF-2 it has the ownership filter); delete the in-memory `Map` path from `notification-service.ts` (or the whole file if it becomes dead — confirm no other importer). Write a cold-start test: a fresh service instance reads back a persisted notification.
- [ ] **Step 3: Preferences** — if no `notification_preferences` table exists, create a migration (`user_id` pk/unique, the preference columns, RLS); route `preferences/route.ts` read/write through it; delete the module-level `preferencesStore`. Cold-start test: a fresh read returns persisted preferences.
- [ ] **Step 4: TDD** — failing cold-start tests first (fresh instance / fresh module reads back DB data — the `Map`/`Record` fails this), red, fix, green.
- [ ] **Step 5: Run — expect PASS.** Full suite 0 failures; `npm run type-check` 0 errors.
- [ ] **Step 6: Commit** — `fix: TASK-NTF-03 persist in-app notifications + preferences to the database (FND-047/048)`.

---

### Task NTF-4: Escape user-controlled email-template interpolation (FND-045, HIGH)

**Files:** Modify `src/lib/notifications/notification-service.ts` (email templates); test.

Transactional email templates interpolate user-controlled strings (names, custom text) into HTML unescaped → stored XSS rendered in the recipient's mail client.

- [ ] **Step 1: Survey.** Read every email-template builder in `notification-service.ts`. Identify each interpolation of a user-controlled value into an HTML string. Check whether the repo already has an HTML-escape helper (CMP-2 added one for the breach email — `grep` for it; reuse it, do not write a second).
- [ ] **Step 2: Write the failing test** — an email built with a user value containing `<script>` / `<img onerror=…>` / HTML entities → the rendered template contains the ESCAPED form, no live tag.
- [ ] **Step 3: Run — expect FAIL.**
- [ ] **Step 4: Fix** — run every user-controlled value through the HTML-escape helper before HTML interpolation. Do NOT escape values that are not user-controlled (template-static text) — surgical. Plain-text email parts do not need HTML escaping; scope to HTML parts.
- [ ] **Step 5: Run — expect PASS.** Full suite 0 failures; `npm run type-check` 0 errors.
- [ ] **Step 6: Commit** — `fix: TASK-NTF-02 escape user input in transactional email templates (FND-045)`.

---

### Task ADM-1: Field whitelist on the admin dispute PATCH (FND-051/054, CRITICAL/HIGH)

**Files:** Modify `src/app/api/admin/disputes/route.ts` (PATCH ~:145-176); test.

The PATCH handler does `update(updates)` — a raw spread of caller-supplied fields — so an admin (or anyone past the `withRole` gate) can overwrite `user_id`, `status`, `created_at`, or any column (mass-assignment).

- [ ] **Step 1: Verify.** Read the PATCH handler. Confirm `updates` (caller input) is spread into `.update()` with no field filtering. Read the disputes table columns to know which fields an admin dispute PATCH legitimately edits (e.g. `status`, `admin_notes`, `resolution` — NOT `user_id`, `id`, `created_at`).
- [ ] **Step 2: Write the failing tests** — a PATCH whose body includes a non-whitelisted field (`user_id`, `id`) → that field is NOT written to the DB (the update payload contains only whitelisted keys); a PATCH with a legitimate field (`status`) → it is written.
- [ ] **Step 3: Run — expect FAIL.**
- [ ] **Step 4: Fix** — define an explicit allowlist of patchable columns; build the `.update()` payload by picking ONLY those keys from `updates`; reject or ignore the rest. Validate the values at the boundary (e.g. `status` ∈ the enum).
- [ ] **Step 5: Run — expect PASS.** Full suite 0 failures; `npm run type-check` 0 errors.
- [ ] **Step 6: Commit** — `fix: TASK-ADM-02 field whitelist on admin dispute PATCH — kill mass-assignment (FND-051/054)`.

---

### Task ADM-2: De-mock admin analytics + metrics (FND-052/053, CRITICAL)

**Files:** Modify `src/app/api/admin/analytics/route.ts`, `stats/route.ts`, `audit/route.ts`, `logs/route.ts`; tests.

`admin/analytics` returns `Math.random()` data and never queries the DB; `stats`/`audit`/`logs` fall back to hardcoded mock numbers / random rows on a DB error — operators read fabricated metrics and a fabricated audit trail.

- [ ] **Step 1: Survey.** Read all four routes. For each: identify every `Math.random()` / hardcoded-number / fake-row path. Determine the REAL query each metric should run (count of disputes by status, revenue sums, audit rows, log rows — against the actual tables). If a metric genuinely has no backing table yet, that is an "honest unavailable" case (Step 4), not a place to invent data.
- [ ] **Step 2: Write the failing tests** — `admin/analytics` returns values derived from seeded DB rows (mock the Supabase client, assert the response reflects the seeded data, NOT random); on a DB error each route returns an explicit error response (4xx/5xx) — NOT a 200 with fabricated numbers.
- [ ] **Step 3: Run — expect FAIL.**
- [ ] **Step 4: Fix** — replace every `Math.random()` / hardcoded metric with a real Supabase query. On a DB error: return a typed error (or a documented `dataAvailable: false`), never a fabricated fallback. Delete the mock-row generators (`audit/route.ts:~136-141` etc.). If a metric truly has no source, return `null` + `dataAvailable: false`, never a number.
- [ ] **Step 5: Run — expect PASS.** Full suite 0 failures; `npm run type-check` 0 errors. Confirm `grep -n "Math.random" src/app/api/admin/` is clean for these files.
- [ ] **Step 6: Commit** — `fix: TASK-MOK-01 real DB-backed admin analytics + metrics — remove fabricated data (FND-052/053)`.

---

### Task ADM-3: Clamp the query `limit` + verify the audit/subscription role gates (FND-055, FND-049/050)

**Files:** Modify `src/app/api/admin/audit/route.ts`, `logs/route.ts`; verify `audit` POST + `subscriptions` DELETE; tests.

`limit` is `parseInt`'d with no upper bound → an unbounded query / OOM. Also: confirm FND-049 (audit POST) and FND-050 (subscriptions DELETE) are genuinely closed by their `withRole` wrappers.

- [ ] **Step 1: Verify.** Read the `limit` parsing in `audit/route.ts:~26` and `logs/route.ts:~26` — confirm no upper bound. Read `audit/route.ts` POST and `subscriptions/route.ts` DELETE — confirm each is `withRole`-wrapped at the correct role (admin), so FND-049/050 are auth-closed.
- [ ] **Step 2: Write the failing tests** — a request with `limit=100000` (or negative, or non-numeric) results in a query capped at a sane max (e.g. 100/200) and a sane floor; a non-admin hitting audit-POST / subscription-DELETE gets 403.
- [ ] **Step 3: Run — expect FAIL** (for the `limit` clamp; the role-gate tests may already pass — that confirms FND-049/050, note it).
- [ ] **Step 4: Fix** — clamp `limit` to `[1, MAX]` (`Math.min(Math.max(parsed, 1), MAX)`, with `MAX` a named constant); apply at both routes. No change needed for the role gates if Step 1 confirmed them — if a gate is wrong, fix it.
- [ ] **Step 5: Run — expect PASS.** Full suite 0 failures; `npm run type-check` 0 errors.
- [ ] **Step 6: Commit** — `fix: TASK-ADM-03 clamp admin query limit + verify audit/subscription role gates (FND-055/049/050)`.

---

## Track gate (Track N "done" criteria)

- FND-041..055 closed and evidenced (the AUTH-03-already-closed ones verified + regression-tested; the genuinely-open ones fixed).
- `markAsRead`/`deleteNotification` carry a `user_id` ownership filter — proven by a cross-user `*.idor.test.ts`; `npm run test:idor` green.
- In-app notifications + preferences persist to Postgres; no process-local `Map`/`Record` remains (`grep` clean); a fresh instance reads back DB data.
- Transactional email templates escape every user-controlled value (XSS test passes).
- The admin dispute PATCH writes only whitelisted columns; a `user_id`/`id` in the body is ignored.
- `admin/analytics` + `stats`/`audit`/`logs` return real DB data or an explicit error — zero `Math.random()` / hardcoded-fallback metrics.
- The admin query `limit` is clamped; audit-POST / subscription-DELETE are admin-gated.
- Full suite 0 failures; `npm run type-check` + project-wide `tsc` 0 errors; `npm run lint` no new blocking errors.
- `BASE_REF=<track base> npm run test:coverage:changed` — ≥85% on every changed file's changed lines.

---

## Notes for the executor

- AUTH-03 already wrapped every route — do not re-add auth. The work is IDOR scoping, persistence, XSS escaping, mass-assignment whitelists, mock removal, input clamping.
- A Supabase query keyed by a resource id needs `.eq("user_id", <session user>)` — the service-role key bypasses RLS, so explicit scoping is mandatory (the established IDOR-sweep pattern from prior verticals).
- Compliance/admin data is durable Postgres state — a process-local `Map`/`Record` is a finding.
- An admin metric is a real query result or an explicit error — never `Math.random()`, never a hardcoded fallback. "Honest unavailable" = `null` + `dataAvailable: false`.
- A DB `update()` writes an explicit whitelist of columns, never a raw spread of caller input.
- Reuse the HTML-escape helper CMP-2 added (`grep` for it) — do not write a second.
- `gap_analysis.md` is stale on the "zero auth" half of FND-041..044/049..051 — this plan's Findings table is the corrected reference. Still verify against HEAD at each task's Step 1.
- Sequencing: NTF-1 → NTF-2 → NTF-3 → NTF-4 → ADM-1 → ADM-2 → ADM-3. NTF-3 depends on NTF-2 (the DB service must own-scope before the route is pointed at it).
- Reviewers are advisory; challenge a review CRITICAL that would force a regression.
