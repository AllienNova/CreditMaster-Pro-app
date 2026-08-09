# Strativion PCTT Multi-Agent Trading Platform: Progress Tracker

<!-- PROG-HEADER -->

## PROG-HEADER: Current Status Summary

| Field | Value |
|-------|-------|
| Project | Strativion PCTT Multi-Agent Trading Platform |
| Version | 0.0.0 (pre-development) |
| Last Updated | 2026-02-23 |
| Overall Progress | 0% (0/134 tasks completed) |
| Current Phase | P0 (not started) |
| Next Milestone | Phase 0 complete (project scaffolding) |
| SSOT Version | 1.0.0 |
| IMP Plan Version | 1.0.0 |
| Total Phases | 12 (Phase 0 through Phase 11) |
| Estimated Effort | 850 to 1050 hours |

<!-- /PROG-HEADER -->

---

<!-- PROG-DASHBOARD -->

## PROG-DASHBOARD: Progress Metrics

### Phase Completion

| Phase | Name | Tasks | Completed | Remaining | Progress |
|-------|------|-------|-----------|-----------|----------|
| P0 | Project Scaffolding | 8 | 0 | 8 | 0% |
| P1 | Core Framework | 15 | 0 | 15 | 0% |
| P2 | PCTT Pipeline Engine | 12 | 0 | 12 | 0% |
| P3 | Agent Implementation | 14 | 0 | 14 | 0% |
| P4 | Database Layer | 8 | 0 | 8 | 0% |
| P5 | External Integrations | 8 | 0 | 8 | 0% |
| P6 | Frontend (Electron + React) | 12 | 0 | 12 | 0% |
| P7 | Security and Compliance | 10 | 0 | 10 | 0% |
| P8 | Observability | 6 | 0 | 6 | 0% |
| P9 | Integration and E2E Testing | 8 | 0 | 8 | 0% |
| P10 | Polish and Deployment | 9 | 0 | 9 | 0% |
| P11 | Critical Enhancements (Expert Review) | 26 | 0 | 26 | 0% |
| **Total** | | **137** | **0** | **137** | **0%** |

### Module Completion

| Module | SSOT Sections | IMP Tasks | Completed | Progress |
|--------|--------------|-----------|-----------|----------|
| Core Framework | SSOT-ARCH-01 to SSOT-ARCH-03 | IMP-P1-001 to IMP-P1-015 | 0/15 | 0% |
| PCTT Pipeline | SSOT-PCTT-01 to SSOT-PCTT-12 | IMP-P2-001 to IMP-P2-012 | 0/12 | 0% |
| Agents (11) | SSOT-AG-01 to SSOT-AG-11 | IMP-P3-001 to IMP-P3-014 | 0/14 | 0% |
| Database | SSOT-ARCH-03, SSOT-DB | IMP-P4-001 to IMP-P4-008 | 0/8 | 0% |
| Integrations | SSOT-API, SSOT-INF-01 | IMP-P5-001 to IMP-P5-008 | 0/8 | 0% |
| Frontend | SSOT-UI-01 to SSOT-UI-04 | IMP-P6-001 to IMP-P6-012 | 0/12 | 0% |
| Security | SSOT-SEC-01 to SSOT-SEC-05 | IMP-P7-001 to IMP-P7-010 | 0/10 | 0% |
| Observability | SSOT-INF-02 to SSOT-INF-04 | IMP-P8-001 to IMP-P8-006 | 0/6 | 0% |

### Test Coverage

| Test Suite | Target Coverage | Actual Coverage | Tests Written | Tests Passing |
|------------|----------------|-----------------|---------------|---------------|
| Backend Unit Tests | 85% | 0% | 0 | 0 |
| PCTT Pipeline Tests | 90% | 0% | 0 | 0 |
| Agent Tests | 85% | 0% | 0 | 0 |
| Integration Tests | 75% | 0% | 0 | 0 |
| E2E Tests | 60% | 0% | 0 | 0 |
| Frontend Unit Tests | 80% | 0% | 0 | 0 |
| Security Tests | 90% | 0% | 0 | 0 |

### Lines of Code

| Component | Estimated Target | Actual | Progress |
|-----------|-----------------|--------|----------|
| Python Backend (src/) | ~18,000 | 0 | 0% |
| Config/Rules (YAML) | ~2,500 | 0 | 0% |
| Frontend (TypeScript/React) | ~12,000 | 0 | 0% |
| Tests (Python + TS) | ~13,500 | 0 | 0% |
| **Total** | **~46,000** | **0** | **0%** |

<!-- /PROG-DASHBOARD -->

---

<!-- PROG-REQ-MATRIX -->

## PROG-REQ-MATRIX: Requirements Traceability Matrix

### Architecture Requirements (REQ-ARCH)

| REQ-ID | Description | SSOT Ref | IMP Task | Test ID | Status |
|--------|-------------|----------|----------|---------|--------|
| REQ-ARCH-001 | 5-layer architecture (Perception, Analysis, Decision, Action, Learning) | SSOT-ARCH-01.02 | IMP-P1-006 | tests/unit/core/test_base_agent.py | PENDING |
| REQ-ARCH-002 | Redis Pub/Sub event bus for inter-agent communication | SSOT-ARCH-02.01 | IMP-P1-005 | tests/unit/core/test_event_bus.py | PENDING |
| REQ-ARCH-003 | 3-tier memory architecture (hot, warm, cold) | SSOT-ARCH-03.01 | IMP-P1-004 | tests/unit/core/test_memory.py | PENDING |
| REQ-ARCH-004 | WebSocket message envelope with type, source, timestamp, payload | SSOT-ARCH-02.03 | IMP-P1-011 | tests/unit/core/test_ws_message.py | PENDING |
| REQ-ARCH-005 | Startup sequence (12 steps, T-90 min to T-0) | SSOT-ARCH-01.08 | IMP-P1-014 | tests/integration/test_startup.py | PENDING |
| REQ-ARCH-006 | Graceful shutdown sequence (6 steps) | SSOT-ARCH-01.09 | IMP-P1-014 | tests/integration/test_shutdown.py | PENDING |
| REQ-ARCH-007 | Emergency shutdown with crisis protocol | SSOT-ARCH-01.09 | IMP-P3-005 | tests/integration/test_emergency.py | PENDING |
| REQ-ARCH-008 | 30-second health check loop for all agents | SSOT-ARCH-01.08 | IMP-P1-008 | tests/unit/core/test_health_check.py | PENDING |
| REQ-ARCH-009 | Invariant 1: Non-repainting is absolute (t-1 data only) | SSOT-ARCH-01.10 | IMP-P2-011 | tests/unit/pctt/test_non_repainting.py | PENDING |
| REQ-ARCH-010 | Invariant 2: One-break-one-trade rule | SSOT-ARCH-01.10 | IMP-P2-006 | tests/unit/pctt/test_one_break.py | PENDING |
| REQ-ARCH-011 | Invariant 3: Maximum risk per trade 2% hard cap | SSOT-ARCH-01.10 | IMP-P3-004 | tests/unit/contexts/agent-contexts/test_risk_cap.py | PENDING |
| REQ-ARCH-012 | Invariant 4: Maximum portfolio heat 8% ceiling | SSOT-ARCH-01.10 | IMP-P3-004 | tests/unit/contexts/agent-contexts/test_heat_cap.py | PENDING |
| REQ-ARCH-013 | Invariant 5: Maximum correlated positions 5 | SSOT-ARCH-01.10 | IMP-P3-004 | tests/unit/contexts/agent-contexts/test_correlation_cap.py | PENDING |
| REQ-ARCH-014 | Invariant 6: Drawdown halt at 20% | SSOT-ARCH-01.10 | IMP-P1-009 | tests/unit/core/test_circuit_breaker.py | PENDING |
| REQ-ARCH-015 | Invariant 7: Every position must have a stop | SSOT-ARCH-01.10 | IMP-P3-006 | tests/unit/contexts/agent-contexts/test_stop_required.py | PENDING |
| REQ-ARCH-016 | Invariant 8: Human approval in SUPERVISED mode | SSOT-ARCH-01.10 | IMP-P3-005 | tests/unit/contexts/agent-contexts/test_approval_gate.py | PENDING |
| REQ-ARCH-017 | Invariant 9: Mandatory trade recording | SSOT-ARCH-01.10 | IMP-P3-007 | tests/unit/contexts/agent-contexts/test_journal_mandatory.py | PENDING |
| REQ-ARCH-018 | Invariant 10: Law 30 (Survival) overrides all | SSOT-ARCH-01.10 | IMP-P3-004 | tests/unit/contexts/agent-contexts/test_survival_override.py | PENDING |
| REQ-ARCH-019 | Four approval gates (G1-G4) | SSOT-ARCH-01.07 | IMP-P3-005, IMP-P6-009 | tests/unit/contexts/agent-contexts/test_approval_gates.py | PENDING |
| REQ-ARCH-020 | Configuration loader with YAML and hot-reload | SSOT-ARCH-01 | IMP-P1-012 | tests/unit/core/test_config_loader.py | PENDING |

### PCTT Pipeline Requirements (REQ-PCTT)

| REQ-ID | Description | SSOT Ref | IMP Task | Test ID | Status |
|--------|-------------|----------|----------|---------|--------|
| REQ-PCTT-001 | Stage 1: Pivot detection | SSOT-PCTT-01 | IMP-P2-001 | tests/unit/pctt/test_pivot_detection.py | PENDING |
| REQ-PCTT-002 | Stage 2: Candidate line generation | SSOT-PCTT-02 | IMP-P2-002 | tests/unit/pctt/test_candidate_lines.py | PENDING |
| REQ-PCTT-003 | Stage 3: Boundary estimation (Huber/RANSAC) | SSOT-PCTT-03 | IMP-P2-003 | tests/unit/pctt/test_boundary_estimation.py | PENDING |
| REQ-PCTT-004 | Stage 4: Q-Score scoring system | SSOT-PCTT-04 | IMP-P2-004 | tests/unit/pctt/test_q_score.py | PENDING |
| REQ-PCTT-005 | Stages 5/6: Regime detection ensemble (6 methods) | SSOT-PCTT-05, SSOT-PCTT-06 | IMP-P2-005 | tests/unit/pctt/test_regime_detection.py | PENDING |
| REQ-PCTT-006 | Stage 7: Break detection FSM | SSOT-PCTT-07 | IMP-P2-006 | tests/unit/pctt/test_break_detection.py | PENDING |
| REQ-PCTT-007 | Stage 8: Line freezing | SSOT-PCTT-08 | IMP-P2-007 | tests/unit/pctt/test_line_freezing.py | PENDING |
| REQ-PCTT-008 | Stages 9/10: Retest and rejection scoring | SSOT-PCTT-09, SSOT-PCTT-10 | IMP-P2-008 | tests/unit/pctt/test_retest_rejection.py | PENDING |
| REQ-PCTT-009 | Stage 11: Risk geometry filter (dGeom) | SSOT-PCTT-11 | IMP-P2-009 | tests/unit/pctt/test_risk_geometry.py | PENDING |
| REQ-PCTT-010 | Stage 12: Full pipeline orchestrator | SSOT-PCTT-12 | IMP-P2-011 | tests/unit/pctt/test_pipeline.py | PENDING |
| REQ-PCTT-011 | Non-repainting guarantee across all stages | SSOT-PCTT-01 to SSOT-PCTT-12 | IMP-P9-007 | tests/e2e/test_non_repainting_regression.py | PENDING |
| REQ-PCTT-012 | One-break-one-trade deduplication | SSOT-PCTT-09 | IMP-P2-006 | tests/unit/pctt/test_one_break_one_trade.py | PENDING |
| REQ-PCTT-013 | 5-phase hybrid trailing stop | SSOT-PCTT-12 | IMP-P2-010 | tests/unit/pctt/test_trailing_stop.py | PENDING |
| REQ-PCTT-014 | Regime-conditional parameter adaptation | SSOT-PCTT-05 | IMP-P2-005 | tests/unit/pctt/test_regime_params.py | PENDING |
| REQ-PCTT-015 | PCTT integration test (full pipeline end-to-end) | SSOT-PCTT-12 | IMP-P2-012 | tests/integration/test_pctt_pipeline.py | PENDING |

### Agent Requirements (REQ-AG)

| REQ-ID | Description | SSOT Ref | IMP Task | Test ID | Status |
|--------|-------------|----------|----------|---------|--------|
| REQ-AG-001 | BaseAgent abstract class with lifecycle hooks | SSOT-ARCH-01 | IMP-P1-006 | tests/unit/core/test_base_agent.py | PENDING |
| REQ-AG-002 | SentinelAgent: market data collection, session detection | SSOT-AG-01 | IMP-P3-001 | tests/unit/contexts/agent-contexts/test_sentinel.py | PENDING |
| REQ-AG-003 | SentinelAgent: tools (get_bars, get_news, scan_universe) | SSOT-AG-01.tools | IMP-P3-001 | tests/unit/contexts/agent-contexts/test_sentinel_tools.py | PENDING |
| REQ-AG-004 | SentinelAgent: guardrails (max 10 instruments, 5s cache) | SSOT-AG-01.guardrails | IMP-P3-001 | tests/unit/contexts/agent-contexts/test_sentinel_guardrails.py | PENDING |
| REQ-AG-005 | RegimeAgent: 6-method ensemble classification | SSOT-AG-02 | IMP-P3-002 | tests/unit/contexts/agent-contexts/test_regime.py | PENDING |
| REQ-AG-006 | RegimeAgent: tools (classify_regime, regime_history) | SSOT-AG-02.tools | IMP-P3-002 | tests/unit/contexts/agent-contexts/test_regime_tools.py | PENDING |
| REQ-AG-007 | RegimeAgent: guardrails (200-bar minimum, confidence threshold) | SSOT-AG-02.guardrails | IMP-P3-002 | tests/unit/contexts/agent-contexts/test_regime_guardrails.py | PENDING |
| REQ-AG-008 | SignalAgent: PCTT pipeline integration, trade proposal generation | SSOT-AG-03 | IMP-P3-003 | tests/unit/contexts/agent-contexts/test_signal.py | PENDING |
| REQ-AG-009 | SignalAgent: tools (run_pctt, score_candidate, emit_proposal) | SSOT-AG-03.tools | IMP-P3-003 | tests/unit/contexts/agent-contexts/test_signal_tools.py | PENDING |
| REQ-AG-010 | SignalAgent: guardrails (non-repainting, one-break-one-trade) | SSOT-AG-03.guardrails | IMP-P3-003 | tests/unit/contexts/agent-contexts/test_signal_guardrails.py | PENDING |
| REQ-AG-011 | RiskAgent: position sizing, heat management, circuit breakers | SSOT-AG-04 | IMP-P3-004 | tests/unit/contexts/agent-contexts/test_risk.py | PENDING |
| REQ-AG-012 | RiskAgent: tools (size_position, check_heat, circuit_breaker) | SSOT-AG-04.tools | IMP-P3-004 | tests/unit/contexts/agent-contexts/test_risk_tools.py | PENDING |
| REQ-AG-013 | RiskAgent: guardrails (2% max risk, 8% max heat, 5 correlated) | SSOT-AG-04.guardrails | IMP-P3-004 | tests/unit/contexts/agent-contexts/test_risk_guardrails.py | PENDING |
| REQ-AG-014 | OrchestratorAgent: agent coordination, mode management | SSOT-AG-05 | IMP-P3-005 | tests/unit/contexts/agent-contexts/test_orchestrator.py | PENDING |
| REQ-AG-015 | OrchestratorAgent: human approval gates (G1-G4) | SSOT-AG-05 | IMP-P3-005 | tests/unit/contexts/agent-contexts/test_orchestrator_gates.py | PENDING |
| REQ-AG-016 | OrchestratorAgent: guardrails (mode transitions, handoff rules) | SSOT-AG-05.guardrails | IMP-P3-005 | tests/unit/contexts/agent-contexts/test_orchestrator_guardrails.py | PENDING |
| REQ-AG-017 | ExecutionAgent: order management, broker communication | SSOT-AG-06 | IMP-P3-006 | tests/unit/contexts/agent-contexts/test_execution.py | PENDING |
| REQ-AG-018 | ExecutionAgent: tools (place_order, cancel_order, modify_order) | SSOT-AG-06.tools | IMP-P3-006 | tests/unit/contexts/agent-contexts/test_execution_tools.py | PENDING |
| REQ-AG-019 | ExecutionAgent: guardrails (stop required, daily loss limit) | SSOT-AG-06.guardrails | IMP-P3-006 | tests/unit/contexts/agent-contexts/test_execution_guardrails.py | PENDING |
| REQ-AG-020 | JournalAgent: trade recording, daily reports, edge decay | SSOT-AG-07 | IMP-P3-007 | tests/unit/contexts/agent-contexts/test_journal.py | PENDING |
| REQ-AG-021 | JournalAgent: tools (record_trade, generate_report, check_edge) | SSOT-AG-07.tools | IMP-P3-007 | tests/unit/contexts/agent-contexts/test_journal_tools.py | PENDING |
| REQ-AG-022 | CalibrationAgent: walk-forward optimization, Monte Carlo | SSOT-AG-08 | IMP-P3-008 | tests/unit/contexts/agent-contexts/test_calibration.py | PENDING |
| REQ-AG-023 | CalibrationAgent: tools (run_backtest, walk_forward, monte_carlo) | SSOT-AG-08 | IMP-P3-008 | tests/unit/contexts/agent-contexts/test_calibration_tools.py | PENDING |
| REQ-AG-024 | ResearchAgent: universe scanning, sector analysis | SSOT-AG-09 | IMP-P3-009 | tests/unit/contexts/agent-contexts/test_research.py | PENDING |
| REQ-AG-025 | ResearchAgent: tools (scan_universe, analyze_sector, screen) | SSOT-AG-09 | IMP-P3-009 | tests/unit/contexts/agent-contexts/test_research_tools.py | PENDING |
| REQ-AG-026 | TechnicalStrategyAgent: multi-timeframe analysis, law reasoning | SSOT-AG-10 | IMP-P3-010 | tests/unit/contexts/agent-contexts/test_tech_strategy.py | PENDING |
| REQ-AG-027 | TechnicalStrategyAgent: tools (analyze_structure, law_check) | SSOT-AG-10 | IMP-P3-010 | tests/unit/contexts/agent-contexts/test_tech_strategy_tools.py | PENDING |
| REQ-AG-028 | ReconciliationAgent: position verification, P&L reconciliation | SSOT-AG-11 | IMP-P3-011 | tests/unit/contexts/agent-contexts/test_reconciliation.py | PENDING |
| REQ-AG-029 | ReconciliationAgent: tools (reconcile_positions, verify_fills) | SSOT-AG-11 | IMP-P3-011 | tests/unit/contexts/agent-contexts/test_reconciliation_tools.py | PENDING |
| REQ-AG-030 | Full 11-agent integration test (handoffs, events, memory) | SSOT-AG-01 to SSOT-AG-11 | IMP-P3-014 | tests/integration/test_multi_agent.py | PENDING |

### Risk Requirements (REQ-RISK)

| REQ-ID | Description | SSOT Ref | IMP Task | Test ID | Status |
|--------|-------------|----------|----------|---------|--------|
| REQ-RISK-001 | ATR-based position sizing with Kelly criterion | SSOT-AG-04 | IMP-P3-004 | tests/unit/contexts/agent-contexts/test_position_sizing.py | PENDING |
| REQ-RISK-002 | Portfolio heat calculation and enforcement | SSOT-AG-04 | IMP-P3-004 | tests/unit/contexts/agent-contexts/test_portfolio_heat.py | PENDING |
| REQ-RISK-003 | Circuit breaker: daily loss limit | SSOT-AG-04 | IMP-P1-009 | tests/unit/core/test_circuit_breaker.py | PENDING |
| REQ-RISK-004 | Circuit breaker: consecutive loss streak | SSOT-AG-04 | IMP-P1-009 | tests/unit/core/test_circuit_breaker.py | PENDING |
| REQ-RISK-005 | Circuit breaker: drawdown halt at 20% | SSOT-ARCH-01.10 | IMP-P1-009 | tests/unit/core/test_circuit_breaker.py | PENDING |
| REQ-RISK-006 | Survival score calculation | SSOT-AG-04 | IMP-P3-004 | tests/unit/contexts/agent-contexts/test_survival_score.py | PENDING |
| REQ-RISK-007 | Drawdown scaling formula | SSOT-AG-04 | IMP-P3-004 | tests/unit/contexts/agent-contexts/test_drawdown_scaling.py | PENDING |
| REQ-RISK-008 | Correlation matrix for position limits | SSOT-AG-04 | IMP-P3-004 | tests/unit/contexts/agent-contexts/test_correlation_matrix.py | PENDING |
| REQ-RISK-009 | Crisis protocol (cut exposure 50%, max heat 3%) | SSOT-ARCH-01.09 | IMP-P3-005 | tests/unit/contexts/agent-contexts/test_crisis_protocol.py | PENDING |
| REQ-RISK-010 | Risk geometry filter (dGeom validation) | SSOT-PCTT-11 | IMP-P2-009 | tests/unit/pctt/test_risk_geometry.py | PENDING |
| REQ-RISK-011 | Maximum risk per trade 2% enforcement | SSOT-ARCH-01.10 | IMP-P3-004 | tests/unit/contexts/agent-contexts/test_risk_cap.py | PENDING |
| REQ-RISK-012 | Maximum correlated positions 5 enforcement | SSOT-ARCH-01.10 | IMP-P3-004 | tests/unit/contexts/agent-contexts/test_correlation_cap.py | PENDING |
| REQ-RISK-013 | Stop-loss required on every position | SSOT-ARCH-01.10 | IMP-P3-006 | tests/unit/contexts/agent-contexts/test_stop_required.py | PENDING |
| REQ-RISK-014 | Re-entry protocol after drawdown halt (5 sessions, MANUAL mode) | SSOT-ARCH-01.10 | IMP-P3-005 | tests/unit/contexts/agent-contexts/test_reentry_protocol.py | PENDING |
| REQ-RISK-015 | Fail-fast exit rules (Law 25) | SSOT-AG-06 | IMP-P3-006 | tests/unit/contexts/agent-contexts/test_fail_fast.py | PENDING |

### Database Requirements (REQ-DB)

| REQ-ID | Description | SSOT Ref | IMP Task | Test ID | Status |
|--------|-------------|----------|----------|---------|--------|
| REQ-DB-001 | PostgreSQL schema for trade records (cold storage) | SSOT-ARCH-03 | IMP-P4-001 | tests/unit/core/test_pg_schema.py | PENDING |
| REQ-DB-002 | SQLAlchemy async models for trades, sessions, metrics | SSOT-ARCH-03 | IMP-P4-002 | tests/unit/core/test_sqlalchemy_models.py | PENDING |
| REQ-DB-003 | Redis key schema for hot tier (positions, regime, bars) | SSOT-ARCH-03.02 | IMP-P4-003 | tests/unit/core/test_redis_keys.py | PENDING |
| REQ-DB-004 | Redis warm tier for agent memory (30-day window) | SSOT-ARCH-03.03 | IMP-P4-003 | tests/unit/core/test_redis_warm.py | PENDING |
| REQ-DB-005 | SQLite audit log (append-only ToolAuditLog) | SSOT-ARCH-03 | IMP-P4-004 | tests/unit/core/test_sqlite_audit.py | PENDING |
| REQ-DB-006 | Parquet archival for historical OHLCV data | SSOT-ARCH-03 | IMP-P4-005 | tests/unit/core/test_parquet.py | PENDING |
| REQ-DB-007 | Trade CRUD operations (create, read, update, query) | SSOT-ARCH-03 | IMP-P4-006 | tests/unit/core/test_trade_crud.py | PENDING |
| REQ-DB-008 | Metrics aggregation queries (P&L, drawdown, win rate) | SSOT-ARCH-03 | IMP-P4-007 | tests/unit/core/test_metrics_queries.py | PENDING |
| REQ-DB-009 | Memory tier migration (hot to warm to cold) | SSOT-ARCH-03.04 | IMP-P1-004 | tests/unit/core/test_memory_migration.py | PENDING |
| REQ-DB-010 | Database integration tests (PG + Redis + SQLite) | SSOT-ARCH-03 | IMP-P4-008 | tests/integration/test_database.py | PENDING |

### API Requirements (REQ-API)

| REQ-ID | Description | SSOT Ref | IMP Task | Test ID | Status |
|--------|-------------|----------|----------|---------|--------|
| REQ-API-001 | WebSocket server on 127.0.0.1:8765 | SSOT-UI-01 | IMP-P1-010 | tests/unit/core/test_ws_server.py | PENDING |
| REQ-API-002 | WebSocket message protocol (JSON envelope) | SSOT-ARCH-02.03 | IMP-P1-011 | tests/unit/core/test_ws_message.py | PENDING |
| REQ-API-003 | INIT payload with full system state snapshot | SSOT-UI-01 | IMP-P1-010 | tests/unit/core/test_init_payload.py | PENDING |
| REQ-API-004 | Broker adapter abstract class | SSOT-AG-06 | IMP-P5-001 | tests/unit/integrations/test_broker_adapter.py | PENDING |
| REQ-API-005 | IBKR TWS API adapter | SSOT-AG-06 | IMP-P5-002 | tests/unit/integrations/test_ibkr.py | PENDING |
| REQ-API-006 | Alpaca API adapter | SSOT-AG-06 | IMP-P5-003 | tests/unit/integrations/test_alpaca.py | PENDING |
| REQ-API-007 | Polygon.io data feed adapter | SSOT-AG-01 | IMP-P5-004 | tests/unit/integrations/test_polygon.py | PENDING |
| REQ-API-008 | Paper trading simulator | SSOT-AG-06 | IMP-P5-005 | tests/unit/integrations/test_paper_trading.py | PENDING |
| REQ-API-009 | Market data replay for backtesting | SSOT-AG-08 | IMP-P5-006 | tests/unit/integrations/test_data_replay.py | PENDING |
| REQ-API-010 | Connection health monitoring with auto-reconnect | SSOT-INF-01 | IMP-P5-007 | tests/unit/integrations/test_connection_health.py | PENDING |

### Frontend Requirements (REQ-UI)

| REQ-ID | Description | SSOT Ref | IMP Task | Test ID | Status |
|--------|-------------|----------|----------|---------|--------|
| REQ-UI-001 | Electron shell with Python child process management | SSOT-UI-01 | IMP-P6-001 | tests/e2e/test_electron_shell.py | PENDING |
| REQ-UI-002 | React 18 app skeleton with Recoil state management | SSOT-UI-01 | IMP-P6-002 | frontend/src/__tests__/app.test.tsx | PENDING |
| REQ-UI-003 | WebSocket hook (useWebSocket) with auto-reconnect | SSOT-UI-01 | IMP-P6-003 | frontend/src/__tests__/useWebSocket.test.tsx | PENDING |
| REQ-UI-004 | ChartBoard component with TradingView LWC v5 | SSOT-UI-02 | IMP-P6-004 | frontend/src/__tests__/ChartBoard.test.tsx | PENDING |
| REQ-UI-005 | Sidebar with agent status, watchlist, active alerts | SSOT-UI-01 | IMP-P6-005 | frontend/src/__tests__/Sidebar.test.tsx | PENDING |
| REQ-UI-006 | PositionPanel with real-time P&L, R-multiples | SSOT-UI-01 | IMP-P6-006 | frontend/src/__tests__/PositionPanel.test.tsx | PENDING |
| REQ-UI-007 | NotificationPanel with alert stream | SSOT-UI-04 | IMP-P6-007 | frontend/src/__tests__/NotificationPanel.test.tsx | PENDING |
| REQ-UI-008 | TopBar with mode indicator, connection status, clock | SSOT-UI-01 | IMP-P6-008 | frontend/src/__tests__/TopBar.test.tsx | PENDING |
| REQ-UI-009 | ApprovalDialog for trade entry/exit gates | SSOT-UI-01 | IMP-P6-009 | frontend/src/__tests__/ApprovalDialog.test.tsx | PENDING |
| REQ-UI-010 | ChatInterface for human-agent conversation | SSOT-UI-03 | IMP-P6-010 | frontend/src/__tests__/ChatInterface.test.tsx | PENDING |
| REQ-UI-011 | SettingsPanel for configuration management | SSOT-UI-01 | IMP-P6-011 | frontend/src/__tests__/SettingsPanel.test.tsx | PENDING |
| REQ-UI-012 | Frontend integration tests (component interactions) | SSOT-UI-01 to SSOT-UI-04 | IMP-P6-012 | frontend/src/__tests__/integration/ | PENDING |

### Security Requirements (REQ-SEC)

| REQ-ID | Description | SSOT Ref | IMP Task | Test ID | Status |
|--------|-------------|----------|----------|---------|--------|
| REQ-SEC-001 | 9-layer injection defense pipeline | SSOT-SEC-01 | IMP-P7-010 | tests/unit/security/test_injection_defense.py | PENDING |
| REQ-SEC-002 | Layer 1: Input sanitization (strip control chars) | SSOT-SEC-01 | IMP-P7-010 | tests/unit/security/test_input_sanitize.py | PENDING |
| REQ-SEC-003 | Layer 2: Schema validation (Pydantic) | SSOT-SEC-01 | IMP-P7-010 | tests/unit/security/test_schema_validation.py | PENDING |
| REQ-SEC-004 | Layer 3: Semantic boundary enforcement | SSOT-SEC-01 | IMP-P7-010 | tests/unit/security/test_semantic_boundary.py | PENDING |
| REQ-SEC-005 | Tool permission engine (per-agent ACL) | SSOT-SEC-02 | IMP-P7-001, IMP-P7-002 | tests/unit/security/test_tool_permissions.py | PENDING |
| REQ-SEC-006 | Permission escalation with human approval | SSOT-SEC-05 | IMP-P7-003 | tests/unit/security/test_permission_escalation.py | PENDING |
| REQ-SEC-007 | Tool rate limiter per agent | SSOT-SEC-02 | IMP-P7-004 | tests/unit/security/test_tool_rate_limiter.py | PENDING |
| REQ-SEC-008 | PDT compliance (day trade counting, margin) | SSOT-SEC-03 | IMP-P7-005 | tests/unit/security/test_pdt_compliance.py | PENDING |
| REQ-SEC-009 | Wash sale detection (30-day window) | SSOT-SEC-03 | IMP-P7-006 | tests/unit/security/test_wash_sale.py | PENDING |
| REQ-SEC-010 | Concentration limits enforcement | SSOT-SEC-03 | IMP-P7-007 | tests/unit/security/test_concentration.py | PENDING |
| REQ-SEC-011 | Trading hours enforcement (pre-market, RTH, after-hours) | SSOT-SEC-03 | IMP-P7-008 | tests/unit/security/test_trading_hours.py | PENDING |
| REQ-SEC-012 | Prop firm profile engine (configurable rule sets) | SSOT-SEC-03 | IMP-P7-009 | tests/unit/security/test_prop_firm.py | PENDING |
| REQ-SEC-013 | Output validation for LLM agent responses | SSOT-SEC-01 | IMP-P7-010 | tests/unit/security/test_output_validation.py | PENDING |
| REQ-SEC-014 | Electron CSP and context isolation | SSOT-UI-01 | IMP-P6-001 | tests/e2e/test_electron_security.py | PENDING |
| REQ-SEC-015 | Audit trail for all tool invocations | SSOT-SEC-02 | IMP-P1-007 | tests/unit/core/test_audit_entry.py | PENDING |

### Observability Requirements (REQ-OBS)

| REQ-ID | Description | SSOT Ref | IMP Task | Test ID | Status |
|--------|-------------|----------|----------|---------|--------|
| REQ-OBS-001 | OpenTelemetry trace instrumentation (all agents) | SSOT-INF-02 | IMP-P8-001 | tests/unit/core/test_otel_traces.py | PENDING |
| REQ-OBS-002 | Prometheus metrics export (latency, throughput, errors) | SSOT-INF-02 | IMP-P8-002 | tests/unit/core/test_prometheus.py | PENDING |
| REQ-OBS-003 | Jaeger/Tempo trace collection backend | SSOT-INF-02 | IMP-P8-003 | tests/integration/test_trace_collection.py | PENDING |
| REQ-OBS-004 | Structured JSON logging (structlog) | SSOT-INF-04 | IMP-P8-004 | tests/unit/core/test_structured_logging.py | PENDING |
| REQ-OBS-005 | Prompt management system (versioned templates) | SSOT-INF-03 | IMP-P8-005 | tests/unit/core/test_prompt_management.py | PENDING |
| REQ-OBS-006 | Health dashboard endpoint (/health, /metrics) | SSOT-INF-01 | IMP-P8-006 | tests/unit/server/test_health_endpoint.py | PENDING |
| REQ-OBS-007 | Agent decision trace logging | SSOT-INF-02 | IMP-P8-001 | tests/unit/core/test_decision_trace.py | PENDING |
| REQ-OBS-008 | Performance profiling infrastructure | SSOT-INF-01 | IMP-P10-001 | tests/integration/test_profiling.py | PENDING |

### Deployment & Hosting Requirements (REQ-DEP)

| REQ-ID | Description | SSOT Ref | IMP Task | Test ID | Status |
|--------|-------------|----------|----------|---------|--------|
| REQ-DEP-001 | Production Docker Compose with health checks | SSOT-INF-05 | IMP-P10-007 | tests/integration/test_docker_health.sh | PENDING |
| REQ-DEP-002 | Multi-stage Dockerfile (build + runtime) | SSOT-INF-05 | IMP-P10-007 | docker build --target test | PENDING |
| REQ-DEP-003 | Docker secrets management (no baked-in passwords) | SSOT-INF-05 | IMP-P10-007 | Manual review | PENDING |
| REQ-DEP-004 | PostgreSQL daily backup with 30-day retention | SSOT-INF-05 | IMP-P10-008 | tests/integration/test_backup_restore.sh | PENDING |
| REQ-DEP-005 | Redis RDB snapshot every 6 hours | SSOT-INF-05 | IMP-P10-008 | Manual verify crontab | PENDING |
| REQ-DEP-006 | Grafana monitoring dashboard provisioned | SSOT-INF-05 | IMP-P10-008 | Manual verify dashboard loads | PENDING |
| REQ-DEP-007 | Cloud deployment script (Hetzner/DigitalOcean) | SSOT-INF-05 | IMP-P10-009 | tests/integration/test_cloud_deploy.sh | PENDING |
| REQ-DEP-008 | Cloudflare Tunnel for secure remote access | SSOT-INF-05 | IMP-P10-009 | Manual verify tunnel | PENDING |
| REQ-DEP-009 | UFW firewall rules (SSH + Cloudflare only) | SSOT-INF-05 | IMP-P10-009 | Manual verify ufw status | PENDING |
| REQ-DEP-010 | Backup restore procedure tested end-to-end | SSOT-INF-05 | IMP-P10-008 | tests/integration/test_backup_restore.sh | PENDING |

### Law Implementation Requirements (REQ-LAW)

| REQ-ID | Law # | Law Name | Primary Agent(s) | SSOT Ref | IMP Task(s) | Test ID | Status |
|--------|-------|----------|-----------------|----------|-------------|---------|--------|
| REQ-LAW-001 | 1 | Market Inertia | Signal | SSOT-LAW-MATRIX, SSOT-AG-03 | IMP-P2-001, IMP-P2-003 | TC-SIG-001 | PENDING |
| REQ-LAW-002 | 2 | Feedback Loops | Signal | SSOT-LAW-MATRIX, SSOT-AG-03 | IMP-P2-003, IMP-P2-004 | TC-SIG-002 | PENDING |
| REQ-LAW-003 | 3 | Volatility Compression | Sentinel | SSOT-LAW-MATRIX, SSOT-AG-01 | IMP-P3-001 | TC-SEN-001 | PENDING |
| REQ-LAW-004 | 4 | Liquidity Gravity | Execution | SSOT-LAW-MATRIX, SSOT-AG-06 | IMP-P3-006, IMP-P2-009 | TC-EXE-001 | PENDING |
| REQ-LAW-005 | 5 | Mean Reversion | Signal | SSOT-LAW-MATRIX, SSOT-AG-03 | IMP-P2-004 | TC-SIG-003 | PENDING |
| REQ-LAW-006 | 6 | Fractal Structure | Signal | SSOT-LAW-MATRIX, SSOT-AG-03 | IMP-P2-001, IMP-P2-002 | TC-SIG-004 | PENDING |
| REQ-LAW-007 | 7 | Fat Tails | Risk | SSOT-LAW-MATRIX, SSOT-AG-04 | IMP-P3-004 | TC-RSK-001 | PENDING |
| REQ-LAW-008 | 8 | Market Regimes | Regime | SSOT-LAW-MATRIX, SSOT-AG-02 | IMP-P2-005, IMP-P3-002 | TC-REG-001 | PENDING |
| REQ-LAW-009 | 9 | Information Decay | Sentinel | SSOT-LAW-MATRIX, SSOT-AG-01 | IMP-P3-001 | TC-SEN-002 | PENDING |
| REQ-LAW-010 | 10 | Time Delays | Execution | SSOT-LAW-MATRIX, SSOT-AG-06 | IMP-P2-010, IMP-P3-006 | TC-EXE-002 | PENDING |
| REQ-LAW-011 | 11 | Structural Levels | Signal | SSOT-LAW-MATRIX, SSOT-AG-03 | IMP-P2-007 | TC-SIG-005 | PENDING |
| REQ-LAW-012 | 12 | Multi-TF Alignment | Signal | SSOT-LAW-MATRIX, SSOT-AG-03 | IMP-P2-008 | TC-SIG-006 | PENDING |
| REQ-LAW-013 | 13 | Momentum | Signal | SSOT-LAW-MATRIX, SSOT-AG-03 | IMP-P2-008 | TC-SIG-007 | PENDING |
| REQ-LAW-014 | 14 | Path Dependency | Execution | SSOT-LAW-MATRIX, SSOT-AG-06 | IMP-P3-006 | TC-EXE-003 | PENDING |
| REQ-LAW-015 | 15 | Signal Filtration | Signal | SSOT-LAW-MATRIX, SSOT-AG-03 | IMP-P2-011 | TC-SIG-008 | PENDING |
| REQ-LAW-016 | 16 | Expectancy | Journal | SSOT-LAW-MATRIX, SSOT-AG-07 | IMP-P3-007 | TC-JRN-001 | PENDING |
| REQ-LAW-017 | 17 | Statistical Significance | Journal, Calibration | SSOT-LAW-MATRIX, SSOT-AG-07, SSOT-AG-08 | IMP-P3-007, IMP-P3-008 | TC-CAL-001 | PENDING |
| REQ-LAW-018 | 18 | Confirmation | Signal | SSOT-LAW-MATRIX, SSOT-AG-03 | IMP-P2-006 | TC-SIG-009 | PENDING |
| REQ-LAW-019 | 19 | Edge Decay | Regime, Calibration | SSOT-LAW-MATRIX, SSOT-AG-02, SSOT-AG-08 | IMP-P3-002, IMP-P3-008 | TC-REG-002 | PENDING |
| REQ-LAW-020 | 20 | Backtest Illusion | Calibration | SSOT-LAW-MATRIX, SSOT-AG-08 | IMP-P3-008 | TC-CAL-002 | PENDING |
| REQ-LAW-021 | 21 | Position Sizing | Risk | SSOT-LAW-MATRIX, SSOT-AG-04 | IMP-P3-004 | TC-RSK-002 | PENDING |
| REQ-LAW-022 | 22 | Invalidation | Risk | SSOT-LAW-MATRIX, SSOT-AG-04 | IMP-P3-004 | TC-RSK-003 | PENDING |
| REQ-LAW-023 | 23 | Asymmetric Damage | Risk | SSOT-LAW-MATRIX, SSOT-AG-04 | IMP-P3-004 | TC-RSK-004 | PENDING |
| REQ-LAW-024 | 24 | Systemic Correlation | Sentinel, Research | SSOT-LAW-MATRIX, SSOT-AG-01, SSOT-AG-09 | IMP-P3-001, IMP-P3-009 | TC-RES-001 | PENDING |
| REQ-LAW-025 | 25 | Transaction Costs | Execution | SSOT-LAW-MATRIX, SSOT-AG-06 | IMP-P3-006 | TC-EXE-004 | PENDING |
| REQ-LAW-026 | 26 | Complexity Decay | Risk | SSOT-LAW-MATRIX, SSOT-AG-04 | IMP-P3-004 | TC-RSK-005 | PENDING |
| REQ-LAW-027 | 27 | Emotional Gravity | Journal | SSOT-LAW-MATRIX, SSOT-AG-07 | IMP-P3-007 | TC-JRN-002 | PENDING |
| REQ-LAW-028 | 28 | Adaptation | Sentinel, Orchestrator | SSOT-LAW-MATRIX, SSOT-AG-01, SSOT-AG-05 | IMP-P3-001, IMP-P3-005 | TC-ORC-001 | PENDING |
| REQ-LAW-029 | 29 | Probability of Ruin | Risk | SSOT-LAW-MATRIX, SSOT-AG-04 | IMP-P3-004 | TC-RSK-006 | PENDING |
| REQ-LAW-030 | 30 | Survival | Risk, Orchestrator | SSOT-LAW-MATRIX, SSOT-AG-04, SSOT-AG-05 | IMP-P3-004, IMP-P3-005 | TC-RSK-007 | PENDING |

### Phase 11 Enhancement Requirements (PROG-REQ)

| REQ-ID | Description | SSOT Ref | IMP Task | Test ID | Status |
|--------|-------------|----------|----------|---------|--------|
| PROG-REQ-196 | Transaction cost model with slippage, commission, spread | SSOT-FRM-09 | IMP-P11-001 | TST-P11-001 | TODO |
| PROG-REQ-197 | Transaction cost integration in Risk Agent sizing | SSOT-FRM-09 | IMP-P11-002 | TST-P11-002 | TODO |
| PROG-REQ-198 | Q-Score empirical calibration (Platt scaling) | SSOT-FRM-10 | IMP-P11-003 | TST-P11-003 | TODO |
| PROG-REQ-199 | Adaptive risk feedback from rolling performance | SSOT-FRM-11 | IMP-P11-004 | TST-P11-004 | TODO |
| PROG-REQ-200 | Boundary re-estimation protocol (freeze between pivots) | SSOT-PCTT-BOUNDARY-PROTOCOL | IMP-P11-013 | TST-P11-013 | TODO |
| PROG-REQ-201 | Overnight gap stress test at 15:55 ET | SSOT-RISK-OVERNIGHT | IMP-P11-005 | TST-P11-005 | TODO |
| PROG-REQ-202 | Edge decay detection (3 detectors, 2-of-3 trigger) | SSOT-AG-EDGE-DECAY | IMP-P11-007 | TST-P11-007 | TODO |
| PROG-REQ-203 | Weighted regime ensemble (7 methods, accuracy weights) | SSOT-REGIME-ENHANCED | IMP-P11-008 | TST-P11-008 | TODO |
| PROG-REQ-204 | Regime confidence integration with risk sizing | SSOT-REGIME-ENHANCED | IMP-P11-009 | TST-P11-009 | TODO |
| PROG-REQ-205 | Trailing stop phase transition priority order | SSOT-PCTT-TRAILING-ENHANCED | IMP-P11-010 | TST-P11-010 | TODO |
| PROG-REQ-206 | Regime-dependent partial exit and time stop | SSOT-PCTT-TRAILING-ENHANCED | IMP-P11-011 | TST-P11-011 | TODO |
| PROG-REQ-207 | Statistical calibration (100K bootstrap, Sortino, FDR) | SSOT-STAT-ENHANCED | IMP-P11-012 | TST-P11-012 | TODO |
| PROG-REQ-208 | Historical data acquisition pipeline | SSOT-DATA-PIPELINE | IMP-P11-014 | TST-P11-014 | TODO |
| PROG-REQ-209 | Data quality validation (missing bars < 1%) | SSOT-DATA-PIPELINE | IMP-P11-014 | TST-P11-014 | TODO |
| PROG-REQ-210 | Bar consolidation (1min to 5min/1H/4H/Daily) | SSOT-DATA-PIPELINE | IMP-P11-015 | TST-P11-015 | TODO |
| PROG-REQ-211 | Market calendar system with holidays and sessions | SSOT-DATA-PIPELINE | IMP-P11-016 | TST-P11-016 | TODO |
| PROG-REQ-212 | Incident response framework (P0-P3 classification) | SSOT-OPS-INCIDENT | IMP-P11-017 | TST-P11-017 | TODO |
| PROG-REQ-213 | Pre-market validation checklist (12 checks) | SSOT-OPS-INCIDENT | IMP-P11-018 | TST-P11-018 | TODO |
| PROG-REQ-214 | Multi-timeframe HTF alignment gate | SSOT-TRAIL-HTF | IMP-P11-019 | TST-P11-019 | TODO |
| PROG-REQ-215 | TransactionCost and OvernightStress UI widgets | SSOT-UI-05 | IMP-P11-021 | TST-P11-021 | TODO |
| PROG-REQ-216 | EdgeDecay, RegimeConfidence, IncidentBanner components | SSOT-UI-05 | IMP-P11-022 | TST-P11-022 | TODO |
| PROG-REQ-217 | Chart overlays for HTF, boundary, trailing phase, edge decay | SSOT-UI-06 | IMP-P11-023 | TST-P11-023 | TODO |
| PROG-REQ-218 | Risk Dynamics dashboard tab with sparkline | SSOT-UI-07 | IMP-P11-024 | TST-P11-024 | TODO |
| PROG-REQ-219 | Trade History panel with equity curve and performance stats | SSOT-UI-08 | IMP-P11-025 | TST-P11-025 | TODO |

<!-- /PROG-REQ-MATRIX -->

---

<!-- PROG-CL -->

## PROG-CL: Changelog

### 2026-02-23
- [INIT] Created SSOT.md (Batch 1A: META + ARCH + AG-01 to AG-07)
- [INIT] Created SSOT-batch1b.md (AG-08 to AG-11 + PCTT Pipeline)
- [INIT] Created SSOT-batch1c.md (DC-REGISTRY + EVT-REGISTRY + TOOL-REGISTRY)
- [INIT] Created SSOT-batch2a.md (CFG + FRM + DB + API)
- [INIT] Created SSOT-batch2b.md (UI + SEC + INF + DEP + LAW + FILE-MANIFEST)
- [INIT] Created IMPLEMENTATION-PLAN.md (108 tasks across 11 phases)
- [INIT] Created PROGRESS-TRACKER.md (this document)

| ID | Date | Change | Details |
|----|------|--------|---------|
| PROG-CL-008 | 2026-02-23 | Expert review completed | Three parallel review agents analyzed SSOT, Implementation Plan, and PCTT pipeline. Identified 28 gaps across critical/high/moderate severity. |
| PROG-CL-009 | 2026-02-23 | Phase 11 added to Implementation Plan | 20 new tasks (IMP-P11-001 through IMP-P11-020) addressing all expert review findings. Estimated 120-180 additional hours. |
| PROG-CL-010 | 2026-02-23 | SSOT-enhancements.md created | 12 new SSOT sections with complete specifications: transaction costs, Q-Score calibration, adaptive risk, boundary protocol, overnight stress, edge decay, regime enhancement, trailing stop fixes, statistical calibration, data pipeline, incident response, HTF alignment. |
| PROG-CL-011 | 2026-02-23 | Project total updated | 128 tasks (108 original + 20 Phase 11), estimated 800-1000 hours total. 214 requirements tracked. |
| PROG-CL-012 | 2026-02-23 | UI enhancements for Phase 11 | Added 4 new SSOT-UI sections (05-08), 6 new frontend tasks (IMP-P11-021 through IMP-P11-026), 9 Recoil atoms, 10 WebSocket message types, 8 new components, 6 chart overlays. |
| PROG-CL-013 | 2026-02-23 | Hosting & deployment strategy added | New SSOT-INF-05 section with 4-phase deployment strategy (Local Dev, Local Production, Cloud Single-Tenant on Hetzner, Cloud Multi-Tenant on AWS). 3 new IMP tasks (P10-007 through P10-009): production Docker Compose, backup/monitoring, cloud deployment automation. 10 new deployment requirements (REQ-DEP-001 through REQ-DEP-010). Hosting anti-patterns documented (Supabase, Vercel, Lambda, etc.). Phase 10 expanded from 6 to 9 tasks. Project total: 137 tasks, 229 requirements. |

<!-- /PROG-CL -->

---

<!-- PROG-RISK -->

## PROG-RISK: Risk Register

| ID | Risk | Severity | Impact | Mitigation | Status |
|----|------|----------|--------|------------|--------|
| PROG-RISK-001 | IBKR API Rate Limits | HIGH | API throttling could delay order placement during volatile markets | Implement request queuing, respect pacing violations, use snapshot data | OPEN |
| PROG-RISK-002 | Redis Single Point of Failure | MEDIUM | Redis crash loses hot tier memory | Redis Sentinel for HA, warm tier fallback, periodic snapshots | OPEN |
| PROG-RISK-003 | PDT Rule Edge Cases | HIGH | Complex day trade counting with partial fills, multi-leg | Comprehensive unit tests, manual verification period | OPEN |
| PROG-RISK-004 | TradingView LWC Breaking Changes | MEDIUM | LWC v5 API changes could break chart rendering | Pin exact version, monitor changelog, abstraction layer | OPEN |
| PROG-RISK-005 | Scope Creep | HIGH | Feature requests beyond 30-law architecture | Strict SSOT adherence, change request process | OPEN |
| PROG-RISK-006 | Regime Detection Latency | MEDIUM | 6-method ensemble may be too slow for real-time | Pre-compute on bar close, cache results, profile bottlenecks | OPEN |
| PROG-RISK-007 | Prompt Injection Surface | HIGH | LLM-powered agents vulnerable to injection via market data or news | 9-layer defense pipeline, input sanitization, output validation | OPEN |
| PROG-RISK-008 | Prop Firm Rule Changes | LOW | Prop firms change rules without notice | Configurable profiles, regular review schedule | OPEN |
| PROG-RISK-009 | Market Data Gaps | MEDIUM | Polygon.io outages or missing bars | Gap detection, interpolation, fallback to IBKR historical | OPEN |
| PROG-RISK-010 | WebSocket Reconnection | MEDIUM | Frontend disconnects during critical approval windows | Auto-reconnect with state sync, queued approvals, timeout handling | OPEN |
| PROG-RISK-011 | Python 3.11 Compatibility | LOW | Some dependencies may not support 3.11 | Test all dependencies early in P0, have fallback versions | OPEN |
| PROG-RISK-012 | Electron Security | MEDIUM | Desktop app security (CSP, node integration) | Strict CSP, context isolation, no nodeIntegration in renderer | OPEN |
| PROG-RISK-013 | Transaction cost modeling inaccuracy | HIGH | Slippage model may not match real market conditions, leading to oversized positions | Calibrate slippage model monthly from live fill data; compare modeled vs actual costs | OPEN |
| PROG-RISK-014 | Q-Score calibration overfitting | MEDIUM | Platt scaling on small sample may overfit to training data | Require minimum 200 trades for calibration; validate on holdout set; monitor Brier score | OPEN |
| PROG-RISK-015 | Overnight gap exceeding stress test scenarios | HIGH | Black swan event (>10% gap) exceeds worst-case scenario in stress test | Include 15% and 20% gap scenarios quarterly; auto-flatten if overnight positions exceed 50% of equity | OPEN |
| PROG-RISK-016 | Edge decay detection lag | MEDIUM | 20-trade window means 5+ losing trades before detection | Add forward-looking indicators (regime change, vol expansion) as early warning | OPEN |
| PROG-RISK-017 | Historical data quality from Polygon.io | MEDIUM | Corporate actions, splits, or gaps in historical data corrupt backtests | Validate all data before use; cross-check against Yahoo Finance for critical dates | OPEN |

<!-- /PROG-RISK -->

---

<!-- PROG-DEC -->

## PROG-DEC: Decision Log

| ID | Date | Decision | Alternatives Considered | Rationale |
|----|------|----------|------------------------|-----------|
| PROG-DEC-001 | 2026-02-23 | Hybrid BaseAgent Framework | Custom BaseAgent vs pure OpenAI Swarm vs LangGraph | Custom hybrid: Swarm-style handoffs with custom tool permissions and memory tiers. Provides maximum control over trading-specific requirements. |
| PROG-DEC-002 | 2026-02-23 | Redis Pub/Sub for Events | Redis vs RabbitMQ vs Kafka vs ZeroMQ | Redis: already needed for hot tier cache, Pub/Sub sufficient for single-machine deployment, simpler ops. |
| PROG-DEC-003 | 2026-02-23 | Electron + React Frontend | Electron vs Tauri vs Web-only | Electron: mature ecosystem, TradingView LWC integration proven, Python process management via child_process. |
| PROG-DEC-004 | 2026-02-23 | PostgreSQL Cold Storage | PostgreSQL vs MongoDB vs DuckDB | PostgreSQL: ACID compliance for trade records, mature tooling, excellent JSON support for flexible schemas. |
| PROG-DEC-005 | 2026-02-23 | Python 3.11+ Backend | Python vs TypeScript vs Rust | Python: existing formula codebase, rich data science ecosystem, async support via asyncio, team expertise. |
| PROG-DEC-006 | 2026-02-23 | TradingView Lightweight Charts v5 | TradingView LWC vs D3.js vs Plotly vs custom WebGL | LWC: purpose-built for financial charts, small bundle, well-documented API, native candlestick support. |
| PROG-DEC-007 | 2026-02-23 | Monorepo Structure | Monorepo vs separate repos per component | Monorepo: shared types, atomic commits, simpler CI, single version control for SSOT alignment. |
| PROG-DEC-008 | 2026-02-23 | IBKR Primary + Alpaca Secondary | IBKR only vs Alpaca only vs both | Both: IBKR for production (best execution, most instruments), Alpaca for development (free paper trading, simpler API). |
| PROG-DEC-009 | 2026-02-23 | 11-Agent Architecture | 7 original + 4 extended agents vs fewer agents | 11 agents: separation of concerns, each agent testable independently, clear law-to-agent mapping, manageable complexity. |
| PROG-DEC-010 | 2026-02-23 | 9-Layer Injection Defense | Simple input validation vs multi-layer defense | 9 layers: defense in depth for LLM-powered system, each layer catches different attack vectors, audit trail at every layer. |
| PROG-DEC-011 | 2026-02-23 | Add Phase 11 for critical enhancements | Skip enhancements vs address before production | Expert review identified 7 critical, 10 high, 11 moderate gaps. Phase 11 (20 tasks) created to address all gaps before production deployment. All 3 review agents (architecture, implementation, pipeline) concurred. |
| PROG-DEC-012 | 2026-02-23 | Use Platt scaling for Q-Score calibration | Arbitrary sigmoid scale=3.0 vs Platt scaling vs isotonic regression | Replace arbitrary sigmoid scale=3.0 with data-driven Platt scaling. Isotonic regression as fallback if Platt fails validation. Pipeline review finding 1.1. |
| PROG-DEC-013 | 2026-02-23 | Use Sortino ratio over Sharpe as primary objective | Sharpe ratio vs Sortino ratio vs Calmar ratio | Trading returns have positive skew; Sharpe penalizes upside volatility. Sortino only penalizes downside risk. Pipeline review finding 10.1. |
| PROG-DEC-014 | 2026-02-23 | Weighted regime ensemble (7 methods) | Equal-weight 6-method voting vs accuracy-weighted 7-method ensemble | Replace equal-weight 6-method voting with accuracy-weighted 7-method ensemble. Add ACF as 7th method. Reduce Hurst weight to 0.05 due to short-window unreliability. Pipeline review finding 2.1. |
| PROG-DEC-015 | 2026-02-23 | Boundary re-estimation only on new pivot | Re-estimate on every bar vs re-estimate on new pivot only | Eliminate ambiguity in non-repainting guarantee. Boundaries frozen between pivot confirmations. ATR constraint uses ATR at estimation time. Pipeline review finding 4.1. |

<!-- /PROG-DEC -->

---

<!-- PROG-SPR -->

## PROG-SPR: Sprint/Iteration Tracking

### Sprint 1 (Target: Phase 0 Complete)
- Start Date: TBD
- End Date: TBD
- Tasks: IMP-P0-001 through IMP-P0-008
- Status: NOT STARTED
- Notes:

### Sprint 2 (Target: Phase 1 Complete)
- Start Date: TBD
- End Date: TBD
- Tasks: IMP-P1-001 through IMP-P1-015
- Status: NOT STARTED
- Notes:

### Sprint 3 (Target: Phase 2 Complete)
- Start Date: TBD
- End Date: TBD
- Tasks: IMP-P2-001 through IMP-P2-012
- Status: NOT STARTED
- Notes:

### Sprint 4 (Target: Phase 3 Complete)
- Start Date: TBD
- End Date: TBD
- Tasks: IMP-P3-001 through IMP-P3-014
- Status: NOT STARTED
- Notes:

### Sprint 5 (Target: Phase 4 + 5 Complete)
- Start Date: TBD
- End Date: TBD
- Tasks: IMP-P4-001 through IMP-P4-008, IMP-P5-001 through IMP-P5-008
- Status: NOT STARTED
- Notes:

### Sprint 6 (Target: Phase 6 Complete)
- Start Date: TBD
- End Date: TBD
- Tasks: IMP-P6-001 through IMP-P6-012
- Status: NOT STARTED
- Notes:

### Sprint 7 (Target: Phase 7 + 8 Complete)
- Start Date: TBD
- End Date: TBD
- Tasks: IMP-P7-001 through IMP-P7-010, IMP-P8-001 through IMP-P8-006
- Status: NOT STARTED
- Notes:

### Sprint 8 (Target: Phase 9 + 10 Complete)
- Start Date: TBD
- End Date: TBD
- Tasks: IMP-P9-001 through IMP-P9-008, IMP-P10-001 through IMP-P10-006
- Status: NOT STARTED
- Notes:

<!-- /PROG-SPR -->

---

<!-- PROG-BLK -->

## PROG-BLK: Blocking Issues Log

| ID | Date | Description | Blocked Tasks | Resolution | Status |
|----|------|-------------|---------------|------------|--------|
| | | | | | |

<!-- /PROG-BLK -->

---

<!-- PROG-TST -->

## PROG-TST: Test Results Tracking

| Test Suite | Last Run | Pass | Fail | Skip | Coverage % | Notes |
|------------|----------|------|------|------|------------|-------|
| tests/unit/core/ | Never | 0 | 0 | 0 | 0% | Core framework: event bus, memory, base agent, config, health check |
| tests/unit/pctt/ | Never | 0 | 0 | 0 | 0% | PCTT pipeline: all 12 stages, trailing stop, non-repainting |
| tests/unit/contexts/agent-contexts/ | Never | 0 | 0 | 0 | 0% | All 11 agents: tools, guardrails, events, workflows |
| tests/unit/integrations/ | Never | 0 | 0 | 0 | 0% | Broker adapters, data feeds, paper trading simulator |
| tests/unit/security/ | Never | 0 | 0 | 0 | 0% | Injection defense, permissions, compliance, PDT, wash sale |
| tests/unit/server/ | Never | 0 | 0 | 0 | 0% | WebSocket server, REST endpoints, health dashboard |
| tests/integration/ | Never | 0 | 0 | 0 | 0% | Multi-agent pipeline, database, startup/shutdown, traces |
| tests/e2e/ | Never | 0 | 0 | 0 | 0% | Paper trading simulation, chaos testing, compliance, stress tests |
| frontend/src/__tests__/ | Never | 0 | 0 | 0 | 0% | React components, WebSocket hook, Recoil state, chart rendering |

<!-- /PROG-TST -->

---

<!-- PROG-INT -->

## PROG-INT: Integration Verification Status

| Integration Point | SSOT Ref | Test | Status | Last Verified |
|-------------------|----------|------|--------|---------------|
| SentinelAgent to EventBus | SSOT-AG-01.events, SSOT-ARCH-02 | tests/integration/test_agent_events.py | NOT TESTED | Never |
| RegimeAgent to EventBus | SSOT-AG-02.events, SSOT-ARCH-02 | tests/integration/test_agent_events.py | NOT TESTED | Never |
| SignalAgent to EventBus | SSOT-AG-03.events, SSOT-ARCH-02 | tests/integration/test_agent_events.py | NOT TESTED | Never |
| RiskAgent to EventBus | SSOT-AG-04.events, SSOT-ARCH-02 | tests/integration/test_agent_events.py | NOT TESTED | Never |
| OrchestratorAgent to EventBus | SSOT-AG-05.events, SSOT-ARCH-02 | tests/integration/test_agent_events.py | NOT TESTED | Never |
| ExecutionAgent to EventBus | SSOT-AG-06.events, SSOT-ARCH-02 | tests/integration/test_agent_events.py | NOT TESTED | Never |
| JournalAgent to EventBus | SSOT-AG-07.events, SSOT-ARCH-02 | tests/integration/test_agent_events.py | NOT TESTED | Never |
| CalibrationAgent to EventBus | SSOT-AG-08, SSOT-ARCH-02 | tests/integration/test_agent_events.py | NOT TESTED | Never |
| ResearchAgent to EventBus | SSOT-AG-09, SSOT-ARCH-02 | tests/integration/test_agent_events.py | NOT TESTED | Never |
| TechnicalStrategyAgent to EventBus | SSOT-AG-10, SSOT-ARCH-02 | tests/integration/test_agent_events.py | NOT TESTED | Never |
| ReconciliationAgent to EventBus | SSOT-AG-11, SSOT-ARCH-02 | tests/integration/test_agent_events.py | NOT TESTED | Never |
| Agent-to-Agent Handoffs | SSOT-ARCH-02.02 | tests/integration/test_handoffs.py | NOT TESTED | Never |
| Backend to Redis (hot tier) | SSOT-ARCH-03.02 | tests/integration/test_redis.py | NOT TESTED | Never |
| Backend to Redis (warm tier) | SSOT-ARCH-03.03 | tests/integration/test_redis.py | NOT TESTED | Never |
| Backend to PostgreSQL (cold tier) | SSOT-ARCH-03.04 | tests/integration/test_postgres.py | NOT TESTED | Never |
| Backend to SQLite (audit log) | SSOT-ARCH-03 | tests/integration/test_sqlite_audit.py | NOT TESTED | Never |
| Backend to IBKR Broker | SSOT-AG-06 | tests/integration/test_ibkr_broker.py | NOT TESTED | Never |
| Backend to Alpaca Broker | SSOT-AG-06 | tests/integration/test_alpaca_broker.py | NOT TESTED | Never |
| Backend to Polygon.io DataFeed | SSOT-AG-01 | tests/integration/test_polygon_data.py | NOT TESTED | Never |
| Backend to Frontend (WebSocket) | SSOT-UI-01, SSOT-ARCH-02.03 | tests/integration/test_websocket.py | NOT TESTED | Never |
| Frontend to Chart (TradingView LWC) | SSOT-UI-02 | frontend/src/__tests__/ChartBoard.test.tsx | NOT TESTED | Never |
| Frontend to Recoil State | SSOT-UI-01 | frontend/src/__tests__/state.test.tsx | NOT TESTED | Never |

<!-- /PROG-INT -->

---

<!-- PROG-DEP-CHECKLIST -->

## PROG-DEP-CHECKLIST: Deployment Readiness Checklist

1. [ ] All Phase 0 tasks pass acceptance criteria (IMP-P0-001 through IMP-P0-008)
2. [ ] All Phase 1 tasks pass acceptance criteria (IMP-P1-001 through IMP-P1-015)
3. [ ] All Phase 2 tasks pass acceptance criteria (IMP-P2-001 through IMP-P2-012)
4. [ ] All Phase 3 tasks pass acceptance criteria (IMP-P3-001 through IMP-P3-014)
5. [ ] All Phase 4 tasks pass acceptance criteria (IMP-P4-001 through IMP-P4-008)
6. [ ] All Phase 5 tasks pass acceptance criteria (IMP-P5-001 through IMP-P5-008)
7. [ ] All Phase 6 tasks pass acceptance criteria (IMP-P6-001 through IMP-P6-012)
8. [ ] All Phase 7 tasks pass acceptance criteria (IMP-P7-001 through IMP-P7-010)
9. [ ] All Phase 8 tasks pass acceptance criteria (IMP-P8-001 through IMP-P8-006)
10. [ ] All Phase 9 tasks pass acceptance criteria (IMP-P9-001 through IMP-P9-008)
11. [ ] All Phase 10 tasks pass acceptance criteria (IMP-P10-001 through IMP-P10-006)
12. [ ] All Phase 11 tasks pass acceptance criteria (IMP-P11-001 through IMP-P11-026)
12. [ ] Backend unit test coverage >= 85%
13. [ ] PCTT pipeline test coverage >= 90%
14. [ ] Frontend unit test coverage >= 80%
15. [ ] Security test coverage >= 90%
16. [ ] Integration test coverage >= 75%
17. [ ] E2E test coverage >= 60%
18. [ ] No critical or high severity bugs open
19. [ ] All 10 system invariants verified with dedicated test cases (SSOT-ARCH-01.10)
20. [ ] PCTT pipeline latency < 50ms per bar on single instrument
21. [ ] Agent health check cycle completes in < 30 seconds
22. [ ] WebSocket message round-trip < 100ms
23. [ ] Redis memory usage < 500MB under peak load
24. [ ] Security review complete: 9-layer injection defense validated
25. [ ] PDT compliance verified with edge case test suite
26. [ ] Wash sale detection verified with 30-day window scenarios
27. [ ] Prop firm profile engine tested with at least 3 profile configurations
28. [ ] Deployment documentation written (IMP-P10-005)
29. [ ] Configuration validation tool passes all config files (IMP-P10-004)
30. [ ] Electron installer built and tested on Windows 10+ (IMP-P10-003)
41. [ ] Production Docker Compose starts all services with health checks (IMP-P10-007)
42. [ ] Backup scripts tested: PostgreSQL, Redis, Parquet (IMP-P10-008)
43. [ ] Grafana monitoring dashboard provisioned with agent health panels (IMP-P10-008)
44. [ ] Cloud deployment script tested on fresh Ubuntu 22.04 (IMP-P10-009)
45. [ ] Cloudflare Tunnel configured for secure remote WebSocket access (IMP-P10-009)
31. [ ] Paper trading simulation ran successfully for full trading session (IMP-P9-001)
32. [ ] Broker failover tested (IBKR to Alpaca) (IMP-P9-005)
33. [ ] Circuit breaker cascade test passed (IMP-P9-006)
34. [ ] Non-repainting regression suite passed (IMP-P9-007)
35. [ ] Memory leak detection passed 8-hour soak test (IMP-P10-002)
36. [ ] All agent system prompts match SSOT verbatim
37. [ ] All YAML config files validated against Pydantic schemas
38. [ ] OpenTelemetry traces verified end-to-end (agent to Jaeger/Tempo)
39. [ ] Structured logging verified with JSON output format
40. [ ] Final system validation passed (IMP-P10-006)

<!-- /PROG-DEP-CHECKLIST -->
