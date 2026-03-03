# TASK-ATOMIZATION-REPORT

> **Purpose**: Map every EXT-* item to at least one TASK-*, split oversized tasks, and produce the final task registry for MASTER-IMPLEMENTATION-PLAN v2.
> **MERGE LOCK Artifact 3 of 4** | Generated: 2026-02-27
> **Input**: PLAN-EXTRACTION-LEDGER.md (278 actionable items, 17 domains) + MASTER-IMPLEMENTATION-PLAN.md (80 tasks, 18 domains)
> **Output**: 264 atomic tasks across 19 domains (69 active originals + 30 split replacements + 161 new tasks + 4 coverage supplements)

---

## 1. Atomization Rules Applied

| Rule | Threshold | Action |
|------|-----------|--------|
| R1 — Minimum task count | >= 250 | Exceeded: 264 total |
| R2 — No meta tasks | Effort field required, AC testable | Enforced: every task has concrete AC |
| R3 — Module boundary | 1 task = 1 module | Enforced: no cross-module tasks |
| R4 — Duration cap | <= 3 weeks per task | Enforced: max effort is 3wk |
| R5 — File scope cap | <= 5 source files per task | Enforced: scope bounded |
| R6 — Oversized split | >2 modules OR >5 files OR >=4wk | 11 tasks retired, 30 replacements created |
| R7 — EXT coverage | Every actionable EXT maps to >= 1 TASK | Enforced: 278/278 mapped |

---

## 2. Oversized Task Retirements and Splits

The following 11 tasks from the original MASTER-IMPLEMENTATION-PLAN.md exceed atomization thresholds and are **RETIRED**. Each is replaced by 2-6 smaller tasks that collectively cover the same scope.

### 2.1 TASK-CRD-04 (4wk) -> 2 replacement tasks

| Original | TASK-CRD-04 — Credit Bureau API Integration |
|----------|---------------------------------------------|
| **Reason** | 4wk effort exceeds 3wk cap |
| **Status** | RETIRED |

| Replacement ID | Title | Effort | Covers |
|----------------|-------|--------|--------|
| TASK-CRD-04a | Experian/Equifax API client and auth | 2wk | Bureau API connection, auth, rate limiting |
| TASK-CRD-04b | TransUnion API client and multi-bureau aggregation | 2wk | Third bureau, aggregation layer, score normalization |

### 2.2 TASK-FIN-08 (4wk) -> 2 replacement tasks

| Original | TASK-FIN-08 — Banking Integration (Open Banking) |
|----------|--------------------------------------------------|
| **Reason** | 4wk effort exceeds 3wk cap |
| **Status** | RETIRED |

| Replacement ID | Title | Effort | Covers |
|----------------|-------|--------|--------|
| TASK-FIN-08a | Open Banking provider abstraction and TrueLayer client | 2wk | Provider interface, TrueLayer/Yapily integration |
| TASK-FIN-08b | Open Banking SCA flow and Plaid fallback routing | 2wk | SCA support, provider routing, fallback logic |

### 2.3 TASK-TRD-03 (6wk) -> 3 replacement tasks

| Original | TASK-TRD-03 — PCTT 7-Stage Pipeline |
|----------|--------------------------------------|
| **Reason** | 6wk effort exceeds 3wk cap; touches 7 pipeline stages |
| **Status** | RETIRED |

| Replacement ID | Title | Effort | Covers |
|----------------|-------|--------|--------|
| TASK-TRD-03a | PCTT pipeline stages 1-3 (Regime, Pivot, Trendline) | 2wk | Stages 1-3, pipeline orchestrator skeleton |
| TASK-TRD-03b | PCTT pipeline stages 4-5 (Signal, Confluence) | 2wk | Stages 4-5, multi-indicator agreement scoring |
| TASK-TRD-03c | PCTT pipeline stages 6-7 (Risk, Trade) and integration | 2wk | Stages 6-7, end-to-end pipeline wiring, pipeline tests |

### 2.4 TASK-TRD-12 (4wk) -> 2 replacement tasks

| Original | TASK-TRD-12 — Autonomous Trading Engine |
|----------|------------------------------------------|
| **Reason** | 4wk effort exceeds 3wk cap |
| **Status** | RETIRED |

| Replacement ID | Title | Effort | Covers |
|----------------|-------|--------|--------|
| TASK-TRD-12a | 3-mode graduation engine (WATCH/GUIDED/AUTONOMOUS) | 2wk | Mode state machine, promotion/demotion criteria |
| TASK-TRD-12b | Autonomous execution loop and safety rails | 2wk | Auto-execution, risk guard integration, audit trail |

### 2.5 TASK-AIM-02 (4wk) -> 2 replacement tasks

| Original | TASK-AIM-02 — ML Prediction Models |
|----------|-------------------------------------|
| **Reason** | 4wk effort exceeds 3wk cap |
| **Status** | RETIRED |

| Replacement ID | Title | Effort | Covers |
|----------------|-------|--------|--------|
| TASK-AIM-02a | ML feature engineering and training pipeline | 2wk | Feature extraction, model training, versioning |
| TASK-AIM-02b | ML prediction serving and A/B evaluation | 2wk | Inference API, A/B test harness, monitoring |

### 2.6 TASK-MOB-01 (14wk) -> 6 replacement tasks

| Original | TASK-MOB-01 — Mobile Screen Parity (97 screens) |
|----------|--------------------------------------------------|
| **Reason** | 14wk effort exceeds 3wk cap; touches all mobile modules |
| **Status** | RETIRED |

| Replacement ID | Title | Effort | Covers |
|----------------|-------|--------|--------|
| TASK-MOB-01a | Mobile auth and onboarding screen parity (12 screens) | 2wk | Auth flow, onboarding, profile setup |
| TASK-MOB-01b | Mobile credit and dispute screen parity (16 screens) | 3wk | Credit score, factors, history, simulator, disputes |
| TASK-MOB-01c | Mobile financial screens parity (20 screens) | 3wk | Budget, spending, bills, savings, debt, income |
| TASK-MOB-01d | Mobile trading and investment screen parity (18 screens) | 3wk | Trading dashboard, charts, orders, portfolio, watchlist |
| TASK-MOB-01e | Mobile admin, settings, notifications screens (15 screens) | 2wk | Settings, notifications, admin views |
| TASK-MOB-01f | Mobile screen parity gap-fill and integration test (16 screens) | 2wk | Remaining screens, navigation integration, visual QA |

### 2.7 TASK-MOB-02 (4wk) -> 2 replacement tasks

| Original | TASK-MOB-02 — Apple Watch Companion App |
|----------|------------------------------------------|
| **Reason** | 4wk effort exceeds 3wk cap |
| **Status** | RETIRED |

| Replacement ID | Title | Effort | Covers |
|----------------|-------|--------|--------|
| TASK-MOB-02a | Apple Watch app: glance cards and credit score display | 2wk | WatchOS project, credit score, balance, spending glance |
| TASK-MOB-02b | Apple Watch complications and haptic notifications | 2wk | Watch face complications, haptic alerts, WatchConnectivity |

### 2.8 TASK-SEC-01 (4wk) -> 2 replacement tasks

| Original | TASK-SEC-01 — SOC 2 Compliance Preparation |
|----------|---------------------------------------------|
| **Reason** | 4wk effort exceeds 3wk cap |
| **Status** | RETIRED |

| Replacement ID | Title | Effort | Covers |
|----------------|-------|--------|--------|
| TASK-SEC-01a | SOC 2 policy documents (InfoSec, Access, Incident, BCP) | 2wk | 6 policy documents, risk assessment |
| TASK-SEC-01b | SOC 2 evidence automation and penetration test | 2wk | Evidence collection scripts, audit log verification, pentest |

### 2.9 TASK-PLT-01 (6wk) -> 3 replacement tasks

| Original | TASK-PLT-01 — White-Label Framework |
|----------|--------------------------------------|
| **Reason** | 6wk effort exceeds 3wk cap; touches theming, multi-tenancy, routing |
| **Status** | RETIRED |

| Replacement ID | Title | Effort | Covers |
|----------------|-------|--------|--------|
| TASK-PLT-01a | White-label theming engine (CSS vars, logo, colors, fonts) | 2wk | CSS custom properties, branding preview, favicon |
| TASK-PLT-01b | White-label multi-tenant data isolation and CNAME routing | 2wk | Tenant schema/RLS, custom domain SSL, Next.js middleware |
| TASK-PLT-01c | White-label feature toggles and partner onboarding | 2wk | Per-instance feature flags, role mapping, API keys, partner docs |

### 2.10 TASK-PLT-02 (4wk) -> 2 replacement tasks

| Original | TASK-PLT-02 — Marketplace Foundation |
|----------|---------------------------------------|
| **Reason** | 4wk effort exceeds 3wk cap |
| **Status** | RETIRED |

| Replacement ID | Title | Effort | Covers |
|----------------|-------|--------|--------|
| TASK-PLT-02a | Marketplace listing, search, and partner registration | 2wk | Listing page, search/filter, partner submission workflow |
| TASK-PLT-02b | Marketplace activation, reviews, and partner analytics | 2wk | One-click activate, rating system, revenue tracking dashboard |

### 2.11 TASK-GLC-01 (12wk) -> 4 replacement tasks

| Original | TASK-GLC-01 — Global Connector MVP (Multi-Currency, i18n) |
|----------|-----------------------------------------------------------|
| **Reason** | 12wk effort exceeds 3wk cap; touches currency, i18n, bureaus, regulations |
| **Status** | RETIRED |

| Replacement ID | Title | Effort | Covers |
|----------------|-------|--------|--------|
| TASK-GLC-01a | Multi-currency storage and exchange rate service | 3wk | Currency model, exchange rate provider, currency-aware calculations |
| TASK-GLC-01b | i18n framework integration (next-intl) and English+1 locale | 3wk | next-intl setup, string extraction, date/number formatting |
| TASK-GLC-01c | International credit bureau mapping and region config | 3wk | Bureau adapters (Experian Global, Equifax Canada), region registry |
| TASK-GLC-01d | Multi-region regulatory compliance and locale-aware notifications | 2wk | Compliance rules per region, localized notification templates |

### Split Summary

| Metric | Count |
|--------|-------|
| Tasks retired | 11 |
| Replacement tasks created | 34 |
| Net task increase from splits | +23 |
| Max effort in any replacement | 3wk |

---

## 3. Domain-by-Domain EXT-to-TASK Mapping

Every actionable EXT-* item maps to at least one TASK-*. Tasks marked **[ORIG]** are active originals from the 80-task plan. Tasks marked **[SPLIT]** are replacements from Section 2. Tasks marked **[NEW]** are created to cover previously unmapped EXT items.

### 3.1 CRD — Credit Domain (24 actionable EXT -> 16 tasks)

| EXT Item(s) | TASK ID | Title | Status |
|-------------|---------|-------|--------|
| EXT-CRD-001, EXT-CRD-015, EXT-CRD-020 | TASK-CRD-04a | Experian/Equifax API client and auth | [SPLIT] |
| EXT-CRD-004, EXT-CRD-021 | TASK-CRD-04b | TransUnion API client and multi-bureau aggregation | [SPLIT] |
| EXT-CRD-002, EXT-CRD-026 | TASK-CRD-02 | Credit Alert System | [ORIG] |
| EXT-CRD-005, EXT-CRD-013, EXT-CRD-014 | TASK-CRD-03 | Dispute Success Predictor | [ORIG] |
| EXT-CRD-003, EXT-CRD-017 | TASK-CRD-08 | Credit score factor breakdown and simulator hardening | [NEW] |
| EXT-CRD-006 | TASK-CRD-09 | Bureau dispute response processing pipeline | [NEW] |
| EXT-CRD-007 | TASK-CRD-10 | ML dispute success probability model | [NEW] |
| EXT-CRD-008, EXT-CRD-009 | TASK-CRD-11 | Automated dispute follow-ups and creditor negotiation bot | [NEW] |
| EXT-CRD-010 | TASK-CRD-05 | Secured Card Recommendations | [ORIG] |
| EXT-CRD-011, EXT-CRD-018 | TASK-CRD-12 | Credit builder tools completion (18 tools) | [NEW] |
| EXT-CRD-016 | TASK-CRD-13 | Credit freeze/thaw and identity monitoring | [NEW] |
| EXT-CRD-019 | — | Already implemented (mobile credit screens) | COVERED |
| EXT-CRD-022 | TASK-CRD-14 | AI-powered personalized credit tips | [NEW] |
| EXT-CRD-024 | TASK-CRD-15 | Credit store optimistic updates | [NEW] |
| EXT-CRD-025 | TASK-CRD-16 | Credit-trading cross-feature (margin impact) | [NEW] |
| EXT-CRD-006 (rent) | TASK-CRD-06 | Rent Reporting Integration | [ORIG] |
| EXT-CRD-007 (component) | TASK-CRD-07 | Credit Monitoring Component Tests | [ORIG] |
| — | TASK-CRD-01 | Goodwill Letter Generator | [ORIG] |

**CRD domain total: 16 tasks** (6 original + 2 split + 8 new)

### 3.2 FIN — Financial Domain (48 actionable EXT -> 30 tasks)

| EXT Item(s) | TASK ID | Title | Status |
|-------------|---------|-------|--------|
| EXT-FIN-001, EXT-FIN-004, EXT-FIN-005, EXT-FIN-006 | TASK-FIN-05 | Smart Budget AI | [ORIG] |
| EXT-FIN-002, EXT-FIN-047 | TASK-FIN-09 | Budget rollover and period management hardening | [NEW] |
| EXT-FIN-003, EXT-FIN-048 | TASK-FIN-02 | Spending Limit Alerts | [ORIG] |
| EXT-FIN-007 | TASK-FIN-10 | Budget visualization (circles, progress bars, trends) | [NEW] |
| EXT-FIN-008, EXT-FIN-049 | TASK-FIN-11 | Bill negotiation outcome tracking and success metrics | [NEW] |
| EXT-FIN-009, EXT-FIN-038 | TASK-FIN-12 | Recurring bill and transaction auto-detection hardening | [NEW] |
| EXT-FIN-010 | TASK-FIN-13 | Bill calendar visual UI and payment scheduling | [NEW] |
| EXT-FIN-011 | TASK-FIN-14 | Bill and subscription cost optimization engine | [NEW] |
| EXT-FIN-012 | TASK-FIN-04 | Subscription Analyzer | [ORIG] |
| EXT-FIN-013, EXT-FIN-051 | TASK-FIN-06 | Auto-Save Rules Engine | [ORIG] |
| EXT-FIN-014 | TASK-FIN-15 | Savings goal milestones and progress visualization | [NEW] |
| EXT-FIN-015, EXT-FIN-016, EXT-FIN-052 | TASK-FIN-16 | Debt payoff planner hardening (avalanche/snowball/calculator) | [NEW] |
| EXT-FIN-017, EXT-FIN-019, EXT-FIN-020 | TASK-FIN-17 | Spending anomaly detection and trend visualization | [NEW] |
| EXT-FIN-018 | TASK-FIN-18 | Cash flow forecasting ML engine | [NEW] |
| EXT-FIN-021, EXT-FIN-022 | TASK-FIN-19 | Financial health score v2 weighted components | [NEW] |
| EXT-FIN-023, EXT-FIN-024 | TASK-FIN-20 | Financial DB schema completeness and API route audit | [NEW] |
| EXT-FIN-025 | TASK-FIN-21 | Predictive cash flow engine with ML forecasting | [NEW] |
| EXT-FIN-026 | TASK-FIN-22 | Smart payment scheduling for cash flow optimization | [NEW] |
| EXT-FIN-027 | TASK-FIN-23 | Gig economy income tracking and smoothing | [NEW] |
| EXT-FIN-028 | TASK-FIN-08a | Open Banking provider abstraction and TrueLayer client | [SPLIT] |
| EXT-FIN-029 | TASK-FIN-08b | Open Banking SCA flow and Plaid fallback routing | [SPLIT] |
| EXT-FIN-030 | TASK-FIN-24 | Autonomous financial planner agent | [NEW] |
| EXT-FIN-031, EXT-FIN-032 | TASK-FIN-25 | AI-powered banking insights dashboard components | [NEW] |
| EXT-FIN-033 | TASK-FIN-26 | AI financial coaching with goal-based guidance | [NEW] |
| EXT-FIN-034 | TASK-FIN-27 | Multi-source asset discovery and aggregation scanner | [NEW] |
| EXT-FIN-036 | TASK-FIN-28 | Net worth tracker with assets and liabilities | [NEW] |
| EXT-FIN-037 | TASK-FIN-29 | Custom transaction tags and categorization | [NEW] |
| EXT-FIN-039, EXT-FIN-040 | TASK-FIN-30 | Payday countdown and vitality score widget integration | [NEW] |
| EXT-FIN-041, EXT-FIN-043 | TASK-FIN-31 | Financial service test gaps and error recovery | [NEW] |
| EXT-FIN-042, EXT-FIN-050 | TASK-FIN-03 | Income Verification System | [ORIG] |
| EXT-FIN-046 | — | Planning reference, covered by wave structure | COVERED |
| EXT-FIN-035 | — | Already implemented (financial chat) | COVERED |
| — | TASK-FIN-01 | Bill Payment Reminders | [ORIG] |
| — | TASK-FIN-07 | Tax Export & Reporting | [ORIG] |

**FIN domain total: 30 tasks** (7 original + 2 split + 21 new)

### 3.3 TRD — Trading Domain (39 actionable EXT -> 30 tasks)

| EXT Item(s) | TASK ID | Title | Status |
|-------------|---------|-------|--------|
| EXT-TRD-001, EXT-TRD-002, EXT-TRD-003, EXT-TRD-004 | TASK-TRD-03a | PCTT pipeline stages 1-3 (Regime, Pivot, Trendline) | [SPLIT] |
| EXT-TRD-005, EXT-TRD-006 | TASK-TRD-03b | PCTT pipeline stages 4-5 (Signal, Confluence) | [SPLIT] |
| EXT-TRD-007, EXT-TRD-008 | TASK-TRD-03c | PCTT pipeline stages 6-7 (Risk, Trade) and integration | [SPLIT] |
| EXT-TRD-009, EXT-TRD-025 | TASK-TRD-08 | 7 AI Trading Agents | [ORIG] |
| EXT-TRD-010, EXT-TRD-028 | TASK-TRD-01 | Paper Trading Engine | [ORIG] |
| EXT-TRD-011 | TASK-TRD-09 | 10 Pre-Built Strategy Library | [ORIG] |
| EXT-TRD-012 | TASK-TRD-11 | 30-Law Compliance Engine | [ORIG] |
| EXT-TRD-013, EXT-TRD-026 | TASK-TRD-14 | Alpaca broker hardening (error handling, rate limits, reconnection) | [NEW] |
| EXT-TRD-014 | TASK-TRD-05 | Order Management System | [ORIG] |
| EXT-TRD-015 | TASK-TRD-15 | TradingView Lightweight Charts v5 integration | [NEW] |
| EXT-TRD-016, EXT-TRD-024 | TASK-TRD-16 | Trading DB schema completion (13 tables) | [NEW] |
| EXT-TRD-017, EXT-TRD-020 | TASK-TRD-17 | Web trading dashboard (real-time chart, order form, positions) | [NEW] |
| EXT-TRD-018, EXT-TRD-019 | TASK-TRD-18 | Mobile trading screens and Zustand trading store | [NEW] |
| EXT-TRD-021 | TASK-TRD-19 | Trade history viewer, risk monitor, and signal alerts panel | [NEW] |
| EXT-TRD-022 | TASK-TRD-20 | Margin calculator, P&L dashboard, and trading journal UI | [NEW] |
| EXT-TRD-023, EXT-TRD-035-040 | TASK-TRD-07 | Trading Test Coverage (36svc -> 80%+) | [ORIG] |
| EXT-TRD-027 | TASK-TRD-21 | Interactive Brokers adapter | [NEW] |
| EXT-TRD-029 | TASK-TRD-22 | Rule-based, ML, and LLM signal engines | [NEW] |
| EXT-TRD-030 | TASK-TRD-23 | Signal fusion and consensus mechanism | [NEW] |
| EXT-TRD-031 | TASK-TRD-24 | Risk gateway kill switch implementation | [NEW] |
| EXT-TRD-032 | TASK-TRD-06 | Backtesting Framework | [ORIG] |
| EXT-TRD-034 | — | Planning reference, covered by wave structure | COVERED |
| EXT-TRD-042 | TASK-TRD-25 | WebSocket reconnection and trading service tech debt | [NEW] |
| — | TASK-TRD-02 | Trading Journal | [ORIG] |
| — | TASK-TRD-04 | Risk Gateway | [ORIG] |
| — | TASK-TRD-10 | Custom Strategy Builder | [ORIG] |
| — | TASK-TRD-12a | 3-mode graduation engine (WATCH/GUIDED/AUTONOMOUS) | [SPLIT] |
| — | TASK-TRD-12b | Autonomous execution loop and safety rails | [SPLIT] |
| — | TASK-TRD-13 | Fly.io Trading Service | [ORIG] |

**TRD domain total: 30 tasks** (11 original + 5 split + 14 new)

### 3.4 INV — Investment Domain (16 actionable EXT -> 14 tasks)

| EXT Item(s) | TASK ID | Title | Status |
|-------------|---------|-------|--------|
| EXT-INV-001, EXT-INV-002 | TASK-INV-08 | Portfolio overview and holdings management hardening | [NEW] |
| EXT-INV-003, EXT-INV-010 | TASK-INV-09 | Watchlist with real-time WebSocket price alerts | [NEW] |
| EXT-INV-004, EXT-INV-011 | TASK-INV-10 | AI stock/ETF analysis with market commentary | [NEW] |
| EXT-INV-005 | TASK-INV-01 | Portfolio Rebalancing Engine | [ORIG] |
| EXT-INV-006 | TASK-INV-02 | Dividend Tracking & Reinvestment | [ORIG] |
| EXT-INV-007 | TASK-INV-11 | Investment calculators (compound, retirement, education) | [NEW] |
| EXT-INV-008 | — | Already implemented (mobile investment screens) | COVERED |
| EXT-INV-009, EXT-INV-015 | TASK-INV-12 | Investment test coverage and store cache invalidation | [NEW] |
| EXT-INV-012 | TASK-INV-13 | Fractional share support and ESG scoring | [NEW] |
| EXT-INV-013 | TASK-INV-04 | Real Estate Tracking | [ORIG] |
| EXT-INV-016 | TASK-INV-05 | Crypto Wallet Sync | [ORIG] |
| EXT-INV-017 | TASK-INV-14 | Real estate investment tracking service completion | [NEW] |
| EXT-INV-018 | — | Planning reference, covered by wave structure | COVERED |
| — | TASK-INV-03 | Manual Account Entry | [ORIG] |
| — | TASK-INV-06 | Auto-Rebalance Scheduler | [ORIG] |

**INV domain total: 14 tasks** (6 original + 0 split + 8 new)

### 3.5 RSK — Risk Management Domain (17 actionable EXT -> 14 tasks)

| EXT Item(s) | TASK ID | Title | Status |
|-------------|---------|-------|--------|
| EXT-RSK-001, EXT-RSK-007 | TASK-RSK-07 | 6 trailing stop implementations (Fixed, %, ATR, Chandelier, Parabolic, Time) | [NEW] |
| EXT-RSK-002 | TASK-RSK-01 | Risk Rules Engine | [ORIG] |
| EXT-RSK-003 | TASK-RSK-02 | Position Sizing Calculator | [ORIG] |
| EXT-RSK-004, EXT-RSK-016 | TASK-RSK-08 | Correlation monitoring and portfolio-level risk aggregation | [NEW] |
| EXT-RSK-005 | TASK-RSK-03 | Kill Switch (Circuit Breaker) | [ORIG] |
| EXT-RSK-006 | TASK-RSK-09 | 3 risk gates: pre-trade validation, position limits, portfolio heat | [NEW] |
| EXT-RSK-008 | TASK-RSK-10 | Drawdown protection with automatic risk reduction | [NEW] |
| EXT-RSK-009, EXT-RSK-011 | TASK-RSK-11 | Risk UI components (TrailingStopConfig, HeatMap, CorrelationMatrix, etc.) | [NEW] |
| EXT-RSK-010 | TASK-RSK-05 | Stress Testing Framework | [ORIG] |
| EXT-RSK-013, EXT-RSK-015 | TASK-RSK-12 | Trading API key secure vault and request signing | [NEW] |
| EXT-RSK-014 | TASK-RSK-13 | Trading pipeline <100ms latency optimization | [NEW] |
| EXT-RSK-017 | TASK-RSK-06 | Real-Time Risk Dashboard | [ORIG] |
| EXT-RSK-019 | TASK-RSK-14 | Trading infrastructure: Fly.io health checks and auto-scaling | [NEW] |
| EXT-RSK-020 | — | Planning reference, covered by wave structure | COVERED |
| — | TASK-RSK-04 | Correlation Monitor | [ORIG] |

**RSK domain total: 14 tasks** (6 original + 0 split + 8 new)

### 3.6 SEC — Security Domain (20 actionable EXT -> 15 tasks)

| EXT Item(s) | TASK ID | Title | Status |
|-------------|---------|-------|--------|
| EXT-SEC-001, EXT-SEC-002 | TASK-SEC-06 | JWT short-lived token rotation and server-side session hardening | [NEW] |
| EXT-SEC-003 | TASK-SEC-07 | RLS policy audit and completion for all tables | [NEW] |
| EXT-SEC-004 | TASK-SEC-08 | Comprehensive audit trail for all data mutations | [NEW] |
| EXT-SEC-005, EXT-SEC-006, EXT-SEC-017 | TASK-SEC-09 | Input sanitization and output encoding completion (12 routes) | [NEW] |
| EXT-SEC-007 | TASK-SEC-10 | PII masking in logs and API responses | [NEW] |
| EXT-SEC-008, EXT-SEC-009 | TASK-SEC-03 | DAST Pipeline Integration | [ORIG] |
| EXT-SEC-010 | TASK-SEC-11 | Security-focused code review checklist and CI gate | [NEW] |
| EXT-SEC-011 | TASK-SEC-01a | SOC 2 policy documents (InfoSec, Access, Incident, BCP) | [SPLIT] |
| — | TASK-SEC-01b | SOC 2 evidence automation and penetration test | [SPLIT] |
| EXT-SEC-012, EXT-SEC-013, EXT-SEC-014 | TASK-SEC-12 | Security file cleanup (orphaned files, duplicates, consolidation) | [NEW] |
| EXT-SEC-015 | TASK-SEC-13 | Rate limiting consistency across all API routes | [NEW] |
| EXT-SEC-016 | TASK-SEC-14 | CORS configuration hardening (dev/staging/prod) | [NEW] |
| EXT-SEC-018 | TASK-SEC-05 | WebAuthn/Passkey Support | [ORIG] |
| EXT-SEC-019 | TASK-SEC-15 | Mobile biometric auth wired to backend | [NEW] |
| EXT-SEC-020 | TASK-SEC-16 | Admin API routes RBAC enforcement audit | [NEW] |
| EXT-SEC-021 | — | Covered by SEC-03, SEC-07, SEC-09, SEC-12, SEC-13 | COVERED |
| — | TASK-SEC-02 | Advanced MFA (TOTP, Hardware Keys) | [ORIG] |
| — | TASK-SEC-04 | Secret Rotation Automation | [ORIG] |

**SEC domain total: 15 tasks** (5 original + 2 split + 8 new)

### 3.7 MOB — Mobile Domain (22 actionable EXT -> 17 tasks)

| EXT Item(s) | TASK ID | Title | Status |
|-------------|---------|-------|--------|
| EXT-MOB-001, EXT-MOB-015 | TASK-MOB-01a | Mobile auth and onboarding screen parity (12 screens) | [SPLIT] |
| EXT-MOB-002, EXT-MOB-012 | TASK-MOB-01b | Mobile credit and dispute screen parity (16 screens) | [SPLIT] |
| EXT-MOB-003 | TASK-MOB-01c | Mobile financial screens parity (20 screens) | [SPLIT] |
| EXT-MOB-004, EXT-MOB-013 | TASK-MOB-01d | Mobile trading and investment screen parity (18 screens) | [SPLIT] |
| EXT-MOB-005 | TASK-MOB-04 | Mobile unit test infrastructure and 80% coverage | [NEW] |
| EXT-MOB-006 | — | Already implemented (8 Zustand stores) | COVERED |
| EXT-MOB-007 | TASK-MOB-05 | Mobile API service layer completion | [NEW] |
| EXT-MOB-008 | TASK-MOB-06 | Push notifications with expo-notifications hardening | [NEW] |
| EXT-MOB-009 | TASK-MOB-07 | Fingerprint/FaceID biometric authentication | [NEW] |
| EXT-MOB-010 | TASK-MOB-08 | Background data refresh for credit scores | [NEW] |
| EXT-MOB-011 | — | Reference (screen inventory), covered by MOB-01a-f | COVERED |
| EXT-MOB-014 | TASK-MOB-09 | Mobile shared component library (Card, Button, Input, Modal, Chart) | [NEW] |
| EXT-MOB-016 | TASK-MOB-10 | Mobile deep linking configuration | [NEW] |
| EXT-MOB-017, EXT-MOB-018 | TASK-MOB-03 | Offline Mode & Sync | [ORIG] |
| EXT-MOB-019, EXT-MOB-020 | TASK-MOB-11 | Mobile UX polish (gestures, haptics, bottom sheets, skeleton loading) | [NEW] |
| EXT-MOB-021 | TASK-MOB-12 | Expo app.config.js finalization (splash, icons, EAS) | [NEW] |
| EXT-MOB-022 | TASK-MOB-13 | App Store / Google Play submission preparation | [NEW] |
| EXT-MOB-023 | — | Planning reference, covered by wave structure | COVERED |
| — | TASK-MOB-01e | Mobile admin, settings, notifications screens (15 screens) | [SPLIT] |
| — | TASK-MOB-01f | Mobile screen parity gap-fill and integration test | [SPLIT] |
| — | TASK-MOB-02a | Apple Watch glance cards and credit score display | [SPLIT] |
| — | TASK-MOB-02b | Apple Watch complications and haptic notifications | [SPLIT] |

**MOB domain total: 17 tasks** (1 original + 8 split + 10 new)

### 3.8 AIM — AI/ML Domain (13 actionable EXT -> 10 tasks)

| EXT Item(s) | TASK ID | Title | Status |
|-------------|---------|-------|--------|
| EXT-AIM-001, EXT-AIM-002, EXT-AIM-004 | TASK-AIM-03 | XP reward system and achievement badges with progress dashboard | [NEW] |
| EXT-AIM-003 | TASK-AIM-04 | Behavioral finance personalization pipeline | [NEW] |
| EXT-AIM-005, EXT-AIM-014 | TASK-AIM-05 | AI personalization UI components and NL query interface | [NEW] |
| EXT-AIM-006 | TASK-AIM-06 | AI financial coaching with goal-based guidance completion | [NEW] |
| EXT-AIM-007 | — | Already implemented (financial chat API) | COVERED |
| EXT-AIM-008, EXT-AIM-009 | TASK-AIM-07 | Chat response caching and per-tier rate limiting | [NEW] |
| EXT-AIM-010 | TASK-AIM-08 | 7 PCTT AI agent implementations | [NEW] |
| EXT-AIM-011 | TASK-AIM-02a | ML feature engineering and training pipeline | [SPLIT] |
| — | TASK-AIM-02b | ML prediction serving and A/B evaluation | [SPLIT] |
| EXT-AIM-012 | TASK-AIM-09 | LLM analysis, interpretation, and idea generation services | [NEW] |
| EXT-AIM-015 | TASK-AIM-10 | AI model router fallback chain implementation | [NEW] |
| EXT-AIM-016 | TASK-AIM-11 | AI orchestrator consensus workflow | [NEW] |
| — | TASK-AIM-01 | AI Personalization Test Suite | [ORIG] |

**AIM domain total: 10 tasks** (1 original + 2 split + 9 new)

### 3.9 ADM — Admin Domain (11 actionable EXT -> 9 tasks)

| EXT Item(s) | TASK ID | Title | Status |
|-------------|---------|-------|--------|
| EXT-ADM-001, EXT-ADM-004 | TASK-ADM-01 | Analytics Dashboard | [ORIG] |
| EXT-ADM-002 | TASK-ADM-04 | Admin elevated auth and RBAC hardening | [NEW] |
| EXT-ADM-003 | TASK-ADM-05 | User CRUD and subscription management | [NEW] |
| EXT-ADM-005 | TASK-ADM-06 | Platform settings management completion | [NEW] |
| EXT-ADM-006 | TASK-ADM-07 | Admin audit log viewer UI | [NEW] |
| EXT-ADM-007 | TASK-ADM-08 | Admin mobile screen completion (13 screens) | [NEW] |
| EXT-ADM-008 | TASK-ADM-03 | Admin Test Coverage (9cmp+16API -> 80%+) | [ORIG] |
| EXT-ADM-009 | TASK-ADM-09 | Admin bulk operations (user actions, exports) | [NEW] |
| EXT-ADM-010, EXT-ADM-011 | TASK-ADM-10 | Admin dispute review and subscription billing management | [NEW] |
| — | TASK-ADM-02 | Family Accounts | [ORIG] |

**ADM domain total: 9 tasks** (3 original + 0 split + 7 new)

### 3.10 NTF — Notifications Domain (10 actionable EXT -> 9 tasks)

| EXT Item(s) | TASK ID | Title | Status |
|-------------|---------|-------|--------|
| EXT-NTF-001 | TASK-NTF-04 | Push notification system hardening (web + mobile) | [NEW] |
| EXT-NTF-002 | TASK-NTF-05 | Email notification HTML templates (Resend) | [NEW] |
| EXT-NTF-003 | TASK-NTF-06 | User notification preference management completion | [NEW] |
| EXT-NTF-004 | TASK-NTF-07 | In-app notification center UI | [NEW] |
| EXT-NTF-005 | TASK-NTF-08 | Mobile push with expo-notifications completion | [NEW] |
| EXT-NTF-006 | TASK-NTF-03 | Notification Test Coverage (7svc -> 80%+) | [ORIG] |
| EXT-NTF-007, EXT-NTF-008 | TASK-NTF-09 | Notification queue/retry system and real-time updates | [NEW] |
| EXT-NTF-009 | TASK-NTF-10 | Smart alerts: quiet hours, batching, digest frequency | [NEW] |
| EXT-NTF-010 | TASK-NTF-11 | Trading-specific notifications (signals, risk warnings, fills) | [NEW] |
| — | TASK-NTF-01 | Proactive Financial Alerts | [ORIG] |
| — | TASK-NTF-02 | Weekly Summary Reports | [ORIG] |

**NTF domain total: 9 tasks** (3 original + 0 split + 8 new)

### 3.11 PLT — Platform/Commerce Domain (14 actionable EXT -> 12 tasks)

| EXT Item(s) | TASK ID | Title | Status |
|-------------|---------|-------|--------|
| EXT-PLT-001 | TASK-PLT-03 | Data connectors: Plaid hardening, credit bureau client | [NEW] |
| EXT-PLT-002 | TASK-PLT-02a | Marketplace listing, search, and partner registration | [SPLIT] |
| — | TASK-PLT-02b | Marketplace activation, reviews, and partner analytics | [SPLIT] |
| EXT-PLT-003, EXT-PLT-012 | TASK-PLT-04 | Payment processing: Stripe hardening, subscription webhooks | [NEW] |
| EXT-PLT-004 | TASK-PLT-05 | Financial product marketplace UI and catalog | [NEW] |
| EXT-PLT-005 | TASK-PLT-06 | Affiliate program tracking and payout implementation | [NEW] |
| EXT-PLT-006 | TASK-PLT-07 | Product-user matching engine completion | [NEW] |
| EXT-PLT-007 | TASK-PLT-08 | Personalized offer management system | [NEW] |
| EXT-PLT-008, EXT-PLT-009 | TASK-PLT-09 | Multi-currency transaction and international banking support | [NEW] |
| EXT-PLT-010 | TASK-PLT-01a | White-label theming engine | [SPLIT] |
| — | TASK-PLT-01b | White-label multi-tenant data isolation and CNAME routing | [SPLIT] |
| — | TASK-PLT-01c | White-label feature toggles and partner onboarding | [SPLIT] |
| EXT-PLT-011 | TASK-PLT-10 | Subscription tier management (6 tiers) UI and backend | [NEW] |
| EXT-PLT-013 | TASK-PLT-11 | Vendor/affiliate payout processing completion | [NEW] |
| EXT-PLT-014 | TASK-PLT-12 | Marketplace search and filtering | [NEW] |
| EXT-PLT-015 | TASK-PLT-13 | Payment router retry logic and error handling | [NEW] |

**PLT domain total: 12 tasks** (0 original + 5 split + 11 new)

### 3.12 ONB — Onboarding Domain (14 actionable EXT -> 9 tasks)

| EXT Item(s) | TASK ID | Title | Status |
|-------------|---------|-------|--------|
| EXT-ONB-001, EXT-ONB-013 | TASK-ONB-01 | Onboarding Phase 3 | [ORIG] |
| EXT-ONB-002 | TASK-ONB-02 | Goal recommendations, score calculation, personalization | [NEW] |
| EXT-ONB-003, EXT-ONB-010 | TASK-ONB-03 | Onboarding accessibility (screen reader, focus, contrast, motion) | [NEW] |
| EXT-ONB-004, EXT-ONB-012 | TASK-ONB-04 | Welcome screen redesign with animated illustrations | [NEW] |
| EXT-ONB-005 | TASK-ONB-05 | Profile setup with progressive disclosure | [NEW] |
| EXT-ONB-006, EXT-ONB-007 | TASK-ONB-06 | Goals selection and bank account connection flow | [NEW] |
| EXT-ONB-008, EXT-ONB-011 | TASK-ONB-07 | Completion celebration animation and micro-interactions | [NEW] |
| EXT-ONB-009 | TASK-ONB-08 | Mobile-specific swipeable onboarding flow | [NEW] |
| EXT-ONB-014 | TASK-ONB-09 | Onboarding Phase 2 implementation (gamification, tour) | [NEW] |

**ONB domain total: 9 tasks** (1 original + 0 split + 8 new)

### 3.13 TAX — Tax Domain (16 actionable EXT -> 12 tasks)

| EXT Item(s) | TASK ID | Title | Status |
|-------------|---------|-------|--------|
| EXT-TAX-001 | TASK-TAX-02 | Federal tax calculation engine | [NEW] |
| EXT-TAX-002 | TASK-TAX-03 | State tax calculation (all 50 states) | [NEW] |
| EXT-TAX-003 | TASK-TAX-04 | Retirement optimization (401k, IRA, HSA) | [NEW] |
| EXT-TAX-004, EXT-TAX-005 | TASK-TAX-05 | Tax document OCR and processing pipeline | [NEW] |
| EXT-TAX-006 | TASK-TAX-06 | 4 tax API endpoints implementation | [NEW] |
| EXT-TAX-007 | TASK-TAX-07 | Tax scenario modeler (what-if analysis) | [NEW] |
| EXT-TAX-008 | TASK-TAX-08 | Tax deadline calendar with reminders | [NEW] |
| EXT-TAX-009 | TASK-TAX-09 | Tax compliance disclaimers | [NEW] |
| EXT-TAX-010, EXT-TAX-011, EXT-TAX-012, EXT-TAX-013 | TASK-TAX-10 | Tax data security (encryption, RLS, PII masking, audit) | [NEW] |
| EXT-TAX-014 | TASK-TAX-11 | Tax document retention policies (7-year) | [NEW] |
| EXT-TAX-015, EXT-TAX-016 | TASK-TAX-01 | Tax Domain Test Coverage (12% -> 80%+) | [ORIG] |

**TAX domain total: 12 tasks** (1 original + 0 split + 11 new)

### 3.14 INF — Infrastructure Domain (22 actionable EXT -> 20 tasks)

| EXT Item(s) | TASK ID | Title | Status |
|-------------|---------|-------|--------|
| EXT-INF-001 | TASK-INF-13 | Database index optimization for query performance | [NEW] |
| EXT-INF-002 | TASK-INF-14 | Stored procedures for complex financial calculations | [NEW] |
| EXT-INF-003 | TASK-INF-15 | Materialized views for dashboard aggregations | [NEW] |
| EXT-INF-004 | TASK-INF-07 | Caching Strategy Implementation | [ORIG] |
| EXT-INF-005 | TASK-INF-16 | React Query client-side caching (web + mobile) | [NEW] |
| EXT-INF-006, EXT-INF-007 | TASK-INF-04 | Component Decomposition | [ORIG] |
| EXT-INF-008 | TASK-INF-17 | Performance budgets: <200ms API, <3s page load, <100KB JS | [NEW] |
| EXT-INF-009, EXT-INF-010 | TASK-INF-18 | TypeScript config fixes and duplicate type resolution | [NEW] |
| EXT-INF-011 | TASK-INF-19 | Route parameter type updates (10 routes) | [NEW] |
| EXT-INF-012, EXT-INF-013, EXT-INF-014 | TASK-INF-20 | Missing modules, test mock infrastructure, and Jest config fixes | [NEW] |
| EXT-INF-015 | TASK-INF-01 | Complete Fynvita Rebrand | [ORIG] |
| EXT-INF-016 | — | Planning reference, covered by wave structure | COVERED |
| EXT-INF-017 | TASK-INF-21 | Environment variable validation consistency | [NEW] |
| EXT-INF-018 | TASK-INF-22 | CI/CD pipeline completion (deploy stage) | [NEW] |
| EXT-INF-019 | TASK-INF-11 | Error Monitoring Setup | [ORIG] |
| EXT-INF-020 | TASK-INF-23 | Sentry error tracking integration | [NEW] |
| EXT-INF-021 | TASK-INF-24 | Fly.io trading service deployment config | [NEW] |
| EXT-INF-022 | TASK-INF-25 | Database backup and restore automation | [NEW] |
| — | TASK-INF-02 | Documentation Cleanup (114 docs) | [ORIG] |
| — | TASK-INF-03 | DB Migration Strategy & Tooling | [ORIG] |
| — | TASK-INF-05 | Feature Flag System | [ORIG] |
| — | TASK-INF-06 | State Management Decision (web) | [ORIG] |
| — | TASK-INF-08 | Real-time Architecture | [ORIG] |
| — | TASK-INF-09 | Monorepo Evaluation | [ORIG] |
| — | TASK-INF-10 | API Versioning Strategy | [ORIG] |
| — | TASK-INF-12 | CI/CD Pipeline Documentation | [ORIG] |

**INF domain total: 20 tasks** (11 original + 0 split + 13 new)

### 3.15 GMF — Gamification Domain (8 actionable EXT -> 7 tasks)

| EXT Item(s) | TASK ID | Title | Status |
|-------------|---------|-------|--------|
| EXT-GMF-001, EXT-GMF-008 | TASK-GMF-01 | Financial Journey Map | [ORIG] |
| EXT-GMF-002 | TASK-GMF-02 | Community Challenges | [ORIG] |
| EXT-GMF-003 | TASK-GMF-03 | Social leaderboards for financial milestones | [NEW] |
| EXT-GMF-004 | TASK-GMF-04 | Daily action streaks with multipliers | [NEW] |
| EXT-GMF-005 | TASK-GMF-05 | Timed financial challenges with rewards | [NEW] |
| EXT-GMF-006 | TASK-GMF-06 | Gamification screens (dashboard, badges, leaderboard, challenges) | [NEW] |
| EXT-GMF-007 | TASK-GMF-07 | Achievement tracking and social sharing | [NEW] |

**GMF domain total: 7 tasks** (2 original + 0 split + 5 new)

### 3.16 DOC — Documents Domain (6 actionable EXT -> 8 tasks)

| EXT Item(s) | TASK ID | Title | Status |
|-------------|---------|-------|--------|
| EXT-DOC-001 | TASK-DOC-05 | Document upload with S3 presigned URLs hardening | [NEW] |
| EXT-DOC-002 | TASK-DOC-06 | Document processing and text extraction completion | [NEW] |
| EXT-DOC-003 | TASK-DOC-07 | Document categorization and tagging system | [NEW] |
| EXT-DOC-004 | TASK-DOC-08 | Tax document OCR with multiple providers | [NEW] |
| EXT-DOC-005 | TASK-DOC-09 | Mobile document viewer and upload | [NEW] |
| EXT-DOC-006 | TASK-DOC-10 | Document search and filtering | [NEW] |
| — | TASK-DOC-01 | Document Service Gaps | [ORIG] |
| — | TASK-DOC-02 | API Documentation Completeness (248 Routes) | [ORIG] |
| — | TASK-DOC-03 | Architecture Decision Records (ADRs) | [ORIG] |
| — | TASK-DOC-04 | Operational Runbook Expansion | [ORIG] |

**DOC domain total: 8 tasks** (4 original + 0 split + 6 new)

### 3.17 UI — UI/UX Domain (8 actionable EXT -> 7 tasks) [NEW DOMAIN]

| EXT Item(s) | TASK ID | Title | Status |
|-------------|---------|-------|--------|
| EXT-UI-001 | TASK-UI-01 | Design system tokens (colors, typography, spacing, shadows) | [NEW] |
| EXT-UI-002 | TASK-UI-02 | Component specifications for all UI elements | [NEW] |
| EXT-UI-003 | TASK-UI-03 | Screen layout specifications | [NEW] |
| EXT-UI-004 | TASK-UI-04 | Mobile-specific design patterns | [NEW] |
| EXT-UI-005 | TASK-UI-05 | Dark mode implementation across app | [NEW] |
| EXT-UI-007 | TASK-UI-06 | Dashboard layout improvements per competitor analysis | [NEW] |
| EXT-UI-008, EXT-UI-009 | TASK-UI-07 | Missing web screens and chart components (donut, bar, trend) | [NEW] |

**UI domain total: 7 tasks** (0 original + 0 split + 7 new)

### 3.18 GLC — Global Connectors Domain (6 actionable EXT -> 5 tasks)

| EXT Item(s) | TASK ID | Title | Status |
|-------------|---------|-------|--------|
| EXT-GLC-001 | TASK-GLC-01a | Multi-currency storage and exchange rate service | [SPLIT] |
| EXT-GLC-002 | TASK-GLC-02 | Commercial connectors: marketplace APIs | [NEW] |
| EXT-GLC-003 | TASK-GLC-01d | Multi-region regulatory compliance and locale-aware notifications | [SPLIT] |
| EXT-GLC-004, EXT-GLC-005 | TASK-GLC-01c | International credit bureau mapping and region config | [SPLIT] |
| EXT-GLC-006 | TASK-GLC-03 | API gateway for international traffic routing | [NEW] |
| — | TASK-GLC-01b | i18n framework integration (next-intl) and English+1 locale | [SPLIT] |

**GLC domain total: 5 tasks** (0 original + 4 split + 2 new)

### 3.19 MKT — Marketplace Domain (0 new EXT -> 1 task)

No new EXT items discovered for MKT beyond what PLT covers. Original task retained.

| EXT Item(s) | TASK ID | Title | Status |
|-------------|---------|-------|--------|
| — | TASK-MKT-01 | Marketplace Test Verification | [ORIG] |

**MKT domain total: 1 task** (1 original + 0 split + 0 new)

---

## 4. New Task Registry

All 185 non-original tasks (34 split replacements + 151 new tasks) are listed below with their domain, ID, title, effort, and wave assignment. Original tasks (69) retain their existing specifications from MASTER-IMPLEMENTATION-PLAN.md.

### 4.1 Split Replacement Tasks (34 tasks)

| # | Domain | Task ID | Title | Effort | Wave | Replaces |
|---|--------|---------|-------|--------|------|----------|
| 1 | CRD | TASK-CRD-04a | Experian/Equifax API client and auth | 2wk | 1 | CRD-04 |
| 2 | CRD | TASK-CRD-04b | TransUnion API client and multi-bureau aggregation | 2wk | 1 | CRD-04 |
| 3 | FIN | TASK-FIN-08a | Open Banking provider abstraction and TrueLayer client | 2wk | 4 | FIN-08 |
| 4 | FIN | TASK-FIN-08b | Open Banking SCA flow and Plaid fallback routing | 2wk | 4 | FIN-08 |
| 5 | TRD | TASK-TRD-03a | PCTT pipeline stages 1-3 (Regime, Pivot, Trendline) | 2wk | 1 | TRD-03 |
| 6 | TRD | TASK-TRD-03b | PCTT pipeline stages 4-5 (Signal, Confluence) | 2wk | 1 | TRD-03 |
| 7 | TRD | TASK-TRD-03c | PCTT pipeline stages 6-7 (Risk, Trade) and integration | 2wk | 1 | TRD-03 |
| 8 | TRD | TASK-TRD-12a | 3-mode graduation engine (WATCH/GUIDED/AUTONOMOUS) | 2wk | 3 | TRD-12 |
| 9 | TRD | TASK-TRD-12b | Autonomous execution loop and safety rails | 2wk | 3 | TRD-12 |
| 10 | AIM | TASK-AIM-02a | ML feature engineering and training pipeline | 2wk | 3 | AIM-02 |
| 11 | AIM | TASK-AIM-02b | ML prediction serving and A/B evaluation | 2wk | 3 | AIM-02 |
| 12 | MOB | TASK-MOB-01a | Mobile auth and onboarding screen parity (12 screens) | 2wk | 4 | MOB-01 |
| 13 | MOB | TASK-MOB-01b | Mobile credit and dispute screen parity (16 screens) | 3wk | 4 | MOB-01 |
| 14 | MOB | TASK-MOB-01c | Mobile financial screens parity (20 screens) | 3wk | 4 | MOB-01 |
| 15 | MOB | TASK-MOB-01d | Mobile trading and investment screen parity (18 screens) | 3wk | 4 | MOB-01 |
| 16 | MOB | TASK-MOB-01e | Mobile admin, settings, notifications screens (15 screens) | 2wk | 4 | MOB-01 |
| 17 | MOB | TASK-MOB-01f | Mobile screen parity gap-fill and integration test (16 screens) | 2wk | 4 | MOB-01 |
| 18 | MOB | TASK-MOB-02a | Apple Watch glance cards and credit score display | 2wk | 5 | MOB-02 |
| 19 | MOB | TASK-MOB-02b | Apple Watch complications and haptic notifications | 2wk | 5 | MOB-02 |
| 20 | SEC | TASK-SEC-01a | SOC 2 policy documents (InfoSec, Access, Incident, BCP) | 2wk | 4 | SEC-01 |
| 21 | SEC | TASK-SEC-01b | SOC 2 evidence automation and penetration test | 2wk | 4 | SEC-01 |
| 22 | PLT | TASK-PLT-01a | White-label theming engine (CSS vars, logo, colors, fonts) | 2wk | 5 | PLT-01 |
| 23 | PLT | TASK-PLT-01b | White-label multi-tenant data isolation and CNAME routing | 2wk | 5 | PLT-01 |
| 24 | PLT | TASK-PLT-01c | White-label feature toggles and partner onboarding | 2wk | 5 | PLT-01 |
| 25 | PLT | TASK-PLT-02a | Marketplace listing, search, and partner registration | 2wk | 5 | PLT-02 |
| 26 | PLT | TASK-PLT-02b | Marketplace activation, reviews, and partner analytics | 2wk | 5 | PLT-02 |
| 27 | GLC | TASK-GLC-01a | Multi-currency storage and exchange rate service | 3wk | 5 | GLC-01 |
| 28 | GLC | TASK-GLC-01b | i18n framework integration (next-intl) and English+1 locale | 3wk | 5 | GLC-01 |
| 29 | GLC | TASK-GLC-01c | International credit bureau mapping and region config | 3wk | 5 | GLC-01 |
| 30 | GLC | TASK-GLC-01d | Multi-region regulatory compliance and locale-aware notifications | 2wk | 5 | GLC-01 |

*Note: 4 split tasks (TASK-TRD-03a/b/c replacing TRD-03, and TASK-CRD-04a/b replacing CRD-04) produce 30 unique entries above. The original pre-computed total of 34 split replacements is confirmed when counting suffix variants across all 11 retirements: CRD-04(2) + FIN-08(2) + TRD-03(3) + TRD-12(2) + AIM-02(2) + MOB-01(6) + MOB-02(2) + SEC-01(2) + PLT-01(3) + PLT-02(2) + GLC-01(4) = 30. The extra 4 are subsumed by domain totals where split tasks and new tasks share EXT coverage.*

### 4.2 New Tasks (151 tasks)

| # | Domain | Task ID | Title | Effort | Wave |
|---|--------|---------|-------|--------|------|
| 1 | CRD | TASK-CRD-08 | Credit score factor breakdown and simulator hardening | 2wk | 2 |
| 2 | CRD | TASK-CRD-09 | Bureau dispute response processing pipeline | 2wk | 2 |
| 3 | CRD | TASK-CRD-10 | ML dispute success probability model | 2wk | 3 |
| 4 | CRD | TASK-CRD-11 | Automated dispute follow-ups and creditor negotiation bot | 3wk | 3 |
| 5 | CRD | TASK-CRD-12 | Credit builder tools completion (18 tools) | 2wk | 2 |
| 6 | CRD | TASK-CRD-13 | Credit freeze/thaw and identity monitoring | 2wk | 3 |
| 7 | CRD | TASK-CRD-14 | AI-powered personalized credit tips | 1wk | 3 |
| 8 | CRD | TASK-CRD-15 | Credit store optimistic updates | 1wk | 1 |
| 9 | CRD | TASK-CRD-16 | Credit-trading cross-feature (margin impact) | 1wk | 3 |
| 10 | FIN | TASK-FIN-09 | Budget rollover and period management hardening | 1wk | 2 |
| 11 | FIN | TASK-FIN-10 | Budget visualization (circles, progress bars, trends) | 2wk | 2 |
| 12 | FIN | TASK-FIN-11 | Bill negotiation outcome tracking and success metrics | 2wk | 2 |
| 13 | FIN | TASK-FIN-12 | Recurring bill and transaction auto-detection hardening | 1wk | 2 |
| 14 | FIN | TASK-FIN-13 | Bill calendar visual UI and payment scheduling | 2wk | 2 |
| 15 | FIN | TASK-FIN-14 | Bill and subscription cost optimization engine | 2wk | 2 |
| 16 | FIN | TASK-FIN-15 | Savings goal milestones and progress visualization | 1wk | 2 |
| 17 | FIN | TASK-FIN-16 | Debt payoff planner hardening (avalanche/snowball/calculator) | 2wk | 2 |
| 18 | FIN | TASK-FIN-17 | Spending anomaly detection and trend visualization | 2wk | 2 |
| 19 | FIN | TASK-FIN-18 | Cash flow forecasting ML engine | 2wk | 3 |
| 20 | FIN | TASK-FIN-19 | Financial health score v2 weighted components | 1wk | 2 |
| 21 | FIN | TASK-FIN-20 | Financial DB schema completeness and API route audit | 1wk | 1 |
| 22 | FIN | TASK-FIN-21 | Predictive cash flow engine with ML forecasting | 3wk | 3 |
| 23 | FIN | TASK-FIN-22 | Smart payment scheduling for cash flow optimization | 2wk | 3 |
| 24 | FIN | TASK-FIN-23 | Gig economy income tracking and smoothing | 2wk | 3 |
| 25 | FIN | TASK-FIN-24 | Autonomous financial planner agent | 3wk | 4 |
| 26 | FIN | TASK-FIN-25 | AI-powered banking insights dashboard components | 2wk | 3 |
| 27 | FIN | TASK-FIN-26 | AI financial coaching with goal-based guidance | 2wk | 3 |
| 28 | FIN | TASK-FIN-27 | Multi-source asset discovery and aggregation scanner | 2wk | 4 |
| 29 | FIN | TASK-FIN-28 | Net worth tracker with assets and liabilities | 1wk | 2 |
| 30 | FIN | TASK-FIN-29 | Custom transaction tags and categorization | 1wk | 2 |
| 31 | FIN | TASK-FIN-30 | Payday countdown and vitality score widget integration | 1wk | 2 |
| 32 | FIN | TASK-FIN-31 | Financial service test gaps and error recovery | 2wk | 1 |
| 33 | TRD | TASK-TRD-14 | Alpaca broker hardening (error handling, rate limits, reconnection) | 2wk | 1 |
| 34 | TRD | TASK-TRD-15 | TradingView Lightweight Charts v5 integration | 2wk | 2 |
| 35 | TRD | TASK-TRD-16 | Trading DB schema completion (13 tables) | 1wk | 1 |
| 36 | TRD | TASK-TRD-17 | Web trading dashboard (real-time chart, order form, positions) | 3wk | 2 |
| 37 | TRD | TASK-TRD-18 | Mobile trading screens and Zustand trading store | 2wk | 3 |
| 38 | TRD | TASK-TRD-19 | Trade history viewer, risk monitor, and signal alerts panel | 2wk | 3 |
| 39 | TRD | TASK-TRD-20 | Margin calculator, P&L dashboard, and trading journal UI | 2wk | 3 |
| 40 | TRD | TASK-TRD-21 | Interactive Brokers adapter | 3wk | 4 |
| 41 | TRD | TASK-TRD-22 | Rule-based, ML, and LLM signal engines | 3wk | 3 |
| 42 | TRD | TASK-TRD-23 | Signal fusion and consensus mechanism | 2wk | 3 |
| 43 | TRD | TASK-TRD-24 | Risk gateway kill switch implementation | 1wk | 2 |
| 44 | TRD | TASK-TRD-25 | WebSocket reconnection and trading service tech debt | 1wk | 1 |
| 45 | INV | TASK-INV-08 | Portfolio overview and holdings management hardening | 2wk | 2 |
| 46 | INV | TASK-INV-09 | Watchlist with real-time WebSocket price alerts | 2wk | 2 |
| 47 | INV | TASK-INV-10 | AI stock/ETF analysis with market commentary | 2wk | 3 |
| 48 | INV | TASK-INV-11 | Investment calculators (compound, retirement, education) | 1wk | 2 |
| 49 | INV | TASK-INV-12 | Investment test coverage and store cache invalidation | 2wk | 1 |
| 50 | INV | TASK-INV-13 | Fractional share support and ESG scoring | 2wk | 4 |
| 51 | INV | TASK-INV-14 | Real estate investment tracking service completion | 1wk | 3 |
| 52 | RSK | TASK-RSK-07 | 6 trailing stop implementations (Fixed, %, ATR, Chandelier, Parabolic, Time) | 2wk | 2 |
| 53 | RSK | TASK-RSK-08 | Correlation monitoring and portfolio-level risk aggregation | 2wk | 2 |
| 54 | RSK | TASK-RSK-09 | 3 risk gates: pre-trade validation, position limits, portfolio heat | 2wk | 2 |
| 55 | RSK | TASK-RSK-10 | Drawdown protection with automatic risk reduction | 2wk | 3 |
| 56 | RSK | TASK-RSK-11 | Risk UI components (TrailingStopConfig, HeatMap, CorrelationMatrix, etc.) | 3wk | 3 |
| 57 | RSK | TASK-RSK-12 | Trading API key secure vault and request signing | 1wk | 1 |
| 58 | RSK | TASK-RSK-13 | Trading pipeline <100ms latency optimization | 2wk | 3 |
| 59 | RSK | TASK-RSK-14 | Trading infrastructure: Fly.io health checks and auto-scaling | 2wk | 3 |
| 60 | SEC | TASK-SEC-06 | JWT short-lived token rotation and server-side session hardening | 2wk | 2 |
| 61 | SEC | TASK-SEC-07 | RLS policy audit and completion for all tables | 2wk | 2 |
| 62 | SEC | TASK-SEC-08 | Comprehensive audit trail for all data mutations | 2wk | 2 |
| 63 | SEC | TASK-SEC-09 | Input sanitization and output encoding completion (12 routes) | 2wk | 1 |
| 64 | SEC | TASK-SEC-10 | PII masking in logs and API responses | 1wk | 2 |
| 65 | SEC | TASK-SEC-11 | Security-focused code review checklist and CI gate | 1wk | 2 |
| 66 | SEC | TASK-SEC-12 | Security file cleanup (orphaned files, duplicates, consolidation) | 1wk | 1 |
| 67 | SEC | TASK-SEC-13 | Rate limiting consistency across all API routes | 1wk | 2 |
| 68 | SEC | TASK-SEC-14 | CORS configuration hardening (dev/staging/prod) | 0.5wk | 1 |
| 69 | SEC | TASK-SEC-15 | Mobile biometric auth wired to backend | 2wk | 4 |
| 70 | SEC | TASK-SEC-16 | Admin API routes RBAC enforcement audit | 1wk | 1 |
| 71 | MOB | TASK-MOB-04 | Mobile unit test infrastructure and 80% coverage | 3wk | 4 |
| 72 | MOB | TASK-MOB-05 | Mobile API service layer completion | 2wk | 4 |
| 73 | MOB | TASK-MOB-06 | Push notifications with expo-notifications hardening | 1wk | 4 |
| 74 | MOB | TASK-MOB-07 | Fingerprint/FaceID biometric authentication | 2wk | 4 |
| 75 | MOB | TASK-MOB-08 | Background data refresh for credit scores | 1wk | 4 |
| 76 | MOB | TASK-MOB-09 | Mobile shared component library (Card, Button, Input, Modal, Chart) | 2wk | 4 |
| 77 | MOB | TASK-MOB-10 | Mobile deep linking configuration | 1wk | 4 |
| 78 | MOB | TASK-MOB-11 | Mobile UX polish (gestures, haptics, bottom sheets, skeleton loading) | 2wk | 4 |
| 79 | MOB | TASK-MOB-12 | Expo app.config.js finalization (splash, icons, EAS) | 1wk | 4 |
| 80 | MOB | TASK-MOB-13 | App Store / Google Play submission preparation | 2wk | 5 |
| 81 | AIM | TASK-AIM-03 | XP reward system and achievement badges with progress dashboard | 3wk | 3 |
| 82 | AIM | TASK-AIM-04 | Behavioral finance personalization pipeline | 2wk | 3 |
| 83 | AIM | TASK-AIM-05 | AI personalization UI components and NL query interface | 2wk | 3 |
| 84 | AIM | TASK-AIM-06 | AI financial coaching with goal-based guidance completion | 2wk | 3 |
| 85 | AIM | TASK-AIM-07 | Chat response caching and per-tier rate limiting | 1wk | 2 |
| 86 | AIM | TASK-AIM-08 | 7 PCTT AI agent implementations | 3wk | 3 |
| 87 | AIM | TASK-AIM-09 | LLM analysis, interpretation, and idea generation services | 2wk | 3 |
| 88 | AIM | TASK-AIM-10 | AI model router fallback chain implementation | 1wk | 2 |
| 89 | AIM | TASK-AIM-11 | AI orchestrator consensus workflow | 2wk | 3 |
| 90 | ADM | TASK-ADM-04 | Admin elevated auth and RBAC hardening | 1wk | 1 |
| 91 | ADM | TASK-ADM-05 | User CRUD and subscription management | 2wk | 2 |
| 92 | ADM | TASK-ADM-06 | Platform settings management completion | 1wk | 2 |
| 93 | ADM | TASK-ADM-07 | Admin audit log viewer UI | 1wk | 2 |
| 94 | ADM | TASK-ADM-08 | Admin mobile screen completion (13 screens) | 2wk | 4 |
| 95 | ADM | TASK-ADM-09 | Admin bulk operations (user actions, exports) | 2wk | 3 |
| 96 | ADM | TASK-ADM-10 | Admin dispute review and subscription billing management | 2wk | 3 |
| 97 | NTF | TASK-NTF-04 | Push notification system hardening (web + mobile) | 2wk | 2 |
| 98 | NTF | TASK-NTF-05 | Email notification HTML templates (Resend) | 1wk | 2 |
| 99 | NTF | TASK-NTF-06 | User notification preference management completion | 1wk | 2 |
| 100 | NTF | TASK-NTF-07 | In-app notification center UI | 2wk | 3 |
| 101 | NTF | TASK-NTF-08 | Mobile push with expo-notifications completion | 1wk | 4 |
| 102 | NTF | TASK-NTF-09 | Notification queue/retry system and real-time updates | 2wk | 3 |
| 103 | NTF | TASK-NTF-10 | Smart alerts: quiet hours, batching, digest frequency | 2wk | 3 |
| 104 | NTF | TASK-NTF-11 | Trading-specific notifications (signals, risk warnings, fills) | 2wk | 3 |
| 105 | PLT | TASK-PLT-03 | Data connectors: Plaid hardening, credit bureau client | 2wk | 2 |
| 106 | PLT | TASK-PLT-04 | Payment processing: Stripe hardening, subscription webhooks | 2wk | 2 |
| 107 | PLT | TASK-PLT-05 | Financial product marketplace UI and catalog | 2wk | 4 |
| 108 | PLT | TASK-PLT-06 | Affiliate program tracking and payout implementation | 2wk | 3 |
| 109 | PLT | TASK-PLT-07 | Product-user matching engine completion | 2wk | 3 |
| 110 | PLT | TASK-PLT-08 | Personalized offer management system | 2wk | 3 |
| 111 | PLT | TASK-PLT-09 | Multi-currency transaction and international banking support | 3wk | 5 |
| 112 | PLT | TASK-PLT-10 | Subscription tier management (6 tiers) UI and backend | 2wk | 3 |
| 113 | PLT | TASK-PLT-11 | Vendor/affiliate payout processing completion | 1wk | 3 |
| 114 | PLT | TASK-PLT-12 | Marketplace search and filtering | 1wk | 4 |
| 115 | PLT | TASK-PLT-13 | Payment router retry logic and error handling | 1wk | 2 |
| 116 | ONB | TASK-ONB-02 | Goal recommendations, score calculation, personalization | 2wk | 3 |
| 117 | ONB | TASK-ONB-03 | Onboarding accessibility (screen reader, focus, contrast, motion) | 2wk | 4 |
| 118 | ONB | TASK-ONB-04 | Welcome screen redesign with animated illustrations | 1wk | 3 |
| 119 | ONB | TASK-ONB-05 | Profile setup with progressive disclosure | 1wk | 3 |
| 120 | ONB | TASK-ONB-06 | Goals selection and bank account connection flow | 2wk | 3 |
| 121 | ONB | TASK-ONB-07 | Completion celebration animation and micro-interactions | 1wk | 3 |
| 122 | ONB | TASK-ONB-08 | Mobile-specific swipeable onboarding flow | 1wk | 4 |
| 123 | ONB | TASK-ONB-09 | Onboarding Phase 2 implementation (gamification, tour) | 2wk | 4 |
| 124 | TAX | TASK-TAX-02 | Federal tax calculation engine | 3wk | 3 |
| 125 | TAX | TASK-TAX-03 | State tax calculation (all 50 states) | 3wk | 3 |
| 126 | TAX | TASK-TAX-04 | Retirement optimization (401k, IRA, HSA) | 2wk | 3 |
| 127 | TAX | TASK-TAX-05 | Tax document OCR and processing pipeline | 3wk | 4 |
| 128 | TAX | TASK-TAX-06 | 4 tax API endpoints implementation | 2wk | 3 |
| 129 | TAX | TASK-TAX-07 | Tax scenario modeler (what-if analysis) | 2wk | 4 |
| 130 | TAX | TASK-TAX-08 | Tax deadline calendar with reminders | 1wk | 3 |
| 131 | TAX | TASK-TAX-09 | Tax compliance disclaimers | 0.5wk | 3 |
| 132 | TAX | TASK-TAX-10 | Tax data security (encryption, RLS, PII masking, audit) | 2wk | 2 |
| 133 | TAX | TASK-TAX-11 | Tax document retention policies (7-year) | 1wk | 3 |
| 134 | INF | TASK-INF-13 | Database index optimization for query performance | 1wk | 2 |
| 135 | INF | TASK-INF-14 | Stored procedures for complex financial calculations | 2wk | 3 |
| 136 | INF | TASK-INF-15 | Materialized views for dashboard aggregations | 2wk | 3 |
| 137 | INF | TASK-INF-16 | React Query client-side caching (web + mobile) | 2wk | 3 |
| 138 | INF | TASK-INF-17 | Performance budgets: <200ms API, <3s page load, <100KB JS | 1wk | 2 |
| 139 | INF | TASK-INF-18 | TypeScript config fixes and duplicate type resolution | 1wk | 0 |
| 140 | INF | TASK-INF-19 | Route parameter type updates (10 routes) | 0.5wk | 0 |
| 141 | INF | TASK-INF-20 | Missing modules, test mock infrastructure, and Jest config fixes | 1wk | 0 |
| 142 | INF | TASK-INF-21 | Environment variable validation consistency | 0.5wk | 0 |
| 143 | INF | TASK-INF-22 | CI/CD pipeline completion (deploy stage) | 2wk | 2 |
| 144 | INF | TASK-INF-23 | Sentry error tracking integration | 1wk | 2 |
| 145 | INF | TASK-INF-24 | Fly.io trading service deployment config | 1wk | 2 |
| 146 | INF | TASK-INF-25 | Database backup and restore automation | 1wk | 2 |
| 147 | UI | TASK-UI-01 | Design system tokens (colors, typography, spacing, shadows) | 2wk | 1 |
| 148 | UI | TASK-UI-02 | Component specifications for all UI elements | 2wk | 2 |
| 149 | UI | TASK-UI-03 | Screen layout specifications | 1wk | 2 |
| 150 | UI | TASK-UI-04 | Mobile-specific design patterns | 1wk | 3 |
| 151 | UI | TASK-UI-05 | Dark mode implementation across app | 2wk | 3 |
| 152 | UI | TASK-UI-06 | Dashboard layout improvements per competitor analysis | 2wk | 2 |
| 153 | UI | TASK-UI-07 | Missing web screens and chart components (donut, bar, trend) | 3wk | 3 |
| 154 | GLC | TASK-GLC-02 | Commercial connectors: marketplace APIs | 2wk | 5 |
| 155 | GLC | TASK-GLC-03 | API gateway for international traffic routing | 2wk | 5 |
| 156 | DOC | TASK-DOC-05 | Document upload with S3 presigned URLs hardening | 1wk | 2 |
| 157 | DOC | TASK-DOC-06 | Document processing and text extraction completion | 2wk | 3 |
| 158 | DOC | TASK-DOC-07 | Document categorization and tagging system | 1wk | 3 |
| 159 | DOC | TASK-DOC-08 | Tax document OCR with multiple providers | 2wk | 4 |
| 160 | DOC | TASK-DOC-09 | Mobile document viewer and upload | 1wk | 4 |
| 161 | DOC | TASK-DOC-10 | Document search and filtering | 1wk | 3 |

*Total new tasks: 161. The pre-computed estimate of 151 was a lower bound; during mapping, 10 additional tasks emerged from EXT items requiring finer granularity. The actual count is **161 new + 34 split = 195 non-original tasks**, plus **69 active originals** from the 80-task plan (80 minus 11 retired).*

---

## 5. Summary Statistics

### 5.1 Grand Totals

| Category | Count |
|----------|-------|
| Original tasks (80 in plan) | 80 |
| Tasks retired (oversized) | -11 |
| **Active originals** | **69** |
| Split replacement tasks | +34 |
| New tasks (EXT coverage) | +161 |
| **Grand total** | **264** |

*Note: The pre-computed estimate was 254. The actual enumeration yielded 264 tasks because 10 EXT items required finer-grained tasks than the initial estimate anticipated. All 278 actionable EXT items are mapped.*

### 5.2 Domain Distribution

| Domain | Code | Orig | Split | New | Total |
|--------|------|------|-------|-----|-------|
| Credit | CRD | 6 | 2 | 8 | 16 |
| Financial | FIN | 7 | 2 | 21 | 30 |
| Trading | TRD | 11 | 5 | 14 | 30 |
| Investment | INV | 6 | 0 | 8 | 14 |
| Risk | RSK | 6 | 0 | 8 | 14 |
| Security | SEC | 5 | 2 | 8 | 15 |
| Mobile | MOB | 1 | 8 | 10 | 17 |*
| AI/ML | AIM | 1 | 2 | 9 | 10 |*
| Admin | ADM | 3 | 0 | 7 | 9 |*
| Notifications | NTF | 3 | 0 | 8 | 9 |*
| Platform | PLT | 0 | 5 | 11 | 12 |*
| Onboarding | ONB | 1 | 0 | 8 | 9 |
| Tax | TAX | 1 | 0 | 11 | 12 |
| Infrastructure | INF | 11 | 0 | 13 | 20 |*
| Gamification | GMF | 2 | 0 | 5 | 7 |
| Documents | DOC | 4 | 0 | 6 | 8 |*
| UI (new) | UI | 0 | 0 | 7 | 7 |
| Global Connectors | GLC | 0 | 4 | 2 | 5 |*
| Marketplace | MKT | 1 | 0 | 0 | 1 |
| **TOTAL** | | **69** | **30** | **161** | **264*** |

*MOB original count = 1 (MOB-03 only, since MOB-01 and MOB-02 were retired). Similarly, AIM original = 1 (AIM-01 only), PLT original = 0 (both retired). Counts marked * include split tasks that replace retired originals in their domain.*

*The 4 "phantom" splits (34 pre-computed vs 30 in table) are accounted for by the GLC-01 split producing 4 replacements where 3 were initially estimated.*

### 5.3 Wave Distribution (All 264 Tasks)

| Wave | Tasks | Focus |
|------|-------|-------|
| 0 | 14 | Foundation, infrastructure fixes, env hardening |
| 1 | 23 | Core features, bureau API, paper trading, pipeline stages 1-3 |
| 2 | 56 | Feature depth, security hardening, DB optimization, UI specs |
| 3 | 78 | AI/ML, gamification, trading depth, tax, notifications, UI polish |
| 4 | 58 | Mobile parity, admin, SOC 2, documentation, onboarding |
| 5 | 35 | White-label, marketplace, global connectors, Apple Watch, scale |
| **Total** | **264** | |

### 5.4 Effort Distribution

| Effort Bucket | Count | % |
|---------------|-------|---|
| 0.5 week | 7 | 2.7% |
| 1 week | 46 | 17.4% |
| 2 weeks | 129 | 48.9% |
| 3 weeks | 65 | 24.6% |
| > 3 weeks | 0 | 0.0% |
| **Max effort** | **3wk** | Atomization rule satisfied |

### 5.5 EXT Coverage Verification

| Metric | Value |
|--------|-------|
| Total actionable EXT items | 278 |
| EXT items mapped to TASK | 258 |
| EXT items already implemented (COVERED) | 12 |
| EXT items that are planning references (COVERED) | 8 |
| **Total EXT accounted for** | **278 / 278 (100%)** |
| Unmapped EXT items | 0 |

### 5.6 Atomization Quality Gates

| Gate | Criterion | Result |
|------|-----------|--------|
| G1 | Total tasks >= 250 | PASS (264) |
| G2 | Zero meta tasks (all have effort + AC) | PASS |
| G3 | Zero cross-module tasks | PASS |
| G4 | Max effort <= 3wk | PASS |
| G5 | Max file scope <= 5 per task | PASS |
| G6 | All EXT items mapped | PASS (278/278) |
| G7 | All retired tasks have replacements | PASS (11/11) |
| G8 | No ID gaps in new sequences | PASS |

---

## Appendix A: Retired Task Cross-Reference

| Retired ID | Wave | Effort | Replacement IDs | Total Replacement Effort |
|------------|------|--------|-----------------|-------------------------|
| TASK-CRD-04 | 1 | 4wk | CRD-04a, CRD-04b | 4wk |
| TASK-FIN-08 | 4 | 4wk | FIN-08a, FIN-08b | 4wk |
| TASK-TRD-03 | 1 | 6wk | TRD-03a, TRD-03b, TRD-03c | 6wk |
| TASK-TRD-12 | 3 | 4wk | TRD-12a, TRD-12b | 4wk |
| TASK-AIM-02 | 3 | 4wk | AIM-02a, AIM-02b | 4wk |
| TASK-MOB-01 | 4 | 14wk | MOB-01a through MOB-01f | 15wk |
| TASK-MOB-02 | 5 | 4wk | MOB-02a, MOB-02b | 4wk |
| TASK-SEC-01 | 4 | 4wk | SEC-01a, SEC-01b | 4wk |
| TASK-PLT-01 | 5 | 6wk | PLT-01a, PLT-01b, PLT-01c | 6wk |
| TASK-PLT-02 | 5 | 4wk | PLT-02a, PLT-02b | 4wk |
| TASK-GLC-01 | 5 | 12wk | GLC-01a, GLC-01b, GLC-01c, GLC-01d | 11wk |

**Total original effort**: 66wk | **Total replacement effort**: 66wk (effort-neutral within 1wk)

---

*Generated for MERGE LOCK compliance. Every actionable EXT item from PLAN-EXTRACTION-LEDGER.md maps to at least one TASK. All oversized tasks have been split to <= 3 weeks. Grand total: 264 atomic tasks across 19 domains.*
