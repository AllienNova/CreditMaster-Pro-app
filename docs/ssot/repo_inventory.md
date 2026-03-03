# Repository Inventory

> DICE v3.3 Step 1 Output
> Generated: 2026-02-24
> Scope: ALL documentation artifacts, key code areas, and entry points

---

## 1. Canonical SSOT Documents (docs/ssot/)

| File | Purpose | Status |
|------|---------|--------|
| `SSOT.md` | Canonical Single Source of Truth | To be created |
| `MASTER-IMPLEMENTATION-PLAN.md` | Executable build spec with Task Cards | To be created |
| `traceability_matrix.md` | REQ -> build targets proof | To be created |
| `system_blueprint.md` | UI/UX, agents, prompts, security, API/data, DevOps | To be created |
| `build_order_blueprint.md` | Wave plan with entry/exit criteria | To be created |
| `dependency_graph.md` | Module and task dependency map | To be created |
| `repo_inventory.md` | This file | Active |
| `health_metrics.md` | Quality scorecard | To be created |
| `version_history.md` | Safety snapshots and change log | Active |

---

## 2. Core Source Documents (docs/)

These 5 documents are the authoritative inputs for DICE v3.3 consolidation.

| # | Document | Path | Lines | Last Modified | Status | DICE Role |
|---|----------|------|-------|---------------|--------|-----------|
| 1 | SSOT | `docs/SSOT.md` | 1,141 | 2026-02-20 | Active | Primary truth source |
| 2 | Master Plan | `docs/master-plan.md` | 381 | 2026-02-23 | Active | Operational plan (28 tasks) |
| 3 | Gap Analysis | `docs/gap-analysis.md` | 191 | 2026-02-23 | Active | Gap/debt tracker |
| 4 | Architecture | `docs/architecture.md` | 631 | 2026-02-20 | Active | System architecture |
| 5 | UI Design | `docs/ui-design.md` | 984 | 2026-02-20 | Active | Screen/component registry |

**Total core source lines**: 3,328

---

## 3. Supporting Reference Documents (docs/)

| # | Document | Path | Category | Status |
|---|----------|------|----------|--------|
| 6 | Traceability Matrix | `docs/Traceability_Matrix.md` | Cross-reference | Active |
| 7 | Codebase Index | `docs/Codebase_Index.md` | Index | Active |
| 8 | Plan Index | `docs/Plan_Index.md` | Index | Active |
| 9 | SSOT Implementation Plan | `docs/SSOT_Implementation_Plan.md` | Task tracker | Active |
| 10 | Gaps Conflicts Decisions | `docs/Gaps_Conflicts_Decisions.md` | Conflict log | Active |

---

## 4. Archivable Plan Documents (docs/)

Per SSOT.md section 16.10, these 26 documents were already consolidated into SSOT.md section 16. They are candidates for archival.

| # | Document | Path | Lines | Consolidated Into |
|---|----------|------|-------|-------------------|
| 11 | Enhancement Roadmap | `docs/ENHANCEMENT_ROADMAP.md` | 900 | SSOT 16.2 Roadmap, 16.5 Priority |
| 12 | Upgrade Plan Overview | `docs/UPGRADE_PLAN_OVERVIEW.md` | 243 | SSOT 16.3 A+ Strategy |
| 13 | Master Task List | `docs/MASTER_TASK_LIST.md` | 1,115 | SSOT 16.1, 16.5 Priority |
| 14 | Mobile App Parity Plan | `docs/MOBILE_APP_PARITY_IMPLEMENTATION_PLAN.md` | 1,229 | SSOT 16.4.1 Mobile App |
| 15 | Intelligent Financial Suite | `docs/INTELLIGENT_FINANCIAL_SUITE_IMPLEMENTATION_PLAN.md` | 763 | SSOT 16.4.2 Financial Suite |
| 16 | Intelligent Banking Plan | `docs/INTELLIGENT_BANKING_IMPLEMENTATION_PLAN.md` | 448 | SSOT 16.4.2 Banking |
| 17 | Global Connector Strategy | `docs/GLOBAL_CONNECTOR_STRATEGY_PLAN.md` | 992 | SSOT 16.4.3 Global Connector |
| 18 | Onboarding UX Enhancement | `docs/ONBOARDING_UX_ENHANCEMENT_PLAN.md` | 1,348 | SSOT 16.4.5 Onboarding |
| 19 | AI Personalization Design | `docs/AI_PERSONALIZATION_DESIGN.md` | 842 | SSOT 16.4.4 AI Personalization |
| 20 | Upgrade Trading System | `docs/UPGRADE_TRADING_SYSTEM.md` | ~400 | SSOT 16.3.3 Trading |
| 21 | Upgrade Risk Management | `docs/UPGRADE_RISK_MANAGEMENT.md` | ~400 | SSOT 16.3.4 Risk |
| 22 | Upgrade Credit Repair | `docs/UPGRADE_CREDIT_REPAIR.md` | ~300 | SSOT 16.3.1 Credit |
| 23 | Upgrade Financial | `docs/UPGRADE_FINANCIAL.md` | ~300 | SSOT 16.3.2 Financial |
| 24 | Phase 6 Architecture | `docs/PHASE_6_ARCHITECTURE_DIAGRAM.md` | ~500 | SSOT 16.4.7 Chat Engine |
| 25 | Onboarding Phase 1 | `docs/ONBOARDING_PHASE1_IMPLEMENTATION.md` | 297 | SSOT 16.7 Completed |
| 26 | Onboarding Phase 2 | `docs/ONBOARDING_PHASE2_IMPLEMENTATION.md` | 229 | SSOT 16.7 Completed |
| 27 | Phase 6.2 Implementation | `docs/PHASE_6.2_IMPLEMENTATION_SUMMARY.md` | ~400 | SSOT 16.7 Completed |
| 28 | Phase 6 Implementation Guide | `docs/phase-6-implementation-guide.md` | ~300 | SSOT 16.4.7 Chat phases |
| 29 | Tax Optimization Module | `docs/TAX_OPTIMIZATION_MODULE.md` | — | SSOT 16.4.6 Tax (Complete) |
| 30 | Trading System Audit | `docs/TRADING_SYSTEM_AUDIT.md` | — | SSOT 16.9 Trading Readiness |
| 31 | Financial Chat API | `docs/FINANCIAL_CHAT_API.md` | — | SSOT 16.4.7 Chat API |
| 32 | Feature Gap Matrix | `docs/FEATURE_GAP_MATRIX.md` | — | SSOT 16.6 Competitive |
| 33 | Zero Trust Audit Report | `docs/ZERO_TRUST_AUDIT_REPORT.md` | 597 | SSOT 16.8 Security Audit |
| 34 | Onboarding Examples | `docs/ONBOARDING_IMPLEMENTATION_EXAMPLES.md` | — | SSOT 16.4.5 (code examples) |
| 35 | Onboarding Quick Start | `docs/ONBOARDING_QUICK_START.md` | — | SSOT 16.4.5 (quick start) |
| 36 | Onboarding Recommendations | `docs/ONBOARDING_RECOMMENDATIONS_SUMMARY.md` | — | SSOT 16.4.5 (summary) |

---

## 5. Operational Documents (docs/)

| # | Document | Path | Category | Status |
|---|----------|------|----------|--------|
| 37 | API Documentation | `docs/API_DOCUMENTATION.md` | API reference | Partial (21/248 routes) |
| 38 | AIML User Guide | `docs/AIML_USER_GUIDE.md` | User guide | Active |
| 39 | Competitive Analysis | `docs/COMPETITIVE_ANALYSIS_REPORT.md` | Business | Active |
| 40 | Competitor Analysis | `docs/COMPETITOR_ANALYSIS_REPORT.md` | Business | Active |
| 41 | Deployment Guide | `docs/DEPLOYMENT_GUIDE.md` | Operations | Active |
| 42 | Emulator Testing Guide | `docs/EMULATOR_TESTING_GUIDE.md` | Testing | Active |
| 43 | Mobile Screen Inventory | `docs/MOBILE_SCREEN_INVENTORY.md` | Inventory | Active |
| 44 | Performance Optimization Guide | `docs/PERFORMANCE_OPTIMIZATION_GUIDE.md` | Performance | Active |
| 45 | Pre-Deployment Review | `docs/PRE_DEPLOYMENT_REVIEW.md` | Operations | Active |
| 46 | Required API Keys | `docs/REQUIRED_API_KEYS.md` | Configuration | Active |
| 47 | Rocket Money Parity Analysis | `docs/ROCKET_MONEY_PARITY_ANALYSIS.md` | Business | Active |
| 48 | Screen Inventory | `docs/SCREEN_INVENTORY.md` | Inventory | Active |
| 49 | TAX Compliance Checklist | `docs/TAX_COMPLIANCE_CHECKLIST.md` | Compliance | Active |
| 50 | Testing Guide | `docs/TESTING_GUIDE.md` | Testing | Active |
| 51 | User Guide Financial Chat | `docs/USER_GUIDE_FINANCIAL_CHAT.md` | User guide | Active |
| 52 | Zero Trust Security | `docs/ZERO_TRUST_SECURITY.md` | Security | Active |
| 53 | Onboarding Visual Mockups | `docs/ONBOARDING_VISUAL_MOCKUPS.md` | UI/UX | Active |

---

## 6. Phase Completion Reports (docs/)

| # | Document | Path | Status |
|---|----------|------|--------|
| 54 | Phase 6 Final Report | `docs/PHASE_6_COMPLETE_FINAL_REPORT.md` | Archivable |
| 55 | Phase 6 Completion Summary | `docs/PHASE_6_COMPLETION_SUMMARY.md` | Archivable |
| 56 | Phase 6.3/6.4 Completion | `docs/PHASE_6.3_6.4_COMPLETION_SUMMARY.md` | Archivable |
| 57 | Phase 6 Final Summary | `docs/PHASE_6_COMPLETE_FINAL_SUMMARY.md` | Archivable |
| 58 | Phase 6 Final Report (alt) | `docs/PHASE_6_FINAL_REPORT.md` | Archivable |
| 59 | Phase 6.5 Performance | `docs/PHASE_6.5_PERFORMANCE_OPTIMIZATION_COMPLETE.md` | Archivable |
| 60 | Phase 6.6 Final Polish | `docs/PHASE_6.6_FINAL_POLISH_COMPLETE.md` | Archivable |
| 61 | Phase 2.6 Completion | `docs/phase-2.6-completion-report.md` | Archivable |
| 62 | Phase 2 QC Report | `docs/phase-2-qc-report.md` | Archivable |
| 63 | Phase 2.7 Fix Action Plan | `docs/phase-2.7-fix-action-plan.md` | Archivable |
| 64 | Phase 2.7 QC Summary | `docs/phase-2.7-qc-summary.md` | Archivable |
| 65 | Phase 2.7 QC Report | `docs/phase-2.7-qc-report.md` | Archivable |
| 66 | QC Verification Report | `docs/QC_VERIFICATION_REPORT.md` | Archivable |

---

## 7. Session/Test Reports (docs/)

| # | Document | Path | Status |
|---|----------|------|--------|
| 67 | Test Fixes Session 3 | `docs/TEST_FIXES_SESSION_3_SUMMARY.md` | Archivable |
| 68 | Session 4 Summary | `docs/SESSION_4_SUMMARY.md` | Archivable |
| 69 | Test Fixes Summary | `docs/TEST_FIXES_SUMMARY.md` | Archivable |
| 70 | Test Infrastructure Final Report | `docs/TEST_INFRASTRUCTURE_FINAL_REPORT.md` | Archivable |
| 71 | Test Infrastructure Fixes | `docs/TEST_INFRASTRUCTURE_FIXES.md` | Archivable |

---

## 8. Already-Archived Documents (docs/archive/)

23 documents already in the archive directory:

| # | Document | Path |
|---|----------|------|
| 72 | CPFI Implementation Status | `docs/archive/CPFI_IMPLEMENTATION_STATUS_2025-12-29.md` |
| 73 | Phase 1.2 Completion | `docs/archive/PHASE_1.2_COMPLETION_REPORT.md` |
| 74 | Phase 1 Testing Summary | `docs/archive/PHASE_1_TESTING_SUMMARY.md` |
| 75 | Phase 1.3 Completion | `docs/archive/PHASE_1.3_COMPLETION_REPORT.md` |
| 76 | Phase 1.3 Status | `docs/archive/PHASE_1.3_STATUS_REPORT.md` |
| 77 | Phase 2.2 Completion | `docs/archive/PHASE_2.2_COMPLETION_REPORT.md` |
| 78 | Phase 2.3 Completion | `docs/archive/PHASE_2.3_COMPLETION_REPORT.md` |
| 79 | Phase 1.5 Enhancements | `docs/archive/PHASE_1.5_ENHANCEMENTS_REPORT.md` |
| 80 | Phase 1.5 Completion | `docs/archive/PHASE_1.5_COMPLETION_REPORT.md` |
| 81 | Phase 2.4 Completion | `docs/archive/PHASE_2.4_COMPLETION_REPORT.md` |
| 82 | Phase 2.1 Completion | `docs/archive/PHASE_2.1_COMPLETION_REPORT.md` |
| 83 | Phase 1.4 Completion | `docs/archive/PHASE_1.4_COMPLETION_REPORT.md` |
| 84 | Phase 3.5 Completion | `docs/archive/PHASE_3.5_COMPLETION_SUMMARY.md` |
| 85 | Priority 3 Phase 3 | `docs/archive/PRIORITY_3_PHASE_3_COMPLETE.md` |
| 86 | Priority 3 Phase 4 | `docs/archive/PRIORITY_3_PHASE_4_COMPLETE.md` |
| 87 | Phase 3.4 Completion | `docs/archive/PHASE_3.4_COMPLETION_SUMMARY.md` |
| 88 | Phase 3.6 QC Summary | `docs/archive/PHASE_3.6_QC_SUMMARY.md` |
| 89 | Priority 3 Phase 2 | `docs/archive/PRIORITY_3_PHASE_2_COMPLETE.md` |
| 90 | Priority 3 Implementation Plan | `docs/archive/PRIORITY_3_IMPLEMENTATION_PLAN.md` |
| 91 | Priority 3 Progress | `docs/archive/PRIORITY_3_PROGRESS_REPORT.md` |
| 92 | Implementation Complete Dec 2025 | `docs/archive/IMPLEMENTATION_COMPLETE_2025-12-29.md` |
| 93 | Implementation Progress Dec 2025 | `docs/archive/IMPLEMENTATION_PROGRESS_2025-12-29.md` |
| 94 | Testing Suite Complete | `docs/archive/TESTING_SUITE_IMPLEMENTATION_COMPLETE.md` |

---

## 9. Root Project Documents

| Document | Path | Status |
|----------|------|--------|
| CLAUDE.md | `CLAUDE.md` | **STALE** — Last updated Nov 2025; 17+ metric conflicts with SSOT.md |
| README.md | `README.md` | Active |
| Dockerfile | `Dockerfile` | Active |

---

## 10. Key Code Entry Points

| Area | Path | Files | Description |
|------|------|-------|-------------|
| API Routes | `src/app/api/` | 248 routes | 41 domains (financial, investments, ai, credit, etc.) |
| Pages | `src/app/` | 182 pages | Web application screens |
| Components | `src/components/` | 228 components | 38 directories |
| Libraries | `src/lib/` | 477 files | 53 directories + 14 root files |
| Hooks | `src/hooks/` | 22 hooks | Custom React hooks |
| Security | `src/lib/security/` | 5 files | Input/output validation, rate limiting, auth, audit |
| AI Services | `src/lib/` | 3 core files | aiml-service.ts, model-router.ts, ai-orchestrator.ts |
| Trading | `src/lib/trading/` | 62 files | PCTT, broker, risk, signals |
| Mobile App | `mobile-app/` | 138 source files | Expo 52.0.49, React Native 0.76.9 |
| Tests | `src/**/__tests__/` | 234 files | 3,287 test cases |
| DB Migrations | `supabase/migrations/` | 28 files | PostgreSQL schema |

---

## 11. Inventory Summary

| Category | Count |
|----------|-------|
| Canonical SSOT docs (docs/ssot/) | 9 planned |
| Core source docs (docs/) | 5 |
| Supporting reference docs (docs/) | 5 |
| Archivable plan docs (docs/) | 26 |
| Operational docs (docs/) | 17 |
| Phase completion reports (docs/) | 13 |
| Session/test reports (docs/) | 5 |
| Already-archived docs (docs/archive/) | 23 |
| Root project docs | 3 |
| **Total documentation artifacts** | **106** |

| Code Area | Files |
|-----------|-------|
| Source files (src/) | 1,337 |
| Mobile app files | 138 |
| DB migrations | 28 |
| Test files | 234 |
| **Total code files** | **1,737** |

---

_Generated as DICE v3.3 Step 1 output on 2026-02-24._
