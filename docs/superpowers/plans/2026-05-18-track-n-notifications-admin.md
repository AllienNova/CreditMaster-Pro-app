# Track N — Notifications & Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development — ONE task per subagent, hard stop, two-stage review between tasks. Never batch. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Close the notifications and admin findings — an IDOR on mark-read/delete, in-app notifications and preferences held in process-local memory, stored XSS in transactional emails, mass-assignment on the admin dispute PATCH, fabricated admin analytics, and an unbounded query `limit`.

**Architecture:** Cross-cutting fix track over `src/app/api/notifications/**`, `src/lib/notifications/**`, and `src/app/api/admin/**`. Recurring patterns: (a) **ownership from the server** — a Supabase query keyed by a resource id must also carry `.eq("user_id", <session user>)`; (b) **durable persistence** — notification state lives in Postgres, never a process-local `Map`/`Record`; (c) **honest data** — an admin metric is a real DB query result or an explicit error / `dataAvailable:false`, never `Math.random()` or a hardcoded fallback; (d) **field whitelists** — a DB `update()` writes only an explicit allowed set, never a raw spread of caller input; (e) **bounded input** — `limit`/`page` are clamped.

**Tech Stack:** Next.js 15 App Router, TypeScript 5.7 strict, Supabase (Postgres + RLS), Jest + ts-jest.

---

## Pre-state (verified against HEAD `e1f7946` — `remediation/wave-7-foundation`, confirmed by adversarial review)

- Branch: `remediation/wave-7-foundation` (Foundation + 6 verticals + Track M + Track C merged & pushed). Full web suite green (16,106 passing / 0 failures).
- **AUTH-03 already wrapped every route** — verified: all 4 notification routes use `withAuth`, all 3 admin routes use `withRole`; `api-guard.ts` resolves role from the DB and fails closed (503). The **"zero auth" half of FND-041..044 / FND-049..051 is genuinely already remediated.** The findings' register text is stale; this plan's table is the corrected reference.

### CRITICAL codebase facts (verified at HEAD by the plan review — read before executing anything)

1. **TWO notification services exist, and the WRONG one is wired.** `notifications/route.ts` imports `notificationService` from `notification-service.ts` — the **in-memory `Map`** service. `notification-service-db.ts` (the Supabase-backed one, which holds the FND-046 IDOR) has **ZERO production callers** — only its own test imports it. So: the FND-046 IDOR is currently *unreachable dead code*; the *live* path is the in-memory service (process-local, loses data on cold start).
2. **The in-memory service's `markAsRead`/`deleteNotification` are NOT IDOR-vulnerable** — they look up `notifications.get(userId)` first, then find the id *within that user's array*. The IDOR is ONLY in `notification-service-db.ts`.
3. **Three-way `NotificationType` mismatch.** `notification-service.ts` union = 11 values (`dispute_created`, `dispute_updated`, …); `notification-service-db.ts` union = 4 values (`dispute_update`, `payment_success`, `document_uploaded`, `tip`); the `notifications` table CHECK constraint (`002_production_enhancements.sql:92-96`) = a *different* 11 values; `src/lib/supabase/types.ts:192-196` types the column as only the original 4. Pointing the route at the DB service WITHOUT reconciling these = a runtime CHECK-constraint 500 on the first `POST` with an in-memory-vocabulary `type`.
4. **`notification_preferences` table does NOT exist.** `preferences/route.ts` uses a module-level `Record`. Two *different-shaped* JSONB columns exist on `profiles` (`notification_preferences`, `push_notification_preferences`) — neither matches the route's shape. The GDPR erasure RPC (`20260401000000_gdpr_erasure_rpc.sql:35`, and CMP-3's expanded list) already references a `notification_preferences` *table* — a dangling reference until the table exists.
5. **`system_logs` table does NOT exist.** `admin/logs/route.ts` queries `from("system_logs")`; the table-missing (`42P01`) branch is the *live* path — its mock output is the only output. `audit_logs`, `disputes`, `subscriptions` DO exist.
6. **`preferences/route.ts` has a fourth handler — a fake `POST`** (`:100-129`, `action: subscribe/unsubscribe`) that returns `{success:true}` with no DB write / no `webPushService` call — a no-op stub.
7. **Each admin mock route has TWO fabrication paths** — the `42P01` (table-missing) branch AND the outer `catch` block. Both must be removed.
8. `ls` is permission-blocked in this sandbox — use `grep`/`find`/`Read`.

### Findings — corrected against HEAD

| Finding | Sev | Verified state | Plan task |
|---|---|---|---|
| FND-041/042/043/044 | CRITICAL (orig) | Auth + session-identity **already remediated by AUTH-03** (handlers use `user.id`, no body `userId`, no `x-user-id`/`demo-user`). NTF-1 verifies + regression-tests. | NTF-1 |
| FND-046 | HIGH | **OPEN but currently unreachable** — `notification-service-db.ts:123/160` `markAsRead`/`deleteNotification` filter only by `id`, no `user_id`. NTF-2 hardens the service; NTF-3 makes it the live (now-safe) path. | NTF-2 |
| FND-047 | HIGH | **OPEN, live** — `notification-service.ts:52` in-memory `Map` is the wired path → cold-start loss. | NTF-3 |
| FND-048 | HIGH | **OPEN, live** — `preferences/route.ts` module-level `Record`. | NTF-4 |
| FND-045 | HIGH | **OPEN** — `notification-service.ts` email templates interpolate user strings unsanitised → stored XSS. | NTF-5 |
| FND-049/050 | CRITICAL (orig) | Auth **already remediated** (`withRole`). ADM-3 verifies the role gates. | ADM-3 (verify) |
| FND-051 | CRITICAL (orig) | Auth done; OPEN part = the mass-assignment (= FND-054). | ADM-1 |
| FND-052 | CRITICAL | **OPEN** — `admin/analytics/route.ts` is 100% `Math.random()`, no Supabase import at all. | ADM-2 |
| FND-053 | CRITICAL | **OPEN** — `stats`/`audit`/`logs` fabricate on DB error (two paths each). `logs` has NO backing table. `stats` also has a stale 3-tier `priceMap` (the model is 6-tier). | ADM-2 |
| FND-054 | HIGH | **OPEN** — `admin/disputes/route.ts:172` `.update(updates)` raw spread, no whitelist. | ADM-1 |
| FND-055 | HIGH | **OPEN** — `audit/route.ts`/`logs/route.ts` `limit` (and `page`) parsed with no bound. | ADM-3 |

## Scope

**In scope:** FND-041..055. **Out of scope:** `TASK-NTF-04/05` and `TASK-ADM-04/05` feature work (smart scheduling, trading notifications, bulk ops, mobile admin); building a real `system_logs` logging subsystem (ADM-2 makes `logs` *honest*, not *populated* — a populated logs view is a flagged follow-up).

---

## File Structure

| File / area | Responsibility | Task |
|---|---|---|
| `src/app/api/notifications/**` + `__tests__` | verify session identity; regression tests | NTF-1 |
| `src/lib/notifications/notification-service-db.ts` | `markAsRead`/`deleteNotification` → `user_id` ownership filter | NTF-2 |
| `notifications/route.ts`, `notification-service.ts`, `notification-service-db.ts`, `supabase/types.ts`, a CHECK-constraint migration | wire route → DB service; reconcile the 3-way `NotificationType`; delete in-memory `Map` | NTF-3 |
| `supabase/migrations/<ts>_notification_preferences.sql`, `preferences/route.ts` | CREATE the `notification_preferences` table; route prefs through it; resolve the fake `POST` | NTF-4 |
| `src/lib/notifications/notification-service.ts` (email templates) | escape user-controlled HTML interpolation | NTF-5 |
| `src/app/api/admin/disputes/route.ts` | PATCH field whitelist | ADM-1 |
| `admin/analytics`, `stats`, `audit`, `logs` routes | real DB queries; remove BOTH mock paths each; fix stale `priceMap`; `logs` → honest-unavailable | ADM-2 |
| `admin/audit/route.ts`, `logs/route.ts` | clamp `limit` + `page`; verify FND-049/050 role gates | ADM-3 |
| co-located `__tests__/` | regression tests per task | all |

---

### Task NTF-1: Verify + lock session-scoped identity on notification routes (FND-041..044)

**Files:** Read `src/app/api/notifications/**`; add regression tests. **Verification task — no production fix is expected** (AUTH-03 already closed these; Step 4 is a no-op contingency).

- [ ] **Step 1: Inventory.** Read every handler in `notifications/route.ts` (GET/POST/PATCH/DELETE), `preferences/route.ts` (GET/PUT/**POST**), `push/send/route.ts`, `push/subscribe/route.ts`. Confirm each is `withAuth`-wrapped and every DB/service call uses the authenticated `user.id`. **Note explicitly** the `preferences/route.ts` `POST` (`~:100-129`) is a no-op stub (`action: subscribe/unsubscribe`, returns `{success:true}`, no DB write) — it is NOT NTF-1's to fix; NTF-4 owns it. Produce a per-verb CLEAN/NEEDS-FIX table.
- [ ] **Step 2: Write regression tests** — for each route, the genuine test is: authenticated as user A, the route's DB query/effect is keyed to A's id; and no token → 401. Do NOT write a "pass `userId: B` in the body" test — the routes do not read body `userId` at all, so such a test is vacuous. Test the real property: session-keyed effect.
- [ ] **Step 3: Run** — tests should pass (the routes are clean). If a route is genuinely NEEDS-FIX, the test fails RED.
- [ ] **Step 4 (contingency, expected no-op):** fix any NEEDS-FIX route — derive identity from the session. If Step 1 found all CLEAN, skip.
- [ ] **Step 5: Run — expect PASS.** Full suite (`npm run test`) 0 failures; `npm run type-check` 0 errors.
- [ ] **Step 6: Commit** — `test: TASK-NTF-01 verify + lock session-scoped identity on notification routes (FND-041..044)`.

---

### Task NTF-2: Own-scope the DB notification service (FND-046, HIGH)

**Files:** Modify `src/lib/notifications/notification-service-db.ts` (`markAsRead` ~:123, `deleteNotification` ~:160); test.

`notification-service-db.ts` `markAsRead`/`deleteNotification` filter only by notification `id`. **This service has no production callers yet** (NTF-3 wires it) — NTF-2 hardens it as a service-layer fix so it is safe BEFORE NTF-3 makes it live. Do NOT edit `notifications/route.ts` in this task.

- [ ] **Step 1: Verify.** Read both methods — confirm the `.update()`/`.delete()` chains carry only `.eq("id", notificationId)`. Confirm (by grep) the service's only importer today is its own test.
- [ ] **Step 2: Write the failing IDOR test** — `markAsRead`/`deleteNotification` called with user A's id for a notification owned by B → row NOT modified/deleted; called with the owner → it is. Co-locate as `*.idor.test.ts` (covered by `npm run test:idor`).
- [ ] **Step 3: Run — expect FAIL.**
- [ ] **Step 4: Fix** — change both signatures to take `userId` and add `.eq("user_id", userId)` to the `.update()`/`.delete()` chains. Update the service's own test to pass a `userId`. No route edit.
- [ ] **Step 5: Run — expect PASS.** Full suite 0 failures; `npm run type-check` 0 errors; `npm run test:idor` green.
- [ ] **Step 6: Commit** — `fix: TASK-IDR-04 user_id ownership filter on DB notification service mark-read/delete (FND-046)`.

---

### Task NTF-3: Wire the route to the DB service + reconcile the type enum (FND-047, HIGH)

**Files:** Modify `notifications/route.ts`, `notification-service.ts`, `notification-service-db.ts`, `src/lib/supabase/types.ts`; create a CHECK-constraint migration; tests.

`notifications/route.ts` uses the in-memory `Map` service (cold-start loss). Re-wire it to the DB service (own-scoped by NTF-2). This is NOT a drop-in swap — the three-way `NotificationType` mismatch (Pre-state fact 3) must be reconciled or the first `POST` 500s.

- [ ] **Step 1: Survey.** Read both services' public methods (`getUserNotifications`, `getUnreadCount`, `markAsRead`, `markAllAsRead`, `deleteNotification`, `createNotification`). Confirm the DB service covers everything `notifications/route.ts` calls; if a method is missing, add it to the DB service. Read all three `NotificationType` definitions + the `notifications` CHECK constraint + `types.ts:192-196`.
- [ ] **Step 2: Reconcile the type enum.** Decide ONE canonical `NotificationType` value set. The DB CHECK constraint is the source of truth for what the column accepts — either (a) widen the CHECK constraint via a new migration to the canonical set, or (b) map the in-memory vocabulary to the existing constraint values. Whichever: the DB service's union, `types.ts`'s column type, and the CHECK constraint must all agree. If you widen the constraint, write the migration; regenerate/hand-edit `types.ts:192-196` to match.
- [ ] **Step 3: Write the failing tests** — a cold-start test (a fresh DB-service instance reads back a persisted notification — the `Map` fails this); a `POST /api/notifications` with each canonical `type` value persists without a CHECK violation.
- [ ] **Step 4: Run — expect FAIL.**
- [ ] **Step 5: Fix** — point `notifications/route.ts` at `notification-service-db.ts`; pass `user.id` to `markAsRead`/`deleteNotification` (now own-scoped). Delete the in-memory `Map` notification path from `notification-service.ts` (keep the email-template code — NTF-5 needs it; if the file's notification CRUD becomes dead, remove just that, confirm no other importer). Ensure `POST` validates `type` against the canonical set at the boundary.
  - **UI type consumers — must be updated in this task.** `src/components/notifications/NotificationItem.tsx` (two exhaustive `switch (type)` blocks, `~:22-72`) and `src/components/notifications/NotificationCenter.tsx` (`filterOptions`, `~:155-158`) import `NotificationType`/`Notification` from `notification-service.ts` and hardcode the in-memory vocabulary. When you narrow `NotificationType` to the canonical set, those `case` labels / `filterOptions` values that aren't canonical become TS errors and `npm run type-check` (Step 6) goes RED. Update both files' `switch`/`filterOptions` to the canonical vocabulary as part of this step. (Keep `notification-service.ts` — or the DB service — exporting `NotificationType`/`Notification` so the imports still resolve.)
- [ ] **Step 6: Run — expect PASS.** Full suite 0 failures; `npm run type-check` 0 errors.
- [ ] **Step 7: Commit** — `fix: TASK-NTF-03 persist in-app notifications via the DB service + reconcile NotificationType (FND-047)`.

---

### Task NTF-4: Create the `notification_preferences` table + persist preferences (FND-048, HIGH)

**Files:** Create `supabase/migrations/<ts>_notification_preferences.sql`; modify `notifications/preferences/route.ts`; test.

`preferences/route.ts` holds preferences in a module-level `Record` (cold-start loss, races). No `notification_preferences` table exists — and the GDPR erasure RPC already references one.

- [ ] **Step 1: Survey.** Read `preferences/route.ts` — the `NotificationPreferences` shape (`pushEnabled`, `emailEnabled`, `smsEnabled`, `channels{}`, `quietHours{}`), the GET/PUT handlers, and the fake `POST` stub (`~:100-129`). Confirm no `notification_preferences` table exists; note the GDPR erasure RPC's reference to it (`20260401000000_gdpr_erasure_rpc.sql:35`).
- [ ] **Step 2: Create the migration** — `notification_preferences` table: `user_id` uuid PK (or unique) FK → `auth.users(id)` `ON DELETE CASCADE` (use `auth.users`, not `profiles` — the more common user-FK target and ordering-safe), columns for the preference shape (booleans + `channels`/`quietHours` as `jsonb`), `created_at`/`updated_at`. RLS: owner-only (a user reads/writes their own row), per the existing user-table RLS pattern. Use the next free `supabase/migrations/` timestamp — it MUST sort AFTER `20260518000002_expand_erasure_cascade.sql` (a same-day-or-later timestamp does this naturally; do not hand-pick an earlier one — the erasure RPC already cascade-deletes `notification_preferences`). This table makes the existing GDPR-erasure reference valid — confirm the cascade RPC's `notification_preferences` entry now resolves.
- [ ] **Step 3: Write the failing tests** — `PUT` then a fresh GET (different module state) reads back the persisted preferences; default preferences returned when no row exists.
- [ ] **Step 4: Run — expect FAIL.**
- [ ] **Step 5: Fix** — `preferences/route.ts` GET/PUT read/write `notification_preferences` keyed by `user.id`; delete the module-level `preferencesStore` `Record`. **The fake `POST` stub:** either implement it for real (persist the subscribe/unsubscribe intent via `webPushService` / the preferences row) or delete it if it is genuinely redundant with `PUT` — decide and report; do not leave a no-op endpoint that lies `{success:true}`.
- [ ] **Step 6: Run — expect PASS.** Full suite 0 failures; `npm run type-check` 0 errors.
- [ ] **Step 7: Commit** — `fix: TASK-NTF-03b notification_preferences table + durable preference persistence (FND-048)`.

---

### Task NTF-5: Escape user-controlled email-template interpolation (FND-045, HIGH)

**Files:** Modify `src/lib/notifications/notification-service.ts` (email templates); test.

- [ ] **Step 1: Survey.** Read every email-template builder in `notification-service.ts`. Identify each interpolation of a user-controlled value into an HTML string. Reuse the HTML-escape helper CMP-2 added (`grep` for it — do not write a second).
- [ ] **Step 2: Write the failing test** — an email built with a user value containing `<script>` / `<img onerror=…>` → the rendered HTML contains the ESCAPED form, no live tag.
- [ ] **Step 3: Run — expect FAIL.**
- [ ] **Step 4: Fix** — escape every user-controlled value before HTML interpolation. Do not escape template-static text. Plain-text email parts need no HTML escaping — scope to HTML parts.
- [ ] **Step 5: Run — expect PASS.** Full suite 0 failures; `npm run type-check` 0 errors.
- [ ] **Step 6: Commit** — `fix: TASK-NTF-02 escape user input in transactional email templates (FND-045)`.

---

### Task ADM-1: Field whitelist on the admin dispute PATCH (FND-051/054, CRITICAL/HIGH)

**Files:** Modify `src/app/api/admin/disputes/route.ts` (PATCH ~:145-176); test.

`.update(updates)` (~:172) spreads raw caller input → mass-assignment of any column.

- [ ] **Step 1: Verify.** Read the PATCH handler — confirm the raw spread. The `disputes` table columns (verified): `id, user_id, bureau, status, item_type, item_description, reason, letter_content, outcome, created_at, sent_at, resolved_at, notes, updated_at, template_id, strategy_id`. The legitimately admin-editable set is roughly `{ status, outcome, notes, resolved_at, sent_at }` — confirm against the table and the admin UI's intent; do NOT whitelist `user_id`, `id`, `created_at`, `bureau`.
- [ ] **Step 2: Write the failing tests** — a PATCH body including a non-whitelisted field (`user_id`, `id`) → that field is NOT in the `.update()` payload; a PATCH with `status` → it IS written.
- [ ] **Step 3: Run — expect FAIL.**
- [ ] **Step 4: Fix** — define an explicit allowlist of patchable columns (real column names only); build the `.update()` payload by picking ONLY those keys; ignore the rest. Validate values at the boundary (`status` ∈ enum).
- [ ] **Step 5: Run — expect PASS.** Full suite 0 failures; `npm run type-check` 0 errors.
- [ ] **Step 6: Commit** — `fix: TASK-ADM-02 field whitelist on admin dispute PATCH — kill mass-assignment (FND-051/054)`.

---

### Task ADM-2: De-mock admin analytics + metrics (FND-052/053, CRITICAL)

**Files:** Modify `src/app/api/admin/analytics/route.ts`, `stats/route.ts`, `audit/route.ts`, `logs/route.ts`; tests.

`admin/analytics` is 100% `Math.random()`; `stats`/`audit`/`logs` fabricate on DB error. **Each route has TWO fabrication paths** — the table-missing (`42P01`) branch AND the outer `catch`. `system_logs` has no backing table.

- [ ] **Step 1: Survey.** For each route identify EVERY fabrication path (both the `42P01` branch and the outer `catch`). Map each metric to its real query: `analytics`/`stats` → `disputes` (count by status), `subscriptions`/`profiles` (revenue, counts), `audit` → `audit_logs` (exists). `stats/route.ts` also has a stale 3-tier `priceMap` (`~:61-65`, `price_basic/premium/enterprise`) — the model is 6-tier (CLAUDE.md §10); the revenue calc is wrong on the "real" path too.
- [ ] **Step 2: Write the failing tests** — `analytics`/`stats`/`audit` return values derived from seeded DB rows (mock Supabase, assert the response reflects the seed, not random); on a DB error each route returns an explicit error (4xx/5xx) or `dataAvailable:false` — NEVER a 200 with fabricated numbers.
- [ ] **Step 3: Run — expect FAIL.**
- [ ] **Step 4: Fix** —
  - `analytics`, `stats`, `audit`: replace every `Math.random()`/hardcoded metric with a real Supabase query; delete BOTH mock paths (the `42P01` branch and the outer-`catch` fabrication) — on error return a typed error, not fake data. Fix `stats`'s `priceMap` to the real 6-tier prices (Free/Standard/Pro/Family Duo/Family/Family Plus per CLAUDE.md §10).
  - `logs`: `system_logs` has no table. Do NOT invent data and do NOT invent a logging subsystem. Make `logs` return an honest empty result + `dataAvailable:false` (or a clear "logs unavailable" response). Record a follow-up task: "build the `system_logs` table + writer so the admin logs view is populated."
- [ ] **Step 5: Run — expect PASS.** Full suite 0 failures; `npm run type-check` 0 errors. `grep -n "Math.random" src/app/api/admin/{analytics,stats,audit,logs}/route.ts` clean.
- [ ] **Step 6: Commit** — `fix: TASK-MOK-01 real DB-backed admin analytics + honest metrics — remove fabricated data (FND-052/053)`.

---

### Task ADM-3: Clamp the query `limit`/`page` + verify the audit/subscription role gates (FND-055/049/050)

**Files:** Modify `src/app/api/admin/audit/route.ts`, `logs/route.ts`; verify the role gates; tests.

`limit` AND `page` are `parseInt`'d with no bound (`audit:~20`, `logs:~20`) — unbounded query / OOM; a negative `page` yields a negative `offset`.

- [ ] **Step 1: Verify.** Read the `limit`/`page` parsing in both routes — confirm no clamp. Confirm `audit` POST and `subscriptions` DELETE are `withRole`-wrapped at the admin role (FND-049/050) — they are; this is a confirmation, not a fix.
- [ ] **Step 2: Write the failing tests** — `limit=100000` / negative / non-numeric → query capped at a sane `MAX` and floored at 1; `page` negative/non-numeric → floored at 1 (non-negative `offset`); a non-admin hitting audit-POST / subscription-DELETE → 403.
- [ ] **Step 3: Run — expect FAIL** (the clamp tests; the role-gate tests may pass already — that confirms FND-049/050, note it).
- [ ] **Step 4: Fix** — clamp `limit` to `[1, MAX]` and `page` to `[1, ∞)` (`Math.min(Math.max(parsed,1),MAX)` / `Math.max(parsed,1)`), `MAX` a named constant; apply at both routes.
- [ ] **Step 5: Run — expect PASS.** Full suite 0 failures; `npm run type-check` 0 errors.
- [ ] **Step 6: Commit** — `fix: TASK-ADM-03 clamp admin query limit/page + verify audit/subscription role gates (FND-055/049/050)`.

---

## Track gate (Track N "done" criteria)

- FND-041..055 closed and evidenced (AUTH-03-closed ones verified + regression-tested; genuinely-open ones fixed).
- The DB notification service's `markAsRead`/`deleteNotification` carry a `user_id` filter (cross-user `*.idor.test.ts`; `npm run test:idor` green).
- `notifications/route.ts` uses the DB service; the in-memory `Map` notification path is gone (`grep` clean); the 3-way `NotificationType` mismatch is reconciled (DB service / `types.ts` / CHECK constraint agree); a cold-start test passes.
- `notification_preferences` table exists (RLS, FK, GDPR-erasure reference resolves); `preferences/route.ts` persists through it; the fake `POST` is implemented or removed.
- Transactional email templates escape every user-controlled value (XSS test passes).
- The admin dispute PATCH writes only whitelisted real columns.
- `admin/analytics`/`stats`/`audit` return real DB data or an explicit error — zero `Math.random()`, zero fabricated fallback (both paths per route); `stats` uses the real 6-tier prices; `logs` is honestly empty (`dataAvailable:false`), not fabricated.
- `limit`/`page` clamped; audit-POST / subscription-DELETE admin-gated.
- Full suite 0 failures; `npm run type-check` + project-wide `tsc` 0 errors; `npm run lint` no new blocking errors.
- `BASE_REF=<track base> npm run test:coverage:changed` — ≥85% on every changed file's changed lines.

---

## Notes for the executor

- AUTH-03 already wrapped every route — do not re-add auth. The work is IDOR scoping, persistence, the type-enum reconciliation, two new tables, XSS escaping, the mass-assignment whitelist, mock removal, input clamping.
- The FND-046 IDOR is in `notification-service-db.ts` (currently zero callers); the live path is the in-memory `notification-service.ts`. NTF-2 hardens the DB service WITHOUT touching the route; NTF-3 then wires the route to it. Order matters — NTF-2 before NTF-3.
- Re-wiring the route to the DB service is NOT a drop-in: reconcile the 3-way `NotificationType` mismatch (NTF-3 Step 2) or the first `POST` 500s on the CHECK constraint.
- `notification_preferences` and `system_logs` tables do not exist. NTF-4 creates the former. `system_logs` is NOT created here — ADM-2 makes `logs` honestly-empty; a populated logs view is a flagged follow-up.
- An admin metric is a real query result or an explicit error — never `Math.random()`, never a hardcoded fallback. Each mock route has TWO fabrication paths (the `42P01` branch + the outer `catch`) — remove both.
- A DB `update()` writes an explicit whitelist of REAL columns (`disputes` has no `admin_notes`/`resolution`).
- Reuse the HTML-escape helper CMP-2 added — do not write a second.
- Sequencing: NTF-1 → NTF-2 → NTF-3 → NTF-4 → NTF-5 → ADM-1 → ADM-2 → ADM-3.
- Reviewers are advisory; challenge a review CRITICAL that would force a regression.
