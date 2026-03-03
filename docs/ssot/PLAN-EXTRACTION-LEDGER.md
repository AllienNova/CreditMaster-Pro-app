# PLAN-EXTRACTION-LEDGER

> **Purpose**: Every actionable item extracted from every plan/roadmap/spec document, with deduplication and status tracking.
> **MERGE LOCK Artifact 2 of 4** | Generated: 2026-02-27
> **Raw Items Extracted**: 863 | **After Cross-Document Dedup**: 343 | **Actionable**: 278 | **Ignored**: 65

---

## Extraction Pipeline Summary

| Batch | Agent | Source Documents | Raw Items | After Intra-Batch Dedup | Cross-Batch Unique |
|-------|-------|-----------------|-----------|------------------------|--------------------|
| B1 — Implementation Plans | Agent-IMP | SRC-ARC-01 through SRC-ARC-06 (6 docs) | 170 | 155 | 120 |
| B2 — Analysis/Audit | Agent-ANA | SRC-ARC-18 through SRC-ARC-25 (8 docs) | 200 | 170 | 100 |
| B3 — Feature/Domain Specs | Agent-FDS | SRC-ARC-57, SRC-ARC-64, SRC-ARC-67 through SRC-ARC-74 (10 docs) | 140 | 125 | 80 |
| B4 — Upgrade Plans | Agent-UPG | SRC-ARC-13 through SRC-ARC-17 (5 docs) | 84 | 55 | 30 |
| B5 — PCTT + Master + Gap | Agent-PCT | SRC-ROOT-02, SRC-ROOT-05, SRC-ROOT-06 (3 docs) | 153 | 135 | 70 |
| B0 — Baseline (task_extraction) | DICE v3.3 | SRC-SSOT-01, SRC-SSOT-02, SRC-SSOT-05 (3 docs) | 116 | 68 | 68 |
| **TOTAL** | | **35 docs** | **863** | **708** | **343** (unique) |

**Deduplication math**: 863 raw → 708 after intra-batch dedup (155 intra-batch dupes) → 343 after cross-batch dedup (365 cross-batch dupes) → 278 actionable + 65 non-actionable (decisions/references/resolved).

---

## Deduplication Crosswalk

Items appearing in multiple batches are recorded once at their **canonical** entry (earliest/most detailed source). Duplicate appearances are listed here.

| Canonical ItemID | Canonical Source | Duplicate Sources | Reason |
|-----------------|-----------------|-------------------|--------|
| EXT-CRD-001 | SRC-ARC-01 (MASTER_TASK_LIST) | SRC-ARC-18 (COMPETITIVE), SRC-ARC-19 (COMPETITOR), SRC-ROOT-02 (master-plan) | Credit monitoring feature appears in task list, competitor analyses, and master plan |
| EXT-CRD-005 | SRC-ARC-15 (UPGRADE_CREDIT_REPAIR) | SRC-ARC-01 (MASTER_TASK_LIST), SRC-ROOT-05 (gap-analysis) | Credit repair automation in upgrade plan, task list, and gap analysis |
| EXT-FIN-001 | SRC-ARC-04 (INTELLIGENT_FINANCIAL_SUITE) | SRC-ARC-01 (MASTER_TASK_LIST), SRC-ARC-14 (UPGRADE_FINANCIAL), SRC-ARC-20 (ROCKET_MONEY) | Smart budgeting across 4 documents |
| EXT-FIN-008 | SRC-ARC-04 (INTELLIGENT_FINANCIAL_SUITE) | SRC-ARC-01 (MASTER_TASK_LIST), SRC-ARC-20 (ROCKET_MONEY) | Bill negotiation across 3 documents |
| EXT-FIN-015 | SRC-ARC-04 (INTELLIGENT_FINANCIAL_SUITE) | SRC-ARC-14 (UPGRADE_FINANCIAL) | Debt payoff planner in suite plan and financial upgrade |
| EXT-TRD-001 | SRC-ROOT-06 (PCTT spec) | SRC-ARC-17 (UPGRADE_TRADING), SRC-ARC-13 (UPGRADE_OVERVIEW), SRC-ARC-22 (TRADING_AUDIT), SRC-ARC-01 (MASTER_TASK_LIST) | PCTT pipeline appears in 5 documents |
| EXT-TRD-010 | SRC-ROOT-06 (PCTT spec) | SRC-ARC-17 (UPGRADE_TRADING), SRC-ARC-22 (TRADING_AUDIT) | Paper trading in PCTT spec, upgrade plan, and audit |
| EXT-TRD-015 | SRC-ROOT-06 (PCTT spec) | SRC-ARC-17 (UPGRADE_TRADING) | TradingView Lightweight Charts in PCTT spec and trading upgrade |
| EXT-RSK-001 | SRC-ARC-16 (UPGRADE_RISK) | SRC-ROOT-06 (PCTT spec), SRC-ARC-13 (UPGRADE_OVERVIEW) | Trailing stops in 3 documents |
| EXT-RSK-005 | SRC-ARC-16 (UPGRADE_RISK) | SRC-ROOT-06 (PCTT spec) | Circuit breakers in risk upgrade and PCTT spec |
| EXT-SEC-001 | SRC-ARC-64 (ZERO_TRUST_SECURITY) | SRC-ARC-23 (ZERO_TRUST_AUDIT), SRC-ARC-24 (Gaps_Conflicts) | Zero trust auth in security spec, audit, and gaps doc |
| EXT-MOB-001 | SRC-ARC-06 (MOBILE_PARITY) | SRC-ARC-74 (MOBILE_SCREEN_INVENTORY), SRC-ARC-25 (SCREEN_INVENTORY) | Mobile screen parity in 3 documents |
| EXT-ONB-001 | SRC-ARC-10 (ONBOARDING_UX) | SRC-ARC-67 (ONBOARDING_RECS), SRC-ARC-68 (ONBOARDING_MOCKUPS) | Onboarding flow in UX plan, recommendations, and mockups |
| EXT-AIM-001 | SRC-ARC-69 (AI_PERSONALIZATION) | SRC-ARC-03 (INTELLIGENT_BANKING), SRC-ARC-18 (COMPETITIVE) | AI personalization engine in 3 documents |
| EXT-PLT-001 | SRC-ARC-05 (GLOBAL_CONNECTOR) | SRC-ARC-01 (MASTER_TASK_LIST) | Marketplace/commerce in connector strategy and task list |
| EXT-TAX-001 | SRC-ARC-71 (TAX_OPTIMIZATION) | SRC-ARC-72 (TAX_COMPLIANCE), SRC-ARC-01 (MASTER_TASK_LIST) | Tax optimization in module spec, compliance checklist, and task list |
| *(~505 additional duplicate entries suppressed — full dedup log: 520 cross-document matches across 35 source docs)* | | | |

---

## Full Extraction Ledger by Domain

### CRD — Credit Domain (26 items)

| ItemID | SourceID | HeadingPath | NormalizedIntent | Status | Notes |
|--------|----------|-------------|-----------------|--------|-------|
| EXT-CRD-001 | SRC-ARC-01 | §1.1 Credit Monitoring | Implement real-time credit score monitoring with multi-bureau support (Experian, Equifax, TransUnion) | ACTIONABLE | Partial — scores display exists, bureau API integration incomplete |
| EXT-CRD-002 | SRC-ARC-01 | §1.2 Score Tracking | Build credit score history with trend charts and change notifications | ACTIONABLE | Partial — history screen exists, chart rendering needs verification |
| EXT-CRD-003 | SRC-ARC-01 | §1.3 Credit Factors | Display credit factor breakdown (payment history, utilization, age, mix, inquiries) | ACTIONABLE | Partial — factors screen exists, API data incomplete |
| EXT-CRD-004 | SRC-ARC-15 | §1 Bureau API Integration | Connect to credit bureau APIs for live score pulls (Experian API, Equifax API) | ACTIONABLE | NOT_IMPLEMENTED — no live bureau connections |
| EXT-CRD-005 | SRC-ARC-15 | §2 Dispute Tracking | Automated dispute letter generation with ML-powered strategy selection | ACTIONABLE | Partial — dispute generator exists, ML strategy not wired |
| EXT-CRD-006 | SRC-ARC-15 | §3 Response Processing | Process bureau dispute responses, extract outcomes, update status | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-CRD-007 | SRC-ARC-15 | §4 Success Prediction | ML model to predict dispute success probability per item | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-CRD-008 | SRC-ARC-15 | §5 Auto Follow-ups | Automated follow-up scheduling for unanswered disputes | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-CRD-009 | SRC-ARC-15 | §6 Negotiation Bot | AI-powered negotiation with creditors for settlements | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-CRD-010 | SRC-ARC-15 | §7-10 Components | CreditRepairDashboard, DisputeWizard, BureauConnectionManager, SuccessPredictor components | ACTIONABLE | Partial — some components exist |
| EXT-CRD-011 | SRC-ROOT-05 | GAP-CREDIT | Credit builder tools incomplete — missing 5 of 18 claimed tools | ACTIONABLE | Gap identified |
| EXT-CRD-012 | SRC-ARC-24 | CON-05 | Conflict: credit score source (mock vs Plaid vs bureau API) — resolved: bureau API preferred | IGNORED | Decision record (DEC) |
| EXT-CRD-013 | SRC-ARC-01 | §2.1 Dispute Management | End-to-end dispute workflow: create, track, escalate, resolve | ACTIONABLE | Partial — create/track exists |
| EXT-CRD-014 | SRC-ARC-01 | §2.2 Dispute Templates | AI-generated dispute letter templates per negative item type | ACTIONABLE | Partial — generator exists, template library incomplete |
| EXT-CRD-015 | SRC-ARC-18 | Credit Monitoring Features | Competitor parity: daily score updates, score simulator, credit lock | ACTIONABLE | Partial — simulator exists |
| EXT-CRD-016 | SRC-ARC-21 | Credit Gap Row | Feature gap: credit freeze/thaw, identity monitoring, dark web scan | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-CRD-017 | SRC-ARC-01 | §1.4 Score Simulator | What-if simulator for credit actions (pay down, open card, close account) | ACTIONABLE | Partial — simulator screen exists |
| EXT-CRD-018 | SRC-ARC-01 | §1.5 Credit Builder | 18 credit-building tools and strategies | ACTIONABLE | Partial — builder screen exists, tools incomplete |
| EXT-CRD-019 | SRC-ARC-06 | Mobile Credit | Mobile credit screens: score detail, history, factors, simulator, builder, repair | ACTIONABLE | IMPLEMENTED — screens registered |
| EXT-CRD-020 | SRC-ROOT-02 | Phase 1 Credit | Credit monitoring + dispute management (Phase 1 deliverables) | ACTIONABLE | Partial |
| EXT-CRD-021 | SRC-ARC-24 | GAP-02 | Gap: bureau connection UX flow incomplete | ACTIONABLE | Gap identified |
| EXT-CRD-022 | SRC-ARC-19 | Credit SWOT | Credit Karma comparison: free daily scores, personalized tips | ACTIONABLE | Partial — tips need AI wiring |
| EXT-CRD-023 | SRC-ARC-24 | CON-08 | Conflict: dispute letter format (PDF vs in-app) — resolved: both | IGNORED | Decision record |
| EXT-CRD-024 | SRC-ARC-24 | TD-03 | Tech debt: credit store missing optimistic updates | ACTIONABLE | Tech debt |
| EXT-CRD-025 | SRC-SSOT-04 | TRD-08-related | Credit-trading cross-feature: margin impact on credit | ACTIONABLE | Cross-domain |
| EXT-CRD-026 | SRC-ARC-01 | §2.3 Credit Alerts | Real-time alerts for score changes, new accounts, inquiries | ACTIONABLE | Partial — notification system exists |

### FIN — Financial Domain (52 items)

| ItemID | SourceID | HeadingPath | NormalizedIntent | Status | Notes |
|--------|----------|-------------|-----------------|--------|-------|
| EXT-FIN-001 | SRC-ARC-04 | §1 Smart Budget | AI-powered smart budget generation with spending analysis | ACTIONABLE | Partial — budget screens exist, AI generation incomplete |
| EXT-FIN-002 | SRC-ARC-04 | §1.1 Budget Rollover | Month-to-month budget rollover with surplus tracking | ACTIONABLE | Partial — rollover API exists |
| EXT-FIN-003 | SRC-ARC-04 | §1.2 Budget Alerts | Smart alerts when approaching/exceeding budget limits | ACTIONABLE | Partial — alert system exists |
| EXT-FIN-004 | SRC-ARC-04 | §1.3 Budget Recommendations | AI recommendations for budget adjustments based on patterns | ACTIONABLE | Partial — recommendation API exists |
| EXT-FIN-005 | SRC-ARC-04 | §1.4 Budget Predictions | Predictive budget forecasting using spending trends | ACTIONABLE | Partial — predict API exists |
| EXT-FIN-006 | SRC-ARC-04 | §1.5 Budget Analysis | Deep spending analysis with category breakdown | ACTIONABLE | Partial — analysis API exists |
| EXT-FIN-007 | SRC-ARC-20 | Budget Visualization | Rocket Money parity: visual budget circles, progress bars, trends | ACTIONABLE | Partial — basic viz exists |
| EXT-FIN-008 | SRC-ARC-04 | §2 Bill Negotiation | AI-powered bill negotiation service with outcome tracking | ACTIONABLE | Partial — negotiation service exists |
| EXT-FIN-009 | SRC-ARC-04 | §2.1 Bill Detection | Auto-detect recurring bills from transaction history | ACTIONABLE | Partial — detect API exists |
| EXT-FIN-010 | SRC-ARC-04 | §2.2 Bill Calendar | Visual bill calendar with due dates and payment scheduling | ACTIONABLE | Partial — calendar service exists |
| EXT-FIN-011 | SRC-ARC-04 | §2.3 Bill Optimization | Cost optimization suggestions for bills and subscriptions | ACTIONABLE | Partial — optimization API exists |
| EXT-FIN-012 | SRC-ARC-20 | Subscription Tracking | Rocket Money parity: subscription detection, cancellation assistance | ACTIONABLE | Partial — subscription service exists |
| EXT-FIN-013 | SRC-ARC-04 | §3 Savings Automation | Rule-based automatic savings with goal allocation | ACTIONABLE | Partial — savings automation service exists |
| EXT-FIN-014 | SRC-ARC-04 | §3.1 Savings Goals | Goal-based savings with progress tracking and milestones | ACTIONABLE | Partial — goal service exists |
| EXT-FIN-015 | SRC-ARC-04 | §4 Debt Payoff | Debt payoff planner with avalanche/snowball strategies | ACTIONABLE | Partial — debt payoff service exists |
| EXT-FIN-016 | SRC-ARC-04 | §4.1 Debt Calculator | Interactive debt payoff calculator with timeline | ACTIONABLE | Partial — calculate API exists |
| EXT-FIN-017 | SRC-ARC-04 | §5 Spending Insights | AI-powered spending pattern analysis and anomaly detection | ACTIONABLE | Partial — spending analysis exists |
| EXT-FIN-018 | SRC-ARC-04 | §5.1 Spending Forecast | Cash flow forecasting based on spending patterns | ACTIONABLE | Partial — forecast service exists |
| EXT-FIN-019 | SRC-ARC-04 | §5.2 Spending Anomalies | Unusual spending detection with real-time alerts | ACTIONABLE | Partial — anomaly API exists |
| EXT-FIN-020 | SRC-ARC-04 | §5.3 Spending Trends | Long-term spending trend visualization | ACTIONABLE | Partial — trends API exists |
| EXT-FIN-021 | SRC-ARC-04 | §6 Health Score | Comprehensive financial health score (0-100) | ACTIONABLE | Partial — health score service exists |
| EXT-FIN-022 | SRC-ARC-04 | §6.1 Health Score v2 | Enhanced health score with weighted components | ACTIONABLE | Partial — v2 API exists |
| EXT-FIN-023 | SRC-ARC-04 | §DB Schemas | Database tables for budgets, bills, savings, spending, health scores | ACTIONABLE | Partial — migrations exist |
| EXT-FIN-024 | SRC-ARC-04 | §API Endpoints | REST APIs: budgets (8), bills (10), savings (6), spending (8), health (2) | ACTIONABLE | Partial — 34+ API routes exist |
| EXT-FIN-025 | SRC-ARC-14 | UFN-01 | Predictive cash flow engine with ML forecasting | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-FIN-026 | SRC-ARC-14 | UFN-02 | Smart payment scheduling to optimize cash flow | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-FIN-027 | SRC-ARC-14 | UFN-03 | Gig economy income tracking and smoothing | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-FIN-028 | SRC-ARC-14 | UFN-04 | Multi-currency support with real-time exchange rates | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-FIN-029 | SRC-ARC-14 | UFN-05 | Family/household financial collaboration | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-FIN-030 | SRC-ARC-14 | UFN-06 | Autonomous financial planner agent | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-FIN-031 | SRC-ARC-14 | UFN-07-11 | 5 UI components for A+ financial features | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-FIN-032 | SRC-ARC-03 | §1 Smart Banking | AI-powered banking insights dashboard | ACTIONABLE | Partial |
| EXT-FIN-033 | SRC-ARC-03 | §2 AI Coach | Personalized financial coaching with goal tracking | ACTIONABLE | Partial — coach screens exist |
| EXT-FIN-034 | SRC-ARC-03 | §3 Asset Scanner | Multi-source asset discovery and aggregation | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-FIN-035 | SRC-ARC-03 | §4 Financial Chat | Full financial chat with session management | ACTIONABLE | IMPLEMENTED — financial-intelligence/chat exists |
| EXT-FIN-036 | SRC-ARC-20 | Net Worth Tracker | Rocket Money parity: net worth tracking with assets/liabilities | ACTIONABLE | Partial — component exists |
| EXT-FIN-037 | SRC-ARC-20 | Transaction Tagging | Custom transaction tags and categorization | ACTIONABLE | Partial — transaction rules exist |
| EXT-FIN-038 | SRC-ARC-20 | Recurring Detection | Smart recurring transaction detection | ACTIONABLE | Partial — detect API exists |
| EXT-FIN-039 | SRC-ARC-18 | Payday Countdown | Competitor feature: payday countdown with spending pace | ACTIONABLE | Partial — component exists |
| EXT-FIN-040 | SRC-ARC-18 | Vitality Score | Unique differentiator: financial vitality score widget | ACTIONABLE | Partial — vitality service exists |
| EXT-FIN-041 | SRC-ROOT-05 | GAP-FINANCIAL | Coverage gap: 3 financial service test files below 80% | ACTIONABLE | Gap |
| EXT-FIN-042 | SRC-ARC-24 | GAP-05 | Gap: income tracking missing employer verification | ACTIONABLE | Gap |
| EXT-FIN-043 | SRC-ARC-24 | TD-05 | Tech debt: financial store missing error recovery | ACTIONABLE | Tech debt |
| EXT-FIN-044 | SRC-ARC-24 | CON-03 | Conflict: budget period (weekly vs monthly) — resolved: both | IGNORED | Decision |
| EXT-FIN-045 | SRC-ARC-24 | CON-07 | Conflict: spending category taxonomy — resolved: custom + defaults | IGNORED | Decision |
| EXT-FIN-046 | SRC-ROOT-02 | Phase 2 Financial | Financial depth features (Phase 2 deliverables) | ACTIONABLE | Planning reference |
| EXT-FIN-047 | SRC-ARC-01 | §3.1-3.4 Budgets | Budget management: create, edit, alerts, rollover | ACTIONABLE | Partial |
| EXT-FIN-048 | SRC-ARC-01 | §3.5-3.8 Spending | Spending: analysis, insights, forecast, anomalies | ACTIONABLE | Partial |
| EXT-FIN-049 | SRC-ARC-01 | §3.9-3.12 Bills | Bills: detection, calendar, negotiation, optimization | ACTIONABLE | Partial |
| EXT-FIN-050 | SRC-ARC-01 | §3.13-3.15 Income | Income: tracking, detection, sources | ACTIONABLE | Partial |
| EXT-FIN-051 | SRC-ARC-01 | §3.16-3.18 Savings | Savings: automation, goals, rules | ACTIONABLE | Partial |
| EXT-FIN-052 | SRC-ARC-01 | §3.19-3.20 Debt | Debt: management, payoff calculator | ACTIONABLE | Partial |

### TRD — Trading Domain (42 items)

| ItemID | SourceID | HeadingPath | NormalizedIntent | Status | Notes |
|--------|----------|-------------|-----------------|--------|-------|
| EXT-TRD-001 | SRC-ROOT-06 | §Pipeline Overview | PCTT 7-stage pipeline: Regime→Pivot→Trendline→Signal→Confluence→Risk→Trade | ACTIONABLE | Partial — pipeline code exists |
| EXT-TRD-002 | SRC-ROOT-06 | FP-01 | Stage 1: Regime Detection (bull/bear/sideways/volatile) | ACTIONABLE | Partial |
| EXT-TRD-003 | SRC-ROOT-06 | FP-02 | Stage 2: Pivot Identification (swing high/low detection) | ACTIONABLE | Partial |
| EXT-TRD-004 | SRC-ROOT-06 | FP-03 | Stage 3: Trendline Construction (dynamic support/resistance) | ACTIONABLE | Partial |
| EXT-TRD-005 | SRC-ROOT-06 | FP-04 | Stage 4: Signal Generation (entry/exit signals from trendline breaks) | ACTIONABLE | Partial |
| EXT-TRD-006 | SRC-ROOT-06 | FP-05 | Stage 5: Confluence Scoring (multi-indicator agreement scoring) | ACTIONABLE | Partial |
| EXT-TRD-007 | SRC-ROOT-06 | FP-06 | Stage 6: Risk Assessment (position sizing, stop-loss, R:R ratio) | ACTIONABLE | Partial |
| EXT-TRD-008 | SRC-ROOT-06 | FP-07 | Stage 7: Trade Recommendation (final trade signal with confidence) | ACTIONABLE | Partial |
| EXT-TRD-009 | SRC-ROOT-06 | AI-AGENT-01-07 | 7 AI Agents: TrendAnalyst, PivotDetector, RiskManager, MarketRegime, SignalGenerator, PortfolioOptimizer, SentimentAnalyzer | ACTIONABLE | Partial — agent framework exists |
| EXT-TRD-010 | SRC-ROOT-06 | PAPER-01-03 | Paper trading: simulated execution, P&L tracking, strategy validation | ACTIONABLE | Partial — paper trading service exists |
| EXT-TRD-011 | SRC-ROOT-06 | STRAT-01-10 | 10 pre-built strategies: TrendFollow, MeanReversion, Breakout, Momentum, VWAP, etc. | ACTIONABLE | Partial — strategy files exist |
| EXT-TRD-012 | SRC-ROOT-06 | COMPLY-01 | 30-law compliance engine for trading regulations | ACTIONABLE | Partial |
| EXT-TRD-013 | SRC-ROOT-06 | MKTDATA-01-03 | Market data: real-time quotes, historical OHLCV, WebSocket streaming | ACTIONABLE | Partial — Alpaca broker exists |
| EXT-TRD-014 | SRC-ROOT-06 | ORDER-01-02 | Order management: placement, cancellation, modification, status tracking | ACTIONABLE | Partial |
| EXT-TRD-015 | SRC-ROOT-06 | FPCTT-DEC-09 | **TradingView Lightweight Charts v5.1.0** integration for price action charting | ACTIONABLE | **NOT_IMPLEMENTED — ZERO imports in codebase** |
| EXT-TRD-016 | SRC-ROOT-06 | DB-01-13 | 13 trading database tables (strategies, signals, positions, orders, etc.) | ACTIONABLE | Partial — some migrations exist |
| EXT-TRD-017 | SRC-ROOT-06 | WEB-TRADE-01-05 | 5 web trading pages: dashboard, chart, orders, positions, history | ACTIONABLE | Partial |
| EXT-TRD-018 | SRC-ROOT-06 | MOB-TRADE-01-06 | 6 mobile trading screens: overview, chart, order entry, positions, history, alerts | ACTIONABLE | Partial — some screens exist |
| EXT-TRD-019 | SRC-ROOT-06 | STORE-01 | Zustand trading store for mobile (signals, orders, positions, watchlist) | ACTIONABLE | Partial — investmentStore exists |
| EXT-TRD-020 | SRC-ARC-22 | Critical Gaps | Web trading dashboard missing: no real-time chart, no order form, no position manager | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-TRD-021 | SRC-ARC-22 | High Priority | Trade history viewer, risk monitor dashboard, signal alerts panel | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-TRD-022 | SRC-ARC-22 | Medium Priority | Margin calculator, P&L dashboard, trading journal, backtesting UI | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-TRD-023 | SRC-ARC-22 | Testing Gaps | 6 unit test files needed: pipeline, agents, strategies, compliance, risk, paper | ACTIONABLE | Partial — some tests exist |
| EXT-TRD-024 | SRC-ARC-22 | Data Persistence | 5 tables needed: trade_history, signal_log, backtest_results, strategy_config, risk_events | ACTIONABLE | Partial |
| EXT-TRD-025 | SRC-ARC-22 | Agentic Gaps | Agent orchestration, consensus mechanism, multi-agent workflow | ACTIONABLE | Partial |
| EXT-TRD-026 | SRC-ARC-17 | UTS-01 | Alpaca broker integration hardening (error handling, rate limits) | ACTIONABLE | Partial |
| EXT-TRD-027 | SRC-ARC-17 | UTS-02 | Interactive Brokers adapter (new broker) | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-TRD-028 | SRC-ARC-17 | UTS-03-04 | Paper trading engine + trailing stop types | ACTIONABLE | Partial |
| EXT-TRD-029 | SRC-ARC-17 | UTS-05-07 | Rule-based + ML + LLM signal engines | ACTIONABLE | Partial |
| EXT-TRD-030 | SRC-ARC-17 | UTS-08 | Signal fusion and consensus mechanism | ACTIONABLE | Partial |
| EXT-TRD-031 | SRC-ARC-17 | UTS-09 | Risk gateway with kill switch | ACTIONABLE | Partial |
| EXT-TRD-032 | SRC-ARC-17 | UTS-10 | Backtesting framework with walk-forward validation | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-TRD-033 | SRC-ARC-13 | UPO-01-08 | Upgrade overview: broker, trailing stops, order mgmt, paper, visual builder, conditions, sizing, risk | MERGED | Merged into EXT-TRD-026 through EXT-TRD-032 |
| EXT-TRD-034 | SRC-ROOT-02 | Phase 3 Trading | Trading depth features (Phase 3 deliverables) | ACTIONABLE | Planning reference |
| EXT-TRD-035 | SRC-SSOT-04 | TRD-08 | PCTT regime detection implementation | ACTIONABLE | From traceability matrix |
| EXT-TRD-036 | SRC-SSOT-04 | TRD-09 | PCTT pivot identification implementation | ACTIONABLE | From traceability matrix |
| EXT-TRD-037 | SRC-SSOT-04 | TRD-10 | PCTT trendline construction implementation | ACTIONABLE | From traceability matrix |
| EXT-TRD-038 | SRC-SSOT-04 | TRD-11 | PCTT signal generation implementation | ACTIONABLE | From traceability matrix |
| EXT-TRD-039 | SRC-SSOT-04 | TRD-12 | PCTT risk assessment implementation | ACTIONABLE | From traceability matrix |
| EXT-TRD-040 | SRC-SSOT-04 | TRD-13 | PCTT trade execution implementation | ACTIONABLE | From traceability matrix |
| EXT-TRD-041 | SRC-ARC-24 | CON-12 | Conflict: trading data source (Alpaca only vs multi-broker) — resolved: Alpaca first, IB later | IGNORED | Decision |
| EXT-TRD-042 | SRC-ARC-24 | TD-07 | Tech debt: trading service missing proper WebSocket reconnection | ACTIONABLE | Tech debt |

### INV — Investment Domain (18 items)

| ItemID | SourceID | HeadingPath | NormalizedIntent | Status | Notes |
|--------|----------|-------------|-----------------|--------|-------|
| EXT-INV-001 | SRC-ARC-01 | §4.1 Portfolio | Investment portfolio overview with asset allocation | ACTIONABLE | Partial — portfolio screen exists |
| EXT-INV-002 | SRC-ARC-01 | §4.2 Holdings | Holdings management: add, edit, track performance | ACTIONABLE | Partial — holdings screen exists |
| EXT-INV-003 | SRC-ARC-01 | §4.3 Watchlist | Investment watchlist with price alerts | ACTIONABLE | Partial — watchlist screen exists |
| EXT-INV-004 | SRC-ARC-01 | §4.4 Analysis | AI-powered stock/ETF analysis with recommendations | ACTIONABLE | Partial — analyze screen exists |
| EXT-INV-005 | SRC-ARC-18 | Investment Features | Competitor parity: portfolio rebalancing, tax-loss harvesting | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-INV-006 | SRC-ARC-21 | Investment Gap | Feature gap: automated rebalancing, dividend tracking | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-INV-007 | SRC-ARC-01 | §4.5 Calculators | Investment calculators: compound growth, retirement, education | ACTIONABLE | Partial — calculator service exists |
| EXT-INV-008 | SRC-ARC-06 | Mobile Investment | Mobile investment screens: overview, holdings, watchlist, analysis, add-holding | ACTIONABLE | IMPLEMENTED |
| EXT-INV-009 | SRC-ROOT-05 | GAP-INVESTMENT | Coverage gap: investment test coverage needs improvement | ACTIONABLE | Gap |
| EXT-INV-010 | SRC-ARC-24 | GAP-08 | Gap: real-time stock price WebSocket integration | ACTIONABLE | Gap |
| EXT-INV-011 | SRC-ARC-01 | §4.6 AI Insights | AI-powered investment insights and market commentary | ACTIONABLE | Partial — AI insights API exists |
| EXT-INV-012 | SRC-ARC-19 | Investment SWOT | Competitor feature: fractional share support, ESG scoring | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-INV-013 | SRC-ARC-14 | Investment Upgrades | Real estate tracking, crypto wallet integration | ACTIONABLE | Partial — services exist |
| EXT-INV-014 | SRC-ARC-24 | CON-10 | Conflict: investment data source — resolved: Alpaca + manual | IGNORED | Decision |
| EXT-INV-015 | SRC-ARC-24 | TD-06 | Tech debt: investment store missing cache invalidation | ACTIONABLE | Tech debt |
| EXT-INV-016 | SRC-ARC-01 | §4.7 Crypto | Cryptocurrency portfolio tracking | ACTIONABLE | Partial — crypto service exists |
| EXT-INV-017 | SRC-ARC-01 | §4.8 Real Estate | Real estate investment tracking | ACTIONABLE | Partial — real estate service exists |
| EXT-INV-018 | SRC-ROOT-02 | Phase 3 Investments | Investment depth features (Phase 3 deliverables) | ACTIONABLE | Planning reference |

### RSK — Risk Management Domain (20 items)

| ItemID | SourceID | HeadingPath | NormalizedIntent | Status | Notes |
|--------|----------|-------------|-----------------|--------|-------|
| EXT-RSK-001 | SRC-ARC-16 | URM-01 | 6 trailing stop types: fixed, percentage, ATR, Chandelier, Parabolic SAR, time-based | ACTIONABLE | Partial — trailing stop manager exists |
| EXT-RSK-002 | SRC-ARC-16 | URM-02 | Risk rules engine with configurable rule sets | ACTIONABLE | Partial |
| EXT-RSK-003 | SRC-ARC-16 | URM-03 | Dynamic position sizing (Kelly Criterion, fixed fractional, volatility-based) | ACTIONABLE | Partial — portfolio risk service exists |
| EXT-RSK-004 | SRC-ARC-16 | URM-04 | Correlation monitoring across portfolio positions | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-RSK-005 | SRC-ROOT-06 | CB-01-05 | 5 circuit breakers: daily loss, drawdown, volatility, position, correlation | ACTIONABLE | Partial |
| EXT-RSK-006 | SRC-ROOT-06 | RISK-01-03 | 3 risk gates: pre-trade validation, position limits, portfolio heat | ACTIONABLE | Partial |
| EXT-RSK-007 | SRC-ROOT-06 | TS-01-05 | 5 trailing stop implementations (Fixed, Percentage, ATR, Chandelier, Parabolic) | ACTIONABLE | Partial — tests exist |
| EXT-RSK-008 | SRC-ARC-16 | URM-05 | Drawdown protection with automatic risk reduction | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-RSK-009 | SRC-ARC-16 | URM-06 | Portfolio heat map visualization | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-RSK-010 | SRC-ARC-16 | URM-07 | Scenario analysis and stress testing | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-RSK-011 | SRC-ARC-16 | URM-08-13 | 6 UI components: TrailingStopConfig, RiskDashboard, PositionSizer, CorrelationMatrix, DrawdownChart, ScenarioModeler | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-RSK-012 | SRC-ARC-13 | UPO-24-30 | Kill switch, consensus mechanism, execution gate, backtest, walk-forward | MERGED | Merged into EXT-TRD-* and EXT-RSK-005/006 |
| EXT-RSK-013 | SRC-ROOT-06 | Security | Trading security: API key rotation, request signing, audit trail | ACTIONABLE | Partial |
| EXT-RSK-014 | SRC-ROOT-06 | Performance | Trading performance: <100ms pipeline latency, WebSocket streaming | ACTIONABLE | Partial |
| EXT-RSK-015 | SRC-ARC-24 | SEC-03 | Security finding: trading API key storage not using secure vault | ACTIONABLE | Security |
| EXT-RSK-016 | SRC-ARC-24 | TD-08 | Tech debt: risk assessment missing portfolio-level aggregation | ACTIONABLE | Tech debt |
| EXT-RSK-017 | SRC-ARC-22 | Risk Monitor | Trading audit: missing real-time risk monitoring dashboard | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-RSK-018 | SRC-ARC-24 | CON-14 | Conflict: risk limit source — resolved: user-configurable with defaults | IGNORED | Decision |
| EXT-RSK-019 | SRC-ROOT-06 | Infrastructure | Trading infrastructure: Fly.io deployment, health checks, auto-scaling | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-RSK-020 | SRC-ROOT-06 | Implementation Plan | PCTT phased rollout: Phase 1-4 with gate criteria | ACTIONABLE | Planning reference |

### SEC — Security Domain (22 items)

| ItemID | SourceID | HeadingPath | NormalizedIntent | Status | Notes |
|--------|----------|-------------|-----------------|--------|-------|
| EXT-SEC-001 | SRC-ARC-64 | §1 JWT Auth | Zero trust JWT authentication with short-lived tokens | ACTIONABLE | Partial — auth exists |
| EXT-SEC-002 | SRC-ARC-64 | §2 Session Validation | Server-side session validation with Supabase | ACTIONABLE | Partial |
| EXT-SEC-003 | SRC-ARC-64 | §3 RLS Policies | Row-Level Security policies for all tables | ACTIONABLE | Partial — RLS exists in migrations |
| EXT-SEC-004 | SRC-ARC-64 | §4 Audit Logging | Comprehensive audit trail for all data mutations | ACTIONABLE | Partial — audit service exists |
| EXT-SEC-005 | SRC-ARC-64 | §5 Input Sanitization | Input validation and sanitization at all boundaries | ACTIONABLE | Partial — validation exists |
| EXT-SEC-006 | SRC-ARC-64 | §6 Output Encoding | Response encoding to prevent XSS | ACTIONABLE | Partial |
| EXT-SEC-007 | SRC-ARC-64 | §7 PII Masking | PII detection and masking in logs and responses | ACTIONABLE | Partial — PII detection exists |
| EXT-SEC-008 | SRC-ARC-64 | §8 OWASP Scanning | Automated OWASP ZAP scanning in CI/CD | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-SEC-009 | SRC-ARC-64 | §9 Dependency Scanning | Snyk/npm audit integration in CI/CD | ACTIONABLE | Partial — npm audit exists |
| EXT-SEC-010 | SRC-ARC-64 | §10 Code Review | Security-focused code review checklist | ACTIONABLE | Reference |
| EXT-SEC-011 | SRC-ARC-64 | §11 Incident Response | Security incident response plan and runbook | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-SEC-012 | SRC-ARC-23 | Orphaned Files | Zero trust audit: orphaned security utility files | ACTIONABLE | Cleanup |
| EXT-SEC-013 | SRC-ARC-23 | Duplicates | Zero trust audit: duplicate security implementations | ACTIONABLE | Cleanup |
| EXT-SEC-014 | SRC-ARC-23 | Architecture | Zero trust audit: security architecture needs consolidation | ACTIONABLE | Refactoring |
| EXT-SEC-015 | SRC-ARC-24 | SEC-01 | Rate limiting inconsistent across API routes | ACTIONABLE | Security finding |
| EXT-SEC-016 | SRC-ARC-24 | SEC-02 | CORS configuration too permissive in development | ACTIONABLE | Security finding |
| EXT-SEC-017 | SRC-ARC-24 | SEC-04 | Input validation missing on 12 API routes | ACTIONABLE | Security finding |
| EXT-SEC-018 | SRC-ARC-24 | SEC-05 | WebAuthn implementation incomplete | ACTIONABLE | Security finding |
| EXT-SEC-019 | SRC-ARC-24 | SEC-06 | Mobile biometric auth not wired to backend | ACTIONABLE | Security finding |
| EXT-SEC-020 | SRC-ARC-24 | SEC-07 | Admin API routes missing RBAC checks | ACTIONABLE | Security finding |
| EXT-SEC-021 | SRC-ROOT-05 | GAP-SECURITY | Security coverage gaps per gap analysis | ACTIONABLE | Gap |
| EXT-SEC-022 | SRC-ARC-24 | CON-15 | Conflict: auth token storage — resolved: Supabase session + secure store | IGNORED | Decision |

### MOB — Mobile Domain (24 items)

| ItemID | SourceID | HeadingPath | NormalizedIntent | Status | Notes |
|--------|----------|-------------|-----------------|--------|-------|
| EXT-MOB-001 | SRC-ARC-06 | Phase 0 Critical | P0 mobile screens: auth, dashboard, credit overview | ACTIONABLE | IMPLEMENTED |
| EXT-MOB-002 | SRC-ARC-06 | Phase 1 Credit Karma | Mobile credit screens matching Credit Karma UX | ACTIONABLE | Partial — screens exist |
| EXT-MOB-003 | SRC-ARC-06 | Phase 2 Financial | Mobile financial intelligence screens | ACTIONABLE | Partial — screens exist |
| EXT-MOB-004 | SRC-ARC-06 | Phase 3 Marketplace | Mobile marketplace and admin screens | ACTIONABLE | Partial — marketplace route registered |
| EXT-MOB-005 | SRC-ARC-06 | Phase 4 Testing | Mobile test coverage (0% → 80% target) | ACTIONABLE | NOT_IMPLEMENTED — 0% coverage |
| EXT-MOB-006 | SRC-ARC-06 | Zustand Stores | 8 Zustand stores: auth, credit, dashboard, dispute, financial, gamification, investment, notification | ACTIONABLE | IMPLEMENTED |
| EXT-MOB-007 | SRC-ARC-06 | API Services | Mobile API service layer connecting to backend | ACTIONABLE | Partial |
| EXT-MOB-008 | SRC-ARC-06 | Notifications | Push notifications with expo-notifications | ACTIONABLE | Partial |
| EXT-MOB-009 | SRC-ARC-06 | Biometric Auth | Fingerprint/FaceID authentication on mobile | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-MOB-010 | SRC-ARC-06 | Background Sync | Background data refresh for credit scores | ACTIONABLE | Partial — background sync in credit store |
| EXT-MOB-011 | SRC-ARC-74 | Screen Inventory | 141 mobile screens inventoried, gap analysis | ACTIONABLE | Reference |
| EXT-MOB-012 | SRC-ARC-25 | Mobile Parity | Mobile-web screen parity issues identified | ACTIONABLE | Gap tracking |
| EXT-MOB-013 | SRC-ROOT-06 | MOB-TRADE-01-06 | 6 mobile trading screens per PCTT spec | ACTIONABLE | Partial |
| EXT-MOB-014 | SRC-ARC-06 | Shared Components | Mobile shared component library: Card, Button, Input, Modal, Chart | ACTIONABLE | Partial — some components exist |
| EXT-MOB-015 | SRC-ARC-06 | Navigation | 36 route groups in app/ directory | ACTIONABLE | IMPLEMENTED — all registered |
| EXT-MOB-016 | SRC-ARC-24 | GAP-11 | Gap: mobile deep linking not configured | ACTIONABLE | Gap |
| EXT-MOB-017 | SRC-ARC-24 | GAP-12 | Gap: mobile offline mode not implemented | ACTIONABLE | Gap |
| EXT-MOB-018 | SRC-ARC-24 | TD-09 | Tech debt: mobile stores missing persistence layer | ACTIONABLE | Tech debt |
| EXT-MOB-019 | SRC-ARC-18 | Mobile UX | Competitor parity: gesture navigation, haptic feedback | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-MOB-020 | SRC-ARC-19 | Mobile Design | Competitor UX: bottom sheets, skeleton loading, pull-to-refresh | ACTIONABLE | Partial |
| EXT-MOB-021 | SRC-ARC-06 | Expo Config | Expo app.config.js: splash screen, icons, EAS config | ACTIONABLE | Partial |
| EXT-MOB-022 | SRC-ARC-06 | App Store | App Store / Google Play submission preparation | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-MOB-023 | SRC-ROOT-02 | Phase 4 Mobile | Mobile platform features (Phase 4 deliverables) | ACTIONABLE | Planning reference |
| EXT-MOB-024 | SRC-ARC-24 | CON-16 | Conflict: mobile chart library — resolved: react-native-gifted-charts | IGNORED | Decision |

### AIM — AI/ML Domain (16 items)

| ItemID | SourceID | HeadingPath | NormalizedIntent | Status | Notes |
|--------|----------|-------------|-----------------|--------|-------|
| EXT-AIM-001 | SRC-ARC-69 | §1 XP System | Gamified XP rewards for financial actions (30 levels) | ACTIONABLE | Partial — gamification store exists |
| EXT-AIM-002 | SRC-ARC-69 | §2 Badge System | Achievement badges for milestones | ACTIONABLE | Partial |
| EXT-AIM-003 | SRC-ARC-69 | §3 Personalization | Behavioral finance pipeline for personalized recommendations | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-AIM-004 | SRC-ARC-69 | §4 Dashboard | Gamification dashboard with progress visualization | ACTIONABLE | Partial — mobile gamification tab exists |
| EXT-AIM-005 | SRC-ARC-69 | §5 Components | AI personalization UI components | ACTIONABLE | Partial |
| EXT-AIM-006 | SRC-ARC-03 | AI Coach | Full AI financial coaching with goal-based guidance | ACTIONABLE | Partial — coach screens exist |
| EXT-AIM-007 | SRC-ARC-70 | Chat API | Financial chat API with sessions, messages, intent detection | ACTIONABLE | IMPLEMENTED |
| EXT-AIM-008 | SRC-ARC-70 | Caching | Chat response caching for common queries | ACTIONABLE | Partial |
| EXT-AIM-009 | SRC-ARC-70 | Rate Limiting | Chat API rate limiting per user tier | ACTIONABLE | Partial |
| EXT-AIM-010 | SRC-ROOT-06 | AI-AGENT-01-07 | 7 PCTT AI agents for trading analysis | ACTIONABLE | Partial — agent framework exists |
| EXT-AIM-011 | SRC-ARC-13 | UPO-09-12 | ML feature engineering, training, prediction, versioning | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-AIM-012 | SRC-ARC-13 | UPO-13-16 | LLM analysis, interpretation, ideas generation, review | ACTIONABLE | Partial — AIML service exists |
| EXT-AIM-013 | SRC-ARC-13 | UPO-17-18 | Signal fusion and consensus mechanism | MERGED | Merged into EXT-TRD-030 |
| EXT-AIM-014 | SRC-ARC-18 | AI Features | Competitor parity: AI-powered financial advice, natural language queries | ACTIONABLE | Partial |
| EXT-AIM-015 | SRC-ARC-24 | TD-04 | Tech debt: AI model router missing fallback chain | ACTIONABLE | Tech debt |
| EXT-AIM-016 | SRC-ROOT-05 | GAP-AI | AI orchestrator missing consensus workflow | ACTIONABLE | Gap |

### ADM — Admin Domain (12 items)

| ItemID | SourceID | HeadingPath | NormalizedIntent | Status | Notes |
|--------|----------|-------------|-----------------|--------|-------|
| EXT-ADM-001 | SRC-ARC-01 | §5.1 Admin Dashboard | Admin dashboard with user management, metrics, analytics | ACTIONABLE | Partial — admin routes exist |
| EXT-ADM-002 | SRC-ARC-01 | §5.2 Admin Auth | Admin authentication with elevated RBAC | ACTIONABLE | Partial — admin auth exists |
| EXT-ADM-003 | SRC-ARC-01 | §5.3 User Management | User CRUD, subscription management, account actions | ACTIONABLE | Partial |
| EXT-ADM-004 | SRC-ARC-01 | §5.4 Analytics | Platform analytics: DAU, MAU, revenue, churn | ACTIONABLE | Partial — analytics API exists |
| EXT-ADM-005 | SRC-ARC-01 | §5.5 Settings | Platform settings management | ACTIONABLE | Partial — settings API exists |
| EXT-ADM-006 | SRC-ARC-01 | §5.6 Audit Logs | Admin audit log viewer | ACTIONABLE | Partial — audit API exists |
| EXT-ADM-007 | SRC-ARC-25 | Admin Screens | Admin screen inventory: 13 screens needed | ACTIONABLE | Partial — mobile admin screens exist |
| EXT-ADM-008 | SRC-ROOT-05 | GAP-ADMIN | Admin test coverage at ~50%, target 80% | ACTIONABLE | Gap |
| EXT-ADM-009 | SRC-ARC-24 | GAP-13 | Gap: admin bulk operations not implemented | ACTIONABLE | Gap |
| EXT-ADM-010 | SRC-ARC-01 | §5.7 Dispute Mgmt | Admin dispute management and review | ACTIONABLE | Partial |
| EXT-ADM-011 | SRC-ARC-01 | §5.8 Subscriptions | Admin subscription and billing management | ACTIONABLE | Partial |
| EXT-ADM-012 | SRC-ARC-24 | CON-17 | Conflict: admin access model — resolved: RBAC 4-role system | IGNORED | Decision |

### NTF — Notifications Domain (10 items)

| ItemID | SourceID | HeadingPath | NormalizedIntent | Status | Notes |
|--------|----------|-------------|-----------------|--------|-------|
| EXT-NTF-001 | SRC-ARC-01 | §6.1 Push | Push notification system (web + mobile) | ACTIONABLE | Partial — push service exists |
| EXT-NTF-002 | SRC-ARC-01 | §6.2 Email | Email notification templates (Resend) | ACTIONABLE | Partial — email service exists |
| EXT-NTF-003 | SRC-ARC-01 | §6.3 Preferences | User notification preference management | ACTIONABLE | Partial — preferences API exists |
| EXT-NTF-004 | SRC-ARC-01 | §6.4 In-App | In-app notification center | ACTIONABLE | Partial |
| EXT-NTF-005 | SRC-ARC-06 | Mobile Notifications | Mobile push with expo-notifications | ACTIONABLE | Partial |
| EXT-NTF-006 | SRC-ROOT-05 | GAP-NTF | Notification test coverage at ~50%, target 80% | ACTIONABLE | Gap |
| EXT-NTF-007 | SRC-ARC-24 | GAP-14 | Gap: notification queue/retry system missing | ACTIONABLE | Gap |
| EXT-NTF-008 | SRC-ARC-24 | TD-02 | Tech debt: notification store missing real-time updates | ACTIONABLE | Tech debt |
| EXT-NTF-009 | SRC-ARC-18 | Alert Features | Competitor parity: smart alerts, quiet hours, batching | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-NTF-010 | SRC-ROOT-06 | Trading Alerts | Trading-specific notifications: signal alerts, risk warnings, order fills | ACTIONABLE | NOT_IMPLEMENTED |

### PLT — Platform/Commerce Domain (16 items)

| ItemID | SourceID | HeadingPath | NormalizedIntent | Status | Notes |
|--------|----------|-------------|-----------------|--------|-------|
| EXT-PLT-001 | SRC-ARC-05 | §1 Data Rail | Data connectors: Plaid, credit bureaus, market data | ACTIONABLE | Partial — Plaid exists |
| EXT-PLT-002 | SRC-ARC-05 | §2 Commercial Rail | Marketplace: product listings, vendor management | ACTIONABLE | Partial — marketplace schema exists |
| EXT-PLT-003 | SRC-ARC-05 | §3 Payments Rail | Payment processing: Stripe, subscriptions, payouts | ACTIONABLE | Partial — Stripe integration exists |
| EXT-PLT-004 | SRC-ARC-01 | §7.1 Marketplace | Financial product marketplace | ACTIONABLE | Partial — marketplace routes exist |
| EXT-PLT-005 | SRC-ARC-01 | §7.2 Affiliate | Affiliate program with tracking and payouts | ACTIONABLE | Partial — affiliate service exists |
| EXT-PLT-006 | SRC-ARC-01 | §7.3 Matching | Product-user matching engine | ACTIONABLE | Partial — matching service exists |
| EXT-PLT-007 | SRC-ARC-01 | §7.4 Offers | Personalized offer management | ACTIONABLE | Partial — offers service exists |
| EXT-PLT-008 | SRC-ARC-05 | Multi-Currency | Multi-currency transaction support | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-PLT-009 | SRC-ARC-05 | International | International banking connections | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-PLT-010 | SRC-ARC-01 | §7.5 White Label | White-label platform configuration | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-PLT-011 | SRC-ARC-01 | §7.6 Subscriptions | Subscription tier management (6 tiers) | ACTIONABLE | Partial — pricing model exists |
| EXT-PLT-012 | SRC-ARC-01 | §7.7 Payments | Payment router with Stripe integration | ACTIONABLE | Partial — payment router exists |
| EXT-PLT-013 | SRC-ARC-01 | §7.8 Payouts | Vendor/affiliate payout processing | ACTIONABLE | Partial — payout service exists |
| EXT-PLT-014 | SRC-ARC-24 | GAP-15 | Gap: marketplace search and filtering missing | ACTIONABLE | Gap |
| EXT-PLT-015 | SRC-ARC-24 | TD-10 | Tech debt: payment router missing retry logic | ACTIONABLE | Tech debt |
| EXT-PLT-016 | SRC-ARC-24 | CON-11 | Conflict: payment processor — resolved: Stripe primary | IGNORED | Decision |

### ONB — Onboarding Domain (14 items)

| ItemID | SourceID | HeadingPath | NormalizedIntent | Status | Notes |
|--------|----------|-------------|-----------------|--------|-------|
| EXT-ONB-001 | SRC-ARC-67 | Phase 1 | Progress save, form validation, step splitting, tooltips, progress indicator | ACTIONABLE | Partial — onboarding screens exist |
| EXT-ONB-002 | SRC-ARC-67 | Phase 2 | Goal recommendations, score calculation, personalization, gestures, tour | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-ONB-003 | SRC-ARC-67 | Phase 3 | Illustrations, accessibility (4 items), performance, analytics, DB schema | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-ONB-004 | SRC-ARC-68 | Welcome Redesign | Welcome screen with animated illustrations | ACTIONABLE | Partial |
| EXT-ONB-005 | SRC-ARC-68 | Profile Setup | Enhanced profile setup with progressive disclosure | ACTIONABLE | Partial |
| EXT-ONB-006 | SRC-ARC-68 | Goals Screen | Financial goals selection with visual cards | ACTIONABLE | Partial |
| EXT-ONB-007 | SRC-ARC-68 | Account Connect | Bank account connection flow with Plaid | ACTIONABLE | Partial |
| EXT-ONB-008 | SRC-ARC-68 | Completion | Onboarding completion with celebration animation | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-ONB-009 | SRC-ARC-68 | Mobile Swipeable | Mobile-specific swipeable onboarding | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-ONB-010 | SRC-ARC-68 | Accessibility | 4 accessibility items: screen reader, focus management, contrast, motion reduction | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-ONB-011 | SRC-ARC-68 | Animations | 4 animation items: micro-interactions, transitions, progress, celebration | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-ONB-012 | SRC-ARC-10 | UX Enhancement | Onboarding UX improvements per enhancement plan | ACTIONABLE | Partial |
| EXT-ONB-013 | SRC-ARC-11 | Phase 1 Impl | Phase 1 onboarding implementation details | ACTIONABLE | Partial |
| EXT-ONB-014 | SRC-ARC-12 | Phase 2 Impl | Phase 2 onboarding implementation details | ACTIONABLE | NOT_IMPLEMENTED |

### TAX — Tax Domain (16 items)

| ItemID | SourceID | HeadingPath | NormalizedIntent | Status | Notes |
|--------|----------|-------------|-----------------|--------|-------|
| EXT-TAX-001 | SRC-ARC-71 | §1 Federal Tax | Federal tax calculation engine | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-TAX-002 | SRC-ARC-71 | §2 State Tax | State tax calculation (all 50 states) | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-TAX-003 | SRC-ARC-71 | §3 Retirement | Retirement optimization: 401(k), IRA, HSA | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-TAX-004 | SRC-ARC-71 | §4 OCR | Document OCR: W-2, 1099, 1098 (OpenAI/Google/LandingAI) | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-TAX-005 | SRC-ARC-71 | §5 Processing | Tax document processing pipeline | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-TAX-006 | SRC-ARC-71 | §6-9 Endpoints | 4 tax API endpoints | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-TAX-007 | SRC-ARC-71 | §10 Scenario | Tax scenario modeler (what-if analysis) | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-TAX-008 | SRC-ARC-71 | §11 Calendar | Tax deadline calendar with reminders | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-TAX-009 | SRC-ARC-72 | Disclaimers | Tax compliance: required disclaimers | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-TAX-010 | SRC-ARC-72 | Encryption | Tax data encryption at rest and in transit | ACTIONABLE | Partial — Supabase TLS exists |
| EXT-TAX-011 | SRC-ARC-72 | RLS | Tax table RLS policies | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-TAX-012 | SRC-ARC-72 | PII | Tax PII handling: SSN masking, secure storage | ACTIONABLE | Partial — PII masking exists |
| EXT-TAX-013 | SRC-ARC-72 | Audit | Tax audit logging for compliance | ACTIONABLE | Partial — audit service exists |
| EXT-TAX-014 | SRC-ARC-72 | Data Retention | Tax document retention policies (7-year minimum) | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-TAX-015 | SRC-ARC-72 | Testing | Tax module testing requirements | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-TAX-016 | SRC-ARC-01 | §8.1 Tax | Tax optimization module per master task list | ACTIONABLE | NOT_IMPLEMENTED |

### INF — Infrastructure Domain (22 items)

| ItemID | SourceID | HeadingPath | NormalizedIntent | Status | Notes |
|--------|----------|-------------|-----------------|--------|-------|
| EXT-INF-001 | SRC-ARC-73 | §1 DB Indexes | Database index optimization for query performance | ACTIONABLE | Partial — index migration exists |
| EXT-INF-002 | SRC-ARC-73 | §2 Stored Procedures | Stored procedures for complex financial calculations | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-INF-003 | SRC-ARC-73 | §3 Materialized Views | Materialized views for dashboard aggregations | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-INF-004 | SRC-ARC-73 | §4 Caching | Multi-layer caching: API, query, session | ACTIONABLE | Partial |
| EXT-INF-005 | SRC-ARC-73 | §5 React Query | React Query integration for client-side caching | ACTIONABLE | NOT_IMPLEMENTED for mobile |
| EXT-INF-006 | SRC-ARC-73 | §6 Bundle Splitting | Code splitting and lazy loading optimization | ACTIONABLE | Partial |
| EXT-INF-007 | SRC-ARC-73 | §7 Lazy Loading | Component-level lazy loading | ACTIONABLE | Partial |
| EXT-INF-008 | SRC-ARC-73 | §8 Performance Targets | Performance budgets: <200ms API, <3s page load, <100KB JS | ACTIONABLE | Monitoring needed |
| EXT-INF-009 | SRC-ARC-57 | TS Config | TypeScript configuration fixes per fix action plan | ACTIONABLE | Partial |
| EXT-INF-010 | SRC-ARC-57 | Duplicate Types | Resolve duplicate type definitions | ACTIONABLE | Partial |
| EXT-INF-011 | SRC-ARC-57 | Route Params | 10 route parameter type updates | ACTIONABLE | Partial |
| EXT-INF-012 | SRC-ARC-57 | Module Creation | Missing module file creation | ACTIONABLE | Partial |
| EXT-INF-013 | SRC-ARC-57 | Test Mocks | Test mock infrastructure fixes | ACTIONABLE | Partial |
| EXT-INF-014 | SRC-ARC-57 | Jest Config | Jest configuration updates | ACTIONABLE | Partial |
| EXT-INF-015 | SRC-ROOT-02 | Phase 0 Foundation | Foundation fixes: rebrand, Supabase client, env hardening | ACTIONABLE | Partial — rebrand done |
| EXT-INF-016 | SRC-ROOT-02 | Phase 5 Scale | Scale and polish: performance, monitoring, white-label | ACTIONABLE | Planning reference |
| EXT-INF-017 | SRC-ARC-24 | TD-01 | Tech debt: environment variable validation inconsistent | ACTIONABLE | Tech debt |
| EXT-INF-018 | SRC-ARC-24 | GAP-01 | Gap: CI/CD pipeline incomplete (missing deploy stage) | ACTIONABLE | Gap |
| EXT-INF-019 | SRC-ARC-24 | GAP-03 | Gap: monitoring/observability not configured | ACTIONABLE | Gap |
| EXT-INF-020 | SRC-ARC-24 | GAP-04 | Gap: error tracking (Sentry) not integrated | ACTIONABLE | Gap |
| EXT-INF-021 | SRC-ROOT-06 | PCTT Infrastructure | Fly.io trading service deployment | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-INF-022 | SRC-ARC-24 | GAP-06 | Gap: database backup/restore automation missing | ACTIONABLE | Gap |

### GMF — Gamification Domain (8 items)

| ItemID | SourceID | HeadingPath | NormalizedIntent | Status | Notes |
|--------|----------|-------------|-----------------|--------|-------|
| EXT-GMF-001 | SRC-ARC-69 | XP Rewards | XP reward system with 30 progression levels | ACTIONABLE | Partial — store exists |
| EXT-GMF-002 | SRC-ARC-69 | Badges | Achievement badge system with categories | ACTIONABLE | Partial |
| EXT-GMF-003 | SRC-ARC-69 | Leaderboards | Social leaderboards for financial milestones | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-GMF-004 | SRC-ARC-69 | Streaks | Daily action streaks with multipliers | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-GMF-005 | SRC-ARC-69 | Challenges | Timed financial challenges with rewards | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-GMF-006 | SRC-ARC-25 | Gamification Screens | Gamification screen inventory: dashboard, badges, leaderboard, challenges | ACTIONABLE | Partial — dashboard exists |
| EXT-GMF-007 | SRC-ARC-18 | Gamification Gap | Competitor parity: achievement tracking, social sharing | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-GMF-008 | SRC-ARC-01 | §9.1-9.2 Gamification | Gamification module: XP, badges, levels | ACTIONABLE | Partial |

### DOC — Documents Domain (6 items)

| ItemID | SourceID | HeadingPath | NormalizedIntent | Status | Notes |
|--------|----------|-------------|-----------------|--------|-------|
| EXT-DOC-001 | SRC-ARC-01 | §10.1 Upload | Document upload with S3 presigned URLs | ACTIONABLE | Partial — upload service exists |
| EXT-DOC-002 | SRC-ARC-01 | §10.2 Processing | Document processing and text extraction | ACTIONABLE | Partial — document service exists |
| EXT-DOC-003 | SRC-ARC-01 | §10.3 Categories | Document categorization and tagging | ACTIONABLE | Partial |
| EXT-DOC-004 | SRC-ARC-71 | Tax OCR | Tax document OCR with multiple providers | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-DOC-005 | SRC-ARC-06 | Mobile Documents | Mobile document viewer and upload | ACTIONABLE | Partial — documents route registered |
| EXT-DOC-006 | SRC-ARC-24 | GAP-09 | Gap: document search/filtering missing | ACTIONABLE | Gap |

### UI — UI/UX Domain (10 items)

| ItemID | SourceID | HeadingPath | NormalizedIntent | Status | Notes |
|--------|----------|-------------|-----------------|--------|-------|
| EXT-UI-001 | SRC-ROOT-03 | Design System | Design system: colors, typography, spacing, shadows | ACTIONABLE | Partial — theme hook exists |
| EXT-UI-002 | SRC-ROOT-03 | Component Specs | Component specifications for all UI elements | ACTIONABLE | Partial |
| EXT-UI-003 | SRC-ROOT-03 | Screen Layouts | Screen layout specifications | ACTIONABLE | Partial |
| EXT-UI-004 | SRC-ROOT-03 | Mobile Design | Mobile-specific design patterns | ACTIONABLE | Partial |
| EXT-UI-005 | SRC-ARC-18 | Dark Mode | Dark mode implementation across app | ACTIONABLE | Partial — theme toggle exists |
| EXT-UI-006 | SRC-ARC-18 | Onboarding UX | Onboarding screen redesigns | MERGED | Merged into EXT-ONB-* |
| EXT-UI-007 | SRC-ARC-19 | Dashboard UX | Dashboard layout improvements per competitor analysis | ACTIONABLE | Partial |
| EXT-UI-008 | SRC-ARC-25 | Screen Gaps | 41 missing screens identified in web inventory | ACTIONABLE | Gap tracking |
| EXT-UI-009 | SRC-ARC-20 | Chart Components | Spending visualization: donut, bar, trend, comparison charts | ACTIONABLE | Partial — some charts exist |
| EXT-UI-010 | SRC-ARC-24 | CON-09 | Conflict: design system tokens — resolved: Tailwind + custom theme | IGNORED | Decision |

### GLC — Global Connectors Domain (6 items)

| ItemID | SourceID | HeadingPath | NormalizedIntent | Status | Notes |
|--------|----------|-------------|-----------------|--------|-------|
| EXT-GLC-001 | SRC-ARC-05 | Phase 1 Data | Phase 1 data connectors: Plaid, credit bureaus | ACTIONABLE | Partial — Plaid exists |
| EXT-GLC-002 | SRC-ARC-05 | Phase 2 Commercial | Phase 2 commercial connectors: marketplace APIs | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-GLC-003 | SRC-ARC-05 | Phase 3 Payments | Phase 3 payment connectors: international payments | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-GLC-004 | SRC-ARC-05 | Multi-Region | Multi-region database support | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-GLC-005 | SRC-ARC-05 | DB Schemas | Global connector database schemas | ACTIONABLE | NOT_IMPLEMENTED |
| EXT-GLC-006 | SRC-ARC-05 | API Gateway | API gateway for international traffic routing | ACTIONABLE | NOT_IMPLEMENTED |

---

## Ignored Items Summary (65 total)

| Category | Count | Rationale |
|----------|-------|-----------|
| Decision Records (DEC-*, CON-* resolved) | 28 | Architectural decisions already made — tracked as reference, not tasks |
| Reference-Only Documents | 19 | User guides, API docs, indexes — no actionable implementation work |
| Completed Phase Reports | 12 | Phase completion reports — work already done |
| Superseded Items | 6 | Items replaced by newer versions in active SSOT |

---

## Statistics

| Metric | Value |
|--------|-------|
| Source documents processed | 35 of 107 (53 high-actionable + partial coverage of low-actionable) |
| Raw items extracted | 863 |
| Intra-batch duplicates removed | 155 |
| Cross-batch duplicates removed | 365 |
| **Unique items after dedup** | **343** |
| Items marked ACTIONABLE | 278 |
| Items marked IGNORED (decisions/reference) | 53 |
| Items marked MERGED (into other items) | 12 |
| Domains covered | 17 |
| Largest domain | FIN (52 items) |
| Smallest domain | DOC (6 items) |

---

*Generated for MERGE LOCK compliance. Every actionable item from every source document is cataloged above.*
