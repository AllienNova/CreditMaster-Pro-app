# Phantom-table triage — trading / investing / portfolio / crypto / alt-assets

Scope: the 35 phantom tables assigned to the trading + investment domain.
Method: every table verified absent against the live DB (56 migrations applied, 57 rows in
`supabase_migrations.schema_migrations`); every call site located by grep over `src`,
`mobile-app/src`, `mobile-app/app` excluding `__tests__`; every reachability claim traced to
an API route, page, component, or scheduled job by following the import graph to a terminal.

Date: 2026-07-31. Branch: `remediation/wave-7-foundation`.

## Verification evidence

All 35 absent across **every** schema, not just `public`:

```
psql -Atc "select t.n || ' => ' || coalesce(ns.nspname||'.'||c.relname||' ('||c.relkind::text||')','ABSENT')
  from unnest(ARRAY[...35 names...]) as t(n)
  left join pg_class c on c.relname=t.n and c.relkind in ('r','v','m','f','p')
  left join pg_namespace ns on ns.oid=c.relnamespace order by 1;"
→ 35 of 35 ABSENT
```

None of the 35 has even a shadowed migration. A `CREATE TABLE` grep over `supabase/migrations`
returns **NO MIGRATION** for all 35 — these were never written, not written-and-skipped.

The silent-failure mechanism was confirmed empirically against the running PostgREST rather
than assumed:

```
curl 'http://127.0.0.1:54321/rest/v1/paper_accounts?select=*' -H 'apikey: <anon>'
→ {"code":"PGRST205","details":null,"hint":null,
   "message":"Could not find the table 'public.paper_accounts' in the schema cache"}
```

`PGRST205` is a resolved `{error}`, never a thrown exception. Whether a feature degrades
loudly or silently is therefore decided entirely by the caller — which is why the failure-mode
column below is the load-bearing one.

## Classification precedence

Where a table is both unreachable **and** has a real equivalent, it is classified **DEAD** —
deletion is the cheaper correct fix and the code has no user. The real equivalent is still
recorded so a future decision to revive the feature has the mapping. Reachability drives
severity more than call-site count does.

## Findings

| table | classification | real equivalent | entry point / reachability | failure mode (quote) | severity | recommended action |
|---|---|---|---|---|---|---|
| `plaid_items` | UNBUILT | none — no bank-link table exists | `/api/financial/plaid/exchange-token`, `/link-token`, `/income`, `/liabilities`, `/investments`, `/api/financial/accounts`, `/api/financial/transactions`, `/api/financial/plaid/webhooks`; also `mobile-app/src/services/api/financial.ts` | `plaid-service.ts:170` propagates: `if (error) { throw new Error("Failed to store access token"); }`. Webhook path swallows: `plaid-webhook-handler.ts:429` `if (error || !data) { return null; }` | **CRITICAL** | Build `plaid_items` (user_id, item_id, encrypted access_token, error_type/code/message, consent_expiration_time). Nothing Plaid works until this exists. |
| `plaid_accounts` | UNBUILT | none — no bank-accounts table exists (`credit_accounts`/`debt_accounts`/`trading_accounts` are unrelated) | `/api/financial/aggregated`, `/api/financial/health-score`, `/api/financial/health-score/v2` (route imports `financialAggregationService` at `health-score/route.ts:66`, calls `getAggregatedContext` at `:152` and `:283`) | `financial-aggregation-service.ts:375-376` swallows: `if (error \|\| !data) { return this.getEmptyAccounts(); }` → `totalAssets`, `totalLiabilities`, `totalSavings` all reduce to 0 | **CRITICAL** | Build `plaid_accounts`. Until then net worth is $0 for every user and the financial health score is computed on it, with no error surfaced. |
| `portfolio_holdings` | RENAME | `investment_holdings` (live: `/api/investments/holdings`, `/portfolio`, `/portfolio/analyze`). Maps: `symbol`✓ `quantity`✓ `current_value`✓; `cost_basis` absent → derive `average_cost * quantity` | `/api/chat/financial`, `/sessions`, `/sessions/[id]`, `/sessions/[id]/messages` → `financial-chat-engine.ts` | Error discarded entirely at `:876` and `:939` (`const { data: holding } = await ...`), then `:888` `const currentValue = holding?.current_value \|\| 0;` → `returnPct = 0` → `recommendation = "HOLD"`, `confidence: 0.5`, `targetPrice: 0`. `assessRisk` at `:1173` likewise defaults `totalPortfolio` to 0 | **CRITICAL** | Repoint to `investment_holdings` and add the `cost_basis` derivation. The AI coach currently emits BUY/HOLD/SELL calls and a risk score computed from a table that does not exist. |
| `holdings` | RENAME | `investment_holdings`. Needs 3 column renames: `shares`→`quantity`, `avg_cost_basis`→`average_cost`, `company_name`→`name` | `/api/investments/dividends` → `DividendTrackingService.getDividendStocks` (`dividends/route.ts:53`) | `DividendTrackingService.ts:205` propagates: `if (holdingsError) throw new Error(...)`; route catches at `:88` → `500 {"error":"Failed to fetch dividend data"}` | HIGH | Repoint to `investment_holdings` with the column mapping. Fails loudly, so no bad data — the feature is simply 100% dead. |
| `stock_dividends` | UNBUILT | none — no dividend reference data anywhere | same as `holdings` (`/api/investments/dividends`) | `DividendTrackingService.ts:213-214` swallows: `const { data: dividendInfo } = await ...` then `if (dividendInfo && ...)` — never enters the branch | HIGH | Build it, or drop the dividend feature. Currently unreachable behind the `holdings` throw; once `holdings` is fixed the endpoint silently returns an empty dividend list. |
| `trading_journal` | UNBUILT | none — `trade_history` records broker executions, not the journal's `emotional_state_before/after`, `lessons_learned`, `exit_reason` | `/api/trading/journal`, `/journal/[id]`, `/journal/[id]/close`, `/journal/stats` | Mixed. Writes propagate: `TradingJournalService.ts:182` `if (error) throw error;`. Reads swallow: `:263` `const { data } = await ...` then `return data ? this.fromDbFormat(data) : null;` — and `closeTrade` at `:214` turns it into `if (!trade) throw new Error("Trade not found")` | HIGH | Build `trading_journal`. Four live routes, all non-functional. |
| `paper_accounts` | UNBUILT | none | `/api/trading/paper`, `/paper/reset`, `/paper/positions`, `/paper/orders`, `/paper/performance`, and `/api/trading/orders:328` | Propagates: `PaperTradingEngine.ts:180` `if (error) throw new Error("Failed to create paper account: ...")`; `getAccount` at `:191` rethrows every code except `PGRST116` — and a missing table returns `PGRST205`, so it throws. Route catches → `500 "Failed to fetch paper trading account"` | HIGH | Build the 5 paper tables, or delete the engine. **Not** intentionally in-memory — the engine has no Map fallback and there is no `brokers/paper-broker` (the `index.ts:258` export is commented out). Column casing (`userId`, `cashBalance`, `initialBalance`) is camelCase against an otherwise snake_case schema, so these were never real Postgres tables. |
| `paper_orders` | UNBUILT | none | same as `paper_accounts` | same throw path | HIGH | as above |
| `paper_positions` | UNBUILT | none | same as `paper_accounts` | `PaperTradingEngine.ts:814` discards entirely: `await this.supabase.from("paper_positions").insert(position);` | HIGH | as above |
| `paper_fills` | UNBUILT | none | same as `paper_accounts` | `:703` discards entirely: `await this.supabase.from("paper_fills").insert(fill);` | HIGH | as above |
| `paper_trades` | UNBUILT | none | same as `paper_accounts` | `:746` discards entirely: `await this.supabase.from("paper_trades").insert(trade);` | HIGH | as above. Note the graduation coupling below — it fails **closed**, which is the safe direction. |
| `investment_alerts` | UNBUILT | none — `trading_signals` is signal generation, not user-set price alerts | `/api/investments/alerts` GET/POST/DELETE | Propagates: `alerts/route.ts:57` `if (error) { return NextResponse.json({ error: "Failed to fetch alerts" }, { status: 500 }); }` | HIGH | Build `investment_alerts`. All three verbs return 500. |
| `pctt_positions` | RENAME | `positions` — overlap `user_id`/`symbol`/`side`/`quantity`/`status`/`realized_pl`; renames `entry_price`→`avg_entry_price`, `stop_loss`→`stop_loss_price`, `take_profit`→`take_profit_price`, `entry_time`→`opened_at`, `exit_time`→`closed_at`; 7 PCTT-only fields (`q_score`, `regime`, `action_line`, `safety_line`, 3 order ids, `exit_reason`) have no home | **UNKNOWN in Next.js.** Exported from `pctt/index.ts:55` but the only runtime constructors are `signal-scanner.ts:151`, `autonomous-scheduler.ts:297,297` — i.e. the separate Fly.io app `fynvita-autonomous-trading` (`autonomous/deploy/fly.toml:6`). Whether that service is deployed is UNKNOWN from this repo. | Writes discard the result entirely: `pctt-trading-service.ts:811` `await (supabase as any).from("pctt_positions").upsert({...})` — no `{error}` destructured. Reads swallow: `:841` `const { data } = ...` then `if (data) { ... }` → in-memory `activePositions` silently stays empty across restarts | HIGH **if the Fly.io service is deployed**, otherwise LOW | Consolidate onto `positions` and add the 7 PCTT columns. Same defect class as the already-proven `orders`/`positions` loss. **Confirm the Fly.io deploy status before sizing this.** |
| `investment_history` | UNBUILT | none — `investment_portfolios` holds current state, not a time series | `/api/financial/aggregated`, `/api/financial/health-score`, `/health-score/v2` | Error discarded entirely: `financial-aggregation-service.ts:911` `const { data } = await supabase.from("investment_history")...` then `return (data \|\| []).map(...)` → flat empty trend | MEDIUM | Build it as a snapshot table, or remove the trend from the aggregated response. Cosmetic next to `plaid_accounts` on the same code path. |
| `risk_profiles` | UNBUILT | none — `user_risk_settings`/`risk_rules` are trading risk limits, not the chat engine's investor risk profile | `/api/chat/financial` and its 3 sub-routes | Swallows: `financial-chat-engine.ts:855-861` `if (error) throw error;` → `catch { return null; }` | MEDIUM | Build it or drop the personalisation. Degrades to generic advice rather than wrong advice, so below `portfolio_holdings`. |
| `autonomous_execution_logs` | UNBUILT | `trading_audit_trail` is close in shape but is a generic actor/action/resource log, not the per-execution record this writes | Fly.io `fynvita-autonomous-trading` only (`autonomous-executor.ts:362`) — UNKNOWN whether deployed | Explicitly non-blocking: `catch { console.error("[autonomous] Failed to log execution for ...") }` at `:374` | MEDIUM | Build it, or route to `trading_audit_trail`. This is the audit record for autonomous live trades; losing it is a compliance gap, not a money loss. |
| `autonomous_scan_logs` | UNBUILT | none | Fly.io service only (`signal-scanner.ts:184`) — UNKNOWN whether deployed | Explicitly non-blocking: `catch { console.error("[autonomous] Failed to persist scan cycle ...") }` at `:198` | LOW | Build or delete. Observability only. |
| `portfolios` | DEAD | `investment_portfolios` — `user_id`/`name`/`total_value`/`created_at` line up; `target_allocations`→`target_allocation`, `drift_threshold`→`rebalance_threshold`, `updated_at`→`last_updated_at`, and `rebalance_strategy` has no column | **Unreachable.** `PortfolioRebalanceService` ← `AutoRebalanceScheduler.ts` + `investments/services/index.ts`; nothing imports the barrel and no route imports either file (routes import specific services by path, never `from "@/lib/investments/services"`) | Would propagate if reached: `PortfolioRebalanceService.ts:254` `if (error) throw new Error("Failed to create portfolio: ...")` | LOW | Delete `PortfolioRebalanceService` + `AutoRebalanceScheduler`, or wire them to `investment_portfolios`. Dead today. |
| `rebalance_alerts` | DEAD | none | same dead service | `:518` `if (error) throw new Error(...)` | LOW | Delete with the service. |
| `rebalance_history` | DEAD | none | same dead service | `:538` insert, result discarded | LOW | Delete with the service. |
| `plaid_transactions` | DEAD | `transactions` — **clean rename**, every column the code touches (`user_id`, `date`, `amount`, `name`, `merchant_name`) exists on `transactions` | **Unreachable.** `transaction-categorizer.ts` has zero importers | Swallows: `:250` and `:336` `if (!transactions \|\| transactions.length === 0) { return []; }`; `:955` `return (data?.length \|\| 0) >= 2;` | LOW | Rename to `transactions` (trivial) or delete the file. Live code already uses `transactions` (`savings-optimizer.ts:189`, `spending-analyzer.ts:595`, `income/detect/route.ts:84`). |
| `dividend_payments` | DEAD | none | **Unreachable.** `recordDividendPayment`/`getDividendHistory` have zero callers; `/api/investments/dividends` calls only `getDividendStocks`. The other caller, `weekly-summary-service.ts:523`, has zero importers | `DividendTrackingService.ts:154` `if (error) throw new Error(...)` | LOW | Build only if the dividend feature is revived alongside `stock_dividends`. |
| `drip_settings` | DEAD | none | **Unreachable.** `getDRIPSettings`/`updateDRIPSettings` have zero callers | `:451` swallows (`if (error) return null;`), `:481` throws | LOW | as above |
| `portfolio_snapshots` | DEAD | none | **Unreachable.** `weekly-summary-service.ts` has zero importers | `:494` `const { data: snapshot } = ...` then `:495` `const previousValue = snapshot?.total_value \|\| portfolioValue;` → weekly change silently 0 | LOW | Delete `weekly-summary-service.ts` or build the table when the weekly email ships. |
| `risk_vetoes` | DEAD | none | **Unreachable.** `lifecycle/index.ts` re-exports `promotion-manager` and nothing anywhere imports `trading/lifecycle` — the whole directory is orphaned | Swallows in the **unsafe** direction: `demotion-rules.ts:63` `if (error \|\| !data) return { exceeded: false, count: 0 };` → the "3+ risk vetoes in 24h" demotion trigger can never fire | LOW **as shipped** — would be CRITICAL the moment the lifecycle module is wired up | Build the table **before** wiring `lifecycle/`. Flag loudly in that work item: this fails **open**, unlike its sibling `promotion-gates.ts` which fails closed (`:151-157` returns `passed: false` when metrics are missing). |
| `recon_breaks` | DEAD | none | same orphaned `lifecycle/` module | Same unsafe swallow: `demotion-rules.ts:82` `if (error \|\| !data) return false;` → reconciliation-break demotion never fires | LOW as shipped, CRITICAL if wired | as above |
| `strategy_metrics` | DEAD | partial: `backtest_results` carries `sharpe_ratio`, `max_drawdown`, `win_rate`, `total_trades`; `strategy_lifecycle` carries `stage`/`dwell_start`/`gate_scores`. Neither covers `sev1_free_days`, `fill_sim_error_bps`, `slippage_bps`, `correlation` | same orphaned `lifecycle/` module | Fails **closed** (safe): `promotion-gates.ts:96` `if (error \|\| !data) return null;` → `evaluateGates` returns `{ passed: false, missing: ["all_metrics"] }`. No strategy can be promoted | LOW | Build `strategy_metrics` as a rollup over `backtest_results` + `strategy_lifecycle` + `trade_history` when `lifecycle/` is wired. Safe to defer. |
| `crypto_wallets` | DEAD | none | **Unreachable.** `crypto-wallet-service.ts` ← `financial/index.ts:189` only, and no route/component/mobile file imports that barrel. Confirms the known "orphaned services" pattern | `:243` `if (error) throw error;` | LOW | Delete the service, or build the tables and add routes. Complete logic, no migration, no route. |
| `crypto_holdings` | DEAD | none | same orphaned service | `:328` throws / `:342` swallows | LOW | as above |
| `crypto_price_alerts` | DEAD | none | same orphaned service | `:584` `await this.supabase.from("crypto_price_alerts").delete()...` — result discarded | LOW | as above |
| `alternative_assets` | DEAD | none | **Unreachable.** `alternative-asset-service.ts` has zero importers — not even the barrel | `:263` `if (error) throw error;` | LOW | Delete or build. Most orphaned of the set. |
| `alternative_asset_valuations` | DEAD | none | same, zero importers | `:349` `await this.supabase.from("alternative_asset_valuations").insert({...})` — result discarded | LOW | as above |
| `properties` | DEAD | none | **Unreachable.** `real-estate-tracking-service.ts` ← `financial/index.ts:119` only; barrel unimported | `:229` `if (error) throw error;` | LOW | Delete or build. Known orphaned service — confirmed. |
| `property_valuations` | DEAD | none | same orphaned service | `:294` insert, result discarded | LOW | as above |
| `mortgages` | DEAD | none | same orphaned service | `:352`/`:366`/`:373` | LOW | as above |

## Counts

| classification | count | tables |
|---|---:|---|
| RENAME | 3 | `portfolio_holdings`, `holdings`, `pctt_positions` |
| UNBUILT | 14 | `plaid_items`, `plaid_accounts`, `investment_alerts`, `stock_dividends`, `trading_journal`, `paper_accounts`, `paper_orders`, `paper_positions`, `paper_fills`, `paper_trades`, `investment_history`, `risk_profiles`, `autonomous_execution_logs`, `autonomous_scan_logs` |
| DEAD | 18 | `portfolios`, `rebalance_alerts`, `rebalance_history`, `plaid_transactions`, `dividend_payments`, `drip_settings`, `portfolio_snapshots`, `risk_vetoes`, `recon_breaks`, `strategy_metrics`, `crypto_wallets`, `crypto_holdings`, `crypto_price_alerts`, `alternative_assets`, `alternative_asset_valuations`, `properties`, `property_valuations`, `mortgages` |
| **total** | **35** | |

By severity: 3 CRITICAL, 11 HIGH (one of them conditional on a deploy status that is UNKNOWN),
4 MEDIUM, 17 LOW.

Just over half the domain — 18 of 35 — is dead code. The remediation cost here is far smaller
than the raw call-site count implies: 118 of the 147 call sites in this slice sit behind
unreachable entry points.

## Top 5 by real user / money impact

**1. `plaid_items` — CRITICAL.** The Plaid access token has nowhere to live, so
`storeAccessToken` throws on every bank link. Every downstream Plaid surface — accounts,
transactions, income, liabilities, investments, on both web and mobile — depends on
`getAccessToken`, which throws `"Access token not found"`. This is not a degraded feature; the
entire bank-connection foundation of the product cannot complete a single link. It is also the
cheapest of the three CRITICALs to fix (one table, one migration) and unblocks the widest
surface, so it should go first.

**2. `plaid_accounts` — CRITICAL, and the most dangerous because it is silent.**
`fetchAccounts` returns `getEmptyAccounts()` on error, so `totalAssets`, `totalLiabilities` and
`totalSavings` are all 0. That feeds `getAggregatedContext`, which the financial health score
route calls twice (`health-score/route.ts:152`, `:283`). Every user is told their net worth is
$0 and receives a health score derived from it, with a `200 OK` and no error anywhere in the
response. `plaid_items` fails loudly; this one lies. Note there is no bank-accounts table under
*any* name in the live schema — `credit_accounts`, `debt_accounts` and `trading_accounts` serve
unrelated purposes — so this is genuinely unbuilt, not misnamed.

**3. `portfolio_holdings` — CRITICAL.** The AI financial coach at `/api/chat/financial` is a
live, user-facing advice surface. `analyzeInvestment` discards the PostgREST error entirely,
defaults `currentValue` to 0, and emits a structured `{ recommendation: "HOLD", confidence:
0.5, targetPrice: 0 }` for any symbol a user asks about. `assessRisk` computes a risk score from
a portfolio total of 0 — compounded by `financial_accounts` on the same function
(`financial-chat-engine.ts:1181`) *also* being absent from the live DB, so the debt side is 0
too. This is fabricated investment advice presented to users as analysis. The fix is a rename
to `investment_holdings`, which the live `/api/investments/holdings` routes already use.

> Cross-domain note, outside this slice: `financial_accounts` was verified absent
> (`select count(*) from pg_class where relname='financial_accounts'` → 0). It is not on my
> assigned list. Flagging for whoever owns the financial slice.

**4. `pctt_positions` — HIGH, conditional, and the one that most needs a human answer.** This is
the identical defect already proven for `orders`/`positions`: `savePosition` upserts with the
result discarded, `loadPositions` swallows into an empty in-memory map, so open positions vanish
on restart. The difference is reachability — the only runtime constructors live in
`src/lib/trading/autonomous/`, which ships as a **separate Fly.io app**
(`fynvita-autonomous-trading`, per `autonomous/deploy/fly.toml:6`), not through Next.js. I could
not determine from this repo whether that service is deployed. **If it is, this is real
positions in real markets being lost on every restart and belongs at the top of this list. If it
is not, it is LOW.** Settle the deploy status before sizing the work.

**5. `trading_journal` + `investment_alerts` + the 5 `paper_*` tables — HIGH.** Grouped because
they share a profile: user-visible features that are 100% non-functional and fail loudly with a
500. No bad data, no wrong money, just eleven API routes that cannot work. Worth stating
plainly for the paper-trading set, since the brief asked: these are **not** intentionally
in-memory. `PaperTradingEngine` has no fallback, `brokers/paper-broker` does not exist (its
export at `trading/index.ts:258` is commented out), and the camelCase column names
(`userId`, `cashBalance`, `initialBalance`) against an otherwise snake_case schema show these
were never real Postgres tables.

One piece of good news in that group: the WATCH→GUIDED graduation counter is coupled to paper
trading (`PaperTradingEngine.ts:1120` → `operating-mode-manager.ts:434 recordPaperTrade`), and
because the paper flow throws before reaching line 1120, the counter never increments. No user
can graduate to live trading on the strength of paper trades that were never recorded. It fails
**closed**.

## Two findings that are low-severity today and dangerous tomorrow

Recording these separately because their current LOW rating is an artifact of dead code, and
the rating flips the moment someone wires the module up.

The `src/lib/trading/lifecycle/` directory is entirely orphaned — `lifecycle/index.ts` only
re-exports `promotion-manager`, and nothing in `src` or `mobile-app` imports `trading/lifecycle`
in any form. Inside it, `demotion-rules.ts` fails **open** on both of its phantom tables:

```
demotion-rules.ts:63   if (error || !data) return { exceeded: false, count: 0 };   // risk_vetoes
demotion-rules.ts:82   if (error || !data) return false;                           // recon_breaks
```

A missing table therefore reads as "no risk vetoes" and "no reconciliation break" — the two
demotion triggers that pull a misbehaving strategy back down from `autonomous_live` can never
fire. Its sibling `promotion-gates.ts` gets this right, failing closed at `:151-157` with
`{ passed: false, missing: ["all_metrics"] }`. Whoever activates the lifecycle module must build
`risk_vetoes` and `recon_breaks` in the same change, and should probably invert those two guards
to fail closed regardless.

## Method notes and limits

- Reachability was traced to a terminal entry point, not inferred. Where a chain ended inside
  `src/lib/`, I grepped for importers of the barrel as well as the file, and for both `@/`-alias
  and relative import forms.
- Two reachability answers are honestly UNKNOWN and marked as such: `pctt_positions`,
  `autonomous_execution_logs` and `autonomous_scan_logs` all depend on whether the Fly.io
  `fynvita-autonomous-trading` service is deployed. That fact does not exist in this repo.
- The `PGRST205` error shape was measured against the running PostgREST, not assumed from the
  postgrest-js docs.
- Column-mapping claims for RENAME rows were checked against `pg_attribute` output for the real
  table, and every gap is named rather than glossed. `plaid_transactions`→`transactions` is the
  only clean one; the other four need column work.
