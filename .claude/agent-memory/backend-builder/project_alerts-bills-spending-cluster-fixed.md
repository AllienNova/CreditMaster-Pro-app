---
name: alerts-bills-spending-cluster-fixed
description: 15-table alerts/bills/spending phantom-table cluster resolved 2026-07-31 (commit ac82c67) — 6 built, 5 deleted-as-dead, 1 already-fixed-by-another-agent, 1 minimal-fix-only, 2 owner decisions still open (erasure cascade, BillCalendarService fate).
metadata:
  type: project
---

Full per-table classification and rationale is in commit `ac82c67`'s message (`git show --stat ac82c67`) — not duplicated here. What's not in the commit and matters for whoever picks this up next:

**Erasure-cascade registration still open (team-lead hard constraint — I did not touch it).** 6 new user-data tables need adding to the consolidated cascade: `financial_alerts`, `email_logs`, `budget_alerts`, `bill_negotiations`, `bill_negotiation_outcomes`, `debt_history`. Whoever owns the cascade migration must also add these 6 names to `gdpr-erasure-cascade.test.ts`'s expected-array assertion in the same change (see [[project_gdpr-erasure-cascade-broken]] and the "unguarded set is precisely the newest additions" note in `docs/qa/SYSTEMATIC-REVIEW-SYNTHESIS.md`).

**Two live, independently-reachable, non-duplicate bill-negotiation features exist side by side** — `bill-negotiation-service.ts` (table `bill_negotiations`, routed via `/api/financial/bills/negotiate*`, used by `BillNegotiationAssistant.tsx`) and `bill-negotiator.ts` (table `bill_negotiation_outcomes`, routed via `/api/financial/bills/[id]/negotiate` + `/outcome` + `/analysis`, used by `financial-intelligence/page.tsx` web+mobile). Different data models (ongoing negotiation lifecycle w/ scripts vs. discrete outcome log w/ market analysis), both genuinely wired to distinct UI. Built both rather than picking one — consolidating them into one feature is a product call, not mine.

**`BillCalendarService` (`bill-calendar-service.ts`) is fully unreachable in production AND has unrelated phantom-COLUMN bugs on the real `bills` table** (inserts `name`/`payee`/`due_day`/`autopay_enabled`/`is_active` — none of which exist; live `bills` has `merchant_name`/`category`(enum)/`status`(enum)/`is_auto_pay` instead, matching what `bill-detection-service.ts` — the actually-wired implementation — uses correctly). Checked git log --follow per [[feedback_dead-vs-unwired-tested-code]]: only prettier-reformat + SSOT-bulk-authorship commits, no task-labeled investment, so it reads as superseded-not-active. Did NOT delete it (only fixed the one silent-swallow in `scheduleReminders`) because doing so would require touching a SHARED 2546-line `financial-pipeline.integration.test.ts` that other concurrent agents were actively co-editing, and because deleting it would also erase the separate, not-mine-to-fix `bills`-column-phantom bug surface. Flagged for `deadcode-*` agents or the team lead as a clean, high-confidence deletion candidate (source + its dedicated `bill-calendar-service.test.ts` + its "Pipeline 3" block in the integration test) if anyone wants to finish the job.

**`SpendingLimitAlertsService` was the opposite case and WAS deleted** (source + dedicated non-shared test + barrel export) — 100% of its DB calls were my two phantom tables, zero shared-file risk, git log confirmed prettier-only history. Contrast with BillCalendarService above: the deciding factor was shared-file blast radius + presence of an unrelated bug class, not the DEAD classification itself (both were equally DEAD by reachability).

**`user_notification_preferences`/`GoalNotificationService.ts`** was resolved for free — a concurrent savings/goals-cluster agent deleted the whole class before I got to it; verified zero remaining references repo-wide, no action needed.

Related: [[feedback_dead-vs-unwired-tested-code]], [[project_getsupabase-anon-key-no-jwt-rls-risk]], [[project_gdpr-erasure-cascade-broken]].
