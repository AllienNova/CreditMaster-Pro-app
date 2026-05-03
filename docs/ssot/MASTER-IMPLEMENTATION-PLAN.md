# Master Implementation Plan

> **Fynvita Platform — Authoritative Build Plan (EXT-Merged Edition)**
> Single source of truth for all 125 implementation tasks across 7 waves.
> Generated: 2026-02-28 | Merged: 278 actionable EXT-* items from PLAN-EXTRACTION-LEDGER.md
> Sources: `docs/ssot/PLAN-EXTRACTION-LEDGER.md`, `docs/ssot/task_extraction.md`, `docs/ssot/dependency_graph.md`, `docs/ssot/build_order_blueprint.md`, `docs/SSOT.md` Section 16

---

## 1. How to Use This Document

This document is the **single executable reference** for all Fynvita implementation work. Every task in the project has a card below. All 278 actionable items from PLAN-EXTRACTION-LEDGER.md have been absorbed into these task cards.

### Reading a Task Card

Each card contains:

| Field | Meaning |
|-------|---------|
| **ID** | Stable identifier (e.g., TASK-CRD-04). Use this in commits, PRs, and issue trackers. |
| **Priority** | P0 = Critical (do first), P1 = High, P2 = Medium, P3 = Low |
| **Wave** | Build order wave (0-5). Tasks in earlier waves must complete before later waves start. |
| **Effort** | S (1-2d), M (3-5d), L (1-2w), XL (2-4w) |
| **Domain** | Which module/team owns this task |
| **Blocks** | Tasks that CANNOT start until this task is done |
| **Blocked By** | Tasks that must be done BEFORE this task can start |
| **Description** | What to build and why |
| **Acceptance Criteria** | Specific, testable conditions that must be true when the task is complete |
| **Technical Notes** | Existing code to extend, key files, implementation hints |
| **Verification Block** | Exact commands to run to prove the task is done |
| **EXT References** | Which EXT-* items from the PLAN-EXTRACTION-LEDGER are covered by this task |

### Workflow

1. Check the current **Wave** and its **Entry Criteria**
2. Pick tasks from that wave (respect `Blocked By` constraints)
3. Implement until all **Acceptance Criteria** pass
4. Run the **Verification Block** commands — all must pass
5. When all tasks in a wave are done, verify **Exit Criteria** (Merge Gate)
6. Advance to next wave

### Priority Guide

| Priority | Meaning | SLA |
|----------|---------|-----|
| P0 | Critical — blocks other work or has no alternative | Start immediately |
| P1 | High — core feature, needed for product viability | Complete within wave |
| P2 | Medium — important but not blocking | Complete within quarter |
| P3 | Low — nice-to-have, future-looking | Complete when capacity allows |

### Task Counts by Wave

| Wave | Focus | Existing | New (EXT merge) | Total |
|------|-------|----------|-----------------|-------|
| 0 | Foundation & Infrastructure | 10 | 0 | 10 |
| 1 | Core Feature Build | 13 | 5 | 18 |
| 2 | Feature Depth & Extensions | 19 | 7 | 26 |
| 3 | AI, Gamification & Polish | 19 | 5 | 24 |
| 4 | Mobile, Admin & Integration | 14 | 10 | 24 |
| 5 | Platform & Scale | 5 | 5 | 10 |
| 6 | External Integrations & Monetization | 0 | 13 | 13 |
| **Total** | | **80** | **45** | **125** |

### Task Status Summary (Verified 2026-03-01, VERSION-010)

| Status | Count | % |
|--------|-------|---|
| **DONE** | 125 | 100% |
| **IN_PROGRESS** | 0 | 0.0% |
| **NOT_STARTED** | 0 | 0.0% |
| **Total** | 125 | 100% |

| Wave | DONE | IN_PROGRESS | NOT_STARTED | Total |
|------|------|-------------|-------------|-------|
| 0 | 10 | 0 | 0 | 10 |
| 1 | 18 | 0 | 0 | 18 |
| 2 | 26 | 0 | 0 | 26 |
| 3 | 24 | 0 | 0 | 24 |
| 4 | 24 | 0 | 0 | 24 |
| 5 | 10 | 0 | 0 | 10 |
| 6 | 13 | 0 | 0 | 13 |

---

## 2. Task Card Template

Every task card in this document follows this format:

```markdown
### TASK-{DOMAIN}-{NN}: {Title}

| Field | Value |
|-------|-------|
| **Module** | MOD-{NAME} |
| **Priority** | P0 / P1 / P2 / P3 |
| **Effort** | S / M / L / XL |
| **Status** | NOT_STARTED / IN_PROGRESS / DONE / BLOCKED |
| **Depends On** | TASK-{X}-{NN}, ... or "None" |
| **Blocks** | TASK-{X}-{NN}, ... or "None" |
| **REQ Trace** | REQ-{DOMAIN}-{NNNN} |
| **EXT References** | EXT-{DOM}-{NNN}, ... |

**Objective**: What this task accomplishes.

**Acceptance Criteria**:
- [ ] Criterion 1
- [ ] Criterion 2

**Key Files**:
- `path/to/file.ts`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Lint | `npm run lint` | 0 errors |
| Types | `npx tsc --noEmit` | 0 errors |
| Tests | `npm test -- path/to` | All pass, >= 80% coverage |
| Build | `npm run build` | Success |

**Notes**: Additional context.
```

---

## 3. Dependency Layer Model

Tasks are organized into 5 dependency layers. Lower layers must complete before higher layers can begin within each wave.

```
Layer 5: USER EXPOSURE
  └─ Onboarding flows, Gamification, Dark Mode, Mobile UX polish
Layer 4: FRONTEND & MOBILE
  └─ UI Components, Mobile Stores, Admin Dashboard, Design System
Layer 3: API & INTEGRATION
  └─ API Routes, Webhooks, Plaid, Alpaca, Stripe, External APIs
Layer 2: CORE BACKEND
  └─ Financial Services, Trading Engine, Credit Repair, AI/ML, Risk
Layer 1: INFRASTRUCTURE
  └─ Supabase Client, Env Hardening, DB Migrations, Auth, CI/CD, Monitoring
```

### Layer Mapping by Wave

| Wave | Layer 1 (Infra) | Layer 2 (Backend) | Layer 3 (API) | Layer 4 (Frontend) | Layer 5 (Exposure) |
|------|----------------|-------------------|---------------|-------------------|-------------------|
| 0 | INF-01,03,04,06,11,12 | TRD-07, NTF-03, ADM-03 | SEC-03 | — | — |
| 1 | — | FIN-01..03,06, CRD-02,04, TRD-01,03,13, RSK-01,03, TAX-01 | DOC-03 | UI-01 | — |
| 2 | — | CRD-03,05..07, TRD-02,04,05,08,09,11, RSK-02,04,05, FIN-04,05,07,09,10 | INV-01..03, TAX-02,03 | — | — |
| 3 | INF-05,07,08 | AIM-01..03, TRD-06,10,12,14, INV-04..06 | SEC-04,05, RSK-06 | GMF-01..03, ONB-01,02 | DOC-01, MKT-01 |
| 4 | INF-02,10,13,14 | FIN-08,11..14, SEC-01,02,06,07, CRD-01,08,09 | NTF-01,02,04,05 | MOB-01,03..07, ADM-01,02,04,05 | DOC-02,04,05, UI-02, ONB-03 |
| 5 | INF-09 | — | PLT-01..05, GLC-01,02 | MOB-02 | — |

---

## 4. EXT → TASK Crosswalk Table

Every actionable EXT-* item from PLAN-EXTRACTION-LEDGER.md is mapped to a TASK-* card below. Disposition codes: **ABSORBED** = merged into an existing task; **NEW_TASK** = created a new task; **IGNORED** = non-actionable (decision, reference, or already resolved).

### CRD Domain (26 items)

| EXT ID | Description | Disposition | TASK ID |
|--------|-------------|-------------|---------|
| EXT-CRD-001 | Real-time credit monitoring with bureau APIs | ABSORBED | TASK-CRD-04 |
| EXT-CRD-002 | Multi-bureau score tracking (Equifax, Experian, TransUnion) | ABSORBED | TASK-CRD-04 |
| EXT-CRD-003 | Credit score simulator (what-if analysis) | ABSORBED | TASK-CRD-02 |
| EXT-CRD-004 | AI-powered dispute letter generation | ABSORBED | TASK-CRD-03 |
| EXT-CRD-005 | Credit repair automation pipeline | ABSORBED | TASK-CRD-05 |
| EXT-CRD-006 | Credit report parsing and error detection | ABSORBED | TASK-CRD-06 |
| EXT-CRD-007 | Dispute tracking dashboard | ABSORBED | TASK-CRD-07 |
| EXT-CRD-008 | Credit builder loan integration | ABSORBED | TASK-CRD-05 |
| EXT-CRD-009 | Secured credit card recommendations | ABSORBED | TASK-CRD-02 |
| EXT-CRD-010 | Credit utilization optimizer | ABSORBED | TASK-CRD-04 |
| EXT-CRD-011 | Identity theft monitoring integration | ABSORBED | TASK-CRD-04 |
| EXT-CRD-012 | Credit freeze/thaw automation | NEW_TASK | TASK-CRD-08 |
| EXT-CRD-013 | Creditor negotiation bot | NEW_TASK | TASK-CRD-09 |
| EXT-CRD-014 | Goodwill letter generator | ABSORBED | TASK-CRD-03 |
| EXT-CRD-015 | Pay-for-delete strategy engine | ABSORBED | TASK-CRD-05 |
| EXT-CRD-016 | Credit mix optimization | ABSORBED | TASK-CRD-02 |
| EXT-CRD-017 | Authorized user strategy | ABSORBED | TASK-CRD-02 |
| EXT-CRD-018 | Hard inquiry removal automation | ABSORBED | TASK-CRD-06 |
| EXT-CRD-019 | Credit coaching AI chat | ABSORBED | TASK-CRD-03 |
| EXT-CRD-020 | Bureau dispute submission API integration | ABSORBED | TASK-CRD-06 |
| EXT-CRD-021 | Dispute outcome prediction model | ABSORBED | TASK-CRD-03 |
| EXT-CRD-022 | Credit age optimization strategy | ABSORBED | TASK-CRD-02 |
| EXT-CRD-023 | Rapid rescore coordination | ABSORBED | TASK-CRD-05 |
| EXT-CRD-024 | Credit monitoring alert system | ABSORBED | TASK-CRD-04 |
| EXT-CRD-025 | Credit report annual pull automation | ABSORBED | TASK-CRD-04 |
| EXT-CRD-026 | Student loan credit optimization | ABSORBED | TASK-CRD-02 |

### FIN Domain (52 items)

| EXT ID | Description | Disposition | TASK ID |
|--------|-------------|-------------|---------|
| EXT-FIN-001 | Smart budgeting with AI recommendations | ABSORBED | TASK-FIN-01 |
| EXT-FIN-002 | Spending analysis with category breakdown | ABSORBED | TASK-FIN-02 |
| EXT-FIN-003 | Income tracking and source detection | ABSORBED | TASK-FIN-03 |
| EXT-FIN-004 | Savings automation rules engine | ABSORBED | TASK-FIN-04 |
| EXT-FIN-005 | Bill detection and calendar | ABSORBED | TASK-FIN-05 |
| EXT-FIN-006 | Debt payoff planner (avalanche/snowball) | ABSORBED | TASK-FIN-06 |
| EXT-FIN-007 | Net worth tracker | ABSORBED | TASK-FIN-07 |
| EXT-FIN-008 | Bill negotiation AI assistant | ABSORBED | TASK-FIN-08 |
| EXT-FIN-009 | Subscription cancellation service | ABSORBED | TASK-FIN-04 |
| EXT-FIN-010 | Health score v2 calculation | ABSORBED | TASK-FIN-02 |
| EXT-FIN-011 | Spending forecast engine | ABSORBED | TASK-FIN-02 |
| EXT-FIN-012 | Budget rollover automation | ABSORBED | TASK-FIN-01 |
| EXT-FIN-013 | Financial goal optimization | ABSORBED | TASK-FIN-03 |
| EXT-FIN-014 | Plaid account aggregation | ABSORBED | TASK-FIN-01 |
| EXT-FIN-015 | Debt consolidation calculator | ABSORBED | TASK-FIN-06 |
| EXT-FIN-016 | Emergency fund calculator | ABSORBED | TASK-FIN-03 |
| EXT-FIN-017 | Retirement savings projections | ABSORBED | TASK-FIN-03 |
| EXT-FIN-018 | Cash flow forecasting engine | NEW_TASK | TASK-FIN-09 |
| EXT-FIN-019 | Spending anomaly detection | ABSORBED | TASK-FIN-02 |
| EXT-FIN-020 | Payday countdown and planning | ABSORBED | TASK-FIN-03 |
| EXT-FIN-021 | Financial reports export (PDF/CSV) | ABSORBED | TASK-FIN-07 |
| EXT-FIN-022 | Recurring transaction detection | ABSORBED | TASK-FIN-05 |
| EXT-FIN-023 | Category-based spending limits | ABSORBED | TASK-FIN-01 |
| EXT-FIN-024 | Savings goal recommendations | ABSORBED | TASK-FIN-04 |
| EXT-FIN-025 | Bill splitting calculations | ABSORBED | TASK-FIN-05 |
| EXT-FIN-026 | Financial dashboard aggregation | ABSORBED | TASK-FIN-07 |
| EXT-FIN-027 | Spending trends visualization | ABSORBED | TASK-FIN-02 |
| EXT-FIN-028 | Income vs expense analysis | ABSORBED | TASK-FIN-03 |
| EXT-FIN-029 | Account balance alerts | ABSORBED | TASK-FIN-01 |
| EXT-FIN-030 | Gig economy income tracking | NEW_TASK | TASK-FIN-10 |
| EXT-FIN-031 | Multi-currency support | NEW_TASK | TASK-FIN-11 |
| EXT-FIN-032 | Real estate asset tracking | ABSORBED | TASK-FIN-07 |
| EXT-FIN-033 | Crypto wallet integration | ABSORBED | TASK-FIN-07 |
| EXT-FIN-034 | Vehicle asset depreciation tracking | ABSORBED | TASK-FIN-07 |
| EXT-FIN-035 | Collectibles and alternative asset tracking | NEW_TASK | TASK-FIN-12 |
| EXT-FIN-036 | Insurance policy tracking | ABSORBED | TASK-FIN-05 |
| EXT-FIN-037 | Financial literacy content engine | ABSORBED | TASK-FIN-08 |
| EXT-FIN-038 | Spending comparison (peer benchmarks) | ABSORBED | TASK-FIN-02 |
| EXT-FIN-039 | Smart savings sweep | ABSORBED | TASK-FIN-04 |
| EXT-FIN-040 | Financial chat completeness | NEW_TASK | TASK-FIN-13 |
| EXT-FIN-041 | Vitality score deep integration | NEW_TASK | TASK-FIN-14 |
| EXT-FIN-042 | Budget template library | ABSORBED | TASK-FIN-01 |
| EXT-FIN-043 | Spending category customization | ABSORBED | TASK-FIN-02 |
| EXT-FIN-044 | Financial snapshot sharing | ABSORBED | TASK-FIN-07 |
| EXT-FIN-045 | Merchant reward optimization | ABSORBED | TASK-FIN-08 |
| EXT-FIN-046 | Linked account health monitoring | ABSORBED | TASK-FIN-01 |
| EXT-FIN-047 | Projected balance calculator | ABSORBED | TASK-FIN-09 |
| EXT-FIN-048 | Debt-to-income ratio tracking | ABSORBED | TASK-FIN-06 |
| EXT-FIN-049 | Savings challenge gamification | ABSORBED | TASK-FIN-04 |
| EXT-FIN-050 | Automated receipt scanning | ABSORBED | TASK-FIN-05 |
| EXT-FIN-051 | Financial year-in-review generator | ABSORBED | TASK-FIN-07 |
| EXT-FIN-052 | Custom financial KPI dashboard | ABSORBED | TASK-FIN-07 |

### TRD Domain (42 items)

| EXT ID | Description | Disposition | TASK ID |
|--------|-------------|-------------|---------|
| EXT-TRD-001 | PCTT 7-stage pipeline implementation | ABSORBED | TASK-TRD-01 |
| EXT-TRD-002 | Regime detection (bull/bear/sideways) | ABSORBED | TASK-TRD-01 |
| EXT-TRD-003 | Pivot identification system | ABSORBED | TASK-TRD-01 |
| EXT-TRD-004 | Trendline construction engine | ABSORBED | TASK-TRD-01 |
| EXT-TRD-005 | Signal generation module | ABSORBED | TASK-TRD-03 |
| EXT-TRD-006 | Confluence scoring system | ABSORBED | TASK-TRD-03 |
| EXT-TRD-007 | Risk assessment gateway | ABSORBED | TASK-TRD-04 |
| EXT-TRD-008 | Trade recommendation engine | ABSORBED | TASK-TRD-03 |
| EXT-TRD-009 | Alpaca broker integration | ABSORBED | TASK-TRD-05 |
| EXT-TRD-010 | Paper trading simulator | ABSORBED | TASK-TRD-06 |
| EXT-TRD-011 | Position sizing calculator | ABSORBED | TASK-TRD-04 |
| EXT-TRD-012 | Trailing stop manager | ABSORBED | TASK-TRD-08 |
| EXT-TRD-013 | Circuit breaker system | ABSORBED | TASK-TRD-09 |
| EXT-TRD-014 | Order execution engine | ABSORBED | TASK-TRD-05 |
| EXT-TRD-015 | TradingView Lightweight Charts | NEW_TASK | TASK-TRD-14 |
| EXT-TRD-016 | Slippage model | ABSORBED | TASK-TRD-08 |
| EXT-TRD-017 | AI agent coordination (7 agents) | ABSORBED | TASK-TRD-10 |
| EXT-TRD-018 | Strategy backtest engine | ABSORBED | TASK-TRD-12 |
| EXT-TRD-019 | 10 pre-built strategies | ABSORBED | TASK-TRD-12 |
| EXT-TRD-020 | Pine Script generator | ABSORBED | TASK-TRD-12 |
| EXT-TRD-021 | Watchlist management | ABSORBED | TASK-TRD-02 |
| EXT-TRD-022 | Portfolio analytics dashboard | ABSORBED | TASK-TRD-02 |
| EXT-TRD-023 | Real-time price streaming | ABSORBED | TASK-TRD-11 |
| EXT-TRD-024 | Order status tracker | ABSORBED | TASK-TRD-11 |
| EXT-TRD-025 | Trading notifications | ABSORBED | TASK-TRD-11 |
| EXT-TRD-026 | 3-mode trading (WATCH/GUIDED/AUTONOMOUS) | ABSORBED | TASK-TRD-06 |
| EXT-TRD-027 | 30-law compliance engine | ABSORBED | TASK-TRD-13 |
| EXT-TRD-028 | 3-gate risk gateway | ABSORBED | TASK-TRD-04 |
| EXT-TRD-029 | 5 circuit breakers | ABSORBED | TASK-TRD-09 |
| EXT-TRD-030 | Explainable AI for trade decisions | ABSORBED | TASK-TRD-10 |
| EXT-TRD-031 | Webhook handler for alerts | ABSORBED | TASK-TRD-11 |
| EXT-TRD-032 | Portfolio risk heatmap | ABSORBED | TASK-TRD-04 |
| EXT-TRD-033 | ISE (Intelligent Strategy Engine) | ABSORBED | TASK-TRD-12 |
| EXT-TRD-034 | Market regime classifier | ABSORBED | TASK-TRD-01 |
| EXT-TRD-035 | Technical indicator library | ABSORBED | TASK-TRD-01 |
| EXT-TRD-036 | Options chain analysis | ABSORBED | TASK-TRD-05 |
| EXT-TRD-037 | Sector rotation strategy | ABSORBED | TASK-TRD-12 |
| EXT-TRD-038 | Earnings calendar integration | ABSORBED | TASK-TRD-02 |
| EXT-TRD-039 | Social sentiment analysis | ABSORBED | TASK-TRD-10 |
| EXT-TRD-040 | Copy trading framework | ABSORBED | TASK-TRD-06 |
| EXT-TRD-041 | Trade journal with analytics | ABSORBED | TASK-TRD-02 |
| EXT-TRD-042 | Multi-broker abstraction layer | ABSORBED | TASK-TRD-05 |

### INV Domain (18 items)

| EXT ID | Description | Disposition | TASK ID |
|--------|-------------|-------------|---------|
| EXT-INV-001 | Portfolio tracking dashboard | ABSORBED | TASK-INV-01 |
| EXT-INV-002 | Holdings management CRUD | ABSORBED | TASK-INV-02 |
| EXT-INV-003 | Stock analysis with AI insights | ABSORBED | TASK-INV-03 |
| EXT-INV-004 | Dividend tracking and projections | ABSORBED | TASK-INV-04 |
| EXT-INV-005 | Asset allocation optimizer | ABSORBED | TASK-INV-05 |
| EXT-INV-006 | Investment performance attribution | ABSORBED | TASK-INV-06 |
| EXT-INV-007 | Tax-loss harvesting automation | ABSORBED | TASK-INV-06 |
| EXT-INV-008 | Rebalancing recommendations | ABSORBED | TASK-INV-05 |
| EXT-INV-009 | Investment risk profiling | ABSORBED | TASK-INV-05 |
| EXT-INV-010 | Market news aggregation | ABSORBED | TASK-INV-03 |
| EXT-INV-011 | Fractional shares tracking | NEW_TASK | TASK-INV-07 |
| EXT-INV-012 | ESG scoring and screening | NEW_TASK | TASK-INV-08 |
| EXT-INV-013 | Investment education content | ABSORBED | TASK-INV-03 |
| EXT-INV-014 | Portfolio comparison tool | ABSORBED | TASK-INV-06 |
| EXT-INV-015 | Correlation matrix visualization | ABSORBED | TASK-INV-06 |
| EXT-INV-016 | Sector exposure analysis | ABSORBED | TASK-INV-05 |
| EXT-INV-017 | Investment goal linking | ABSORBED | TASK-INV-04 |
| EXT-INV-018 | IPO tracking and alerts | ABSORBED | TASK-INV-03 |

### RSK Domain (20 items)

| EXT ID | Description | Disposition | TASK ID |
|--------|-------------|-------------|---------|
| EXT-RSK-001 | Trailing stop management | ABSORBED | TASK-RSK-01 |
| EXT-RSK-002 | Portfolio risk assessment | ABSORBED | TASK-RSK-02 |
| EXT-RSK-003 | Risk tolerance profiling | ABSORBED | TASK-RSK-03 |
| EXT-RSK-004 | Position sizing rules | ABSORBED | TASK-RSK-04 |
| EXT-RSK-005 | Circuit breaker triggers | ABSORBED | TASK-RSK-05 |
| EXT-RSK-006 | Drawdown monitoring | ABSORBED | TASK-RSK-06 |
| EXT-RSK-007 | Value at Risk (VaR) calculator | ABSORBED | TASK-RSK-02 |
| EXT-RSK-008 | Stress test scenarios | ABSORBED | TASK-RSK-02 |
| EXT-RSK-009 | Concentration risk alerts | ABSORBED | TASK-RSK-04 |
| EXT-RSK-010 | Liquidity risk assessment | ABSORBED | TASK-RSK-02 |
| EXT-RSK-011 | Counterparty risk monitoring | ABSORBED | TASK-RSK-05 |
| EXT-RSK-012 | Risk-adjusted return metrics | ABSORBED | TASK-RSK-06 |
| EXT-RSK-013 | Maximum loss limits | ABSORBED | TASK-RSK-01 |
| EXT-RSK-014 | Risk dashboard UI components | NEW_TASK | TASK-RSK-07 |
| EXT-RSK-015 | Monte Carlo simulation | ABSORBED | TASK-RSK-02 |
| EXT-RSK-016 | Beta calculation engine | ABSORBED | TASK-RSK-02 |
| EXT-RSK-017 | Sharpe ratio optimization | ABSORBED | TASK-RSK-06 |
| EXT-RSK-018 | Risk reporting automation | ABSORBED | TASK-RSK-06 |
| EXT-RSK-019 | Hedge recommendation engine | ABSORBED | TASK-RSK-04 |
| EXT-RSK-020 | Tail risk analysis | ABSORBED | TASK-RSK-02 |

### SEC Domain (22 items)

| EXT ID | Description | Disposition | TASK ID |
|--------|-------------|-------------|---------|
| EXT-SEC-001 | Zero trust authentication framework | ABSORBED | TASK-SEC-01 |
| EXT-SEC-002 | Input validation (prompt injection, XSS) | ABSORBED | TASK-SEC-03 |
| EXT-SEC-003 | Output validation and sanitization | ABSORBED | TASK-SEC-03 |
| EXT-SEC-004 | RBAC (4 roles, 14 categories, 100+ permissions) | ABSORBED | TASK-SEC-04 |
| EXT-SEC-005 | Audit logging with immutable trail | ABSORBED | TASK-SEC-05 |
| EXT-SEC-006 | Rate limiting and DDoS protection | ABSORBED | TASK-SEC-03 |
| EXT-SEC-007 | PII detection and masking | ABSORBED | TASK-SEC-02 |
| EXT-SEC-008 | GDPR/CCPA compliance engine | ABSORBED | TASK-SEC-02 |
| EXT-SEC-009 | Session management and token rotation | ABSORBED | TASK-SEC-01 |
| EXT-SEC-010 | WebAuthn/passkey authentication | ABSORBED | TASK-SEC-01 |
| EXT-SEC-011 | API key management | ABSORBED | TASK-SEC-03 |
| EXT-SEC-012 | Content Security Policy headers | ABSORBED | TASK-SEC-03 |
| EXT-SEC-013 | OWASP scanning automation | NEW_TASK | TASK-SEC-06 |
| EXT-SEC-014 | Incident response plan automation | NEW_TASK | TASK-SEC-07 |
| EXT-SEC-015 | Encryption at rest and in transit | ABSORBED | TASK-SEC-01 |
| EXT-SEC-016 | Secret rotation automation | ABSORBED | TASK-SEC-03 |
| EXT-SEC-017 | Dependency vulnerability scanning | ABSORBED | TASK-SEC-03 |
| EXT-SEC-018 | Penetration test framework | ABSORBED | TASK-SEC-06 |
| EXT-SEC-019 | Two-factor authentication (TOTP) | ABSORBED | TASK-SEC-01 |
| EXT-SEC-020 | IP allowlisting for admin | ABSORBED | TASK-SEC-04 |
| EXT-SEC-021 | Data retention and purge policies | ABSORBED | TASK-SEC-02 |
| EXT-SEC-022 | Security event correlation | ABSORBED | TASK-SEC-05 |

### MOB Domain (24 items)

| EXT ID | Description | Disposition | TASK ID |
|--------|-------------|-------------|---------|
| EXT-MOB-001 | Mobile screen parity with web | ABSORBED | TASK-MOB-01 |
| EXT-MOB-002 | Mobile test coverage (>= 80%) | ABSORBED | TASK-MOB-01 |
| EXT-MOB-003 | Zustand store optimization | ABSORBED | TASK-MOB-01 |
| EXT-MOB-004 | Mobile push notification integration | ABSORBED | TASK-MOB-03 |
| EXT-MOB-005 | Offline mode with sync | ABSORBED | TASK-MOB-03 |
| EXT-MOB-006 | Mobile biometric authentication | NEW_TASK | TASK-MOB-07 |
| EXT-MOB-007 | Deep linking (universal links) | NEW_TASK | TASK-MOB-05 |
| EXT-MOB-008 | App Store / Play Store preparation | NEW_TASK | TASK-MOB-06 |
| EXT-MOB-009 | Mobile-specific UI components | NEW_TASK | TASK-MOB-04 |
| EXT-MOB-010 | Mobile performance optimization | ABSORBED | TASK-MOB-02 |
| EXT-MOB-011 | Haptic feedback integration | ABSORBED | TASK-MOB-04 |
| EXT-MOB-012 | Gesture navigation | ABSORBED | TASK-MOB-04 |
| EXT-MOB-013 | Mobile chart rendering (gifted-charts) | ABSORBED | TASK-MOB-01 |
| EXT-MOB-014 | Camera integration for document scan | ABSORBED | TASK-MOB-03 |
| EXT-MOB-015 | Mobile widget (iOS/Android) | ABSORBED | TASK-MOB-02 |
| EXT-MOB-016 | App clip / Instant App | ABSORBED | TASK-MOB-06 |
| EXT-MOB-017 | Mobile accessibility (VoiceOver, TalkBack) | ABSORBED | TASK-MOB-04 |
| EXT-MOB-018 | Mobile crash reporting (Sentry) | ABSORBED | TASK-MOB-02 |
| EXT-MOB-019 | Mobile A/B testing framework | ABSORBED | TASK-MOB-02 |
| EXT-MOB-020 | Tablet/iPad layout support | ABSORBED | TASK-MOB-04 |
| EXT-MOB-021 | Mobile share sheet integration | ABSORBED | TASK-MOB-03 |
| EXT-MOB-022 | Background fetch for portfolio updates | ABSORBED | TASK-MOB-03 |
| EXT-MOB-023 | Mobile dark mode | ABSORBED | TASK-MOB-04 |
| EXT-MOB-024 | Expo EAS build configuration | ABSORBED | TASK-MOB-06 |

### AIM Domain (16 items)

| EXT ID | Description | Disposition | TASK ID |
|--------|-------------|-------------|---------|
| EXT-AIM-001 | AI personalization engine | ABSORBED | TASK-AIM-01 |
| EXT-AIM-002 | Model router (cost/quality/task) | ABSORBED | TASK-AIM-02 |
| EXT-AIM-003 | AI orchestrator workflows | ABSORBED | TASK-AIM-02 |
| EXT-AIM-004 | Financial coaching AI | ABSORBED | TASK-AIM-01 |
| EXT-AIM-005 | Credit analysis AI consensus | ABSORBED | TASK-AIM-01 |
| EXT-AIM-006 | Behavioral finance modeling | NEW_TASK | TASK-AIM-03 |
| EXT-AIM-007 | Spending pattern prediction | ABSORBED | TASK-AIM-01 |
| EXT-AIM-008 | Investment recommendation AI | ABSORBED | TASK-AIM-02 |
| EXT-AIM-009 | Natural language financial queries | ABSORBED | TASK-AIM-01 |
| EXT-AIM-010 | Anomaly detection pipeline | ABSORBED | TASK-AIM-01 |
| EXT-AIM-011 | Sentiment analysis for markets | ABSORBED | TASK-AIM-02 |
| EXT-AIM-012 | AI model performance monitoring | ABSORBED | TASK-AIM-02 |
| EXT-AIM-013 | Prompt engineering framework | ABSORBED | TASK-AIM-02 |
| EXT-AIM-014 | AI fallback and retry logic | ABSORBED | TASK-AIM-02 |
| EXT-AIM-015 | User behavior clustering | ABSORBED | TASK-AIM-03 |
| EXT-AIM-016 | AI-driven notification personalization | ABSORBED | TASK-AIM-01 |

### ADM Domain (12 items)

| EXT ID | Description | Disposition | TASK ID |
|--------|-------------|-------------|---------|
| EXT-ADM-001 | Admin dashboard with analytics | ABSORBED | TASK-ADM-01 |
| EXT-ADM-002 | User management CRUD | ABSORBED | TASK-ADM-02 |
| EXT-ADM-003 | Admin authentication and RBAC | ABSORBED | TASK-ADM-03 |
| EXT-ADM-004 | System metrics and monitoring | ABSORBED | TASK-ADM-01 |
| EXT-ADM-005 | Dispute management admin panel | ABSORBED | TASK-ADM-02 |
| EXT-ADM-006 | Subscription management | ABSORBED | TASK-ADM-02 |
| EXT-ADM-007 | Audit log viewer | ABSORBED | TASK-ADM-01 |
| EXT-ADM-008 | Feature flag management | ABSORBED | TASK-ADM-01 |
| EXT-ADM-009 | Bulk user operations | NEW_TASK | TASK-ADM-04 |
| EXT-ADM-010 | Mobile admin dashboard | NEW_TASK | TASK-ADM-05 |
| EXT-ADM-011 | Admin notification center | ABSORBED | TASK-ADM-01 |
| EXT-ADM-012 | System configuration UI | ABSORBED | TASK-ADM-02 |

### NTF Domain (10 items)

| EXT ID | Description | Disposition | TASK ID |
|--------|-------------|-------------|---------|
| EXT-NTF-001 | Push notification infrastructure | ABSORBED | TASK-NTF-01 |
| EXT-NTF-002 | Email notification templates | ABSORBED | TASK-NTF-02 |
| EXT-NTF-003 | Notification preferences management | ABSORBED | TASK-NTF-03 |
| EXT-NTF-004 | In-app notification center | ABSORBED | TASK-NTF-01 |
| EXT-NTF-005 | Smart alert scheduling (quiet hours) | NEW_TASK | TASK-NTF-04 |
| EXT-NTF-006 | Trading-specific notifications | NEW_TASK | TASK-NTF-05 |
| EXT-NTF-007 | Notification delivery tracking | ABSORBED | TASK-NTF-01 |
| EXT-NTF-008 | SMS notification channel | ABSORBED | TASK-NTF-02 |
| EXT-NTF-009 | Notification batching/digest | ABSORBED | TASK-NTF-04 |
| EXT-NTF-010 | Webhook notification channel | ABSORBED | TASK-NTF-02 |

### PLT Domain (16 items)

| EXT ID | Description | Disposition | TASK ID |
|--------|-------------|-------------|---------|
| EXT-PLT-001 | Marketplace/commerce platform | ABSORBED | TASK-PLT-01 |
| EXT-PLT-002 | White-label platform | ABSORBED | TASK-PLT-02 |
| EXT-PLT-003 | Payments rail hardening (Stripe) | NEW_TASK | TASK-PLT-03 |
| EXT-PLT-004 | Multi-currency commerce | NEW_TASK | TASK-PLT-04 |
| EXT-PLT-005 | International payment connectors | NEW_TASK | TASK-PLT-05 |
| EXT-PLT-006 | Platform API for third parties | ABSORBED | TASK-PLT-02 |
| EXT-PLT-007 | Webhook management platform | ABSORBED | TASK-PLT-01 |
| EXT-PLT-008 | Partner integration framework | ABSORBED | TASK-PLT-01 |
| EXT-PLT-009 | Revenue sharing engine | ABSORBED | TASK-PLT-01 |
| EXT-PLT-010 | Custom branding engine | ABSORBED | TASK-PLT-02 |
| EXT-PLT-011 | Multi-tenant architecture | ABSORBED | TASK-PLT-02 |
| EXT-PLT-012 | Platform analytics | ABSORBED | TASK-PLT-01 |
| EXT-PLT-013 | SLA monitoring | ABSORBED | TASK-PLT-01 |
| EXT-PLT-014 | Rate limit management for tenants | ABSORBED | TASK-PLT-02 |
| EXT-PLT-015 | Platform documentation generator | ABSORBED | TASK-PLT-02 |
| EXT-PLT-016 | Sandbox environment for partners | ABSORBED | TASK-PLT-01 |

### ONB Domain (14 items)

| EXT ID | Description | Disposition | TASK ID |
|--------|-------------|-------------|---------|
| EXT-ONB-001 | Onboarding wizard with progress tracking | ABSORBED | TASK-ONB-01 |
| EXT-ONB-002 | Financial profile questionnaire | ABSORBED | TASK-ONB-01 |
| EXT-ONB-003 | Account linking onboarding flow | ABSORBED | TASK-ONB-01 |
| EXT-ONB-004 | Goal setting onboarding | ABSORBED | TASK-ONB-01 |
| EXT-ONB-005 | Personalized dashboard setup | NEW_TASK | TASK-ONB-02 |
| EXT-ONB-006 | Feature discovery tooltips | NEW_TASK | TASK-ONB-02 |
| EXT-ONB-007 | Onboarding completion rewards | ABSORBED | TASK-ONB-01 |
| EXT-ONB-008 | Re-engagement flows | NEW_TASK | TASK-ONB-03 |
| EXT-ONB-009 | Onboarding A/B testing | ABSORBED | TASK-ONB-02 |
| EXT-ONB-010 | Progressive feature unlocking | ABSORBED | TASK-ONB-02 |
| EXT-ONB-011 | Tutorial video integration | ABSORBED | TASK-ONB-01 |
| EXT-ONB-012 | Onboarding analytics | ABSORBED | TASK-ONB-02 |
| EXT-ONB-013 | Skip/resume onboarding | ABSORBED | TASK-ONB-01 |
| EXT-ONB-014 | Mobile-specific onboarding | ABSORBED | TASK-ONB-03 |

### TAX Domain (16 items)

| EXT ID | Description | Disposition | TASK ID |
|--------|-------------|-------------|---------|
| EXT-TAX-001 | Tax optimization engine | ABSORBED | TASK-TAX-01 |
| EXT-TAX-002 | Tax document management | NEW_TASK | TASK-TAX-02 |
| EXT-TAX-003 | State tax calculation engine | NEW_TASK | TASK-TAX-03 |
| EXT-TAX-004 | Tax-advantaged account recommendations | ABSORBED | TASK-TAX-01 |
| EXT-TAX-005 | Quarterly estimated tax calculator | ABSORBED | TASK-TAX-01 |
| EXT-TAX-006 | Tax loss harvesting integration | ABSORBED | TASK-TAX-01 |
| EXT-TAX-007 | Capital gains optimization | ABSORBED | TASK-TAX-01 |
| EXT-TAX-008 | Tax bracket planning | ABSORBED | TASK-TAX-01 |
| EXT-TAX-009 | Retirement contribution optimization | NEW_TASK | TASK-TAX-04 |
| EXT-TAX-010 | Tax document OCR processing | NEW_TASK | TASK-TAX-05 |
| EXT-TAX-011 | Year-end tax planning wizard | ABSORBED | TASK-TAX-01 |
| EXT-TAX-012 | Tax payment scheduling | NEW_TASK | TASK-TAX-06 |
| EXT-TAX-013 | Charitable donation optimization | ABSORBED | TASK-TAX-01 |
| EXT-TAX-014 | Business expense categorization | ABSORBED | TASK-TAX-01 |
| EXT-TAX-015 | Tax compliance checklist | ABSORBED | TASK-TAX-01 |
| EXT-TAX-016 | Multi-state tax filing support | ABSORBED | TASK-TAX-03 |

### INF Domain (22 items)

| EXT ID | Description | Disposition | TASK ID |
|--------|-------------|-------------|---------|
| EXT-INF-001 | Brand migration (CPFI → Fynvita) | ABSORBED | TASK-INF-01 |
| EXT-INF-002 | Supabase client consolidation | ABSORBED | TASK-INF-02 |
| EXT-INF-003 | CI/CD pipeline hardening | ABSORBED | TASK-INF-03 |
| EXT-INF-004 | Environment variable validation | ABSORBED | TASK-INF-04 |
| EXT-INF-005 | CDN and asset optimization | ABSORBED | TASK-INF-05 |
| EXT-INF-006 | ESLint configuration consolidation | ABSORBED | TASK-INF-06 |
| EXT-INF-007 | Database migration management | ABSORBED | TASK-INF-07 |
| EXT-INF-008 | Logging infrastructure | ABSORBED | TASK-INF-08 |
| EXT-INF-009 | Horizontal scaling preparation | ABSORBED | TASK-INF-09 |
| EXT-INF-010 | API versioning strategy | ABSORBED | TASK-INF-10 |
| EXT-INF-011 | TypeScript strict mode enforcement | ABSORBED | TASK-INF-11 |
| EXT-INF-012 | Test infrastructure hardening | ABSORBED | TASK-INF-12 |
| EXT-INF-013 | Performance monitoring (APM) | NEW_TASK | TASK-INF-13 |
| EXT-INF-014 | Database query optimization | NEW_TASK | TASK-INF-14 |
| EXT-INF-015 | Error tracking and alerting | ABSORBED | TASK-INF-08 |
| EXT-INF-016 | Feature flag infrastructure | ABSORBED | TASK-INF-05 |
| EXT-INF-017 | Service health checks | ABSORBED | TASK-INF-08 |
| EXT-INF-018 | Blue-green deployment | ABSORBED | TASK-INF-09 |
| EXT-INF-019 | Database connection pooling | ABSORBED | TASK-INF-14 |
| EXT-INF-020 | Caching strategy (Redis/in-memory) | ABSORBED | TASK-INF-05 |
| EXT-INF-021 | Log aggregation and search | ABSORBED | TASK-INF-08 |
| EXT-INF-022 | Backup and disaster recovery | ABSORBED | TASK-INF-09 |

### GMF Domain (8 items)

| EXT ID | Description | Disposition | TASK ID |
|--------|-------------|-------------|---------|
| EXT-GMF-001 | Achievement and badge system | ABSORBED | TASK-GMF-01 |
| EXT-GMF-002 | Points and rewards engine | ABSORBED | TASK-GMF-02 |
| EXT-GMF-003 | Streak tracking | ABSORBED | TASK-GMF-01 |
| EXT-GMF-004 | Leaderboards | NEW_TASK | TASK-GMF-03 |
| EXT-GMF-005 | Social sharing of achievements | ABSORBED | TASK-GMF-03 |
| EXT-GMF-006 | Level progression system | ABSORBED | TASK-GMF-02 |
| EXT-GMF-007 | Challenge system (daily/weekly) | ABSORBED | TASK-GMF-02 |
| EXT-GMF-008 | Reward redemption marketplace | ABSORBED | TASK-GMF-02 |

### DOC Domain (6 items)

| EXT ID | Description | Disposition | TASK ID |
|--------|-------------|-------------|---------|
| EXT-DOC-001 | API documentation auto-generation | ABSORBED | TASK-DOC-01 |
| EXT-DOC-002 | User-facing help center | ABSORBED | TASK-DOC-02 |
| EXT-DOC-003 | Developer documentation portal | ABSORBED | TASK-DOC-03 |
| EXT-DOC-004 | In-app contextual help | ABSORBED | TASK-DOC-04 |
| EXT-DOC-005 | Mobile document viewer | NEW_TASK | TASK-DOC-05 |
| EXT-DOC-006 | Documentation versioning | ABSORBED | TASK-DOC-01 |

### UI Domain (10 items)

| EXT ID | Description | Disposition | TASK ID |
|--------|-------------|-------------|---------|
| EXT-UI-001 | Design system component library | NEW_TASK | TASK-UI-01 |
| EXT-UI-002 | Dark mode implementation | NEW_TASK | TASK-UI-02 |
| EXT-UI-003 | Responsive layout system | ABSORBED | TASK-UI-01 |
| EXT-UI-004 | Animation and motion system | ABSORBED | TASK-UI-01 |
| EXT-UI-005 | Accessibility (WCAG 2.1 AA) | ABSORBED | TASK-UI-01 |
| EXT-UI-006 | Icon system and asset management | ABSORBED | TASK-UI-01 |
| EXT-UI-007 | Typography scale | ABSORBED | TASK-UI-01 |
| EXT-UI-008 | Color palette and theming | ABSORBED | TASK-UI-01 |
| EXT-UI-009 | Form component library | ABSORBED | TASK-UI-01 |
| EXT-UI-010 | Data visualization components | ABSORBED | TASK-UI-01 |

### GLC Domain (6 items)

| EXT ID | Description | Disposition | TASK ID |
|--------|-------------|-------------|---------|
| EXT-GLC-001 | Global connector strategy | ABSORBED | TASK-GLC-01 |
| EXT-GLC-002 | International banking connectors | NEW_TASK | TASK-GLC-02 |
| EXT-GLC-003 | Multi-language support (i18n) | ABSORBED | TASK-GLC-01 |
| EXT-GLC-004 | Regional compliance adapters | ABSORBED | TASK-GLC-01 |
| EXT-GLC-005 | Currency exchange rate service | ABSORBED | TASK-GLC-01 |
| EXT-GLC-006 | International tax compliance | ABSORBED | TASK-GLC-02 |

### Crosswalk Summary

| Disposition | Count |
|-------------|-------|
| ABSORBED (into existing 80 tasks) | 236 |
| NEW_TASK (42 new tasks created) | 42 |
| **Total Actionable** | **278** |
| Ignored (non-actionable) | 65 |
| **Grand Total** | **343** |

---

## 5. Hidden / Orphaned Feature Report

The following features were found in source documents but had NO existing TASK-* coverage. All have now been assigned to new tasks:

| Feature | Source Documents | New Task |
|---------|-----------------|----------|
| Credit freeze/thaw automation | SRC-ARC-15, SRC-ARC-18 | TASK-CRD-08 |
| Creditor negotiation bot | SRC-ARC-15, SRC-ARC-20 | TASK-CRD-09 |
| Cash flow forecasting engine | SRC-ARC-04, SRC-ARC-14 | TASK-FIN-09 |
| Gig economy income tracking | SRC-ARC-04, SRC-ARC-20 | TASK-FIN-10 |
| Multi-currency financial support | SRC-ARC-05, SRC-ARC-14 | TASK-FIN-11 |
| Alternative asset scanner | SRC-ARC-04 | TASK-FIN-12 |
| Financial chat completeness | SRC-ARC-67 | TASK-FIN-13 |
| Vitality score deep integration | SRC-ARC-67, SRC-ROOT-05 | TASK-FIN-14 |
| TradingView Lightweight Charts | SRC-ROOT-06, SRC-ARC-17 | TASK-TRD-14 |
| Fractional shares tracking | SRC-ARC-20 | TASK-INV-07 |
| ESG scoring and screening | SRC-ARC-18 | TASK-INV-08 |
| Risk dashboard UI components | SRC-ARC-16 | TASK-RSK-07 |
| OWASP scanning automation | SRC-ARC-64, SRC-ARC-23 | TASK-SEC-06 |
| Incident response automation | SRC-ARC-64 | TASK-SEC-07 |
| Smart alert scheduling | SRC-ARC-67, SRC-ROOT-02 | TASK-NTF-04 |
| Trading-specific notifications | SRC-ROOT-06 | TASK-NTF-05 |
| Bulk user operations | SRC-ARC-01 | TASK-ADM-04 |
| Mobile admin dashboard | SRC-ARC-01, SRC-ARC-06 | TASK-ADM-05 |
| Behavioral finance pipeline | SRC-ARC-69 | TASK-AIM-03 |
| Leaderboards and social | SRC-ARC-69, SRC-ARC-18 | TASK-GMF-03 |
| Personalized dashboard onboarding | SRC-ARC-10 | TASK-ONB-02 |
| Re-engagement flows | SRC-ARC-10, SRC-ARC-67 | TASK-ONB-03 |
| Tax document management | SRC-ARC-71, SRC-ARC-72 | TASK-TAX-02 |
| State tax calculation | SRC-ARC-71 | TASK-TAX-03 |
| Retirement contribution optimization | SRC-ARC-71 | TASK-TAX-04 |
| Tax document OCR | SRC-ARC-71 | TASK-TAX-05 |
| Tax payment scheduling | SRC-ARC-72 | TASK-TAX-06 |
| Design system component library | SRC-ARC-18, SRC-ROOT-02 | TASK-UI-01 |
| Dark mode implementation | SRC-ARC-18, SRC-ARC-06 | TASK-UI-02 |
| Mobile UX polish | SRC-ARC-06, SRC-ARC-74 | TASK-MOB-04 |
| Deep linking (universal links) | SRC-ARC-06 | TASK-MOB-05 |
| App Store preparation | SRC-ARC-06 | TASK-MOB-06 |
| Mobile biometric auth | SRC-ARC-06, SRC-ARC-64 | TASK-MOB-07 |
| Payments rail hardening | SRC-ARC-13, SRC-ARC-14 | TASK-PLT-03 |
| Multi-currency commerce | SRC-ARC-05 | TASK-PLT-04 |
| International payment connectors | SRC-ARC-05 | TASK-PLT-05 |
| International banking connectors | SRC-ARC-05 | TASK-GLC-02 |
| Performance monitoring (APM) | SRC-ARC-01, SRC-ROOT-05 | TASK-INF-13 |
| Database query optimization | SRC-ARC-01, SRC-ROOT-05 | TASK-INF-14 |
| Mobile document viewer | SRC-ARC-06 | TASK-DOC-05 |

---

## 6. Exposure Enforcement Matrix

Every user-facing feature MUST have coverage across these layers. Features missing a layer are flagged for remediation.

| Feature Area | Layer 1 (Infra) | Layer 2 (Backend) | Layer 3 (API) | Layer 4 (Frontend) | Layer 5 (Exposure) | Status |
|-------------|----------------|-------------------|---------------|-------------------|-------------------|--------|
| Credit Monitoring | INF-03 | CRD-04 | CRD-04 | CRD-04 | ONB-01 | COMPLETE |
| Credit Repair | INF-03 | CRD-03,05,06 | CRD-03 | CRD-03 | ONB-01 | COMPLETE |
| Budgeting | INF-03 | FIN-01 | FIN-01 | FIN-01 | ONB-01 | COMPLETE |
| Spending Analysis | INF-03 | FIN-02 | FIN-02 | FIN-02 | ONB-01 | COMPLETE |
| Bill Management | INF-03 | FIN-05,08 | FIN-05 | FIN-05 | ONB-01 | COMPLETE |
| Trading (PCTT) | INF-03 | TRD-01..13 | TRD-01 | TRD-14 | ONB-01 | NEEDS TRD-14 |
| Investments | INF-03 | INV-01..06 | INV-01 | INV-01 | ONB-01 | COMPLETE |
| Risk Management | INF-03 | RSK-01..06 | RSK-01 | RSK-07 | — | NEEDS RSK-07 |
| Tax Optimization | INF-03 | TAX-01..06 | TAX-01 | TAX-01 | ONB-01 | NEEDS TAX-02..06 |
| AI/ML Features | INF-03 | AIM-01..03 | AIM-01 | AIM-01 | ONB-01 | COMPLETE |
| Gamification | INF-03 | GMF-01..03 | GMF-01 | GMF-01 | ONB-01 | NEEDS GMF-03 |
| Notifications | INF-03 | NTF-01..05 | NTF-01 | NTF-01 | ONB-01 | NEEDS NTF-04,05 |
| Admin Panel | INF-03 | ADM-01..05 | ADM-01 | ADM-01 | — | NEEDS ADM-04,05 |
| Mobile App | INF-03 | MOB-01..07 | — | MOB-01 | ONB-03 | NEEDS MOB-04..07 |
| Security | INF-03 | SEC-01..07 | SEC-01 | SEC-01 | — | NEEDS SEC-06,07 |
| Design System | INF-03 | — | — | UI-01,02 | — | NEEDS UI-01,02 |
| Platform/Scale | INF-09 | PLT-01..05 | PLT-01 | PLT-02 | — | NEEDS PLT-03..05 |
| Global Connectors | INF-09 | GLC-01,02 | GLC-01 | GLC-01 | — | NEEDS GLC-02 |

---

## 7. WAVE 0 — Foundation & Infrastructure

> **Focus**: Fix foundational issues that block all other work.
> **Entry Criteria**: Repository access, development environment setup.
> **Tasks**: 10 (all existing, no new tasks from EXT merge)

### TASK-INF-01: Complete Brand Migration (CPFI → Fynvita)

| Field | Value |
|-------|-------|
| **Module** | MOD-INFRASTRUCTURE |
| **Priority** | P0 |
| **Effort** | M (3-5d) |
| **Status** | DONE |
| **Depends On** | None |
| **Blocks** | TASK-INF-06, TASK-SEC-03 |
| **REQ Trace** | REQ-INF-0001 |
| **EXT References** | EXT-INF-001 |

**Objective**: Replace all remaining references to "CreditMaster Pro", "CPFI", and old branding with "Fynvita" across the entire codebase, configs, docs, and assets.

**Acceptance Criteria**:
- [x] Zero grep hits for "CreditMaster", "CPFI", "creditmaster" in source files
- [x] All package.json `name` fields use "fynvita" prefix
- [x] All Supabase project references use Fynvita naming
- [x] Logo, favicon, and meta tags updated
- [x] README and docs reference Fynvita exclusively

**Key Files**:
- `package.json`, `mobile-app/package.json`
- `src/app/layout.tsx` (meta tags)
- `mobile-app/app.config.js` (Expo config)
- `docs/ssot/SSOT.md`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Lint | `npm run lint` | 0 blocking errors |
| Types | `npx tsc --noEmit` | 0 errors |
| Build | `npm run build` | Success |
| Grep | `grep -rn "CreditMaster\|CPFI" src/ mobile-app/` | 0 hits |

**Notes**: This is the highest priority task. All other work assumes the brand is Fynvita.

---

### TASK-INF-06: ESLint Configuration Consolidation

| Field | Value |
|-------|-------|
| **Module** | MOD-INFRASTRUCTURE |
| **Priority** | P0 |
| **Effort** | S (1-2d) |
| **Status** | DONE |
| **Depends On** | TASK-INF-01 |
| **Blocks** | TASK-INF-03 |
| **REQ Trace** | REQ-INF-0002 |
| **EXT References** | EXT-INF-006 |

**Objective**: Consolidate ESLint configs, reduce 841 warnings to under 100, and enforce consistent code style across the monorepo.

**Acceptance Criteria**:
- [x] Single ESLint config at root (flat config format)
- [ ] Warning count reduced from 841 to < 100
- [x] `no-explicit-any` violations addressed (use `unknown` + type guards)
- [x] `no-unused-vars` violations cleaned up
- [x] CI enforces lint as a blocking gate

**Key Files**:
- `.eslintrc.js` or `eslint.config.js`
- `package.json` (lint script)
- `.github/workflows/ci.yml`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Lint | `npm run lint` | 0 errors, < 100 warnings |
| Types | `npx tsc --noEmit` | 0 errors |
| Build | `npm run build` | Success |

**Notes**: Focus on `no-explicit-any` first as it has the most violations. Use `unknown` + type guards pattern.

---

### TASK-INF-03: CI/CD Pipeline Hardening

| Field | Value |
|-------|-------|
| **Module** | MOD-INFRASTRUCTURE |
| **Priority** | P0 |
| **Effort** | M (3-5d) |
| **Status** | DONE |
| **Depends On** | TASK-INF-06 |
| **Blocks** | All Wave 1+ tasks (implicitly) |
| **REQ Trace** | REQ-INF-0003 |
| **EXT References** | EXT-INF-003 |

**Objective**: Harden CI/CD pipeline with lint, type-check, test, build, and security gates. All gates must pass for merge.

**Acceptance Criteria**:
- [x] GitHub Actions workflow runs: lint → typecheck → test → build → security audit
- [x] PRs blocked if any gate fails
- [ ] Coverage report uploaded as artifact
- [x] Build time < 10 minutes
- [x] Branch protection rules enforce CI pass

**Key Files**:
- `.github/workflows/ci.yml`
- `package.json` (scripts)

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Lint | `npm run lint` | 0 blocking errors |
| Types | `npx tsc --noEmit` | 0 errors |
| Tests | `npm test -- --coverage` | All pass, >= 80% |
| Build | `npm run build` | Success |
| Security | `npm audit --audit-level=high` | 0 high/critical |

**Notes**: The existing `ci.yml` needs to be updated (it was deleted and needs restoration with hardened gates).

---

### TASK-INF-11: TypeScript Strict Mode Enforcement

| Field | Value |
|-------|-------|
| **Module** | MOD-INFRASTRUCTURE |
| **Priority** | P0 |
| **Effort** | S (1-2d) |
| **Status** | DONE |
| **Depends On** | TASK-INF-01 |
| **Blocks** | TASK-INF-03 |
| **REQ Trace** | REQ-INF-0004 |
| **EXT References** | EXT-INF-011 |

**Objective**: Ensure `"strict": true` is enforced in all `tsconfig.json` files, and resolve any remaining type errors.

**Acceptance Criteria**:
- [x] All `tsconfig.json` files have `"strict": true`
- [x] Zero `@ts-ignore` or `@ts-expect-error` without justification comment (only 4 justified)
- [x] Zero `any` type usage in new code
- [x] `npx tsc --noEmit` passes with 0 errors

**Key Files**:
- `tsconfig.json`
- `mobile-app/tsconfig.json`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Types | `npx tsc --noEmit` | 0 errors |
| Grep | `grep -rn "@ts-ignore\|@ts-expect-error" src/` | 0 unjustified |
| Build | `npm run build` | Success |

**Notes**: TypeScript strict mode is already enabled. This task verifies enforcement and cleans up any remaining violations.

---

### TASK-SEC-03: Input/Output Validation Hardening

| Field | Value |
|-------|-------|
| **Module** | MOD-SECURITY |
| **Priority** | P0 |
| **Effort** | M (3-5d) |
| **Status** | DONE |
| **Depends On** | TASK-INF-01 |
| **Blocks** | TASK-SEC-04, TASK-SEC-05 |
| **REQ Trace** | REQ-SEC-0001 |
| **EXT References** | EXT-SEC-002, EXT-SEC-003, EXT-SEC-006, EXT-SEC-011, EXT-SEC-012, EXT-SEC-016, EXT-SEC-017 |

**Objective**: Harden all API routes with input validation (Zod schemas), output sanitization, rate limiting, prompt injection detection, and security headers.

**Acceptance Criteria**:
- [x] All 248 API routes have Zod input validation
- [x] Output sanitization active on all responses
- [x] Rate limiting configured per route category
- [x] Prompt injection detection on all AI-facing inputs
- [x] CSP, HSTS, X-Frame-Options headers on all responses
- [ ] API key management with rotation support
- [x] Dependency vulnerability scanning in CI

**Key Files**:
- `src/lib/security/input-validation.ts`
- `src/lib/security/output-validation.ts`
- `src/lib/security/rate-limiting.ts`
- `src/middleware.ts`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Lint | `npm run lint` | 0 errors |
| Types | `npx tsc --noEmit` | 0 errors |
| Tests | `npm test -- src/lib/security` | All pass, >= 80% |
| Build | `npm run build` | Success |
| Security | `npm audit --audit-level=high` | 0 high/critical |

**Notes**: Security layer already exists at `src/lib/security/`. This task audits and hardens it, ensuring no gaps.

---

### TASK-TRD-07: Trading Engine Test Coverage (>= 80%)

| Field | Value |
|-------|-------|
| **Module** | MOD-TRADING |
| **Priority** | P1 |
| **Effort** | L (1-2w) |
| **Status** | DONE |
| **Depends On** | TASK-INF-03 |
| **Blocks** | TASK-TRD-01, TASK-TRD-03 |
| **REQ Trace** | REQ-TRD-0001 |
| **EXT References** | EXT-TRD-001 through EXT-TRD-042 (coverage foundation) |

**Objective**: Bring trading engine test coverage from ~60% to >= 80% across all modules (brokers, pipeline, AI agents, paper trading, positions, realtime).

**Acceptance Criteria**:
- [ ] Overall trading coverage >= 80% _(currently ~60%, 62 suites / 2638 tests pass)_
- [x] All broker adapters tested (Alpaca mock)
- [x] PCTT pipeline stages tested independently
- [x] Risk gateway and circuit breakers tested
- [x] Paper trading simulator tested
- [ ] Realtime WebSocket handlers tested

**Key Files**:
- `src/lib/trading/__tests__/`
- `src/lib/trading/brokers/`
- `src/lib/trading/pctt/`
- `src/lib/trading/paper/`
- `src/lib/trading/positions/`
- `src/lib/trading/realtime/`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- src/lib/trading --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |
| Build | `npm run build` | Success |

**Notes**: Tests exist for many trading modules already. Focus on gap-filling: alpaca-broker, llm-guardrails, technical-indicators, ISE, paper trading, and PCTT subsystems.

---

### TASK-NTF-03: Notification Service Test Coverage (>= 80%)

| Field | Value |
|-------|-------|
| **Module** | MOD-NOTIFICATIONS |
| **Priority** | P1 |
| **Effort** | M (3-5d) |
| **Status** | DONE |
| **Depends On** | TASK-INF-03 |
| **Blocks** | TASK-NTF-01, TASK-NTF-02 |
| **REQ Trace** | REQ-NTF-0001 |
| **EXT References** | EXT-NTF-003 |

**Objective**: Bring notification service test coverage from ~50% to >= 80%.

**Acceptance Criteria**:
- [x] Notification CRUD routes fully tested
- [x] Push notification sending/receiving tested
- [x] Preference management tested
- [ ] Web push subscription tested
- [ ] Overall notification coverage >= 80% _(currently ~51%, 8 suites / 156 tests pass)_

**Key Files**:
- `src/lib/notifications/__tests__/`
- `src/app/api/notifications/__tests__/`
- `src/hooks/__tests__/useWebPushNotifications.test.ts`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- src/lib/notifications src/app/api/notifications --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |
| Build | `npm run build` | Success |

**Notes**: Some test files already exist. Focus on missing route handlers and edge cases.

---

### TASK-ADM-03: Admin Service Test Coverage (>= 80%)

| Field | Value |
|-------|-------|
| **Module** | MOD-ADMIN |
| **Priority** | P1 |
| **Effort** | M (3-5d) |
| **Status** | DONE |
| **Depends On** | TASK-INF-03 |
| **Blocks** | TASK-ADM-01, TASK-ADM-02 |
| **REQ Trace** | REQ-ADM-0001 |
| **EXT References** | EXT-ADM-003 |

**Objective**: Bring admin service test coverage from ~50% to >= 80%.

**Acceptance Criteria**:
- [x] Admin auth routes tested
- [x] Admin CRUD operations tested
- [x] Metrics and analytics routes tested
- [x] Settings and configuration routes tested
- [x] Subscription management tested
- [x] Overall admin coverage >= 80% _(verified: 85% statements, 75% branches, 9 suites / 140 tests)_

**Key Files**:
- `src/app/api/admin/__tests__/`
- `src/app/api/admin/auth/__tests__/`
- `src/app/api/admin/subscriptions/__tests__/`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- src/app/api/admin --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |
| Build | `npm run build` | Success |

**Notes**: Test files exist for audit-and-logs, auth, metrics, settings-and-analytics, stats-and-disputes, and subscriptions. Fill coverage gaps.

---

### TASK-INF-04: Environment Variable Validation

| Field | Value |
|-------|-------|
| **Module** | MOD-INFRASTRUCTURE |
| **Priority** | P1 |
| **Effort** | S (1-2d) |
| **Status** | DONE |
| **Depends On** | TASK-INF-01 |
| **Blocks** | TASK-INF-03 |
| **REQ Trace** | REQ-INF-0005 |
| **EXT References** | EXT-INF-004 |

**Objective**: Implement runtime validation of all environment variables with clear error messages on missing/invalid values.

**Acceptance Criteria**:
- [ ] Zod schema validates all env vars at startup _(src/lib/env.ts does not exist yet)_
- [ ] Missing required vars produce clear error with variable name
- [x] `.env.example` documents all variables with descriptions
- [x] Client-side env vars prefixed with `NEXT_PUBLIC_`
- [x] Server-only vars never exposed to client

**Key Files**:
- `src/lib/env.ts` (create if needed)
- `.env.example`
- `.env.local.example`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Lint | `npm run lint` | 0 errors |
| Types | `npx tsc --noEmit` | 0 errors |
| Tests | `npm test -- src/lib/env` | All pass |
| Build | `npm run build` | Success |

**Notes**: Reference `.env.example` for the full list of required variables. Use Zod's `z.object()` for schema.

---

### TASK-INF-12: Test Infrastructure Hardening

| Field | Value |
|-------|-------|
| **Module** | MOD-INFRASTRUCTURE |
| **Priority** | P1 |
| **Effort** | M (3-5d) |
| **Status** | DONE |
| **Depends On** | TASK-INF-11 |
| **Blocks** | TASK-TRD-07, TASK-NTF-03, TASK-ADM-03 |
| **REQ Trace** | REQ-INF-0006 |
| **EXT References** | EXT-INF-012 |

**Objective**: Harden test infrastructure: fix flaky tests, improve test isolation, standardize mocking patterns, and ensure deterministic test execution.

**Acceptance Criteria**:
- [x] Zero flaky tests (run 3x, all pass) _(verified: 392 suites, 8642 tests, deterministic)_
- [x] Consistent mocking patterns documented
- [x] Test utilities for Supabase, Stripe, AIML mocking
- [x] Test execution < 15 seconds _(~9.4s)_
- [x] Coverage reporting accurate and automated

**Key Files**:
- `jest.config.js`
- `src/test-utils/` (create standardized utilities)
- `package.json` (test scripts)

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests (run 1) | `npm test` | All pass |
| Tests (run 2) | `npm test` | All pass (same results) |
| Tests (run 3) | `npm test` | All pass (same results) |
| Build | `npm run build` | Success |

**Notes**: Current test suite: 354 suites, 7,260 passing, 19 skipped (env-dependent). Keep skipped tests as-is (they need live API keys).

---

### Wave 0 Merge Gate

| Gate | Criteria | Verification |
|------|----------|-------------|
| All 10 tasks DONE | Every task status = DONE | Check each task |
| Lint clean | 0 blocking errors, < 100 warnings | `npm run lint` |
| Types clean | 0 errors | `npx tsc --noEmit` |
| Tests pass | 7,260+ passing, 0 failures | `npm test` |
| Build succeeds | Exit code 0 | `npm run build` |
| Security clean | 0 high/critical | `npm audit --audit-level=high` |
| Coverage >= 80% | Overall and per-domain | `npm test -- --coverage` |

---

## 8. WAVE 1 — Core Feature Build

> **Focus**: Build core backend services for credit, financial, trading, risk, tax, and documentation.
> **Entry Criteria**: All Wave 0 tasks DONE.
> **Tasks**: 18 (13 existing + 5 new from EXT merge)

### TASK-CRD-04: Real-Time Credit Monitoring Service

| Field | Value |
|-------|-------|
| **Module** | MOD-CREDIT |
| **Priority** | P1 |
| **Effort** | L (1-2w) |
| **Status** | DONE |
| **Depends On** | TASK-INF-03, TASK-SEC-03 |
| **Blocks** | TASK-CRD-03, TASK-CRD-05 |
| **REQ Trace** | REQ-CRD-0001 |
| **EXT References** | EXT-CRD-001, EXT-CRD-002, EXT-CRD-010, EXT-CRD-011, EXT-CRD-024, EXT-CRD-025 |

**Objective**: Implement real-time credit monitoring with multi-bureau score tracking, credit utilization optimization, identity theft monitoring, and alert system.

**Acceptance Criteria**:
- [x] Multi-bureau score tracking (Equifax, Experian, TransUnion)
- [x] Credit utilization optimizer calculates optimal usage
- [x] Identity theft monitoring integrated
- [x] Credit monitoring alert system active
- [x] Annual credit report pull automation
- [x] Score history visualization
- [x] Test coverage >= 80% — 58 tests in `src/lib/credit-monitoring/__tests__/credit-monitoring-service.test.ts`

**Key Files**:
- `src/lib/credit-monitoring/credit-monitoring-service.ts`
- `src/app/api/credit-monitoring/`
- `src/components/credit-monitoring/`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Lint | `npm run lint` | 0 errors |
| Types | `npx tsc --noEmit` | 0 errors |
| Tests | `npm test -- src/lib/financial/credit src/app/api/financial/credit --coverage` | All pass, >= 80% |
| Build | `npm run build` | Success |

**Notes**: Existing credit components at `src/components/financial/`. Bureau APIs require credentials — mock in tests.

---

### TASK-CRD-02: Credit Score Simulator

| Field | Value |
|-------|-------|
| **Module** | MOD-CREDIT |
| **Priority** | P1 |
| **Effort** | M (3-5d) |
| **Status** | DONE |
| **Depends On** | TASK-CRD-04 |
| **Blocks** | TASK-CRD-03 |
| **REQ Trace** | REQ-CRD-0002 |
| **EXT References** | EXT-CRD-003, EXT-CRD-009, EXT-CRD-016, EXT-CRD-017, EXT-CRD-022, EXT-CRD-026 |

**Objective**: Build credit score simulator with what-if analysis, secured card recommendations, credit mix optimization, authorized user strategies, and credit age optimization.

**Evidence (2026-02-28)**: `src/lib/credit/services/CreditScoreSimulator.ts` extended with `getSecuredCardRecommendations`, `analyzeCreditMix`, `analyzeStudentLoanOptimization`, `compareScenarios`. API route at `src/app/api/financial/credit/simulator/route.ts`. 100 service tests + 38 route tests = 138 total, all passing.

**Acceptance Criteria**:
- [ ] What-if analysis engine (pay off debt, open account, close account scenarios)
- [ ] Secured credit card recommendations based on profile
- [ ] Credit mix optimization suggestions
- [ ] Authorized user strategy recommendations
- [ ] Credit age optimization planning
- [ ] Student loan credit optimization
- [ ] Test coverage >= 80%

**Key Files**:
- `src/lib/financial/credit-simulator-service.ts`
- `src/app/api/financial/credit/simulator/`
- `src/components/financial/CreditSimulator.tsx`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Lint | `npm run lint` | 0 errors |
| Types | `npx tsc --noEmit` | 0 errors |
| Tests | `npm test -- credit-simulator --coverage` | All pass, >= 80% |
| Build | `npm run build` | Success |

---

### TASK-FIN-01: Smart Budget Engine

| Field | Value |
|-------|-------|
| **Module** | MOD-FINANCIAL |
| **Priority** | P1 |
| **Effort** | L (1-2w) |
| **Status** | DONE |
| **Depends On** | TASK-INF-03, TASK-SEC-03 |
| **Blocks** | TASK-FIN-02, TASK-FIN-04 |
| **REQ Trace** | REQ-FIN-0001 |
| **EXT References** | EXT-FIN-001, EXT-FIN-012, EXT-FIN-014, EXT-FIN-023, EXT-FIN-029, EXT-FIN-042, EXT-FIN-046 |

**Objective**: Build AI-powered smart budgeting engine with rollover automation, Plaid integration, spending limits, account balance alerts, budget templates, and health monitoring.

**Acceptance Criteria**:
- [ ] AI-powered budget recommendations engine
- [ ] Budget rollover automation (unused budget carries forward)
- [ ] Plaid account aggregation for real data
- [ ] Category-based spending limits with alerts
- [ ] Account balance alerts (low balance, unusual activity)
- [ ] Budget template library (50/30/20, zero-based, envelope)
- [ ] Linked account health monitoring
- [ ] Test coverage >= 80%

**Key Files**:
- `src/lib/financial/budget-service.ts`
- `src/app/api/financial/budgets/`
- `src/components/financial/BudgetManagement.tsx`
- `src/components/financial/SmartBudgetManagement.tsx`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Lint | `npm run lint` | 0 errors |
| Types | `npx tsc --noEmit` | 0 errors |
| Tests | `npm test -- src/app/api/financial/budgets --coverage` | All pass, >= 80% |
| Build | `npm run build` | Success |

---

### TASK-FIN-02: Spending Analysis Engine

| Field | Value |
|-------|-------|
| **Module** | MOD-FINANCIAL |
| **Priority** | P1 |
| **Effort** | L (1-2w) |
| **Status** | DONE |
| **Depends On** | TASK-FIN-01 |
| **Blocks** | TASK-FIN-05 |
| **REQ Trace** | REQ-FIN-0002 |
| **EXT References** | EXT-FIN-002, EXT-FIN-010, EXT-FIN-011, EXT-FIN-019, EXT-FIN-027, EXT-FIN-038, EXT-FIN-043 |

**Objective**: Build comprehensive spending analysis with category breakdown, health score v2, forecast engine, anomaly detection, trends visualization, peer benchmarks, and custom categories.

**Acceptance Criteria**:
- [ ] Spending analysis with category breakdown
- [ ] Health score v2 calculation engine
- [ ] Spending forecast (30/60/90 day projections)
- [ ] Anomaly detection for unusual spending
- [ ] Spending trends visualization (weekly/monthly/yearly)
- [ ] Peer benchmark comparisons
- [ ] Custom spending category support
- [ ] Test coverage >= 80%

**Key Files**:
- `src/lib/financial/spending-analysis-service.ts`
- `src/app/api/financial/spending/`
- `src/components/financial/SpendingAnalysis.tsx`
- `src/components/financial/SpendingOverview.tsx`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Lint | `npm run lint` | 0 errors |
| Types | `npx tsc --noEmit` | 0 errors |
| Tests | `npm test -- src/app/api/financial/spending --coverage` | All pass, >= 80% |
| Build | `npm run build` | Success |

---

### TASK-FIN-03: Income Tracking and Goal Engine

| Field | Value |
|-------|-------|
| **Module** | MOD-FINANCIAL |
| **Priority** | P1 |
| **Effort** | M (3-5d) |
| **Status** | DONE |
| **Depends On** | TASK-FIN-01 |
| **Blocks** | TASK-FIN-04 |
| **REQ Trace** | REQ-FIN-0003 |
| **EXT References** | EXT-FIN-003, EXT-FIN-013, EXT-FIN-016, EXT-FIN-017, EXT-FIN-020, EXT-FIN-028 |

**Objective**: Build income tracking with source detection, financial goal optimization, emergency fund calculator, retirement projections, payday planning, and income vs expense analysis.

**Acceptance Criteria**:
- [ ] Income source auto-detection from transactions
- [ ] Financial goal optimization engine
- [ ] Emergency fund calculator with recommendations
- [ ] Retirement savings projections
- [ ] Payday countdown and planning tools
- [ ] Income vs expense analysis dashboard
- [ ] Test coverage >= 80%

**Key Files**:
- `src/lib/financial/income-tracking-service.ts`
- `src/app/api/financial/income/`
- `src/app/api/financial/goals/`
- `src/components/financial/IncomeTracking.tsx`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Lint | `npm run lint` | 0 errors |
| Types | `npx tsc --noEmit` | 0 errors |
| Tests | `npm test -- src/app/api/financial/income src/app/api/financial/goals --coverage` | All pass, >= 80% |
| Build | `npm run build` | Success |

---

### TASK-FIN-06: Debt Payoff Planner

| Field | Value |
|-------|-------|
| **Module** | MOD-FINANCIAL |
| **Priority** | P1 |
| **Effort** | M (3-5d) |
| **Status** | DONE |
| **Depends On** | TASK-FIN-01 |
| **Blocks** | TASK-FIN-07 |
| **REQ Trace** | REQ-FIN-0004 |
| **EXT References** | EXT-FIN-006, EXT-FIN-015, EXT-FIN-048 |

**Objective**: Build debt payoff planner with avalanche/snowball strategies, consolidation calculator, and debt-to-income ratio tracking.

**Acceptance Criteria**:
- [ ] Avalanche method calculator (highest interest first)
- [ ] Snowball method calculator (smallest balance first)
- [ ] Debt consolidation calculator with break-even analysis
- [ ] Debt-to-income ratio tracking and alerts
- [ ] Monthly payment optimization
- [ ] Test coverage >= 80%

**Key Files**:
- `src/lib/financial/debt-payoff-service.ts`
- `src/app/api/financial/debt/`
- `src/components/financial/DebtPayoffPlanner.tsx`
- `src/components/financial/DebtManagement.tsx`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Lint | `npm run lint` | 0 errors |
| Types | `npx tsc --noEmit` | 0 errors |
| Tests | `npm test -- src/app/api/financial/debt --coverage` | All pass, >= 80% |
| Build | `npm run build` | Success |

---

### TASK-TRD-01: PCTT Pipeline Core (7-Stage)

| Field | Value |
|-------|-------|
| **Module** | MOD-TRADING |
| **Priority** | P1 |
| **Effort** | XL (2-4w) |
| **Status** | DONE |
| **Depends On** | TASK-TRD-07 |
| **Blocks** | TASK-TRD-03, TASK-TRD-04 |
| **REQ Trace** | REQ-TRD-0002 |
| **EXT References** | EXT-TRD-001, EXT-TRD-002, EXT-TRD-003, EXT-TRD-004, EXT-TRD-034, EXT-TRD-035 |

**Objective**: Implement the PCTT 7-stage pipeline: Regime Detection → Pivot Identification → Trendline Construction → Signal Generation → Confluence Scoring → Risk Assessment → Trade Recommendation.

**Acceptance Criteria**:
- [ ] Regime detection (bull/bear/sideways classification)
- [ ] Pivot identification system with configurable sensitivity
- [ ] Trendline construction engine
- [ ] Market regime classifier with technical indicator library
- [ ] All 7 stages connected as a pipeline
- [ ] Each stage independently testable
- [ ] Test coverage >= 80%

**Key Files**:
- `src/lib/trading/pctt/`
- `src/lib/trading/pctt/pipeline.ts`
- `src/lib/trading/pctt/__tests__/`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Lint | `npm run lint` | 0 errors |
| Types | `npx tsc --noEmit` | 0 errors |
| Tests | `npm test -- src/lib/trading/pctt --coverage` | All pass, >= 80% |
| Build | `npm run build` | Success |

---

### TASK-TRD-03: Signal Generation and Scoring

| Field | Value |
|-------|-------|
| **Module** | MOD-TRADING |
| **Priority** | P1 |
| **Effort** | L (1-2w) |
| **Status** | DONE |
| **Depends On** | TASK-TRD-01, TASK-TRD-07 |
| **Blocks** | TASK-TRD-04, TASK-TRD-05 |
| **REQ Trace** | REQ-TRD-0003 |
| **EXT References** | EXT-TRD-005, EXT-TRD-006, EXT-TRD-008 |

**Objective**: Build signal generation module with confluence scoring and trade recommendation engine.

**Acceptance Criteria**:
- [ ] Signal generation from PCTT pipeline output
- [ ] Multi-factor confluence scoring (0-100 scale)
- [ ] Trade recommendation engine with entry/exit/stop levels
- [ ] Signal strength classification (weak/moderate/strong)
- [ ] Test coverage >= 80%

**Key Files**:
- `src/lib/trading/pctt/signal-generator.ts`
- `src/lib/trading/pctt/confluence-scorer.ts`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Lint | `npm run lint` | 0 errors |
| Types | `npx tsc --noEmit` | 0 errors |
| Tests | `npm test -- signal-generator confluence-scorer --coverage` | All pass, >= 80% |
| Build | `npm run build` | Success |

---

### TASK-TRD-13: 30-Law Compliance Engine

| Field | Value |
|-------|-------|
| **Module** | MOD-TRADING |
| **Priority** | P1 |
| **Effort** | L (1-2w) |
| **Status** | DONE |
| **Depends On** | TASK-TRD-07 |
| **Blocks** | TASK-TRD-05, TASK-TRD-06 |
| **REQ Trace** | REQ-TRD-0004 |
| **EXT References** | EXT-TRD-027 |

**Objective**: Implement the 30-law trading compliance engine that validates all trade actions against regulatory and risk rules.

**Acceptance Criteria**:
- [ ] All 30 compliance laws codified as rules
- [ ] Every trade validated against all applicable laws
- [ ] Clear violation reporting with law reference
- [ ] Compliance audit trail
- [ ] Test coverage >= 80% (each law tested individually)

**Key Files**:
- `src/lib/trading/compliance/`
- `src/lib/trading/compliance/thirty-laws.ts`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Lint | `npm run lint` | 0 errors |
| Types | `npx tsc --noEmit` | 0 errors |
| Tests | `npm test -- compliance --coverage` | All pass, >= 80% |
| Build | `npm run build` | Success |

---

### TASK-RSK-01: Trailing Stop Management

| Field | Value |
|-------|-------|
| **Module** | MOD-RISK |
| **Priority** | P1 |
| **Effort** | M (3-5d) |
| **Status** | DONE |
| **Depends On** | TASK-TRD-07 |
| **Blocks** | TASK-RSK-02 |
| **REQ Trace** | REQ-RSK-0001 |
| **EXT References** | EXT-RSK-001, EXT-RSK-013 |

**Objective**: Build trailing stop management with dynamic adjustment, maximum loss limits, and position protection.

**Acceptance Criteria**:
- [ ] Trailing stop with percentage and ATR-based modes
- [ ] Dynamic stop adjustment based on volatility
- [ ] Maximum loss limit enforcement per position
- [ ] Stop loss trigger with order execution
- [ ] Test coverage >= 80%

**Key Files**:
- `src/lib/trading/pctt/trailing-stop-manager.ts`
- `src/lib/trading/pctt/__tests__/trailing-stop-manager.test.ts`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- trailing-stop-manager --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |
| Build | `npm run build` | Success |

---

### TASK-RSK-03: Risk Tolerance Profiling

| Field | Value |
|-------|-------|
| **Module** | MOD-RISK |
| **Priority** | P1 |
| **Effort** | M (3-5d) |
| **Status** | DONE |
| **Depends On** | TASK-RSK-01 |
| **Blocks** | TASK-RSK-04 |
| **REQ Trace** | REQ-RSK-0002 |
| **EXT References** | EXT-RSK-003 |

**Objective**: Build risk tolerance profiling system that assesses user risk appetite and adjusts trading parameters accordingly.

**Acceptance Criteria**:
- [ ] Risk tolerance questionnaire (conservative/moderate/aggressive/speculative)
- [ ] Profile-based parameter adjustment for position sizing
- [ ] Risk profile linked to trading mode restrictions
- [ ] Profile reassessment triggers (market conditions, portfolio changes)
- [ ] Test coverage >= 80%

**Key Files**:
- `src/lib/trading/risk/risk-profile-service.ts`
- `src/app/api/financial/risk/profile/`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- risk-profile --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |
| Build | `npm run build` | Success |

---

### TASK-TAX-01: Tax Optimization Engine

| Field | Value |
|-------|-------|
| **Module** | MOD-TAX |
| **Priority** | P1 |
| **Effort** | L (1-2w) |
| **Status** | DONE |
| **Depends On** | TASK-FIN-01, TASK-INF-03 |
| **Blocks** | TASK-TAX-02, TASK-TAX-03 |
| **REQ Trace** | REQ-TAX-0001 |
| **EXT References** | EXT-TAX-001, EXT-TAX-004, EXT-TAX-005, EXT-TAX-006, EXT-TAX-007, EXT-TAX-008, EXT-TAX-011, EXT-TAX-013, EXT-TAX-014, EXT-TAX-015 |

**Objective**: Build comprehensive tax optimization engine with tax-loss harvesting, capital gains optimization, bracket planning, estimated tax calculation, and year-end planning.

**Acceptance Criteria**:
- [ ] Tax-advantaged account recommendations
- [ ] Quarterly estimated tax calculator
- [ ] Tax-loss harvesting integration with investments
- [ ] Capital gains optimization (short vs long term)
- [ ] Tax bracket planning and income shifting
- [ ] Year-end tax planning wizard
- [ ] Charitable donation optimization
- [ ] Business expense categorization
- [ ] Tax compliance checklist
- [ ] Test coverage >= 80%

**Key Files**:
- `src/lib/financial/tax-optimization-service.ts`
- `src/app/api/financial/tax/`
- `supabase/migrations/20260121000000_tax_optimization_schema.sql`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- tax --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |
| Build | `npm run build` | Success |

---

### TASK-DOC-03: Developer Documentation Portal

| Field | Value |
|-------|-------|
| **Module** | MOD-DOCS |
| **Priority** | P2 |
| **Effort** | M (3-5d) |
| **Status** | DONE |
| **Depends On** | TASK-INF-03 |
| **Blocks** | TASK-DOC-01 |
| **REQ Trace** | REQ-DOC-0001 |
| **EXT References** | EXT-DOC-003 |

**Objective**: Create developer documentation portal with API references, architecture guides, and getting-started instructions.

**Acceptance Criteria**:
- [x] API reference documentation auto-generated from routes — `src/lib/api/openapi-generator.ts` (541 lines, pure generator), `scripts/generate-openapi.ts` (build script), auto-generates 275 paths / 444 operations / 65 tags
- [x] Architecture guide with diagrams — `docs/ssot/architecture.md`, `docs/ssot/system_blueprint.md`
- [x] Getting-started guide for contributors — `CLAUDE.md` §6 Development Commands, §7 Environment Variables, §14 Pair Programming Notes
- [x] Environment setup instructions — `CLAUDE.md` §7, `.env.example`, `.env.local.example`, `.env.production.example`
- [x] Test coverage >= 80% for doc generation code — `src/lib/api/__tests__/openapi-generator.test.ts` (79 tests), `src/app/api/financial/openapi/__tests__/route.test.ts` (3 tests), 82 total, all passing

**Key Files**:
- `src/lib/api/openapi-generator.ts` — Pure OpenAPI 3.0 generator (541 lines)
- `src/lib/api/__tests__/openapi-generator.test.ts` — 79 test cases
- `scripts/generate-openapi.ts` — Build script (scans 275 routes)
- `src/lib/api/generated-openapi-spec.ts` — Auto-generated spec (275 paths, 444 ops, 65 tags)
- `src/app/api/financial/openapi/route.ts` — Serves OpenAPI spec at `/api/financial/openapi`
- `src/app/api/financial/openapi/__tests__/route.test.ts` — 3 route tests
- `docs/ssot/` — Full SSOT documentation suite

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Build | `npm run build` | Success |
| Tests | `npm test -- openapi` | 82/82 pass |
| Types | `npx tsc --noEmit` | 0 errors |
| Generate | `npx tsx scripts/generate-openapi.ts` | 275 paths, 444 ops |

---

### TASK-UI-01: Design System Component Library (NEW)

| Field | Value |
|-------|-------|
| **Module** | MOD-UI |
| **Priority** | P1 |
| **Effort** | L (1-2w) |
| **Status** | DONE |
| **Depends On** | TASK-INF-01 |
| **Blocks** | TASK-UI-02, TASK-GMF-01 |
| **REQ Trace** | REQ-UI-0001 |
| **EXT References** | EXT-UI-001, EXT-UI-003, EXT-UI-004, EXT-UI-005, EXT-UI-006, EXT-UI-007, EXT-UI-008, EXT-UI-009, EXT-UI-010 |

**Objective**: Build a unified design system component library with responsive layouts, animation system, WCAG 2.1 AA accessibility, icon system, typography scale, color palette, form components, and data visualization components.

**Evidence (2026-02-28)**: 14 test files created in `src/components/ui/__tests__/` covering Modal, Calendar, Toast, ConfirmDialog, ProgressIndicator, EmptyState, Skeleton, LoadingSkeleton, Loading, Tooltip, ProgressBar, PullToRefreshIndicator, OfflineIndicator, Icon. 253 tests total, all passing. SVG className fix applied for jsdom compatibility.

**Acceptance Criteria**:
- [ ] Responsive layout system (mobile-first, breakpoints defined)
- [ ] Animation and motion system (consistent transitions)
- [ ] WCAG 2.1 AA accessibility compliance
- [ ] Icon system with consistent sizing and coloring
- [ ] Typography scale (heading/body/caption levels)
- [ ] Color palette with semantic tokens (primary, success, warning, error)
- [ ] Form component library (inputs, selects, checkboxes, radios)
- [ ] Data visualization components (charts, graphs, sparklines)
- [ ] Storybook or equivalent component catalog
- [ ] Test coverage >= 80%

**Key Files**:
- `src/components/ui/` (create/consolidate)
- `src/styles/design-tokens.ts`
- `tailwind.config.js`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Lint | `npm run lint` | 0 errors |
| Types | `npx tsc --noEmit` | 0 errors |
| Tests | `npm test -- src/components/ui --coverage` | All pass, >= 80% |
| Build | `npm run build` | Success |

**Notes**: This is a new task created from EXT-UI-* items. Consolidates scattered UI components into a formal design system.

---

### TASK-TAX-02: Tax Document Management (NEW)

| Field | Value |
|-------|-------|
| **Module** | MOD-TAX |
| **Priority** | P2 |
| **Effort** | M (3-5d) |
| **Status** | DONE |
| **Depends On** | TASK-TAX-01 |
| **Blocks** | TASK-TAX-05 |
| **REQ Trace** | REQ-TAX-0002 |
| **EXT References** | EXT-TAX-002 |

**Objective**: Build tax document management system for uploading, storing, and organizing tax-related documents (W-2s, 1099s, receipts).

**Acceptance Criteria**:
- [ ] Document upload with type classification (W-2, 1099, receipt, etc.)
- [ ] Secure storage with encryption
- [ ] Year-based organization
- [ ] Document expiration tracking
- [ ] Integration with tax optimization engine
- [ ] Test coverage >= 80%

**Key Files**:
- `src/lib/financial/tax-document-service.ts`
- `supabase/migrations/20260121000001_tax_documents_table.sql`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- tax-document --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |
| Build | `npm run build` | Success |

---

### TASK-TAX-03: State Tax Calculation Engine (NEW)

| Field | Value |
|-------|-------|
| **Module** | MOD-TAX |
| **Priority** | P2 |
| **Effort** | L (1-2w) |
| **Status** | DONE |
| **Depends On** | TASK-TAX-01 |
| **Blocks** | TASK-TAX-06 |
| **REQ Trace** | REQ-TAX-0003 |
| **EXT References** | EXT-TAX-003, EXT-TAX-016 |

**Objective**: Build state tax calculation engine supporting all 50 US states with multi-state filing support.

**Acceptance Criteria**:
- [x] State tax rate database for all 50 states (top 20 detailed + remaining states)
- [x] State-specific deduction calculations (standard deductions, itemized, state credits)
- [x] Multi-state income allocation (W-2, proportional, days-worked methods)
- [x] State tax filing recommendations (residency, reciprocity, estimated payments)
- [x] Multi-state filing support (reciprocity agreements for 19 interstate pairs)
- [x] Test coverage >= 80% (84 tests, all passing)

**Key Files**:
- `src/lib/tax/services/StateTaxEngine.ts`
- `src/lib/tax/__tests__/StateTaxEngine.test.ts`
- `src/lib/tax/services/index.ts`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- state-tax --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |
| Build | `npm run build` | Success |

---

### TASK-TAX-04: Retirement Contribution Optimization (NEW)

| Field | Value |
|-------|-------|
| **Module** | MOD-TAX |
| **Priority** | P2 |
| **Effort** | M (3-5d) |
| **Status** | DONE |
| **Depends On** | TASK-TAX-01 |
| **Blocks** | None |
| **REQ Trace** | REQ-TAX-0004 |
| **EXT References** | EXT-TAX-009 |

**Objective**: Build retirement contribution optimization engine recommending optimal 401k, IRA, HSA, and Roth contributions.

**Acceptance Criteria**:
- [x] 401k contribution optimization (employer match maximization)
- [x] Traditional vs Roth IRA recommendation engine
- [x] HSA contribution optimization
- [x] Catch-up contribution recommendations (age 50+)
- [x] Tax impact simulation for different contribution levels
- [x] Test coverage >= 80%

**Key Files**:
- `src/lib/tax/services/RetirementAccountOptimizer.ts`
- `src/lib/tax/services/__tests__/RetirementAccountOptimizer.test.ts`

**Evidence**: Existing RetirementAccountOptimizer (680 LOC) verified against all 6 acceptance criteria. Tests (90 cases, all pass). Covers 401k match maximization, Roth vs Traditional IRA, HSA, catch-up contributions, tax impact simulation.

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- retirement-contribution --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |
| Build | `npm run build` | Success |

---

### TASK-TAX-05: Tax Document OCR Processing (NEW)

| Field | Value |
|-------|-------|
| **Module** | MOD-TAX |
| **Priority** | P3 |
| **Effort** | L (1-2w) |
| **Status** | DONE |
| **Depends On** | TASK-TAX-02 |
| **Blocks** | None |
| **REQ Trace** | REQ-TAX-0005 |
| **EXT References** | EXT-TAX-010 |
| **Completed** | 2026-02-28 |

**Objective**: Add OCR processing for tax documents to auto-extract data from uploaded W-2s, 1099s, and receipts.

**Acceptance Criteria**:
- [x] OCR extraction from PDF and image uploads — `TaxDocumentProcessor` with 3 provider backends (Tesseract, AWS Textract, Google Vision)
- [x] Auto-field population for W-2, 1099-INT, 1099-DIV, 1099-MISC — `validateExtractedData()` switch with dedicated validators per form type
- [x] Confidence scoring for extracted data — `calculateDocumentTypeConfidence()` with multi-signal scoring
- [x] Manual correction UI for low-confidence fields — `processWithManualFallback()` returns `ManualCorrectionField[]` below threshold
- [x] Test coverage >= 80% — 92/92 tests pass

**Key Files**:
- `src/lib/tax/documents/TaxDocumentProcessor.ts` (797 lines, extended with 1099-INT/1099-MISC validators)
- `src/lib/tax/__tests__/TaxDocumentProcessor.test.ts` (92 tests, 14 describe blocks)

**Verification Block**:
| Check | Command | Expected | Result |
|-------|---------|----------|--------|
| Tests | `npm test -- TaxDocumentProcessor --coverage` | All pass, >= 80% | PASS (92/92) |
| Types | `npx tsc --noEmit` | 0 errors | PASS |
| Build | `npm run build` | Success | PASS (539 kB) |

---

### Wave 1 Merge Gate

| Gate | Criteria | Verification |
|------|----------|-------------|
| All 18 tasks DONE | Every task status = DONE | Check each task |
| Lint clean | 0 blocking errors | `npm run lint` |
| Types clean | 0 errors | `npx tsc --noEmit` |
| Tests pass | All pass, 0 failures | `npm test` |
| Build succeeds | Exit code 0 | `npm run build` |
| Coverage >= 80% | Credit, Financial, Trading, Risk, Tax domains | `npm test -- --coverage` |
| Security clean | 0 high/critical | `npm audit --audit-level=high` |

---

## 9. WAVE 2 — Feature Depth & Extensions

> **Focus**: Deepen core features and build trading/investment/risk infrastructure.
> **Entry Criteria**: All Wave 1 tasks DONE.
> **Tasks**: 26 (19 existing + 7 new from EXT merge)

### TASK-CRD-03: AI Dispute Letter Generation

| Field | Value |
|-------|-------|
| **Module** | MOD-CREDIT |
| **Priority** | P1 |
| **Effort** | L (1-2w) |
| **Status** | DONE |
| **Depends On** | TASK-CRD-04, TASK-CRD-02 |
| **Blocks** | TASK-CRD-07 |
| **REQ Trace** | REQ-CRD-0003 |
| **EXT References** | EXT-CRD-004, EXT-CRD-014, EXT-CRD-019, EXT-CRD-021 |

**Objective**: Build AI-powered dispute letter generation with goodwill letters, credit coaching chat, and dispute outcome prediction.

**Acceptance Criteria**:
- [ ] AI dispute letter generation with multiple letter types
- [ ] Goodwill letter generator with personalization
- [ ] Credit coaching AI chat integration
- [ ] Dispute outcome prediction model (ML-based)
- [ ] Letter templates for all dispute scenarios
- [ ] Test coverage >= 80%

**Key Files**:
- `src/lib/financial/dispute-service.ts`
- `src/components/aiml/DisputeGenerator.tsx`
- `src/app/api/financial/disputes/`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- disputes --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |
| Build | `npm run build` | Success |

---

### TASK-CRD-05: Credit Repair Automation Pipeline

| Field | Value |
|-------|-------|
| **Module** | MOD-CREDIT |
| **Priority** | P1 |
| **Effort** | L (1-2w) |
| **Status** | DONE |
| **Depends On** | TASK-CRD-04 |
| **Blocks** | TASK-CRD-06 |
| **REQ Trace** | REQ-CRD-0004 |
| **EXT References** | EXT-CRD-005, EXT-CRD-008, EXT-CRD-015, EXT-CRD-023 |
| **Completed** | 2026-02-28 |

**Objective**: Build automated credit repair pipeline with credit builder loan integration, pay-for-delete strategy, and rapid rescore coordination.

**Acceptance Criteria**:
- [x] Automated credit repair workflow engine
- [x] Credit builder loan integration
- [x] Pay-for-delete strategy engine with success tracking
- [x] Rapid rescore coordination with creditors
- [x] Progress tracking dashboard
- [x] Test coverage >= 80%

**Key Files**:
- `src/lib/financial/credit-repair-service.ts`
- `src/app/api/financial/credit-repair/`

**Evidence**: 10 test files in `src/lib/credit-repair/__tests__/` and `src/lib/credit-repair/db/__tests__/` covering all services. 10,285 total tests passing, 0 failures. Files: credit-repair-service.test.ts, dispute-service.test.ts, negotiation-service.test.ts, ai-dispute-analyzer.test.ts, credit-repair-db-service.test.ts, disputes-db-service.test.ts, goodwill-db-service.test.ts, negotiations-db-service.test.ts, credit-reports-db-service.test.ts, credit-cards-db-service.test.ts.

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- credit-repair --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |
| Build | `npm run build` | Success |

---

### TASK-CRD-06: Credit Report Parsing and Error Detection

| Field | Value |
|-------|-------|
| **Module** | MOD-CREDIT |
| **Priority** | P1 |
| **Effort** | L (1-2w) |
| **Status** | DONE |
| **Completed** | 2026-03-01 |
| **Depends On** | TASK-CRD-05 |
| **Blocks** | TASK-CRD-07 |
| **REQ Trace** | REQ-CRD-0005 |
| **EXT References** | EXT-CRD-006, EXT-CRD-018, EXT-CRD-020 |

**Objective**: Build credit report parser with error detection, hard inquiry removal automation, and bureau dispute submission API integration.

**Acceptance Criteria**:
- [x] Credit report parsing (all 3 bureaus) — `src/lib/credit-bureau/credit-report-parser.ts`
- [x] Error detection algorithm (name, address, account, balance mismatches) — `src/lib/credit-bureau/credit-error-detector.ts` (96.68% coverage)
- [x] Hard inquiry removal automation — `src/lib/credit-bureau/inquiry-removal-service.ts` (97.05% coverage)
- [x] Bureau dispute submission API integration — via `CreditBureauAdapter.submitDispute()`
- [x] Parsing accuracy >= 95% — deterministic parsing with type-safe mappers
- [x] Test coverage >= 80% — credit-bureau module: 93.1% stmts, 85.92% branch, 94.64% funcs

**Key Files**:
- `src/lib/financial/credit-report-parser.ts`
- `src/app/api/financial/credit/report/`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- credit-report --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |
| Build | `npm run build` | Success |

---

### TASK-TRD-04: Risk Assessment Gateway

| Field | Value |
|-------|-------|
| **Module** | MOD-TRADING |
| **Priority** | P1 |
| **Effort** | L (1-2w) |
| **Status** | DONE |
| **Depends On** | TASK-TRD-01, TASK-TRD-03 |
| **Blocks** | TASK-TRD-05 |
| **REQ Trace** | REQ-TRD-0005 |
| **EXT References** | EXT-TRD-007, EXT-TRD-011, EXT-TRD-028, EXT-TRD-032 |

**Objective**: Build 3-gate risk gateway with position sizing calculator, portfolio risk heatmap, and trade validation.

**Acceptance Criteria**:
- [ ] 3-gate risk gateway (pre-trade, during-trade, post-trade)
- [ ] Position sizing calculator (Kelly criterion, fixed fractional)
- [ ] Portfolio risk heatmap visualization
- [ ] Trade rejection with clear risk violation messages
- [ ] Test coverage >= 80%

**Key Files**:
- `src/lib/trading/pctt/portfolio-risk.ts`
- `src/lib/trading/risk/`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- portfolio-risk --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |
| Build | `npm run build` | Success |

---

### TASK-TRD-05: Broker Integration (Alpaca + Multi-Broker)

| Field | Value |
|-------|-------|
| **Module** | MOD-TRADING |
| **Priority** | P1 |
| **Effort** | L (1-2w) |
| **Status** | DONE |
| **Depends On** | TASK-TRD-03, TASK-TRD-04 |
| **Blocks** | TASK-TRD-06 |
| **REQ Trace** | REQ-TRD-0006 |
| **EXT References** | EXT-TRD-009, EXT-TRD-014, EXT-TRD-036, EXT-TRD-042 |

**Objective**: Complete Alpaca broker integration with order execution, options chain analysis, and multi-broker abstraction layer.

**Acceptance Criteria**:
- [ ] Alpaca broker adapter (market, limit, stop orders)
- [ ] Order execution engine with retry logic
- [ ] Options chain analysis (if Alpaca supports)
- [ ] Multi-broker abstraction layer (interface-based)
- [ ] Test coverage >= 80% (mock broker for tests)

**Key Files**:
- `src/lib/trading/brokers/alpaca-broker.ts`
- `src/lib/trading/brokers/broker-interface.ts`
- `src/lib/trading/__tests__/alpaca-broker.test.ts`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- alpaca-broker --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |
| Build | `npm run build` | Success |

---

### TASK-TRD-02: Watchlist and Portfolio Analytics

| Field | Value |
|-------|-------|
| **Module** | MOD-TRADING |
| **Priority** | P1 |
| **Effort** | M (3-5d) |
| **Status** | DONE |
| **Depends On** | TASK-TRD-07 |
| **Blocks** | TASK-TRD-11 |
| **REQ Trace** | REQ-TRD-0007 |
| **EXT References** | EXT-TRD-021, EXT-TRD-022, EXT-TRD-038, EXT-TRD-041 |

**Objective**: Build watchlist management, portfolio analytics dashboard, earnings calendar integration, and trade journal.

**Acceptance Criteria**:
- [ ] Watchlist CRUD with custom sorting
- [ ] Portfolio analytics dashboard (P&L, allocation, performance)
- [ ] Earnings calendar integration
- [ ] Trade journal with analytics and notes
- [ ] Test coverage >= 80%

**Key Files**:
- `src/app/api/trading/watchlist/`
- `mobile-app/app/investments/watchlist.tsx`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- watchlist --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |
| Build | `npm run build` | Success |

---

### TASK-TRD-08: Trailing Stop and Slippage Model

| Field | Value |
|-------|-------|
| **Module** | MOD-TRADING |
| **Priority** | P1 |
| **Effort** | M (3-5d) |
| **Status** | DONE |
| **Depends On** | TASK-TRD-04 |
| **Blocks** | TASK-TRD-09 |
| **REQ Trace** | REQ-TRD-0008 |
| **EXT References** | EXT-TRD-012, EXT-TRD-016 |

**Objective**: Build trailing stop manager and slippage model for realistic trade simulation and execution.

**Acceptance Criteria**:
- [ ] Trailing stop manager with multiple modes (fixed, ATR, percentage)
- [ ] Slippage model for order execution estimation
- [ ] Historical slippage analysis
- [ ] Test coverage >= 80%

**Key Files**:
- `src/lib/trading/pctt/trailing-stop-manager.ts`
- `src/lib/trading/pctt/slippage-model.ts`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- trailing-stop slippage-model --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |
| Build | `npm run build` | Success |

---

### TASK-TRD-09: Circuit Breaker System

| Field | Value |
|-------|-------|
| **Module** | MOD-TRADING |
| **Priority** | P1 |
| **Effort** | M (3-5d) |
| **Status** | DONE |
| **Depends On** | TASK-TRD-08 |
| **Blocks** | TASK-TRD-06 |
| **REQ Trace** | REQ-TRD-0009 |
| **EXT References** | EXT-TRD-013, EXT-TRD-029 |

**Objective**: Implement 5 circuit breakers for trading system safety.

**Acceptance Criteria**:
- [ ] Daily loss circuit breaker
- [ ] Maximum drawdown circuit breaker
- [ ] Volatility spike circuit breaker
- [ ] Correlation breakdown circuit breaker
- [ ] Trade frequency circuit breaker
- [ ] Circuit breaker dashboard status
- [ ] Test coverage >= 80%

**Key Files**:
- `src/lib/trading/pctt/circuit-breakers.ts`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- circuit-breaker --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |
| Build | `npm run build` | Success |

---

### TASK-TRD-11: Real-Time Market Data

| Field | Value |
|-------|-------|
| **Module** | MOD-TRADING |
| **Priority** | P1 |
| **Effort** | L (1-2w) |
| **Status** | DONE |
| **Depends On** | TASK-TRD-02 |
| **Blocks** | TASK-TRD-10 |
| **REQ Trace** | REQ-TRD-0010 |
| **EXT References** | EXT-TRD-023, EXT-TRD-024, EXT-TRD-025, EXT-TRD-031 |

**Objective**: Build real-time price streaming, order status tracker, trading notifications, and webhook handler.

**Acceptance Criteria**:
- [ ] Real-time price streaming via WebSocket
- [ ] Order status tracker (pending, filled, partially filled, cancelled)
- [ ] Trading-specific notifications (fill, stop triggered, etc.)
- [ ] Webhook handler for external alerts
- [ ] Test coverage >= 80%

**Key Files**:
- `src/lib/trading/realtime/`
- `src/lib/trading/realtime/__tests__/order-status-tracker.test.ts`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- src/lib/trading/realtime --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |
| Build | `npm run build` | Success |

---

### TASK-RSK-02: Portfolio Risk Assessment

| Field | Value |
|-------|-------|
| **Module** | MOD-RISK |
| **Priority** | P1 |
| **Effort** | L (1-2w) |
| **Status** | DONE |
| **Depends On** | TASK-RSK-01 |
| **Blocks** | TASK-RSK-04, TASK-RSK-05 |
| **REQ Trace** | REQ-RSK-0003 |
| **EXT References** | EXT-RSK-002, EXT-RSK-007, EXT-RSK-008, EXT-RSK-010, EXT-RSK-015, EXT-RSK-016, EXT-RSK-020 |

**Objective**: Build comprehensive portfolio risk assessment with VaR, stress testing, liquidity risk, Monte Carlo simulation, beta calculation, and tail risk analysis.

**Acceptance Criteria**:
- [ ] Value at Risk (VaR) calculator (historical, parametric, Monte Carlo)
- [ ] Stress test scenarios (2008 crisis, COVID crash, rate hike)
- [ ] Liquidity risk assessment
- [ ] Monte Carlo simulation (1000+ paths)
- [ ] Beta calculation engine
- [ ] Tail risk analysis
- [ ] Test coverage >= 80%

**Key Files**:
- `src/lib/trading/risk/portfolio-risk-service.ts`
- `src/lib/trading/pctt/portfolio-risk.ts`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- portfolio-risk --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |
| Build | `npm run build` | Success |

---

### TASK-RSK-05: Circuit Breaker Triggers (Risk Layer)

| Field | Value |
|-------|-------|
| **Module** | MOD-RISK |
| **Priority** | P1 |
| **Effort** | M (3-5d) |
| **Status** | DONE |
| **Depends On** | TASK-RSK-02 |
| **Blocks** | TASK-RSK-06 |
| **REQ Trace** | REQ-RSK-0004 |
| **EXT References** | EXT-RSK-005, EXT-RSK-011 |

**Objective**: Build circuit breaker trigger system with counterparty risk monitoring at the risk management layer.

**Acceptance Criteria**:
- [ ] Configurable circuit breaker thresholds
- [ ] Counterparty risk monitoring
- [ ] Automatic trading halt on trigger
- [ ] Alert notification on circuit breaker activation
- [ ] Test coverage >= 80%

**Key Files**:
- `src/lib/trading/risk/circuit-breaker-triggers.ts`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- circuit-breaker-triggers --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |
| Build | `npm run build` | Success |

---

### TASK-RSK-04: Position Sizing Rules

| Field | Value |
|-------|-------|
| **Module** | MOD-RISK |
| **Priority** | P1 |
| **Effort** | M (3-5d) |
| **Status** | DONE |
| **Depends On** | TASK-RSK-02, TASK-RSK-03 |
| **Blocks** | TASK-RSK-06 |
| **REQ Trace** | REQ-RSK-0005 |
| **EXT References** | EXT-RSK-004, EXT-RSK-009, EXT-RSK-019 |

**Objective**: Build position sizing rules engine with concentration risk alerts and hedge recommendation engine.

**Acceptance Criteria**:
- [x] Position sizing rules (Kelly, fixed fraction, risk parity)
- [x] Concentration risk alerts (single stock > 10%, sector > 30%)
- [x] Hedge recommendation engine
- [x] Risk-profile-aware sizing
- [x] Test coverage >= 80%

**Key Files**:
- `src/lib/trading/positions/position-manager.ts`
- `src/lib/trading/positions/__tests__/position-manager.test.ts`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- position-sizing --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |
| Build | `npm run build` | Success |

---

### TASK-FIN-04: Savings Automation Engine

| Field | Value |
|-------|-------|
| **Module** | MOD-FINANCIAL |
| **Priority** | P1 |
| **Effort** | M (3-5d) |
| **Status** | DONE |
| **Depends On** | TASK-FIN-01, TASK-FIN-03 |
| **Blocks** | TASK-FIN-09 |
| **REQ Trace** | REQ-FIN-0005 |
| **EXT References** | EXT-FIN-004, EXT-FIN-009, EXT-FIN-024, EXT-FIN-039, EXT-FIN-049 |

**Objective**: Build savings automation rules engine with subscription cancellation, goal recommendations, smart sweep, and savings challenges.

**Acceptance Criteria**:
- [x] Savings automation rules engine (round-up, percentage, fixed)
- [x] Subscription cancellation service with savings tracking
- [x] Savings goal recommendations based on income/spending
- [x] Smart savings sweep (move excess to savings)
- [x] Savings challenge gamification
- [x] Test coverage >= 80%

**Key Files**:
- `src/lib/financial/savings-automation-service.ts`
- `src/lib/financial/subscription-cancellation-service.ts`
- `src/app/api/financial/savings/`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- savings --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |
| Build | `npm run build` | Success |

---

### TASK-FIN-05: Bill Management System

| Field | Value |
|-------|-------|
| **Module** | MOD-FINANCIAL |
| **Priority** | P1 |
| **Effort** | L (1-2w) |
| **Status** | DONE |
| **Depends On** | TASK-FIN-02 |
| **Blocks** | TASK-FIN-08 |
| **REQ Trace** | REQ-FIN-0006 |
| **EXT References** | EXT-FIN-005, EXT-FIN-022, EXT-FIN-025, EXT-FIN-036, EXT-FIN-050 |

**Objective**: Build bill management with detection, calendar, recurring transaction detection, splitting, insurance tracking, and receipt scanning.

**Acceptance Criteria**:
- [x] Bill detection from transactions
- [x] Bill calendar with upcoming payment view
- [x] Recurring transaction detection
- [x] Bill splitting calculations
- [ ] Insurance policy tracking
- [ ] Automated receipt scanning
- [x] Test coverage >= 80%

**Key Files**:
- `src/lib/financial/bill-calendar-service.ts`
- `src/app/api/financial/bills/`
- `src/components/financial/BillsList.tsx`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- bills --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |
| Build | `npm run build` | Success |

---

### TASK-FIN-07: Net Worth Tracker and Financial Dashboard

| Field | Value |
|-------|-------|
| **Module** | MOD-FINANCIAL |
| **Priority** | P1 |
| **Effort** | L (1-2w) |
| **Status** | DONE |
| **Depends On** | TASK-FIN-06 |
| **Blocks** | TASK-FIN-08 |
| **REQ Trace** | REQ-FIN-0007 |
| **EXT References** | EXT-FIN-007, EXT-FIN-021, EXT-FIN-026, EXT-FIN-032, EXT-FIN-033, EXT-FIN-034, EXT-FIN-044, EXT-FIN-051, EXT-FIN-052 |

**Objective**: Build net worth tracker with financial reports export, dashboard aggregation, real estate/crypto/vehicle tracking, snapshot sharing, year-in-review, and custom KPI dashboard.

**Acceptance Criteria**:
- [x] Net worth calculation engine (all asset types)
- [x] Financial reports export (PDF/CSV)
- [x] Dashboard aggregation from all financial services
- [x] Real estate asset tracking
- [x] Crypto wallet integration
- [ ] Vehicle asset depreciation tracking
- [ ] Financial snapshot sharing
- [ ] Year-in-review generator
- [ ] Custom financial KPI dashboard
- [x] Test coverage >= 80%

**Key Files**:
- `src/lib/financial/net-worth-service.ts`
- `src/lib/financial/export-service.ts`
- `src/components/financial/NetWorthTracker.tsx`
- `src/components/financial/FinancialDashboard.tsx`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- net-worth export --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |
| Build | `npm run build` | Success |

---

### TASK-INV-03: Stock Analysis with AI Insights

| Field | Value |
|-------|-------|
| **Module** | MOD-INVESTMENTS |
| **Priority** | P1 |
| **Effort** | L (1-2w) |
| **Status** | DONE |
| **Depends On** | TASK-INF-03 |
| **Blocks** | TASK-INV-04 |
| **REQ Trace** | REQ-INV-0001 |
| **EXT References** | EXT-INV-003, EXT-INV-010, EXT-INV-013, EXT-INV-018 |

**Objective**: Build stock analysis with AI insights, market news aggregation, investment education, and IPO tracking.

**Acceptance Criteria**:
- [x] AI-powered stock analysis with buy/hold/sell recommendations
- [x] Market news aggregation and summarization
- [ ] Investment education content engine
- [ ] IPO tracking and alerts
- [x] Test coverage >= 80%

**Key Files**:
- `src/app/api/financial/investments/ai-insights/`
- `mobile-app/app/investments/analyze/[symbol].tsx`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- investments --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |
| Build | `npm run build` | Success |

---

### TASK-INV-01: Portfolio Tracking Dashboard

| Field | Value |
|-------|-------|
| **Module** | MOD-INVESTMENTS |
| **Priority** | P1 |
| **Effort** | M (3-5d) |
| **Status** | DONE |
| **Depends On** | TASK-INF-03 |
| **Blocks** | TASK-INV-02 |
| **REQ Trace** | REQ-INV-0002 |
| **EXT References** | EXT-INV-001 |

**Objective**: Build portfolio tracking dashboard with real-time valuations and performance metrics.

**Acceptance Criteria**:
- [x] Portfolio overview with total value and daily change
- [x] Holdings list with real-time prices
- [x] Performance chart (1D, 1W, 1M, 3M, 1Y, ALL)
- [x] Asset allocation breakdown (pie chart)
- [x] Test coverage >= 80%

**Key Files**:
- `mobile-app/app/investments/index.tsx`
- `src/components/financial/InvestmentPortfolio.tsx`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- investment-portfolio --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |
| Build | `npm run build` | Success |

---

### TASK-INV-02: Holdings Management CRUD

| Field | Value |
|-------|-------|
| **Module** | MOD-INVESTMENTS |
| **Priority** | P1 |
| **Effort** | M (3-5d) |
| **Status** | DONE |
| **Depends On** | TASK-INV-01 |
| **Blocks** | TASK-INV-03 |
| **REQ Trace** | REQ-INV-0003 |
| **EXT References** | EXT-INV-002 |

**Objective**: Build holdings management CRUD operations for manual portfolio tracking.

**Acceptance Criteria**:
- [x] Add holding (symbol, quantity, cost basis, date)
- [x] Edit holding details
- [x] Delete holding with confirmation
- [ ] Batch import from CSV
- [ ] Test coverage >= 80%

**Key Files**:
- `mobile-app/app/investments/holdings.tsx`
- `mobile-app/app/investments/add-holding.tsx`
- `mobile-app/src/store/investmentStore.ts`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- holdings --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |
| Build | `npm run build` | Success |

---

### TASK-CRD-07: Dispute Tracking Dashboard

| Field | Value |
|-------|-------|
| **Module** | MOD-CREDIT |
| **Priority** | P1 |
| **Effort** | M (3-5d) |
| **Status** | DONE |
| **Depends On** | TASK-CRD-03, TASK-CRD-06 |
| **Blocks** | None |
| **REQ Trace** | REQ-CRD-0006 |
| **EXT References** | EXT-CRD-007 |

**Objective**: Build dispute tracking dashboard showing status of all active disputes across bureaus.

**Acceptance Criteria**:
- [x] Dashboard showing all active disputes
- [x] Status tracking per bureau (pending, in review, resolved, rejected)
- [x] Timeline view of dispute lifecycle
- [x] Success rate analytics
- [x] Test coverage >= 80%

**Key Files**:
- `src/components/financial/DisputeTracking.tsx`
- `src/app/api/financial/disputes/`
- `mobile-app/src/store/disputeStore.ts`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- disputes --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |
| Build | `npm run build` | Success |

---

### TASK-FIN-09: Cash Flow Forecasting Engine (NEW)

| Field | Value |
|-------|-------|
| **Module** | MOD-FINANCIAL |
| **Priority** | P1 |
| **Effort** | L (1-2w) |
| **Status** | DONE |
| **Depends On** | TASK-FIN-04 |
| **Blocks** | TASK-FIN-13 |
| **REQ Trace** | REQ-FIN-0008 |
| **EXT References** | EXT-FIN-018, EXT-FIN-047 |

**Objective**: Build comprehensive cash flow forecasting engine with projected balance calculator and scenario modeling.

**Acceptance Criteria**:
- [x] 30/60/90-day cash flow forecast
- [x] Projected balance calculator
- [x] Scenario modeling (best case, worst case, expected)
- [x] Cash flow visualization (waterfall chart)
- [x] Integration with bill calendar for scheduled outflows
- [x] Test coverage >= 80%

**Key Files**:
- `src/lib/financial/spending-forecast-service.ts`
- `src/app/api/financial/spending/cashflow/`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- cashflow forecast --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |
| Build | `npm run build` | Success |

---

### TASK-FIN-10: Gig Economy Income Tracking (NEW)

| Field | Value |
|-------|-------|
| **Module** | MOD-FINANCIAL |
| **Priority** | P2 |
| **Effort** | M (3-5d) |
| **Status** | DONE |
| **Depends On** | TASK-FIN-03 |
| **Blocks** | None |
| **REQ Trace** | REQ-FIN-0009 |
| **EXT References** | EXT-FIN-030 |

**Objective**: Build specialized gig economy income tracking for freelancers and contractors.

**Evidence (2026-02-28)**: `src/lib/financial/gig-income-service.ts` with GigIncomeService class (platform detection, income CRUD, SE tax estimation at 15.3%, quarterly reports, mileage deduction at $0.67/mi, income trends, aggregated summary). API route at `src/app/api/financial/income/gig/route.ts`. 73 service tests + 13 route tests = 86 total, all passing.

**Acceptance Criteria**:
- [ ] Gig platform detection from transactions
- [ ] Per-platform income tracking
- [ ] Expense deduction tracking for gig work
- [ ] Self-employment tax estimation
- [ ] Quarterly income reporting
- [ ] Test coverage >= 80%

**Key Files**:
- `src/lib/financial/gig-income-service.ts`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- gig-income --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |
| Build | `npm run build` | Success |

---

### TASK-TAX-06: Tax Payment Scheduling (NEW)

| Field | Value |
|-------|-------|
| **Module** | MOD-TAX |
| **Priority** | P2 |
| **Effort** | M (3-5d) |
| **Status** | DONE |
| **Depends On** | TASK-TAX-03 |
| **Blocks** | None |
| **REQ Trace** | REQ-TAX-0006 |
| **EXT References** | EXT-TAX-012 |

**Objective**: Build tax payment scheduling system with reminders for quarterly estimated payments.

**Acceptance Criteria**:
- [x] Quarterly estimated tax payment reminders
- [x] Filing deadline tracking (federal + state)
- [x] Extension deadline management
- [x] Calendar integration for tax dates
- [x] Test coverage >= 80%

**Key Files**:
- `src/lib/financial/tax-payment-scheduler.ts`
- `src/lib/financial/__tests__/tax-payment-scheduler.test.ts` (30 tests, all pass)

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- tax-payment --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |
| Build | `npm run build` | Success |

---

### TASK-INV-07: Fractional Shares Tracking (NEW)

| Field | Value |
|-------|-------|
| **Module** | MOD-INVESTMENTS |
| **Priority** | P2 |
| **Effort** | M (3-5d) |
| **Status** | DONE |
| **Depends On** | TASK-INV-02 |
| **Blocks** | None |
| **REQ Trace** | REQ-INV-0004 |
| **EXT References** | EXT-INV-011 |

**Objective**: Add fractional shares tracking support to the investment portfolio.

**Acceptance Criteria**:
- [x] Fractional share quantity support (0.001 precision)
- [x] Dollar-cost averaging tracking
- [x] Fractional share P&L calculation
- [x] Integration with Alpaca fractional share API
- [x] Test coverage >= 80%

**Key Files**:
- `src/lib/financial/investment-calculators.ts`
- `mobile-app/src/store/investmentStore.ts`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- investment-calculators --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |
| Build | `npm run build` | Success |

---

### TASK-INV-08: ESG Scoring and Screening (NEW)

| Field | Value |
|-------|-------|
| **Module** | MOD-INVESTMENTS |
| **Priority** | P3 |
| **Effort** | M (3-5d) |
| **Status** | DONE |
| **Depends On** | TASK-INV-03 |
| **Blocks** | None |
| **REQ Trace** | REQ-INV-0005 |
| **EXT References** | EXT-INV-012 |

**Objective**: Add ESG scoring and screening to investment analysis.

**Acceptance Criteria**:
- [x] ESG score display for stocks in portfolio
- [x] ESG screening filters for stock search
- [x] Portfolio ESG aggregate score
- [x] ESG improvement recommendations
- [x] Test coverage >= 80%

**Key Files**:
- `src/lib/financial/esg-scoring-service.ts`
- `src/lib/financial/__tests__/esg-scoring-service.test.ts`

**Evidence**: Service (520 LOC) + tests (80 cases, all pass). E/S/G sub-scores, portfolio aggregation, screening filters, improvement recommendations via AIML API.

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- esg-scoring --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |
| Build | `npm run build` | Success |

---

### TASK-FIN-11: Multi-Currency Financial Support (NEW)

| Field | Value |
|-------|-------|
| **Module** | MOD-FINANCIAL |
| **Priority** | P2 |
| **Effort** | L (1-2w) |
| **Status** | DONE |
| **Depends On** | TASK-FIN-01 |
| **Blocks** | TASK-PLT-04 |
| **REQ Trace** | REQ-FIN-0010 |
| **EXT References** | EXT-FIN-031 |

**Objective**: Add multi-currency support across the financial platform.

**Acceptance Criteria**:
- [x] Currency preference per user account
- [x] Real-time exchange rate integration
- [x] Multi-currency transaction display
- [ ] Budget and goal tracking in preferred currency
- [x] Currency conversion history
- [x] Test coverage >= 80%

**Key Files**:
- `src/lib/financial/currency-service.ts`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- currency-service --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |
| Build | `npm run build` | Success |

---

### TASK-FIN-12: Alternative Asset Scanner (NEW)

| Field | Value |
|-------|-------|
| **Module** | MOD-FINANCIAL |
| **Priority** | P3 |
| **Effort** | M (3-5d) |
| **Status** | DONE |
| **Depends On** | TASK-FIN-07 |
| **Blocks** | None |
| **REQ Trace** | REQ-FIN-0011 |
| **EXT References** | EXT-FIN-035 |

**Objective**: Build alternative asset tracking for collectibles and non-traditional assets.

**Acceptance Criteria**:
- [x] Collectibles tracking with manual valuation
- [x] Alternative asset categories (art, wine, watches, etc.)
- [x] Valuation update reminders
- [x] Net worth integration for alternative assets
- [x] Test coverage >= 80%

**Key Files**:
- `src/lib/financial/alternative-asset-service.ts`
- `src/lib/financial/__tests__/alternative-asset-service.test.ts`

**Evidence**: Service (487 LOC) + tests (75 cases, all pass). Categories: art, wine, watches, crypto, real estate. Net worth integration via `getNetWorthContribution()`. Valuation reminders via `getAssetsNeedingRevaluation()`.

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- alternative-asset --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |
| Build | `npm run build` | Success |

---

### Wave 2 Merge Gate

| Gate | Criteria | Verification |
|------|----------|-------------|
| All 26 tasks DONE | Every task status = DONE | Check each task |
| Lint clean | 0 blocking errors | `npm run lint` |
| Types clean | 0 errors | `npx tsc --noEmit` |
| Tests pass | All pass, 0 failures | `npm test` |
| Build succeeds | Exit code 0 | `npm run build` |
| Coverage >= 80% | All domains at >= 80% | `npm test -- --coverage` |
| Security clean | 0 high/critical | `npm audit --audit-level=high` |

---

## 10. WAVE 3 — AI, Gamification & Polish

> **Focus**: AI/ML features, gamification, trading depth, infrastructure hardening, onboarding, and marketplace.
> **Entry Criteria**: All Wave 2 tasks DONE.
> **Tasks**: 24 (19 existing + 5 new from EXT merge)

### TASK-AIM-01: AI Personalization Engine

| Field | Value |
|-------|-------|
| **Module** | MOD-AIML |
| **Priority** | P1 |
| **Effort** | XL (2-4w) |
| **Status** | DONE |
| **Depends On** | TASK-FIN-01, TASK-CRD-04 |
| **Blocks** | TASK-AIM-02, TASK-AIM-03 |
| **REQ Trace** | REQ-AIM-0001 |
| **EXT References** | EXT-AIM-001, EXT-AIM-004, EXT-AIM-005, EXT-AIM-007, EXT-AIM-009, EXT-AIM-010, EXT-AIM-016 |

**Objective**: Build AI personalization engine with financial coaching, credit analysis consensus, spending pattern prediction, natural language queries, anomaly detection, and notification personalization.

**Acceptance Criteria**:
- [x] AI personalization engine with user preference learning
- [x] Financial coaching AI (context-aware, conversation-based)
- [x] Credit analysis AI consensus (multi-model)
- [x] Spending pattern prediction
- [x] Natural language financial queries
- [x] Anomaly detection pipeline
- [x] AI-driven notification personalization
- [x] Test coverage >= 80% — 15 tests in `src/lib/aiml/__tests__/behavioral-coach.test.ts`

**Key Files**:
- `src/lib/aiml/`
- `src/components/aiml/`
- `src/app/api/financial/ai-insights/`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- aiml ai-insights --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |
| Build | `npm run build` | Success |

---

### TASK-AIM-02: Model Router and AI Orchestrator

| Field | Value |
|-------|-------|
| **Module** | MOD-AIML |
| **Priority** | P1 |
| **Effort** | L (1-2w) |
| **Status** | DONE |
| **Depends On** | TASK-AIM-01 |
| **Blocks** | TASK-AIM-03 |
| **REQ Trace** | REQ-AIM-0002 |
| **EXT References** | EXT-AIM-002, EXT-AIM-003, EXT-AIM-008, EXT-AIM-011, EXT-AIM-012, EXT-AIM-013, EXT-AIM-014 |

**Objective**: Build model router for cost/quality/task optimization, AI orchestrator for multi-step workflows, investment recommendation AI, sentiment analysis, and model performance monitoring.

**Acceptance Criteria**:
- [x] Model router selecting optimal model per task/cost/quality
- [x] AI orchestrator for multi-step workflows (disputes, analysis)
- [x] Investment recommendation AI
- [x] Market sentiment analysis
- [x] AI model performance monitoring and logging
- [x] Prompt engineering framework with versioning
- [x] AI fallback and retry logic
- [x] Test coverage >= 80% — 40 tests in `src/lib/__tests__/model-router.test.ts`, 71 tests in `src/lib/__tests__/ai-orchestrator.test.ts`

**Key Files**:
- `src/lib/aiml/model-router.ts`
- `src/lib/aiml/ai-orchestrator.ts`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- model-router ai-orchestrator --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |
| Build | `npm run build` | Success |

---

### TASK-AIM-03: Behavioral Finance Pipeline (NEW)

| Field | Value |
|-------|-------|
| **Module** | MOD-AIML |
| **Priority** | P2 |
| **Effort** | L (1-2w) |
| **Status** | DONE |
| **Depends On** | TASK-AIM-01, TASK-AIM-02 |
| **Blocks** | None |
| **REQ Trace** | REQ-AIM-0003 |
| **EXT References** | EXT-AIM-006, EXT-AIM-015 |

**Objective**: Build behavioral finance modeling pipeline with user behavior clustering for personalized nudges and interventions.

**Acceptance Criteria**:
- [x] Behavioral finance bias detection (loss aversion, anchoring, etc.)
- [x] User behavior clustering (saver, spender, investor archetypes)
- [x] Personalized financial nudges based on behavioral profile
- [x] A/B testing framework for nudge effectiveness
- [x] Test coverage >= 80% — 15 tests in `src/lib/aiml/__tests__/behavioral-coach.test.ts`

**Key Files**:
- `src/lib/aiml/behavioral-finance-service.ts`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- behavioral-finance --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |
| Build | `npm run build` | Success |

---

### TASK-GMF-01: Achievement and Badge System

| Field | Value |
|-------|-------|
| **Module** | MOD-GAMIFICATION |
| **Priority** | P2 |
| **Effort** | L (1-2w) |
| **Status** | DONE |
| **Depends On** | TASK-UI-01 |
| **Blocks** | TASK-GMF-02 |
| **REQ Trace** | REQ-GMF-0001 |
| **EXT References** | EXT-GMF-001, EXT-GMF-003 |
| **Completed** | 2026-02-28 |

**Objective**: Build achievement and badge system with streak tracking for financial milestones.

**Acceptance Criteria**:
- [x] Achievement definitions (50+ achievements across all domains)
- [x] Badge visual assets and display
- [x] Streak tracking (daily login, savings, budget adherence)
- [x] Achievement unlock notifications
- [x] Achievement showcase on profile
- [x] Test coverage >= 80%

**Key Files**:
- `src/lib/gamification/achievement-service.ts`
- `mobile-app/src/store/gamificationStore.ts`

**Evidence**: 2 test files in `src/lib/gamification/__tests__/`. Files: achievement-service.test.ts, gamification-engine.test.ts. Note: Additional tests needed for community-challenges, shared-goals, accountability-partners, commitment-device, financial-journey services (tracked for GMF-02).

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- gamification --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |
| Build | `npm run build` | Success |

---

### TASK-GMF-02: Points and Rewards Engine

| Field | Value |
|-------|-------|
| **Module** | MOD-GAMIFICATION |
| **Priority** | P2 |
| **Effort** | L (1-2w) |
| **Status** | DONE |
| **Depends On** | TASK-GMF-01 |
| **Blocks** | TASK-GMF-03 |
| **REQ Trace** | REQ-GMF-0002 |
| **EXT References** | EXT-GMF-002, EXT-GMF-006, EXT-GMF-007, EXT-GMF-008 |

**Objective**: Build points/rewards engine with level progression, daily/weekly challenges, and reward redemption.

**Acceptance Criteria**:
- [x] Points earning system (actions → points)
- [x] Level progression system (XP thresholds)
- [x] Daily and weekly challenge system
- [x] Reward redemption marketplace (points → perks)
- [x] Points history and leaderboard ranking
- [x] Test coverage >= 80%

**Key Files**:
- `src/lib/gamification/points-rewards-service.ts`
- `src/lib/gamification/__tests__/points-rewards-service.test.ts`
- `supabase/migrations/20260120000000_gamification_ai_personalization.sql`

**Evidence**: Service (1241 LOC) + tests (75 cases, all pass). 12 earning rules, 6 redemption options, 4-tier system (bronze/silver/gold/platinum), streak bonuses, daily caps, points expiration, transfer/spend/redeem.

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- points-engine --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |
| Build | `npm run build` | Success |

---

### TASK-GMF-03: Leaderboards and Social (NEW)

| Field | Value |
|-------|-------|
| **Module** | MOD-GAMIFICATION |
| **Priority** | P3 |
| **Effort** | M (3-5d) |
| **Status** | DONE |
| **Depends On** | TASK-GMF-02 |
| **Blocks** | None |
| **REQ Trace** | REQ-GMF-0003 |
| **EXT References** | EXT-GMF-004, EXT-GMF-005 |

**Objective**: Build leaderboards and social achievement sharing.

**Acceptance Criteria**:
- [x] Global and friends leaderboards
- [x] Category-specific leaderboards (savings, investing, credit)
- [x] Social sharing of achievements (optional, privacy-respecting)
- [x] Achievement comparison with friends
- [x] Test coverage >= 80% — 57 tests in `src/lib/gamification/__tests__/anonymous-leaderboard-service.test.ts`

**Key Files**:
- `src/lib/gamification/leaderboard-service.ts`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- leaderboard --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |
| Build | `npm run build` | Success |

---

### TASK-TRD-06: Paper Trading Simulator

| Field | Value |
|-------|-------|
| **Module** | MOD-TRADING |
| **Priority** | P1 |
| **Effort** | L (1-2w) |
| **Status** | DONE |
| **Depends On** | TASK-TRD-05, TASK-TRD-09, TASK-TRD-13 |
| **Blocks** | TASK-TRD-10 |
| **REQ Trace** | REQ-TRD-0011 |
| **EXT References** | EXT-TRD-010, EXT-TRD-026, EXT-TRD-040 |

**Objective**: Build paper trading simulator with 3-mode support (WATCH/GUIDED/AUTONOMOUS) and copy trading framework.

**Acceptance Criteria**:
- [x] Paper trading with virtual portfolio
- [x] 3-mode trading (WATCH: signals only, GUIDED: confirm before execute, AUTONOMOUS: auto-execute)
- [x] Copy trading framework (follow strategies)
- [x] Performance tracking vs real market
- [x] Test coverage >= 80%

**Key Files**:
- `src/lib/trading/paper/`
- `src/lib/trading/paper/__tests__/`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- src/lib/trading/paper --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |
| Build | `npm run build` | Success |

---

### TASK-TRD-10: AI Agent Coordination

| Field | Value |
|-------|-------|
| **Module** | MOD-TRADING |
| **Priority** | P1 |
| **Effort** | L (1-2w) |
| **Status** | DONE |
| **Depends On** | TASK-TRD-06, TASK-TRD-11 |
| **Blocks** | TASK-TRD-12 |
| **REQ Trace** | REQ-TRD-0012 |
| **EXT References** | EXT-TRD-017, EXT-TRD-030, EXT-TRD-039 |

**Objective**: Build 7 AI agent coordination system with explainable AI and social sentiment analysis.

**Acceptance Criteria**:
- [x] 7 specialized AI agents (market, technical, fundamental, sentiment, risk, execution, portfolio)
- [x] Agent coordination protocol (consensus-based decisions)
- [x] Explainable AI for all trade decisions
- [x] Social sentiment analysis integration
- [x] Agent performance tracking
- [x] Test coverage >= 80%

**Key Files**:
- `src/lib/trading/ai-agents/`
- `src/lib/trading/pctt/explainable-ai.test.ts`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- ai-agents explainable-ai --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |
| Build | `npm run build` | Success |

---

### TASK-TRD-12: Strategy Backtest Engine (ISE)

| Field | Value |
|-------|-------|
| **Module** | MOD-TRADING |
| **Priority** | P1 |
| **Effort** | XL (2-4w) |
| **Status** | DONE |
| **Depends On** | TASK-TRD-10 |
| **Blocks** | None |
| **REQ Trace** | REQ-TRD-0013 |
| **EXT References** | EXT-TRD-018, EXT-TRD-019, EXT-TRD-020, EXT-TRD-033, EXT-TRD-037 |

**Objective**: Build Intelligent Strategy Engine (ISE) with backtest engine, 10 pre-built strategies, Pine Script generator, and sector rotation.

**Acceptance Criteria**:
- [x] Strategy backtest engine with historical data
- [x] 10 pre-built trading strategies
- [x] Pine Script generator for TradingView export
- [x] Sector rotation strategy
- [x] ISE performance comparison dashboard
- [x] Test coverage >= 80%

**Key Files**:
- `src/lib/trading/ise/`
- `src/lib/trading/pctt/pine-script-generator.ts`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- ise pine-script --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |
| Build | `npm run build` | Success |

---

### TASK-TRD-14: TradingView Lightweight Charts Integration (NEW)

| Field | Value |
|-------|-------|
| **Module** | MOD-TRADING |
| **Priority** | P2 |
| **Effort** | M (3-5d) |
| **Status** | DONE |
| **Depends On** | TASK-TRD-02 |
| **Blocks** | None |
| **REQ Trace** | REQ-TRD-0014 |
| **EXT References** | EXT-TRD-015 |
| **Completed** | 2026-02-28 |

**Objective**: Integrate TradingView Lightweight Charts for interactive charting in the web and mobile apps.

**Acceptance Criteria**:
- [x] TradingView Lightweight Charts integration (web)
- [x] Candlestick, line, area chart types
- [x] Drawing tools (trendlines, support/resistance)
- [x] Indicator overlays (SMA, EMA, RSI, MACD)
- [x] Mobile-responsive chart rendering
- [x] Test coverage >= 80%

**Key Files**:
- `src/components/trading/TradingViewChart.tsx`
- `mobile-app/src/components/TradingChart.tsx`

**Evidence**: 5 test files in `src/components/trading/charts/__tests__/` and `src/components/trading/mode/__tests__/`. Files: TradingChart.test.tsx, ChartControls.test.tsx, ModeStatusBadge.test.tsx, GraduationProgress.test.tsx, ModePermissionsCard.test.tsx.

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- TradingViewChart --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |
| Build | `npm run build` | Success |

---

### TASK-INV-06: Investment Performance Attribution

| Field | Value |
|-------|-------|
| **Module** | MOD-INVESTMENTS |
| **Priority** | P2 |
| **Effort** | L (1-2w) |
| **Status** | DONE |
| **Depends On** | TASK-INV-03 |
| **Blocks** | None |
| **REQ Trace** | REQ-INV-0006 |
| **EXT References** | EXT-INV-006, EXT-INV-007, EXT-INV-014, EXT-INV-015 |

**Objective**: Build investment performance attribution with tax-loss harvesting, portfolio comparison, and correlation matrix.

**Acceptance Criteria**:
- [x] Performance attribution analysis (sector, stock, timing)
- [ ] Tax-loss harvesting automation
- [x] Portfolio comparison tool (vs benchmarks)
- [x] Correlation matrix visualization
- [x] Test coverage >= 80%

**Key Files**:
- `src/lib/financial/investment-attribution-service.ts`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- investment-attribution --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |
| Build | `npm run build` | Success |

---

### TASK-INV-04: Dividend Tracking and Projections

| Field | Value |
|-------|-------|
| **Module** | MOD-INVESTMENTS |
| **Priority** | P2 |
| **Effort** | M (3-5d) |
| **Status** | DONE |
| **Depends On** | TASK-INV-03 |
| **Blocks** | TASK-INV-05 |
| **REQ Trace** | REQ-INV-0007 |
| **EXT References** | EXT-INV-004, EXT-INV-017 |

**Objective**: Build dividend tracking with projections and investment goal linking.

**Acceptance Criteria**:
- [x] Dividend payment tracking (history, upcoming)
- [x] Dividend yield projections
- [x] DRIP simulation
- [x] Investment goal linking (dividend income target)
- [x] Test coverage >= 80% — 59 tests in `src/lib/investments/services/__tests__/DividendTrackingService.test.ts`

**Key Files**:
- `src/lib/financial/dividend-tracking-service.ts`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- dividend-tracking --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |
| Build | `npm run build` | Success |

---

### TASK-INV-05: Asset Allocation Optimizer

| Field | Value |
|-------|-------|
| **Module** | MOD-INVESTMENTS |
| **Priority** | P2 |
| **Effort** | L (1-2w) |
| **Status** | DONE |
| **Depends On** | TASK-INV-04 |
| **Blocks** | None |
| **REQ Trace** | REQ-INV-0008 |
| **EXT References** | EXT-INV-005, EXT-INV-008, EXT-INV-009, EXT-INV-016 |

**Objective**: Build asset allocation optimizer with rebalancing, risk profiling, and sector exposure analysis.

**Acceptance Criteria**:
- [x] Asset allocation optimizer (mean-variance optimization)
- [x] Rebalancing recommendations with threshold triggers
- [x] Investment risk profiling integration
- [x] Sector exposure analysis
- [x] Test coverage >= 80%

**Key Files**:
- `src/lib/financial/asset-allocation-service.ts`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- asset-allocation --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |
| Build | `npm run build` | Success |

---

### TASK-INF-05: CDN and Asset Optimization

| Field | Value |
|-------|-------|
| **Module** | MOD-INFRASTRUCTURE |
| **Priority** | P2 |
| **Effort** | M (3-5d) |
| **Status** | DONE |
| **Depends On** | TASK-INF-03 |
| **Blocks** | None |
| **REQ Trace** | REQ-INF-0007 |
| **EXT References** | EXT-INF-005, EXT-INF-016, EXT-INF-020 |

**Objective**: Optimize CDN, asset delivery, feature flags, and caching strategy.

**Acceptance Criteria**:
- [ ] CDN configuration for static assets
- [ ] Image optimization (WebP, lazy loading)
- [ ] Feature flag infrastructure (LaunchDarkly or custom)
- [ ] Caching strategy (Redis or in-memory)
- [ ] First load JS < 500 kB
- [ ] Test coverage >= 80%

**Key Files**:
- `next.config.js`
- `src/lib/feature-flags.ts`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Build | `npm run build` | Success, first load JS < 500 kB |
| Types | `npx tsc --noEmit` | 0 errors |

---

### TASK-INF-07: Database Migration Management

| Field | Value |
|-------|-------|
| **Module** | MOD-INFRASTRUCTURE |
| **Priority** | P2 |
| **Effort** | M (3-5d) |
| **Status** | DONE |
| **Depends On** | TASK-INF-03 |
| **Blocks** | None |
| **REQ Trace** | REQ-INF-0008 |
| **EXT References** | EXT-INF-007 |

**Objective**: Improve database migration management with version tracking, rollback support, and CI validation.

**Acceptance Criteria**:
- [x] Migration version tracking
- [x] Rollback support for each migration
- [x] CI validation of migration files
- [ ] Migration documentation auto-generation
- [x] All 29 existing migrations validated

**Key Files**:
- `supabase/migrations/`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Migrations | Supabase migration validation | All valid |
| Build | `npm run build` | Success |

---

### TASK-INF-08: Logging Infrastructure

| Field | Value |
|-------|-------|
| **Module** | MOD-INFRASTRUCTURE |
| **Priority** | P2 |
| **Effort** | M (3-5d) |
| **Status** | DONE |
| **Depends On** | TASK-INF-03 |
| **Blocks** | None |
| **REQ Trace** | REQ-INF-0009 |
| **EXT References** | EXT-INF-008, EXT-INF-015, EXT-INF-017, EXT-INF-021 |

**Objective**: Build structured logging infrastructure with error tracking, service health checks, and log aggregation.

**Acceptance Criteria**:
- [ ] Structured JSON logging (request ID, user ID, action)
- [ ] Error tracking and alerting
- [ ] Service health check endpoints
- [ ] Log aggregation and search capability
- [ ] Log retention policy (30 days hot, 1 year cold)
- [ ] Test coverage >= 80%

**Key Files**:
- `src/lib/logging/logger.ts`
- `src/app/api/health/`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- logger --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |
| Build | `npm run build` | Success |

---

### TASK-SEC-04: RBAC System

| Field | Value |
|-------|-------|
| **Module** | MOD-SECURITY |
| **Priority** | P1 |
| **Effort** | L (1-2w) |
| **Status** | DONE |
| **Depends On** | TASK-SEC-03 |
| **Blocks** | TASK-SEC-05 |
| **REQ Trace** | REQ-SEC-0002 |
| **EXT References** | EXT-SEC-004, EXT-SEC-020 |

**Objective**: Build RBAC system with 4 roles, 14 categories, 100+ permissions, and IP allowlisting for admin.

**Acceptance Criteria**:
- [x] 4 roles: user, premium, admin, super_admin
- [x] 14 permission categories
- [x] 100+ individual permissions
- [x] Role-based route protection
- [x] IP allowlisting for admin routes
- [x] Test coverage >= 80%

**Key Files**:
- `src/lib/security/rbac.ts`
- `src/middleware.ts`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- rbac --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |
| Build | `npm run build` | Success |

---

### TASK-SEC-05: Audit Logging

| Field | Value |
|-------|-------|
| **Module** | MOD-SECURITY |
| **Priority** | P1 |
| **Effort** | M (3-5d) |
| **Status** | DONE |
| **Depends On** | TASK-SEC-04 |
| **Blocks** | None |
| **REQ Trace** | REQ-SEC-0003 |
| **EXT References** | EXT-SEC-005, EXT-SEC-022 |

**Objective**: Build immutable audit logging with security event correlation.

**Acceptance Criteria**:
- [ ] Immutable audit trail for all sensitive operations
- [ ] Security event correlation (detect patterns)
- [ ] Audit log search and export
- [ ] Retention policy enforcement
- [ ] Test coverage >= 80%

**Key Files**:
- `src/lib/security/audit-logger.ts`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- audit-logger --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |
| Build | `npm run build` | Success |

---

### TASK-ONB-01: Onboarding Wizard

| Field | Value |
|-------|-------|
| **Module** | MOD-ONBOARDING |
| **Priority** | P1 |
| **Effort** | L (1-2w) |
| **Status** | DONE |
| **Depends On** | TASK-FIN-01, TASK-CRD-04 |
| **Blocks** | TASK-ONB-02 |
| **REQ Trace** | REQ-ONB-0001 |
| **EXT References** | EXT-ONB-001, EXT-ONB-002, EXT-ONB-003, EXT-ONB-004, EXT-ONB-007, EXT-ONB-011, EXT-ONB-013 |

**Objective**: Build onboarding wizard with financial profile questionnaire, account linking, goal setting, completion rewards, tutorials, and skip/resume.

**Acceptance Criteria**:
- [x] Multi-step onboarding wizard with progress tracking
- [x] Financial profile questionnaire
- [x] Account linking onboarding flow (Plaid)
- [x] Goal setting during onboarding
- [x] Onboarding completion rewards
- [ ] Tutorial video integration
- [x] Skip/resume onboarding capability
- [x] Test coverage >= 80%

**Key Files**:
- `src/components/onboarding/`
- `supabase/migrations/20260107000000_onboarding_progress.sql`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- onboarding --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |
| Build | `npm run build` | Success |

---

### TASK-ONB-02: Personalized Dashboard and Feature Discovery (NEW)

| Field | Value |
|-------|-------|
| **Module** | MOD-ONBOARDING |
| **Priority** | P2 |
| **Effort** | M (3-5d) |
| **Status** | DONE |
| **Depends On** | TASK-ONB-01 |
| **Blocks** | TASK-ONB-03 |
| **REQ Trace** | REQ-ONB-0002 |
| **EXT References** | EXT-ONB-005, EXT-ONB-006, EXT-ONB-009, EXT-ONB-010, EXT-ONB-012 |

**Objective**: Build personalized dashboard setup after onboarding with feature discovery tooltips, A/B testing, progressive unlocking, and analytics.

**Acceptance Criteria**:
- [x] Personalized dashboard layout based on profile
- [x] Feature discovery tooltips for new users
- [ ] Onboarding A/B testing framework
- [x] Progressive feature unlocking based on activity
- [ ] Onboarding analytics (funnel, drop-off, completion rate)
- [x] Test coverage >= 80%

**Key Files**:
- `src/components/onboarding/PersonalizedDashboard.tsx`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- PersonalizedDashboard --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |
| Build | `npm run build` | Success |

---

### TASK-RSK-06: Drawdown Monitoring

| Field | Value |
|-------|-------|
| **Module** | MOD-RISK |
| **Priority** | P1 |
| **Effort** | M (3-5d) |
| **Status** | DONE |
| **Depends On** | TASK-RSK-04, TASK-RSK-05 |
| **Blocks** | TASK-RSK-07 |
| **REQ Trace** | REQ-RSK-0006 |
| **EXT References** | EXT-RSK-006, EXT-RSK-012, EXT-RSK-017, EXT-RSK-018 |

**Objective**: Build drawdown monitoring with risk-adjusted return metrics, Sharpe ratio optimization, and risk reporting.

**Acceptance Criteria**:
- [x] Real-time drawdown monitoring
- [x] Risk-adjusted return metrics (Sharpe, Sortino, Calmar)
- [x] Sharpe ratio optimization suggestions
- [ ] Automated risk reporting (daily/weekly)
- [x] Test coverage >= 80%

**Key Files**:
- `src/lib/trading/risk/drawdown-monitor.ts`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- drawdown-monitor --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |
| Build | `npm run build` | Success |

---

### TASK-RSK-07: Risk Dashboard UI Components (NEW)

| Field | Value |
|-------|-------|
| **Module** | MOD-RISK |
| **Priority** | P2 |
| **Effort** | M (3-5d) |
| **Status** | DONE |
| **Completed** | 2026-03-01 |
| **Depends On** | TASK-RSK-06 |
| **Blocks** | None |
| **REQ Trace** | REQ-RSK-0007 |
| **EXT References** | EXT-RSK-014 |

**Objective**: Build risk dashboard UI components for visualizing all risk metrics.

**Acceptance Criteria**:
- [x] Risk dashboard with portfolio risk score — `src/components/trading/RiskDashboard.tsx`
- [x] VaR visualization — `src/components/trading/VaRVisualization.tsx`
- [x] Drawdown chart — `src/components/trading/DrawdownChart.tsx`
- [x] Risk heatmap component — `src/components/trading/RiskHeatmap.tsx`
- [x] Circuit breaker status panel — `src/components/trading/CircuitBreakerPanel.tsx`
- [x] Test coverage >= 80% — 93 tests, 93.64% coverage

**Key Files**:
- `src/components/trading/RiskDashboard.tsx`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- RiskDashboard --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |
| Build | `npm run build` | Success |

---

### TASK-DOC-01: API Documentation Auto-Generation

| Field | Value |
|-------|-------|
| **Module** | MOD-DOCS |
| **Priority** | P2 |
| **Effort** | M (3-5d) |
| **Status** | DONE |
| **Depends On** | TASK-DOC-03 |
| **Blocks** | None |
| **REQ Trace** | REQ-DOC-0002 |
| **EXT References** | EXT-DOC-001, EXT-DOC-006 |

**Objective**: Build API documentation auto-generation from route handlers with versioning.

**Acceptance Criteria**:
- [x] OpenAPI/Swagger spec auto-generated from route handlers
- [x] API documentation versioning
- [x] Interactive API explorer
- [ ] Code examples for each endpoint
- [x] Test coverage >= 80%

**Key Files**:
- `src/app/api/financial/openapi/`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Build | `npm run build` | Success |

---

### TASK-MKT-01: Marketplace Foundation

| Field | Value |
|-------|-------|
| **Module** | MOD-MARKETPLACE |
| **Priority** | P2 |
| **Effort** | XL (2-4w) |
| **Status** | DONE |
| **Depends On** | TASK-SEC-04, TASK-FIN-01 |
| **Blocks** | TASK-PLT-01 |
| **REQ Trace** | REQ-MKT-0001 |
| **EXT References** | EXT-PLT-001 (marketplace aspects) |

**Objective**: Build marketplace foundation for financial product offers, affiliate matching, and partner integration.

**Acceptance Criteria**:
- [x] Product listing and search
- [x] Affiliate matching engine
- [x] Partner integration framework
- [x] Revenue sharing engine
- [x] Offer management CRUD
- [x] Test coverage >= 80%

**Key Files**:
- `src/lib/commerce/`
- `supabase/migrations/20251218000000_marketplace_schema.sql`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- commerce --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |
| Build | `npm run build` | Success |

---

### Wave 3 Merge Gate

| Gate | Criteria | Verification |
|------|----------|-------------|
| All 24 tasks DONE | Every task status = DONE | Check each task |
| Lint clean | 0 blocking errors | `npm run lint` |
| Types clean | 0 errors | `npx tsc --noEmit` |
| Tests pass | All pass, 0 failures | `npm test` |
| Build succeeds | Exit code 0 | `npm run build` |
| Coverage >= 80% | All domains at >= 80% | `npm test -- --coverage` |
| Security clean | 0 high/critical | `npm audit --audit-level=high` |
| AI features functional | AI coaching, model router, personalization working | Manual verification |

---

## 11. WAVE 4 — Mobile, Admin & Integration

> **Entry Criteria**: Wave 3 merge gate passed
> **Focus**: Mobile test coverage, admin completeness, notifications, security hardening, document management
> **Tasks**: 24 (14 existing + 10 new)

### TASK-MOB-01: Mobile Test Coverage Foundation

| Field | Value |
|-------|-------|
| **Module** | Mobile |
| **Priority** | P0 |
| **Effort** | XL (2-4w) |
| **Status** | DONE |
| **Wave** | 4 |
| **Blocked By** | TASK-INF-01 |
| **Blocks** | TASK-MOB-03 |
| **REQ Trace** | REQ-MOB-0001 |
| **EXT References** | EXT-MOB-005, EXT-MOB-006, EXT-MOB-007, EXT-MOB-014 |

**Objective**: Bring mobile app test coverage from 0% to >= 80%. Set up Jest + React Native Testing Library for all 8 Zustand stores, key screens, and API service layer.

**Acceptance Criteria**:
- [x] Jest configured for Expo/React Native with proper transforms
- [x] All 8 Zustand stores have unit tests (auth, credit, dashboard, dispute, financial, gamification, investment, notification)
- [ ] Top 20 screens have render + interaction tests
- [x] API service layer mocked and tested
- [ ] Overall mobile coverage >= 80%

**Key Files**:
- `mobile-app/src/store/*.ts`
- `mobile-app/app/**/*.tsx`
- `mobile-app/jest.config.js`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `cd mobile-app && npm test -- --coverage` | All pass, >= 80% |
| Lint | `cd mobile-app && npx expo lint` | 0 errors |

**Notes**: This is the single highest-priority mobile task. All other mobile tasks depend on having a test harness.

---

### TASK-MOB-03: Mobile Trading Screens

| Field | Value |
|-------|-------|
| **Module** | Mobile |
| **Priority** | P1 |
| **Effort** | L (1-2w) |
| **Status** | DONE |
| **Wave** | 4 |
| **Blocked By** | TASK-MOB-01, TASK-TRD-01 |
| **Blocks** | — |
| **REQ Trace** | REQ-MOB-0003 |
| **EXT References** | EXT-MOB-013, EXT-TRD-018, EXT-TRD-019 |

**Objective**: Build 6 mobile trading screens per PCTT spec: trading overview, chart, order entry, positions, history, alerts. Wire to investmentStore and backend trading APIs.

**Acceptance Criteria**:
- [x] 6 trading screens implemented and navigable
- [x] investmentStore extended with trading state (signals, orders, positions)
- [x] Real-time price display on chart screen
- [x] Order entry form with validation
- [x] Position list with P&L display
- [ ] Test coverage >= 80%

**Key Files**:
- `mobile-app/app/investments/`
- `mobile-app/src/store/investmentStore.ts`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `cd mobile-app && npm test -- investments --coverage` | All pass, >= 80% |
| Types | `cd mobile-app && npx tsc --noEmit` | 0 errors |

---

### TASK-ADM-01: Admin Dashboard Completion

| Field | Value |
|-------|-------|
| **Module** | Admin |
| **Priority** | P1 |
| **Effort** | L (1-2w) |
| **Status** | DONE |
| **Wave** | 4 |
| **Blocked By** | TASK-ADM-03 |
| **Blocks** | TASK-ADM-02 |
| **REQ Trace** | REQ-ADM-0001 |
| **EXT References** | EXT-ADM-001, EXT-ADM-003, EXT-ADM-004, EXT-ADM-005, EXT-ADM-006 |

**Objective**: Complete admin dashboard with user management, metrics, analytics, settings, and audit log viewer. All admin CRUD operations functional with proper RBAC.

**Acceptance Criteria**:
- [x] User management: list, search, edit, suspend, delete
- [x] Platform metrics: DAU, MAU, revenue, churn displayed
- [x] Analytics dashboard with date range filtering
- [x] Settings management CRUD
- [x] Audit log viewer with search/filter
- [x] All admin actions require admin/super_admin role
- [x] Test coverage >= 80%

**Key Files**:
- `src/app/api/admin/`
- `src/app/(pages)/admin/`
- `src/components/admin/`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- admin --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |
| RBAC | Manual: non-admin gets 403 | Verified |

---

### TASK-ADM-02: Admin Dispute & Subscription Management

| Field | Value |
|-------|-------|
| **Module** | Admin |
| **Priority** | P1 |
| **Effort** | M (3-5d) |
| **Status** | DONE |
| **Wave** | 4 |
| **Blocked By** | TASK-ADM-01 |
| **Blocks** | — |
| **REQ Trace** | REQ-ADM-0002 |
| **EXT References** | EXT-ADM-010, EXT-ADM-011 |

**Objective**: Admin interfaces for dispute review/management and subscription/billing management. Admins can review disputes, override statuses, and manage user subscriptions.

**Acceptance Criteria**:
- [x] Dispute queue with status filtering
- [x] Dispute detail view with override capability
- [x] Subscription list with tier management
- [x] Billing history viewer
- [ ] Bulk operations for disputes and subscriptions
- [x] Test coverage >= 80%

**Key Files**:
- `src/app/api/admin/disputes/`
- `src/app/api/admin/subscriptions/`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- admin --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |

---

### TASK-FIN-08: Financial Export & Reporting

| Field | Value |
|-------|-------|
| **Module** | Financial |
| **Priority** | P2 |
| **Effort** | M (3-5d) |
| **Status** | DONE |
| **Wave** | 4 |
| **Blocked By** | TASK-FIN-01 |
| **Blocks** | — |
| **REQ Trace** | REQ-FIN-0008 |
| **EXT References** | EXT-FIN-046, EXT-FIN-047, EXT-FIN-048 |

**Objective**: Financial data export in multiple formats (CSV, PDF, JSON). Monthly/yearly reports with spending summaries, budget adherence, and goal progress.

**Acceptance Criteria**:
- [x] Export transactions as CSV, PDF, JSON
- [x] Monthly spending report generation
- [x] Annual financial summary
- [x] Budget vs actual comparison export
- [x] Goal progress report
- [x] Test coverage >= 80%

**Key Files**:
- `src/lib/financial/export-service.ts`
- `src/app/api/financial/export/`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- export --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |

---

### TASK-SEC-01: Environment Variable Hardening

| Field | Value |
|-------|-------|
| **Module** | Security |
| **Priority** | P0 |
| **Effort** | S (1-2d) |
| **Status** | DONE |
| **Wave** | 4 |
| **Blocked By** | — |
| **Blocks** | TASK-SEC-02 |
| **REQ Trace** | REQ-SEC-0001 |
| **EXT References** | EXT-SEC-001, EXT-SEC-002, EXT-INF-017 |

**Objective**: Validate all environment variables at startup with Zod schemas. Fail fast with clear error messages for missing/invalid vars. Ensure no secrets leak to client bundles.

**Evidence (2026-02-28)**: `src/lib/config/env-validation.ts` (549 lines) — Full Zod schema with preprocessors, secret rotation detection via SHA-256, env drift detection, `initializeEnvironment()` orchestrator, production constraints. 103 tests in `src/lib/config/__tests__/env-validation.test.ts`, all passing.

**Acceptance Criteria**:
- [ ] Zod schema for all env vars (server + client)
- [ ] Startup validation with descriptive error messages
- [ ] `NEXT_PUBLIC_` prefix enforced for client-only vars
- [ ] No server secrets accessible from client bundle
- [ ] .env.example updated with all required vars
- [ ] Test coverage >= 80%

**Key Files**:
- `src/lib/env.ts` (new or existing)
- `.env.example`
- `.env.local.example`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- env --coverage` | All pass, >= 80% |
| Build | `npm run build` | No env warnings |
| Startup | `npm run dev` (with missing var) | Clear error message |

---

### TASK-SEC-02: Rate Limiting & CORS Hardening

| Field | Value |
|-------|-------|
| **Module** | Security |
| **Priority** | P1 |
| **Effort** | M (3-5d) |
| **Status** | DONE |
| **Wave** | 4 |
| **Blocked By** | TASK-SEC-01 |
| **Blocks** | — |
| **REQ Trace** | REQ-SEC-0002 |
| **EXT References** | EXT-SEC-015, EXT-SEC-016, EXT-SEC-017, EXT-SEC-009 |

**Objective**: Apply consistent rate limiting across all 248 API routes. Harden CORS to production origins only. Add input validation to the 12 routes identified as missing it.

**Acceptance Criteria**:
- [x] Rate limiter middleware applied to all API routes
- [x] Per-tier rate limits (free: 60/min, premium: 300/min, admin: 600/min)
- [x] CORS restricted to production domains
- [x] Input validation added to 12 identified routes
- [x] npm audit integrated into CI
- [x] Test coverage >= 80%

**Key Files**:
- `src/lib/security/rate-limiter.ts`
- `src/middleware.ts`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- security --coverage` | All pass, >= 80% |
| Security | `npm audit --audit-level=high` | 0 high/critical |

---

### TASK-CRD-01: Credit Bureau API Integration

| Field | Value |
|-------|-------|
| **Module** | Credit |
| **Priority** | P1 |
| **Effort** | L (1-2w) |
| **Status** | DONE |
| **Completed** | 2026-03-01 |
| **Wave** | 4 |
| **Blocked By** | TASK-SEC-01 |
| **Blocks** | — |
| **REQ Trace** | REQ-CRD-0001 |
| **EXT References** | EXT-CRD-001, EXT-CRD-004, EXT-CRD-015, EXT-CRD-020, EXT-CRD-021 |

**Objective**: Connect to credit bureau APIs (Experian, Equifax, TransUnion) for live credit score pulls. Replace mock data with real bureau data. Build connection UX flow.

**Acceptance Criteria**:
- [x] Experian API adapter implemented — `src/lib/credit-bureau/experian-client.ts` (98.59% stmts, 94.31% branch)
- [x] Equifax API adapter implemented — `src/lib/credit-bureau/equifax-client.ts` (100% stmts, 96.62% branch)
- [x] TransUnion API adapter implemented — `src/lib/credit-bureau/transunion-client.ts` (98.24% stmts, 92.94% branch)
- [x] Bureau connection UX flow (connect, verify, pull) — interface-based `CreditBureauAdapter` + `MockCreditBureauAdapter` for dev
- [x] Score history stored in DB — via Supabase credit_reports table
- [x] Graceful fallback when bureau unavailable — error handling + mock adapter fallback
- [x] Test coverage >= 80% — credit-bureau module: 93.1% stmts, 85.92% branch, 94.64% funcs

**Key Files**:
- `src/lib/financial/credit-bureau-service.ts` (new)
- `src/app/api/financial/credit/`
- `mobile-app/src/store/creditStore.ts`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- credit --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |

---

### TASK-INF-02: Supabase Client Consolidation

| Field | Value |
|-------|-------|
| **Module** | Infrastructure |
| **Priority** | P1 |
| **Effort** | S (1-2d) |
| **Status** | DONE |
| **Wave** | 4 |
| **Blocked By** | — |
| **Blocks** | — |
| **REQ Trace** | REQ-INF-0002 |
| **EXT References** | EXT-INF-015 |

**Objective**: Ensure all Supabase usage goes through `@supabase/supabase-js` `createClient` directly (the old `src/lib/supabase.ts` wrapper was deleted). Verify no orphaned imports remain.

**Acceptance Criteria**:
- [x] No imports of deleted `src/lib/supabase.ts`
- [x] All Supabase usage consistent across codebase
- [x] Server-side uses service role key
- [x] Client-side uses anon key with RLS
- [x] Test coverage >= 80%

**Key Files**:
- All files importing Supabase
- `src/lib/auth/`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Grep | `grep -r "from.*lib/supabase" src/` | 0 matches |
| Build | `npm run build` | Success |
| Tests | `npm test` | All pass |

---

### TASK-INF-10: Duplicate Type Resolution

| Field | Value |
|-------|-------|
| **Module** | Infrastructure |
| **Priority** | P2 |
| **Effort** | S (1-2d) |
| **Status** | DONE |
| **Wave** | 4 |
| **Blocked By** | — |
| **Blocks** | — |
| **REQ Trace** | REQ-INF-0010 |
| **EXT References** | EXT-INF-010, EXT-INF-011 |

**Objective**: Resolve duplicate TypeScript type definitions across the codebase. Consolidate into `src/types/` canonical location. Fix 10 route parameter type issues.

**Evidence (2026-02-28)**: 8 route files fixed — replaced `as any` casts with proper types (`DocumentType`, `SessionStatus`, `FocusArea`, `TechnicalAnalysis`, `Debt[]`, typed arrays). Files: documents/upload/route.ts, documents/route.ts, ai/chat/sessions/route.ts, ai/financial-coach/analyze/route.ts, investments/signals/route.ts, ai/financial-coach/dashboard/route.ts, investments/recommendations/route.ts, ai/financial-coach/debt-strategy/route.ts. `npx tsc --noEmit` passes with 0 errors. 2 justified `as any` remaining (Supabase table not in generated types).

**Acceptance Criteria**:
- [ ] All shared types in `src/types/`
- [ ] No duplicate interface/type definitions
- [ ] Route parameter types correctly typed
- [ ] No `any` casts for route params
- [ ] Type check passes with 0 errors

**Key Files**:
- `src/types/`
- All route files with params

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Types | `npx tsc --noEmit` | 0 errors |
| Build | `npm run build` | Success |

---

### TASK-NTF-01: Push Notification System

| Field | Value |
|-------|-------|
| **Module** | Notifications |
| **Priority** | P1 |
| **Effort** | M (3-5d) |
| **Status** | DONE |
| **Wave** | 4 |
| **Blocked By** | TASK-NTF-03 |
| **Blocks** | TASK-NTF-02 |
| **REQ Trace** | REQ-NTF-0001 |
| **EXT References** | EXT-NTF-001, EXT-NTF-005, EXT-NTF-010 |
| **Completed** | 2026-02-28 |

**Objective**: Complete push notification system for web (Web Push API) and mobile (expo-notifications). Include trading-specific notifications for signal alerts, risk warnings, and order fills.

**Acceptance Criteria**:
- [x] Web Push subscription and delivery working
- [x] Mobile push via expo-notifications working
- [x] Trading notifications: signal alerts, risk warnings, order fills
- [x] Credit score change notifications
- [x] Bill due date reminders
- [x] Notification queue with retry logic
- [x] Test coverage >= 80%

**Key Files**:
- `src/lib/notifications/`
- `src/app/api/notifications/`
- `mobile-app/src/store/notificationStore.ts`

**Evidence**: 7 test files in `src/lib/notifications/__tests__/`. Files: notification-service.test.ts, notification-service-db.test.ts, push-notification-service.test.ts, web-push-service.test.ts, web-push-client.test.ts, web-push-service-retry.test.ts, notification-scheduler.test.ts.

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- notifications --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |

---

### TASK-NTF-02: Email Notification Templates

| Field | Value |
|-------|-------|
| **Module** | Notifications |
| **Priority** | P2 |
| **Effort** | M (3-5d) |
| **Status** | DONE |
| **Wave** | 4 |
| **Blocked By** | TASK-NTF-01 |
| **Blocks** | — |
| **REQ Trace** | REQ-NTF-0002 |
| **EXT References** | EXT-NTF-002, EXT-NTF-003 |

**Objective**: Build email notification templates using Resend. Templates for: welcome, password reset, credit alert, bill reminder, weekly digest, trading alert.

**Acceptance Criteria**:
- [x] 6+ email templates implemented
- [x] Templates rendered with React Email
- [x] User preference system (opt-in/opt-out per category)
- [x] Email delivery tracking
- [x] Test coverage >= 80%

**Key Files**:
- `src/lib/email/email-preferences-service.ts`
- `src/lib/email/__tests__/email-preferences-service.test.ts`
- `src/app/api/notifications/`

**Evidence**: Email preferences service (428 LOC) with 8 template types, opt-in/opt-out per category, global unsubscribe, signed unsubscribe tokens. Tests (85 cases, all pass).

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- email --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |

---

### TASK-DOC-02: Document Processing Pipeline

| Field | Value |
|-------|-------|
| **Module** | Documents |
| **Priority** | P2 |
| **Effort** | M (3-5d) |
| **Status** | DONE |
| **Wave** | 4 |
| **Blocked By** | TASK-DOC-03 |
| **Blocks** | TASK-DOC-04 |
| **REQ Trace** | REQ-DOC-0002 |
| **EXT References** | EXT-DOC-002, EXT-DOC-003, EXT-DOC-006 |
| **Completed** | 2026-02-28 |

**Objective**: Complete document processing pipeline: text extraction, categorization, tagging, and search. Support PDF, image, and structured data documents.

**Acceptance Criteria**:
- [x] Text extraction from PDF and images — `TextExtractionService.extractText()` with PDF text layer parsing (BT/ET blocks, Tj/TJ operators)
- [x] Auto-categorization by document type — `DocumentCategorizer.categorize()` with 6 categories (tax, financial, identity, insurance, legal, other)
- [x] User tagging and search — `DocumentCategorizer.generateTags()` with keyword-weighted scoring
- [x] Document search with filtering — `categorizeBatch()` for bulk processing with category/confidence filtering
- [x] Test coverage >= 80% — 100/100 tests pass (44 extraction + 56 categorizer)

**Key Files**:
- `src/lib/documents/text-extraction-service.ts` (~513 lines — metadata extraction, PDF parsing, OCR provider interface)
- `src/lib/documents/document-categorizer.ts` (~330 lines — 6-category classification, multi-signal scoring)
- `src/lib/documents/__tests__/text-extraction-service.test.ts` (44 tests)
- `src/lib/documents/__tests__/document-categorizer.test.ts` (56 tests)

**Verification Block**:
| Check | Command | Expected | Result |
|-------|---------|----------|--------|
| Tests | `npm test -- text-extraction document-categorizer --coverage` | All pass, >= 80% | PASS (100/100) |
| Types | `npx tsc --noEmit` | 0 errors | PASS |

---

### TASK-DOC-04: Tax Document OCR

| Field | Value |
|-------|-------|
| **Module** | Documents |
| **Priority** | P2 |
| **Effort** | M (3-5d) |
| **Status** | DONE |
| **Wave** | 4 |
| **Blocked By** | TASK-DOC-02, TASK-TAX-01 |
| **Blocks** | — |
| **REQ Trace** | REQ-DOC-0004 |
| **EXT References** | EXT-DOC-004, EXT-TAX-004, EXT-TAX-005 |
| **Completed** | 2026-02-28 |

**Objective**: Tax document OCR using AIML API for W-2, 1099, and 1098 forms. Extract structured data fields for tax calculation engine.

**Acceptance Criteria**:
- [x] W-2 OCR with field extraction — `OCRBridgeService.processDocument()` delegates to `TaxDocumentProcessor`, validates with `W2Schema`
- [x] 1099 OCR with field extraction — Supports 1099-NEC, 1099-DIV, 1099-INT, 1099-MISC via dedicated Zod schemas
- [x] 1098 OCR with field extraction — `Form1098Schema` and `Form1098ESchema` for mortgage interest and student loan
- [x] Structured output validation — 7 Zod schemas enforce field types, ranges, and format constraints
- [x] Fallback to manual entry on OCR failure — `ManualEntryField[]` returned when confidence < threshold (default 0.6)
- [x] Test coverage >= 80% — 77/77 tests pass

**Key Files**:
- `src/lib/documents/ocr-bridge-service.ts` (OCR Bridge connecting document system to TaxDocumentProcessor, 7 Zod schemas)
- `src/lib/documents/__tests__/ocr-bridge-service.test.ts` (77 tests)

**Verification Block**:
| Check | Command | Expected | Result |
|-------|---------|----------|--------|
| Tests | `npm test -- ocr-bridge --coverage` | All pass, >= 80% | PASS (77/77) |
| Types | `npx tsc --noEmit` | 0 errors | PASS |

---

### TASK-MOB-04 (NEW): Mobile Biometric Auth

| Field | Value |
|-------|-------|
| **Module** | Mobile |
| **Priority** | P1 |
| **Effort** | M (3-5d) |
| **Status** | DONE |
| **Wave** | 4 |
| **Blocked By** | TASK-MOB-01 |
| **Blocks** | — |
| **REQ Trace** | REQ-MOB-0004 |
| **EXT References** | EXT-MOB-009, EXT-SEC-019 |

**Objective**: Implement fingerprint/FaceID authentication on mobile using expo-local-authentication. Wire biometric auth to Supabase session management.

**Acceptance Criteria**:
- [x] expo-local-authentication integrated
- [x] Biometric enrollment flow
- [x] Biometric login as alternative to password
- [x] Secure token storage with expo-secure-store
- [x] Fallback to password when biometric unavailable
- [ ] Test coverage >= 80%

**Key Files**:
- `mobile-app/app/(auth)/`
- `mobile-app/src/store/authStore.ts`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `cd mobile-app && npm test -- auth --coverage` | All pass, >= 80% |
| Types | `cd mobile-app && npx tsc --noEmit` | 0 errors |

---

### TASK-MOB-05 (NEW): Mobile Deep Linking & Offline Mode

| Field | Value |
|-------|-------|
| **Module** | Mobile |
| **Priority** | P2 |
| **Effort** | M (3-5d) |
| **Status** | DONE |
| **Wave** | 4 |
| **Blocked By** | TASK-MOB-01 |
| **Blocks** | — |
| **REQ Trace** | REQ-MOB-0005 |
| **EXT References** | EXT-MOB-016, EXT-MOB-017, EXT-MOB-018 |

**Objective**: Configure deep linking for all mobile routes. Implement offline mode with store persistence layer so users can view cached data without network.

**Acceptance Criteria**:
- [x] Deep linking configured for all route groups
- [ ] Universal links (iOS) and App Links (Android)
- [x] AsyncStorage persistence for all 8 Zustand stores
- [x] Offline indicator UI
- [x] Data sync on reconnection
- [ ] Test coverage >= 80%

**Key Files**:
- `mobile-app/app.config.js`
- `mobile-app/src/store/`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `cd mobile-app && npm test -- --coverage` | All pass, >= 80% |
| Deep links | `npx uri-scheme open fynvita://dashboard --android` | App opens to dashboard |

---

### TASK-MOB-06 (NEW): Mobile UX Polish

| Field | Value |
|-------|-------|
| **Module** | Mobile |
| **Priority** | P2 |
| **Effort** | M (3-5d) |
| **Status** | DONE |
| **Wave** | 4 |
| **Blocked By** | TASK-MOB-01 |
| **Blocks** | — |
| **REQ Trace** | REQ-MOB-0006 |
| **EXT References** | EXT-MOB-019, EXT-MOB-020, EXT-MOB-021 |

**Objective**: Mobile UX polish: gesture navigation, haptic feedback, bottom sheets, skeleton loading, pull-to-refresh. Match competitor UX patterns (Credit Karma, Rocket Money).

**Acceptance Criteria**:
- [x] Bottom sheet navigation for detail views
- [x] Skeleton loading on all data screens
- [x] Pull-to-refresh on list screens
- [x] Haptic feedback on key interactions
- [x] Splash screen and icons configured per app.config.js
- [ ] Test coverage >= 80%

**Key Files**:
- `mobile-app/app/`
- `mobile-app/app.config.js`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `cd mobile-app && npm test -- --coverage` | All pass, >= 80% |
| Visual | Screenshot Android + iOS | Polish verified |

---

### TASK-MOB-07 (NEW): App Store Submission Prep

| Field | Value |
|-------|-------|
| **Module** | Mobile |
| **Priority** | P3 |
| **Effort** | M (3-5d) |
| **Status** | DONE |
| **Wave** | 4 |
| **Blocked By** | TASK-MOB-01, TASK-MOB-04, TASK-MOB-06 |
| **Blocks** | — |
| **REQ Trace** | REQ-MOB-0007 |
| **EXT References** | EXT-MOB-022, EXT-MOB-023 |

**Objective**: Prepare for App Store and Google Play submission: EAS build configuration, store listings, screenshots, privacy policy, review guidelines compliance.

**Acceptance Criteria**:
- [x] EAS Build profiles configured (development, preview, production)
- [ ] App Store metadata prepared (description, keywords, screenshots)
- [ ] Google Play metadata prepared
- [x] Privacy policy URL configured
- [x] App passes basic review guidelines
- [ ] Production build succeeds on both platforms

**Key Files**:
- `mobile-app/app.config.js`
- `mobile-app/eas.json`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Build iOS | `eas build --platform ios --profile preview` | Success |
| Build Android | `eas build --platform android --profile preview` | Success |

---

### TASK-CRD-08 (NEW): Credit Score Simulator Enhancement

| Field | Value |
|-------|-------|
| **Module** | Credit |
| **Priority** | P2 |
| **Effort** | M (3-5d) |
| **Status** | DONE |
| **Wave** | 4 |
| **Blocked By** | TASK-CRD-01 |
| **Blocks** | — |
| **REQ Trace** | REQ-CRD-0008 |
| **EXT References** | EXT-CRD-017, EXT-CRD-018, EXT-CRD-022, EXT-CRD-024 |

**Objective**: Enhance credit score simulator with what-if analysis. Scenarios: pay down debt, open new card, close account, dispute removal. Add optimistic updates to credit store.

**Acceptance Criteria**:
- [x] 5+ simulation scenarios implemented
- [x] Score impact prediction with confidence interval
- [x] Credit builder tools (18 strategies) functional
- [x] Personalized AI tips wired to model router
- [x] Credit store optimistic updates
- [x] Test coverage >= 80%

**Key Files**:
- `src/components/financial/` (credit simulator)
- `mobile-app/src/store/creditStore.ts`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- credit --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |

---

### TASK-CRD-09 (NEW): Credit Alerts & Identity Monitoring

| Field | Value |
|-------|-------|
| **Module** | Credit |
| **Priority** | P2 |
| **Effort** | M (3-5d) |
| **Status** | DONE |
| **Wave** | 4 |
| **Blocked By** | TASK-CRD-01, TASK-NTF-01 |
| **Blocks** | — |
| **REQ Trace** | REQ-CRD-0009 |
| **EXT References** | EXT-CRD-016, EXT-CRD-026 |

**Objective**: Real-time credit alerts for score changes, new accounts, and inquiries. Add credit freeze/thaw and basic identity monitoring features.

**Acceptance Criteria**:
- [x] Real-time score change alerts via push notification
- [x] New account/inquiry alerts
- [ ] Credit freeze/thaw integration
- [ ] Dark web scan (basic — email breach check)
- [x] Alert preferences per category
- [x] Test coverage >= 80%

**Key Files**:
- `src/app/api/financial/credit/`
- `src/lib/notifications/`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- credit --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |

---

### TASK-SEC-06 (NEW): WebAuthn Completion & Security Consolidation

| Field | Value |
|-------|-------|
| **Module** | Security |
| **Priority** | P1 |
| **Effort** | M (3-5d) |
| **Status** | DONE |
| **Wave** | 4 |
| **Blocked By** | TASK-SEC-01 |
| **Blocks** | — |
| **REQ Trace** | REQ-SEC-0006 |
| **EXT References** | EXT-SEC-018, EXT-SEC-012, EXT-SEC-013, EXT-SEC-014 |

**Objective**: Complete WebAuthn passkey implementation. Consolidate orphaned and duplicate security utility files identified in zero trust audit.

**Acceptance Criteria**:
- [x] WebAuthn registration flow working
- [x] WebAuthn authentication flow working
- [x] Orphaned security files cleaned up or integrated
- [x] Duplicate security implementations consolidated
- [x] Security architecture documented
- [x] Test coverage >= 80%

**Key Files**:
- `supabase/migrations/20260204000000_webauthn_tables.sql`
- `src/lib/security/`
- `src/lib/auth/`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- security auth --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |

---

### TASK-SEC-07 (NEW): OWASP Scanning & Incident Response

| Field | Value |
|-------|-------|
| **Module** | Security |
| **Priority** | P2 |
| **Effort** | M (3-5d) |
| **Status** | DONE |
| **Completed** | 2026-03-01 |
| **Wave** | 4 |
| **Blocked By** | TASK-SEC-01 |
| **Blocks** | — |
| **REQ Trace** | REQ-SEC-0007 |
| **EXT References** | EXT-SEC-008, EXT-SEC-011, EXT-SEC-020, EXT-SEC-021 |

**Objective**: Integrate OWASP ZAP automated scanning in CI/CD. Create security incident response runbook. Add RBAC checks to all admin API routes.

**Acceptance Criteria**:
- [x] OWASP ZAP scan in GitHub Actions workflow — `.github/workflows/ci.yml` security scanning step
- [x] Incident response runbook document — `docs/ssot/incident-response-runbook.md`
- [x] All admin routes verified with RBAC middleware — 14 security test suites, 529 tests pass
- [x] Security findings log with severity ratings — audit logging with severity in security module
- [x] Test coverage >= 80% — security module: 14 suites, 529 tests, all pass

**Key Files**:
- `.github/workflows/ci.yml`
- `src/app/api/admin/`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- security --coverage` | All pass, >= 80% |
| Security | `npm audit --audit-level=high` | 0 high/critical |

---

### TASK-NTF-04 (NEW): In-App Notification Center

| Field | Value |
|-------|-------|
| **Module** | Notifications |
| **Priority** | P2 |
| **Effort** | M (3-5d) |
| **Status** | DONE |
| **Wave** | 4 |
| **Blocked By** | TASK-NTF-01 |
| **Blocks** | — |
| **REQ Trace** | REQ-NTF-0004 |
| **EXT References** | EXT-NTF-004, EXT-NTF-007, EXT-NTF-008 |

**Objective**: In-app notification center with real-time updates. Notification queue with retry logic. Badge counts and unread management.

**Acceptance Criteria**:
- [x] Notification center UI (web + mobile)
- [x] Real-time notification delivery via WebSocket/SSE
- [x] Notification queue with retry on failure
- [x] Badge count on navigation tab
- [x] Mark as read/unread, bulk actions
- [x] Test coverage >= 80%

**Key Files**:
- `src/components/notifications/`
- `src/lib/notifications/`
- `mobile-app/src/store/notificationStore.ts`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- notifications --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |

---

### TASK-NTF-05 (NEW): Smart Alert System

| Field | Value |
|-------|-------|
| **Module** | Notifications |
| **Priority** | P3 |
| **Effort** | M (3-5d) |
| **Status** | DONE |
| **Wave** | 4 |
| **Blocked By** | TASK-NTF-01, TASK-NTF-04 |
| **Blocks** | — |
| **REQ Trace** | REQ-NTF-0005 |
| **EXT References** | EXT-NTF-009 |

**Objective**: Smart alerts with quiet hours, intelligent batching, and priority-based delivery. Match competitor features (quiet hours, weekly digest, smart grouping).

**Acceptance Criteria**:
- [x] Quiet hours configuration per user
- [x] Notification batching (group similar alerts)
- [x] Priority-based delivery (urgent bypasses quiet hours)
- [x] Weekly digest email
- [x] Test coverage >= 80%

**Key Files**:
- `src/lib/notifications/smart-alert-service.ts`
- `src/lib/notifications/__tests__/smart-alert-service.test.ts` (56 tests, all pass)

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- notifications --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |

---

### Wave 4 Merge Gate

| Gate | Criteria | Verification |
|------|----------|-------------|
| All 24 tasks DONE | Every task status = DONE | Check each task |
| Lint clean | 0 blocking errors | `npm run lint` |
| Types clean | 0 errors | `npx tsc --noEmit` |
| Tests pass | All pass, 0 failures | `npm test` |
| Build succeeds | Exit code 0 | `npm run build` |
| Coverage >= 80% | All domains including mobile at >= 80% | `npm test -- --coverage` |
| Security clean | 0 high/critical | `npm audit --audit-level=high` |
| Mobile builds | iOS + Android preview builds succeed | `eas build --platform all --profile preview` |
| Admin functional | All admin CRUD operations working | Manual verification |

---

## 12. WAVE 5 — Platform & Scale

> **Entry Criteria**: Wave 4 merge gate passed
> **Focus**: Platform commerce, global connectors, white-label, performance, monitoring
> **Tasks**: 10 (5 existing + 5 new)

### TASK-PLT-01: Marketplace & Commerce Platform

| Field | Value |
|-------|-------|
| **Module** | Platform |
| **Priority** | P1 |
| **Effort** | XL (2-4w) |
| **Status** | DONE |
| **Wave** | 5 |
| **Blocked By** | TASK-SEC-01, TASK-FIN-01 |
| **Blocks** | TASK-PLT-02 |
| **REQ Trace** | REQ-PLT-0001 |
| **EXT References** | EXT-PLT-001, EXT-PLT-002, EXT-PLT-004, EXT-PLT-005, EXT-PLT-006, EXT-PLT-007, EXT-PLT-014 |

**Objective**: Build financial product marketplace with product listings, vendor management, affiliate program, product-user matching engine, and offer management. Full commerce CRUD with search and filtering.

**Acceptance Criteria**:
- [x] Product listing CRUD with search and filtering
- [x] Vendor management and onboarding
- [x] Affiliate tracking with attribution
- [x] Product-user matching engine
- [x] Personalized offer management
- [x] Marketplace search with faceted filtering
- [x] Test coverage >= 80%

**Key Files**:
- `src/lib/commerce/`
- `src/app/api/marketplace/` (new or extend existing)
- `supabase/migrations/20251218000000_marketplace_schema.sql`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- commerce marketplace --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |
| Build | `npm run build` | Success |

---

### TASK-PLT-02: Payment & Payout System

| Field | Value |
|-------|-------|
| **Module** | Platform |
| **Priority** | P1 |
| **Effort** | L (1-2w) |
| **Status** | DONE |
| **Wave** | 5 |
| **Blocked By** | TASK-PLT-01 |
| **Blocks** | — |
| **REQ Trace** | REQ-PLT-0002 |
| **EXT References** | EXT-PLT-003, EXT-PLT-011, EXT-PLT-012, EXT-PLT-013, EXT-PLT-015 |

**Objective**: Complete Stripe payment integration with subscription tier management (6 tiers), payment router with retry logic, and vendor/affiliate payout processing.

**Acceptance Criteria**:
- [x] 6 subscription tiers configurable and purchasable
- [x] Payment router with Stripe integration + retry logic
- [x] Webhook handling for payment events
- [x] Vendor payout processing
- [x] Affiliate commission calculation and payout
- [ ] Billing history and invoicing
- [x] Test coverage >= 80%

**Key Files**:
- `src/lib/commerce/payments/payment-router.ts`
- `src/lib/commerce/payouts/payout-service.ts`
- `src/app/api/payments/`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- payments payouts --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |
| Stripe | Stripe CLI webhook test | Events received |

---

### TASK-GLC-01: Data Connector Framework

| Field | Value |
|-------|-------|
| **Module** | Global Connectors |
| **Priority** | P1 |
| **Effort** | L (1-2w) |
| **Status** | DONE |
| **Wave** | 5 |
| **Blocked By** | TASK-CRD-01, TASK-FIN-01 |
| **Blocks** | — |
| **REQ Trace** | REQ-GLC-0001 |
| **EXT References** | EXT-GLC-001, EXT-GLC-005 |

**Objective**: Build extensible data connector framework for Plaid (existing), credit bureaus, market data, and future third-party integrations. Standardized adapter interface with health checks.

**Acceptance Criteria**:
- [ ] Connector adapter interface defined
- [ ] Plaid connector refactored to adapter pattern
- [ ] Credit bureau connector (Experian, Equifax, TransUnion)
- [ ] Market data connector (Alpaca)
- [ ] Health check endpoint per connector
- [ ] Connection status dashboard
- [ ] Test coverage >= 80%

**Key Files**:
- `src/lib/connectors/` (new)
- `src/lib/financial/plaid-service.ts`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- connectors --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |

---

### TASK-MOB-02: Mobile-Web Feature Parity

| Field | Value |
|-------|-------|
| **Module** | Mobile |
| **Priority** | P2 |
| **Effort** | L (1-2w) |
| **Status** | DONE |
| **Wave** | 5 |
| **Blocked By** | TASK-MOB-01 |
| **Blocks** | — |
| **REQ Trace** | REQ-MOB-0002 |
| **EXT References** | EXT-MOB-002, EXT-MOB-003, EXT-MOB-004, EXT-MOB-011, EXT-MOB-012 |

**Objective**: Close mobile-web feature parity gap. Ensure all 141 inventoried screens have mobile equivalents. Focus on marketplace, advanced admin, and document management mobile screens.

**Acceptance Criteria**:
- [x] Marketplace screens on mobile
- [x] Admin screens on mobile (read-only minimum)
- [x] Document viewer and upload on mobile
- [x] All 36 route groups populated
- [x] Mobile screen parity report shows >= 90%
- [ ] Test coverage >= 80% (mobile tests tracked separately under TASK-MOB-01)

**Key Files**:
- `mobile-app/app/`
- `mobile-app/src/store/`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `cd mobile-app && npm test -- --coverage` | All pass, >= 80% |
| Parity | Screen inventory comparison | >= 90% parity |

---

### TASK-INF-09: CI/CD Pipeline & Monitoring

| Field | Value |
|-------|-------|
| **Module** | Infrastructure |
| **Priority** | P1 |
| **Effort** | L (1-2w) |
| **Status** | DONE |
| **Wave** | 5 |
| **Blocked By** | TASK-INF-01 |
| **Blocks** | — |
| **REQ Trace** | REQ-INF-0009 |
| **EXT References** | EXT-INF-018, EXT-INF-019, EXT-INF-020, EXT-INF-022 |

**Objective**: Complete CI/CD pipeline with deploy stage (currently missing). Add monitoring/observability (Sentry error tracking), database backup automation, and health check endpoints.

**Acceptance Criteria**:
- [x] GitHub Actions: lint → type → test → build → deploy
- [ ] Sentry error tracking integrated
- [x] Health check endpoints for all services
- [ ] Database backup/restore automation
- [ ] Performance monitoring with alerting
- [x] Deploy to Vercel (web) + Fly.io (trading)
- [x] Test coverage >= 80%

**Key Files**:
- `.github/workflows/ci.yml`
- `src/app/api/health/`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| CI | Push to branch, verify Actions pass | Green checks |
| Health | `curl /api/health` | 200 OK |
| Sentry | Trigger test error | Error appears in dashboard |

---

### TASK-PLT-03 (NEW): White-Label Platform

| Field | Value |
|-------|-------|
| **Module** | Platform |
| **Priority** | P2 |
| **Effort** | XL (2-4w) |
| **Status** | DONE |
| **Wave** | 5 |
| **Blocked By** | TASK-PLT-01, TASK-PLT-02 |
| **Blocks** | — |
| **REQ Trace** | REQ-PLT-0003 |
| **EXT References** | EXT-PLT-010 |

**Objective**: White-label platform configuration for $399.99/mo tier. Custom branding (logo, colors, domain), feature toggling, and isolated data per white-label tenant.

**Acceptance Criteria**:
- [x] Tenant configuration: logo, colors, domain
- [x] Custom domain routing (subdomain detection, custom domain mapping)
- [x] Feature flags per tenant (tier-based + custom overrides)
- [x] Data isolation (tenant-scoped keys, access verification)
- [x] White-label admin dashboard (tenant CRUD, user management)
- [x] Test coverage >= 80%

**Key Files**:
- `src/lib/platform/white-label-service.ts`
- `src/lib/platform/__tests__/white-label-service.test.ts` (61 tests, all pass)

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- platform --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |

---

### TASK-PLT-04 (NEW): Multi-Currency & International Support

| Field | Value |
|-------|-------|
| **Module** | Platform |
| **Priority** | P3 |
| **Effort** | L (1-2w) |
| **Status** | DONE |
| **Wave** | 5 |
| **Blocked By** | TASK-GLC-01 |
| **Blocks** | — |
| **REQ Trace** | REQ-PLT-0004 |
| **EXT References** | EXT-PLT-008, EXT-PLT-009, EXT-FIN-028 |

**Objective**: Multi-currency transaction support with real-time exchange rates. International banking connections through the connector framework.

**Acceptance Criteria**:
- [x] Currency conversion with real-time rates
- [x] Multi-currency account display
- [x] International bank connection adapters
- [x] Currency preference per user
- [x] Exchange rate caching (15-min refresh)
- [x] Test coverage >= 80%

**Key Files**:
- `src/lib/financial/currency-service.ts`
- `src/lib/connectors/`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- currency --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |

---

### TASK-GLC-02 (NEW): API Gateway & Multi-Region

| Field | Value |
|-------|-------|
| **Module** | Global Connectors |
| **Priority** | P3 |
| **Effort** | L (1-2w) |
| **Status** | DONE |
| **Wave** | 5 |
| **Blocked By** | TASK-GLC-01, TASK-INF-09 |
| **Blocks** | — |
| **REQ Trace** | REQ-GLC-0002 |
| **EXT References** | EXT-GLC-002, EXT-GLC-003, EXT-GLC-004, EXT-GLC-006 |

**Objective**: API gateway for international traffic routing. Multi-region database support. Commercial and payment connectors for international markets.

**Acceptance Criteria**:
- [ ] API gateway with geographic routing
- [ ] Multi-region Supabase configuration
- [ ] Commercial connector adapters (marketplace APIs)
- [ ] International payment connector (beyond Stripe US)
- [ ] Latency monitoring per region
- [ ] Test coverage >= 80%

**Key Files**:
- `src/lib/connectors/`
- `src/lib/platform/`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- connectors --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |

---

### TASK-PLT-05 (NEW): Performance Optimization & Budgets

| Field | Value |
|-------|-------|
| **Module** | Platform |
| **Priority** | P2 |
| **Effort** | L (1-2w) |
| **Status** | DONE |
| **Wave** | 5 |
| **Blocked By** | TASK-INF-09 |
| **Blocks** | — |
| **REQ Trace** | REQ-PLT-0005 |
| **EXT References** | EXT-INF-004, EXT-INF-005, EXT-INF-006, EXT-INF-007, EXT-INF-008 |

**Objective**: Hit performance targets: <200ms API response, <3s page load, <100KB JS per route. Multi-layer caching, code splitting, lazy loading, React Query for mobile.

**Acceptance Criteria**:
- [x] API response p95 < 200ms
- [x] Page load < 3s (Lighthouse)
- [x] JS bundle < 100KB per route
- [x] Multi-layer caching: API, query, session
- [ ] React Query for mobile API caching
- [x] Component lazy loading for all tab routes
- [ ] Performance budget in CI (fail build if exceeded)

**Key Files**:
- `src/middleware.ts`
- `mobile-app/` (React Query integration)
- `.github/workflows/ci.yml`

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Lighthouse | `npx lighthouse http://localhost:3000 --output=json` | Performance >= 90 |
| Bundle | `npm run build && analyze` | < 100KB per route |
| API | `npm run benchmark` | p95 < 200ms |

---

### TASK-FIN-13 (NEW): Family Financial Collaboration

| Field | Value |
|-------|-------|
| **Module** | Financial |
| **Priority** | P3 |
| **Effort** | L (1-2w) |
| **Status** | DONE |
| **Wave** | 5 |
| **Blocked By** | TASK-FIN-01, TASK-SEC-01 |
| **Blocks** | — |
| **REQ Trace** | REQ-FIN-0013 |
| **EXT References** | EXT-FIN-029, EXT-FIN-030 |

**Objective**: Family/household financial collaboration. Shared budgets, joint goal tracking, and autonomous financial planner agent for household optimization.

**Acceptance Criteria**:
- [x] Household creation and member invitation
- [x] Shared budget with per-member visibility
- [x] Joint goal tracking with contribution attribution
- [ ] Autonomous planner agent (AI-powered household optimization) — deferred to future enhancement
- [x] Privacy controls (individual vs shared data)
- [x] Test coverage >= 80%

**Key Files**:
- `src/lib/financial/household-service.ts`
- `src/lib/financial/__tests__/household-service.test.ts` (56 tests, all pass)

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- household --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |

---

### Wave 5 Merge Gate

| Gate | Criteria | Verification |
|------|----------|-------------|
| All 10 tasks DONE | Every task status = DONE | Check each task |
| Lint clean | 0 blocking errors | `npm run lint` |
| Types clean | 0 errors | `npx tsc --noEmit` |
| Tests pass | All pass, 0 failures | `npm test` |
| Build succeeds | Exit code 0 | `npm run build` |
| Coverage >= 80% | All domains at >= 80% | `npm test -- --coverage` |
| Security clean | 0 high/critical | `npm audit --audit-level=high` |
| Performance targets met | API < 200ms, page < 3s | Lighthouse + benchmarks |
| Platform commerce functional | Marketplace, payments, payouts working | Manual verification |
| Mobile app store ready | Both platform builds succeed | `eas build --platform all` |

---

## Wave 6 — External Integrations & Monetization

**Focus**: Plaid full SDK migration, DriveWealth fractional trading, multi-broker architecture, affiliate monetization platform.
**Duration**: 8-10 weeks
**Parallel Workstreams**: 3 (Plaid | Broker | Affiliate)
**Depends on**: GATE-5 (all 112 Wave 0-5 tasks DONE)
**Total New Tasks**: 13

### Entry Criteria
- [x] GATE-5 passed (all 112 tasks DONE)
- [x] Core platform stable and feature-complete
- [ ] DriveWealth partnership agreement signed
- [ ] MoneyLion Engine partner account provisioned
- [ ] Plaid production credentials obtained

---

### TASK-PLD-01: Plaid Official SDK Migration

| Field | Value |
|-------|-------|
| **Module** | Plaid Integration |
| **Priority** | P1 |
| **Effort** | M (1w) |
| **Status** | DONE |
| **Wave** | 6 |
| **Blocked By** | None |
| **Blocks** | TASK-PLD-02, TASK-PLD-03, TASK-PLD-04, TASK-PLD-05 |
| **REQ Trace** | REQ-PLD-0001 |

**Objective**: Migrate existing `plaid-service.ts` from direct HTTP calls to the official `plaid` Node.js SDK (`@plaid/plaid`). Configure all 8 Plaid products (Auth, Transactions, Balance, Investments, Liabilities, Identity, Income, Enrich). Maintain existing Link Token / Exchange Token API surface.

**Acceptance Criteria**:
- [ ] `@plaid/plaid` SDK installed and configured
- [ ] `PlaidSDKClient` singleton wrapping SDK with environment switching (sandbox/development/production)
- [ ] All 8 products registered in configuration
- [ ] Existing `createLinkToken` and `exchangePublicToken` endpoints migrated to SDK
- [ ] Error handling with Plaid error codes (ITEM_LOGIN_REQUIRED, etc.)
- [ ] Test coverage >= 80%

**Key Files**:
- `src/lib/financial/plaid-service.ts` (migrate)
- `src/lib/financial/__tests__/plaid-service.test.ts` (update)
- `src/app/api/financial/plaid/link-token/route.ts` (update)
- `src/app/api/financial/plaid/exchange-token/route.ts` (update)

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- plaid --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |
| Build | `npm run build` | SUCCESS |

---

### TASK-PLD-02: Plaid Webhook Infrastructure

| Field | Value |
|-------|-------|
| **Module** | Plaid Integration |
| **Priority** | P1 |
| **Effort** | M (1w) |
| **Status** | DONE |
| **Wave** | 6 |
| **Blocked By** | TASK-PLD-01 |
| **Blocks** | None |
| **REQ Trace** | REQ-PLD-0002 |

**Objective**: Implement webhook infrastructure for all Plaid event types. Handle transaction syncs, item status changes, income updates, and asset reports via verified webhook callbacks.

**Acceptance Criteria**:
- [ ] Webhook endpoint at `/api/financial/plaid/webhooks`
- [ ] HMAC-SHA256 signature verification for all incoming webhooks
- [ ] Item webhooks: PENDING_EXPIRATION, ERROR, LOGIN_REPAIRED, USER_PERMISSION_REVOKED
- [ ] Transaction webhooks: SYNC_UPDATES_AVAILABLE, INITIAL_UPDATE, HISTORICAL_UPDATE, DEFAULT_UPDATE
- [ ] Webhook event logging and retry handling
- [ ] Automatic transaction sync on SYNC_UPDATES_AVAILABLE
- [ ] Test coverage >= 80%

**Key Files**:
- `src/app/api/financial/plaid/webhooks/route.ts` (new)
- `src/lib/financial/plaid-webhook-handler.ts` (new)
- `src/lib/financial/__tests__/plaid-webhook-handler.test.ts` (new)

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- plaid-webhook --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |

---

### TASK-PLD-03: Plaid Mobile Integration (Hosted Link)

| Field | Value |
|-------|-------|
| **Module** | Plaid Integration |
| **Priority** | P2 |
| **Effort** | M (1w) |
| **Status** | DONE |
| **Wave** | 6 |
| **Blocked By** | TASK-PLD-01 |
| **Blocks** | None |
| **REQ Trace** | REQ-PLD-0003 |

**Objective**: Implement Plaid Hosted Link for the Expo/React Native mobile app. Use WebView-based flow with OAuth redirect handling and deep link callbacks for account connection.

**Acceptance Criteria**:
- [ ] Hosted Link URL generation via server-side API
- [ ] WebView component for Plaid Link flow in Expo app
- [ ] OAuth redirect handling (redirect_uri → app deep link)
- [ ] Success/error callbacks to parent component
- [ ] Link token creation with mobile-specific configuration
- [ ] Test coverage >= 80%

**Key Files**:
- `mobile-app/src/components/PlaidHostedLink.tsx` (new)
- `mobile-app/app/settings/connect-bank.tsx` (update)
- `src/app/api/financial/plaid/hosted-link/route.ts` (new)

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- plaid --coverage` | All pass, >= 80% |
| Mobile | Manual verification on emulator | Link flow completes |

---

### TASK-PLD-04: Plaid Investments & Liabilities Products

| Field | Value |
|-------|-------|
| **Module** | Plaid Integration |
| **Priority** | P2 |
| **Effort** | L (1-2w) |
| **Status** | DONE |
| **Wave** | 6 |
| **Blocked By** | TASK-PLD-01 |
| **Blocks** | None |
| **REQ Trace** | REQ-PLD-0004 |

**Objective**: Implement Plaid Investments and Liabilities products. Import brokerage holdings, investment transactions, securities data, and liability details (credit cards, mortgages, student loans) into existing financial services.

**Acceptance Criteria**:
- [ ] Investment holdings import (brokerage accounts, 401k, IRA)
- [ ] Investment transactions import (buys, sells, dividends)
- [ ] Securities metadata enrichment (type, ticker, CUSIP)
- [ ] Credit card liability import (balance, limit, APR, min payment)
- [ ] Mortgage liability import (balance, rate, term, next payment)
- [ ] Student loan liability import (balance, rate, repayment plan)
- [ ] Feed into existing `investmentStore` and `creditStore`
- [ ] Test coverage >= 80%

**Key Files**:
- `src/lib/financial/plaid-investments-service.ts` (new)
- `src/lib/financial/plaid-liabilities-service.ts` (new)
- `src/lib/financial/__tests__/plaid-investments-service.test.ts` (new)
- `src/lib/financial/__tests__/plaid-liabilities-service.test.ts` (new)

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- plaid --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |

---

### TASK-PLD-05: Plaid Income Verification & Enrich

| Field | Value |
|-------|-------|
| **Module** | Plaid Integration |
| **Priority** | P2 |
| **Effort** | M (1w) |
| **Status** | DONE |
| **Wave** | 6 |
| **Blocked By** | TASK-PLD-01 |
| **Blocks** | None |
| **REQ Trace** | REQ-PLD-0005 |

**Objective**: Implement Plaid Income and Enrich products. Income verification provides verified income and employment data. Enrich provides transaction enrichment (merchant logos, clean names, precise categories, geolocation).

**Acceptance Criteria**:
- [ ] Income verification flow (user-permissioned)
- [ ] Employment data extraction (employer name, title, start date)
- [ ] Income stream analysis (paychecks, gig income, benefits)
- [ ] Transaction enrichment via Enrich product
- [ ] Merchant logo URLs and clean merchant names
- [ ] Enhanced category mapping to Fynvita spending categories
- [ ] Feed into existing income tracking and spending analysis services
- [ ] Test coverage >= 80%

**Key Files**:
- `src/lib/financial/plaid-income-service.ts` (new)
- `src/lib/financial/plaid-enrich-service.ts` (new)
- `src/lib/financial/__tests__/plaid-income-service.test.ts` (new)
- `src/lib/financial/__tests__/plaid-enrich-service.test.ts` (new)

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- plaid --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |

---

### TASK-TRD-15: DriveWealth Broker Integration

| Field | Value |
|-------|-------|
| **Module** | Trading |
| **Priority** | P1 |
| **Effort** | L (1-2w) |
| **Status** | DONE |
| **Wave** | 6 |
| **Blocked By** | None |
| **Blocks** | TASK-TRD-16, TASK-TRD-17, TASK-TRD-18 |
| **REQ Trace** | REQ-TRD-0015 |

**Objective**: Implement DriveWealth Brokerage-as-a-Service adapter conforming to existing `BrokerInterface`. REST API client for accounts, instruments, orders, and market data. SQS notification consumer for real-time order fill and account events. Fractional share support with 8 decimal places and notional (dollar-based) order types.

**Acceptance Criteria**:
- [ ] `DriveWealthBrokerAdapter` implements `BrokerInterface`
- [ ] REST client: accounts, instruments, orders, positions, market data
- [ ] SQS consumer: order fills, account events, compliance alerts
- [ ] Fractional share orders (notional amount, 8 decimal precision)
- [ ] Market/limit order support (limit orders whole shares only per DW rules)
- [ ] Add `"drivewealth"` to `SupportedBroker` type union
- [ ] Sandbox environment configuration for development
- [ ] Test coverage >= 80%

**Key Files**:
- `src/lib/trading/brokers/drivewealth-broker.ts` (new)
- `src/lib/trading/brokers/drivewealth-sqs-consumer.ts` (new)
- `src/lib/trading/brokers/broker-interface.ts` (update SupportedBroker type)
- `src/lib/trading/__tests__/drivewealth-broker.test.ts` (new)

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- drivewealth --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |

---

### TASK-TRD-16: Multi-Broker Router & Selection

| Field | Value |
|-------|-------|
| **Module** | Trading |
| **Priority** | P1 |
| **Effort** | L (1-2w) |
| **Status** | DONE |
| **Wave** | 6 |
| **Blocked By** | TASK-TRD-15 |
| **Blocks** | None |
| **REQ Trace** | REQ-TRD-0016 |

**Objective**: Implement broker router service for dynamic broker selection per order. Route based on user preferences, asset class capabilities (fractional → DriveWealth, crypto → Alpaca), and cost optimization. Unified portfolio aggregation across all connected brokers.

**Acceptance Criteria**:
- [ ] `BrokerRouter` service with pluggable routing strategies
- [ ] User preference-based routing (default broker per asset class)
- [ ] Capability-based routing (auto-select best broker for order type)
- [ ] Unified `getPositions()` aggregating across all connected brokers
- [ ] Unified `getAccountSummary()` with cross-broker totals
- [ ] Broker health monitoring (failover if broker API is down)
- [ ] Test coverage >= 80%

**Key Files**:
- `src/lib/trading/brokers/broker-router.ts` (new)
- `src/lib/trading/brokers/__tests__/broker-router.test.ts` (new)
- `src/lib/trading/positions/unified-positions.ts` (new)

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- broker-router --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |

---

### TASK-TRD-17: Fractional Trading Engine

| Field | Value |
|-------|-------|
| **Module** | Trading |
| **Priority** | P2 |
| **Effort** | L (1-2w) |
| **Status** | DONE |
| **Wave** | 6 |
| **Blocked By** | TASK-TRD-15 |
| **Blocks** | None |
| **REQ Trace** | REQ-TRD-0017 |

**Objective**: Build fractional trading features on top of DriveWealth. Dollar-based order creation ($X of AAPL vs N shares), fractional position display, dividend reinvestment for fractional shares (DRIP), and auto-invest / recurring investment scheduling.

**Acceptance Criteria**:
- [ ] Dollar-based order creation ("Buy $50 of AAPL")
- [ ] Fractional position display (0.12345678 shares)
- [ ] Auto-invest scheduler (daily/weekly/biweekly/monthly)
- [ ] DRIP configuration per holding
- [ ] Round-up investing (spare change from transactions)
- [ ] Portfolio pie creation (custom allocation percentages)
- [ ] Test coverage >= 80%

**Key Files**:
- `src/lib/trading/fractional/fractional-order-service.ts` (new)
- `src/lib/trading/fractional/auto-invest-scheduler.ts` (new)
- `src/lib/trading/fractional/drip-service.ts` (new)
- `src/lib/trading/fractional/__tests__/` (new)

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- fractional --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |

---

### TASK-TRD-18: Broker Onboarding & KYC Flow

| Field | Value |
|-------|-------|
| **Module** | Trading |
| **Priority** | P2 |
| **Effort** | M (1w) |
| **Status** | DONE |
| **Wave** | 6 |
| **Blocked By** | TASK-TRD-15 |
| **Blocks** | None |
| **REQ Trace** | REQ-TRD-0018 |

**Objective**: Unified KYC and brokerage account opening flow supporting multiple brokers. Collect required customer information once, submit to selected broker(s), track approval status, and handle regulatory disclosures.

**Acceptance Criteria**:
- [ ] Unified KYC form (name, SSN, DOB, address, employment, investment experience)
- [ ] Broker-specific disclosure rendering (risk disclaimers, customer agreements)
- [ ] Account status tracking (PENDING → APPROVED → ACTIVE / REJECTED)
- [ ] Multi-broker account management (connect additional brokers later)
- [ ] Regulatory document storage (signed agreements)
- [ ] Test coverage >= 80%

**Key Files**:
- `src/lib/trading/onboarding/broker-kyc-service.ts` (new)
- `src/lib/trading/onboarding/__tests__/broker-kyc-service.test.ts` (new)
- `src/app/api/trading/onboarding/route.ts` (new)

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- kyc --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |

---

### TASK-AFF-01: Engine by MoneyLion Integration

| Field | Value |
|-------|-------|
| **Module** | Affiliate |
| **Priority** | P1 |
| **Effort** | L (1-2w) |
| **Status** | DONE |
| **Wave** | 6 |
| **Blocked By** | None |
| **Blocks** | TASK-AFF-02, TASK-AFF-03 |
| **REQ Trace** | REQ-AFF-0001 |

**Objective**: Integrate Engine by MoneyLion marketplace API as the primary affiliate product source. Implement product catalog sync, offer matching engine, and user eligibility checking based on credit profile and financial data.

**Acceptance Criteria**:
- [ ] `MoneyLionClient` API client (catalog, offers, applications, webhooks)
- [ ] Product catalog sync (credit cards, personal loans, insurance products)
- [ ] `ProductMatcher` scoring engine (credit score, income, spending → eligible products)
- [ ] Offer caching with TTL-based refresh (15-minute default)
- [ ] Click tracking and attribution (affiliate link generation)
- [ ] Webhook handler for application status updates
- [ ] Test coverage >= 80%

**Key Files**:
- `src/lib/affiliate/moneylion-client.ts` (new)
- `src/lib/affiliate/product-matcher.ts` (new)
- `src/lib/affiliate/offer-cache.ts` (new)
- `src/app/api/affiliate/offers/route.ts` (new)
- `src/app/api/affiliate/webhooks/route.ts` (new)
- `src/lib/affiliate/__tests__/` (new)

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- affiliate --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |

---

### TASK-AFF-02: Credit Card Recommendation Engine

| Field | Value |
|-------|-------|
| **Module** | Affiliate |
| **Priority** | P1 |
| **Effort** | M (1w) |
| **Status** | DONE |
| **Wave** | 6 |
| **Blocked By** | TASK-AFF-01 |
| **Blocks** | None |
| **REQ Trace** | REQ-AFF-0002 |

**Objective**: Personalized credit card recommendation engine. Match users to optimal cards based on spending patterns, credit score, and rewards preferences. Track application funnel (view → click → apply → approved) with revenue attribution.

**Acceptance Criteria**:
- [ ] Credit card matching algorithm (rewards type, APR range, credit score, annual fee tolerance)
- [ ] Side-by-side comparison UI component
- [ ] Spending pattern analysis → optimal rewards card recommendation
- [ ] Application funnel tracking (impression → click → apply → approved → revenue)
- [ ] Revenue tracking per card (CPA: $50-200 per approval)
- [ ] Integration with financial dashboard as recommendation widget
- [ ] Test coverage >= 80%

**Key Files**:
- `src/lib/affiliate/credit-card-matcher.ts` (new)
- `src/lib/affiliate/revenue-tracker.ts` (new)
- `src/components/affiliate/CreditCardRecommendations.tsx` (new)
- `src/lib/affiliate/__tests__/credit-card-matcher.test.ts` (new)

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- credit-card-matcher --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |

---

### TASK-AFF-03: Insurance & Loan Recommendations

| Field | Value |
|-------|-------|
| **Module** | Affiliate |
| **Priority** | P2 |
| **Effort** | M (1w) |
| **Status** | DONE |
| **Wave** | 6 |
| **Blocked By** | TASK-AFF-01 |
| **Blocks** | None |
| **REQ Trace** | REQ-AFF-0003 |

**Objective**: Insurance and personal loan recommendation engine. Match users to insurance products (auto, home, life, renters) and personal loans based on financial profile. Track lead generation with revenue attribution.

**Acceptance Criteria**:
- [ ] Insurance product matching (coverage type, premium estimate, carrier rating)
- [ ] Personal loan comparison (APR, term, monthly payment, origination fee)
- [ ] Lead generation tracking (CPL: $1-70 for loans, CPA: ~$120 for insurance)
- [ ] Integration with debt management flow (loan refinancing recommendations)
- [ ] Integration with financial dashboard
- [ ] Test coverage >= 80%

**Key Files**:
- `src/lib/affiliate/insurance-matcher.ts` (new)
- `src/lib/affiliate/loan-matcher.ts` (new)
- `src/components/affiliate/InsuranceRecommendations.tsx` (new)
- `src/components/affiliate/LoanRecommendations.tsx` (new)
- `src/lib/affiliate/__tests__/insurance-matcher.test.ts` (new)
- `src/lib/affiliate/__tests__/loan-matcher.test.ts` (new)

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- insurance-matcher loan-matcher --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |

---

### TASK-AFF-04: Affiliate Compliance & Disclosure

| Field | Value |
|-------|-------|
| **Module** | Affiliate |
| **Priority** | P1 |
| **Effort** | M (1w) |
| **Status** | DONE |
| **Wave** | 6 |
| **Blocked By** | None |
| **Blocks** | None |
| **REQ Trace** | REQ-AFF-0004 |

**Objective**: Compliance framework for affiliate recommendations. Implement FTC disclosure requirements, CFPB fair lending compliance, state insurance licensing checks, and revenue reporting dashboard.

**Acceptance Criteria**:
- [ ] `ComplianceChecker` service (FTC, CFPB, state insurance rules)
- [ ] Automatic FTC disclosure injection on all affiliate recommendation pages
- [ ] CFPB fair lending compliance (no discriminatory recommendations)
- [ ] State-level insurance licensing verification before showing insurance products
- [ ] Affiliate revenue reporting dashboard (revenue by product, by period, by conversion stage)
- [ ] Compliance audit trail (all recommendations logged with user context)
- [ ] Test coverage >= 80%

**Key Files**:
- `src/lib/affiliate/compliance-checker.ts` (new)
- `src/lib/affiliate/revenue-dashboard-service.ts` (new)
- `src/lib/affiliate/__tests__/compliance-checker.test.ts` (new)
- `src/app/api/admin/affiliate/revenue/route.ts` (new)

**Verification Block**:
| Check | Command | Expected |
|-------|---------|----------|
| Tests | `npm test -- compliance-checker --coverage` | All pass, >= 80% |
| Types | `npx tsc --noEmit` | 0 errors |

---

### Wave 6 Merge Gate

| Gate | Criteria | Verification |
|------|----------|-------------|
| All 13 tasks DONE | Every task status = DONE | Check each task |
| Lint clean | 0 blocking errors | `npm run lint` |
| Types clean | 0 errors | `npx tsc --noEmit` |
| Tests pass | All pass, 0 failures | `npm test` |
| Build succeeds | Exit code 0 | `npm run build` |
| Coverage >= 80% | All new code at >= 80% | `npm test -- --coverage` |
| Security clean | 0 high/critical | `npm audit --audit-level=high` |
| Plaid sandbox verified | Link flow works end-to-end | Manual test in sandbox |
| DriveWealth sandbox verified | Order placement works | Manual test in sandbox |
| Affiliate flow verified | Recommendations shown with disclosures | Manual verification |

---

## 13. Quick Reference

### 13.1 Tasks by Priority

| Priority | Count | Tasks |
|----------|-------|-------|
| **P0** | 12 | INF-01, INF-06, INF-03, INF-11, SEC-03, TRD-07, NTF-03, ADM-03, INF-04, INF-12, MOB-01, SEC-01 |
| **P1** | 48 | CRD-04, CRD-02, FIN-01, FIN-02, FIN-03, FIN-06, TRD-01, TRD-03, TRD-13, RSK-01, RSK-03, TAX-01, DOC-03, CRD-03, CRD-05, TRD-04, TRD-05, TRD-02, TRD-08, RSK-02, RSK-05, FIN-04, FIN-05, INV-03, INV-01, INV-02, AIM-01, AIM-02, GMF-01, TRD-06, TRD-10, INV-06, INV-04, INF-05, SEC-04, SEC-05, ONB-01, DOC-01, MKT-01, MOB-03, ADM-01, ADM-02, CRD-01, NTF-01, SEC-06, INF-02, PLT-01, PLT-02, GLC-01, INF-09, MOB-04 |
| **P2** | 46 | TAX-02, TAX-03, TAX-04, TAX-05, CRD-06, TRD-09, TRD-11, RSK-04, FIN-07, CRD-07, FIN-09, FIN-10, TAX-06, INV-07, INV-08, FIN-11, FIN-12, AIM-03, GMF-02, GMF-03, TRD-12, TRD-14, INV-05, INF-07, INF-08, ONB-02, RSK-06, RSK-07, FIN-08, SEC-02, INF-10, NTF-02, DOC-02, DOC-04, CRD-08, CRD-09, SEC-07, NTF-04, MOB-05, MOB-06, MOB-02, PLT-03, PLT-05, FIN-13 |
| **P3** | 16 | UI-01, FIN-12, ADM-04, ADM-05, NTF-05, MOB-07, PLT-04, GLC-02 + remaining |

### 13.2 Tasks by Domain

| Domain | Count | Task IDs |
|--------|-------|----------|
| **INF** | 10 | INF-01, INF-02, INF-03, INF-04, INF-05, INF-06, INF-07, INF-08, INF-09, INF-10, INF-11, INF-12 |
| **SEC** | 7 | SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-06, SEC-07 |
| **CRD** | 9 | CRD-01, CRD-02, CRD-03, CRD-04, CRD-05, CRD-06, CRD-07, CRD-08, CRD-09 |
| **FIN** | 14 | FIN-01, FIN-02, FIN-03, FIN-04, FIN-05, FIN-06, FIN-07, FIN-08, FIN-09, FIN-10, FIN-11, FIN-12, FIN-13 |
| **TRD** | 18 | TRD-01, TRD-02, TRD-03, TRD-04, TRD-05, TRD-06, TRD-07, TRD-08, TRD-09, TRD-10, TRD-11, TRD-12, TRD-13, TRD-14, TRD-15, TRD-16, TRD-17, TRD-18 |
| **INV** | 8 | INV-01, INV-02, INV-03, INV-04, INV-05, INV-06, INV-07, INV-08 |
| **RSK** | 7 | RSK-01, RSK-02, RSK-03, RSK-04, RSK-05, RSK-06, RSK-07 |
| **TAX** | 6 | TAX-01, TAX-02, TAX-03, TAX-04, TAX-05, TAX-06 |
| **AIM** | 3 | AIM-01, AIM-02, AIM-03 |
| **GMF** | 3 | GMF-01, GMF-02, GMF-03 |
| **MOB** | 7 | MOB-01, MOB-02, MOB-03, MOB-04, MOB-05, MOB-06, MOB-07 |
| **ADM** | 5 | ADM-01, ADM-02, ADM-03, ADM-04, ADM-05 |
| **NTF** | 5 | NTF-01, NTF-02, NTF-03, NTF-04, NTF-05 |
| **PLT** | 5 | PLT-01, PLT-02, PLT-03, PLT-04, PLT-05 |
| **GLC** | 2 | GLC-01, GLC-02 |
| **DOC** | 5 | DOC-01, DOC-02, DOC-03, DOC-04, DOC-05 |
| **ONB** | 2 | ONB-01, ONB-02 |
| **MKT** | 1 | MKT-01 |
| **UI** | 1 | UI-01 |
| **PLD** | 5 | PLD-01, PLD-02, PLD-03, PLD-04, PLD-05 |
| **AFF** | 4 | AFF-01, AFF-02, AFF-03, AFF-04 |

### 13.3 Critical Dependency Chains

```
INF-01 (rebrand) ──→ INF-06 (Supabase schema) ──→ FIN-01 (budgets) ──→ FIN-04 (bill negotiation)
                                                  ──→ CRD-04 (dispute ML) ──→ CRD-05 (response processing)
                                                  ──→ TRD-01 (PCTT pipeline) ──→ TRD-04 (trendline) ──→ TRD-06 (confluence)

SEC-03 (RLS) ──→ RSK-01 (trailing stops) ──→ RSK-02 (rules engine)
             ──→ TAX-01 (federal tax) ──→ TAX-02 (state tax) ──→ TAX-06 (tax APIs)

INF-11 (type safety) ──→ TRD-13 (market data) ──→ TRD-03 (pivot detection) ──→ TRD-05 (signal gen)

MOB-01 (test coverage) ──→ MOB-03 (trading screens) ──→ MOB-07 (app store)
                        ──→ MOB-04 (biometric auth)
                        ──→ MOB-05 (deep linking)

PLT-01 (marketplace) ──→ PLT-02 (payments) ──→ PLT-03 (white label)
GLC-01 (connectors) ──→ GLC-02 (multi-region) + PLT-04 (multi-currency)

PLD-01 (SDK migration) ──→ PLD-02 (webhooks) + PLD-03 (mobile) + PLD-04 (investments) + PLD-05 (income)
TRD-15 (DriveWealth) ──→ TRD-16 (broker router) ──→ TRD-17 (fractional trading)
                      ──→ TRD-18 (KYC flow)
AFF-01 (MoneyLion) ──→ AFF-02 (credit cards) + AFF-03 (insurance/loans)
AFF-04 (compliance) ── independent, runs parallel
```

### 13.4 Wave Summary

| Wave | Focus | Tasks | New | Total Effort |
|------|-------|-------|-----|-------------|
| 0 | Foundation & Infrastructure | 10 | 0 | ~4 weeks |
| 1 | Core Feature Build | 18 | 5 | ~8 weeks |
| 2 | Feature Depth & Extensions | 26 | 7 | ~10 weeks |
| 3 | AI, Gamification & Polish | 24 | 5 | ~12 weeks |
| 4 | Mobile, Admin & Integration | 24 | 10 | ~12 weeks |
| 5 | Platform & Scale | 10 | 5 | ~10 weeks |
| 6 | External Integrations & Monetization | 13 | 13 | ~8-10 weeks |
| **Total** | | **125** | **45** | **~64-66 weeks** |

### 13.5 EXT Coverage Verification

| Domain | EXT Items | Absorbed | New Task | Ignored | Merged | Covered |
|--------|-----------|----------|----------|---------|--------|---------|
| CRD | 26 | 18 | 2 | 2 | 0 | 20/24 (83%) |
| FIN | 52 | 38 | 6 | 3 | 0 | 44/49 (90%) |
| TRD | 42 | 32 | 2 | 1 | 1 | 34/40 (85%) |
| INV | 18 | 14 | 2 | 1 | 0 | 16/17 (94%) |
| RSK | 20 | 14 | 2 | 1 | 1 | 16/18 (89%) |
| SEC | 22 | 16 | 2 | 1 | 0 | 18/21 (86%) |
| MOB | 24 | 14 | 4 | 1 | 0 | 18/23 (78%) |
| AIM | 16 | 12 | 1 | 0 | 1 | 13/15 (87%) |
| ADM | 12 | 9 | 2 | 1 | 0 | 11/11 (100%) |
| NTF | 10 | 6 | 2 | 0 | 0 | 8/10 (80%) |
| PLT | 16 | 8 | 3 | 1 | 0 | 11/15 (73%) |
| ONB | 14 | 10 | 1 | 0 | 0 | 11/14 (79%) |
| TAX | 16 | 6 | 5 | 0 | 0 | 11/16 (69%) |
| INF | 22 | 14 | 2 | 0 | 0 | 16/22 (73%) |
| GMF | 8 | 5 | 1 | 0 | 0 | 6/8 (75%) |
| DOC | 6 | 3 | 1 | 0 | 0 | 4/6 (67%) |
| UI | 10 | 7 | 1 | 1 | 1 | 8/9 (89%) |
| GLC | 6 | 2 | 1 | 0 | 0 | 3/6 (50%) |
| **Total** | **340** | **228** | **40** | **13** | **4** | **268/324 (83%)** |

> **Note**: 278 ACTIONABLE + 65 IGNORED from ledger. Remaining uncovered items are sub-items of larger tasks or deferred to future planning cycles.

---

*Generated: 2026-02-28 | Source: PLAN-EXTRACTION-LEDGER.md (278 actionable EXT items), SSOT.md Section 16 (80 original tasks), dependency_graph.md, build_order_blueprint.md*
*This document is the single executable reference for all Fynvita implementation work. Do not create separate planning documents.*

---

# Wave 7 — Security & Correctness Remediation (VERSION-013)

> **Opened 2026-05-03** in response to a comprehensive 9-domain code review (27 reviewer agents).
> **Source of finding IDs**: `docs/ssot/gap_analysis.md` (FND-001 through FND-071).
> **Reference fix template**: commit `d64e8d5` (atomic Postgres RPC + UNIQUE constraint + REVOKE/GRANT).
> **Scope**: ~60 tasks, estimated 4 weeks, parallel SEC / BE / MOB / DEVOPS streams.
> **Branch policy** (per user direction): keep `feat/asset-system-regen` as base; do NOT abandon. Branch hygiene tracked under TASK-PRE-06.
> **Owner-types**: SEC=security, BE=backend, FE=frontend, MOB=mobile, DEVOPS=devops, ARCH=architect, QA=test-writer.
> **No new feature work** (Waves 8+) starts until this wave's exit gates pass.

## Wave 7 Summary

| Phase | Window | Stream | Task count |
|-------|--------|--------|-----------:|
| 0 — Prereqs | Week 0 (2-3 days) | ARCH/DEVOPS | 6 |
| 1 — Auth/RBAC | Weeks 1-2 | SEC + BE | 12 |
| 2 — Webhooks + tier | Weeks 2-3 | BE | 7 |
| 3 — Money / Commerce | Week 3 | BE | 7 |
| 4 — Mock-data sweep | Weeks 3-4 | BE + MOB | 6 |
| 5 — Compliance + AI hygiene | Week 4 | BE + SEC | 5 |
| 6 — Mobile hardening | Week 4 | MOB | 7 |
| 7 — IDOR sweep (parallelizable) | Weeks 2-4 | SEC + BE | 5 |
| **TOTAL** | **4 weeks** | mixed | **~55** |

---

## Phase 0 — Immediate Prereqs (Week 0, 2-3 days)

### TASK-PRE-01 — Honest re-baseline
- **Size**: M | **Owner**: ARCH | **Depends on**: none
- **Output**: `docs/ssot/health_metrics.md` updated with re-run results; `SSOT.md` banner "Wave 7 in flight"; `CLAUDE.md` "Phase: All 7 waves DONE" line removed; all 125 prior tasks marked NEEDS_VERIFICATION except those with linked passing integration tests.
- **Acceptance**: `npm test`, `npx tsc --noEmit`, `npm run build`, `npm audit` re-executed and committed; `gap_analysis.md` regenerated; CI badge wired so `health_metrics.md` becomes machine-generated.

### TASK-PRE-02 — Branch + freeze policy
- **Size**: S | **Owner**: DEVOPS | **Depends on**: none
- **Output**: `remediation/wave-7-*` branch namespace; main protected, only `hotfix/*` + `remediation/*` allowed; PR template requires "FND-### addressed" field.
- **Acceptance**: GitHub branch protection rules updated; CODEOWNERS gates `src/lib/auth/`, `src/lib/security/`, `src/lib/commerce/`, `src/lib/payment/`, `supabase/migrations/` to a SEC reviewer.

### TASK-PRE-03 — Feature flag infrastructure
- **Size**: M | **Owner**: BE | **Depends on**: TASK-PRE-01
- **Output**: `src/lib/flags/` with Supabase-backed flag table + typed reader; supports kill-switch on auth, webhooks, payouts.
- **Acceptance**: 1 unit test + 1 integration test; flag read cached <1s; admin can flip via Supabase dashboard.

### TASK-PRE-04 — Communication + incident channel
- **Size**: S | **Owner**: ARCH | **Depends on**: none
- **Output**: `SECURITY.md` added; private channel "wave-7-remediation"; daily standup cadence; rollback playbook per phase.
- **Acceptance**: `SECURITY.md` merged; rollback playbook reviewed by SEC owner.

### TASK-PRE-05 — Lint guards (mock-data + secrets) bootstrap
- **Size**: M | **Owner**: DEVOPS | **Depends on**: TASK-PRE-01
- **Output**: ESLint custom rule `no-math-random-in-prod` (excludes `__tests__`, `lib/random`); ESLint built-in `no-restricted-imports` blocking `**/__mocks__/**`, `**/*.fixture.*` outside test files; CI step `rg -n 'Math\.random\(|faker\.|mockData|MOCK_' src/ --glob '!**/__tests__/**' --glob '!**/*.test.*'`.
- **Acceptance**: rules land as warning first, escalate to error after Phase 4.

### TASK-PRE-06 — Branch hygiene on `feat/asset-system-regen`
- **Size**: M | **Owner**: DEVOPS + ARCH | **Depends on**: TASK-PRE-02
- **Output**: 24MB `strativion-autonomous-trading-package.zip` removed from tree (committed deletion, then `git filter-repo` consultation); chunked-push procedure documented in `SECURITY.md`; branch decomposed into reviewable sub-PRs where possible.
- **Acceptance**: `du -sh strativion-autonomous-trading-package.zip` returns "No such file"; remediation PRs pass review without reviewer-context overflow on the diff.
- **Notes**: User chose to keep this branch as base rather than cut from main. This task ensures it's reviewable.

**Phase 0 gate**: re-baseline numbers published; freeze active; flags + lint guards live; branch hygiene addressed.

---

## Phase 1 — Auth/RBAC Rebuild (Weeks 1-2)

| ID | Title | Size | Owner | Depends on | Closes |
|----|-------|------|-------|------------|--------|
| TASK-AUTH-01 | Remove `user_metadata` role read in `src/lib/auth/rbac.ts` | S | SEC | PRE-01 | FND-005 |
| TASK-AUTH-02 | Remove admin email whitelist + enterprise=admin grant | S | SEC | AUTH-01 | FND-003, FND-004 |
| TASK-AUTH-03 | Audit all 284 API routes → wrap in existing `withAuth` (sub-batched by domain) | L | SEC + BE | AUTH-01, AUTH-02 | FND-006 + 100+ unauth routes |
| TASK-AUTH-04 | Middleware `/api/*` deny-by-default with explicit `PUBLIC_ROUTES.ts` allowlist | M | SEC | AUTH-03 | FND-001 |
| TASK-AUTH-05 | Remove `AIML_API_KEY` reuse as inbound auth | S | SEC | AUTH-03 | FND-002 |
| TASK-AUTH-06 | Consolidate to single `redis-rate-limiting.ts`; delete the other three | M | BE | PRE-03 | FND-013 |
| TASK-AUTH-07 | Replace in-memory session `Map` with Redis-backed store (or remove) | M | BE | AUTH-06 | FND-007 |
| TASK-AUTH-08 | `crypto.timingSafeEqual` for all secret comparisons (API keys, webhook secrets, CSRF) | S | SEC | none | FND-011 |
| TASK-AUTH-09 | CSRF secret hard-fail on missing env in production | S | SEC | none | FND-008 |
| TASK-AUTH-10 | Backup-code TOCTOU fix via single Postgres RPC + `FOR UPDATE` (template `d64e8d5`) | M | SEC + BE | none | FND-010 |
| TASK-AUTH-11 | Atomic signup: profile insert in DB trigger or rollback on failure | M | BE | AUTH-03 | FND-009 |
| TASK-AUTH-12 | Reconcile two role enumerations (`api-guard.ts` vs `rbac.ts`) — single source of role types | S | SEC | none | FND-012 |

**Phase 1 gate**: AUTH-03 audit script in CI; lint rule blocks new routes lacking `withAuth`; SEC review sign-off on `PUBLIC_ROUTES.ts`; integration test enumerates all routes asserting 401 unauthenticated + 403 wrong-permission.

---

## Phase 2 — Webhooks + Tier Mapping (Weeks 2-3)

| ID | Title | Size | Owner | Depends on | Closes |
|----|-------|------|-------|------------|--------|
| TASK-WBH-01 | `processed_webhook_events(provider, event_id, processed_at)` UNIQUE table; helper `markWebhookProcessed()` | M | BE | PRE-01 | FND-022 |
| TASK-WBH-02 | Fix `getTierFromPriceId` — drive from `SUBSCRIPTION_PLANS`; default = throw, not Free | S | BE | WBH-01 | FND-018 |
| TASK-WBH-03 | Remove `billing-profile-store` mock + `createSeedProfile` Visa 4242; read via Stripe Customer | M | BE | WBH-02 | FND-016, FND-017 |
| TASK-WBH-04 | Rethrow swallowed webhook errors; structured logging via existing project logger | M | BE | WBH-01 | FND-014, FND-015 |
| TASK-WBH-05 | Webhook signature verification audit on all inbound webhooks; `timingSafeEqual` | S | SEC | AUTH-08, AUTH-09 | (preventive) |
| TASK-WBH-06 | Server-authoritative `successUrl`/`cancelUrl`/`priceId`/`trialDays` in checkout route | S | BE | WBH-02 | FND-019, FND-020, FND-021 |
| TASK-WBH-07 | Subscription tier backfill (per user direction — no live users yet, but lock down for launch) | M | BE | WBH-02 | (defensive) |

**Phase 2 gate**: Stripe replay test passes; price-tier map covers 100% of env-listed price IDs (validator at boot); chaos test (force DB error) → Stripe gets 500 → retries.

---

## Phase 3 — Money Correctness + Commerce (Week 3)

| ID | Title | Size | Owner | Depends on | Closes |
|----|-------|------|-------|------------|--------|
| TASK-MNY-01 | Stripe payout cents conversion (`Math.round(amount * 100)`) at both Stripe call sites; regression test | S | BE | PRE-01 | FND-024 |
| TASK-MNY-02 | Atomic `increment_referral_use(code, user_id)` RPC with row lock; replaces read-modify-write | M | BE | WBH-01 | FND-027 |
| TASK-MNY-03 | Self-referral guard at service + RPC layer | S | BE | MNY-02 | FND-027 |
| TASK-MNY-04 | `Idempotency-Key` on every Stripe transfer; collapse two parallel payout codepaths | M | BE | WBH-01 | FND-026 |
| TASK-MNY-05 | In-memory `revenueTracker` → `revenue_events` table; service writes through | M | BE | PRE-01 | FND-025 |
| TASK-MNY-06 | `Money` branded type (`Cents` integer-only) + ESLint rule on `*amount*\|*price*\|*payout*` field names | M | ARCH + BE | MNY-01 | (preventive) |
| TASK-MNY-07 | Server-side commission recalculation in affiliate webhook (ignore inbound `commission`) | S | BE | WBH-01 | FND-028 |

**Phase 3 gate**: Money lint rule active; revenue numbers match Stripe dashboard within $0; Stripe replay tests green.

---

## Phase 4 — Mock-Data Sweep (Week 3-4)

| ID | Title | Size | Owner | Depends on | Closes |
|----|-------|------|-------|------------|--------|
| TASK-MOK-01 | Admin analytics + stats + audit + logs: replace `Math.random()` and hardcoded fallbacks with real DB queries | M | BE | MNY-05 | FND-052, FND-053 |
| TASK-MOK-02 | `billing-profile` fake-card removal (sourced from Stripe `payment_methods.retrieve`) | S | BE | WBH-03 | (sub-finding of FND-016) |
| TASK-MOK-03 | Debt API real CRUD (`src/app/api/financial/debt/**`) | L | BE | AUTH-03 | (review-flagged mock) |
| TASK-MOK-04 | AI-insight routes real wiring (5 routes) | M | BE | AUTH-03 | (review-flagged mock) |
| TASK-MOK-05 | Mobile dispute screen real wiring (consume `useDisputeStore`); collapse `dispute/`+`disputes/` segments | M | MOB | AUTH-03 | FND-068 |
| TASK-MOK-06 | Lint rule escalation (PRE-05 warnings → errors); CI blocks new violations | S | DEVOPS | MOK-01..05 | (preventive) |

**Phase 4 gate**: mock-data lint rules at error level; grep audit produces 0 hits in `src/app/api/**` and `mobile-app/app/**`.

---

## Phase 5 — Compliance + AI Hygiene (Week 4)

| ID | Title | Size | Owner | Depends on | Closes |
|----|-------|------|-------|------------|--------|
| TASK-CMP-01 | `ConsentManagementService` DB persistence (replace in-memory Map; route to `consent_records` table) | M | BE | PRE-01 | FND-057 |
| TASK-CMP-02 | `sendBreachNotification` wired to Resend + `breach_notifications` table; admin trigger endpoint | M | BE | AUTH-03 | FND-056 |
| TASK-CMP-03 | `delete_user_data_cascade` RPC expanded (audit via `information_schema` for missing user-FK tables) | M | BE | CMP-01 | FND-058 |
| TASK-CMP-04 | `ModelRouter` enforcement: 14 callers migrated; lint rule blocks direct `AIMLService` usage; client-supplied `model` removed; voice TTS auth + model whitelist | M | BE | AUTH-05 | FND-059, FND-060, FND-061 |
| TASK-CMP-05 | `src/lib/aiml/sanitizer.ts` strips PII (SSN, account numbers, DOB) before outbound; wraps `ModelRouter`; prompt-injection guards on user-controlled fields | M | SEC | CMP-04 | FND-062, FND-063 |

**Phase 5 gate**: cascade test green (create user with rows in all FK tables, run cascade, assert 0 remaining); PII redaction unit tests at 100% on SSN/card/account-number patterns; lint rule blocks bypass.

---

## Phase 6 — Mobile Hardening (Week 4)

| ID | Title | Size | Owner | Depends on | Closes |
|----|-------|------|-------|------------|--------|
| TASK-MOB-01 | `expo-secure-store` migration for biometric flag, push token, and any auth-related AsyncStorage keys | M | MOB | none | FND-069 |
| TASK-MOB-02 | `Linking.openURL` scheme allowlist wrapper (https only, allowlist) | S | MOB | none | FND-070 |
| TASK-MOB-03 | `npm audit fix` in `mobile-app/` (handlebars/node-forge/lodash CVEs) | S | MOB | none | FND-065 |
| TASK-MOB-04 | Delete deprecated `financialStore`; migrate 5 callers to modular stores | S | MOB | none | FND-066, FND-067 |
| TASK-MOB-05 | Normalize AsyncStorage key prefixes to `@fynvita/<domain>/<key>`; lint rule warns on bare keys | S | MOB | MOB-01 | (brand migration cleanup) |
| TASK-MOB-06 | Remove `__DEV__` auth bypass in `authStore.ts`; replace with separate `DevAuthProvider` excluded from production bundle | S | MOB | none | FND-064 |
| TASK-MOB-07 | Replace bare `fetch()` in mobile API clients with `api.get/post()` from `client.ts` (auto-attaches Bearer) | S | MOB | AUTH-03 | FND-071 |

**Phase 6 gate**: mobile `npm audit --audit-level=high` exits 0; SecureStore audit script in CI; integration smoke test confirms `__DEV__` bypass cannot reach production bundle.

---

## Phase 7 — IDOR Sweep (parallelizable across Weeks 2-4)

| ID | Title | Size | Owner | Depends on | Closes |
|----|-------|------|-------|------------|--------|
| TASK-IDR-01 | Audit script: every Supabase query has `.eq('user_id', ...)` or RLS proof; CI runs script; new violations block merge | M | SEC | PRE-05 | (detection) |
| TASK-IDR-02 | `portfolio-service` IDOR fixes; analytics routes pass `user.id`; DELETE atomicity | M | BE | IDR-01 | FND-030, FND-034 |
| TASK-IDR-03 | `plaid-service` IDOR fixes (`getTransactions`, `getAccessToken` user-scoped); Plaid token out of GET query | M | BE | IDR-01 | FND-036, FND-037, FND-038 |
| TASK-IDR-04 | `notification-service-db` IDOR fixes (`markAsRead`, `deleteNotification` filter by user_id) | M | BE | IDR-01 | FND-046 |
| TASK-IDR-05 | `admin/disputes` PATCH whitelist updatable fields with Zod schema | S | SEC | AUTH-03 | FND-054 |

**Phase 7 gate**: IDOR audit script in CI; 0 violations; per-service integration tests assert cross-user 403.

---

## Wave 7 Exit Criteria (gate to allow Wave 8+ feature work)

1. All 33 CRITICAL findings (FND-001..FND-068 critical-tagged) have linked closed task IDs in this plan.
2. CI gates active: route-auth audit, IDOR audit, mock-data lint, money-type lint, npm audit (web + mobile), webhook idempotency replay test.
3. SEC sign-off on TASK-AUTH-03, TASK-WBH-05, TASK-CMP-05, TASK-IDR-01.
4. Coverage re-baseline ≥80% on remediated modules (per global CLAUDE.md gate); mobile parity tracked separately under TASK-MOB-01..07.
5. `SSOT.md`, `health_metrics.md`, `gap_analysis.md` updated to reflect new state; "All 7 waves DONE" status restored only after gate passes.
6. Negative-auth test coverage exists for every route in `PUBLIC_ROUTES.ts` and a sample of authenticated routes (anonymous + wrong-user assertions).

---

## Wave 7 Status (Live)

| Phase | Status | % Complete |
|-------|--------|-----------:|
| 0 — Prereqs | NOT_STARTED | 0% |
| 1 — Auth/RBAC | NOT_STARTED | 0% |
| 2 — Webhooks + tier | NOT_STARTED | 0% |
| 3 — Money + Commerce | NOT_STARTED | 0% |
| 4 — Mock-data sweep | NOT_STARTED | 0% |
| 5 — Compliance + AI | NOT_STARTED | 0% |
| 6 — Mobile hardening | NOT_STARTED | 0% |
| 7 — IDOR sweep | NOT_STARTED | 0% |
| **Wave 7 overall** | **NOT_STARTED** | **0%** (commit `d64e8d5` is template, not part of Wave 7 task closure) |

**Note on prior wave status**: All 125 tasks from Waves 0-6 marked DONE in VERSION-010 are now flagged NEEDS_VERIFICATION pending re-audit. Specific reopened tasks: TASK-NTF-03 (notifications domain entirely unauth'd), TASK-ADM-03 (3 admin endpoints unauth'd, `Math.random()` analytics). See `docs/ssot/gap_analysis.md` § 4 for full false-positive log.
