# Dependency Graph

> DICE v3.3 Step 3a Output
> Generated: 2026-02-25
> Source: `docs/ssot/task_extraction.md` (80 normalized tasks)

---

## 1. Module Dependency Map

Arrows show "depends on" relationships. A → B means A depends on B.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        INFRASTRUCTURE LAYER                         │
│                                                                     │
│  INF-01 Rebrand    INF-03 DB Migrations    INF-11 Error Monitoring │
│  INF-06 State Mgmt INF-05 Feature Flags    INF-02 Doc Cleanup      │
│  INF-07 Caching    INF-08 Real-time        INF-10 API Versioning   │
│  INF-04 Components INF-09 Monorepo                                  │
└──────────┬──────────────────┬──────────────────┬────────────────────┘
           │                  │                  │
           ▼                  ▼                  ▼
┌──────────────────┐ ┌────────────────┐ ┌────────────────────────────┐
│  SECURITY LAYER  │ │ NOTIFICATION   │ │     CORE SERVICES          │
│                  │ │    LAYER       │ │                            │
│  SEC-01 SOC 2    │ │ NTF-01 Alerts  │ │  CRD-04 Bureau API        │
│  SEC-02 MFA      │ │ NTF-02 Weekly  │ │  FIN-08 Banking           │
│  SEC-03 DAST     │ │ NTF-03 Tests   │ │  DOC-01 Documents         │
│  SEC-04 Secrets  │ │                │ │  ONB-01 Onboarding        │
│  SEC-05 WebAuthn │ └───────┬────────┘ └────────────┬───────────────┘
└──────────────────┘         │                       │
                             │                       │
           ┌─────────────────┼───────────────────────┼──────────┐
           │                 │                       │          │
           ▼                 ▼                       ▼          ▼
┌──────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌────────┐
│  CREDIT DOMAIN   │ │  FINANCIAL     │ │  INVESTMENT    │ │TRADING │
│                  │ │  DOMAIN        │ │  DOMAIN        │ │DOMAIN  │
│  CRD-01 Goodwill│ │ FIN-01 Bills   │ │ INV-01 Rebal   │ │TRD-01  │
│  CRD-02 Alerts  │ │ FIN-02 Limits  │ │ INV-02 Divs    │ │TRD-02  │
│  CRD-03 Predict │ │ FIN-03 Income  │ │ INV-03 Manual  │ │TRD-03  │
│  CRD-05 Secured │ │ FIN-04 SubAnal │ │ INV-04 RE      │ │TRD-04  │
│  CRD-06 Rent    │ │ FIN-05 BudgAI  │ │ INV-05 Crypto  │ │TRD-05  │
│                  │ │ FIN-06 AutoSav │ │ INV-06 AutoReb │ │TRD-06  │
│                  │ │ FIN-07 TaxExp  │ │                │ │TRD-07  │
└──────────────────┘ └────────────────┘ └────────────────┘ └───┬────┘
                                                               │
                                                               ▼
┌──────────────────┐ ┌────────────────┐ ┌────────────────────────────┐
│  RISK DOMAIN     │ │  AI/ML DOMAIN  │ │   GAMIFICATION DOMAIN      │
│                  │ │                │ │                            │
│  RSK-01 Rules    │ │ AIM-01 Tests   │ │  GMF-01 Journey Map        │
│  RSK-02 PosSize  │ │ AIM-02 ML Pred │ │  GMF-02 Challenges         │
│  RSK-03 KillSwi  │ │                │ │                            │
│  RSK-04 CorrMon  │ └────────────────┘ └────────────────────────────┘
│  RSK-05 Stress   │
│  RSK-06 Dashbrd  │ ┌────────────────┐ ┌────────────────────────────┐
└──────────────────┘ │  ADMIN DOMAIN  │ │   MOBILE DOMAIN            │
                     │                │ │                            │
                     │ ADM-01 Analytic│ │  MOB-01 Screen Parity      │
                     │ ADM-02 Family  │ │  MOB-02 Apple Watch        │
                     │ ADM-03 Tests   │ │  MOB-03 Offline Mode       │
                     └────────────────┘ └────────────────────────────┘

                     ┌────────────────────────────────────────────────┐
                     │           PLATFORM LAYER (P3)                  │
                     │                                                │
                     │  PLT-01 White-Label    GLC-01 Global Connector │
                     │  PLT-02 Marketplace                            │
                     └────────────────────────────────────────────────┘
```

---

## 2. Task-Level Dependencies (Directed Edges)

Format: `DEPENDENT → DEPENDENCY` (dependent needs dependency to be complete first)

### 2.1 Credit Domain

| Dependent | Depends On | Type |
|-----------|-----------|------|
| TASK-CRD-02 | Notification Service (existing) | Service |
| TASK-CRD-03 | TASK-CRD-04 (Bureau API) | Data |
| TASK-CRD-05 | TASK-CRD-04 (Bureau API) | Data |
| TASK-CRD-06 | TASK-CRD-04 (Bureau API) | Data |

### 2.2 Financial Domain

| Dependent | Depends On | Type |
|-----------|-----------|------|
| TASK-FIN-01 | Notification Service (existing) | Service |
| TASK-FIN-02 | Notification Service (existing) | Service |
| TASK-FIN-03 | Plaid Integration (existing) | External |
| TASK-FIN-04 | Transaction Data (existing) | Data |
| TASK-FIN-05 | Budget Engine (existing) | Service |
| TASK-FIN-06 | Bank Account Link (existing) | Service |

### 2.3 Investment Domain

| Dependent | Depends On | Type |
|-----------|-----------|------|
| TASK-INV-01 | Portfolio Service (existing) | Service |
| TASK-INV-02 | Portfolio Service (existing) | Service |
| TASK-INV-06 | TASK-INV-01 (Rebalancing Engine) | Feature |

### 2.4 Trading Domain

| Dependent | Depends On | Type |
|-----------|-----------|------|
| TASK-TRD-01 | Alpaca Broker (existing) | External |
| TASK-TRD-02 | TASK-TRD-01 (Paper Trading) | Feature |
| TASK-TRD-03 | Trading Engine (existing) | Service |
| TASK-TRD-04 | TASK-TRD-03 (HATS Signal Fusion) | Feature |
| TASK-TRD-05 | TASK-TRD-04 (Risk Gateway) | Feature |
| TASK-TRD-06 | TASK-TRD-01 (Paper Trading) | Feature |

### 2.5 Risk Domain

| Dependent | Depends On | Type |
|-----------|-----------|------|
| TASK-RSK-01 | Trading Engine (existing) | Service |
| TASK-RSK-02 | TASK-RSK-01 (Rules Engine) | Feature |
| TASK-RSK-03 | TASK-RSK-01 (Rules Engine) | Feature |
| TASK-RSK-04 | Portfolio Service (existing) | Service |
| TASK-RSK-05 | TASK-RSK-01 (Rules Engine) | Feature |
| TASK-RSK-06 | TASK-RSK-01, RSK-02, RSK-03, RSK-04, RSK-05 | All RSK |

### 2.6 Gamification Domain

| Dependent | Depends On | Type |
|-----------|-----------|------|
| TASK-GMF-01 | Gamification Engine (existing) | Service |
| TASK-GMF-02 | TASK-GMF-01 (Journey Map) | Feature |

### 2.7 Mobile Domain

| Dependent | Depends On | Type |
|-----------|-----------|------|
| TASK-MOB-01 | Web features (existing + in-progress) | Feature |
| TASK-MOB-02 | TASK-MOB-01 (core mobile) | Feature |
| TASK-MOB-03 | TASK-MOB-01 (core mobile) | Feature |

### 2.8 Admin Domain

| Dependent | Depends On | Type |
|-----------|-----------|------|
| TASK-ADM-02 | Auth System (existing) | Service |

### 2.9 Security Domain

| Dependent | Depends On | Type |
|-----------|-----------|------|
| TASK-SEC-01 | Audit Logging (existing) | Service |
| TASK-SEC-02 | Auth System (existing) | Service |
| TASK-SEC-03 | CI/CD Pipeline (existing) | Service |
| TASK-SEC-05 | Auth System (existing) | Service |

### 2.10 Infrastructure Domain

| Dependent | Depends On | Type |
|-----------|-----------|------|
| TASK-INF-02 | DICE v3.3 completion | Process |

### 2.11 Platform Domain

| Dependent | Depends On | Type |
|-----------|-----------|------|
| TASK-PLT-01 | Core feature completion | Milestone |
| TASK-PLT-02 | Core feature completion | Milestone |
| TASK-GLC-01 | Core feature completion | Milestone |

---

## 3. Critical Path Analysis

### 3.1 Longest Dependency Chain (Trading→Risk Pipeline)

```
TRD-03 (HATS Fusion, 4wk)
  → TRD-04 (Risk Gateway, 3wk)
    → TRD-05 (Order Mgmt, 3wk)
      → [Production Trading]
Total: 10 weeks sequential
```

### 3.2 Second Longest Chain (Credit Bureau Pipeline)

```
CRD-04 (Bureau API, 4wk)
  → CRD-03 (Predictor, 3wk)
    → [ML-enhanced disputes]
Total: 7 weeks sequential
```

### 3.3 Risk Domain Chain

```
RSK-01 (Rules Engine, 3wk)
  → RSK-02 (Position Sizing, 2wk)
  → RSK-03 (Kill Switch, 2wk)
  → RSK-05 (Stress Testing, 3wk)
  → RSK-06 (Dashboard, 2wk) [waits for ALL above]
Total: 5 weeks sequential (RSK-01 → RSK-06), 3+2=5wk for parallel chain
```

### 3.4 Mobile Chain

```
MOB-01 (97 screens, 14wk)
  → MOB-02 (Apple Watch, 4wk)
  → MOB-03 (Offline, 3wk)
Total: 14wk + 4wk = 18 weeks if sequential
```

---

## 4. Parallelization Opportunities

Tasks with NO inter-task dependencies (can start immediately):

| Task | Domain | Priority | Effort |
|------|--------|----------|--------|
| TASK-CRD-01 | Credit | P2 | 2wk |
| TASK-CRD-04 | Credit | P0 | 4wk |
| TASK-FIN-01 | Financial | P1 | 2wk |
| TASK-FIN-02 | Financial | P1 | 2wk |
| TASK-FIN-03 | Financial | P1 | 2wk |
| TASK-FIN-04 | Financial | P2 | 2wk |
| TASK-FIN-06 | Financial | P1 | 2wk |
| TASK-FIN-07 | Financial | P2 | 2wk |
| TASK-FIN-08 | Financial | P2 | 4wk |
| TASK-INV-03 | Investment | P1 | 1wk |
| TASK-INV-04 | Investment | P2 | 2wk |
| TASK-INV-05 | Investment | P2 | 3wk |
| TASK-TRD-01 | Trading | P0 | 3wk |
| TASK-TRD-03 | Trading | P1 | 4wk |
| TASK-TRD-07 | Trading | P0 | 3wk |
| TASK-RSK-01 | Risk | P1 | 3wk |
| TASK-NTF-01 | Notification | P1 | 2wk |
| TASK-NTF-02 | Notification | P1 | 2wk |
| TASK-NTF-03 | Notification | P1 | 2wk |
| TASK-GMF-01 | Gamification | P0 | 3wk |
| TASK-AIM-01 | AI/ML | P1 | 2wk |
| TASK-ADM-01 | Admin | P1 | 3wk |
| TASK-ADM-03 | Admin | P1 | 2wk |
| TASK-SEC-01 | Security | P1 | 4wk |
| TASK-SEC-02 | Security | P1 | 2wk |
| TASK-SEC-03 | Security | P1 | 1wk |
| TASK-INF-01 | Infrastructure | P1 | 1wk |
| TASK-INF-03 | Infrastructure | P1 | 1wk |
| TASK-INF-06 | Infrastructure | P1 | 0.5wk |
| TASK-INF-11 | Infrastructure | P1 | 1wk |

**30 tasks** can start with zero new-task dependencies (only depend on existing services).

---

## 5. Dependency Edge Count

| Task | Blocks (outgoing) | Blocked By (incoming) |
|------|-------------------|----------------------|
| TASK-CRD-04 | 3 (CRD-03, CRD-05, CRD-06) | 0 |
| TASK-TRD-01 | 2 (TRD-02, TRD-06) | 0 |
| TASK-TRD-03 | 1 (TRD-04) | 0 |
| TASK-TRD-04 | 1 (TRD-05) | 1 (TRD-03) |
| TASK-RSK-01 | 4 (RSK-02, RSK-03, RSK-05, RSK-06) | 0 |
| TASK-INV-01 | 1 (INV-06) | 0 |
| TASK-GMF-01 | 1 (GMF-02) | 0 |
| TASK-MOB-01 | 2 (MOB-02, MOB-03) | 0 |
| TASK-RSK-06 | 0 | 5 (all other RSK) |
| TASK-TRD-05 | 0 | 2 (TRD-03→TRD-04) |

**Highest fan-out**: RSK-01 (4 dependents), CRD-04 (3 dependents)
**Highest fan-in**: RSK-06 (5 dependencies), TRD-05 (2 chained)

---

_Generated as DICE v3.3 Step 3a output on 2026-02-25._
