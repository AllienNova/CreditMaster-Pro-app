# Build Order Blueprint

> DICE v3.3 Step 3b Output
> Generated: 2026-02-25
> Source: `docs/ssot/task_extraction.md`, `docs/ssot/dependency_graph.md`

---

## 1. Wave Plan Overview

6 waves, organized by priority and dependency order. Each wave has entry criteria (what must be true before starting), tasks, exit criteria (what must be true before advancing), and a merge gate.

```
WAVE 0 (Foundation)     → WAVE 1 (Core Features)  → WAVE 2 (Feature Depth)
  INF + SEC + Tests        CRD + FIN + TRD + RSK     Advanced features
  ~3 weeks                 ~6 weeks                   ~6 weeks
                                                         │
WAVE 3 (AI + Gamification) → WAVE 4 (Mobile + Admin)  → WAVE 5 (Platform)
  AI/ML + GMF + ONB          MOB + ADM + Integrations    PLT + GLC
  ~4 weeks                   ~14 weeks                   ~12 weeks
```

**Total estimated duration**: ~28 weeks with 2-3 parallel workstreams.
**With 4-5 parallel workstreams**: ~16-18 weeks.

---

## 2. WAVE 0 — Foundation & Infrastructure

**Duration**: 3 weeks
**Parallel workstreams**: 3

### Entry Criteria
- [x] DICE v3.3 documentation consolidation complete (this document)
- [x] Existing codebase builds successfully
- [x] 3,287 tests passing
- [ ] Development environment verified (Node 20.x, Supabase running)

### Tasks

| Stream | Tasks | Effort | Parallel? |
|--------|-------|--------|-----------|
| **Infra-A** | TASK-INF-01 (Rebrand), TASK-INF-06 (State Mgmt Decision), TASK-INF-03 (DB Migrations) | 2.5wk | Yes |
| **Infra-B** | TASK-INF-11 (Error Monitoring), TASK-SEC-03 (DAST) | 2wk | Yes |
| **Test Debt** | TASK-TRD-07 (Trading Tests), TASK-NTF-03 (Notification Tests), TASK-ADM-03 (Admin Tests) | 3wk | Yes (each ~1wk) |

### Exit Criteria (GATE-0)
- [ ] Brand is fully "Fynvita" — zero CPFI references in code
- [ ] DB migration strategy documented and tooling configured
- [ ] Error monitoring (Sentry or equivalent) capturing errors in dev
- [ ] DAST integrated into CI pipeline
- [ ] State management decision documented
- [ ] Trading test coverage ≥ 80% (was 11%)
- [ ] Notification test coverage ≥ 80% (was 14%)
- [ ] Admin test coverage ≥ 80% (was 12%)
- [ ] All existing 3,287+ tests still passing
- [ ] Build succeeds, zero lint errors, zero type errors

---

## 3. WAVE 1 — Core Feature Build

**Duration**: 6 weeks
**Parallel workstreams**: 4
**Depends on**: GATE-0

### Entry Criteria
- [ ] GATE-0 passed
- [ ] Error monitoring active
- [ ] Test infrastructure verified

### Tasks

| Stream | Tasks | Effort | Notes |
|--------|-------|--------|-------|
| **Credit** | TASK-CRD-04 (Bureau API), TASK-CRD-02 (Alerts) | 4wk + 2wk | CRD-04 is P0, start immediately |
| **Financial** | TASK-FIN-01 (Bill Reminders), TASK-FIN-02 (Spending Limits), TASK-FIN-03 (Income), TASK-FIN-06 (Auto-Save) | 2+2+2+2wk | P1 cluster, parallelize in pairs |
| **Trading** | TASK-TRD-01 (Paper Trading), then TASK-TRD-03 (HATS) | 3wk + 4wk start | TRD-01 is P0; TRD-03 can overlap |
| **Risk** | TASK-RSK-01 (Rules Engine), TASK-RSK-03 (Kill Switch) | 3wk + 2wk | RSK-03 is P0, depends on RSK-01 |

### Exit Criteria (GATE-1)
- [ ] Credit Bureau API integrated with at least 1 bureau (Experian or Equifax)
- [ ] Credit Alerts generating and delivering via notification service
- [ ] Bill Payment Reminders operational
- [ ] Spending Limit Alerts operational
- [ ] Income verification system working with Plaid
- [ ] Auto-Save rules engine operational
- [ ] Paper Trading engine functional with Alpaca sandbox
- [ ] HATS Signal Fusion initial implementation (may be in-progress)
- [ ] Risk Rules Engine operational
- [ ] Kill Switch functional and tested
- [ ] All new features have ≥ 80% test coverage
- [ ] Overall test count increased
- [ ] Build succeeds, zero lint/type errors

---

## 4. WAVE 2 — Feature Depth & Extensions

**Duration**: 6 weeks
**Parallel workstreams**: 4
**Depends on**: GATE-1

### Entry Criteria
- [ ] GATE-1 passed
- [ ] Bureau API working (for CRD-03, CRD-05, CRD-06)
- [ ] Paper Trading working (for TRD-02, TRD-06)
- [ ] Risk Rules Engine working (for RSK-02, RSK-05)

### Tasks

| Stream | Tasks | Effort | Notes |
|--------|-------|--------|-------|
| **Credit-Ext** | TASK-CRD-03 (Predictor), TASK-CRD-05 (Secured Cards), TASK-CRD-06 (Rent) | 3+2+2wk | Now unblocked by CRD-04 |
| **Trading-Ext** | TASK-TRD-04 (Risk Gateway), TASK-TRD-05 (Order Mgmt), TASK-TRD-02 (Journal) | 3+3+2wk | Chain: TRD-03→04→05 |
| **Risk-Ext** | TASK-RSK-02 (Position Sizing), TASK-RSK-05 (Stress Testing), TASK-RSK-04 (Correlation) | 2+3+2wk | Unblocked by RSK-01 |
| **Financial-Ext** | TASK-FIN-04 (Sub Analyzer), TASK-FIN-05 (Budget AI), TASK-FIN-07 (Tax Export) | 2+3+2wk | P2 features |
| **Investment** | TASK-INV-03 (Manual), TASK-INV-01 (Rebalance), TASK-INV-02 (Dividends) | 1+3+2wk | INV-03 is quick start |

### Exit Criteria (GATE-2)
- [ ] Dispute Success Predictor live with ML scoring
- [ ] Secured Card and Rent Reporting recommendations operational
- [ ] Trading Risk Gateway and Order Management pipeline complete
- [ ] Trading Journal capturing all paper trades
- [ ] Position Sizing calculator operational
- [ ] Stress Testing framework running historical scenarios
- [ ] Subscription Analyzer detecting recurring charges
- [ ] Smart Budget AI generating recommendations
- [ ] Tax Export producing downloadable reports
- [ ] Portfolio Rebalancing engine functional
- [ ] Manual Account entry working
- [ ] Dividend tracking active
- [ ] All new features have ≥ 80% test coverage
- [ ] Build succeeds

---

## 5. WAVE 3 — AI, Gamification & Polish

**Duration**: 4 weeks
**Parallel workstreams**: 3
**Depends on**: GATE-2

### Entry Criteria
- [ ] GATE-2 passed
- [ ] Core feature set stable
- [ ] AI Personalization Engine exists (SSOT §16.4.4)

### Tasks

| Stream | Tasks | Effort | Notes |
|--------|-------|--------|-------|
| **AI/ML** | TASK-AIM-01 (Personalization Tests), TASK-AIM-02 (ML Predictions) | 2+4wk | AIM-02 extends into Wave 4 |
| **Gamification** | TASK-GMF-01 (Journey Map), TASK-GMF-02 (Challenges) | 3+3wk | GMF-01 is P0 |
| **Completion** | TASK-TRD-06 (Backtesting), TASK-INV-06 (Auto-Rebalance), TASK-INV-04 (Real Estate), TASK-INV-05 (Crypto) | 3+2+2+3wk | Remaining P2 investment tasks |
| **Infra-Polish** | TASK-INF-04 (Components), TASK-INF-05 (Feature Flags), TASK-INF-07 (Caching), TASK-INF-08 (Real-time) | 2+2+2+2wk | P2 infrastructure |
| **Security** | TASK-SEC-04 (Secret Rotation), TASK-SEC-05 (WebAuthn) | 1+2wk | P2 security |
| **Onboarding** | TASK-ONB-01 (Phase 3) | 3wk | Remaining onboarding |

### Exit Criteria (GATE-3)
- [ ] AI Personalization test suite passing
- [ ] ML Prediction models trained and serving (at least score prediction)
- [ ] Financial Journey Map live with gamification XP
- [ ] Community Challenges framework operational
- [ ] Backtesting framework running strategies
- [ ] Auto-Rebalance scheduler working
- [ ] Real Estate and Crypto tracking operational
- [ ] Feature flag system operational
- [ ] Caching layer reducing API latency
- [ ] WebAuthn/Passkey support working
- [ ] Onboarding Phase 3 complete
- [ ] Risk Dashboard live (TASK-RSK-06 unblocked by now)
- [ ] All features ≥ 80% coverage
- [ ] Build succeeds

---

## 6. WAVE 4 — Mobile, Admin & Integration

**Duration**: 14 weeks (longest wave due to MOB-01)
**Parallel workstreams**: 3
**Depends on**: GATE-3 (partially — MOB-01 can start earlier as web features complete)

### Entry Criteria
- [ ] GATE-3 passed (or partially — web features sufficient for mobile parity)
- [ ] All core web features stable

### Tasks

| Stream | Tasks | Effort | Notes |
|--------|-------|--------|-------|
| **Mobile** | TASK-MOB-01 (97 Screens), TASK-MOB-03 (Offline Mode) | 14wk + 3wk | Largest single task; can be phased |
| **Admin** | TASK-ADM-01 (Analytics), TASK-ADM-02 (Family Accounts) | 3+3wk | |
| **Banking** | TASK-FIN-08 (Open Banking) | 4wk | External integration |
| **Security** | TASK-SEC-01 (SOC 2), TASK-SEC-02 (Advanced MFA) | 4+2wk | SOC 2 is documentation-heavy |
| **Credit Builder** | TASK-CRD-01 (Goodwill Letters) | 2wk | P2, nice-to-have by now |
| **Infra** | TASK-INF-02 (Doc Cleanup), TASK-INF-10 (API Versioning) | 2+1wk | Post-DICE cleanup |
| **Notifications** | TASK-NTF-01 (Proactive Alerts), TASK-NTF-02 (Weekly Summary) | 2+2wk | Enhance existing |

### Exit Criteria (GATE-4)
- [ ] Mobile app has ≥ 80% screen parity with web
- [ ] Offline mode working on mobile
- [ ] Analytics dashboard live for admins
- [ ] Family Accounts operational
- [ ] Open Banking integration functional
- [ ] SOC 2 documentation prepared
- [ ] Advanced MFA (TOTP + hardware keys) working
- [ ] Documentation overlap resolved
- [ ] API versioning strategy implemented
- [ ] All features ≥ 80% coverage
- [ ] Build succeeds

---

## 7. WAVE 5 — Platform & Scale (P3)

**Duration**: 12 weeks
**Parallel workstreams**: 2
**Depends on**: GATE-4

### Entry Criteria
- [ ] GATE-4 passed
- [ ] Core platform stable and feature-complete
- [ ] User base sufficient to justify platform features

### Tasks

| Stream | Tasks | Effort | Notes |
|--------|-------|--------|-------|
| **Platform** | TASK-PLT-01 (White-Label), TASK-PLT-02 (Marketplace) | 6+4wk | Business expansion |
| **Global** | TASK-GLC-01 (Global Connector) | 12wk | Multi-currency, i18n, multi-bureau |
| **Mobile-Ext** | TASK-MOB-02 (Apple Watch) | 4wk | After core mobile stable |
| **Infra** | TASK-INF-09 (Monorepo evaluation) | 1wk | Decision point |

### Exit Criteria (GATE-5)
- [ ] White-label framework allows customer branding
- [ ] Marketplace foundation supports third-party integrations
- [ ] Global Connector supports ≥ 2 additional countries/currencies
- [ ] Apple Watch companion app functional
- [ ] All features ≥ 80% coverage
- [ ] Production deployment ready

## 7.5. WAVE 6 — External Integrations & Monetization (P1-P2)

**Duration**: 8-10 weeks
**Parallel workstreams**: 3
**Depends on**: GATE-5

### Entry Criteria
- [x] GATE-5 passed (all 112 Wave 0-5 tasks DONE)
- [x] Core platform stable and feature-complete
- [ ] DriveWealth partnership agreement signed
- [ ] MoneyLion Engine partner account provisioned
- [ ] Plaid production credentials obtained

### Tasks

| Stream | Tasks | Effort | Notes |
|--------|-------|--------|-------|
| **Plaid Integration** | TASK-PLD-01 (SDK Migration), PLD-02 (Webhooks), PLD-03 (Mobile Link), PLD-04 (Investments/Liabilities), PLD-05 (Income/Enrich) | 1+1+1+2+1 = 6wk | PLD-01 is prerequisite for PLD-02/03/04/05 |
| **Broker Integration** | TASK-TRD-15 (DriveWealth), TRD-16 (Multi-Broker Router), TRD-17 (Fractional Trading), TRD-18 (KYC Flow) | 2+2+2+1 = 7wk | TRD-15 is prerequisite for TRD-16/17/18 |
| **Affiliate Platform** | TASK-AFF-01 (MoneyLion Engine), AFF-02 (Credit Cards), AFF-03 (Insurance/Loans), AFF-04 (Compliance) | 2+1+1+1 = 5wk | AFF-01 prerequisite for AFF-02/03; AFF-04 parallel |

### Exit Criteria (GATE-6)
- [ ] Plaid SDK migration complete, all 8 products configured
- [ ] Plaid webhooks processing transaction syncs in sandbox
- [ ] DriveWealth fractional orders executing in sandbox
- [ ] Multi-broker portfolio aggregation showing unified positions
- [ ] Affiliate recommendations shown with FTC disclosures
- [ ] Credit card matching returning personalized results
- [ ] All 13 Wave 6 tasks DONE
- [ ] All features >= 80% coverage
- [ ] Build succeeds, 0 type errors

---

## 8. Wave Summary

| Wave | Focus | Tasks | Duration | P0 | P1 | P2 | P3 |
|------|-------|-------|----------|----|----|----|----|
| 0 | Foundation | 9 | 3wk | 1 | 7 | 1 | 0 |
| 1 | Core Features | 10 | 6wk | 3 | 7 | 0 | 0 |
| 2 | Feature Depth | 13 | 6wk | 0 | 2 | 11 | 0 |
| 3 | AI + Gamification | 13 | 4wk | 1 | 2 | 10 | 0 |
| 4 | Mobile + Admin | 12 | 14wk | 0 | 9 | 3 | 0 |
| 5 | Platform | 4 | 12wk | 0 | 0 | 1 | 3 |
| 6 | External Integrations | 13 | 8-10wk | 0 | 6 | 4 | 0 |
| **Total** | | **74** | **~36-38wk seq** | **5** | **33** | **30** | **3** |

> Note: 7 tasks from Wave 2-3 overlap (counted once). Total unique = 81 (original) + 32 (added during Waves 0-5) + 13 (Wave 6) = 125.
> With 4 parallel workstreams, effective duration ≈ **22-24 weeks**.

---

## 9. Merge Gates

Each gate requires explicit sign-off before proceeding:

| Gate | Required Checks | Blocker If Fails |
|------|----------------|-----------------|
| GATE-0 | Build ✓, Lint ✓, Types ✓, Tests ≥ 3,287, Coverage ≥ 80% for new code, Brand complete | Cannot start core features |
| GATE-1 | All GATE-0 + Bureau API live + Paper Trading live + Risk Rules live | Cannot extend features |
| GATE-2 | All GATE-1 + Trading pipeline complete + Investment basics live | Cannot start AI/Gamification |
| GATE-3 | All GATE-2 + AI tests passing + Journey Map live + Risk Dashboard live | Cannot start mobile parity |
| GATE-4 | All GATE-3 + Mobile ≥ 80% parity + SOC 2 docs + Admin live | Cannot start platform features |
| GATE-5 | All GATE-4 + White-label working + Global Connector MVP | Production release candidate |
| GATE-6 | All GATE-5 + Plaid SDK live + DriveWealth sandbox verified + Affiliate flow functional | Revenue-ready platform |

---

## 10. Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| Credit Bureau API access delays | Blocks CRD-03,05,06 | Start CRD-04 immediately; use sandbox/mock data for development |
| Mobile 97-screen parity is 14wk | Longest single task | Phase into 5 sub-phases per SSOT §16.4.1; ship incrementally |
| HATS trading chain is 10wk sequential | Longest dependency chain | Start TRD-03 in Wave 1 overlap; pipeline tasks in parallel where possible |
| SOC 2 requires organizational changes | May block enterprise customers | Start documentation early in Wave 4 |
| Global Connector is 12wk | Delays internationalization | P3 priority; defer to Wave 5; consider MVP scope reduction |
| DriveWealth BD partnership delays | Blocks fractional trading launch | Start with sandbox; implement and test against mock API; go live when partnership signed |
| MoneyLion Engine approval delays | Blocks affiliate revenue | Implement matching engine with mock catalog; swap to live API when approved |
| Plaid production access requires bank agreements | Blocks live bank connections | Develop against sandbox; all tests use sandbox mode; production cutover when approved |

---

_Generated as DICE v3.3 Step 3b output on 2026-02-25._
_Updated 2026-03-01: VERSION-009 — Added Wave 6 (External Integrations & Monetization, 13 tasks). GATE-6 added. 3 new risk register entries._
