# Phantom-Table Inventory — code queries tables that do not exist

> Generated 2026-07-31 by diffing every non-test `.from("<table>")` call in `src/`, `mobile-app/src/`, `mobile-app/app/` against the **live** schema (all 56 migrations applied to a local Postgres). `Buffer.from`/`Array.from` etc. excluded. Reproduce: see the sweep in this file's commit message.

## Headline

- **147 phantom tables** referenced by **486 call sites** across **71 files**
- Only **101 of 248** distinct referenced tables exist in the live schema — **~59% of table references are phantom**
- Every one of these silently returns nothing at runtime: Postgrest resolves `{error}` rather than throwing, and this codebase's prevailing pattern swallows it or defaults it, so the feature *looks* like it works while computing on empty input.

## Why this was invisible

1. `src/lib/supabase/types.ts` omits the `Relationships` field postgrest-js's `GenericSchema` requires → the `Schema` generic degrades → `.from()` accepted **any string** (proven with two minimal repros).
2. `src/lib/supabase/client.ts` is **deliberately untyped**, by its own comment: *"the Database type only covers ~20 tables while the codebase uses 40+"* → its consumers stay invisible to `tsc` even after the types are fixed.

## Confirmed live impact (fixed this session)

| Table | Impact | Fix |
|---|---|---|
| `debts` | DTI gate meant to block live trading **never fired for any user** | `247fe9a` |
| `savings_goals` | emergency-fund check never worked | `247fe9a` (wellness-gate only — **6 more call sites remain**) |
| `orders` / `positions` | trade orders + positions **never persisted**; restart lost all history | `8e3422a` (tables built) |
| `tax_accounts` | `TaxProfile.accounts` always `[]` | `59c82bb` |

## Full inventory — phantom tables by call-site count

| Table | Call sites |
|---|---:|
| `scheduled_contributions` | 12 |
| `affiliate_conversions` | 11 |
| `user_achievements` | 10 |
| `affiliate_partners` | 10 |
| `paper_accounts` | 10 |
| `points_balances` | 9 |
| `points_transactions` | 8 |
| `commitment_contracts` | 8 |
| `affiliate_clicks` | 8 |
| `financial_accounts` | 7 |
| `savings_goals` | 7 |
| `experts` | 7 |
| `expert_sessions` | 7 |
| `offers` | 7 |
| `payments` | 6 |
| `spending_alerts` | 6 |
| `manual_accounts` | 6 |
| `save_transfers` | 6 |
| `alternative_assets` | 6 |
| `savings_rules` | 6 |
| `partner_invitations` | 6 |
| `achievement_definitions` | 6 |
| `proactive_alerts` | 6 |
| `email_preferences` | 6 |
| `disclosures` | 6 |
| `contribution_schedules` | 6 |
| `paper_positions` | 6 |
| `paper_orders` | 6 |
| `trading_journal` | 6 |
| `plaid_items` | 5 |
| `properties` | 5 |
| `crypto_wallets` | 5 |
| `spending_limits` | 5 |
| `auto_save_rules` | 5 |
| `bill_negotiations` | 5 |
| `leaderboard_scores` | 5 |
| `shared_goal_members` | 5 |
| `partnerships` | 5 |
| `payouts` | 5 |
| `portfolios` | 5 |
| `analytics_events` | 4 |
| `crypto_holdings` | 4 |
| `budget_alerts` | 4 |
| `user_backup_codes` | 4 |
| `leaderboard_participation` | 4 |
| `shared_goals` | 4 |
| `partner_nudges` | 4 |
| `financial_journeys` | 4 |
| `portfolio_holdings` | 4 |
| `credit_alerts` | 4 |
| `offer_disclosures` | 4 |
| `goal_notifications` | 4 |
| `rebalance_alerts` | 4 |
| `investment_alerts` | 3 |
| `bill_reminders` | 3 |
| `gig_income` | 3 |
| `gig_deductions` | 3 |
| `mortgages` | 3 |
| `crypto_price_alerts` | 3 |
| `plaid_transactions` | 3 |
| `alternative_asset_valuations` | 3 |
| `savings_transfers` | 3 |
| `shared_goal_invitations` | 3 |
| `inquiry_removal_requests` | 3 |
| `credit_report_errors` | 3 |
| `dividend_payments` | 3 |
| `weekly_summaries` | 3 |
| `expert_applications` | 3 |
| `user_attributions` | 3 |
| `payout_schedules` | 3 |
| `rent_reporting_accounts` | 3 |
| `credit_builder_applications` | 3 |
| `goal_contributions` | 3 |
| `paper_trades` | 3 |
| `pctt_positions` | 3 |
| `debts` | 2 |
| `gig_platforms` | 2 |
| `property_valuations` | 2 |
| `merchant_categories` | 2 |
| `savings_contributions` | 2 |
| `net_worth_history` | 2 |
| `monthly_summaries` | 2 |
| `bill_negotiation_outcomes` | 2 |
| `shared_goal_updates` | 2 |
| `points_redemptions` | 2 |
| `commitment_check_ins` | 2 |
| `experiment_assignments` | 2 |
| `alert_preferences` | 2 |
| `nudge_preferences` | 2 |
| `nudge_impressions` | 2 |
| `holdings` | 2 |
| `summary_preferences` | 2 |
| `credit_monitoring_settings` | 2 |
| `users` | 2 |
| `expert_reviews` | 2 |
| `commission_rules` | 2 |
| `payout_batches` | 2 |
| `rent_payments` | 2 |
| `user_credit_profiles` | 2 |
| `goal_milestones` | 2 |
| `recommendation_actions` | 2 |
| `user_notification_preferences` | 2 |
| `goal_investment_links` | 2 |
| `rebalance_history` | 2 |
| `drip_settings` | 2 |
| `credit_builder_actions` | 1 |
| `user_profiles` | 1 |
| `credit_card_utilization_history` | 1 |
| `plaid_accounts` | 1 |
| `credit_profiles` | 1 |
| `savings_history` | 1 |
| `debt_history` | 1 |
| `investment_history` | 1 |
| `health_score_history` | 1 |
| `financial_alerts` | 1 |
| `user_mfa_names` | 1 |
| `shared_goal_contributions` | 1 |
| `commitment_donations` | 1 |
| `experiments` | 1 |
| `experiment_conversions` | 1 |
| `bureau_disputes` | 1 |
| `ai_interactions` | 1 |
| `accounts` | 1 |
| `cohort_stats` | 1 |
| `credit_factors` | 1 |
| `portfolio_snapshots` | 1 |
| `user_preferences` | 1 |
| `risk_profiles` | 1 |
| `user_devices` | 1 |
| `email_logs` | 1 |
| `ocr_bridge_results` | 1 |
| `health_check` | 1 |
| `ab_test_conversions` | 1 |
| `offer_impressions` | 1 |
| `offer_clicks` | 1 |
| `affiliate_payouts` | 1 |
| `commission_tiers` | 1 |
| `manual_payout_queue` | 1 |
| `bank_accounts` | 1 |
| `paper_fills` | 1 |
| `risk_vetoes` | 1 |
| `recon_breaks` | 1 |
| `strategy_metrics` | 1 |
| `lifecycle_audit` | 1 |
| `autonomous_scan_logs` | 1 |
| `autonomous_execution_logs` | 1 |
| `stock_dividends` | 1 |

## Files with the most phantom call sites

| File | Phantom calls |
|---|---:|
| `src/lib/trading/paper/PaperTradingEngine.ts` | 26 |
| `src/lib/gamification/points-rewards-service.ts` | 19 |
| `src/lib/services/expert-sessions-service.ts` | 19 |
| `src/lib/financial/savings-automation-service.ts` | 17 |
| `src/lib/goals/services/ContributionSchedulerService.ts` | 16 |
| `src/lib/commerce/affiliate/tracking-service.ts` | 16 |
| `src/lib/gamification/achievement-service.ts` | 16 |
| `src/lib/gamification/accountability-partners-service.ts` | 15 |
| `src/lib/gamification/shared-goals-service.ts` | 15 |
| `src/lib/commerce/payouts/payout-service.ts` | 13 |
| `src/lib/financial/crypto-wallet-service.ts` | 12 |
| `src/lib/gamification/commitment-device-service.ts` | 11 |
| `src/lib/financial/spending-limit-alerts-service.ts` | 11 |
| `src/lib/financial/auto-save-rules-service.ts` | 11 |
| `src/lib/investments/services/PortfolioRebalanceService.ts` | 11 |
| `src/lib/financial/financial-aggregation-service.ts` | 11 |
| `src/lib/commerce/offers/offer-service.ts` | 10 |
| `src/lib/commerce/offers/disclosure-service.ts` | 10 |
| `src/lib/financial/real-estate-tracking-service.ts` | 10 |
| `src/lib/goals/services/GoalNotificationService.ts` | 10 |
| `src/lib/commerce/affiliate/commission-calculator.ts` | 9 |
| `src/lib/ai/financial-chat-engine.ts` | 9 |
| `src/lib/financial/alternative-asset-service.ts` | 9 |
| `src/lib/ai/proactive-alert-engine.ts` | 9 |
| `src/lib/gamification/anonymous-leaderboard-service.ts` | 9 |
| `src/lib/ai/weekly-summary-service.ts` | 9 |
| `src/lib/commerce/affiliate/affiliate-service.ts` | 8 |
| `src/lib/goals/services/GoalInvestmentService.ts` | 8 |
| `src/lib/financial/gig-income-service.ts` | 8 |
| `src/lib/financial/manual-account-service.ts` | 6 |

## Triage required (not yet done)

Each phantom table is one of: **(a)** a rename (a real table exists under another name — fix the call), **(b)** a genuinely unbuilt feature (build the migration, or delete the code that pretends to work), or **(c)** dead/unreachable code (delete).

This inventory does NOT yet distinguish them, and the count alone overstates *user-facing* impact — some sites are unreachable. That triage is the next step; nothing here should be reported as 'N broken features' until it is done.
