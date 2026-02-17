# Plan Index — Fynvita Platform

> **Master index of all plans, specs, documentation, and design documents in the repository.**
> Last Updated: 2026-02-16

---

## 1. Summary

| Metric | Value |
|--------|-------|
| Total documentation files | 95 |
| Current & accurate | 59 (62%) |
| Aspirational (unbuilt features) | 25 (26%) |
| Outdated (contradicts code) | 11 (12%) |
| Date range | Dec 15, 2025 — Jan 23, 2026 |
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
| `AI_PERSONALIZATION_DESIGN.md` | AI Personalization Design | Aspirational | Personalized AI experience design |
| `COMPETITIVE_ANALYSIS_REPORT.md` | Competitive Analysis | Current | Market competitor comparison |
| `COMPETITOR_ANALYSIS_REPORT.md` | Competitor Analysis | Current | Detailed competitor feature matrix |
| `FEATURE_GAP_MATRIX.md` | Feature Gap Matrix | Current | Feature comparison vs. competitors |
| `GLOBAL_CONNECTOR_STRATEGY_PLAN.md` | Global Connector Strategy | Aspirational | International expansion plan |
| `INTELLIGENT_BANKING_IMPLEMENTATION_PLAN.md` | Intelligent Banking Plan | Aspirational | Banking integration roadmap |
| `INTELLIGENT_FINANCIAL_SUITE_IMPLEMENTATION_PLAN.md` | Financial Suite Plan | Aspirational | Comprehensive financial tools plan |
| `SCREEN_INVENTORY.md` | Screen Inventory | Current | 351 screens: 155 web + 196 mobile |
| `ENHANCEMENT_ROADMAP.md` | Enhancement Roadmap | Aspirational | Future feature development plan |

### 3.2 Implementation Plans

| File | Title | Status | Key Content |
|------|-------|--------|-------------|
| `MASTER_TASK_LIST.md` | Master Task List | Current | Central task tracking document |
| `TRADING_SYSTEM_AUDIT.md` | Trading System Audit | Current | Trading feature audit findings |
| `TAX_OPTIMIZATION_MODULE.md` | Tax Optimization | Aspirational | Tax optimization feature design |
| `FINANCIAL_CHAT_API.md` | Financial Chat API | Current | AI chat endpoint documentation |

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

---

## 5. Documentation by Domain

### Credit & Disputes
- `API_DOCUMENTATION.md` — API endpoints (outdated)
- `FINANCIAL_CHAT_API.md` — AI chat for financial queries
- `FEATURE_GAP_MATRIX.md` — Feature comparison

### AI & Machine Learning
- `AI_PERSONALIZATION_DESIGN.md` — Personalization architecture
- `AIML_USER_GUIDE.md` — User guide for AI features

### Financial Services
- `INTELLIGENT_FINANCIAL_SUITE_IMPLEMENTATION_PLAN.md` — Suite plan
- `INTELLIGENT_BANKING_IMPLEMENTATION_PLAN.md` — Banking integration
- `TAX_OPTIMIZATION_MODULE.md` — Tax features
- `TRADING_SYSTEM_AUDIT.md` — Trading system review

### Infrastructure & Operations
- `DEPLOYMENT_GUIDE.md` — Deployment procedures
- `deployment/` — Deployment configs
- `runbook/` — Operational procedures

### Business & Strategy
- `COMPETITIVE_ANALYSIS_REPORT.md` — Market analysis
- `COMPETITOR_ANALYSIS_REPORT.md` — Competitor features
- `GLOBAL_CONNECTOR_STRATEGY_PLAN.md` — International strategy
- `ENHANCEMENT_ROADMAP.md` — Feature roadmap

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
