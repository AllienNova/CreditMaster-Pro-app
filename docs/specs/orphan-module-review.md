# Orphan Module Review

Branch: `fix/restore-from-pre-deletion-state`. HEAD at time of review: `835cf72`.
Source list: `/tmp/orphans.txt` as read at task start (58 paths, numbered 1–58; a
concurrent process later overwrote that file with a differently-formatted
57-line version — this review uses the original 58-path capture, preserved at
`/tmp/kh-orphan-paths.txt`). A 59th module, `src/lib/financial/auto-save-rules-service.ts`,
is included because team-lead named it explicitly for the money-movement check;
it is a genuine zero-importer orphan that did not make the original 58-item
capture (verified: `grep -rln "auto-save-rules-service" src/` returns only its
own test file).

## Correction to the task framing

Team-lead's brief states the orphans were "restored from a concurrent Claude
session's work (branch `backup/pre-wipe-2026-08-05`, which branched at commit
`cd8fc21`... 3 months STALE)" and asks staleness to be checked per module
against that risk. Git evidence shows this framing applies to only **11 of the
59** modules reviewed here — not the full set:

- **11 modules** (`proactive-alert-engine.ts`, `social-proof-nudges-service.ts`,
  `weekly-summary-service.ts`, `auth/mfa-service.ts`,
  `SecuredCardRecommendationService.ts`, `accountability-partners-service.ts`,
  `commitment-device-service.ts`, `ContributionSchedulerService.ts`,
  `AutoRebalanceScheduler.ts`, `expert-sessions-service.ts`,
  `auto-save-rules-service.ts`) were **deliberately deleted from the main
  lineage on 2026-07-31** by six commits (`ac82c67`, `99a579c`, `6766a3a`,
  `5635b21`, `df3e1f0`, `b6f6efe` — all confirmed ancestors of HEAD via
  `git merge-base --is-ancestor`), each with a documented cause: phantom-table
  references, zero reachable importers verified by import-graph trace, or
  duplication of a live implementation. They were then blanket-restored on
  2026-08-09 by `8e5481d` ("reactivate 55 services deleted as dead code — they
  were another session's work"), which — per its own framing — treated a
  **deliberate, evidenced deletion** as an accidental loss. `b1e993a` (also
  2026-08-09) caught and fixed the one concrete staleness regression this
  caused: the restored `accountability-partners-service.ts` and
  `commitment-device-service.ts` had reverted an IDOR fix (`1d24dd9`, `88276d2`,
  2026-05-17) that existed on main but not on the stale backup branch.
- **The other 48 modules** have continuous, unbroken main-line history (no `D`
  status ever appears in `git log --all -- <path>`) and were never sourced from
  the backup branch. The separate `0667ffb` "salvage the 53 files that existed
  only on backup/pre-wipe" commit — the other restoration event on this branch
  — states explicitly in its own body: **"Of the 55 [salvaged], ZERO are
  application source (`src/`)"**. So no `src/` orphan in this list owes its
  current content to the stale backup branch except the 11 above. For these 48,
  "is the restored copy behind the pre-deletion version" does not apply — there
  is no pre-deletion version; they were never deleted.

This matters because it means most of this orphan set is not "another
session's unwired work" in the sense implied — it's ordinary dead code that
accumulated over the product's history (earliest: Oct 2025), unrelated to the
backup-branch incident, sitting alongside a smaller set that the project's own
Wave 7 remediation already investigated and killed for cause nine days before
this restore.

## Phantom-table audit

`node scripts/audit-phantom-tables.js` (full output: 68 phantom tables of 232
referenced, 202 real tables from migrations). Every phantom table cited below
is quoted directly from that script's own file:line output.

## P0 — fabricated money movement (all four modules team-lead asked about)

All four write a DB row claiming a transfer/contribution/donation/trade
occurred, with **no call to any payment, banking, or brokerage rail**. Each
carries an in-code comment acknowledging the gap.

1. **`src/lib/financial/auto-save-rules-service.ts:475-506`** —
   `executeTransfer()`: comment "In a real implementation, this would
   integrate with banking APIs / For now, we mark it as completed and update
   stats" (line 484-485); sets `save_transfers.status = "completed"` (line 490)
   and calls `increment_rule_stats` RPC (line 500-503). No banking call
   anywhere in the file.
2. **`src/lib/goals/services/ContributionSchedulerService.ts:627-639`** —
   `executeTransfer()` takes `sourceAccountId`/`goalId`/`amount`, voids all
   three (`void sourceAccountId; void goalId; void amount;`), comment "In
   production, this would integrate with a payment processor / For now,
   simulate the transfer", and unconditionally `return true`. Feeds
   `completeContribution()` (line 440-467), which increments the live,
   user-facing `financial_goals.current_amount` (line 641-660) — a real table,
   not phantom, so this is not blocked by missing schema; wiring it as-is
   moves a real progress-bar number with fabricated money.
3. **`src/lib/gamification/commitment-device-service.ts:399-423`** —
   `executeConsequence()`: comment "In production, this would integrate with
   payment processing / For now, just record that the consequence was
   executed"; sets `consequence_executed: true` and inserts a
   `commitment_donations` row naming a real charity (from the hardcoded
   `CHARITIES` list, e.g. "Habitat for Humanity", line 110-151) and a dollar
   amount. No payment call. This is the most severe of the four: it tells a
   user a named charity received money in their name when nothing happened.
4. **`src/lib/investments/services/AutoRebalanceScheduler.ts:425-493`** —
   `executeRebalance()`: comment "In production, this would call
   OrderExecutionEngine / For now, simulate successful execution"; fabricates
   `ExecutedTrade[]` with synthetic `orderId` (`ORD-${Date.now()}-...`),
   `executedPrice`, and `commission`, marks `success: true`, then calls
   `PortfolioRebalanceService.recordRebalance()`
   (`PortfolioRebalanceService.ts:528-569`), which writes to phantom tables
   `rebalance_history` and `portfolios` and updates
   `portfolios.last_rebalance_date`. `PortfolioRebalanceService.ts` is not
   itself in the orphan list (it has one importer) but that importer is this
   same unreachable scheduler, so it is transitively dead too.

All four also match the exact table/reachability findings of the 2026-07-31
deletion commits (below) — the fabrication is not the only reason they're
DO-NOT-WIRE, it compounds a dead-code and phantom-table verdict already
reached independently by the codebase's own prior remediation.

## Duplicate-of-a-live-module findings (verified this session, not just cited)

Each confirmed by reading the live counterpart's actual imports, not just
matching names:

- **`src/lib/auth/mfa-service.ts`** — zero importers; live MFA/recovery path is
  `src/lib/auth/backup-codes.ts` on the real `backup_codes` table, wired to
  `BackupCodesManagement.tsx` (per `b6f6efe` commit body). Phantom tables:
  `user_backup_codes`, `user_mfa_names` — note the near-miss name collision
  with the real `backup_codes` table.
- **`src/lib/credit/services/SecuredCardRecommendationService.ts`** — live
  `/api/financial/credit/simulator` route uses its own self-contained
  `getSecuredCardRecommendations()` in `CreditScoreSimulator.ts` (per `5635b21`
  commit body). Phantom table: `user_credit_profiles`.
- **`src/lib/credit-repair/db-legacy.ts`** — the sibling `src/lib/credit-repair/db/`
  directory is the live DB layer: confirmed by grep, **15+ live API routes**
  (`disputable-items`, `negotiate`, `inquiries`, `cards`, `disputes`, `score`,
  `accounts`, `quick-wins`, `goodwill`, `reports`, ...) import
  `@/lib/credit-repair/db`, none import `db-legacy.ts`. Queries `credit_reports`
  (real table) — not blocked by schema, blocked by being the abandoned
  predecessor of a now-live replacement.
- **`src/lib/credit/services/GoodwillLetterService.ts`** — the live goodwill
  route (`src/app/api/credit-repair/goodwill/route.ts:20-21`) imports
  `negotiationService` from `@/lib/credit-repair` and `db` from
  `@/lib/credit-repair/db`, not this service. Queries `goodwill_letters` (real
  table).
- **`src/lib/credit/services/DisputeLetterGenerator.ts`** — the live
  `src/lib/credit-repair/dispute-service.ts` (imported as `disputeService` by
  `src/app/api/credit-repair/disputes/route.ts:20`) already has
  `generateDisputeLetter()` (`dispute-service.ts:274-287`, doc comment "Uses AI
  to generate personalized dispute letters") calling
  `orchestrator.generateDispute()`. This orphan itself correctly uses
  ModelRouter (`DisputeLetterGenerator.ts:13,326` — confirms the CMP-04b
  migration, `55f792e`, is present and not stale) but is not the path any live
  route calls.
- **`src/lib/auth/biometric-service.ts`** — live WebAuthn/passkey system already
  exists: `src/lib/auth/webauthn-service.ts`, imported by
  `PasskeyManagement.tsx` and `PasskeyLoginButton.tsx`, plus 5 live API routes
  under `/api/auth/webauthn/*`. This orphan's own doc comment calls itself a
  "Simplified wrapper" of the same thing.
- **`src/lib/api/openapi-spec.ts`** — the live `/api/financial/openapi/route.ts`
  imports `generated-openapi-spec.ts`, not this file. Zero non-self importers
  confirmed.
- **`src/lib/monitoring/metrics.ts`** — lower confidence, not commit-cited like
  the above: `src/lib/monitoring/index.ts` (the barrel) exports
  `error-tracking`, `health`, `sentry`, `analytics` but not `metrics` — the
  same "dropped from the barrel" pattern the confirmed duplicates show,
  alongside a live sibling suite that covers the same ground. No direct commit
  evidence of intentional supersession was found; flagged DO-NOT-WIRE on
  circumstantial-but-consistent evidence, worth a human second look.

## Dead-with-cause (no fabrication or duplicate finding, but zero reachable callers verified by import-graph trace, per the 2026-07-31 commits)

- **`src/lib/ai/proactive-alert-engine.ts`** — "zero importers, no test file"
  (`ac82c67`). Phantom tables: `accounts`, `alert_preferences`,
  `proactive_alerts`.
- **`src/lib/ai/social-proof-nudges-service.ts`** — "zero importers; distinct
  from the live `nudge_history`" (`df3e1f0`). Phantom tables: `cohort_stats`,
  `nudge_preferences`, `nudge_impressions`.
- **`src/lib/gamification/accountability-partners-service.ts`** — "its one
  real-table read (profiles) is inside the same unreached class, so no live
  behavior is lost" (`df3e1f0`). Phantom tables: `partnerships`,
  `partner_invitations`, `partner_nudges`.
- **`src/lib/services/expert-sessions-service.ts`** — "zero importers, not even
  a barrel" (`df3e1f0`). Phantom tables: `experts`, `expert_sessions`,
  `expert_reviews`, `expert_applications`.
- **`src/lib/ai/weekly-summary-service.ts`** — zero reachable callers
  (`6766a3a`); separately, `5635b21`'s commit body notes weekly-summary-service
  is "itself unreachable: zero route importers, its page renders
  `MOCK_SUMMARY`" — the UI this would feed is already hardcoded mock data, so
  wiring the backend doesn't fix anything downstream. Phantom tables:
  `weekly_summaries`, `summary_preferences`, `credit_factors`,
  `dividend_payments`, `holdings`, `portfolio_snapshots`.

## `src/lib/database/connection-pool.ts` — DO-NOT-WIRE, two independent reasons

1. Duplicates the project's actual Supabase client factory pattern
   (`src/lib/supabase/{client,server,service-role,admin}.ts`), which CLAUDE.md
   §14 documents as the deliberate convention ("not a custom wrapper —
   `src/lib/supabase.ts` was deleted").
2. Contains an unverified, likely-incorrect defect at `connection-pool.ts:33-41`:
   `getSupabaseUrl()` derives a "pooler URL" by naive string replacement
   (`baseUrl.replace("db.", "pooler.")`) — not Supabase's actual Supavisor
   hostname convention — gated behind `SUPABASE_POOLER_URL`, which is
   referenced nowhere else in the project (`grep -rn "SUPABASE_POOLER_URL"` —
   zero hits outside this file). In production (`NODE_ENV=production` sets
   `usePooler=true` automatically) this always falls through to the unverified
   string-replace branch.

## No pure WIRE-AFTER-TABLES cases

Every phantom-table-touching orphan in this batch also carries an independent,
stronger reason (fabrication, duplicate, or dead-with-cause) not to wire it.
Building the missing tables would not make any of them wireable as-is.

## Forbidden-restoration check (task requirement)

`billing-profile-store.ts`, `score-simulator-service.ts`, and the 3 rate
limiters removed by `f165e91` are confirmed absent from the working tree and
absent from every orphan's import statements (`grep` across all 59 files'
`import`/`require` lines — zero matches). Both deleted files are referenced
only in code comments elsewhere (`billing-data.ts:4`,
`credit-builder/score-simulator/page.tsx:12`) explaining what replaced them,
not as live imports.

## Full table

| # | Path | What it does | Tables (phantom in **bold**) | Imports deleted module? | Staleness | Verdict |
|---|---|---|---|---|---|---|
| — | `src/lib/financial/auto-save-rules-service.ts` | Round-up/percentage/fixed automated savings rules engine | `auto_save_rules`, `save_transfers` — **both phantom** | No | Deleted 2026-07-31 (`6766a3a`), restored 2026-08-09; no main-line commits in between to lose | **DO-NOT-WIRE** — fabricates transfer completion |
| 1 | `src/__mocks__/lightweight-charts.ts` | Jest mock of the `lightweight-charts` package | none | No | N/A | **JEST-INFRA** |
| 2 | `src/components/PremiumFeatureGuard.tsx` | Gates UI behind a subscription-tier check | none | No | Continuous history, not stale | WIRE-NOW |
| 3 | `src/components/credits/CreditPurchaseModal.tsx` | Modal for one-off AI-credit purchases (Stripe) | none | No | Continuous; last real fix `d64e8d5` (2026-05-01, pre-fork) | WIRE-NOW |
| 4 | `src/components/credits/LowCreditBanner.tsx` | Banner warning when AI-credit balance is low | none | No | Continuous | WIRE-NOW |
| 5 | `src/components/error/ErrorBoundary.tsx` | React error boundary wrapper | none | No | Continuous | WIRE-NOW |
| 6 | `src/components/marketplace/PreQualModal.tsx` | Pre-qualification odds modal for marketplace offers | none | No | Continuous | WIRE-NOW |
| 7 | `src/components/payment/CheckoutButton.tsx` | Stripe checkout trigger button | none | No | Continuous | WIRE-NOW |
| 8 | `src/components/strategies/StrategyRecommendations.tsx` | Displays ML-powered credit-repair strategy recommendations | none | No | Continuous | WIRE-NOW |
| 9 | `src/components/trading/OpportunityRadar.tsx` | Surfaces trading opportunities matching user strategy | none | No | Continuous | WIRE-NOW |
| 10 | `src/components/trading/charts/DepthChart.tsx` | Order-book depth visualization (recharts) | none | No | Continuous | WIRE-NOW |
| 11 | `src/components/trading/charts/DrawingOverlay.tsx` | SVG trendline/Fibonacci drawing layer over charts | none | No | Continuous | WIRE-NOW |
| 12 | `src/components/trading/charts/DrawingToolbar.tsx` | Toolbar for chart drawing tools | none | No | Continuous | WIRE-NOW |
| 13 | `src/components/trading/charts/OrderBook.tsx` | Ladder-style bid/ask order book display | none | No | Continuous | WIRE-NOW |
| 14 | `src/components/trading/charts/VolumeProfileOverlay.tsx` | Volume-by-price-bin overlay for charts | none | No | Continuous | WIRE-NOW |
| 15 | `src/components/ui/DragReorder.tsx` | Generic drag-to-reorder list primitive | none | No | Continuous | WIRE-NOW |
| 16 | `src/components/ui/QRHandoff.tsx` | "Continue on your phone" QR code card | none | No | Continuous | WIRE-NOW |
| 17 | `src/hooks/trading/useRealtimeChart.ts` | Streams **simulated** price ticks into a candlestick series; self-documented dev/test aid ("real WebSocket feeds require broker API keys and are skipped here") | none | No | Continuous | WIRE-NOW — only as a dev/test aid, must not double as the live price feed |
| 18 | `src/hooks/use-chat-queries.ts` | React Query hooks for chat data fetching/mutations | none | No | Continuous | WIRE-NOW |
| 19 | `src/hooks/useRealtimeEvents.ts` | SSE subscription hook | none | No | Continuous | WIRE-NOW |
| 20 | `src/hooks/useRealtimeUpdates.ts` | Generic realtime-data-change subscription hook | none | No | Continuous | WIRE-NOW |
| 21 | `src/hooks/useTranslation.ts` | Translation/locale hook | none | No | Continuous | WIRE-NOW |
| 22 | `src/lib/__mocks__/supabase.ts` | Jest mock of the Supabase client | none | No | N/A | **JEST-INFRA** |
| 23 | `src/lib/ai/proactive-alert-engine.ts` | Proactive financial-alert generation engine | `accounts`, `alert_preferences`, `proactive_alerts` — **all phantom** | No | Deleted 2026-07-31 (`ac82c67`), restored 2026-08-09; nothing lost | **DO-NOT-WIRE** — dead, zero importers, no test file |
| 24 | `src/lib/ai/social-proof-nudges-service.ts` | Cohort-based social-proof nudge generator | `cohort_stats`, `nudge_preferences`, `nudge_impressions` — **all phantom** | No | Deleted 2026-07-31 (`df3e1f0`), restored 2026-08-09; nothing lost | **DO-NOT-WIRE** — dead, distinct from live `nudge_history` |
| 25 | `src/lib/ai/types/financial-coach.types.ts` | Type defs for the AI Financial Coach (EveryDollar/Baby Steps framework) | none (types only) | No | Continuous | WIRE-NOW |
| 26 | `src/lib/ai/weekly-summary-service.ts` | Generates weekly portfolio/finance summary emails | `weekly_summaries`, `summary_preferences`, `credit_factors`, `dividend_payments`, `holdings`, `portfolio_snapshots` — **all phantom** | No | Deleted 2026-07-31 (`6766a3a`), restored 2026-08-09; nothing lost | **DO-NOT-WIRE** — dead; its page already renders `MOCK_SUMMARY` |
| 27 | `src/lib/analytics/user-analytics.ts` | Tracks user behavior events for product insights | none | No | Continuous | WIRE-NOW |
| 28 | `src/lib/api/openapi-spec.ts` | Hand-written OpenAPI 3.0 spec for the financial API | none | No | Continuous | **DO-NOT-WIRE** — superseded by live `generated-openapi-spec.ts` |
| 29 | `src/lib/auth/biometric-service.ts` | "Simplified" WebAuthn biometric wrapper | none | No | Continuous | **DO-NOT-WIRE** — duplicates live `webauthn-service.ts` |
| 30 | `src/lib/auth/mfa-service.ts` | TOTP/backup-code MFA service | `user_backup_codes`, `user_mfa_names` — **both phantom** | No | Deleted 2026-07-31 (`b6f6efe`), restored 2026-08-09; nothing lost | **DO-NOT-WIRE** — duplicates live `backup-codes.ts` |
| 31 | `src/lib/auth/security-notifications.ts` | Emails security events (new-device login, password change) | none | No | Continuous | WIRE-NOW |
| 32 | `src/lib/auth/session.ts` | Server-side session/user/role helpers for Supabase SSR | none | No | Continuous; FND-005 fix (`3b9ffc7`, 2026-05-16, after fork point but on the ordinary main lineage) confirmed present on disk | WIRE-NOW — adopt as the shared helper, don't just import it once |
| 33 | `src/lib/credit-repair/db-legacy.ts` | Legacy DB layer for credit-repair data | `credit_reports` (real) | No | Continuous | **DO-NOT-WIRE** — duplicates live `src/lib/credit-repair/db/`, used by 15+ routes |
| 34 | `src/lib/credit/services/DisputeLetterGenerator.ts` | AI dispute-letter generator via ModelRouter | none | No | Continuous; ModelRouter migration (`55f792e`) confirmed present | **DO-NOT-WIRE** — duplicates live `dispute-service.ts:generateDisputeLetter()` |
| 35 | `src/lib/credit/services/GoodwillLetterService.ts` | Goodwill-letter template generator | `goodwill_letters` (real) | No | Continuous; touched `dd35b36` (2026-07-31, unrelated bundled fix) | **DO-NOT-WIRE** — duplicates live goodwill route's `negotiationService`/`db` |
| 36 | `src/lib/credit/services/SecuredCardRecommendationService.ts` | Secured-card recommendation engine | `user_credit_profiles` — **phantom** | No | Deleted 2026-07-31 (`5635b21`), restored 2026-08-09; nothing lost | **DO-NOT-WIRE** — duplicates live `CreditScoreSimulator.ts` |
| 37 | `src/lib/database/connection-pool.ts` | Custom Supabase client factory + pooling config | `profiles` (real) | No | Continuous | **DO-NOT-WIRE** — duplicates `src/lib/supabase/*`; unverified pooler-URL logic (line 33-41) |
| 38 | `src/lib/database/query-optimizer.ts` | Query batching/field-selection helpers | none | No | Continuous | WIRE-NOW |
| 39 | `src/lib/financial/types/health-score.types.ts` | V1/V2 Financial Health Score type re-exports | none (types only) | No | Continuous | WIRE-NOW |
| 40 | `src/lib/gamification/accountability-partners-service.ts` | Accountability-partner invite/nudge system | `partnerships`, `partner_invitations`, `partner_nudges` — **all phantom** | No | Deleted 2026-07-31 (`df3e1f0`), restored 2026-08-09; IDOR fix (`1d24dd9`) was lost in the restore, already re-fixed by `b1e993a` | **DO-NOT-WIRE** — dead, zero importers beyond the unreached class itself |
| 41 | `src/lib/gamification/commitment-device-service.ts` | User-defined goal-miss consequences (charity stake, public post) | `commitment_check_ins`, `commitment_contracts`, `commitment_donations` — **all phantom** | No | Deleted 2026-07-31 (`df3e1f0`), restored 2026-08-09; IDOR fix (`88276d2`) was lost, already re-fixed by `b1e993a` | **DO-NOT-WIRE** — fabricates charity donations (P0, see above) |
| 42 | `src/lib/goals/services/ContributionSchedulerService.ts` | Scheduled goal-contribution processor with retry | `bank_accounts`, `contribution_schedules`, `goal_contributions`, `scheduled_contributions` — **all phantom** | No | Deleted 2026-07-31 (`6766a3a`), restored 2026-08-09; nothing lost | **DO-NOT-WIRE** — fabricates transfer completion (P0, see above) |
| 43 | `src/lib/investments/services/AnalysisExportService.ts` | Exports investment analysis to CSV/PDF | none | No | Continuous | WIRE-NOW |
| 44 | `src/lib/investments/services/AutoRebalanceScheduler.ts` | Scheduled/threshold portfolio rebalancing with approval workflow | via `PortfolioRebalanceService`: `portfolios`, `rebalance_history` — **both phantom** | No | Deleted 2026-07-31 (`99a579c`), restored 2026-08-09; nothing lost | **DO-NOT-WIRE** — fabricates trade execution (P0, see above) |
| 45 | `src/lib/investments/types/ai-analyst.schemas.ts` | Zod schemas for AI stock-analysis requests/responses | none (types only) | No | Continuous | WIRE-NOW |
| 46 | `src/lib/investments/types/multi-asset.types.ts` | Types for Forex/Crypto/Options/Commodities analysis | none (types only) | No | Continuous | WIRE-NOW |
| 47 | `src/lib/lazy-components.tsx` | Centralized `React.lazy` config for heavy components | none | No | Continuous | WIRE-NOW — check for overlap with `dynamic-imports.tsx` before wiring both |
| 48 | `src/lib/monitoring/metrics.ts` | App/business metrics collector + health-check registry | none | No | Continuous | **DO-NOT-WIRE** — excluded from the live monitoring barrel (`index.ts`); likely superseded by `analytics.ts`/`error-tracking.ts`/`health.ts`/`sentry.ts` (lower confidence, not commit-cited) |
| 49 | `src/lib/prompts/dispute-prompts.ts` | Few-shot/chain-of-thought AI prompt templates for dispute letters | none | No | Continuous | WIRE-NOW — `src/lib/disputes/advanced-strategies.ts:233` already documents this as an intended integration point |
| 50 | `src/lib/pwa/service-worker-registration.ts` | PWA service-worker registration/update handling | none | No | Continuous | WIRE-NOW |
| 51 | `src/lib/services/expert-sessions-service.ts` | Expert consultation booking/review system | `experts`, `expert_sessions`, `expert_reviews`, `expert_applications` — **all phantom** | No | Deleted 2026-07-31 (`df3e1f0`), restored 2026-08-09; nothing lost | **DO-NOT-WIRE** — dead, zero importers, not even a barrel |
| 52 | `src/lib/trading/autonomous/standalone-server.ts` | Fly.io standalone autonomous-trading process entry point | `trading_accounts` (real) | No | Continuous; `operating_mode` column-name fix (`b791f1d`, 2026-08-08) confirmed present | WIRE-NOW — **not actually an orphan**: bundled and deployed via `src/lib/trading/autonomous/deploy/{Dockerfile,fly.toml}` (`Dockerfile:22,54`), a process entry point is never `import`-referenced from `src/`; the import-graph tool's "zero importers" is a false-positive category for this file specifically |
| 53 | `src/lib/trading/instruments/instrument-registry.ts` | Symbol-pattern-based instrument classification metadata | none | No | Continuous | WIRE-NOW |
| 54 | `src/lib/utils/dynamic-imports.tsx` | Code-splitting dynamic-import utilities | none | No | Continuous | WIRE-NOW — check for overlap with `lazy-components.tsx` before wiring both |
| 55 | `src/lib/utils/pagination.ts` | Pagination helpers for API responses/DB queries | none | No | Continuous | WIRE-NOW |
| 56 | `src/lib/utils/retry.ts` | Exponential-backoff retry utility for external API calls | none | No | Continuous | WIRE-NOW |
| 57 | `src/setupTests.ts` | Jest global test setup | none | No | N/A | **JEST-INFRA** |
| 58 | `src/types/student-loan-agent.ts` | Type defs for the student-loan AI agent | none (types only) | No | Continuous | WIRE-NOW |

## DELETE-RECOMMENDED queue (owner decision required — not an execution list)

Team-lead correction applied: DELETE is gated behind named owner approval per
batch (the owner already overruled an autonomous delete-vs-restore call once,
`8e5481d`). Nothing below has been deleted. Each row was individually
re-verified against its live counterpart's actual exports/content this pass —
not re-asserted from the original duplicate finding — because "duplicates a
live module" and "nothing would be lost by deleting" are different claims,
and three of these nine turned out to have something worth naming before an
owner signs off.

| Module | Live replacement | What confirms duplication | What would be lost |
|---|---|---|---|
| `src/lib/credit-repair/db-legacy.ts` | `src/lib/credit-repair/db/credit-reports-db-service.ts` (9 functions: create/get/getByUser/getLatest/getByBureau/update/delete/getCreditScoreHistory/getCreditReportStats), imported as `db` by 15+ live routes | Orphan's entire `db` export is one `creditReports` object with a strict subset of the live functions | Nothing — live version is a superset |
| `src/lib/credit/services/GoodwillLetterService.ts` | `negotiation-service.ts:generateGoodwillLetter()` (`negotiation-service.ts:26-80`) + `db/goodwill-db-service.ts` | Live goodwill route (`goodwill/route.ts:20-21`) imports `negotiationService`/`db`, not this file | Different **strategy**, not missing feature: live path generates letter text via AI (inline prompt, `negotiation-service.ts:36`); orphan instead ships a static `LETTER_TEMPLATES` array (~318 lines, `GoodwillLetterService.ts:101-419`). Live path is shipped and works without it. If a non-AI template fallback is ever wanted, that specific content would need to be rebuilt — it is not present anywhere else |
| `src/lib/credit/services/DisputeLetterGenerator.ts` | `dispute-service.ts:generateDisputeLetter()` (`dispute-service.ts:274-287`) | Live route (`credit-repair/disputes/route.ts:20`) imports `disputeService`, not this file | Nothing — both are AI-generation wrappers (orphan via ModelRouter, live via `AIOrchestrator.generateDispute()`), functionally equivalent, no static content asset at stake |
| `src/lib/auth/biometric-service.ts` | `src/lib/auth/webauthn-service.ts` | Method-for-method match: capability check, registration, authentication, get/rename/delete credentials — same shape, imported live by `PasskeyManagement.tsx`/`PasskeyLoginButton.tsx` | Nothing |
| `src/lib/api/openapi-spec.ts` | `src/lib/api/generated-openapi-spec.ts`, imported by `/api/financial/openapi/route.ts` | Orphan documents **3** API paths; the live generated spec documents **274** | Nothing — orphan is a small, stale hand-written stub |
| `src/lib/auth/mfa-service.ts` | Split across two live modules: `auth-service.ts` (TOTP — confirmed identical `supabase.auth.mfa.enroll/challenge/verify` calls, `auth-service.ts:550-563` vs `mfa-service.ts:103-149`, used by `TwoFactorSettings.tsx`) + `backup-codes.ts` (backup codes, real `backup_codes` table) | Orphan's declared `MFAMethodType` includes `"webauthn" | "sms" | "email"` but has **zero** implementing methods for any of those three — grep for SMS/email-send/WebAuthn-specific methods in the class returns nothing. `TwoFactorSettings.tsx` has its own independent `checkMFAStatus()`, not dependent on the orphan's aggregator | Nothing real — TOTP and backup codes are both live elsewhere; WebAuthn/SMS/email were declared types that were never implemented, so there is no working code to lose |
| `src/lib/credit/services/SecuredCardRecommendationService.ts` | `CreditScoreSimulator.getSecuredCardRecommendations()` (`CreditScoreSimulator.ts:649`, called live at `credit/simulator/route.ts:129`) | Both produce secured-card recommendations from a credit profile | **Something real would be lost.** The live version returns generic categories (`basic_secured`/`rewards_secured`/`limit_boost_secured`) with no real product names. The orphan has a curated database of 11 **named, real** products with issuers — "Discover it® Secured Credit Card" (discover), "Capital One Quicksilver Secured" (capital_one), "OpenSky® Secured Visa® Credit Card" (opensky), etc. (`SecuredCardRecommendationService.ts:99-165+`). If the product-specific recommendation experience is ever wanted, this content is the only copy of it |
| `src/lib/database/connection-pool.ts` | `src/lib/supabase/{client,server,service-role,admin}.ts` for client construction (the documented project convention) | Architectural duplicate of the client-factory pattern; separately contains the unverified pooler-URL defect noted above | The client-factory piece: nothing. But `checkDatabaseHealth()` (`connection-pool.ts:147-170`) runs a **real** query (`.from("profiles").select("id").limit(1)`); the closest live analog, `monitoring/health.ts:checkDatabase()`, has its actual DB ping **commented out** (`health.ts:32`, `// const result = await supabase.from('health_check')...`) and returns a hardcoded healthy status instead. Deleting this file removes the one real DB health check that exists in the codebase today — worth a note to whoever owns `/api/health`, independent of this file's fate. `executeWithRetry()` has no live equivalent either, though the separate orphan `src/lib/utils/retry.ts` (verdict: WIRE-NOW, #56 above) is a generic version of the same idea and is the better path forward if retry-wrapped queries are wanted |
| `src/lib/monitoring/metrics.ts` | Originally stated as: siblings `analytics.ts`/`error-tracking.ts`/`health.ts`/`sentry.ts` via the `monitoring/index.ts` barrel | **Correction on re-check, not smoothed over:** the barrel itself, and every one of those named siblings, has **zero importers anywhere in `src/`** (checked directly this pass) — no route, component, `instrumentation.ts`, or `next.config.*` wiring exists for any of them. There is no confirmed live monitoring suite for `metrics.ts` to be superseded by; the "dropped from the barrel" reasoning in the original finding does not hold up under a direct import check | Unknown — can't assess against a "replacement" that isn't itself confirmed live. **Lower confidence, explicitly: this row should not be treated as equivalent evidence to the other eight.** Recommend a separate, scoped pass on all 8 files in `src/lib/monitoring/` (not just this one) before any delete decision, rather than deciding `metrics.ts` in isolation |

## LEAVE-DARK — do not delete (9 modules)

The four fabrication P0s plus the five dead-with-cause modules should stay in
the tree, undeleted, rather than be removed:

- `auto-save-rules-service.ts`, `ContributionSchedulerService.ts`,
  `commitment-device-service.ts`, `AutoRebalanceScheduler.ts` — these are
  real, substantial feature implementations (rule engines, scheduling,
  approval workflows) whose only defect is the missing payment-rail
  integration at the execution boundary. Deleting them discards working
  design and CRUD code to fix a problem that is one integration away from
  resolved. They should stay as a paper trail — visible, not wired, not
  deleted — until the real payment/banking/brokerage integration is scoped
  and someone decides to finish them or formally kill them. This mirrors the
  precedent set for `affiliate-service.ts`'s attribution methods in `df3e1f0`:
  tested, near-complete code one migration/integration away from working is
  kept, not deleted, when a real path to finishing it exists.
- `proactive-alert-engine.ts`, `social-proof-nudges-service.ts`,
  `accountability-partners-service.ts`, `expert-sessions-service.ts`,
  `weekly-summary-service.ts` — already killed once, for cause, in the
  2026-07-31 commits (`ac82c67`, `df3e1f0`, `6766a3a`), then restored by
  accident on 2026-08-09. These are the ones where the prior remediation's
  own judgment should stand: recommend deletion, but only by the same route
  the 2026-07-31 commits used (evidenced, cited, one commit per module) —
  not folded into this DELETE-RECOMMENDED queue, because that queue is for
  *new* findings this session, and re-deleting these is re-applying a
  decision that was already made and already reverted once. Flagging that
  distinction for the owner rather than blurring it: these are
  "re-delete, we've been here before" (see the Correction section above for
  the full 2026-07-31/2026-08-09 sequence), not "delete, newly found."

## Revision History

- 2026-08-09 — Initial version (kh session). All 59 modules reviewed; every
  claim traces to a cited command, file:line, or commit SHA captured this
  session.
- 2026-08-10 — Added DELETE-RECOMMENDED queue (9 modules) and LEAVE-DARK
  section (9 modules) per team-lead request, following team-lead's correction
  that their 63/21/1 count (from grepping verdict words out of prose/headings
  rather than table rows) was their error, not a gap in this file — this
  file's 59/38/18/3/0 count was correct throughout. Each of the 9
  DELETE-RECOMMENDED rows was independently re-verified against its live
  counterpart's actual code this pass; `SecuredCardRecommendationService.ts`
  and `connection-pool.ts` turned out to have real, nameable content/capability
  that would be lost (not "nothing lost" as a blanket assumption), and
  `metrics.ts`'s original "duplicate" reasoning did not survive a direct
  import check on its claimed live siblings — corrected in place rather than
  quietly dropped.
