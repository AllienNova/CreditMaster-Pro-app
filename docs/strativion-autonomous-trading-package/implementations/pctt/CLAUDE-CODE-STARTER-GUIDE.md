# Claude Code Starter Guide: Building the Strativion PCTT Platform

This document tells you exactly how to use Claude Code to build the Strativion PCTT multi-agent trading platform from start to finish. It assumes you have the complete specification files (SSOT, IMPLEMENTATION-PLAN, PROGRESS-TRACKER, CLAUDE.md) already in place. Every prompt in this guide is copy-paste ready.

---

## Part 1: Before You Start

### Required Software

Install the following before opening Claude Code:

| Software | Version | Purpose |
|----------|---------|---------|
| Python | 3.11+ (not 3.14) | Backend, agents, formulas, PCTT pipeline |
| Node.js | 20+ | Frontend, Electron shell, TypeScript PCTT engine |
| Redis | 7.x | Event bus (Pub/Sub) and warm memory tier |
| PostgreSQL | 16 | Cold storage for trades, audit, analytics |
| Docker Desktop | Latest | Run Redis and PostgreSQL in containers during dev |
| Git | Latest | Version control |
| Claude Code | Latest | Your AI development partner |

### Environment File

Create `C:\Users\khono\Laws of Trading Book\Strativion\PCTT\.env` with the following variables. Fill in real values when you have them. Placeholder values are fine for starting.

```env
# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=strativion
POSTGRES_USER=strativion
POSTGRES_PASSWORD=dev_password_change_me

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Broker API Keys (leave blank until Phase 5)
IBKR_HOST=
IBKR_PORT=
ALPACA_API_KEY=
ALPACA_SECRET_KEY=
POLYGON_API_KEY=

# Operating Mode
TRADING_MODE=MANUAL
LOG_LEVEL=DEBUG
```

### Verify Your Setup

Open a terminal and confirm each tool is accessible:

```bash
python --version        # Should show 3.11.x or 3.12.x
node --version          # Should show 20.x+
docker --version        # Should show Docker Desktop
redis-cli ping          # Should show PONG (if Redis is running)
psql --version          # Should show 16.x
claude --version        # Should show Claude Code version
```

### Start Infrastructure

Launch Redis and PostgreSQL using Docker:

```bash
cd "C:\Users\khono\Laws of Trading Book\Strativion\PCTT"
docker compose up -d
```

If you do not have a `docker-compose.yml` yet, Claude Code will create one in Phase 0.

### Navigate to the Project

All Claude Code sessions should start from this directory:

```
C:\Users\khono\Laws of Trading Book\Strativion\
```

Open Claude Code in that directory. All paths in the SSOT and implementation plan are relative to this location.

---

## Part 2: Your First Session

### The First Prompt

When you open Claude Code for the first time on this project, give it this exact prompt:

```
I'm starting development on the Strativion PCTT multi-agent trading platform.
Read CLAUDE.md, then read implementations/pctt/IMPLEMENTATION-PLAN.md and implementations/pctt/PROGRESS-TRACKER.md.
Give me a status summary: which phases are complete, which tasks are done, and
what the next task to implement is.
```

Claude Code will read all three files and give you a clear picture of where things stand.

### Using the /bootstrap Skill

The `/bootstrap` skill scaffolds directories, boilerplate files, and test stubs from the SSOT. Run it at the start of any major new subsystem. To invoke it:

```
/bootstrap
```

Claude Code will read the SSOT, determine the directory structure from `IMP-META-04`, and create the skeleton. It does not write implementation logic. It creates the folders, empty `__init__.py` files, stub classes, and placeholder tests.

### Reading the Session Context Summary

After `/bootstrap` or any session start, Claude Code will report:

1. **Files created or verified** with counts
2. **Current phase and task** from the progress tracker
3. **Blocking dependencies** if any exist
4. **Suggested next action** based on the dependency graph

If the summary mentions missing SSOT files, verify all six batch files exist in `implementations/pctt/`.

### Understanding the Phase Dependency Graph

Phases must be completed in order. Within each phase, tasks have explicit dependencies. The rule is simple: a task cannot start until every task in its "Depends On" field has passed its acceptance criteria.

```
P0 (Scaffolding) -> P1 (Core Framework) -> P2 (PCTT Engine)
                                         -> P3 (Agents, depends on P1)
                                         -> P4 (Database, depends on P1)
P2 + P3 + P4 -> P5 (Broker Integrations)
P5 -> P6 (Frontend)
P1 -> P7 (Security, can run parallel to P2/P3)
P1 -> P8 (Observability, can run parallel to P2/P3)
P5 + P6 + P7 + P8 -> P9 (Integration Testing)
P9 -> P10 (Hardening)
P10 -> P11 (Enhancements)
```

### Picking Your First Task

If the project is brand new, your first task is `IMP-P0-001`. If work has already started, use the `/progress` skill to find the next incomplete task.

---

## Part 3: Building Phase by Phase

### Phase 0: Project Scaffolding (8 tasks, ~10 hours)

**What gets built:** The repository directory structure, `requirements.txt`, `package.json` files for frontend and Electron, pytest/vitest configuration, CI pipeline skeleton, `docker-compose.yml`, and copying of existing Strativion config/rules/contexts/knowledge/formula files into the new structure.

**Prompt to start Phase 0:**

```
Start Phase 0 scaffolding. Read implementations/pctt/IMPLEMENTATION-PLAN.md section "Phase 0: Project Scaffolding".
Implement IMP-P0-001 through IMP-P0-008 sequentially. For each task:
1. Read the task spec and its acceptance criteria
2. Create all output files listed
3. Run the test commands to verify
4. Report pass/fail on each acceptance criterion
After all 8 tasks, run /validate on the directory structure.
```

**Watch for:**
- The directory structure must match `IMP-META-04` exactly. Every folder and `__init__.py` matters.
- `requirements.txt` must have pinned versions matching `IMP-META-03`.
- Existing formula files (`implementations/python-formulas/*.py`) must be copied, not rewritten.

**Verify phase complete:**

```
Run /progress and confirm all P0 tasks show DONE. Then run:
pytest --collect-only  (should find 0 errors)
cd implementations/pctt/engine && npm install && npx tsc --noEmit  (should compile clean)
docker compose up -d && docker compose ps  (Redis and Postgres healthy)
```

---

### Phase 1: Core Framework (15 tasks, ~50 hours)

**What gets built:** The foundational layer that every agent and pipeline stage depends on. Enums, dataclasses, the Redis event bus wrapper, 3-tier memory system, BaseAgent abstract class, agent registry, config loader, law loader, shared state manager, audit trail writer, health checks, circuit breakers, and the WebSocket server.

**Prompt to start Phase 1:**

```
Start Phase 1: Core Framework. Read implementations/pctt/IMPLEMENTATION-PLAN.md Phase 1 section.
Begin with IMP-P1-001 (Core Enums). For each task, read the SSOT tags listed
in the task's "SSOT References" field before writing any code. Use /ssot-lookup
to pull the exact specifications. Implement one task at a time, run its test
commands, then move to the next.
```

**Prompt for the critical BaseAgent task (IMP-P1-006):**

```
Implement IMP-P1-006: BaseAgent Abstract Class. This is the most important class
in the system. Read [AG-01] through [AG-11] in the SSOT to understand what all
agents need. Read the 10 invariants in CLAUDE.md. The BaseAgent must enforce:
- Event-driven communication only (Invariant #3)
- Audit entry on every state mutation (Invariant #5)
- Circuit breaker integration (Invariant #6)
- Graceful degradation to MANUAL mode (Invariant #10)
Run /validate on src/core/base_agent.py when done.
```

**Watch for:**
- The event bus must use Redis Pub/Sub, not direct function calls between agents.
- Memory tier latency targets: hot < 1ms, warm < 10ms, cold < 100ms.
- Hot-to-warm sync must happen within 100ms (Invariant #4).
- All monetary values must use Python `Decimal`, never `float`.

**Verify phase complete:**

```
Run IMP-P1-015 (Phase 1 Integration Test). This test verifies that
BaseAgent -> EventBus -> Memory -> Audit all work together. Run:
pytest tests/core/ -v --tb=short
pytest tests/integration/test_phase1.py -v
Confirm all pass. Then run /progress.
```

---

### Phase 2: PCTT Engine (12 tasks, ~80 hours)

**What gets built:** The 12-stage PCTT pipeline in Python. Pivot detection, candidate line generation, Huber/RANSAC boundary estimation, Q-Score sigmoid scoring, multi-timeframe confluence, regime gating, break detection FSM, line freezing, retest detection, rejection scoring, risk geometry filter, and the entry signal generator. Also the 5-phase hybrid trailing stop and the pipeline orchestrator.

**Prompt to start Phase 2:**

```
Start Phase 2: PCTT Engine. This is the mathematical core of the system.
Begin with IMP-P2-001 (Pivot Detection). For each stage, read the corresponding
SSOT tag [PCTT-01] through [PCTT-12] using /ssot-lookup. Every stage function
must be pure: deterministic, no side effects, no future data access.
After each stage, run /pctt-check to verify non-repainting.
```

**Prompt for the critical Q-Score task (IMP-P2-004):**

```
Implement IMP-P2-004: Q-Score Scoring with Sigmoid. Read [PCTT-04] from the SSOT.
This is the quality scoring system for candidate trendlines. It uses a sigmoid
function to combine multiple quality metrics into a single 0-1 score. Include
property-based tests using hypothesis to verify monotonicity: higher quality
inputs must always produce higher scores.
```

**Watch for:**
- Non-repainting is the most critical constraint. Every stage must process bars left to right. No stage may look ahead.
- Huber and RANSAC regression (Stage 3) requires scipy and scikit-learn. Verify imports work.
- The pipeline orchestrator (IMP-P2-011) must call stages in strict order 1 through 12.
- All math must use numpy arrays for performance.

**Verify phase complete:**

```
Run IMP-P2-012 (PCTT Engine Integration Test + Non-Repainting Verification).
This is the most important test in the entire system. It runs the full pipeline
on N bars, then runs it on N+M bars, and verifies the first N results are
identical. Run:
pytest tests/pctt/ -v --tb=short
Run /pctt-check to confirm all 12 stages pass.
```

---

### Phase 3: Agent Implementation (14 tasks, ~70 hours)

**What gets built:** All 11 agents: Sentinel, Regime, Signal, Risk, Orchestrator, Execution, Journal, Calibration, Research, Technical Strategy, and Reconciliation. Also ports existing formula modules and runs multi-agent integration tests.

**Prompt to start Phase 3:**

```
Start Phase 3: Agent Implementation. Begin with IMP-P3-001 (SentinelAgent).
For each agent, read its SSOT spec [AG-01] through [AG-11] using /ssot-lookup.
Every agent must extend BaseAgent, communicate only through the event bus,
and include all tools listed in its SSOT spec. After each agent, run /test-agent
to verify event emission and tool permissions.
```

**Prompt for the critical Risk Agent (IMP-P3-004):**

```
Implement IMP-P3-004: RiskAgent. THIS IS THE MOST SAFETY-CRITICAL COMPONENT.
Read [AG-04] from the SSOT. The Risk Agent has absolute veto authority over
all trades (Invariant #1). Position size must never exceed Kelly/4 (Invariant #2).
Include tests that verify:
1. No trade can bypass RiskAgent.approve()
2. Kelly fraction is always divided by 4
3. Risk Agent can veto any trade regardless of other approvals
4. Daily/weekly/monthly loss limits trigger position reduction
Use /review-code on src/contexts/agent-contexts/risk.py with extra scrutiny when done.
```

**Watch for:**
- Every agent must handle circuit breaker tripping (Invariant #6).
- The Orchestrator (AG-05) manages the 4 approval gates. Verify gate sequencing.
- Risk Agent veto is absolute. No code path may bypass it.
- Event types must match the EVT definitions in SSOT-batch1c.md.

**Verify phase complete:**

```
Run IMP-P3-013 (Multi-Agent Pipeline Test) and IMP-P3-014 (Full 11-Agent
Integration Test). These tests spin up all 11 agents, feed market data through
the Sentinel, and verify the full pipeline from data ingestion to trade signal.
pytest tests/contexts/agent-contexts/ -v --tb=short
pytest tests/integration/test_multi_agent.py -v
Run /progress to confirm all P3 tasks are DONE.
```

---

### Phase 4: Database and Persistence (8 tasks, ~30 hours)

**What gets built:** PostgreSQL schema and migrations, SQLAlchemy async models, Redis key schema implementation, SQLite audit log, Parquet archival pipeline, trade CRUD operations, and metrics aggregation queries.

**Prompt to start Phase 4:**

```
Start Phase 4: Database and Persistence. Read implementations/pctt/IMPLEMENTATION-PLAN.md Phase 4.
Begin with IMP-P4-001 (PostgreSQL Schema). All database operations must be async.
Use SQLAlchemy 2.0+ with asyncpg. All migrations must be reversible using Alembic.
Redis keys must use namespaced prefixes (strativion:agent:sentinel:*).
```

**Watch for:**
- All monetary values in the schema must be NUMERIC/DECIMAL, never FLOAT.
- Redis key namespacing is mandatory: `strativion:{domain}:{entity}:{key}`.
- Parquet archival must preserve full precision. No lossy compression on price data.
- SQLite audit log is append-only. No UPDATE or DELETE operations.

**Verify phase complete:**

```
Run IMP-P4-008 (Database Integration Tests).
pytest tests/database/ -v --tb=short
Verify Alembic migrations run forward and backward:
alembic upgrade head && alembic downgrade base && alembic upgrade head
```

---

### Phase 5: Broker and Data Integrations (8 tasks, ~40 hours)

**What gets built:** Abstract broker adapter, IBKR TWS adapter, Alpaca adapter, Polygon.io market data adapter, paper trading simulator (mock broker), market data replay engine, and connection health monitoring.

**Prompt to start Phase 5:**

```
Start Phase 5: Broker and Data Integrations. Begin with IMP-P5-001 (Broker
Adapter Abstract Class). This defines the interface all broker adapters implement.
Then implement the paper trading simulator (IMP-P5-005) before the real broker
adapters, so we can test without live connections.
```

**Watch for:**
- The paper trading simulator is your primary testing tool going forward. Make it realistic: simulate fills with slippage, partial fills, and latency.
- IBKR and Alpaca adapters need proper connection management with reconnection logic.
- All broker adapters must emit events through the event bus, not call agents directly.
- Never commit real API keys. Use `.env` and environment variables.

**Verify phase complete:**

```
Run IMP-P5-008 (Integration Tests with Mock Broker).
pytest tests/integrations/ -v --tb=short
Verify the paper trading simulator can execute a full trade lifecycle:
market data -> signal -> approval -> execution -> fill -> journal entry.
```

---

### Phase 6: Frontend (12 tasks, ~60 hours)

**What gets built:** Electron shell that spawns the Python backend, React app with Recoil state management, WebSocket connection hook, TradingView chart component, sidebar with agent status cards and chat, position panel, notification panel, top bar, approval dialog, chat interface with intent classification, and settings panel.

**Prompt to start Phase 6:**

```
Start Phase 6: Frontend. Begin with IMP-P6-001 (Electron Shell + Python Process
Spawning). The Electron app must spawn the Python FastAPI server as a child
process and connect via WebSocket. Then build the React skeleton (IMP-P6-002)
with Recoil atoms for all global state.
```

**Prompt for the chart component (IMP-P6-004):**

```
Implement IMP-P6-004: ChartBoard Component using TradingView Lightweight Charts v5.
Read [UI-xxx] from SSOT-batch2b.md for the chart spec. The chart must render
OHLCV candles with PCTT trendline overlays, pivot markers, and trade annotations.
All data flows through the WebSocket hook, not direct API calls.
```

**Watch for:**
- The Electron shell must handle Python process lifecycle: start, health check, restart on crash.
- WebSocket reconnection logic is critical. The frontend must auto-reconnect with backoff.
- TradingView LWC v5 has breaking changes from v4. Use the v5 API only.
- Recoil atoms must be structured by domain: chart, agents, positions, settings.

**Verify phase complete:**

```
Run IMP-P6-012 (Frontend Integration Tests).
cd frontend && npm test
Launch the Electron app and verify:
1. Python backend starts and WebSocket connects
2. Charts render with sample data
3. Agent status cards show all 11 agents
4. Chat panel accepts input
```

---

### Phase 7: Security and Compliance (10 tasks, ~40 hours)

**What gets built:** 4-level tool permission engine, per-agent ACL matrix, permission escalation manager, tool rate limiter, PDT compliance rule, wash sale detection, concentration limit checker, trading hours enforcement, prop firm profile engine, and the 9-layer injection defense pipeline.

**Prompt to start Phase 7:**

```
Start Phase 7: Security and Compliance. Begin with IMP-P7-001 (Tool Permission
Engine). Read [SEC-xxx] tags from SSOT-batch2b.md. Security is non-negotiable.
Every tool invocation must pass permission verification (Invariant #9).
Compliance checks are hard gates (Invariant #8): PDT, wash sale, and
concentration limits block trades before execution.
```

**Watch for:**
- PDT rule: if account is under $25,000, block the 4th day trade within 5 business days.
- Wash sale detection: flag re-entry within 30 days of a loss realization.
- Concentration limits: no single position can exceed configured percentage of portfolio.
- The 9-layer injection defense protects the chat interface from prompt injection.
- All compliance failures must be logged to the audit trail.

**Verify phase complete:**

```
Write test cases that attempt to bypass each compliance rule. Every bypass
attempt must fail. Run:
pytest tests/security/ -v --tb=short
pytest tests/compliance/ -v --tb=short
```

---

### Phase 8: Observability (6 tasks, ~20 hours)

**What gets built:** OpenTelemetry instrumentation on all agents and pipeline stages, Prometheus metrics export, Jaeger/Tempo trace collection, structured JSON logging with correlation IDs, prompt management system, and a health dashboard endpoint.

**Prompt to start Phase 8:**

```
Start Phase 8: Observability. Read implementations/pctt/IMPLEMENTATION-PLAN.md Phase 8 section.
Begin with IMP-P8-001 (OpenTelemetry Instrumentation). Every agent method
and pipeline stage must produce spans. Correlation IDs must flow from the
initial market data event through the entire processing chain to the
final trade execution.
```

**Watch for:**
- Correlation IDs are essential for debugging. A single market event must be traceable through all 11 agents.
- Prometheus metrics must include: agent health, event bus throughput, pipeline stage latency, memory tier usage.
- Structured logs must use JSON format with consistent field names.
- The health dashboard aggregates status from all agents, memory tiers, and broker connections.

**Verify phase complete:**

```
Run /validate on all observability modules. Then start the system and verify:
1. /health endpoint returns status of all components
2. /metrics endpoint returns Prometheus-formatted metrics
3. Structured logs contain correlation IDs
pytest tests/observability/ -v --tb=short
```

---

### Phase 9: Integration and E2E Testing (8 tasks, ~50 hours)

**What gets built:** End-to-end paper trading simulation, multi-agent chaos testing, compliance rule verification suite, WebSocket stress tests, broker failover tests, circuit breaker cascade tests, non-repainting regression suite, and coverage report generation.

**Prompt to start Phase 9:**

```
Start Phase 9: Integration and E2E Testing. This phase validates the entire
system works together. Begin with IMP-P9-001 (End-to-End Paper Trading
Simulation). Feed 30 days of historical data through the system and verify
every component from Sentinel data ingestion through Execution fill to
Journal recording produces correct results.
```

**Prompt for chaos testing (IMP-P9-002):**

```
Implement IMP-P9-002: Multi-Agent Chaos Testing. Create tests that randomly
kill agents, drop Redis connections, inject corrupt data, and simulate
PostgreSQL timeouts. The system must degrade gracefully to MANUAL mode
(Invariant #10) and never execute an unauthorized trade (Invariant #1).
```

**Watch for:**
- The E2E paper trading sim is your proof that the system works. It must complete a full trading day without errors.
- Chaos tests must verify all 10 invariants hold under failure conditions.
- Coverage report should show 85%+ backend line coverage.
- Non-repainting regression tests must run on multiple historical data sets.

**Verify phase complete:**

```
Run the full test suite:
pytest tests/ -v --tb=short --cov=src --cov-report=html
Open htmlcov/index.html and verify 85%+ coverage.
Run /progress and confirm all P9 tasks show DONE.
```

---

### Phase 10: Hardening and Deployment (6 tasks, ~25 hours)

**What gets built:** Performance profiling with hot-path optimization, memory leak detection and fixes, Electron Windows installer build, configuration validation tool, deployment documentation, and the final system validation checklist.

**Prompt to start Phase 10:**

```
Start Phase 10: Hardening and Deployment. Begin with IMP-P10-001 (Performance
Profiling). Profile the PCTT pipeline and agent event processing. Identify
and optimize any hot paths that exceed latency targets: pipeline < 50ms
per bar, event bus < 5ms per event, hot memory < 1ms per read.
```

**Watch for:**
- Memory leaks in long-running agents. Run the system for 8+ simulated hours and monitor memory.
- The Electron build must package the Python backend, all config files, knowledge files, and rules.
- The configuration validation tool must catch invalid YAML, missing required fields, and out-of-range values before the system starts.

**Verify phase complete:**

```
Build the Electron installer:
cd desktop && npm run build
Run the installer on a clean Windows machine (or VM).
Verify the application launches, connects to Redis and PostgreSQL,
and completes a paper trading session.
```

---

### Phase 11: Critical Enhancements (26 tasks, ~80 hours)

**What gets built:** Transaction cost model, Q-Score empirical calibration, adaptive risk feedback, overnight gap stress tests, edge decay detection, weighted regime ensemble, trailing stop enhancements, partial exit mechanics, statistical calibration, boundary re-estimation protocol, historical data acquisition, bar consolidation, market calendar, incident response framework, pre-market validation checklist, multi-timeframe alignment gate, and corresponding UI widgets for all new features.

**Prompt to start Phase 11:**

```
Start Phase 11: Critical Enhancements. Read implementations/pctt/SSOT-enhancements.md for
all enhancement specifications. Begin with IMP-P11-001 (Transaction Cost Model).
These enhancements make the system production-ready. Implement one task at a
time, running /validate after each.
```

**Watch for:**
- Transaction cost integration (IMP-P11-001 and IMP-P11-002) changes how the Risk Agent sizes positions. Run the full invariant test suite after integration.
- Q-Score calibration (IMP-P11-003) adjusts the sigmoid parameters based on historical performance. Verify the calibration does not break existing Q-Score tests.
- The UI widgets (IMP-P11-021 through IMP-P11-026) must integrate with existing Recoil atoms.

**Verify phase complete:**

```
Run IMP-P11-020 (Phase 11 Integration Tests).
pytest tests/ -v --tb=short --cov=src --cov-report=term-missing
Run the full E2E paper trading sim with all enhancements enabled.
Run /progress and confirm all 128 tasks show DONE.
```

---

## Part 4: Daily Workflow

### Starting a Session

Every time you open Claude Code for this project, start with:

```
/bootstrap
```

This reads the CLAUDE.md, scans the project state, and loads context. It tells you where you left off and what to work on next.

If you know what you want to work on, you can be more specific:

```
Read implementations/pctt/PROGRESS-TRACKER.md and tell me the next incomplete task.
Then read implementations/pctt/IMPLEMENTATION-PLAN.md for that task's full spec.
```

### The Implement-Validate-Progress Loop

This is your core development cycle. Repeat it for every task:

1. **Implement:** `/implement IMP-Px-NNN`
2. **Validate:** `/validate` on all created/modified files
3. **Test:** Run the task's test commands from the implementation plan
4. **Progress:** `/progress` to update and view status

Do not skip validation. Do not batch multiple tasks without validating between them.

### When to Use Each Skill

| Skill | When to Use |
|-------|-------------|
| `/bootstrap` | Start of every session |
| `/implement` | To build a specific IMP task |
| `/validate` | After creating or modifying any file |
| `/test-agent` | After implementing any agent (AG-01 through AG-11) |
| `/pctt-check` | After implementing or modifying any PCTT pipeline stage |
| `/review-code` | After completing an entire module (all files in a directory) |
| `/progress` | After completing a task, or to check status |
| `/ssot-lookup` | When you need the exact specification for any SSOT tag |
| `/add-tool` | When adding a new tool to an existing agent |
| `/add-agent` | When scaffolding a new agent from scratch |

### Committing Work

Commit after completing each task. Use this format:

```
Commit the changes for IMP-P1-005. Use the commit message format from CLAUDE.md:
[IMP-P1-005] followed by a description and Refs: tags.
```

Claude Code will format the commit message correctly, listing all SSOT tags referenced by the changed files.

### Ending a Session

Before closing Claude Code:

```
/progress
```

This saves the current state to `PROGRESS-TRACKER.md` so your next session picks up exactly where you left off.

---

## Part 5: Troubleshooting and Tips

### "Claude Code lost context mid-task"

Long sessions degrade context quality. Fix it:

```
/bootstrap
/ssot-lookup [TAG-NN]
```

Replace `[TAG-NN]` with the SSOT tags relevant to your current task. This reloads the specifications into context.

### "A test is failing"

Paste the full error output and ask Claude Code to fix it:

```
This test is failing. Here is the error output:

[paste the full pytest or vitest output here]

Read the relevant source file and fix the issue. Then run the test again.
```

### "I want to skip a task"

Check the task's "Blocks" field in the implementation plan. Any task listed there cannot start until this task is done. If skipping would block downstream work, you must implement it first. If nothing depends on it, you can skip it and return later.

```
Read IMP-Px-NNN in implementations/pctt/IMPLEMENTATION-PLAN.md. Show me what tasks it blocks.
Can I safely skip it and come back later?
```

### "I want to modify the architecture"

Never modify code first. Update the specification, then implement:

```
I want to change [describe the change]. First, update the relevant section
in implementations/pctt/SSOT.md (or the appropriate batch file). Show me the diff of the
SSOT change before implementing anything.
```

### "Claude Code is generating code that doesn't match the SSOT"

Run a code review pointing to the specific discrepancy:

```
/review-code src/contexts/agent-contexts/risk.py
Compare against [AG-04] in the SSOT. I see a discrepancy in [describe what
doesn't match]. Fix the implementation to match the specification exactly.
```

### "How do I add a new feature not in the SSOT?"

Add it to the enhancement specification first:

```
I want to add [describe feature]. First, add a specification for it in
implementations/pctt/SSOT-enhancements.md following the existing format. Include SSOT tags,
dataclass definitions, event types, and acceptance criteria. Then /implement it.
```

### Performance Tips

1. **One task at a time.** Do not ask Claude Code to implement 5 tasks simultaneously. Context quality drops sharply.
2. **Start fresh every 3 to 4 hours.** Long sessions accumulate context noise. Close Claude Code, reopen, and run `/bootstrap`.
3. **Use /ssot-lookup instead of pasting specs.** Let Claude Code read the SSOT directly rather than copying large specification blocks into your prompt.
4. **Keep prompts focused.** "Implement IMP-P2-004" is better than "Implement the Q-Score system and also the regime gate and maybe the break detection too."
5. **Review generated code.** Claude Code is your co-developer, not an autonomous agent. Read what it produces, especially for Risk Agent and compliance modules.

### Context Management

Claude Code works within a context window. The SSOT files for this project total over 15,000 lines. Claude Code cannot hold all of them simultaneously. The skill system (`/ssot-lookup`, `/bootstrap`) manages this by loading only what is needed. Trust the skill system to manage context. Do not try to paste entire SSOT files into prompts.

---

## Part 6: Starter Prompts Library

### Session Start Prompts

**Fresh session bootstrap:**
```
/bootstrap
```

**Resume from where I left off:**
```
Read implementations/pctt/PROGRESS-TRACKER.md. What is the next incomplete task? Show me its
full spec from implementations/pctt/IMPLEMENTATION-PLAN.md and list any dependencies that
must be complete first.
```

**Start a specific phase:**
```
I want to start Phase 3 (Agent Implementation). Read implementations/pctt/IMPLEMENTATION-PLAN.md
Phase 3 section. Verify all Phase 1 dependencies are complete by checking
implementations/pctt/PROGRESS-TRACKER.md. Then begin with the first P3 task.
```

**Resume a partially complete phase:**
```
Read implementations/pctt/PROGRESS-TRACKER.md. Show me all tasks in Phase 2 and their status.
Start the next incomplete task.
```

---

### Implementation Prompts

**Implement a single task:**
```
/implement IMP-P2-004
```

**Implement with full SSOT context:**
```
Implement IMP-P2-004. First, run /ssot-lookup [PCTT-04] to read the full
Q-Score specification. Then implement src/pctt/stage04_qscore.py following
the spec exactly. Include type annotations, Google-style docstrings with
SSOT tag references, and property-based tests using hypothesis.
```

**Implement all tasks in a phase sequentially:**
```
Implement all tasks in Phase 4 sequentially, starting from IMP-P4-001.
For each task: read the spec, implement, run test commands, report pass/fail.
Do not start the next task until the current one passes all acceptance criteria.
```

**Implement with extra caution (for safety-critical modules):**
```
Implement IMP-P3-004 (RiskAgent). This is safety-critical.
Before writing any code, list all 10 system invariants and identify which ones
this agent must enforce. Then implement with explicit invariant checks in the
code. Write negative tests: attempts to bypass the Risk Agent must fail.
Run /review-code when done with maximum scrutiny.
```

**Implement a task and its dependencies together:**
```
I want to implement IMP-P3-003 (SignalAgent). Check its dependencies.
If any are incomplete, implement those first. Then implement the SignalAgent.
Show me the dependency chain before starting.
```

---

### Review and Validation Prompts

**Full module review:**
```
/review-code src/pctt/
Review all PCTT pipeline stage files against their SSOT specifications.
Check: SSOT tag references, type annotations, non-repainting compliance,
pure function requirements, and test coverage.
```

**Security audit of a specific area:**
```
Review src/security/ for vulnerabilities. Check:
1. Tool permission checks cannot be bypassed
2. PDT rule has no edge cases that allow a 4th day trade
3. Wash sale detection covers all re-entry patterns within 30 days
4. Injection defense handles all 9 attack layers
5. No SQL injection in database queries
```

**PCTT pipeline integrity check:**
```
/pctt-check
Verify all 12 pipeline stages:
1. Process bars in strict left-to-right order
2. No stage reads future bars
3. Output of stage N becomes input of stage N+1
4. Pipeline produces identical results for the first N bars regardless
   of whether N+1 through N+M bars are also present
```

**Cross-agent integration review:**
```
Review the event flow between all 11 agents. For each event type in
SSOT-batch1c.md, verify:
1. Exactly one agent emits it
2. All expected subscribers handle it
3. Event payload matches the DC definition
4. No agent calls another agent directly (bypassing the event bus)
```

**Invariant compliance audit:**
```
Run a full invariant compliance check across the entire codebase.
For each of the 10 invariants in CLAUDE.md, search for any code path
that could violate it. Report findings with file paths and line numbers.
```

---

### Testing Prompts

**Run all tests for a module:**
```
Run all tests for the PCTT pipeline:
pytest tests/pctt/ -v --tb=short
Report any failures with the specific test name and error message.
```

**Run the full test suite:**
```
Run the complete test suite with coverage:
pytest tests/ -v --tb=short --cov=src --cov-report=term-missing
Report total coverage percentage and any modules below 85%.
```

**Generate missing tests for a file:**
```
Read src/contexts/agent-contexts/sentinel.py. Check tests/contexts/agent-contexts/test_sentinel.py.
Identify any public methods or event handlers that lack test coverage.
Generate tests for all uncovered code paths. Include positive tests,
negative tests, and edge cases.
```

**Run non-repainting verification:**
```
Run the non-repainting test suite for all PCTT stages:
pytest tests/pctt/test_non_repainting.py -v --tb=long
If any stage fails, show me the specific bar index where the output diverged.
```

**Property-based testing for a formula:**
```
Read implementations/python-formulas/position_sizing.py. Write hypothesis property-based tests that
verify: Kelly fraction is always between 0 and 1, position size never exceeds
Kelly/4, position size is zero when win rate or payoff ratio is zero, and
position size increases monotonically with win rate (holding payoff constant).
```

---

### Debugging Prompts

**Investigate a failing test:**
```
This test is failing:

[paste error output]

Read the test file and the source file it tests. Identify the root cause.
Fix the source code (not the test) unless the test itself has a bug.
Run the test again to confirm the fix.
```

**Trace an event through the system:**
```
Trace the lifecycle of a trade signal event. Starting from when the
SignalAgent emits a signal, show me every agent that processes it,
every event that is emitted, and every state mutation that occurs,
all the way through to execution or rejection. Reference specific
file paths and line numbers.
```

**Find why an agent is not responding correctly:**
```
The [AgentName] agent is not responding to [EventType] events.
Check:
1. Is it subscribed to the correct Redis channel?
2. Does the event payload match the expected dataclass?
3. Is the circuit breaker tripped?
4. Is there an exception being swallowed silently?
Read the agent source and its test file. Add debug logging if needed.
```

**Memory leak investigation:**
```
Run the system for a simulated 8-hour trading session using the paper
trading simulator. Monitor memory usage of each agent process.
Identify any objects that accumulate without being released.
Check for: unclosed database connections, growing event queues,
unbounded caches in hot memory.
```

---

### Architecture Prompts

**Look up any SSOT section:**
```
/ssot-lookup [AG-04]
```

**Look up multiple related tags:**
```
/ssot-lookup [PCTT-07] [PCTT-08] [PCTT-09]
Show me how break detection, line freezing, and retest detection
connect to each other.
```

**Compare implementation against spec:**
```
Read src/contexts/agent-contexts/risk.py and run /ssot-lookup [AG-04].
Create a compliance table: for each requirement in the SSOT spec,
show whether the implementation satisfies it (PASS/FAIL) with the
specific line number where it is implemented or missing.
```

**Find all code referencing a specific law:**
```
Search the entire codebase for references to Law 21 (Position Sizing).
Show me every file that mentions Law 21, [LAW-21], or position_sizing
in any context: code, comments, configuration, or knowledge files.
```

**Map event flow for a specific scenario:**
```
Map the complete event flow for this scenario: Sentinel detects an anomaly
in AAPL price data. Show every event emitted, every agent that processes
each event, and the final outcome. Use the event definitions from
SSOT-batch1c.md.
```

---

### Progress and Status Prompts

**Show current progress:**
```
/progress
```

**Detailed progress with blocking analysis:**
```
Read implementations/pctt/PROGRESS-TRACKER.md. Show:
1. Percentage complete by phase
2. Total tasks done / total tasks
3. Currently blocked tasks and what blocks them
4. Suggested next 3 tasks to work on (considering dependencies)
```

**What should I work on next?**
```
Read implementations/pctt/PROGRESS-TRACKER.md and implementations/pctt/IMPLEMENTATION-PLAN.md.
What is the highest-priority unblocked task? Consider:
1. Tasks that unblock the most downstream work
2. Tasks in the current phase before moving to the next
3. Complexity (prefer finishing smaller tasks to maintain momentum)
```

**Show blocking issues:**
```
Read implementations/pctt/PROGRESS-TRACKER.md. List every task that is marked BLOCKED.
For each blocked task, show what it is waiting on and how close those
dependencies are to completion.
```

**End-of-week summary:**
```
Read implementations/pctt/PROGRESS-TRACKER.md. Summarize this week's progress:
1. Tasks completed this week
2. Tasks still in progress
3. Any new blockers discovered
4. Suggested priorities for next week
```

---

## Part 7: Key Milestones and Checkpoints

Run these verification checks at the specified milestones. Do not proceed to the next major phase until the checkpoint passes.

### Checkpoint 1: Core Framework Smoke Test (After P0 + P1)

```
Run the Phase 1 integration test. Verify:
1. BaseAgent can be instantiated and started
2. Event bus publishes and subscribes correctly
3. Memory writes to hot tier and syncs to warm within 100ms
4. Audit entries are written to SQLite on every state mutation
5. Circuit breaker trips after 3 consecutive failures
6. Config loader reads all 6 YAML files without errors
pytest tests/integration/test_phase1.py -v
```

### Checkpoint 2: PCTT Pipeline Integrity (After P2)

```
Run /pctt-check. Then run the full non-repainting verification:
pytest tests/pctt/test_non_repainting.py -v
Feed 1000 bars through the pipeline. Then feed 1500 bars. The first
1000 results must be identical. Every stage must pass.
```

### Checkpoint 3: Multi-Agent Integration (After P3)

```
Spin up all 11 agents. Feed a simulated market data stream. Verify:
1. Sentinel ingests data and emits events
2. Regime agent classifies the market state
3. Signal agent generates PCTT signals
4. Risk agent approves or vetoes with correct sizing
5. Orchestrator manages the 4 approval gates in sequence
6. Execution agent routes orders to the paper broker
7. Journal agent records the complete trade lifecycle
pytest tests/integration/test_multi_agent.py -v
```

### Checkpoint 4: Paper Trading Dry Run (After P5)

```
Run a 5-day paper trading simulation with the mock broker.
Verify the full lifecycle: market data in, signals generated,
trades approved through all 4 gates, orders executed, fills
recorded, positions reconciled. No errors, no invariant violations.
```

### Checkpoint 5: Frontend Demo (After P6)

```
Launch the Electron app. Verify:
1. Python backend spawns and WebSocket connects
2. TradingView chart renders OHLCV data with PCTT overlays
3. Agent status cards show health of all 11 agents
4. Chat panel accepts text input and returns responses
5. Approval dialog appears for trades in SUPERVISED mode
6. Position panel shows current positions with P&L
```

### Checkpoint 6: Compliance Gate Test (After P7)

```
Attempt to violate each compliance rule and verify it blocks:
1. PDT: Submit a 4th day trade under $25k (must be blocked)
2. Wash sale: Re-enter a position within 30 days of loss (must flag)
3. Concentration: Size a position above the limit (must be reduced)
4. Trading hours: Submit an order outside market hours (must be queued)
5. Injection: Send adversarial prompts through chat (must be filtered)
pytest tests/compliance/ -v
```

### Checkpoint 7: Full System E2E (After P9)

```
Run the end-to-end paper trading simulation for 30 simulated days.
All 11 agents, full PCTT pipeline, compliance checks, audit trail.
Verify: zero invariant violations, all trades journaled, coverage 85%+.
pytest tests/e2e/ -v --tb=short
```

### Checkpoint 8: Release Candidate (After P10)

```
Build the Windows installer. Install on a clean machine.
Launch the application. Run through a 1-day paper trading session.
Verify all components start, connect, and operate correctly.
This is the "it works on a machine that has never seen the source code" test.
```

---

## Part 8: Estimated Timeline

### Effort by Phase

| Phase | Description | Tasks | Hours (Low) | Hours (High) |
|-------|-------------|-------|-------------|--------------|
| P0 | Project Scaffolding | 8 | 8 | 12 |
| P1 | Core Framework | 15 | 40 | 55 |
| P2 | PCTT Engine | 12 | 60 | 90 |
| P3 | Agent Implementation | 14 | 55 | 75 |
| P4 | Database and Persistence | 8 | 24 | 35 |
| P5 | Broker and Data Integrations | 8 | 30 | 45 |
| P6 | Frontend | 12 | 48 | 65 |
| P7 | Security and Compliance | 10 | 30 | 45 |
| P8 | Observability | 6 | 15 | 25 |
| P9 | Integration and E2E Testing | 8 | 40 | 55 |
| P10 | Hardening and Deployment | 6 | 20 | 30 |
| P11 | Enhancements | 26 | 65 | 95 |
| **Total** | | **133** | **435** | **627** |

These are Claude Code working hours, not wall-clock hours. A typical session produces 3 to 5 hours of productive implementation in a 5 to 6 hour sitting (accounting for review, debugging, and context reloads).

### Recommended Pace

Work 4 to 6 hours per day, 5 days per week. This translates to roughly 15 to 25 productive Claude Code hours per week.

| Pace | Weekly Hours | Calendar Months |
|------|-------------|-----------------|
| Aggressive (6h/day, 6 days) | 25 to 30 | 4 to 5 |
| Steady (5h/day, 5 days) | 15 to 20 | 5 to 7 |
| Part-time (3h/day, 5 days) | 10 to 12 | 8 to 11 |

### Parallel Work Opportunities

Some phases can overlap if you manage context carefully:

- P7 (Security) can start after P1, running parallel with P2 and P3
- P8 (Observability) can start after P1, running parallel with P2 and P3
- P4 (Database) can start after P1, running parallel with P2

This parallelism can reduce calendar time by 20 to 30%, but it requires switching between contexts frequently. If you are new to the system, work phases sequentially.

---

## Appendix: Quick Reference Card

```
SESSION START:    /bootstrap
IMPLEMENT:        /implement IMP-Px-NNN
VALIDATE:         /validate src/path/to/file.py
TEST AGENT:       /test-agent sentinel
PIPELINE CHECK:   /pctt-check
PROGRESS:         /progress
CODE REVIEW:      /review-code src/path/to/module/
SSOT LOOKUP:      /ssot-lookup [TAG-NN]
ADD TOOL:         /add-tool [TOOL-NNN]
ADD AGENT:        /add-agent [AG-NN]
```

```
COMMIT FORMAT:    [IMP-Px-NNN] Description of what was built
                  - Bullet points of changes
                  - Refs: [TAG-01], [TAG-02]
```

```
KEY DIRECTORIES:
  Specs:     Strativion/implementations/pctt/SSOT*.md
  Plan:      Strativion/implementations/pctt/IMPLEMENTATION-PLAN.md
  Progress:  Strativion/implementations/pctt/PROGRESS-TRACKER.md
  Source:    Strativion/src/
  Tests:     Strativion/tests/
  Config:    Strativion/config/
  Knowledge: Strativion/contexts/knowledge/
  Rules:     Strativion/rules/
  Frontend:  Strativion/frontend/
  Desktop:   Strativion/desktop/
  PCTT Eng:  Strativion/implementations/pctt/engine/
```
