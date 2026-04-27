---
paths:
  - "tests/**/*.py"
  - "tests/**/*.ts"
  - "tests/**/*.tsx"
---

# Test File Rules (Strativion PCTT Platform)

## Naming and Organization
- Test naming convention: `test_{feature}_{scenario}_{expected_result}` (e.g., `test_risk_agent_pdt_violation_blocks_trade`).
- Test data lives in `tests/fixtures/` directory. No large inline data structures in test files.
- Group related tests in classes (Python) or `describe` blocks (TypeScript).
- One test file per module under test. Mirror the source directory structure under `tests/`.

## Mocking and Isolation
- NEVER call real external APIs in tests. Mock IBKR, Alpaca, Polygon with deterministic responses.
- Use `unittest.mock.patch` or `pytest-mock` for Python mocks. Use `vi.mock` for Vitest mocks.
- Shared fixtures for common test contexts: account state, market data snapshots, PCTT signals, agent contexts.
- Fixture files use descriptive names: `fixtures/market_data_aapl_gap_up.json`, `fixtures/account_state_margin_call.json`.

## Coverage Requirements
- Coverage minimum: 80% per module as the baseline.
- Formula modules (`implementations/python-formulas/`): 90% minimum coverage.
- Compliance and security modules (`compliance/`, `security/`): 95% minimum coverage.
- Coverage reports generated on every CI run. Regressions block the merge.

## Non-Repainting Regression Suite
- Feed historical bars one at a time to every PCTT pipeline stage.
- Verify that signals produced match batch processing exactly. Any divergence is a critical failure.
- Include edge cases: price gaps, trading halts followed by resume, thin liquidity (fewer than 10 trades per bar), single-bar input.

## Agent Test Requirements
- Every agent test must verify four dimensions:
  1. Tool permissions: confirm the agent can only invoke tools listed in its SSOT-SEC-02 ACL.
  2. Guardrail enforcement: verify that compliance violations (PDT, wash sale, concentration) trigger hard blocks.
  3. Event publishing: confirm the agent emits the correct events to the event bus.
  4. Handoff correctness: verify `AgentResult.next_agent` points to the correct downstream agent.

## Parametrized and Time-Dependent Tests
- Use `@pytest.mark.parametrize` for multiple scenario variations of the same test logic.
- Use `freezegun` for time-dependent tests: market hours, session boundaries, overnight gaps, weekend handling.
- Parametrize across market regimes (trending, mean_reverting, volatile, quiet) for regime-sensitive logic.

## IMP Task Mapping
- Every IMP task's acceptance criteria maps 1:1 to at least one test function.
- Test docstrings reference the IMP task ID: `"""Verifies IMP-042 acceptance criterion 3."""`
- Acceptance tests run as a dedicated pytest mark: `@pytest.mark.acceptance`.

## Integration Tests
- Integration tests use docker-compose services (Redis, PostgreSQL) via `pytest-docker`.
- Mark integration tests with `@pytest.mark.integration` so they can be excluded from fast local runs.
- Integration test timeout: 30 seconds per test. Fail fast on infrastructure issues.
