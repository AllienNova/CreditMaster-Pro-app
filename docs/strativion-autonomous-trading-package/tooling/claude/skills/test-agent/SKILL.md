---
name: test-agent
description: Run the full test suite for a specific Strativion PCTT agent
---

# /test-agent: Agent Test Runner

You are running the complete test suite for a specific agent in the Strativion PCTT Multi-Agent Trading Platform. The user provides an agent name as an argument (e.g., `/test-agent risk`). Execute unit tests, integration tests, and verify SSOT compliance for the agent.

## Step 1: Map Agent Name to SSOT Tag and Files

Accept the agent name argument. Map it to the correct SSOT tag, source files, and test files using this table:

| Agent Name | Aliases | SSOT Tag | Source Module | SSOT File |
|-----------|---------|----------|---------------|-----------|
| sentinel | sen, market-monitor | SSOT-AG-01 | `src/contexts/agent-contexts/sentinel_agent.py` | `implementations/pctt/SSOT.md` |
| regime | reg, regime-classifier | SSOT-AG-02 | `src/contexts/agent-contexts/regime_agent.py` | `implementations/pctt/SSOT.md` |
| signal | sig, signal-generator | SSOT-AG-03 | `src/contexts/agent-contexts/signal_agent.py` | `implementations/pctt/SSOT.md` |
| risk | rsk, risk-manager | SSOT-AG-04 | `src/contexts/agent-contexts/risk_agent.py` | `implementations/pctt/SSOT.md` |
| orchestrator | orc, coordinator | SSOT-AG-05 | `src/contexts/agent-contexts/orchestrator_agent.py` | `implementations/pctt/SSOT.md` |
| execution | exec, order-router | SSOT-AG-06 | `src/contexts/agent-contexts/execution_agent.py` | `implementations/pctt/SSOT-batch1b.md` |
| journal | jrn, trade-journal | SSOT-AG-07 | `src/contexts/agent-contexts/journal_agent.py` | `implementations/pctt/SSOT-batch1b.md` |
| calibration | cal, param-tuner | SSOT-AG-08 | `src/contexts/agent-contexts/calibration_agent.py` | `implementations/pctt/SSOT-batch1b.md` |
| research | res, backtester | SSOT-AG-09 | `src/contexts/agent-contexts/research_agent.py` | `implementations/pctt/SSOT-batch1b.md` |
| technical-strategy | strat, tech-strat | SSOT-AG-10 | `src/contexts/agent-contexts/technical_strategy_agent.py` | `implementations/pctt/SSOT-batch1b.md` |
| reconciliation | recon, rec | SSOT-AG-11 | `src/contexts/agent-contexts/reconciliation_agent.py` | `implementations/pctt/SSOT-batch1b.md` |

If the agent name does not match any entry (including aliases), respond with:
"Unknown agent: {name}. Valid agents: sentinel, regime, signal, risk, orchestrator, execution, journal, calibration, research, technical-strategy, reconciliation."

## Step 2: Read the Agent SSOT Specification

Read the agent's full SSOT section from the appropriate file. Search for the HTML comment markers `<!-- SSOT-AG-NN -->` through `<!-- /SSOT-AG-NN -->`. Extract:

- **System prompt** (the agent's behavioral instructions)
- **Tools** (list of tools the agent can invoke, with tool IDs)
- **Guardrails** (constraints and limits the agent must enforce)
- **Events published** (event types this agent emits)
- **Events subscribed** (event types this agent listens to)
- **Memory structure** (hot, warm, and cold memory schemas)
- **Law mappings** (which of the 30 Laws this agent implements)
- **Tool ACL** (which tools this agent is permitted vs forbidden to use)

Store these for comparison against tests in later steps.

## Step 3: Locate Test Files

Search for test files related to this agent. Expected locations:

```
tests/unit/contexts/agent-contexts/test_{agent_name}.py           # Core agent unit tests
tests/unit/contexts/agent-contexts/test_{agent_name}_tools.py      # Tool-specific tests
tests/unit/contexts/agent-contexts/test_{agent_name}_guardrails.py # Guardrail enforcement tests
tests/integration/test_{agent_name}_integration.py # Integration tests
```

Also search more broadly with:
```bash
find tests/ -name "*{agent_name}*" -type f
```

Report which test files exist and which are missing.

## Step 4: Run Unit Tests

If the unit test file exists, run it:

```bash
cd Strativion && python -m pytest tests/unit/contexts/agent-contexts/test_{agent_name}.py -v --tb=short -q
```

If tool-specific tests exist:
```bash
cd Strativion && python -m pytest tests/unit/contexts/agent-contexts/test_{agent_name}_tools.py -v --tb=short -q
```

If guardrail tests exist:
```bash
cd Strativion && python -m pytest tests/unit/contexts/agent-contexts/test_{agent_name}_guardrails.py -v --tb=short -q
```

Capture and record: total tests, passed, failed, errors, skipped.

If test files do not exist, record "NOT FOUND" and note this as a gap.

## Step 5: Run Integration Tests

If the integration test file exists:
```bash
cd Strativion && python -m pytest tests/integration/test_{agent_name}_integration.py -v --tb=short -q
```

Integration tests typically verify:
- Agent responds correctly to events on the Redis bus
- Agent publishes expected events after processing
- Agent interacts correctly with other agents (via mocked event bus)
- Agent handles error conditions gracefully

If integration tests do not exist, record "NOT FOUND."

## Step 6: Verify Guardrail Test Coverage

Compare the guardrails extracted from the SSOT (Step 2) against the test assertions found in test files. For each guardrail defined in the SSOT:

1. Search all agent test files for test functions that exercise this guardrail
2. A guardrail is "covered" if there exists at least one test that:
   - Sets up a condition that should trigger the guardrail
   - Asserts that the guardrail correctly blocks, limits, or raises an error

Build a coverage matrix:

| Guardrail (from SSOT) | Test Function | Status |
|-----------------------|---------------|--------|
| {guardrail_description} | `test_{name}` | COVERED / MISSING |

Example guardrails to check (varies by agent):
- **Sentinel:** Max 10 instruments, 5-second cache minimum, session boundary enforcement
- **Regime:** 200-bar minimum data requirement, confidence threshold
- **Signal:** Non-repainting guarantee, one-break-one-trade
- **Risk:** 2% max risk per trade, 8% max portfolio heat, 5 max correlated positions, Kelly/4 cap
- **Orchestrator:** Approval gate sequencing, mode enforcement
- **Execution:** Slippage limits, order timeout, fill verification

## Step 7: Verify Event Publishing Test Coverage

Compare the events this agent publishes (from SSOT) against test assertions. For each published event type:

1. Search test files for assertions that verify the event is published
2. Check that the event payload structure matches the SSOT EVT definition

Build a coverage matrix:

| Event Type (from SSOT) | Publisher Test | Payload Test | Status |
|------------------------|---------------|-------------|--------|
| {event_name} | `test_{name}` | YES/NO | COVERED / MISSING |

## Step 8: Verify Tool Permission Tests

From the SSOT, extract the agent's tool ACL (permitted and forbidden tools). Verify that tests exist for:

1. **Permitted tools:** Tests that invoke each permitted tool and verify success
2. **Forbidden tools:** Tests that attempt to invoke forbidden tools and verify rejection

Build a coverage matrix:

| Tool | Permission | Test Function | Status |
|------|-----------|---------------|--------|
| {tool_name} | PERMITTED | `test_{name}` | COVERED / MISSING |
| {tool_name} | FORBIDDEN | `test_{name}` | COVERED / MISSING |

## Step 9: Measure Code Coverage

Run the unit tests with coverage measurement:
```bash
cd Strativion && python -m pytest tests/unit/contexts/agent-contexts/test_{agent_name}*.py --cov=src/contexts/agent-contexts/{agent_name}_agent --cov-report=term-missing -q
```

Extract:
- Line coverage percentage
- Branch coverage percentage (if available)
- List of uncovered lines

Target: 85% line coverage minimum.

## Step 10: Report Results

Output the full test report:

```
## Agent Test Report: {Agent Name} ({SSOT-AG-NN})

### Test Execution Summary
| Suite | Tests | Passed | Failed | Errors | Skipped |
|-------|-------|--------|--------|--------|---------|
| Unit Tests | {N} | {N} | {N} | {N} | {N} |
| Tool Tests | {N} | {N} | {N} | {N} | {N} |
| Guardrail Tests | {N} | {N} | {N} | {N} | {N} |
| Integration Tests | {N} | {N} | {N} | {N} | {N} |
| **Total** | **{N}** | **{N}** | **{N}** | **{N}** | **{N}** |

### Failed Tests
(list each failed test with name, assertion error, and file:line)

### Code Coverage
- **Line Coverage:** {X}% (target: 85%)
- **Branch Coverage:** {X}% (target: 80%)
- **Uncovered Lines:** {list}

### SSOT Compliance: Guardrails
| Guardrail | Test Coverage |
|-----------|-------------|
| {description} | COVERED / MISSING |
| ... | ... |
**Coverage:** {N}/{M} guardrails tested ({percentage}%)

### SSOT Compliance: Events
| Event | Test Coverage |
|-------|-------------|
| {event_name} | COVERED / MISSING |
| ... | ... |
**Coverage:** {N}/{M} events tested ({percentage}%)

### SSOT Compliance: Tool ACL
| Tool | Permission | Test Coverage |
|------|-----------|-------------|
| {tool_name} | PERMITTED/FORBIDDEN | COVERED / MISSING |
| ... | ... | ... |
**Coverage:** {N}/{M} tool permissions tested ({percentage}%)

### Untested SSOT Requirements
(list any requirements from the SSOT spec that have no corresponding tests)

### Overall Assessment
- **Test Status:** {ALL PASS / {N} FAILURES}
- **Coverage Status:** {MEETS TARGET / BELOW TARGET by {X}%}
- **SSOT Compliance:** {FULL / {N} gaps}
- **Recommendation:** {actionable next steps}
```

If the agent source file does not exist yet (not implemented), output:
"Agent {name} has not been implemented yet. Source file `{expected_path}` does not exist. Run `/implement {IMP_task_id}` to implement this agent first."

And look up the relevant IMP task from `implementations/pctt/IMPLEMENTATION-PLAN.md` to provide the correct task ID.
