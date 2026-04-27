---
name: add-tool
description: Scaffold a new tool for an existing PCTT agent from its SSOT specification
---

# /add-tool Skill

You are scaffolding a new tool function for an existing Strativion PCTT agent. Every tool must be grounded in its SSOT specification, properly typed, permission-checked, rate-limited, and fully tested.

## Arguments

Two required arguments:
1. **Agent name**: one of `sentinel`, `regime`, `signal`, `risk`, `orchestrator`, `execution`, `journal`, `calibration`, `research`, `technical-strategy`, `reconciliation`
2. **Tool name**: the snake_case tool function name (e.g., `check_concentration`, `detect_regime_shift`)

Example: `/add-tool risk check_concentration`

## Agent-to-SSOT Mapping

| Agent Name | SSOT Tag | SSOT File |
|------------|----------|-----------|
| sentinel | SSOT-AG-01 | implementations/pctt/SSOT.md |
| regime | SSOT-AG-02 | implementations/pctt/SSOT.md |
| signal | SSOT-AG-03 | implementations/pctt/SSOT.md |
| risk | SSOT-AG-04 | implementations/pctt/SSOT.md |
| orchestrator | SSOT-AG-05 | implementations/pctt/SSOT.md |
| execution | SSOT-AG-06 | implementations/pctt/SSOT-batch1b.md |
| journal | SSOT-AG-07 | implementations/pctt/SSOT-batch1b.md |
| calibration | SSOT-AG-08 | implementations/pctt/SSOT-batch1b.md |
| research | SSOT-AG-09 | implementations/pctt/SSOT-batch1b.md |
| technical-strategy | SSOT-AG-10 | implementations/pctt/SSOT-batch1b.md |
| reconciliation | SSOT-AG-11 | implementations/pctt/SSOT-batch1b.md |

## Step 1: Read SSOT Specifications

1. Read the agent's SSOT section from the appropriate file to understand the agent's purpose, memory structure, and existing tools.
2. Read `implementations/pctt/SSOT-batch2a.md` and search for the tool in the SSOT-TOOL-REGISTRY section. Look for the `<!-- SSOT-TOOL-REGISTRY -->` marker.
3. Extract from the tool specification:
   - Tool name and description
   - Input parameters (names, types, constraints)
   - Return type and structure
   - Permission level (from SSOT-SEC-02 in `implementations/pctt/SSOT-batch2b.md`)
   - Rate limit (calls per interval)
   - Timeout value
   - Which agents are authorized to call this tool
4. If the tool is not found in SSOT-TOOL-REGISTRY, inform the user and ask whether to proceed with a custom implementation or stop.

## Step 2: Generate Tool Implementation

Create or update `src/contexts/agent-contexts/{agent_name}/tools.py`.

The tool function must follow this pattern:

```python
"""
Tools for the {AgentName} agent.
Ref: SSOT-AG-{XX}
"""

import structlog
from typing import {required_types}

from core.tools import tool_spec, ToolResult
from core.permissions import require_permission, PermissionLevel
from core.rate_limit import rate_limited
from core.dataclasses import {relevant_dataclasses}

logger = structlog.get_logger(__name__)


@tool_spec(
    name="{tool_name}",
    description="{description_from_ssot}",
    agent="{agent_name}",
    permission=PermissionLevel.{LEVEL},
    rate_limit="{N}_per_{interval}",
    timeout_seconds={timeout},
)
async def {tool_name}(
    {param1}: {type1},
    {param2}: {type2},
    ...
) -> ToolResult[{return_type}]:
    """
    {Description from SSOT spec.}

    Ref: SSOT-TOOL-{XX}

    Args:
        {param1}: {description}
        {param2}: {description}

    Returns:
        ToolResult containing {return_type} with {description}.

    Raises:
        PermissionError: If calling agent lacks required permission.
        ValueError: If input parameters fail validation.
        TimeoutError: If execution exceeds {timeout}s.
    """
    logger.info("{tool_name}.called", {param1}={param1})

    # Input validation
    {validation_code}

    # Core logic
    {implementation_logic}

    logger.info("{tool_name}.completed", result_summary=result.summary())
    return ToolResult(success=True, data=result)
```

### Implementation Guidelines

- All parameters must have type hints matching the SSOT spec exactly.
- Add input validation for every parameter at the top of the function.
- Use `structlog` for all logging (entry, exit, errors).
- Use async/await for any I/O operations.
- Wrap the core logic in try/except with specific exception types.
- Return `ToolResult` with `success=False` and error details on failure, not bare exceptions.
- Include inline comments referencing specific SSOT sections where the logic implements a requirement.

## Step 3: Register the Tool in the Agent

Update `src/contexts/agent-contexts/{agent_name}/agent.py`:

1. Add the import: `from .tools import {tool_name}`
2. Add the tool to the agent's tool registry list (typically in the `__init__` method or a `tools` class attribute).

If the agent file uses a `TOOLS` list or dictionary, add the new tool there. If it uses a decorator-based auto-registration, verify the tool will be discovered automatically.

## Step 4: Update Agent __init__.py

Update `src/contexts/agent-contexts/{agent_name}/__init__.py` to export the new tool:

```python
from .tools import {tool_name}
```

Add it to the `__all__` list if one exists.

## Step 5: Create Test File

Create `tests/contexts/agent-contexts/test_{agent_name}_{tool_name}.py`:

```python
"""
Tests for {agent_name}.{tool_name} tool.
Ref: SSOT-TOOL-{XX}
"""

import pytest
from unittest.mock import AsyncMock, patch

from src.agents.{agent_name}.tools import {tool_name}
from core.tools import ToolResult
from core.permissions import PermissionLevel, PermissionError


class TestHappyPath:
    """Test normal operation of {tool_name}."""

    @pytest.mark.asyncio
    async def test_{tool_name}_basic(self):
        """Test basic invocation with valid inputs returns expected result."""
        result = await {tool_name}({valid_args})
        assert result.success is True
        assert result.data is not None

    @pytest.mark.asyncio
    async def test_{tool_name}_with_{variation}(self):
        """Test with {variation description}."""
        result = await {tool_name}({variation_args})
        assert result.success is True
        # Assert specific output characteristics


class TestPermissions:
    """Test permission enforcement for {tool_name}."""

    @pytest.mark.asyncio
    async def test_unauthorized_agent_rejected(self):
        """Test that an unauthorized agent cannot invoke this tool."""
        with pytest.raises(PermissionError):
            # Simulate call from an agent without {LEVEL} permission
            await {tool_name}({valid_args}, _caller_agent="unauthorized_agent")

    @pytest.mark.asyncio
    async def test_authorized_agent_accepted(self):
        """Test that the owning agent can invoke this tool."""
        result = await {tool_name}({valid_args}, _caller_agent="{agent_name}")
        assert result.success is True


class TestRateLimiting:
    """Test rate limit enforcement for {tool_name}."""

    @pytest.mark.asyncio
    async def test_rate_limit_exceeded(self):
        """Test that exceeding the rate limit raises an appropriate error."""
        # Call the tool N+1 times rapidly
        for _ in range({rate_limit}):
            await {tool_name}({valid_args})

        # The next call should be rate-limited
        result = await {tool_name}({valid_args})
        assert result.success is False
        assert "rate limit" in result.error.lower()


class TestEdgeCases:
    """Test edge cases and error handling for {tool_name}."""

    @pytest.mark.asyncio
    async def test_empty_input(self):
        """Test behavior with empty or minimal input."""
        result = await {tool_name}({empty_args})
        assert result.success is False

    @pytest.mark.asyncio
    async def test_invalid_type(self):
        """Test behavior with wrong parameter types."""
        with pytest.raises((TypeError, ValueError)):
            await {tool_name}({invalid_args})

    @pytest.mark.asyncio
    async def test_boundary_values(self):
        """Test behavior at parameter boundaries (min/max values)."""
        result = await {tool_name}({boundary_args})
        assert result.success is True  # or False depending on spec
```

## Step 6: Report

After completing all steps, output a summary:

```
## Tool Scaffolding Complete: {agent_name}.{tool_name}

### Files Created
- `src/contexts/agent-contexts/{agent_name}/tools.py` (created or updated)
- `tests/contexts/agent-contexts/test_{agent_name}_{tool_name}.py` (created)

### Files Modified
- `src/contexts/agent-contexts/{agent_name}/agent.py` (tool registered)
- `src/contexts/agent-contexts/{agent_name}/__init__.py` (export added)

### SSOT References
- Tool spec: SSOT-TOOL-{XX} (from implementations/pctt/SSOT-batch2a.md)
- Agent spec: SSOT-AG-{XX} (from {ssot_file})
- Permission: SSOT-SEC-02 (from implementations/pctt/SSOT-batch2b.md)

### Next Steps
- [ ] Implement the core logic in the tool function (marked with TODO comments)
- [ ] Run tests: `pytest tests/contexts/agent-contexts/test_{agent_name}_{tool_name}.py -v`
- [ ] Update /progress with the relevant IMP task ID
```

## Important Rules

- Never generate a tool without first reading its SSOT specification. If the spec does not exist, stop and inform the user.
- All parameter types must match the SSOT spec exactly. Do not add parameters not in the spec.
- If the `tools.py` file already exists, append the new tool function. Do not overwrite existing tools.
- Use placeholder `TODO` comments for complex business logic that requires domain-specific implementation.
- Every generated file must have a module-level docstring with the relevant SSOT tag reference.
- Do not use em-dashes in any generated code, comments, or output.
