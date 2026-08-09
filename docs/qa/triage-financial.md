# Phantom Table Triage — Financial / Savings / Goals / Budgeting

Slice owner: `triage-financial`. Scope: 39 assigned tables, 143 non-test call sites, 22 source files.
Verified against the live DB (56 migrations applied) on port 54322. **All 39 confirmed ABSENT** —
none is a view, none is a twin, and **none appears in any `CREATE TABLE` in `supabase/migrations/`**.
They were never written, not shadowed.

Zero call sites in `mobile-app/` — this slice is entirely web (`src/lib/**`).

---

## Method notes (what "reachable" means here)

Reachability was computed by a BFS over resolved import edges (`@/` alias + relative), from each
service file outward to Next.js entry points (`src/app/api/**/route.ts`, `src/app/**/page.tsx`).

Two findings drive most of the DEAD classifications:

1. **`src/lib/financial/index.ts` has ZERO importers.** It is a barrel that re-exports
   `AutoSaveRulesService`, `SpendingLimitAlertsService`, `ManualAccountService`, `BillCalendarService`
   and others — and nothing in the repo imports the barrel. Anything whose only non-test importer is
   this barrel is unreachable.
2. **`src/app/api/financial/goals/[id]/investment/route.ts` imports the goals barrel but calls only
   two pure methods** — `goalInvestmentService.getRecommendedAllocation()` (line 83) and
   `.calculateProjection()` (line 89). Neither touches the DB. `ContributionSchedulerService`,
   `GoalNotificationService`, and every DB-touching method of `GoalInvestmentService`
   (`linkGoalToInvestment`, `getLinkedInvestments`, `setupContributionSchedule`,
   `getContributionSchedule`, `processContribution`, `getGoalProgress`) are reached by no route,
   page, or job. `SmartAllocationService` imports `GoalInvestmentService` for **types only**
   (`import { GoalType, RiskTolerance }`).

No cron, queue, or scheduled job invokes any of these services — grep for every service name across
`src`, `mobile-app`, `scripts`, and `vercel.json` returned only the barrels themselves.

---

## Triage table

| table | classification | real equivalent (if RENAME) | entry point / reachability | failure mode (swallow? quote) | severity | recommended action |
|---|---|---|---|---|---|---|
| `debts` | **RENAME** | **`debt_accounts`** — `id, user_id, name, type, balance, original_balance, interest_rate, minimum_payment, due_date, creditor_name, is_active, created_at, updated_at`. Matches `financial-aggregation-service.ts:593` filter `.eq("is_active", true)` exactly. Missing only `linked_account_id`, `account_number`, `start_date` (mapped to `undefined`). | REACHABLE — `/api/financial/health-score`, `/api/financial/health-score/v2`, `/api/financial/aggregated` (via `financial-aggregation-service.ts:593`); `/api/financial/savings/analyze`, `/recommendations`, `/goal-recommendations`, `/subscriptions` (via `savings-optimizer.ts:1367`) | **SWALLOW — both callers.** `savings-optimizer.ts:1372` `if (error \|\| !debts) { return false; }`; `financial-aggregation-service.ts:632` `} catch { return this.getEmptyDebtData(); }` | **CRITICAL** | Rename to `debt_accounts`. **Also fix the filter**: `savings-optimizer.ts:1370` uses `.eq("status", "active")` but `debt_accounts` has no `status` column — it has `is_active boolean`. A pure string swap leaves this query failing with `42703 undefined_column`. |
| `savings_goals` | **RENAME (partial — needs ALTER)** | **`financial_goals`** — shares `name, target_amount, current_amount, target_date, auto_save_enabled, priority, status` (7 of 17 mapped fields) and carries the savings-automation concepts `auto_save_amount`, `auto_save_frequency`, `linked_account_id`. **Missing 10 columns the code maps**: `category, start_date, completed_at, linked_rule_ids, progress_percentage, projected_completion_date, on_track, icon, color, notes`. Filters used (`.in("status", [...])`, `.order("priority")`) both resolve. | REACHABLE — `/api/financial/savings`, `/api/financial/savings/goals/[id]`, `/api/financial/savings/rules/[id]`, plus the 4 savings-optimizer routes | **MIXED.** Reads swallow: `savings-optimizer.ts:1330` `if (error \|\| !goals) { return []; }`; `savings-automation-service.ts:196` `if (error) { return []; }`. Writes throw: `:307` `throw new Error(\`Failed to update savings goal: ...\`)` | **HIGH** | Rename to `financial_goals` **plus** an `ALTER TABLE` adding the 10 missing columns. `createGoal` inserts `category` and `start_date` — it will fail on insert until those exist. |
| `health_score_history` | **RENAME (needs column mapping)** | **`financial_health_scores`** — same purpose (per-user health score over time). Code selects `date, score, grade`; real table has `overall_score, calculated_at, breakdown, recommendations, ...`. Map `date`→`calculated_at`, `score`→`overall_score`; **`grade` has no column anywhere** (derive it). (`vitality_score_history` is a weaker match — score-only, period-bucketed.) | REACHABLE — `/api/financial/aggregated`, `/api/financial/health-score`, `/api/financial/health-score/v2` (`financial-aggregation-service.ts:932`) | **SWALLOW — error never destructured.** `const { data } = await supabase.from("health_score_history")...` then `return (data \|\| []).map(...)` | MEDIUM | Rename + map columns, or drop the trend series. Health-score history chart is currently always empty. |
| `financial_accounts` | **UNBUILT** | none — **there is no accounts table of any name in the DB**, and no FK anywhere references one. `transactions.account_id`, `bills.account_id`, `income_sources.account_id`, `financial_goals.linked_account_id`, `recurring_bills.linked_account_id` are all unconstrained orphan columns. | REACHABLE, widest blast radius in this slice — 43 entry points via `plaid-service.ts` incl. `/api/financial/accounts`, `/api/financial/plaid/exchange-token`, `/api/financial/transactions`; `/api/chat/financial*` (4 routes) via `financial-chat-engine.ts`; `/api/credit-builder/{score,recommendations,loans,secured-cards,progress}` + `/credit-builder/loan` and `/credit-builder/secured-card` pages via `credit-builder-service.ts` | **SWALLOW, three different ways.** (1) `plaid-service.ts:287` — empty block, comment only: `if (error) { // PlaidService error: Error storing account }` → sync reports success, nothing persists. (2) `financial-chat-engine.ts:1121` `if (!accounts \|\| accounts.length === 0) return { ..., message: "No debt accounts found. Great job being debt-free!" }`. (3) `credit-builder-service.ts:1068` and `:1174` fall back to hardcoded fabricated values (`revolving: 2, installment: 1`; `averageAge = 3.5, oldestAccount = 7`). `plaid-service.ts:213` `getAccounts` is the one loud path — `throw new Error("Failed to fetch accounts")`. | **CRITICAL** | Write the migration. This is the anchor table for bank linking; a dozen features read through it. |
| `savings_rules` | UNBUILT | none | REACHABLE — `/api/financial/savings`, `/api/financial/savings/rules/[id]` | MIXED. `savings-automation-service.ts:55` `if (error) { return []; }`; `:107` `throw new Error(\`Failed to create savings rule: ...\`)` | HIGH | Migration, or delete the savings-automation feature. |
| `savings_contributions` | UNBUILT | none | REACHABLE — `/api/financial/savings`, `/api/financial/savings/goals/[id]` | MIXED. `:386` `if (error) { return []; }`; `:346` `throw new Error(\`Failed to add contribution: ...\`)` | HIGH | Migration. |
| `savings_transfers` | UNBUILT | none | REACHABLE — `/api/financial/savings` (summary) | MIXED. Summary swallows — `const { data: monthTransfers } = ...` then `(monthTransfers \|\| []).reduce(...)` → totals silently `0`. `:493` `throw new Error(\`Failed to create transfer: ...\`)` | HIGH | Migration. This is the savings money ledger; `executeTransfer` is also a stub. |
| `savings_history` | UNBUILT | none | REACHABLE — `/api/financial/aggregated`, `/api/financial/health-score{,/v2}` | SWALLOW — `const { data } = ...; return (data \|\| []).map(...)` (`financial-aggregation-service.ts:875`) | MEDIUM | Migration or remove the trend series. |
| `debt_history` | UNBUILT | none | REACHABLE — same 3 routes | SWALLOW — same pattern (`:894`) | MEDIUM | Migration or remove. |
| `net_worth_history` | UNBUILT | none | REACHABLE — same 3 routes (`:644` and `:818`) | SWALLOW — `const { data: history } = ...` then `(history \|\| []).map(...)`. Consequence at `:653`: `previousMonth` falls back to current net worth, so month-over-month change renders as exactly 0. | MEDIUM | Migration or remove. |
| `monthly_summaries` | UNBUILT | none — no rollup table exists (`monthly_bills_summary` is a bills-only view) | REACHABLE — same 3 routes (`:837`, `:856`) | SWALLOW — `(data \|\| []).map(...)` | MEDIUM | Migration or compute from `transactions` on the fly. |
| `budget_alerts` | UNBUILT | none — `budgets` carries `alert_threshold` + `alert_sent` flags but there is no alert record table; `bill_alerts` is bill-scoped | REACHABLE — `/api/financial/budgets/alerts` plus 9 more budget routes | **PROPAGATES (loud).** All four paths throw: `budget-service.ts:850` `throw new Error(\`Failed to create alert: ...\`)`; `:879` `Failed to fetch alerts`; `:894` / `:909` mark-read / dismiss | HIGH | Migration. The alerts endpoint 500s today — visibly broken, not silent. |
| `bill_negotiations` | UNBUILT | none. **False friend: `negotiations` exists but is a different domain** — collection-agency debt settlement (`collection_agency, original_creditor, settlement_percentage, settlement_amount`), not recurring-bill rate negotiation. Bill negotiation state lives as `recurring_bills.negotiation_status` / `.negotiation_savings`. | REACHABLE — `/api/financial/bills/negotiate`, `/api/financial/bills/negotiate/[id]` | PROPAGATES — `bill-negotiation-service.ts:275` `throw new Error(\`Failed to create negotiation: ...\`)`; `:308` `Failed to get negotiations`; `:341` update. Only `getNegotiation` swallows (`:290` `if (error \|\| !data) return null;`) | HIGH | Migration. **Do not point this at `negotiations`** — the schemas are unrelated. |
| `bill_negotiation_outcomes` | UNBUILT | none | REACHABLE — `/api/financial/bills/[id]/negotiate`, `/api/financial/bills/[id]/outcome`, `/api/financial/bills/analysis` | MIXED. `bill-negotiator.ts:301` throws on insert. `:325` swallows on read: `if (error) { // BillNegotiator error: ... return []; }` → negotiation history renders empty and savings analytics compute from nothing. Note `:279` casts through `as any`, defeating type checking. | HIGH | Migration. |
| `financial_alerts` | UNBUILT | none — `notifications` is the nearest table but lacks `severity`, `dismissed`, `expires_at`, `action_required`, all of which this query filters/orders on | REACHABLE, broad — 17 entry points via `financial-context-engine.ts:860`, incl. all `/api/ai/financial-coach/*` routes and `/api/financial/context{,/summary}` | SWALLOW — `const { data } = ...` (error never bound), `return (data \|\| []).map(...)` | MEDIUM | Migration, or extend `notifications` and repoint. Every AI-coach prompt currently sees zero alerts. |
| `gig_platforms` | UNBUILT | none | REACHABLE — `/api/financial/income/gig` | PROPAGATES — `gig-income-service.ts:221` `throw new Error("Failed to fetch gig platforms")`; `:247` add | HIGH | Migration. Feature is 100% non-functional but fails loudly. |
| `gig_income` | UNBUILT | none — `income_sources` is a recurring-source table (`name, amount, frequency, next_pay_date`), not a per-payment ledger (`platform_id, amount, date, type`) | REACHABLE — `/api/financial/income/gig` | PROPAGATES — `:322` `throw new Error("Failed to add gig income")`; `:341` delete; reads throw too | HIGH | Migration. |
| `gig_deductions` | UNBUILT | none | REACHABLE — `/api/financial/income/gig` | PROPAGATES — `:378` `throw new Error("Failed to fetch gig deductions")`; `:415` add; `:429` delete | HIGH | Migration. Tax-deduction tracking — get the schema right before users rely on it for filing. |
| `accounts` | **DEAD** | none (see `financial_accounts`) | UNREACHABLE — `proactive-alert-engine.ts:376`; the file has **zero importers**, not even a test | SWALLOW — `const { data: accounts } = ...; if (!accounts) { shouldAlert: false, ... }` (low-balance alert fails closed) | LOW | Delete `proactive-alert-engine.ts` or wire it up and build the tables. Dead as written. |
| `proactive_alerts` | DEAD | none | UNREACHABLE — `proactive-alert-engine.ts` (6 sites), zero importers | n/a — unreachable | LOW | Delete with the file. |
| `alert_preferences` | DEAD | (if revived: **`notification_preferences`** — has `channels`, `quiet_hours`, per-user prefs; no home for `enabledTypes`) | UNREACHABLE — `proactive-alert-engine.ts:889`, `:1090` | SWALLOW — `.single()` then `if (data) return data;` else hardcoded defaults | LOW | Delete with the file. |
| `manual_accounts` | DEAD | none | UNREACHABLE — `manual-account-service.ts` (6 sites); only non-test importer is the un-imported `src/lib/financial/index.ts` | n/a — unreachable | LOW | Delete the service, or wire a route and build the table. |
| `bank_accounts` | DEAD | none | UNREACHABLE — `ContributionSchedulerService.ts:619` `checkAccountBalance` | SWALLOW, **fails closed**: `return (data?.balance \|\| 0) >= amount;` → `0 >= amount` is `false` for any positive amount, so the funds check would always deny. Harmless only because nothing calls it. | LOW | Delete with the scheduler. If the scheduler is ever revived this becomes CRITICAL — it also has a stubbed `executeTransfer` that returns `true` without moving money (`:626`). |
| `scheduled_contributions` | DEAD | none | UNREACHABLE — `ContributionSchedulerService.ts` (12 sites, the largest single-table count in this slice); no route or job calls it | n/a — unreachable | LOW | Delete the service, or build the table + register a job. Highest count, lowest impact — do not let the number mislead prioritization. |
| `contribution_schedules` | DEAD | none | UNREACHABLE — `ContributionSchedulerService.ts:507,528`; `GoalInvestmentService.ts:426,468,497,540` (all in methods no route calls) | n/a — unreachable | LOW | Delete or build. |
| `goal_contributions` | DEAD | none | UNREACHABLE — `ContributionSchedulerService.ts:452`; `GoalInvestmentService.ts:506,789` | n/a — unreachable | LOW | Delete or build. |
| `goal_investment_links` | DEAD | none | UNREACHABLE — `GoalInvestmentService.ts:344,379` (`linkGoalToInvestment`, `getLinkedInvestments`) | n/a — unreachable | LOW | Delete or build. |
| `goal_milestones` | DEAD | none — `milestones_achieved` is credit-score milestones (`target_score`, `achieved_score`), not goal-progress. Goal milestones already exist as JSONB: `financial_goals.milestones` and `goal_tracking.milestones`. | UNREACHABLE — `GoalNotificationService.ts:321,332` | SWALLOW — `const { data: existing } = ...; (existing \|\| []).map(...)` → every milestone would re-fire on each run | LOW | Delete, or use the existing `financial_goals.milestones` JSONB rather than adding a table. |
| `goal_notifications` | DEAD | none (`notifications` exists but shapes differ) | UNREACHABLE — `GoalNotificationService.ts:143,210,261,285` | n/a — unreachable | LOW | Delete or repoint at `notifications`. |
| `auto_save_rules` | DEAD | none | UNREACHABLE — `auto-save-rules-service.ts` (5 sites); only non-test importer is the un-imported barrel. Note `/api/financial/goals/optimizations/route.ts:27` returns a hardcoded `autoSaveRules: [...]` literal instead of calling this service. | n/a — unreachable | LOW | Delete the service (and de-mock the optimizations route separately). |
| `save_transfers` | DEAD | none | UNREACHABLE — `auto-save-rules-service.ts` (6 sites), barrel-only | n/a — unreachable | LOW | Delete with the service. Note the near-duplicate `savings_transfers` in the live savings service — two parallel implementations of the same idea, one dead. |
| `spending_limits` | DEAD | none | UNREACHABLE — `spending-limit-alerts-service.ts` (5 sites), barrel-only | n/a — unreachable | LOW | Delete or wire up. |
| `spending_alerts` | DEAD | none (`emotional_spending_alerts` is a different feature) | UNREACHABLE — `spending-limit-alerts-service.ts` (6 sites), barrel-only | n/a — unreachable | LOW | Delete or wire up. |
| `merchant_categories` | DEAD | none — `merchants` + `merchant_detection_patterns` exist and cover merchant→category, but with a different shape (no per-user learned confidence) | UNREACHABLE — `transaction-categorizer.ts:559,604`; only importers are two test files | **SWALLOW, and the guard is inert**: the upsert at `:559` is wrapped in `try { ... } catch { }`, but postgrest-js **resolves** `{error}` rather than throwing, so the catch never fires and the error is discarded with no branch at all. | LOW | Delete, or repoint learned categories at `merchants`/`merchant_detection_patterns`. Textbook example of a catch block that cannot catch. |
| `bill_reminders` | DEAD | (if revived: **`bill_alerts`** — `id, bill_id, user_id, type, message, severity, read, created_at`; would need `reminder_date`, `sent`, `sent_at`) | UNREACHABLE — `bill-calendar-service.ts:653,670,693`; barrel-only. `src/app/budgeting/bills/page.tsx` does **not** import the service. | MIXED — insert at `:653` has no error check at all; `:686` `throw new Error(\`Failed to fetch reminders: ...\`)` | LOW | Delete, or extend `bill_alerts` and repoint. |
| `weekly_summaries` | DEAD | none | UNREACHABLE — `weekly-summary-service.ts:740,755,778`; file has **zero importers**, not even a test | n/a — unreachable | LOW | Delete the service or build the table + a weekly job. |
| `summary_preferences` | DEAD | none | UNREACHABLE — `weekly-summary-service.ts:796,836`, zero importers | n/a — unreachable | LOW | Delete with the service. |
| `rent_reporting_accounts` | DEAD | none | UNREACHABLE — `RentReportingService.ts:375,390,406`; only importers are two test files (incl. an IDOR test) | n/a — unreachable | LOW | Delete, or build the tables and expose a route. Rent reporting is a marketed credit-building feature with no route behind it. |
| `rent_payments` | DEAD | none | UNREACHABLE — `RentReportingService.ts:429,455` | n/a — unreachable | LOW | Delete or build. |

---

## Counts

| classification | count | of which reachable |
|---|---:|---:|
| RENAME | 3 | 3 |
| UNBUILT | 15 | 15 |
| DEAD | 21 | 0 |
| **total** | **39** | **18** |

Severity: **2 CRITICAL**, **10 HIGH**, **5 MEDIUM**, **22 LOW**.

21 of 39 tables (54%) are referenced only by code no route, page, or job can reach. Of the 143 call
sites, 78 sit in unreachable files — **call-site count is a poor proxy for impact in this slice**
(`scheduled_contributions` has the most sites, 12, and zero user impact; `debts` has 2 sites and is
CRITICAL).

---

## Top 5 by real user impact

**1. `financial_accounts` — CRITICAL — UNBUILT.**
The anchor table for bank linking, and it does not exist under any name. Three separate silent
failures ride on it, each one making a wrong answer look like a right one:

- `financial-chat-engine.ts:1121` — the AI financial coach tells **every** user
  `"No debt accounts found. Great job being debt-free!"`. A user with $40k of credit-card debt asking
  the coach how to pay it down is congratulated for having none. This is the exact failure class as
  the DTI gate: a money decision computed from empty input, presented confidently.
- `financial-chat-engine.ts:1180` — the invest-vs-pay-down-debt risk check computes `highAprdDebt`
  as `0`, so it always recommends investing over debt payoff.
- `credit-builder-service.ts:1068`/`:1174` — credit mix and credit age fall back to **fabricated
  constants** (`revolving: 2`, `averageAge = 3.5 years`) and present them to the user as their own
  credit profile. This is FCRA-adjacent surface.
- `plaid-service.ts:287` — `storeAccount` has an **empty** `if (error) { }` block with only a
  comment. `syncAccounts` returns a populated array and reports success while persisting nothing.

**2. `debts` — CRITICAL — RENAME to `debt_accounts`.**
Cheapest fix with the largest correctness payoff, and it is a rename, not a build.
`savings-optimizer.ts:1372` returns `false` from `hasHighInterestDebt()`, so the "Pay Off
High-Interest Debt" recommendation at `:443` **can never fire** — users holding 24% APR balances are
steered toward building an emergency fund instead. Separately, `financial-aggregation-service.ts:236`
computes `debtToIncomeRatio` from `context.debt.totalDebt`, which the `catch` at `:632` pins to `0`.
`/api/financial/health-score` therefore reports DTI = 0 and a clean debt score for every user.
Watch the filter bug: `savings-optimizer.ts:1370` filters on `status`, a column `debt_accounts` does
not have.

**3. The savings cluster — `savings_goals` (RENAME) + `savings_rules`, `savings_contributions`,
`savings_transfers` (UNBUILT) — HIGH.**
An entire marketed feature across 6 API routes. Reads return `[]` so dashboards show $0 saved and
zero goals; writes throw, so creating a goal or rule 500s. `savings_goals` maps cleanly enough onto
`financial_goals` to be worth renaming, but 10 columns must be added first — a bare string swap will
break `createGoal`, which inserts `category` and `start_date`.

**4. `gig_income` / `gig_deductions` / `gig_platforms` — HIGH — UNBUILT.**
`/api/financial/income/gig` is completely non-functional; every path throws. It ranks here rather
than lower because `gig_deductions` is tax-deduction data — if this ships after the schema is
guessed rather than designed, users will file against it. Failing loudly today is the good outcome;
fix it before it starts succeeding quietly.

**5. `budget_alerts` (HIGH) and `financial_alerts` (MEDIUM) — UNBUILT.**
`budget_alerts` 500s `/api/financial/budgets/alerts` and 9 sibling routes — visibly broken.
`financial_alerts` is the more insidious of the pair: it swallows to `[]` and feeds 17 entry points
including every `/api/ai/financial-coach/*` route, so the coach reasons about the user's finances
with the alert list silently empty and no indication anything is missing.

---

## Adjacent finding (outside assigned list)

`src/lib/financial/financial-aggregation-service.ts:913` queries `.from("investment_history")` —
also absent from the live DB, same swallow pattern (`(data || []).map(...)`), same 3 reachable routes.
It was not on my assigned list; flagging so it is not lost between slices.
