---
name: fabricated-advice-financial-chat-engine
description: financial-chat-engine.ts fabricated investment/debt advice from two phantom tables (portfolio_holdings, financial_accounts) — fixed 2026-07-31; two sibling instances of the same bug class found but left unfixed (out of scope)
metadata:
  type: project
---

`src/lib/ai/financial-chat-engine.ts` (live route `/api/chat/financial`) queried `portfolio_holdings` and `financial_accounts` — neither exists in the live schema. Because postgrest-js resolves `{data: null, error}` rather than throwing, and the pre-fix code never checked `error`, every failed lookup was indistinguishable from "user genuinely has none" — the coach told every user a confident `{recommendation: "HOLD", confidence: 0.5, targetPrice: 0}` for any symbol, and "No debt accounts found. Great job being debt-free!" regardless of actual debt. Fixed in commit `058a501` (2026-07-31): renamed to the real tables (`investment_holdings`, `debt_accounts` — reused the existing `debtService.listDebts()` rather than hand-rolling a new query), added explicit error checks (PGRST116 = genuine no-match, any other error throws to an honest fallback), and removed the catch-block fabrications that defaulted to a confident "avalanche/24mo/$0" debt strategy and a "riskScore 65/moderate" risk assessment on outright query failure. See [[thenable-mock-chain-for-postgrest]] for the test-mock technique used to cover all 5 call shapes.

**Schema facts worth knowing** (verified live via `\d+`, 2026-07-31): `investment_holdings` has no `cost_basis` column — cost basis is `average_cost` (per-share) `* quantity`; the table also has precomputed `gain_loss`/`gain_loss_percent`/`current_price`, so derive from those rather than re-computing. `debt_accounts` uses `type` (not `account_type`), `interest_rate` (not `apr`), `is_active` boolean (not `status`) — real `type` values per `debt-service.ts`'s zod schema: `credit_card`, `student_loan`, `auto_loan`, `mortgage`, `personal_loan`, `medical`, `other` (not the fictional `credit_card`/`loan`/`line_of_credit` the old code filtered on). `financial_accounts` does not exist under any name in this schema — there is no bank/checking/savings-balance table at all, so a report's "assets" side can only ever reflect investment holdings, never linked bank balances.

**Two sibling instances of the same bug class — found, NOT fixed (out of assigned scope):**
1. `src/lib/financial/plaid-service.ts:207,268` also reads/writes `"financial_accounts"` (Plaid bank-linking — a different subsystem from the AI chat coach).
2. `src/app/api/investments/portfolio/analyze/route.ts:163-164` reads `investment_holdings.cost_basis` (correct table, same nonexistent column).

**Why:** These came up via a repo-wide grep for the old table/column names before closing out the fix (per [[grep-repo-wide-for-fictional-fixtures]]) — same defect class, different files, no authorization to touch them in this task.

**How to apply:** If assigned either of the above, this note already has the live-verified real table/column names — no need to re-run `\d+` from scratch. If picking up `plaid-service.ts`, note that `financial_accounts` isn't a rename target the way `debt_accounts`/`investment_holdings` were — no broader "linked bank accounts" table exists yet in this schema at all, so that one may need a new migration + owner decision, not a simple repoint.

Also noted but explicitly left alone (already fail honestly, no fabricated claim): `getUserPreferences`/`getRiskProfile` in the same file read `user_preferences`/`risk_profiles`, which also don't exist live — but both already return `null` on failure rather than asserting something false, so they're a lower-severity gap than the two fixed here.
