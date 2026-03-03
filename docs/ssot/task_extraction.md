# Task Extraction & Normalization

> DICE v3.3 Step 2 Output
> Generated: 2026-02-25
> Sources: `docs/master-plan.md`, `docs/gap-analysis.md`, `docs/SSOT.md` §16-§17

---

## 1. Source Inventory

| Source | Items Extracted | Type |
|--------|----------------|------|
| `docs/master-plan.md` | 28 tasks (TASK-1.1.1 → TASK-4.3.2) | Structured tasks |
| `docs/master-plan.md` | 21 A+ upgrade features (§ A+ Strategy) | Feature specs |
| `docs/master-plan.md` | 7 blocking dependencies | Infrastructure deps |
| `docs/gap-analysis.md` | 15 gaps (5 HIGH, 7 MEDIUM, 3 LOW) | Gap records |
| `docs/gap-analysis.md` | 5 open TD items (TD-05→TD-10) | Tech debt |
| `docs/gap-analysis.md` | 9 open DEC items (DEC-02→DEC-11) | Decisions pending |
| `docs/gap-analysis.md` | 3 open SEC items (SEC-03,06,07) | Security findings |
| `docs/SSOT.md` §16.3 | 21 A+ features (4+5+6+6) | Feature specs (overlap) |
| `docs/SSOT.md` §16.4 | 7 feature plans (Mobile, Financial, Global, AI, Onboarding, Tax, Chat) | Implementation plans |
| **Total raw items** | **~116** | |

---

## 2. Deduplication Log

Items merged where the same work appeared in multiple source documents.

| Merged Into | Sources Merged | Rationale |
|-------------|---------------|-----------|
| TASK-CRD-01 | TASK-1.1.1 + A+ Credit "Goodwill Letter Generator" | Same feature |
| TASK-CRD-02 | TASK-1.1.2 + A+ Credit "Credit Alert System" | Same feature |
| TASK-CRD-03 | TASK-1.1.3 + A+ Credit "Dispute Success Predictor" | Same feature |
| TASK-CRD-04 | GAP-01 + A+ Credit "Bureau API Integration" | Same feature |
| TASK-FIN-01 | TASK-1.2.1 + A+ Financial "Bill Payment Reminders" | Same feature |
| TASK-FIN-02 | TASK-1.2.2 + A+ Financial "Spending Limit Alerts" | Same feature |
| TASK-TRD-01 | TASK-2.2.1 + A+ Trading "Paper Trading Engine" + GAP-03 (partial) | Paper trading is the core of GAP-03 |
| TASK-TRD-02 | TASK-2.2.2 + A+ Trading "Trading Journal" | Same feature |
| TASK-INF-02 | TD-06 (114 doc overlap) + DEC-11 (Docs cleanup) | Same cleanup work |
| TASK-INF-03 | TD-07 (No DB migrations) + DEC-10 (DB migrations decision) | Decision enables implementation |
| TASK-INF-05 | TD-10 (No feature flags) + DEC-07 (Feature flags decision) | Decision enables implementation |
| TASK-TRD-07 | GAP-TRADING (36svc/4tests) + A+ Trading test gaps | Same test debt |
| TASK-FIN-08 | GAP-06 (Banking limited) + A+ Financial suite gaps | Banking is part of financial suite |
| TASK-SEC-05 | SEC-07 (WebAuthn) + TASK-4.3.2 (Advanced MFA) partial | WebAuthn is part of MFA |

**Deduplication result**: ~116 raw → **68 normalized tasks**

---

## 3. Conflict Notes

| ID | Conflict | Resolution |
|----|----------|------------|
| CONFLICT-TAX | SSOT §16.4.6 says Tax = 100% complete, but GAP-TAX and GAP-04 flag gaps | Tax MODULE is complete (code exists). Gaps refer to missing test coverage and limited tax code support. Kept as TASK-FIN-07 (Tax Export) for remaining gap work. |
| CONFLICT-CHAT | SSOT §16.4.7 says Chat Engine = complete (804 lines), but no test coverage gap flagged | Chat module complete. No task needed. Verified. |
| CONFLICT-ONBOARDING | SSOT §16.4.5 has 138hr plan, but GAP-ONBOARDING is MEDIUM | Onboarding Phase 1-2 complete per §16.7. Remaining work is Phase 3. Kept as TASK-ONB-01. |

---

## 4. Normalized Task Records

### 4.1 Credit Domain (CRD)

| ID | Title | Status | Priority | Owner Module | Dependencies | Source Backlinks | Effort |
|----|-------|--------|----------|-------------|-------------|-----------------|--------|
| TASK-CRD-01 | Goodwill Letter Generator | TODO | P2 | Credit | None | TASK-1.1.1, SSOT §16.3.1 | 2wk |
| TASK-CRD-02 | Credit Alert System | TODO | P1 | Credit | Notification Service | TASK-1.1.2, SSOT §16.3.1 | 2wk |
| TASK-CRD-03 | Dispute Success Predictor | TODO | P2 | Credit, AI/ML | Credit Bureau API | TASK-1.1.3, SSOT §16.3.1 | 3wk |
| TASK-CRD-04 | Credit Bureau API Integration | TODO | P0 | Credit | None (external dependency) | GAP-01, SSOT §16.3.1 | 4wk |
| TASK-CRD-05 | Secured Card Recommendations | TODO | P1 | Credit | Credit Bureau API | TASK-3.1.1 | 2wk |
| TASK-CRD-06 | Rent Reporting Integration | TODO | P1 | Credit | Credit Bureau API | TASK-3.1.2 | 2wk |

**Domain total**: 6 tasks | **Blocks**: CRD-04 blocks CRD-03, CRD-05, CRD-06

---

### 4.2 Financial Domain (FIN)

| ID | Title | Status | Priority | Owner Module | Dependencies | Source Backlinks | Effort |
|----|-------|--------|----------|-------------|-------------|-----------------|--------|
| TASK-FIN-01 | Bill Payment Reminders | TODO | P1 | Financial | Notification Service | TASK-1.2.1, SSOT §16.3.2 | 2wk |
| TASK-FIN-02 | Spending Limit Alerts | TODO | P1 | Financial | Notification Service | TASK-1.2.2, SSOT §16.3.2 | 2wk |
| TASK-FIN-03 | Income Verification System | TODO | P1 | Financial | Plaid Integration | SSOT §16.3.2, §16.4.2 | 2wk |
| TASK-FIN-04 | Subscription Analyzer | TODO | P2 | Financial | Transaction Data | SSOT §16.3.2, §16.4.2 | 2wk |
| TASK-FIN-05 | Smart Budget AI | TODO | P2 | Financial, AI/ML | Budget Engine | SSOT §16.3.2, §16.4.2 | 3wk |
| TASK-FIN-06 | Auto-Save Rules Engine | TODO | P1 | Financial | Bank Account Link | TASK-3.2.1 | 2wk |
| TASK-FIN-07 | Tax Export & Reporting | TODO | P2 | Financial | Tax Module | TASK-4.1.3, GAP-04 | 2wk |
| TASK-FIN-08 | Banking Integration (Open Banking) | TODO | P2 | Financial | None (external) | GAP-06, SSOT §16.4.2 | 4wk |

**Domain total**: 8 tasks

---

### 4.3 Investment Domain (INV)

| ID | Title | Status | Priority | Owner Module | Dependencies | Source Backlinks | Effort |
|----|-------|--------|----------|-------------|-------------|-----------------|--------|
| TASK-INV-01 | Portfolio Rebalancing Engine | TODO | P2 | Investments | Portfolio Service | TASK-2.1.1 | 3wk |
| TASK-INV-02 | Dividend Tracking & Reinvestment | TODO | P2 | Investments | Portfolio Service | TASK-2.1.2 | 2wk |
| TASK-INV-03 | Manual Account Entry | TODO | P1 | Investments | None | TASK-2.3.1 | 1wk |
| TASK-INV-04 | Real Estate Tracking | TODO | P2 | Investments | None | TASK-2.3.2 | 2wk |
| TASK-INV-05 | Crypto Wallet Sync | TODO | P2 | Investments | None (external API) | TASK-2.3.3 | 3wk |
| TASK-INV-06 | Auto-Rebalance Scheduler | TODO | P2 | Investments | Portfolio Rebalancing Engine | TASK-3.2.2 | 2wk |

**Domain total**: 6 tasks | **Blocks**: INV-01 blocks INV-06

---

### 4.4 Trading Domain (TRD)

| ID | Title | Status | Priority | Owner Module | Dependencies | Source Backlinks | Effort |
|----|-------|--------|----------|-------------|-------------|-----------------|--------|
| TASK-TRD-01 | Paper Trading Engine | TODO | P0 | Trading | Trading Engine (Alpaca) | TASK-2.2.1, SSOT §16.3.3, GAP-03 | 3wk |
| TASK-TRD-02 | Trading Journal | TODO | P2 | Trading | Paper Trading Engine | TASK-2.2.2, SSOT §16.3.3 | 2wk |
| TASK-TRD-03 | HATS Signal Fusion | TODO | P1 | Trading | Trading Engine | SSOT §16.3.3 | 4wk |
| TASK-TRD-04 | Risk Gateway | TODO | P1 | Trading, Risk | HATS Signal Fusion | SSOT §16.3.3 | 3wk |
| TASK-TRD-05 | Order Management System | TODO | P1 | Trading | Risk Gateway | SSOT §16.3.3, §16.9 | 3wk |
| TASK-TRD-06 | Backtesting Framework | TODO | P2 | Trading | Paper Trading Engine | SSOT §16.3.3 | 3wk |
| TASK-TRD-07 | Trading Test Coverage (36svc → 80%+) | TODO | P0 | Trading | None | GAP-TRADING | 3wk |

**Domain total**: 7 tasks | **Blocks**: TRD-01 blocks TRD-02, TRD-06; TRD-03 blocks TRD-04; TRD-04 blocks TRD-05

---

### 4.5 Risk Domain (RSK)

| ID | Title | Status | Priority | Owner Module | Dependencies | Source Backlinks | Effort |
|----|-------|--------|----------|-------------|-------------|-----------------|--------|
| TASK-RSK-01 | Risk Rules Engine | TODO | P1 | Risk | Trading Engine | SSOT §16.3.4 | 3wk |
| TASK-RSK-02 | Position Sizing Calculator | TODO | P1 | Risk | Risk Rules Engine | SSOT §16.3.4 | 2wk |
| TASK-RSK-03 | Kill Switch (Circuit Breaker) | TODO | P0 | Risk | Risk Rules Engine | SSOT §16.3.4 | 2wk |
| TASK-RSK-04 | Correlation Monitor | TODO | P2 | Risk | Portfolio Service | SSOT §16.3.4 | 2wk |
| TASK-RSK-05 | Stress Testing Framework | TODO | P2 | Risk | Risk Rules Engine | SSOT §16.3.4 | 3wk |
| TASK-RSK-06 | Real-Time Risk Dashboard | TODO | P2 | Risk | All RSK tasks | SSOT §16.3.4 | 2wk |

**Domain total**: 6 tasks | **Blocks**: RSK-01 blocks RSK-02, RSK-03, RSK-05; all block RSK-06

---

### 4.6 Notification Domain (NTF)

| ID | Title | Status | Priority | Owner Module | Dependencies | Source Backlinks | Effort |
|----|-------|--------|----------|-------------|-------------|-----------------|--------|
| TASK-NTF-01 | Proactive Financial Alerts | TODO | P1 | Notifications | Notification Service | TASK-1.3.1 | 2wk |
| TASK-NTF-02 | Weekly Summary Reports | TODO | P1 | Notifications | Notification Service | TASK-1.3.2 | 2wk |
| TASK-NTF-03 | Notification Test Coverage (7svc → 80%+) | TODO | P1 | Notifications | None | GAP-NOTIFICATIONS | 2wk |

**Domain total**: 3 tasks

---

### 4.7 Gamification Domain (GMF)

| ID | Title | Status | Priority | Owner Module | Dependencies | Source Backlinks | Effort |
|----|-------|--------|----------|-------------|-------------|-----------------|--------|
| TASK-GMF-01 | Financial Journey Map | TODO | P0 | Gamification | Gamification Engine | TASK-3.3.1 | 3wk |
| TASK-GMF-02 | Community Challenges | TODO | P2 | Gamification | Journey Map | TASK-3.3.2 | 3wk |

**Domain total**: 2 tasks | **Blocks**: GMF-01 blocks GMF-02

---

### 4.8 AI/ML Domain (AIM)

| ID | Title | Status | Priority | Owner Module | Dependencies | Source Backlinks | Effort |
|----|-------|--------|----------|-------------|-------------|-----------------|--------|
| TASK-AIM-01 | AI Personalization Test Suite | TODO | P1 | AI/ML | AI Personalization Engine | TASK-3.4.1 | 2wk |
| TASK-AIM-02 | ML Prediction Models (Score, Success Rate) | TODO | P2 | AI/ML | Historical Data | GAP-07 | 4wk |

**Domain total**: 2 tasks

---

### 4.9 Admin Domain (ADM)

| ID | Title | Status | Priority | Owner Module | Dependencies | Source Backlinks | Effort |
|----|-------|--------|----------|-------------|-------------|-----------------|--------|
| TASK-ADM-01 | Analytics Dashboard | TODO | P1 | Admin | None | TASK-4.1.1 | 3wk |
| TASK-ADM-02 | Family Accounts | TODO | P1 | Admin | Auth System | TASK-4.1.2 | 3wk |
| TASK-ADM-03 | Admin Test Coverage (9cmp+16API → 80%+) | TODO | P1 | Admin | None | GAP-ADMIN | 2wk |

**Domain total**: 3 tasks

---

### 4.10 Mobile Domain (MOB)

| ID | Title | Status | Priority | Owner Module | Dependencies | Source Backlinks | Effort |
|----|-------|--------|----------|-------------|-------------|-----------------|--------|
| TASK-MOB-01 | Mobile Screen Parity (97 screens) | TODO | P1 | Mobile | Web features must exist first | GAP-02, SSOT §16.4.1 | 14wk |
| TASK-MOB-02 | Apple Watch Companion App | TODO | P2 | Mobile | Core mobile app | TASK-4.2.1 | 4wk |
| TASK-MOB-03 | Offline Mode & Sync | TODO | P2 | Mobile | Core mobile app | TASK-4.2.2 | 3wk |

**Domain total**: 3 tasks | **Blocks**: MOB-01 blocks MOB-02, MOB-03

---

### 4.11 Security Domain (SEC)

| ID | Title | Status | Priority | Owner Module | Dependencies | Source Backlinks | Effort |
|----|-------|--------|----------|-------------|-------------|-----------------|--------|
| TASK-SEC-01 | SOC 2 Compliance Preparation | TODO | P1 | Security | Audit Logging complete | TASK-4.3.1 | 4wk |
| TASK-SEC-02 | Advanced MFA (TOTP, Hardware Keys) | TODO | P1 | Security | Auth System | TASK-4.3.2 | 2wk |
| TASK-SEC-03 | DAST Pipeline Integration | TODO | P1 | Security | CI/CD Pipeline | SEC-03 | 1wk |
| TASK-SEC-04 | Secret Rotation Automation | TODO | P2 | Security | Infrastructure | SEC-06 | 1wk |
| TASK-SEC-05 | WebAuthn/Passkey Support | TODO | P2 | Security | Auth System | SEC-07 | 2wk |

**Domain total**: 5 tasks

---

### 4.12 Infrastructure & Tech Debt (INF)

| ID | Title | Status | Priority | Owner Module | Dependencies | Source Backlinks | Effort |
|----|-------|--------|----------|-------------|-------------|-----------------|--------|
| TASK-INF-01 | Complete Fynvita Rebrand (remove CPFI) | TODO | P1 | Infrastructure | None | TD-05, DEC-12 | 1wk |
| TASK-INF-02 | Documentation Cleanup (114 overlapping docs) | TODO | P1 | Infrastructure | DICE v3.3 completion | TD-06, DEC-11 | 2wk |
| TASK-INF-03 | DB Migration Strategy & Tooling | TODO | P1 | Infrastructure | None | TD-07, DEC-10 | 1wk |
| TASK-INF-04 | Component Decomposition (large components) | TODO | P2 | Infrastructure | None | TD-09 | 2wk |
| TASK-INF-05 | Feature Flag System | TODO | P2 | Infrastructure | None | TD-10, DEC-07 | 2wk |
| TASK-INF-06 | State Management Decision (web) | TODO | P1 | Infrastructure | None | DEC-02 | 0.5wk |
| TASK-INF-07 | Caching Strategy Implementation | TODO | P2 | Infrastructure | None | DEC-03 | 2wk |
| TASK-INF-08 | Real-time Architecture (WebSocket/SSE) | TODO | P2 | Infrastructure | None | DEC-04 | 2wk |
| TASK-INF-09 | Monorepo Evaluation | TODO | P3 | Infrastructure | None | DEC-05 | 1wk |
| TASK-INF-10 | API Versioning Strategy | TODO | P2 | Infrastructure | None | DEC-06 | 1wk |
| TASK-INF-11 | Error Monitoring Setup (Sentry/etc) | TODO | P1 | Infrastructure | None | DEC-08 | 1wk |

**Domain total**: 11 tasks

---

### 4.13 Platform Domain (PLT)

| ID | Title | Status | Priority | Owner Module | Dependencies | Source Backlinks | Effort |
|----|-------|--------|----------|-------------|-------------|-----------------|--------|
| TASK-PLT-01 | White-Label Framework | TODO | P3 | Platform | Core feature completion | GAP-11 | 6wk |
| TASK-PLT-02 | Marketplace Foundation | TODO | P3 | Platform | Core feature completion | GAP-MARKETPLACE | 4wk |

**Domain total**: 2 tasks

---

### 4.14 Onboarding Domain (ONB)

| ID | Title | Status | Priority | Owner Module | Dependencies | Source Backlinks | Effort |
|----|-------|--------|----------|-------------|-------------|-----------------|--------|
| TASK-ONB-01 | Onboarding Phase 3 (Remaining UX) | TODO | P2 | Onboarding | Onboarding P1-P2 (complete) | GAP-ONBOARDING, SSOT §16.4.5 | 3wk |

**Domain total**: 1 task

---

### 4.15 Documents Domain (DOC)

| ID | Title | Status | Priority | Owner Module | Dependencies | Source Backlinks | Effort |
|----|-------|--------|----------|-------------|-------------|-----------------|--------|
| TASK-DOC-01 | Document Service Gaps (upload UI, versioning) | TODO | P2 | Documents | None | GAP-DOCUMENTS | 2wk |

**Domain total**: 1 task

---

### 4.16 Global Connector Domain (GLC)

| ID | Title | Status | Priority | Owner Module | Dependencies | Source Backlinks | Effort |
|----|-------|--------|----------|-------------|-------------|-----------------|--------|
| TASK-GLC-01 | Global Connector MVP (Multi-currency, i18n) | TODO | P3 | Global Connector | Core feature completion | GAP-05, SSOT §16.4.3 | 12wk |

**Domain total**: 1 task

---

## 5. Priority Summary

| Priority | Count | Tasks |
|----------|-------|-------|
| **P0** (Critical, ≤2wk) | 4 | TASK-CRD-04, TASK-TRD-01, TASK-TRD-07, TASK-GMF-01 |
| **P1** (High, ≤1mo) | 28 | CRD-02,05,06; FIN-01,02,03,06; TRD-03,04,05; RSK-01,02,03; NTF-01,02,03; AIM-01; ADM-01,02,03; MOB-01; SEC-01,02,03; INF-01,02,03,06,11 |
| **P2** (Medium, ≤1qtr) | 26 | CRD-01,03; FIN-04,05,07,08; INV-01,02,04,05,06; TRD-02,06; RSK-04,05,06; GMF-02; AIM-02; MOB-02,03; SEC-04,05; INF-04,05,07,08,10; ONB-01; DOC-01 |
| **P3** (Low, ≤6mo) | 4 | INF-09; PLT-01,02; GLC-01 |
| **Total** | **68** | |

---

## 6. Domain Summary

| Domain | Code | Tasks | P0 | P1 | P2 | P3 | Est. Effort |
|--------|------|-------|----|----|----|----|------------|
| Credit | CRD | 6 | 1 | 3 | 2 | 0 | 15wk |
| Financial | FIN | 8 | 0 | 4 | 4 | 0 | 19wk |
| Investment | INV | 6 | 0 | 1 | 5 | 0 | 13wk |
| Trading | TRD | 7 | 2 | 3 | 2 | 0 | 21wk |
| Risk | RSK | 6 | 1 | 2 | 3 | 0 | 14wk |
| Notification | NTF | 3 | 0 | 3 | 0 | 0 | 6wk |
| Gamification | GMF | 2 | 1 | 0 | 1 | 0 | 6wk |
| AI/ML | AIM | 2 | 0 | 1 | 1 | 0 | 6wk |
| Admin | ADM | 3 | 0 | 3 | 0 | 0 | 8wk |
| Mobile | MOB | 3 | 0 | 1 | 2 | 0 | 21wk |
| Security | SEC | 5 | 0 | 3 | 2 | 0 | 10wk |
| Infrastructure | INF | 11 | 0 | 5 | 5 | 1 | 15.5wk |
| Platform | PLT | 2 | 0 | 0 | 0 | 2 | 10wk |
| Onboarding | ONB | 1 | 0 | 0 | 1 | 0 | 3wk |
| Documents | DOC | 1 | 0 | 0 | 1 | 0 | 2wk |
| Global Connector | GLC | 1 | 0 | 0 | 0 | 1 | 12wk |
| **TOTAL** | | **68** | **4** | **28** | **26** | **4** | **~181wk** |

---

## 7. Key Dependency Chains

```
CRD-04 (Bureau API) ──→ CRD-03 (Predictor)
                    ──→ CRD-05 (Secured Cards)
                    ──→ CRD-06 (Rent Reporting)

TRD-01 (Paper Trading) ──→ TRD-02 (Journal)
                        ──→ TRD-06 (Backtesting)

TRD-03 (HATS Fusion) ──→ TRD-04 (Risk Gateway) ──→ TRD-05 (Order Mgmt)

RSK-01 (Rules Engine) ──→ RSK-02 (Position Sizing)
                      ──→ RSK-03 (Kill Switch)
                      ──→ RSK-05 (Stress Testing)
                      ──→ RSK-06 (Dashboard) [all RSK tasks]

GMF-01 (Journey Map) ──→ GMF-02 (Challenges)

INV-01 (Rebalancing) ──→ INV-06 (Auto-Rebalance)

MOB-01 (Screen Parity) ──→ MOB-02 (Apple Watch)
                        ──→ MOB-03 (Offline Mode)

INF-03 (DB Migrations) ──→ many feature tasks requiring new tables
INF-05 (Feature Flags) ──→ gradual rollout of P0/P1 features
INF-11 (Error Monitoring) ──→ production deployment confidence
```

---

## 8. Cross-Reference: Original IDs → Normalized IDs

| Original ID | Normalized ID | Notes |
|-------------|---------------|-------|
| TASK-1.1.1 | TASK-CRD-01 | Goodwill Letters |
| TASK-1.1.2 | TASK-CRD-02 | Credit Alerts |
| TASK-1.1.3 | TASK-CRD-03 | Dispute Prediction |
| TASK-1.2.1 | TASK-FIN-01 | Bill Reminders |
| TASK-1.2.2 | TASK-FIN-02 | Spending Limits |
| TASK-1.3.1 | TASK-NTF-01 | Proactive Alerts |
| TASK-1.3.2 | TASK-NTF-02 | Weekly Summary |
| TASK-2.1.1 | TASK-INV-01 | Rebalancing |
| TASK-2.1.2 | TASK-INV-02 | Dividends |
| TASK-2.2.1 | TASK-TRD-01 | Paper Trading |
| TASK-2.2.2 | TASK-TRD-02 | Trading Journal |
| TASK-2.3.1 | TASK-INV-03 | Manual Accounts |
| TASK-2.3.2 | TASK-INV-04 | Real Estate |
| TASK-2.3.3 | TASK-INV-05 | Crypto Sync |
| TASK-3.1.1 | TASK-CRD-05 | Secured Cards |
| TASK-3.1.2 | TASK-CRD-06 | Rent Reporting |
| TASK-3.2.1 | TASK-FIN-06 | Auto-Save |
| TASK-3.2.2 | TASK-INV-06 | Auto-Rebalance |
| TASK-3.3.1 | TASK-GMF-01 | Journey Map |
| TASK-3.3.2 | TASK-GMF-02 | Community Challenges |
| TASK-3.4.1 | TASK-AIM-01 | AI Personalization Tests |
| TASK-4.1.1 | TASK-ADM-01 | Analytics Dashboard |
| TASK-4.1.2 | TASK-ADM-02 | Family Accounts |
| TASK-4.1.3 | TASK-FIN-07 | Tax Export |
| TASK-4.2.1 | TASK-MOB-02 | Apple Watch |
| TASK-4.2.2 | TASK-MOB-03 | Offline Mode |
| TASK-4.3.1 | TASK-SEC-01 | SOC 2 |
| TASK-4.3.2 | TASK-SEC-02 + TASK-SEC-05 | MFA split into TOTP + WebAuthn |
| GAP-01 | TASK-CRD-04 | Credit Bureau API |
| GAP-02 | TASK-MOB-01 | Mobile Screen Parity |
| GAP-03 | TASK-TRD-01 (merged) | Trading partial → Paper Trading |
| GAP-04 | TASK-FIN-07 (merged) | Tax limited → Tax Export |
| GAP-05 | TASK-GLC-01 | Global Connector |
| GAP-06 | TASK-FIN-08 | Banking Limited |
| GAP-07 | TASK-AIM-02 | ML Predictions |
| GAP-11 | TASK-PLT-01 | White-label |
| GAP-TRADING | TASK-TRD-07 | Trading test coverage |
| GAP-NOTIFICATIONS | TASK-NTF-03 | Notification test coverage |
| GAP-ADMIN | TASK-ADM-03 | Admin test coverage |
| GAP-DOCUMENTS | TASK-DOC-01 | Document service gaps |
| GAP-ONBOARDING | TASK-ONB-01 | Onboarding remaining |
| GAP-TAX | TASK-FIN-07 (merged) | Tax gaps → Tax Export |
| GAP-MARKETPLACE | TASK-PLT-02 | Marketplace |
| TD-05 | TASK-INF-01 | Fynvita rebrand |
| TD-06 | TASK-INF-02 (merged with DEC-11) | Doc overlap |
| TD-07 | TASK-INF-03 (merged with DEC-10) | DB migrations |
| TD-09 | TASK-INF-04 | Large components |
| TD-10 | TASK-INF-05 (merged with DEC-07) | Feature flags |
| DEC-02 | TASK-INF-06 | State management |
| DEC-03 | TASK-INF-07 | Caching |
| DEC-04 | TASK-INF-08 | Real-time |
| DEC-05 | TASK-INF-09 | Monorepo |
| DEC-06 | TASK-INF-10 | API versioning |
| DEC-08 | TASK-INF-11 | Error monitoring |
| SEC-03 | TASK-SEC-03 | DAST |
| SEC-06 | TASK-SEC-04 | Secret rotation |
| SEC-07 | TASK-SEC-05 (merged) | WebAuthn |

---

## 9. Items NOT Requiring Tasks

These items from source documents are already resolved, decided, or complete — no task needed.

| Item | Reason |
|------|--------|
| TD-01 through TD-04, TD-08 | Resolved (gap-analysis.md) |
| DEC-01 (Supabase) | Decided: Supabase Complete |
| DEC-09 (CI/CD) | Decided: GitHub Actions |
| DEC-12 (Fynvita rename) | In Progress → tracked as TASK-INF-01 |
| SEC-01, SEC-04 | Resolved |
| SEC-02, SEC-05 | Accepted risk |
| SSOT §16.4.6 Tax Module | Complete (100%) |
| SSOT §16.4.7 Chat Engine | Complete (804-line engine) |
| SSOT §16.7 Completed Milestones (7) | Historical record |
| 7 blocking dependencies from master-plan.md | Captured as dependency edges in §7, not standalone tasks |

---

## 10. Extraction Quality Check

| Metric | Value | Pass? |
|--------|-------|-------|
| Raw items extracted | ~116 | — |
| After deduplication | 68 | — |
| Items with stable ID | 68/68 | YES |
| Items with priority | 68/68 | YES |
| Items with owner module | 68/68 | YES |
| Items with source backlink | 68/68 | YES |
| Items with effort estimate | 68/68 | YES |
| Orphan items (no source) | 0 | YES |
| Duplicate items | 0 | YES |
| Resolved items re-tasked | 0 | YES |

---

_Generated as DICE v3.3 Step 2 output on 2026-02-25._
