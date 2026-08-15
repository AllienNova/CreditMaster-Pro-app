# Gap Analysis — Fynvita

- **Date:** 2026-08-09
- **Commit:** `2b23237`, branch `fix/restore-from-pre-deletion-state`
- **Method:** every number below is executed output. Where a figure corrects an
  earlier one, both are shown with the command that settled it.

---

## The headline, stated first

**312 of 1,507 product modules (web only) — 21% — cannot be reached from any
entry point.** Only **32** of those came from the restore that prompted this
review. The other **280 were already dead**, and had been for months.

"Web only" is load-bearing: `audit-reachability.js` walks `src/` and never
`mobile-app/`, so mobile reachability is genuinely unmeasured. The
accidentally-dropped-feature half of the goal *is* covered for mobile by the
full-history deletion sweep in `deleted-feature-audit.md`; the reachability half
is not, and is carried as a named Wave-9 task.

(This figure moved twice. It began as 55 / 264 — the 55 was the restore commit's
*file* headline, not a count of unreachable modules. Then 319 dropped to 312
when the reachability walker learned that Next.js is not the only thing that
starts a process here: `standalone-server.ts` is bundled by `npx esbuild` at
`src/lib/trading/autonomous/deploy/Dockerfile:22` and deployed to Fly.io as its
own service, so it and the six modules only it imports were false positives.
A document opening with "every number below is executed output" has to survive
its own numbers being re-derived.)

That reframes the request. "The restored modules have no importers" is true, but
it is a 10% slice of a pre-existing condition nobody had measured. Wiring the 32
without addressing the 280 leaves nine tenths of the dead code in place.

```
$ node scripts/audit-reachability.js
product (non-test) modules : 1507
entry points               : 607 (incl. 1 from build manifests)
reachable from an entry    : 1196
UNREACHABLE                : 312
unresolved specifiers      : 0
```

Zero unresolved specifiers is what makes the number trustworthy: an import the
resolver cannot follow is reported as a miss, never dropped.

### Where the dead code is

| Area | Unreachable modules | Note |
|---|---:|---|
| `src/components` | 88 | UI built and never routed |
| `src/lib/trading` | 72 | the largest single subsystem, almost entirely dark |
| `src/lib/financial` | 17 | |
| `src/hooks` | 14 | |
| `src/lib/investments` | 13 | |
| `src/lib/connectors` | 13 | |
| `src/lib/commerce` | 13 | |
| everything else | 89 | |

`src/lib/trading` is the finding under the finding. The PCTT engine, 7 AI agents,
10 strategies and the 30-law compliance engine that `CLAUDE.md` §5 describes as
shipped architecture are 72 modules of unreachable code.

---

## Severity scale

- **P0 — blocking**: security hole, money moves wrongly, or a user-visible break
- **P1 — high**: material defect or a gate that reports a result it did not measure
- **P2 — medium**: correctness debt with no live impact yet
- **P3 — low**: hygiene

---

## Findings

| ID | Sev | Category | Finding | Evidence | Fix sketch |
|---|---|---|---|---|---|
| G-001 | P1 | Dead code | 312 product modules unreachable (web only); 280 predate the restore | `node scripts/audit-reachability.js` | Per-module WIRE / DELETE decision. Deleting is a valid, often correct outcome. |
| G-002 | P1 | Correctness | 68 tables queried, created by no migration | `node scripts/audit-phantom-tables.js` | See the table taxonomy below — most are prerequisites, not outages. |
| G-003 | P1 | Correctness | **8** modules still import the session-less anon client; their reads return **zero rows with no error** under RLS. All 8 are unreachable, so this is **latent** — it goes live the instant one is wired | §"Anon client" below | Convert to service-role + explicit `user_id` scoping, as the 63 already converted. Must happen **before** wiring, not after. |
| ~~G-004~~ | — | ~~Correctness~~ | **VOID — withdrawn 2026-08-09.** Claimed all four `/api/cron/*` routes used the anon client and therefore silently wrote nothing. False: each defines its **own local** `getSupabase()` built from `SUPABASE_SERVICE_ROLE_KEY` (`send-reminders/route.ts:5-14`). The finding came from grepping the function *name* rather than the *import*, which matched a local helper that happens to share it. | `grep -c SUPABASE_SERVICE_ROLE_KEY` = 1 in all four | None. The routes are correct. |
| G-005 | P1 | Security gate | `audit:idor` was a false green — it keyed on the literal `getServiceRoleClient`, while 22 of 34 restored modules reach the service role via `supabaseAdmin` or a raw `SUPABASE_SERVICE_ROLE_KEY` client | commit `6e049cf` | Fixed: detection keys on the capability. 63 → 185 files scanned. |
| G-006 | P0 | Security | `POST /api/gamification/achievements` let any authenticated user mint any achievement and its XP | commit `6e049cf` | Fixed: gated 501 until a verified server-side event path exists. |
| ~~G-007~~ | P1 | Supply chain | **FIXED.** `rxjs` was absent from `package.json` while **6 reachable production modules** imported it, including `src/lib/trading/brokers/*` and `realtime/*` behind the live `/api/trading/orders` route. Its only providers were `cypress`, `msw` and `wait-on` — **all devDependencies** — so `npm ci --omit=dev` would have produced a production build that cannot resolve it. Now a direct dependency (`^7.8.2`, `dev: false` in the lock). | `npm ls rxjs` showed only dev parents; `package.json` had no entry | Done. |
| **G-014** | P2 | Build hygiene | **`npm install` cannot run on this repo.** ERESOLVE: `openai@4.104.0` needs `zod@^3.23.8` (peerOptional) while the root pins `zod@^4.3.6`. Verified pre-existing on a pristine `package.json`. Masked because CI uses `npm ci`, which installs from the lockfile and never re-resolves peers — so the break only hits a developer adding a dependency, who must reach for `--legacy-peer-deps` (as this session did to land G-007). | `npm install --package-lock-only` → ERESOLVE; `.github/workflows/ci.yml:29,54,126,144` use `npm ci` | Upgrade `openai` to a build whose peer range admits zod 4, or pin zod to 3.x. Leaving it means every dependency change needs a flag that suppresses real conflicts. |
| G-008 | P1 | Security | 18 vulnerabilities in **production** dependencies (1 critical `next-auth`, 10 high, 7 moderate). Every doc reports only the combined 33, which hides the split | `npm audit --omit=dev` | Upgrade; report prod/dev split from now on. |
| G-009 | P2 | Duplication | Two parallel backup-code implementations: `backup-codes.ts` → `backup_codes` (exists), `mfa-service.ts` → `user_backup_codes` (**does not exist**) | `src/lib/auth/mfa-service.ts:255,292` | Collapse to one. See `security-findings.md`. |
| G-010 | P2 | Docs | `LAUNCH_CHECKLIST.md` carried five stale figures cited as clearance, and a direct A–C/A–D contradiction | commit `b03edca` | Fixed. |
| G-011 | P3 | Docs | Two unrelated "Gate A–D" schemes (launch vs brand assets) | `docs/superpowers/plans/2026-04-16-*.md` | Disambiguated in the checklist header. |
| ~~G-012~~ | **P1** | **FIXED** — Fabricated status, was LIVE | **`/api/health` reports every component healthy without checking any of them.** `checkDatabase()` has its query commented out and returns `status: "healthy"` (`monitoring/health.ts:31-38`); `checkCache()` likewise (`:55-60`); `checkExternalServices()` does `fetch(...).catch(() => {})` then unconditionally pushes `"healthy"` (`:99-111`), so its `degraded` branch is unreachable. `readinessCheck()` returns `ready: health.status !== "unhealthy"`, which can therefore never be false. | `src/lib/monitoring/health.ts:31,55,99-111`; route is reachable via `src/app/api/health/route.ts` | **Done.** Every probe now performs real work. Proven by stopping the dependency: with Supabase down, `/api/health` returns **503 / unhealthy** and `?type=ready` returns `ready:false`; with it up, 200 and `ready:true`. |
| **G-015** | **P0** | **Fabricated telemetry — LIVE** | **`src/lib/monitoring/logger.ts` discarded every message.** `log()` built, filtered, serialized and formatted the entry, then `void formatted;` at `:151`. Zero output, every environment, unconditionally. Ten modules call it and **eight have no other output path** — `stripe-service.ts`, `auth-service.ts`, `order-manager.ts`, `position-manager.ts`, `credits/purchase/route.ts` produced no diagnostic output on failure at all. It also silently reversed `9b5ac20`, which moved pctt-trading's persistence handlers from `console.error` to `logger.error` *to make them surface* — swapping a working path for a discarding one, in code that runs after a real broker order has filled. | `logger.ts:151`; call sites verified for redundant `console.*` | **FIXED** — emits to `console.*` by level. `console` IS the pipeline on Vercel and Fly. Verified in both dev and production formats. |
| ~~G-016~~ | P2 | **FIXED** — Fabricated status, was LIVE (admin-gated) | `/api/monitoring/health` GET hardcodes `status: "healthy"` (`route.ts:28`) while collecting real uptime/memory/CPU/job data in the same response and never deriving status from it; `active_workflows: 0` is a second placeholder at `:42`. POST (`:91-120`) takes `cpu_usage`/`memory_usage`/`error_rate` **straight from the request body** and republishes them via `publishSystemHealth()`, so any admin-authenticated caller controls the broadcast "system health". No caller posts measured data. | `src/app/api/monitoring/health/route.ts:28,42,91-120` | **Done.** GET derives status from heap utilisation (named thresholds, 75% degraded / 95% unhealthy) and the sourceless `active_workflows` is removed — there is no workflow table in the schema at all. POST returns 501, per the achievements precedent. Proven live as admin: heap **89.08%** → `"degraded"` (the old code returned `"healthy"` at that same number), POST → 501, unauthenticated POST → 401. |
| **G-017** | P2 | Duplication | `service-probes.ts` already implements honest per-vendor probes (`unknown` when unconfigured, never `healthy`) and its header names `health.ts` as the fake-green defect it replaces — but it was wired **only** to `/api/admin/health`, leaving the public endpoint on the broken implementation. | `src/lib/monitoring/service-probes.ts:1-18` | **Resolved by split, not merge.** `/api/health` (public) is now self-only — database + cache. Deep vendor probes stay behind `withRole("admin")`: calling them from a public route would let anonymous callers drive six credential-bearing outbound requests and disclose which vendors are configured. |
| **G-019** | P2 | Process conflict | **Narrowed to ONE module.** The gate started at 8 failures, then 4, and is now `commitment-device-service.ts` alone (0%, 8 changed points). Everything else was closable and has been closed: `accountability-partners-service` 0%→passing (its changed lines were the IDOR ownership-check restore — and auditing them surfaced SF-04, an *unfixed* missing guard, now closed and mutation-tested), `points-rewards-service` 33%→passing (the untested line was a caller-binding check that stopped a user transferring points out of someone else's balance), `email-preferences-service` 69%→passing (the untested branch was the production hard-failure for a missing `EMAIL_UNSUBSCRIBE_SECRET`, whose absence previously made every unsubscribe token forgeable). Three of the four "coverage gaps" were untested **security guards**, which is the more useful finding than the gate arithmetic. | `npm run test:coverage:changed`; commits `72dc81b` and this one | **One owner decision remains.** `commitment-device-service` fabricates a charity donation — writes `consequence_executed: true` and a `commitment_donations` row naming a real charity and a dollar amount, with no payment rail. A test asserting that behaviour would encode the fabrication as a specification. Options: revert it out of this branch, or accept the single gate failure with the exception recorded against a name. Do NOT lower the threshold, exclude the file, or write a test that blesses the fabrication. |
| G-018 | P2 | Fabricated telemetry — latent | `analytics.ts` defines a local `window.gtag` pushing to a local `dataLayer` array, but the GA4 script tag it depends on exists nowhere in `src/app`. Wiring it as-is would make every tracking call succeed while transmitting nothing. | `analytics.ts:23`; no `googletagmanager.com` tag in `src/app` | FIX-FIRST — needs the `next/script` GA4 tag AND the tracker calls, not just the trackers. |
| G-013 | P2 | Dead code | 5 of the 8 `src/lib/monitoring/` modules are unreachable, including the barrel `index.ts` — so `analytics.ts`, `error-tracking.ts`, `metrics.ts` and `sentry.ts` have no consumer. `health.ts` is the only live one, and it is G-012. | `audit-reachability.js` | Decide the monitoring story as one scoped pass, not module by module. |
| **G-020** | **P1** | **FIXED** — Correctness, was LIVE | **Every dispute detail page was unreachable**, by two stacked defects. `DisputeDetail` fetched `/api/disputes?disputeId=X`, but that GET reads only `status`/`bureau`/`page`/`limit` and returns a paginated LIST — the id was ignored, so `data.dispute` was always `undefined` and the page rendered "Dispute not found". Behind that, `mapToDispute` omitted `timeline`, which `<DisputeTimeline>` `.map`s unguarded → `Cannot read properties of undefined (reading 'map')` → error boundary. | `DisputeDetail.tsx:39`; `dispute-service-db.ts` `mapToDispute`; `DisputeTimeline.tsx:49` | **Done** (`1a54aab`). Calls the existing user-scoped `/api/disputes/[id]`; timeline derived from the row's real timestamps (no dispute-events table exists). Regression suite fails 8/8 without the fix. |
| **G-021** | **P2** | Type safety — systemic | **Four separate `Dispute` interfaces** exist (`dispute-service.ts:42`, `dispute-service-db.ts:39`, `credit-repair/db/types.ts:143`, `automation/dispute-followups.ts:30`). The UI is typed against one while the API returns another, and the payload crosses the network as `response.json()` (`any`) — so no compiler ever compares them. This is what let G-020 ship green: 13 suites / 220 tests passed while the page was broken in a browser. The same shape hazard produced the mobile store crashes (`mobile-app/src/store/toArray.ts`). | `grep -rn "interface Dispute "` | Unify behind one type per resource and parse at the network boundary (the codebase already has Zod). Not bundled into the G-020 defect fix — it is a scoped refactor, not a one-line change. |
| **G-023** | **P1** | **FIXED** — Correctness, was LIVE | **`/api/trading/{positions,orders,risk}` returned 500 for every caller**, and the cause was invisible because each route catches and `void`s its error. Surfacing it gave Postgres **42501 "permission denied for table positions"**. `positions`/`orders` deliberately grant `authenticated` nothing, so `order-manager` and `position-manager` — still on the request-scoped client — could not read at all. The declared RLS policies on those tables are dead letters: Postgres checks grants BEFORE policies. | `position-manager.ts`, `order-manager.ts`; live `role_table_grants` | **Done** (`d50de80`). Both moved to the service role, matching the 63 modules in G-003. Scoping became the module's own job, so `getOrders`' conditional `if (filter.userId)` — safe under RLS, an enumeration hole without it — became a REQUIRED POSITIONAL argument. Do NOT "fix" this class by granting `authenticated` SELECT. |
| **G-032** | **P1** | Correctness — LIVE | **12 mobile screens crashed to the ErrorBoundary; 6 are fixed and verified on device.** Found by deep-linking all 223 static expo-router routes on an iPhone 17 Pro simulator signed in as a real user — 204 rendered, 19 did not. Each error was read off the ErrorBoundary, not guessed: `admin/users`/`documents`/`dashboard/documents`/`dispute/templates`/`trading/signals` "`.length` of undefined"; `dispute/use-template` "`.map` of undefined"; `rewards` "`current` of undefined"; `rewards/quests` "`days` of undefined"; `settings/credits` "`total` of undefined"; `marketplace` "`categories.find` is not a function"; `coach/goals` "`toFixed` of null"; `trading/risk` "`toUpperCase` of undefined". Two root causes so far: **partial optional chains** (`a?.b.c` guards only `a`; 22 sites, 11 files) and **raw API payloads written into array-typed state** (`setDocuments(response.data.documents)` — the `toArray` case the stores already fixed, at 17 component call sites). | `/tmp/mobile-report2.json`; commits `8c25fce`, `aafb582` | **12 fixed and re-verified on device**; 19 failing routes down to **7** (3 crashes: `dispute/templates`, `settings/credits`, `trading/risk`; 4 near-empty: `billing/subscription`, `coach/goals`, `dispute/use-strategy`, `financial-intelligence/bill-negotiator`). `dispute/templates` and `trading/risk` both report "Cannot convert undefined value to object" with NO `Object.*` call in the screen, its imports, or the stores it uses — cause not localised by static search, and stated as such rather than guessed. |
| **G-033** | **P1** | Correctness — LIVE | **28 mobile screens can hang on a permanent spinner.** Their loaders call `setLoading(true)`, `await` a request, then `setLoading(false)` with NO `try/catch/finally` — so a REJECTED call (as opposed to a `{success:false}` result) never clears the flag. `/billing` demonstrated it live: 3 elements, "Loading billing…", forever. A permanent spinner is worse than an error because the user cannot distinguish it from a slow network. | detection: a loader body containing `setLoading(true)` + `await` and no `finally`/`catch`; `app/billing/index.tsx` | **`/billing` fixed and verified** (3 → 7 elements: "Unable to load billing right now" + Try Again). The other 27 are listed in the commit; NOT bulk-transformed, because an automated edit across 27 differently-shaped files is what broke 4 files earlier in this same session. |
| **G-031** | **P1** | Test-validity — blocks mobile verification | **A mobile dev build cannot verify the data layer at all.** `creditStore`, `disputeStore` and `investmentStore` contain **10 fetch methods** that do `if (__DEV__) { set(seedData); return; }` — they early-return `src/data/dev-seed.ts` and never call the API. Expo Go is a dev build, so the Home tab showed a 731 credit score with per-bureau detail and "4 disputes / 2 pending / 1 resolved" while the database held **0 credit scores and 1 dispute** for that user. Production (`__DEV__` false) does take the real path, so this is not shipped fabrication — but it means any simulator/Expo Go pass proves screens NAVIGATE and RENDER and says nothing about data correctness. Same family as FND-064 (`__DEV__` auth bypass). | `creditStore.ts:131,182,217,279`; `dev-seed.ts:1-3` ("bypass API calls"); DB counts vs screen | Verifying mobile data requires a RELEASE build against a seeded backend. Until then, no mobile run may be reported as "the data works". |
| **G-029** | **P1** | Fabricated data — LIVE, user-facing | **Six mobile drill-down screens render hardcoded data and never fetch anything.** All six have ZERO `fetch(` / store / apiClient references — the mock constant IS the data, not a placeholder later replaced: `insights/weekly-summary` (a health score of 78, `$1,245.67` spent, invented dividends and top categories, presented as the user's own week), `insights/alerts`, `dashboard/reports`, `budgeting/zero-based`, `budgeting/auto-save`, and `documents/[id]`. The last is the starkest: it reads `id` from the route (`:39`) and then ignores it, rendering `MOCK_DOC` (`:41`) — every document a user taps shows the same fabricated document. | `weekly-summary.tsx:72,180`; `documents/[id].tsx:22,39,41`; `grep -rlE "useState[<(][^)]*\b(MOCK_\|mock[A-Z])" app` | Wire to the real APIs or remove the screens. These are exactly the drill-down screens the first dogfood round listed as unexercised, so no one had seen them; they were found by static analysis, not by driving the simulator. Do NOT leave a mock rendering as if it were the user's data — this is the class Wave 7 TASK-MOK exists to close. |
| **G-030** | **P2** | **FIXED** — Correctness, was LIVE | **Truthiness guards that do not cover the fields dereferenced under them.** `(tabs)/index.tsx` guarded `gamification?.level && gamification?.xp` but the same block reads `gamification.streak.days/.multiplier/.longestStreak` — a payload with level and xp but no streak crashed the Home tab exactly as the original bug did, one field over. `financial/savings.tsx` guarded `dashboard &&` (truthiness only) then called `dashboard.savingsRate.toFixed(0)`; `dashboardStore.ts:121` already treats that field as optional (`?.savingsRate \|\| 0`), so the type's `savingsRate: number` is not a guarantee. | `(tabs)/index.tsx:786,807-809`; `savings.tsx:131,144` | **Done.** Guard now names every field the block dereferences; savings defaults with `?? 0`. Mobile tsc 0 errors, 100 suites / 1,171 tests pass. |
| **G-026** | **P1** | **PARTLY FIXED** — Security control, was LIVE | **Session listing and revocation did not work at all.** `SessionManagement.tsx` (client component) called `sessionService`, which queries `public.sessions` with the BROWSER anon client; the table grants `authenticated` nothing, so every request returned **403** and `/settings/security` could neither list sessions nor revoke them. The page rendered, which is why it survived — a security control that silently did nothing. | `SessionManagement.tsx`; `session-service.ts:11` (`@/lib/supabase/client`) | **Read/revoke fixed** (`554ccb6`): new `/api/auth/sessions` does it server-side under the service role, scoped to the authenticated caller. Proven: cross-user DELETE left the victim row intact (verified by re-querying, not by status code). 12 tests. `sessionService` is now imported type-only — it must NEVER move to the service role while a client component imports it, or the key ships to the browser. |
| **G-027** | **P1** | Schema drift — **OWNER DECISION** | **No session row can ever be created**, so the whole session feature is inert end-to-end and `public.sessions` holds **0 rows**. `createSession` inserts `device_name`, `device_type`, `browser`, `os`, `location` — none of which are columns — and never supplies `token_hash`, which is **NOT NULL with no default**. Two independent reasons the insert fails. This is why the (now working) list endpoint honestly returns `[]`. | `session-service.ts:67-81` vs `information_schema`: real columns are `id, user_id, token_hash, user_agent, ip_address, last_activity, expires_at, created_at` | **NOT auto-fixed.** Aligning the insert is mechanical for the phantom columns (the five collapse to the single `user_agent` the new route already derives device/browser/OS from), but `token_hash` needs a decision with security consequences: WHAT identifies a session — a hash of the Supabase refresh token, of the access token, or a separately generated opaque token — and how the current session is later matched to its row. Guessing here would produce a session registry that cannot reliably identify the caller's own session, which is exactly what "revoke all others" depends on. |
| **G-028** | **P2** | Correctness | **"Revoke all other sessions" always throws "Current session not found".** `isCurrent` is only set when a `currentSessionId` is supplied, and no caller supplies one — so no row is ever marked current and the handler's guard always fires. Pre-existing, not introduced by G-026's fix, and currently masked by G-027 (there are no rows at all). | `SessionManagement.tsx` `handleRevokeAllOther`; `/api/auth/sessions` `?currentSessionId` | Blocked on G-027. Once sessions are actually written, the server should identify the current session from the request's own token rather than trusting a client-supplied id — the client does not know its session row id, and letting it name one would be an authorization decision made by the caller. |
| **G-024** | **P1** | Schema drift — **OWNER DECISION** | **`signal-generator.ts` is written against a `trading_signals` table that does not exist as coded.** Converting it to the service role cleared the 42501 and revealed the next error, **42703 "column trading_signals.status does not exist"**. A full field audit of `mapDbSignalToType` found **14 of 27 mapped fields absent or renamed**: `analysis_types`→`analysis_type`, `generated_at`→`created_at`, `timeframe`→`time_horizon`, `status`→`is_active`, `actual_return`→`outcome_return_percent`, `closed_at`→`outcome_date`, `technical_factors`→`technical_indicators`, `fundamental_factors`→`fundamental_metrics`, `sentiment_factors`→`sentiment_score`/`supporting_factors`; and `current_price`, `exit_price`, `potential_gain`, `potential_loss`, `ai_insights`, `model_version`, `consensus_score` exist nowhere. Only `status` and `generated_at` break the QUERY; the other twelve would silently map to `undefined`. | `signal-generator.ts:1652-1687` vs `information_schema.columns` | **NOT auto-fixed, deliberately.** This is a fork, not a rename: either add ~10 columns by migration to match the code's model, or narrow `TradingSignal` to what is actually stored. Renaming only the two query-breaking columns would turn a LOUD 500 into a page of silently-undefined values — the fabrication class this project already fights. `GET /api/investments/signals` stays honestly 500 until the owner picks a direction. The service-role conversion IS shipped (it also fixed three `createClient()` calls missing their `await`, hidden behind `as any`). |
| **G-025** | **P1** | **FIXED** — Authorization, was LIVE | **Users were 403'd from their own financial data.** Six handlers gated non-create work on a premium CREATE permission: `goals/[id]` GET+PATCH+DELETE, `goals/[id]/investment` GET, `budgets/[id]` PATCH+DELETE. The `user` role holds only `financial:{read,write,link_accounts}` — `create_goals`/`create_budgets` start at premium (`rbac.ts:106-120`, `:156`). DELETE gated this way meant a downgraded user could never delete their own data. `goals/[id]/investment` had a second defect: `pathname.split("/").pop()` returned the literal `"investment"`, so it queried `id = "investment"` and 404'd every request. | `rbac.ts:106-120`; the six handlers | **Done** (`d50de80`). Reads → `financial:read`, mutations of existing records → `financial:write`; POST keeps the premium create-gate. Swept every `.pop()` id extraction — this was the only route where it lands on a static segment. |
| **G-022** | **P2** | Schema drift | **`src/lib/supabase/types.ts` under-describes the live `disputes` table by 10 columns** — `updated_at`, `template_id`, `strategy_id`, `response_received_at`, `creditor_name`, `account_number`, `balance`, `inaccuracy_type`, `strategy`, `last_followup_at` all exist in Postgres but not in the generated `Row`. Any code reading them is a tsc error, so the columns are effectively invisible; the reverse of the phantom-table problem. Generated types are checked in but stale. | `information_schema.columns` vs `types.ts:65-80` | Regenerate from a migrated database and add a CI check that fails when the checked-in types drift. Deliberately NOT regenerated during a defect fix: local state would be baked in, masking the separate hosted-schema drift already tracked as a launch condition. |

---

## The 68 phantom tables, classified by who can reach them

This classification **corrects an earlier figure in this same session.** A
name-matching orphan check said 36 phantom tables sat behind reachable code and
therefore failed at runtime today. That check counted a module imported only by
its own test as "imported". Measured by transitive reachability:

| Class | Count | Meaning |
|---|---:|---|
| **A — test-only** | 2 | `plaid_items`, `tax_document_access_log`. `portfolios` was wrongly placed here — it has 9 sites, **5** of them in `PortfolioRebalanceService.ts` (`:240,264,277,302,555`). Cause worth recording: the classification was built by parsing this script's **human output, which truncates at 4 sites** and prints `... +N more`, so any table whose first four sites were tests looked test-only. `--json` now exists for exactly this reason. |
| **B — behind unreachable code** | 63 | No user can reach these today. They are a **prerequisite for wiring**, not a live outage. |
| **C — behind reachable code** | **3** | `pctt_positions`, `autonomous_execution_logs`, `autonomous_scan_logs` — all three in the Fly.io trading service, none a Next.js table. See below. |

**All three class-C tables belong to the Fly.io service, not to Next.js.**
`autonomous-executor.ts` and `signal-scanner.ts` are reachable only through
`standalone-server.ts`, which `src/lib/trading/autonomous/deploy/Dockerfile:22`
bundles with esbuild and deploys to Fly.io under its own `fly.toml`, against its
own Supabase project. `pctt-trading-service.ts:808-816` states this in-code,
including the honest admission that whether that service is deployed "is an
infrastructure fact, not a code fact".

So **no phantom table sits behind Next.js-reachable code**, and no migration for
these three belongs in this repo. Verdict: **cross-service — out of scope**,
not CREATE. What they do raise is a separate operational question nobody has
answered: if that Fly.io service IS deployed, it is writing to tables this repo
never creates.

> **Limitation of this classification, stated plainly.** Reachability here is
> measured per FILE, not per function. A module can be reachable while the
> specific method that queries a phantom table is not — which is exactly the
> `pctt_positions` case. So class C is an upper bound. The honest statement is
> "at most one, and that one is cross-service", not a proven zero.

The corrected shape matters for sequencing: creating tables for class B is not
urgent firefighting, it is the cost of turning dead code on — and for any module
whose verdict is DO-NOT-WIRE or DELETE, the correct answer is no migration at
all. Nothing in this list is a live outage.

### Not every phantom needs a new table

Checked by column compatibility, not by name similarity:

| Phantom | Verdict | Evidence |
|---|---|---|
| `portfolios` | **DELETE-CALLER** | Its 5 non-test sites are all in `PortfolioRebalanceService.ts` (`:240,264,277,302,555`), which is unreachable and whose sole importer is `AutoRebalanceScheduler` (DO-NOT-WIRE, fabricates trades). An earlier revision said REMAP → `investment_portfolios`, which contradicted the rule applied to `holdings` one row down. Same rule, same verdict. |
| `user_backup_codes` | **NOT a remap — DELETE-CALLER** | Corrected. `mfa-service.ts:254-259` upserts `{user_id, codes: <JSON array>, updated_at}` — **one row per user**. `backup_codes` (`20260516000001:18-25`) is `{id, user_id, code TEXT, used, used_at, created_at}` — **one row per code**. `codes` and `updated_at` do not exist, `code` is scalar not an array, and the `upsert` on `user_id` has no unique constraint to conflict against. Remapping would fail on first write. `mfa-service` is the orphaned duplicate; it goes, per R-005. |
| `holdings` | **DELETE-CALLER** | Shape matches `investment_holdings`, but its only non-test caller is `weekly-summary-service.ts:476`, whose verdict is DO-NOT-WIRE. Remapping a query in a module that is not being wired is work with no consumer. |
| `portfolios` | **REMAP** → `investment_portfolios` | Same. |
| `bank_accounts` | **CREATE — not a remap** | `bank_connections` is connection-level (`item_id`, `institution_id`, `provider`, `access_token_encrypted`) with **no** account-level columns. The names look alike; the schemas do not. Remapping on name would have silently pointed account queries at connection rows. |

The remaining phantoms need a per-table decision. The taxonomy is CREATE /
REMAP / DELETE-THE-CALLER — and DELETE-THE-CALLER is expected to be common,
because 64 of the 68 sit behind code that may not deserve to be wired at all.

---

## Anon client — the 12 remaining modules

`getSupabase()` (`src/lib/supabase/client.ts`) is `createClient(url, ANON_KEY)`.
It stores its session in **localStorage**; the app authenticates through
`@supabase/ssr`, which uses **cookies**. On the server the two never meet, so
`auth.uid()` is NULL and RLS returns **zero rows with no error**. Silent, not
loud — which is why a green suite never saw it.

**Count this by the import, not by the function name.** The first pass of this
section grepped for the string `getSupabase()` and reported 12 modules. Four of
those were `/api/cron/*` routes that define their **own local** `getSupabase()`
from `SUPABASE_SERVICE_ROLE_KEY` — correct code that merely shares a name. The
real list is the 8 that import the symbol from `@/lib/supabase/client`:

| Module | Tables | Reachable? |
|---|---|---|
| `lib/auth/mfa-service.ts` | `user_backup_codes`, `user_mfa_names` — **both phantom** | no |
| `lib/financial/bill-calendar-service.ts` | `bills`, `bill_reminders` | no |
| `lib/goals/services/ContributionSchedulerService.ts` | `goal_contributions`, `scheduled_contributions` | no |
| `lib/goals/services/GoalNotificationService.ts` | `goal_milestones`, `recommendation_actions` | no |
| `lib/credit-bureau/inquiry-removal-service.ts` | `inquiry_removal_requests` | no |
| `lib/credit-bureau/credit-error-detector.ts` | `credit_report_errors` | no |
| `lib/documents/ocr-bridge-service.ts` | `ocr_bridge_results` | no |
| `lib/email/email-preferences-service.ts` | `email_preferences` | no |

**All eight are unreachable.** So no user is affected today. The reason it stays
P1 rather than dropping to P2 is the failure mode: wiring one of these produces
an endpoint that returns `200 OK` with an empty array instead of the user's
data, and no error anywhere. The conversion belongs in the same change as the
wiring, never after it.

---

## Architectural drift

| Claim | Reality | Source |
|---|---|---|
| `CLAUDE.md` §5: PCTT trading is shipped architecture — 7-stage pipeline, 7 AI agents, 10 strategies, 30-law compliance engine | 72 `src/lib/trading` modules are unreachable from any entry point | `audit-reachability.js` |
| `CLAUDE.md` §8: "Coverage by Domain — Trading Engine PASS (>=80%)" | Coverage measures which lines a test executes, not whether a user can. Both can be true at once, and here both are. | — |
| `LAUNCH_CHECKLIST.md`: "GO WITH CONDITIONS for M1" | NO-GO. Gates A, B, D unstarted; C has two of five. | commit `b03edca` |
| 30 migrations (`CLAUDE.md` §3) | **103** migration files, 202 tables derived | `ls supabase/migrations/*.sql \| wc -l` |

---

## The health endpoint fabricates its own evidence

Worth separating from the table because I **cited it as evidence myself**.
`smoke-test-report.md` listed `/api/health` returning "components: database,
cache, stripe, supabase all `healthy`" as a sign the application was working. It
is not evidence of anything: all four values are hardcoded.

```
$ sed -n '31,38p' src/lib/monitoring/health.ts
    // In production, this would ping the database
    // const result = await supabase.from('health_check').select('1').single();
    return { name: "database", status: "healthy", ... }
```

Same class as FND-016/017 (fake Visa 4242) and DEFAB-2 (fabricated credit
scores): a system reporting a state it never measured. It is the only one of the
three that was being read back as verification.

Found by a reviewer re-checking a *different* claim — that `connection-pool.ts`
duplicated a live health check. It does not; the live one is the stub.

---

## Why the test suite never caught any of this

16,599 tests pass. They mock the Supabase client. A mocked client cannot fail on
a missing GRANT, an absent table, an RLS policy, or a session that does not
exist — the four failure modes behind G-002, G-003, G-004 and the four defects
in `smoke-test-report.md` §3. This is not an argument for fewer unit tests; it
is the reason the integration test at
`src/lib/financial/__tests__/financial-aggregation-service.integration.test.ts`
is worth more than the 16,599 for this class of defect, and it had been silently
skipping.

---

## What this analysis does NOT cover

- **Mobile.** 0% coverage, not built, not run, not reachability-analysed here.
- **Hosted schema.** Everything is measured against a local Supabase.
- **Dynamic imports.** `import(variable)` is invisible to the reachability walk, so a module reached only that way reads as dead. No such site was found, but the search was not exhaustive.
- **Gutted-in-place features.** A file that still exists but lost its behaviour is invisible to both the deletion sweep and the reachability walk.
- **Whether the 312 unreachable modules *should* be wired.** That is per-module product judgement, tracked in `orphan-module-review.md`.

---

## Revision History

| Date | Change |
|---|---|
| 2026-08-09 | Created at `2b23237`. Corrects the phantom-table reachability split (36 → 1) after replacing a name-matching orphan check with a transitive graph walk. |
| 2026-08-09 | **Round-4 critic corrections**: 319 → **312** unreachable and 287 → **280** pre-existing, after the reachability walker learned to read build manifests (`standalone-server.ts` is a Fly.io entry point, not dead code — 7 modules were false positives). Phantom split re-derived from `--json` rather than truncated human output: A=2, B=63, **C=3**, all three cross-service. `portfolios` REMAP → DELETE-CALLER. Headline marked web-only. |
| 2026-08-09 | **Round-3 critic corrections** (`critic-review.md`): restore split 55/264 → **32/287** (the 55 was a file count, not a module count); `portfolios` moved out of test-only (A=2, B=65); `user_backup_codes` and `holdings` REMAP verdicts withdrawn as wrong. |
| 2026-08-09 | **G-004 withdrawn** and G-003 restated (12 modules → 8, all unreachable, latent not live). Both errors had the same cause: matching on a *function name* instead of an *import*. `/api/cron/*` defines a local `getSupabase()` from the service-role key, which the name-grep could not tell apart from the anon-client import. Two of the three biggest numbers in the first draft of this document came from name-matching, and both were wrong in the alarming direction. |
