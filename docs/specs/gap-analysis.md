# Gap Analysis — Fynvita

- **Date:** 2026-08-09
- **Commit:** `2b23237`, branch `fix/restore-from-pre-deletion-state`
- **Method:** every number below is executed output. Where a figure corrects an
  earlier one, both are shown with the command that settled it.

---

## The headline, stated first

**319 of 1,507 product modules — 21% — cannot be reached from any Next.js entry
point.** Only **55** of those came from the restore that prompted this review.
The other **264 were already dead**, and had been for months.

That reframes the request. "The restored modules have no importers" is true, but
it is a 17% slice of a pre-existing condition nobody had measured. Wiring the 55
without addressing the 264 leaves four fifths of the dead code in place.

```
$ node scripts/audit-reachability.js
product (non-test) modules : 1507
entry points               : 606
reachable from an entry    : 1189
UNREACHABLE                : 319
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
| G-001 | P1 | Dead code | 319 product modules unreachable; 264 predate the restore | `node scripts/audit-reachability.js` | Per-module WIRE / DELETE decision. Deleting is a valid, often correct outcome. |
| G-002 | P1 | Correctness | 68 tables queried, created by no migration | `node scripts/audit-phantom-tables.js` | See the table taxonomy below — most are prerequisites, not outages. |
| G-003 | P1 | Correctness | 12 modules / 25 call sites still use the session-less anon client; reads return **zero rows with no error** under RLS | grep in §"Anon client" | Convert to service-role + explicit `user_id` scoping, as the 63 already converted. |
| G-004 | P0 | Correctness | All four `/api/cron/*` routes use that anon client. Cron has no user session by definition, so the scheduler writes nothing and reports success | `src/app/api/cron/{send-reminders,financial-snapshots,cleanup-expired-sessions,check-dispute-status}/route.ts` | Service-role client. A cron job that silently no-ops is worse than one that crashes. |
| G-005 | P1 | Security gate | `audit:idor` was a false green — it keyed on the literal `getServiceRoleClient`, while 22 of 34 restored modules reach the service role via `supabaseAdmin` or a raw `SUPABASE_SERVICE_ROLE_KEY` client | commit `6e049cf` | Fixed: detection keys on the capability. 63 → 185 files scanned. |
| G-006 | P0 | Security | `POST /api/gamification/achievements` let any authenticated user mint any achievement and its XP | commit `6e049cf` | Fixed: gated 501 until a verified server-side event path exists. |
| G-007 | P1 | Supply chain | `rxjs` is imported by **9 product modules** (11 files incl. tests) and is **absent from `package.json`** — neither a dependency nor a devDependency. It resolves only because a transitive dependency hoists it | `require.resolve('rxjs')` succeeds; `package.json` has no entry | Add as a direct dependency. A hoisted transitive can move or vanish on any lockfile change, and the build breaks with no code change. |
| G-008 | P1 | Security | 18 vulnerabilities in **production** dependencies (1 critical `next-auth`, 10 high, 7 moderate). Every doc reports only the combined 33, which hides the split | `npm audit --omit=dev` | Upgrade; report prod/dev split from now on. |
| G-009 | P2 | Duplication | Two parallel backup-code implementations: `backup-codes.ts` → `backup_codes` (exists), `mfa-service.ts` → `user_backup_codes` (**does not exist**) | `src/lib/auth/mfa-service.ts:255,292` | Collapse to one. See `security-findings.md`. |
| G-010 | P2 | Docs | `LAUNCH_CHECKLIST.md` carried five stale figures cited as clearance, and a direct A–C/A–D contradiction | commit `b03edca` | Fixed. |
| G-011 | P3 | Docs | Two unrelated "Gate A–D" schemes (launch vs brand assets) | `docs/superpowers/plans/2026-04-16-*.md` | Disambiguated in the checklist header. |

---

## The 68 phantom tables, classified by who can reach them

This classification **corrects an earlier figure in this same session.** A
name-matching orphan check said 36 phantom tables sat behind reachable code and
therefore failed at runtime today. That check counted a module imported only by
its own test as "imported". Measured by transitive reachability:

| Class | Count | Meaning |
|---|---:|---|
| **A — test-only** | 3 | `plaid_items`, `portfolios`, `tax_document_access_log`. Only a test seeds them. The test would fail against a real database. |
| **B — behind unreachable code** | 64 | No user can reach these today. They are a **prerequisite for wiring**, not a live outage. |
| **C — behind reachable code** | **1** | `pctt_positions`, via `src/lib/trading/pctt/pctt-trading-service.ts`. The only phantom a real request can hit. |

The corrected shape matters for sequencing: creating 64 tables is not urgent
firefighting, it is the cost of turning dead code on. Only `pctt_positions` is
urgent, and only if that path is genuinely exercised.

### Not every phantom needs a new table

Checked by column compatibility, not by name similarity:

| Phantom | Verdict | Evidence |
|---|---|---|
| `user_backup_codes` | **REMAP** → `backup_codes` | Existing table has exactly `code, used, used_at, user_id, created_at` — the columns `mfa-service.ts:255,292` writes. |
| `holdings` | **REMAP** → `investment_holdings` | Live table carries the full holding shape. |
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

| Module | Tables | Why it matters |
|---|---|---|
| `app/api/cron/send-reminders/route.ts` | `notifications` | **G-004** |
| `app/api/cron/financial-snapshots/route.ts` | 5 history tables | **G-004** |
| `app/api/cron/cleanup-expired-sessions/route.ts` | `sessions`, `audit_logs`, … | **G-004** |
| `app/api/cron/check-dispute-status/route.ts` | `notifications` | **G-004** |
| `lib/auth/mfa-service.ts` | `user_backup_codes`, `user_mfa_names` | auth path; both tables also phantom |
| `lib/financial/bill-calendar-service.ts` | `bills`, `bill_reminders` | |
| `lib/goals/services/ContributionSchedulerService.ts` | `goal_contributions`, `scheduled_contributions` | money-adjacent |
| `lib/goals/services/GoalNotificationService.ts` | `goal_milestones`, `recommendation_actions` | |
| `lib/credit-bureau/inquiry-removal-service.ts` | — | |
| `lib/credit-bureau/credit-error-detector.ts` | `credit_report_errors` | |
| `lib/documents/ocr-bridge-service.ts` | `ocr_bridge_results` | |
| `lib/email/email-preferences-service.ts` | `email_preferences` | |

Eight of the twelve are themselves unreachable, so only the four cron routes are
live today. That is what makes G-004 a P0 and the rest P1.

---

## Architectural drift

| Claim | Reality | Source |
|---|---|---|
| `CLAUDE.md` §5: PCTT trading is shipped architecture — 7-stage pipeline, 7 AI agents, 10 strategies, 30-law compliance engine | 72 `src/lib/trading` modules are unreachable from any entry point | `audit-reachability.js` |
| `CLAUDE.md` §8: "Coverage by Domain — Trading Engine PASS (>=80%)" | Coverage measures which lines a test executes, not whether a user can. Both can be true at once, and here both are. | — |
| `LAUNCH_CHECKLIST.md`: "GO WITH CONDITIONS for M1" | NO-GO. Gates A, B, D unstarted; C has two of five. | commit `b03edca` |
| 30 migrations (`CLAUDE.md` §3) | **103** migration files, 202 tables derived | `ls supabase/migrations/*.sql \| wc -l` |

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
- **Whether the 319 unreachable modules *should* be wired.** That is per-module product judgement, tracked in `orphan-module-review.md`.

---

## Revision History

| Date | Change |
|---|---|
| 2026-08-09 | Created at `2b23237`. Corrects the phantom-table reachability split (36 → 1) after replacing a name-matching orphan check with a transitive graph walk. |
