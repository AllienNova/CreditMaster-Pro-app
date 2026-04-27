# CLAUDE.md: Strativion PCTT Multi-Agent Trading Platform

## Project Identity

**Name:** Strativion PCTT (Pivot-Constrained Trendline Trading)
**Purpose:** A multi-agent AI trading platform that executes the PCTT strategy using 11 specialized agents, a 12-stage pipeline, and a 3-tier memory system.
**Author:** Kimal Honour Djam
**SSOT:** `Strativion/implementations/pctt/SSOT.md` (primary) plus batch files `SSOT-batch1b.md`, `SSOT-batch1c.md`, `SSOT-batch2a.md`, `SSOT-batch2a-apis.md`, `SSOT-batch2b.md`, `SSOT-enhancements.md`
**Implementation Plan:** `Strativion/implementations/pctt/IMPLEMENTATION-PLAN.md` (134 tasks, 12 phases)
**Progress Tracker:** `Strativion/implementations/pctt/PROGRESS-TRACKER.md` (219 requirements)

### Tech Stack
- **Backend:** Python 3.11+, FastAPI, Redis 7.x, PostgreSQL 16
- **Frontend:** Electron 28+, React 18, Recoil, TradingView Lightweight Charts v5, TypeScript 5.9
- **PCTT Engine:** `@strativion/pctt-engine` (TypeScript, under `implementations/pctt/engine/`)
- **Data Storage:** Parquet for cold analytical data
- **Event Bus:** Redis Pub/Sub
- **Package:** `implementations/pctt/engine/package.json`


## Architecture Overview

### 11 Agents
| ID | Agent | Role |
|----|-------|------|
| AG-01 | Sentinel | Market data ingestion, anomaly detection |
| AG-02 | Regime | Market regime classification (trending, ranging, volatile, crisis) |
| AG-03 | Signal | PCTT signal generation from the 12-stage pipeline |
| AG-04 | Risk | Position sizing, exposure limits, hard veto on all trades |
| AG-05 | Orchestrator | Workflow coordination, approval gate management |
| AG-06 | Execution | Order routing, fill management, slippage tracking |
| AG-07 | Journal | Trade journaling, performance attribution, pattern extraction |
| AG-08 | Calibration | Parameter tuning, strategy drift detection |
| AG-09 | Research | Backtesting, statistical validation, edge discovery |
| AG-10 | Technical Strategy | Chart pattern recognition, multi-timeframe analysis |
| AG-11 | Reconciliation | Position reconciliation, broker sync, audit trail |

### 12 PCTT Pipeline Stages
PCTT-01 through PCTT-12. Each stage processes market data sequentially. No stage may access future data (non-repainting invariant). See SSOT tags `[PCTT-01]` through `[PCTT-12]` for full specifications.

### 3-Tier Memory
| Tier | Technology | Latency Target | Purpose |
|------|-----------|---------------|---------|
| Hot | Python dict | < 1ms | Active state, current bar data |
| Warm | Redis 7.x | < 10ms | Session state, recent history |
| Cold | PostgreSQL 16 + Parquet | < 100ms | Historical data, analytics |

Hot memory syncs to warm within 100ms (Invariant #4).

### 3 Operating Modes
- **MANUAL:** All decisions require human confirmation
- **SUPERVISED:** System proposes, human approves at gates
- **AUTONOMOUS:** System executes within pre-approved parameters

### 4 Approval Gates
Every trade must pass through 4 sequential gates before execution. If any gate rejects, the trade is blocked. Risk Agent (AG-04) has absolute veto authority at Gate 2.

### Event Bus
All inter-agent communication flows through Redis Pub/Sub. ~52 event types defined in the SSOT under `[EVT-xxx]` tags. Every state mutation produces an `AuditEntry`.


## Directory Structure

```
Strativion/
  CLAUDE.md                    # This file
  README.md                    # Project overview
  .claude/settings.json        # Claude Code permissions and hooks
  config/                      # 6 YAML configuration files
    master-config.yaml         # Primary system configuration
    regime-thresholds.yaml     # Regime detector thresholds
    position-sizing.yaml       # Kelly fraction and sizing rules
    market-hours.yaml          # Trading session schedules
    seasonal-patterns.yaml     # Seasonal market tendencies
    risk-limits.yaml           # Hard risk limits and circuit breakers
  contexts/knowledge/                   # 30 law files + 5 domain guides
    law-01-market-inertia.md   # Through law-30-survival.md
    regime-detection-guide.md
    position-sizing-guide.md
    risk-management-guide.md
    market-microstructure.md
    crisis-playbook.md
  rules/                       # 6 YAML rule definition files
    the-30-laws.yaml           # All 30 trading laws encoded
    entry-setups.yaml          # Valid entry configurations
    exit-rules.yaml            # Exit logic and trailing stops
    crisis-protocols.yaml      # Circuit breaker and crisis rules
    checklists.yaml            # Pre/post-trade checklists
    correlation-groups.yaml    # Asset correlation groupings
  reference/market-playbooks/            # 7 asset-class playbooks
    equities.yaml
    index-futures.yaml
    forex.yaml
    options.yaml
    cryptocurrency.yaml
    commodities.yaml
    bonds.yaml
  implementations/python-formulas/                    # 6 Python computation modules
    __init__.py
    expectancy.py              # Trade expectancy calculations
    position_sizing.py         # Kelly and fractional Kelly sizing
    risk_of_ruin.py            # Ruin probability estimation
    drawdown_recovery.py       # Recovery time modeling
    regime_detector.py         # Statistical regime classification
    statistical_significance.py # P-value and significance tests
  examples/                    # 3 YAML example/reference files
    sample-trades.yaml
    blow-up-postmortems.yaml
    regime-transitions.yaml
  implementations/pctt/
    SSOT.md                    # Single Source of Truth (primary)
    SSOT-batch1b.md            # Batch 1b: additional agent specs
    SSOT-batch1c.md            # Batch 1c: dataclasses, events
    SSOT-batch2a.md            # Batch 2a: tools, configuration
    SSOT-batch2a-apis.md       # Batch 2a: API contracts
    SSOT-batch2b.md            # Batch 2b: UI, security, infra
    SSOT-enhancements.md       # Enhancement specifications
    IMPLEMENTATION-PLAN.md     # 134 tasks across 12 phases
    PROGRESS-TRACKER.md        # 219 requirements tracking
    PCTT-Strategy-Pamphlet.md  # Strategy overview document
    engine/                    # @strativion/pctt-engine (TypeScript)
      package.json
      tsconfig.json
    research/                  # PCTT academic papers and figures
      Pivot-Constrained Trendline Trading (PCTT)/
        *.md                   # v2, v4 papers, implementation guides
        *.png                  # Architecture and strategy figures
```

### Naming Conventions
- **Config files:** kebab-case YAML (`risk-limits.yaml`)
- **Python modules:** snake_case (`position_sizing.py`)
- **TypeScript files:** camelCase (`pivotDetector.ts`)
- **Knowledge files:** `law-NN-short-name.md` (NN = zero-padded 01 to 30)
- **SSOT tags:** `[DOMAIN-NN]` format (e.g., `[AG-04]`, `[PCTT-07]`, `[DC-042]`)


## Development Workflow

### Task Execution Protocol

All implementation work follows the IMP (Implementation Plan) task system from `IMPLEMENTATION-PLAN.md`.

1. **Before starting any task:** Read `PROGRESS-TRACKER.md` to check current status.
2. **Identify the IMP task:** Tasks are labeled `IMP-Px-xxx` where `Px` is the phase (P1 through P12) and `xxx` is the task number.
3. **Read the relevant SSOT sections** for the task. Use SSOT tags to locate exact specifications.
4. **Implement** following all coding standards below.
5. **Validate** using the appropriate validation tools.
6. **Update** `PROGRESS-TRACKER.md` with completion status.

### Branch Naming
```
feature/IMP-P1-001-sentinel-data-ingestion
fix/IMP-P3-042-risk-veto-race-condition
refactor/IMP-P2-018-warm-memory-sync
```

### Commit Message Format
```
[IMP-P1-001] Implement Sentinel agent data ingestion pipeline

- Add WebSocket connection manager for market data feeds
- Implement anomaly detection using z-score thresholds
- Wire Sentinel events to Redis Pub/Sub bus
- Refs: [AG-01], [EVT-003], [EVT-004]
```

Always include the IMP task ID in square brackets. List affected SSOT tags in a `Refs:` line.

### Pull Request Protocol
- Title: `[IMP-Px-xxx] Short description`
- Body must reference SSOT tags for all touched components
- Must include test coverage summary
- Must confirm all 10 invariants still hold

### File Creation Rules
- Never create files outside the `Strativion/` directory tree
- New Python agent files go in a `src/contexts/agent-contexts/` directory (to be created in Phase 1)
- New TypeScript PCTT files go in `implementations/pctt/engine/src/`
- New test files mirror source structure under `tests/`


## Coding Standards

### Python (Backend, Agents, Formulas)
- Python 3.11+ with full type annotations on all functions
- Use `dataclasses` or `pydantic.BaseModel` for all data structures
- Async/await for all I/O operations (FastAPI, Redis, PostgreSQL)
- Formatter: `black` (line length 100)
- Linter: `ruff`
- Type checker: `mypy --strict`
- Docstrings: Google style, must include SSOT tag reference

```python
# Example: Every class and function must reference its SSOT tag
class RiskAgent:
    """Risk management agent with absolute trade veto authority.

    SSOT: [AG-04]
    Invariants: #1 (no trade without Risk approval), #2 (Kelly/4 max)
    """
```

### TypeScript (PCTT Engine, Frontend)
- TypeScript 5.9 strict mode (`"strict": true` in tsconfig)
- Use interfaces for all data shapes, enums for fixed sets
- No `any` type. Use `unknown` with type guards when necessary.
- Formatter: `prettier`
- Linter: `eslint` with strict TypeScript rules
- All PCTT pipeline functions must be pure (deterministic, no side effects)

```typescript
// Example: SSOT tag in JSDoc
/**
 * Detect pivot highs and lows from OHLCV data.
 * @ssot PCTT-01
 * @invariant No future data access (Invariant #7)
 */
export function detectPivots(bars: Bar[], leftBars: number, rightBars: number): Pivot[] {
```

### React (Frontend UI)
- Functional components only, no class components
- Recoil for all global state management
- React Testing Library for component tests
- TradingView Lightweight Charts v5 for all chart rendering
- Component files: PascalCase (`TradePanel.tsx`)

### SSOT Tag References in Code
Every class, module, and significant function must include its SSOT tag in a docstring or comment. This creates a traceable link from code back to specification. Format: `SSOT: [TAG-NN]` or `@ssot TAG-NN`.


## SSOT Tag System

### Tag Domains and Ranges

| Domain | Prefix | Description | Count |
|--------|--------|-------------|-------|
| META | `[META-xxx]` | Document metadata | Variable |
| ARCH | `[ARCH-xxx]` | System architecture | Variable |
| AG | `[AG-01]` to `[AG-11]` | Agent specifications | 11 |
| PCTT | `[PCTT-01]` to `[PCTT-12]` | Pipeline stages | 12 |
| DC | `[DC-001]` to `[DC-096]` | Dataclass definitions | ~96 |
| EVT | `[EVT-001]` to `[EVT-052]` | Event type definitions | ~52 |
| TOOL | `[TOOL-001]` to `[TOOL-127]` | Tool specifications | ~127 |
| CFG | `[CFG-xxx]` | Configuration specs | Variable |
| FRM | `[FRM-xxx]` | Formula specifications | Variable |
| DB | `[DB-xxx]` | Database schemas | Variable |
| API | `[API-xxx]` | API contract definitions | Variable |
| UI | `[UI-xxx]` | Frontend components | Variable |
| SEC | `[SEC-xxx]` | Security specifications | Variable |
| INF | `[INF-xxx]` | Infrastructure specs | Variable |
| DEP | `[DEP-xxx]` | Dependency specs | Variable |
| LAW | `[LAW-xxx]` | Law mapping references | Variable |
| FILE | `[FILE-xxx]` | File manifest entries | Variable |

### How to Find a Tag
1. Determine the domain from the prefix (e.g., `AG-04` is an agent spec)
2. Search the appropriate SSOT batch file:
   - `SSOT.md`: META, ARCH, AG-01 through AG-05
   - `SSOT-batch1b.md`: AG-06 through AG-11
   - `SSOT-batch1c.md`: DC, EVT definitions
   - `SSOT-batch2a.md`: TOOL, CFG, FRM definitions
   - `SSOT-batch2a-apis.md`: API contracts
   - `SSOT-batch2b.md`: UI, SEC, INF, DEP, FILE definitions
   - `SSOT-enhancements.md`: Enhancement specifications
3. Search using `grep -n "TAG-NN"` in the relevant file

### Cross-References
When code references multiple SSOT tags, list them all: `SSOT: [AG-04], [DC-023], [EVT-017]`


## Testing Requirements

### Python Tests (pytest)
- Location: `tests/` mirroring `src/` structure
- Run: `pytest tests/ -v --tb=short`
- Coverage target: 90% line coverage, 80% branch coverage
- Every agent must have integration tests verifying event emission
- Every formula module must have property-based tests (hypothesis)
- Risk invariant tests: dedicated test suite verifying all 10 invariants

### TypeScript Tests (vitest)
- Location: `implementations/pctt/engine/tests/` mirroring `implementations/pctt/engine/src/`
- Run: `npx vitest run`
- Coverage target: 90% line coverage
- PCTT pipeline tests: every stage must have a non-repainting test
- Non-repainting test pattern: run pipeline on N bars, then run on N+M bars; first N results must be identical

### React Tests (React Testing Library)
- Location: alongside components as `ComponentName.test.tsx`
- Run: `npx vitest run --config vitest.ui.config.ts`
- Test user interactions, not implementation details
- Mock WebSocket and Redis connections

### Critical Test Categories
- **Invariant tests:** One test per invariant, must run in CI
- **Non-repainting tests:** Every PCTT stage proves no future data access
- **Circuit breaker tests:** Verify trip at 3 consecutive failures (Invariant #6)
- **Approval gate tests:** Verify all 4 gates enforce sequentially
- **Memory sync tests:** Verify hot-to-warm sync under 100ms (Invariant #4)


## Critical Rules (10 System Invariants)

These are non-negotiable. Every code change must preserve all 10.

1. **No trade executes without Risk Agent approval.** The Risk Agent (AG-04) has absolute veto. No code path may bypass `RiskAgent.approve()`. No exceptions.
2. **Position size never exceeds Kelly fraction / 4.** The `position_sizing.py` formula caps at `kelly_fraction / 4`. No override mechanism exists by design.
3. **All events flow through Redis Pub/Sub event bus.** Agents never call each other directly. All communication is event-driven through Redis channels.
4. **Hot memory syncs to warm within 100ms.** Every hot memory write triggers an async warm sync. Tests must verify this latency bound.
5. **Every state mutation produces an AuditEntry.** No state change occurs without a corresponding `AuditEntry` written to the journal. This is enforced by middleware.
6. **Circuit breakers trip at 3 consecutive failures.** Any agent or subsystem that fails 3 times consecutively enters a tripped state. Recovery requires explicit reset.
7. **PCTT pipeline stages never access future data.** All indicator calculations use only current and past bars. This is the non-repainting guarantee. Verified by dedicated tests.
8. **Compliance checks are hard gates.** PDT rule, wash sale detection, and concentration limits are enforced before execution. These cannot be overridden.
9. **All tool invocations require permission verification.** Every tool call checks agent permissions before execution. Unauthorized tool access is logged and blocked.
10. **Graceful degradation to MANUAL mode.** If any subsystem fails, the system reduces to MANUAL mode. It never continues in AUTONOMOUS mode with degraded capabilities.

### Additional Critical Rules
- Never commit secrets, API keys, or credentials to the repository
- Never modify SSOT files without explicit instruction; they are the specification
- Never delete or overwrite `PROGRESS-TRACKER.md` without reading it first
- All database migrations must be reversible
- Redis keys must use namespaced prefixes (`strativion:agent:sentinel:*`)
- All monetary values use `Decimal` type in Python, never `float`


## Key File Locations

### By Task Type

| Task | Files to Read First |
|------|-------------------|
| Implement an agent | `implementations/pctt/SSOT.md` or `SSOT-batch1b.md` for agent spec, `IMPLEMENTATION-PLAN.md` for task details |
| Add a PCTT pipeline stage | `implementations/pctt/SSOT.md` for pipeline spec, `implementations/pctt/engine/` for existing code |
| Define a dataclass | `implementations/pctt/SSOT-batch1c.md` for DC definitions |
| Add an event type | `implementations/pctt/SSOT-batch1c.md` for EVT definitions |
| Add a tool | `implementations/pctt/SSOT-batch2a.md` for TOOL definitions |
| Build an API endpoint | `implementations/pctt/SSOT-batch2a-apis.md` for API contracts |
| Work on frontend | `implementations/pctt/SSOT-batch2b.md` for UI specs |
| Adjust risk limits | `canonical/policy/policy.runtime.yaml` (authoritative), `canonical/policy/policy.risk.yaml` (per-mode), `canonical/policy/policy.sizing.yaml` (formulas) |
| Modify regime detection | `canonical/policy/policy.regimes.yaml`, `implementations/python-formulas/regime_detector.py`, `contexts/knowledge/context.guide.regime-detection.md` |
| Add a market playbook | `reference/market-playbooks/` (canon does not host strategy-specific setups) |
| Add compliance rules | `canonical/policy/policy.compliance.yaml` |
| Add order lifecycle rules | `canonical/policy/policy.order-lifecycle.yaml` |
| Check implementation status | `implementations/pctt/PROGRESS-TRACKER.md`, `implementations/pctt/IMPLEMENTATION-PLAN.md` |
| Understand a trading law | `contexts/knowledge/context.law.NN-*.md`, `canonical/laws/law.catalog.yaml` |
| Handle a crisis scenario | `canonical/workflows/workflow.crisis.yaml`, `reference/guides/guide.crisis-playbook.md` (non-binding narrative) |
| Understand precedence between files | `governance/CANONICAL-FIELD-INDEX.md` |
| Add a tenant override | consumer-side only; see `governance/OVERRIDE-SCHEMA.md` |


## Available Skills

| Skill | Description |
|-------|-------------|
| `/bootstrap` | Scaffold a new agent, module, or subsystem from SSOT specs. Creates directory structure, boilerplate files, tests, and wires into the event bus. |
| `/implement` | Execute a specific IMP task. Reads the task spec, relevant SSOT tags, writes code, tests, and updates progress tracker. |
| `/validate` | Run validation on a Python or TypeScript file. Checks SSOT tag references, type annotations, invariant compliance, and lint rules. |
| `/test-agent` | Run the full test suite for a specific agent (unit + integration + invariant tests). |
| `/pctt-check` | Verify PCTT pipeline correctness: run non-repainting tests, check stage ordering, validate data flow. |
| `/progress` | Display current implementation progress from `PROGRESS-TRACKER.md`. Show completed, in-progress, and blocked tasks. |
| `/review-code` | Perform a code review against SSOT specs, invariants, and coding standards. Flag deviations. |
| `/add-tool` | Add a new tool to an agent. Reads `[TOOL-xxx]` spec from SSOT, generates implementation, permission check, and tests. |
| `/add-agent` | Scaffold a complete new agent from its `[AG-xx]` specification. Creates agent class, event handlers, tools, and test suite. |
| `/ssot-lookup` | Look up any SSOT tag and return its full specification. Searches across all SSOT batch files. |


## Subagent Patterns

### When to Use the Explore Agent
Use Explore (read-only investigation) when you need to:
- Understand how an existing module works before modifying it
- Find all files referencing a specific SSOT tag
- Map dependencies between agents or pipeline stages
- Investigate a bug by tracing event flow

**Context to include:** The SSOT tag(s) in question, the specific question to answer, and which files to start searching in.

### When to Use the Plan Agent
Use Plan (analysis and design) when you need to:
- Design the implementation approach for a complex IMP task
- Determine which files need to change for a feature
- Evaluate trade-offs between implementation approaches
- Create a step-by-step implementation plan from an IMP task

**Context to include:** The IMP task ID, relevant SSOT tag content (copy the spec), current file structure, and any constraints.

### When to Use the Bash Agent
Use Bash (command execution) when you need to:
- Run tests (`pytest`, `vitest`)
- Run linters and formatters (`black`, `ruff`, `prettier`, `mypy`)
- Execute validation scripts
- Run git operations
- Install dependencies

**Context to include:** The exact command to run and expected output format.

### Subagent Context Rules
- Always pass the relevant SSOT tag content to subagents (do not assume they can find it)
- Include the 10 invariants when the task touches trade execution, risk, or state management
- Include the coding standards section when generating new code
- Never pass the entire SSOT to a subagent; extract only the relevant sections
