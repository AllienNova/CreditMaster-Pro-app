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
| G-007 | P1 | Supply chain | `rxjs` is imported by **9 product modules** (11 files incl. tests) and is **absent from `package.json`** — neither a dependency nor a devDependency. It resolves only because a transitive dependency hoists it | `require.resolve('rxjs')` succeeds; `package.json` has no entry | Add as a direct dependency. A hoisted transitive can move or vanish on any lockfile change, and the build breaks with no code change. |
| G-008 | P1 | Security | 18 vulnerabilities in **production** dependencies (1 critical `next-auth`, 10 high, 7 moderate). Every doc reports only the combined 33, which hides the split | `npm audit --omit=dev` | Upgrade; report prod/dev split from now on. |
| G-009 | P2 | Duplication | Two parallel backup-code implementations: `backup-codes.ts` → `backup_codes` (exists), `mfa-service.ts` → `user_backup_codes` (**does not exist**) | `src/lib/auth/mfa-service.ts:255,292` | Collapse to one. See `security-findings.md`. |
| G-010 | P2 | Docs | `LAUNCH_CHECKLIST.md` carried five stale figures cited as clearance, and a direct A–C/A–D contradiction | commit `b03edca` | Fixed. |
| G-011 | P3 | Docs | Two unrelated "Gate A–D" schemes (launch vs brand assets) | `docs/superpowers/plans/2026-04-16-*.md` | Disambiguated in the checklist header. |
| **G-012** | **P1** | **Fabricated status — LIVE** | **`/api/health` reports every component healthy without checking any of them.** `checkDatabase()` has its query commented out and returns `status: "healthy"` (`monitoring/health.ts:31-38`); `checkCache()` likewise (`:55-60`); `checkExternalServices()` does `fetch(...).catch(() => {})` then unconditionally pushes `"healthy"` (`:99-111`), so its `degraded` branch is unreachable. `readinessCheck()` returns `ready: health.status !== "unhealthy"`, which can therefore never be false. | `src/lib/monitoring/health.ts:31,55,99-111`; route is reachable via `src/app/api/health/route.ts` | Make each probe do real work and fail loudly. A health endpoint that cannot report unhealthy is worse than none — an uptime monitor or k8s readiness probe will route traffic to a pod with a dead database. |
| G-013 | P2 | Dead code | 5 of the 8 `src/lib/monitoring/` modules are unreachable, including the barrel `index.ts` — so `analytics.ts`, `error-tracking.ts`, `metrics.ts` and `sentry.ts` have no consumer. `health.ts` is the only live one, and it is G-012. | `audit-reachability.js` | Decide the monitoring story as one scoped pass, not module by module. |

---

## The 68 phantom tables, classified by who can reach them

This classification **corrects an earlier figure in this same session.** A
name-matching orphan check said 36 phantom tables sat behind reachable code and
therefore failed at runtime today. That check counted a module imported only by
its own test as "imported". Measured by transitive reachability:

| Class | Count | Meaning |
|---|---:|---|
| **A — test-only** | 2 | `plaid_items`, `tax_document_access_log`. `portfolios` was wrongly placed here — it has 9 sites, 4 of them in `PortfolioRebalanceService.ts`. Cause worth recording: the classification was built by parsing this script's **human output, which truncates at 4 sites** and prints `... +N more`, so any table whose first four sites were tests looked test-only. `--json` now exists for exactly this reason. |
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
| `portfolios` | **DELETE-CALLER** | Its 4 non-test sites are all in `PortfolioRebalanceService.ts`, which is unreachable and whose sole importer is `AutoRebalanceScheduler` (DO-NOT-WIRE, fabricates trades). An earlier revision said REMAP → `investment_portfolios`, which contradicted the rule applied to `holdings` one row down. Same rule, same verdict. |
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
