# PLAN-SOURCE-INDEX

> **Purpose**: Catalog every plan, roadmap, spec, audit, and requirements document discovered in the Fynvita repository.
> **MERGE LOCK Artifact 1 of 4** | Generated: 2026-02-27
> **Total Sources Found**: 104 documents (10 active SSOT + 6 active root + 88 archived)

---

## Active SSOT Documents (10)

| SourceID | Path | DocType | Status | Key Sections | Notes |
|----------|------|---------|--------|--------------|-------|
| SRC-SSOT-01 | `docs/ssot/SSOT.md` | Master Reference | Active | §1-16: Architecture, APIs (248), Pages (182), Components (228), Libraries (477), Security, Testing, Deployment, Mobile, Known Issues, Implementation Plan | THE single source of truth. 998+ lines. |
| SRC-SSOT-02 | `docs/ssot/MASTER-IMPLEMENTATION-PLAN.md` | Task Plan | Active | Waves 0-5, 80 task cards, gate exit criteria, dependency chains | All TASK-* cards with acceptance criteria |
| SRC-SSOT-03 | `docs/ssot/system_blueprint.md` | Architecture Spec | Active | Architecture layers, security model, data model, trading PCTT, DevOps | Technical blueprint |
| SRC-SSOT-04 | `docs/ssot/traceability_matrix.md` | Traceability | Active | Forward trace (REQ→TASK), Reverse trace (TASK→files), Additional PCTT tasks TRD-08 through TRD-13 | Reveals 6 tasks not in task_extraction |
| SRC-SSOT-05 | `docs/ssot/task_extraction.md` | Task Normalization | Active | 116 raw items → 68 normalized tasks, dedup log, conflict resolution, cross-references | DICE v3.3 Step 2 output |
| SRC-SSOT-06 | `docs/ssot/build_order_blueprint.md` | Build Sequencing | Active | Wave sequencing, gate criteria, parallel tracks | Build order for 6 waves |
| SRC-SSOT-07 | `docs/ssot/dependency_graph.md` | Dependencies | Active | Module dependency graph, critical path | Inter-module dependencies |
| SRC-SSOT-08 | `docs/ssot/health_metrics.md` | Quality Scorecard | Active | Test/lint/build/security status, coverage per domain | Quality gates status |
| SRC-SSOT-09 | `docs/ssot/repo_inventory.md` | Codebase Inventory | Active | File counts, directory structure, route inventory | Codebase metrics |
| SRC-SSOT-10 | `docs/ssot/version_history.md` | Change Log | Active | SSOT version history, amendments | Audit trail |

## Active Root Documents (6)

| SourceID | Path | DocType | Status | Key Sections | Notes |
|----------|------|---------|--------|--------------|-------|
| SRC-ROOT-01 | `docs/SSOT.md` | Mirror/Symlink | Active | Same as SRC-SSOT-01 | Root-level copy of SSOT |
| SRC-ROOT-02 | `docs/master-plan.md` | Master Plan | Active | 6-wave plan, module completion, priority matrix, A+ upgrade features | Primary planning input for DICE v3.3 |
| SRC-ROOT-03 | `docs/ui-design.md` | UI/UX Spec | Active | Design system, component specs, screen layouts, mobile design patterns | UI requirements |
| SRC-ROOT-04 | `docs/architecture.md` | Architecture | Active | High-level architecture, system diagrams, integration patterns | Architecture decisions |
| SRC-ROOT-05 | `docs/gap-analysis.md` | Gap Analysis | Active | Coverage gaps per domain, remediation priorities, missing features | Primary gap input for DICE v3.3 |
| SRC-ROOT-06 | `docs/FYNVITA-PCTT-TRADING-SYSTEM.md` | Trading Spec | Active | PCTT architecture, 7-stage pipeline, 7 AI agents, 10 strategies, 30-law compliance, risk gateway, circuit breakers, Lightweight Charts v5 | Comprehensive trading system spec |

## Archived Documents — Implementation Plans (12)

| SourceID | Path | DocType | Status | Key Sections | Notes |
|----------|------|---------|--------|--------------|-------|
| SRC-ARC-01 | `docs/archive/MASTER_TASK_LIST.md` | Task List | Archived | All original tasks before DICE normalization | Superseded by SRC-SSOT-02 |
| SRC-ARC-02 | `docs/archive/ENHANCEMENT_ROADMAP.md` | Roadmap | Archived | Feature enhancement priorities, timeline | Contains A+ upgrade features |
| SRC-ARC-03 | `docs/archive/INTELLIGENT_BANKING_IMPLEMENTATION_PLAN.md` | Implementation Plan | Archived | Smart banking features, AI-powered insights | Banking intelligence tasks |
| SRC-ARC-04 | `docs/archive/INTELLIGENT_FINANCIAL_SUITE_IMPLEMENTATION_PLAN.md` | Implementation Plan | Archived | Full financial suite features | Financial AI implementation |
| SRC-ARC-05 | `docs/archive/GLOBAL_CONNECTOR_STRATEGY_PLAN.md` | Implementation Plan | Archived | Multi-region connectors, international banking, currency support | Global expansion tasks |
| SRC-ARC-06 | `docs/archive/MOBILE_APP_PARITY_IMPLEMENTATION_PLAN.md` | Implementation Plan | Archived | Mobile feature parity with web, screen inventory, missing screens | Mobile gap closure tasks |
| SRC-ARC-07 | `docs/archive/SSOT_Implementation_Plan.md` | Implementation Plan | Archived | SSOT creation plan | Meta-documentation |
| SRC-ARC-08 | `docs/archive/PRIORITY_3_IMPLEMENTATION_PLAN.md` | Implementation Plan | Archived | Priority 3 features implementation | P3 tasks |
| SRC-ARC-09 | `docs/archive/phase-6-implementation-guide.md` | Implementation Guide | Archived | Phase 6 implementation details | Phase 6 specifics |
| SRC-ARC-10 | `docs/archive/ONBOARDING_UX_ENHANCEMENT_PLAN.md` | UX Plan | Archived | Onboarding flow improvements, UX enhancements | Onboarding tasks |
| SRC-ARC-11 | `docs/archive/ONBOARDING_PHASE1_IMPLEMENTATION.md` | Implementation Plan | Archived | Phase 1 onboarding implementation | Onboarding P1 |
| SRC-ARC-12 | `docs/archive/ONBOARDING_PHASE2_IMPLEMENTATION.md` | Implementation Plan | Archived | Phase 2 onboarding implementation | Onboarding P2 |

## Archived Documents — Upgrade Plans (5)

| SourceID | Path | DocType | Status | Key Sections | Notes |
|----------|------|---------|--------|--------------|-------|
| SRC-ARC-13 | `docs/archive/UPGRADE_PLAN_OVERVIEW.md` | Upgrade Plan | Archived | Master upgrade roadmap across all domains | Umbrella upgrade doc |
| SRC-ARC-14 | `docs/archive/UPGRADE_FINANCIAL.md` | Upgrade Plan | Archived | Financial service upgrades, A+ features | Financial domain upgrades |
| SRC-ARC-15 | `docs/archive/UPGRADE_CREDIT_REPAIR.md` | Upgrade Plan | Archived | Credit repair enhancements, automation, AI | Credit domain upgrades |
| SRC-ARC-16 | `docs/archive/UPGRADE_RISK_MANAGEMENT.md` | Upgrade Plan | Archived | Risk management system, kill switches, circuit breakers | Risk domain upgrades |
| SRC-ARC-17 | `docs/archive/UPGRADE_TRADING_SYSTEM.md` | Upgrade Plan | Archived | Trading system upgrades, PCTT, paper trading, charting | Trading domain upgrades |

## Archived Documents — Analysis & Audit Reports (8)

| SourceID | Path | DocType | Status | Key Sections | Notes |
|----------|------|---------|--------|--------------|-------|
| SRC-ARC-18 | `docs/archive/COMPETITIVE_ANALYSIS_REPORT.md` | Analysis | Archived | Competitor feature comparison | Feature gap identification |
| SRC-ARC-19 | `docs/archive/COMPETITOR_ANALYSIS_REPORT.md` | Analysis | Archived | Detailed competitor comparison | Overlaps with SRC-ARC-18 |
| SRC-ARC-20 | `docs/archive/ROCKET_MONEY_PARITY_ANALYSIS.md` | Analysis | Archived | Rocket Money feature comparison, parity gaps | Specific competitor benchmark |
| SRC-ARC-21 | `docs/archive/FEATURE_GAP_MATRIX.md` | Gap Matrix | Archived | Feature-by-feature gap analysis with status | Pre-DICE gap tracking |
| SRC-ARC-22 | `docs/archive/TRADING_SYSTEM_AUDIT.md` | Audit | Archived | Trading system completeness audit, missing components | Trading gap identification |
| SRC-ARC-23 | `docs/archive/ZERO_TRUST_AUDIT_REPORT.md` | Security Audit | Archived | Zero trust security audit findings | Security gaps |
| SRC-ARC-24 | `docs/archive/Gaps_Conflicts_Decisions.md` | Analysis | Archived | Cross-document gap analysis, conflict resolution | Pre-DICE conflict tracking |
| SRC-ARC-25 | `docs/archive/SCREEN_INVENTORY.md` | Inventory | Archived | Web screen inventory | Screen completeness audit |

## Archived Documents — Phase Completion Reports (22)

| SourceID | Path | DocType | Status | Key Sections | Notes |
|----------|------|---------|--------|--------------|-------|
| SRC-ARC-26 | `docs/archive/PHASE_1.2_COMPLETION_REPORT.md` | Completion Report | Archived | Phase 1.2 deliverables | Completed work |
| SRC-ARC-27 | `docs/archive/PHASE_1.3_COMPLETION_REPORT.md` | Completion Report | Archived | Phase 1.3 deliverables | Completed work |
| SRC-ARC-28 | `docs/archive/PHASE_1.3_STATUS_REPORT.md` | Status Report | Archived | Phase 1.3 status | In-progress snapshot |
| SRC-ARC-29 | `docs/archive/PHASE_1.4_COMPLETION_REPORT.md` | Completion Report | Archived | Phase 1.4 deliverables | Completed work |
| SRC-ARC-30 | `docs/archive/PHASE_1.5_COMPLETION_REPORT.md` | Completion Report | Archived | Phase 1.5 deliverables | Completed work |
| SRC-ARC-31 | `docs/archive/PHASE_1.5_ENHANCEMENTS_REPORT.md` | Enhancement Report | Archived | Phase 1.5 enhancements | Enhancement details |
| SRC-ARC-32 | `docs/archive/PHASE_1_TESTING_SUMMARY.md` | Test Report | Archived | Phase 1 test results | Test outcomes |
| SRC-ARC-33 | `docs/archive/PHASE_2.1_COMPLETION_REPORT.md` | Completion Report | Archived | Phase 2.1 deliverables | Completed work |
| SRC-ARC-34 | `docs/archive/PHASE_2.2_COMPLETION_REPORT.md` | Completion Report | Archived | Phase 2.2 deliverables | Completed work |
| SRC-ARC-35 | `docs/archive/PHASE_2.3_COMPLETION_REPORT.md` | Completion Report | Archived | Phase 2.3 deliverables | Completed work |
| SRC-ARC-36 | `docs/archive/PHASE_2.4_COMPLETION_REPORT.md` | Completion Report | Archived | Phase 2.4 deliverables | Completed work |
| SRC-ARC-37 | `docs/archive/phase-2.6-completion-report.md` | Completion Report | Archived | Phase 2.6 deliverables | Completed work |
| SRC-ARC-38 | `docs/archive/PHASE_3.4_COMPLETION_SUMMARY.md` | Completion Summary | Archived | Phase 3.4 deliverables | Completed work |
| SRC-ARC-39 | `docs/archive/PHASE_3.5_COMPLETION_SUMMARY.md` | Completion Summary | Archived | Phase 3.5 deliverables | Completed work |
| SRC-ARC-40 | `docs/archive/PHASE_6.2_IMPLEMENTATION_SUMMARY.md` | Implementation Summary | Archived | Phase 6.2 implementation | Completed work |
| SRC-ARC-41 | `docs/archive/PHASE_6.3_6.4_COMPLETION_SUMMARY.md` | Completion Summary | Archived | Phase 6.3-6.4 deliverables | Completed work |
| SRC-ARC-42 | `docs/archive/PHASE_6.5_PERFORMANCE_OPTIMIZATION_COMPLETE.md` | Completion Report | Archived | Phase 6.5 performance work | Completed work |
| SRC-ARC-43 | `docs/archive/PHASE_6.6_FINAL_POLISH_COMPLETE.md` | Completion Report | Archived | Phase 6.6 final polish | Completed work |
| SRC-ARC-44 | `docs/archive/PHASE_6_ARCHITECTURE_DIAGRAM.md` | Architecture | Archived | Phase 6 architecture | Architecture reference |
| SRC-ARC-45 | `docs/archive/PHASE_6_COMPLETION_SUMMARY.md` | Completion Summary | Archived | Phase 6 summary | Completed work |
| SRC-ARC-46 | `docs/archive/PHASE_6_COMPLETE_FINAL_REPORT.md` | Final Report | Archived | Phase 6 final report | Completed work |
| SRC-ARC-47 | `docs/archive/PHASE_6_COMPLETE_FINAL_SUMMARY.md` | Final Summary | Archived | Phase 6 final summary | Completed work |
| SRC-ARC-48 | `docs/archive/PHASE_6_FINAL_REPORT.md` | Final Report | Archived | Phase 6 report | Completed work |

## Archived Documents — Priority 3 Reports (4)

| SourceID | Path | DocType | Status | Key Sections | Notes |
|----------|------|---------|--------|--------------|-------|
| SRC-ARC-49 | `docs/archive/PRIORITY_3_PHASE_2_COMPLETE.md` | Completion Report | Archived | P3 Phase 2 | Completed work |
| SRC-ARC-50 | `docs/archive/PRIORITY_3_PHASE_3_COMPLETE.md` | Completion Report | Archived | P3 Phase 3 | Completed work |
| SRC-ARC-51 | `docs/archive/PRIORITY_3_PHASE_4_COMPLETE.md` | Completion Report | Archived | P3 Phase 4 | Completed work |
| SRC-ARC-52 | `docs/archive/PRIORITY_3_PROGRESS_REPORT.md` | Progress Report | Archived | P3 overall progress | Status tracking |

## Archived Documents — QC & Testing Reports (11)

| SourceID | Path | DocType | Status | Key Sections | Notes |
|----------|------|---------|--------|--------------|-------|
| SRC-ARC-53 | `docs/archive/QC_VERIFICATION_REPORT.md` | QC Report | Archived | Quality verification | QC findings |
| SRC-ARC-54 | `docs/archive/phase-2-qc-report.md` | QC Report | Archived | Phase 2 QC | QC findings |
| SRC-ARC-55 | `docs/archive/phase-2.7-qc-report.md` | QC Report | Archived | Phase 2.7 QC | QC findings |
| SRC-ARC-56 | `docs/archive/phase-2.7-qc-summary.md` | QC Summary | Archived | Phase 2.7 QC summary | QC summary |
| SRC-ARC-57 | `docs/archive/phase-2.7-fix-action-plan.md` | Fix Plan | Archived | Phase 2.7 fix actions | Actionable fixes |
| SRC-ARC-58 | `docs/archive/PHASE_3.6_QC_SUMMARY.md` | QC Summary | Archived | Phase 3.6 QC | QC findings |
| SRC-ARC-59 | `docs/archive/TESTING_GUIDE.md` | Guide | Archived | Testing methodology | Reference |
| SRC-ARC-60 | `docs/archive/TEST_FIXES_SUMMARY.md` | Fix Summary | Archived | Test fix actions | Completed fixes |
| SRC-ARC-61 | `docs/archive/TEST_FIXES_SESSION_3_SUMMARY.md` | Fix Summary | Archived | Session 3 test fixes | Completed fixes |
| SRC-ARC-62 | `docs/archive/TEST_INFRASTRUCTURE_FINAL_REPORT.md` | Infrastructure Report | Archived | Test infrastructure | Infrastructure work |
| SRC-ARC-63 | `docs/archive/TEST_INFRASTRUCTURE_FIXES.md` | Fix Report | Archived | Test infrastructure fixes | Completed fixes |

## Archived Documents — Security (2)

| SourceID | Path | DocType | Status | Key Sections | Notes |
|----------|------|---------|--------|--------------|-------|
| SRC-ARC-64 | `docs/archive/ZERO_TRUST_SECURITY.md` | Security Spec | Archived | Zero trust architecture, implementation plan | Security tasks |
| SRC-ARC-23 | `docs/archive/ZERO_TRUST_AUDIT_REPORT.md` | Security Audit | Archived | Audit findings, remediation actions | (Listed above in Analysis) |

## Archived Documents — Onboarding (5)

| SourceID | Path | DocType | Status | Key Sections | Notes |
|----------|------|---------|--------|--------------|-------|
| SRC-ARC-65 | `docs/archive/ONBOARDING_QUICK_START.md` | Guide | Archived | Quick start guide | Reference |
| SRC-ARC-66 | `docs/archive/ONBOARDING_IMPLEMENTATION_EXAMPLES.md` | Examples | Archived | Implementation examples | Reference |
| SRC-ARC-67 | `docs/archive/ONBOARDING_RECOMMENDATIONS_SUMMARY.md` | Recommendations | Archived | Onboarding improvement recommendations | Actionable items |
| SRC-ARC-68 | `docs/archive/ONBOARDING_VISUAL_MOCKUPS.md` | Mockups | Archived | Visual mockup specifications | UI requirements |
| SRC-ARC-10 | `docs/archive/ONBOARDING_UX_ENHANCEMENT_PLAN.md` | UX Plan | Archived | (Listed above in Plans) | |

## Archived Documents — Feature & Domain Specs (10)

| SourceID | Path | DocType | Status | Key Sections | Notes |
|----------|------|---------|--------|--------------|-------|
| SRC-ARC-69 | `docs/archive/AI_PERSONALIZATION_DESIGN.md` | Design Spec | Archived | AI personalization features, recommendation engine | AI feature tasks |
| SRC-ARC-70 | `docs/archive/FINANCIAL_CHAT_API.md` | API Spec | Archived | Financial chat API design | Chat integration tasks |
| SRC-ARC-71 | `docs/archive/TAX_OPTIMIZATION_MODULE.md` | Module Spec | Archived | Tax optimization features, strategies | Tax domain tasks |
| SRC-ARC-72 | `docs/archive/TAX_COMPLIANCE_CHECKLIST.md` | Checklist | Archived | Tax compliance requirements | Compliance tasks |
| SRC-ARC-73 | `docs/archive/PERFORMANCE_OPTIMIZATION_GUIDE.md` | Guide | Archived | Performance optimization strategies | Performance tasks |
| SRC-ARC-74 | `docs/archive/MOBILE_SCREEN_INVENTORY.md` | Inventory | Archived | Mobile screen listing and status | Mobile gap tracking |
| SRC-ARC-75 | `docs/archive/TESTING_SUITE_IMPLEMENTATION_COMPLETE.md` | Completion Report | Archived | Test suite implementation | Completed work |
| SRC-ARC-76 | `docs/archive/DEPLOYMENT_GUIDE.md` | Guide | Archived | Deployment procedures | Reference |
| SRC-ARC-77 | `docs/archive/EMULATOR_TESTING_GUIDE.md` | Guide | Archived | Emulator testing procedures | Reference |
| SRC-ARC-78 | `docs/archive/REQUIRED_API_KEYS.md` | Configuration | Archived | Required API keys list | Reference |

## Archived Documents — User Guides & API Docs (3)

| SourceID | Path | DocType | Status | Key Sections | Notes |
|----------|------|---------|--------|--------------|-------|
| SRC-ARC-79 | `docs/archive/AIML_USER_GUIDE.md` | User Guide | Archived | AIML API usage guide | Reference |
| SRC-ARC-80 | `docs/archive/USER_GUIDE_FINANCIAL_CHAT.md` | User Guide | Archived | Financial chat user guide | Reference |
| SRC-ARC-81 | `docs/archive/API_DOCUMENTATION.md` | API Docs | Archived | API documentation | Reference |

## Archived Documents — Status & Index (7)

| SourceID | Path | DocType | Status | Key Sections | Notes |
|----------|------|---------|--------|--------------|-------|
| SRC-ARC-82 | `docs/archive/CPFI_IMPLEMENTATION_STATUS_2025-12-29.md` | Status Report | Archived | Implementation status snapshot | Historical status |
| SRC-ARC-83 | `docs/archive/IMPLEMENTATION_COMPLETE_2025-12-29.md` | Completion Report | Archived | Implementation completion | Historical status |
| SRC-ARC-84 | `docs/archive/IMPLEMENTATION_PROGRESS_2025-12-29.md` | Progress Report | Archived | Implementation progress | Historical status |
| SRC-ARC-85 | `docs/archive/SESSION_4_SUMMARY.md` | Session Summary | Archived | Session 4 work summary | Session notes |
| SRC-ARC-86 | `docs/archive/PRE_DEPLOYMENT_REVIEW.md` | Review | Archived | Pre-deployment checklist | Deployment readiness |
| SRC-ARC-87 | `docs/archive/Codebase_Index.md` | Index | Archived | Codebase file index | Historical reference |
| SRC-ARC-88 | `docs/archive/Plan_Index.md` | Index | Archived | Plan document index | Historical reference |
| SRC-ARC-89 | `docs/archive/Traceability_Matrix.md` | Traceability | Archived | Pre-DICE traceability matrix | Superseded by SRC-SSOT-04 |
| SRC-ARC-90 | `docs/archive/ARCHIVE-INDEX.md` | Index | Archived | Archive index listing | Self-referential index |

---

## Summary Statistics

| Category | Count | Actionable (High) | Actionable (Low) | Reference Only |
|----------|-------|-------------------|-------------------|----------------|
| Active SSOT | 10 | 5 | 3 | 2 |
| Active Root | 6 | 5 | 1 | 0 |
| Archived - Implementation Plans | 12 | 12 | 0 | 0 |
| Archived - Upgrade Plans | 5 | 5 | 0 | 0 |
| Archived - Analysis/Audit | 8 | 8 | 0 | 0 |
| Archived - Phase Completions | 22 | 3 | 10 | 9 |
| Archived - Priority 3 | 4 | 1 | 1 | 2 |
| Archived - QC/Testing | 11 | 3 | 4 | 4 |
| Archived - Security | 2 | 2 | 0 | 0 |
| Archived - Onboarding | 5 | 3 | 1 | 1 |
| Archived - Feature/Domain | 10 | 5 | 3 | 2 |
| Archived - User Guides/API | 3 | 0 | 0 | 3 |
| Archived - Status/Index | 9 | 1 | 2 | 6 |
| **TOTAL** | **107** | **53** | **25** | **29** |

### Priority Extraction Order
Documents marked **Actionable (High)** are extracted first for the PLAN-EXTRACTION-LEDGER.
Documents marked **Actionable (Low)** are scanned for residual items.
Documents marked **Reference Only** are noted but not expected to yield new tasks.

---

*Generated for MERGE LOCK compliance. Every document in this repository's `docs/` tree is cataloged.*
