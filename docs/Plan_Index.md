# Plan Index — Fynvita Platform

> **Master index of all plans, specs, documentation, and design documents in the repository.**
> Last Updated: 2026-02-17

---

## 1. Summary

| Metric | Value |
|--------|-------|
| Total documentation files | 96 |
| Current & accurate | 60 (63%) |
| Aspirational (unbuilt features) | 25 (26%) |
| Outdated (contradicts code) | 11 (11%) |
| Date range | Dec 15, 2025 — Feb 17, 2026 |
| Location | `docs/` directory + project root |

---

## 2. Root-Level Documentation

| File | Title | Status | Description |
|------|-------|--------|-------------|
| `CLAUDE.md` | Pair Programming Guide | Outdated | Main dev guide — metrics need updating (see Gaps_Conflicts_Decisions.md) |
| `README.md` | Project README | Current | Public-facing project description |
| `ANALYSIS_REPORT.md` | Analysis Report | Current | Codebase analysis findings |
| `CPFI_IMPLEMENTATION_STATUS_2025-12-29.md` | Implementation Status | Outdated | Uses old CPFI branding; Dec 2025 snapshot |
| `FYNVITA_BRAND_GUIDELINES.md` | Brand Guidelines | Current | Fynvita visual identity and brand standards |
| `README_PHASE_6.md` | Phase 6 README | Outdated | Phase-specific README from earlier development |

---

## 3. docs/ — Core Documentation

### 3.1 Architecture & Design

| File | Title | Status | Key Content |
|------|-------|--------|-------------|
| `COMPETITIVE_ANALYSIS_REPORT.md` | Competitive Analysis | Current | Market competitor comparison |
| `COMPETITOR_ANALYSIS_REPORT.md` | Competitor Analysis | Current | Detailed competitor feature matrix |
| `SCREEN_INVENTORY.md` | Screen Inventory | Current | 351 screens: 155 web + 196 mobile |

### 3.2 Implementation Plans

> **NOTE**: 26 plan/strategy documents have been consolidated into **SSOT.md §16** (Consolidated Implementation Plan). The original files are archivable to `docs/archive/plans/`. See SSOT.md §16.10 for the full list.

| File | Title | Status | Key Content |
|------|-------|--------|-------------|
| `SSOT.md` §16 | **Consolidated Implementation Plan** | **Current** | All roadmaps, upgrade plans, feature specs, task lists in one section |

**Archivable Plan Documents** (consolidated into SSOT.md §16):

| File | Consolidated Into |
|------|-------------------|
| `ENHANCEMENT_ROADMAP.md` | §16.2 Roadmap, §16.5 Priority Matrix |
| `UPGRADE_PLAN_OVERVIEW.md` | §16.3 A+ Strategy |
| `MASTER_TASK_LIST.md` | §16.1 Status, §16.5 Priority Matrix |
| `MOBILE_APP_PARITY_IMPLEMENTATION_PLAN.md` | §16.4.1 Mobile App |
| `INTELLIGENT_FINANCIAL_SUITE_IMPLEMENTATION_PLAN.md` | §16.4.2 Financial Suite |
| `INTELLIGENT_BANKING_IMPLEMENTATION_PLAN.md` | §16.4.2 Banking |
| `GLOBAL_CONNECTOR_STRATEGY_PLAN.md` | §16.4.3 Global Connector |
| `ONBOARDING_UX_ENHANCEMENT_PLAN.md` | §16.4.5 Onboarding |
| `AI_PERSONALIZATION_DESIGN.md` | §16.4.4 AI Personalization |
| `UPGRADE_TRADING_SYSTEM.md` | §16.3.3 Trading |
| `UPGRADE_RISK_MANAGEMENT.md` | §16.3.4 Risk |
| `UPGRADE_CREDIT_REPAIR.md` | §16.3.1 Credit |
| `UPGRADE_FINANCIAL.md` | §16.3.2 Financial |
| `PHASE_6_ARCHITECTURE_DIAGRAM.md` | §16.4.7 Chat Engine |
| `ONBOARDING_PHASE1_IMPLEMENTATION.md` | §16.7 Completed |
| `ONBOARDING_PHASE2_IMPLEMENTATION.md` | §16.7 Completed |
| `PHASE_6.2_IMPLEMENTATION_SUMMARY.md` | §16.7 Completed |
| `phase-6-implementation-guide.md` | §16.4.7 Chat phases |
| `TAX_OPTIMIZATION_MODULE.md` | §16.4.6 Tax (Complete) |
| `TRADING_SYSTEM_AUDIT.md` | §16.9 Trading Readiness |
| `FINANCIAL_CHAT_API.md` | §16.4.7 Chat API |
| `FEATURE_GAP_MATRIX.md` | §16.6 Competitive |
| `ZERO_TRUST_AUDIT_REPORT.md` | §16.8 Security Audit |
| `ONBOARDING_IMPLEMENTATION_EXAMPLES.md` | §16.4.5 (code examples) |
| `ONBOARDING_QUICK_START.md` | §16.4.5 (quick start) |
| `ONBOARDING_RECOMMENDATIONS_SUMMARY.md` | §16.4.5 (summary) |

### 3.3 User-Facing Documentation

| File | Title | Status | Key Content |
|------|-------|--------|-------------|
| `AIML_USER_GUIDE.md` | AIML User Guide | Current | How to use AI features |
| `API_DOCUMENTATION.md` | API Documentation | Outdated | Only covers 21 routes (actual: 248) |
| `DEPLOYMENT_GUIDE.md` | Deployment Guide | Current | Vercel deployment instructions |
| `EMULATOR_TESTING_GUIDE.md` | Emulator Testing | Aspirational | Mobile emulator testing (no mobile app yet) |

### 3.4 Reports

| File | Title | Status | Key Content |
|------|-------|--------|-------------|
| `reports/` (11 files) | Various Reports | Mixed | Phase completion reports, audits, analysis |

### 3.5 Archive

| File | Title | Status | Key Content |
|------|-------|--------|-------------|
| `archive/` (8 files) | Archived Docs | Outdated | Superseded documentation |

### 3.6 Operational

| File | Title | Status | Key Content |
|------|-------|--------|-------------|
| `deployment/` (1 file) | Deployment Configs | Current | Deployment-specific documentation |
| `runbook/` (1 file) | Operational Runbook | Current | Incident response procedures |
| `user-guides/` (1 file) | User Guides | Current | End-user documentation |
| `api/` (1 file) | API Specs | Current | API specification details |

---

## 4. SSOT Documentation (This Rebuild)

| File | Title | Purpose | Created |
|------|-------|---------|---------|
| `docs/SSOT.md` | Single Source of Truth | Primary reference for all platform facts | 2026-02-16 |
| `docs/Codebase_Index.md` | Codebase Index | Full module/service inventory | 2026-02-16 |
| `docs/Plan_Index.md` | Plan Index (this file) | Master doc inventory | 2026-02-16 |
| `docs/Traceability_Matrix.md` | Traceability Matrix | Req → Code → Test mapping | 2026-02-16 |
| `docs/Gaps_Conflicts_Decisions.md` | Gaps & Conflicts | Discrepancies and decisions | 2026-02-16 |
| `docs/Testing/Test_Strategy.md` | Test Strategy | Test approach and tooling | 2026-02-16 |
| `docs/Testing/Test_Catalog.md` | Test Catalog | Complete test inventory | 2026-02-16 |
| `docs/SSOT_Implementation_Plan.md` | **SSOT Implementation Plan** | Unified verifiable task list with bijective codebase mapping | 2026-02-17 |

---

## 5. Documentation by Domain

### Credit & Disputes
- `API_DOCUMENTATION.md` — API endpoints (outdated)
- `SSOT.md` §16.3.1 — Credit repair upgrade plan (consolidated)
- `SSOT.md` §16.6 — Competitive positioning (consolidated)

### AI & Machine Learning
- `AIML_USER_GUIDE.md` — User guide for AI features
- `SSOT.md` §16.4.4 — AI personalization & gamification (consolidated)
- `SSOT.md` §16.4.7 — Financial chat engine (consolidated)

### Financial Services
- `SSOT.md` §16.4.2 — Intelligent financial suite (consolidated)
- `SSOT.md` §16.4.6 — Tax optimization (consolidated, complete)
- `SSOT.md` §16.3.3–16.3.4 — Trading & risk upgrades (consolidated)

### Infrastructure & Operations
- `DEPLOYMENT_GUIDE.md` — Deployment procedures
- `deployment/` — Deployment configs
- `runbook/` — Operational procedures

### Business & Strategy
- `COMPETITIVE_ANALYSIS_REPORT.md` — Market analysis
- `COMPETITOR_ANALYSIS_REPORT.md` — Competitor features
- `SSOT.md` §16.2 — Full roadmap Q1–Q4 2026 (consolidated)
- `SSOT.md` §16.4.3 — Global connector strategy (consolidated)

---

## 6. Freshness Guidelines

| Status | Definition | Action Required |
|--------|-----------|-----------------|
| **Current** | Content matches codebase reality | Maintain; review quarterly |
| **Aspirational** | Describes planned/future features not yet built | Tag with "STATUS: PLANNED"; do not reference as implemented |
| **Outdated** | Contradicts current code or uses old branding | Move to `docs/archive/` or update immediately |

---

## 7. Maintenance Schedule

- **Monthly**: Review all "Current" docs for drift
- **Per Sprint**: Update MASTER_TASK_LIST.md
- **Per Feature**: Update relevant docs before PR merge
- **Quarterly**: Audit full docs/ directory; archive stale content

---

*Document generated from codebase analysis on 2026-02-16.*
*Updated 2026-02-17: 26 plan documents consolidated into SSOT.md §16.*
*Updated 2026-02-17: Added SSOT_Implementation_Plan.md — unified verifiable task list.*
