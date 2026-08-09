---
name: add-agent
description: Scaffold a complete new PCTT agent from its SSOT-AG-XX specification with all modules and tests
---

# /add-agent Skill

You are scaffolding a complete Strativion PCTT agent from its SSOT specification. This creates the full directory structure, all module files, test files, and system wiring needed for a functional agent.

## Arguments

One required argument: the agent name in lowercase (e.g., `risk`, `sentinel`, `calibration`).

Example: `/add-agent risk`

## Agent Name to SSOT Tag Mapping

| Agent Name | Tag | SSOT File |
|------------|-----|-----------|
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

## Step 1: Read the Full SSOT Specification

1. Read the agent's complete section from the mapped SSOT file. Search for the `<!-- SSOT-AG-{XX} -->` marker and extract everything until the next agent marker or section boundary.
2. From the spec, extract:
   - **Agent purpose and description**
   - **System prompt / instructions**
   - **Memory dataclass fields** (names, types, defaults, descriptions)
   - **Tool list** (names, descriptions, parameter signatures)
   - **Guardrail rules** (conditions, actions, thresholds)
   - **Event subscriptions** (which events this agent listens to)
   - **Event publications** (which events this agent emits)
   - **Config keys consumed** (from config/*.yaml files)
   - **Dependencies** (other agents or services this agent calls)
3. Also read relevant sections from:
   - `implementations/pctt/SSOT-batch1c.md` for dataclass (SSOT-DC) and event (SSOT-EVT) definitions used by this agent.
   - `implementations/pctt/SSOT-batch2a.md` for tool specifications (SSOT-TOOL) assigned to this agent.
   - `implementations/pctt/SSOT-batch2b.md` for security permissions (SSOT-SEC-02) relevant to this agent.

## Step 2: Create Directory Structure

Create the following files and directories:

```
src/contexts/agent-contexts/{agent_name}/
    __init__.py
    agent.py
    memory.py
    tools.py
    guardrails.py
    events.py
    config.py

tests/contexts/agent-contexts/
    test_{agent_name}.py
    test_{agent_name}_integration.py
```

## Step 3: Generate __init__.py

```python
"""
{AgentName} Agent package.
Ref: SSOT-AG-{XX}
"""

from .agent import {AgentClassName}
from .memory import {MemoryClassName}

__all__ = [
    "{AgentClassName}",
    "{MemoryClassName}",
]
```

## Step 4: Generate agent.py (Main Agent Class)

```python
"""
{AgentName} Agent: {one-line purpose from SSOT}.
Ref: SSOT-AG-{XX}
"""

import structlog
from typing import Any

from core.base_agent import BaseAgent
from core.events import EventBus, Event
from core.config import ConfigManager

from .memory import {MemoryClassName}
from .tools import {list_tool_imports}
from .guardrails import {GuardrailClassName}
from .events import {EventHandlerImports}
from .config import {CONFIG_KEYS_CONSTANT}

logger = structlog.get_logger(__name__)


class {AgentClassName}(BaseAgent):
    """
    {Full description from SSOT spec.}

    Ref: SSOT-AG-{XX}

    Responsibilities:
    {bulleted list from SSOT}

    Dependencies:
    {list of other contexts/agent-contexts/services}
    """

    AGENT_ID = "AG-{XX}"
    AGENT_NAME = "{agent_name}"

    def __init__(
        self,
        event_bus: EventBus,
        config: ConfigManager,
    ) -> None:
        super().__init__(event_bus=event_bus, config=config)
        self.memory = {MemoryClassName}()
        self.guardrails = {GuardrailClassName}()
        self._register_tools()
        self._subscribe_events()
        logger.info("agent.initialized", agent=self.AGENT_NAME)

    def _register_tools(self) -> None:
        """Register all tools available to this agent."""
        self.tools = {
            {for each tool: '"{tool_name}": {tool_function},'}
        }

    def _subscribe_events(self) -> None:
        """Subscribe to events defined in SSOT spec."""
        {for each event subscription:
        self.event_bus.subscribe("{event_type}", self._handle_{event_type})}

    async def process(self, input_data: Any) -> Any:
        """
        Main processing loop for the {agent_name} agent.

        Args:
            input_data: Input payload specific to this agent's role.

        Returns:
            Processed result.
        """
        logger.info("agent.processing", agent=self.AGENT_NAME)
        # TODO: Implement main processing logic per SSOT-AG-{XX}
        raise NotImplementedError("Implement per SSOT-AG-{XX} specification")

    {for each event handler:
    async def _handle_{event_type}(self, event: Event) -> None:
        """Handle {event_type} event. Ref: SSOT-EVT-{YY}"""
        logger.info("event.received", event_type="{event_type}", agent=self.AGENT_NAME)
        # TODO: Implement handler logic
    }
```

## Step 5: Generate memory.py

```python
"""
Memory dataclass for the {AgentName} agent.
Ref: SSOT-AG-{XX}, SSOT-DC-{YY}
"""

from dataclasses import dataclass, field
from typing import {required_types}
from datetime import datetime


@dataclass
class {MemoryClassName}:
    """
    Persistent memory state for the {agent_name} agent.

    Ref: SSOT-DC-{YY}

    Fields are defined by the SSOT dataclass specification.
    """

    {for each field from SSOT-DC spec:
    {field_name}: {field_type} = {default_value}  # {description}}

    def reset(self) -> None:
        """Reset memory to initial state."""
        self.__init__()
```

## Step 6: Generate tools.py

Follow the same pattern as the `/add-tool` skill for each tool. Include all tools listed in the agent's SSOT spec. Each tool gets:
- `@tool_spec` decorator with all metadata
- Full type hints
- Input validation
- Structlog logging
- TODO placeholder for core logic
- Docstring with SSOT-TOOL-XX reference

## Step 7: Generate guardrails.py

```python
"""
Guardrail rules for the {AgentName} agent.
Ref: SSOT-AG-{XX}
"""

import structlog
from typing import Any
from dataclasses import dataclass

logger = structlog.get_logger(__name__)


@dataclass
class GuardrailRule:
    """A single guardrail rule definition."""
    name: str
    condition: str
    action: str
    threshold: float | None = None


class {GuardrailClassName}:
    """
    Enforces operational guardrails for the {agent_name} agent.

    Ref: SSOT-AG-{XX} (guardrails section)
    """

    def __init__(self) -> None:
        self.rules: list[GuardrailRule] = [
            {for each guardrail from SSOT:
            GuardrailRule(
                name="{rule_name}",
                condition="{condition}",
                action="{action}",
                threshold={threshold},
            ),}
        ]

    def check_all(self, context: dict[str, Any]) -> list[str]:
        """
        Run all guardrail checks against the given context.

        Args:
            context: Dictionary of current state values to check.

        Returns:
            List of violation messages. Empty list means all checks passed.
        """
        violations: list[str] = []
        for rule in self.rules:
            # TODO: Implement check logic for each rule
            pass
        return violations

    def enforce(self, context: dict[str, Any]) -> None:
        """
        Check guardrails and raise if any are violated.

        Raises:
            GuardrailViolation: If any guardrail rule is violated.
        """
        violations = self.check_all(context)
        if violations:
            logger.warning(
                "guardrail.violations",
                agent="{agent_name}",
                violations=violations,
            )
            raise GuardrailViolation(violations)
```

## Step 8: Generate events.py

```python
"""
Event definitions and handlers for the {AgentName} agent.
Ref: SSOT-AG-{XX}, SSOT-EVT-{list}
"""

from typing import Any
from core.events import Event, EventType


# Events this agent publishes
{for each published event:
{EVENT_CONSTANT} = EventType("{event_name}")  # Ref: SSOT-EVT-{YY}
}

# Events this agent subscribes to
SUBSCRIPTIONS = [
    {for each subscription:
    EventType("{event_name}"),  # Ref: SSOT-EVT-{YY}}
]
```

## Step 9: Generate config.py

```python
"""
Configuration keys consumed by the {AgentName} agent.
Ref: SSOT-AG-{XX}, SSOT-CFG-{list}
"""

# Config keys this agent reads from config/*.yaml
# Each key maps to its SSOT-CFG reference and expected type

CONFIG_KEYS = {
    {for each config key from SSOT:
    "{key_path}": {
        "ref": "SSOT-CFG-{XX}",
        "type": "{expected_type}",
        "source": "config/{yaml_file}",
        "description": "{description}",
    },}
}
```

## Step 10: Generate Unit Tests

Create `tests/contexts/agent-contexts/test_{agent_name}.py`:

```python
"""
Unit tests for the {AgentName} agent.
Ref: SSOT-AG-{XX}
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from src.agents.{agent_name}.agent import {AgentClassName}
from src.agents.{agent_name}.memory import {MemoryClassName}
from src.agents.{agent_name}.guardrails import {GuardrailClassName}


@pytest.fixture
def event_bus():
    return MagicMock()


@pytest.fixture
def config():
    return MagicMock()


@pytest.fixture
def agent(event_bus, config):
    return {AgentClassName}(event_bus=event_bus, config=config)


class TestAgentInitialization:

    def test_agent_creates_with_correct_id(self, agent):
        assert agent.AGENT_ID == "AG-{XX}"
        assert agent.AGENT_NAME == "{agent_name}"

    def test_memory_initialized(self, agent):
        assert isinstance(agent.memory, {MemoryClassName})

    def test_guardrails_initialized(self, agent):
        assert isinstance(agent.guardrails, {GuardrailClassName})

    def test_tools_registered(self, agent):
        assert len(agent.tools) > 0
        {for each tool:
        assert "{tool_name}" in agent.tools}

    def test_events_subscribed(self, agent, event_bus):
        {for each subscription:
        event_bus.subscribe.assert_any_call("{event_type}", agent._handle_{event_type})}


class TestMemory:

    def test_memory_default_values(self):
        memory = {MemoryClassName}()
        {for each field:
        assert memory.{field_name} == {default_value}}

    def test_memory_reset(self):
        memory = {MemoryClassName}()
        # Modify a field
        # Call reset
        memory.reset()
        # Verify defaults restored


class TestGuardrails:

    def test_no_violations_on_valid_context(self):
        guardrails = {GuardrailClassName}()
        violations = guardrails.check_all({valid_context})
        assert len(violations) == 0

    def test_violation_detected(self):
        guardrails = {GuardrailClassName}()
        violations = guardrails.check_all({violating_context})
        assert len(violations) > 0
```

## Step 11: Generate Integration Tests

Create `tests/contexts/agent-contexts/test_{agent_name}_integration.py`:

```python
"""
Integration tests for the {AgentName} agent.
Ref: SSOT-AG-{XX}
"""

import pytest
from unittest.mock import AsyncMock, MagicMock

from src.agents.{agent_name}.agent import {AgentClassName}


@pytest.fixture
def event_bus():
    bus = MagicMock()
    bus.publish = AsyncMock()
    return bus


@pytest.fixture
def config():
    # Load test config values matching SSOT-CFG specs
    return MagicMock()


@pytest.fixture
def agent(event_bus, config):
    return {AgentClassName}(event_bus=event_bus, config=config)


class TestEventHandling:

    @pytest.mark.asyncio
    async def test_handles_{event_type}_event(self, agent):
        """Test that agent processes {event_type} events correctly."""
        event = MagicMock(type="{event_type}", payload={sample_payload})
        await agent._handle_{event_type}(event)
        # Assert expected side effects


class TestToolIntegration:

    @pytest.mark.asyncio
    async def test_{tool_name}_updates_memory(self, agent):
        """Test that {tool_name} updates agent memory correctly."""
        # Invoke tool
        # Assert memory state changed as expected
        pass


class TestAgentLifecycle:

    @pytest.mark.asyncio
    async def test_full_processing_cycle(self, agent):
        """Test a complete input-to-output cycle."""
        # Provide input
        # Call process
        # Verify output and events published
        pass
```

## Step 12: Wire into System

### Agent Registry

If `src/contexts/agent-contexts/registry.py` or `src/core/agent_registry.py` exists, add the new agent:

```python
from src.agents.{agent_name} import {AgentClassName}

AGENT_REGISTRY["{agent_name}"] = {AgentClassName}
```

### Event Subscriptions

Verify that the event types used in `events.py` exist in the core event system. If not, add them to `src/core/events.py` or the event type registry.

### Config Entries

Check if the config keys in `config.py` exist in the appropriate `config/*.yaml` files. If new keys are needed, add them with default values and a comment referencing the SSOT-CFG tag.

## Step 13: Verify

Run the unit tests:

```bash
pytest tests/contexts/agent-contexts/test_{agent_name}.py -v
```

Report any failures and their causes.

## Step 14: Final Report

```
## Agent Scaffolding Complete: {agent_name} (SSOT-AG-{XX})

### Files Created
- src/contexts/agent-contexts/{agent_name}/__init__.py
- src/contexts/agent-contexts/{agent_name}/agent.py
- src/contexts/agent-contexts/{agent_name}/memory.py
- src/contexts/agent-contexts/{agent_name}/tools.py
- src/contexts/agent-contexts/{agent_name}/guardrails.py
- src/contexts/agent-contexts/{agent_name}/events.py
- src/contexts/agent-contexts/{agent_name}/config.py
- tests/contexts/agent-contexts/test_{agent_name}.py
- tests/contexts/agent-contexts/test_{agent_name}_integration.py

### Files Modified
- src/contexts/agent-contexts/registry.py (agent registered)
- src/core/events.py (new event types, if any)
- config/{relevant}.yaml (new config keys, if any)

### SSOT Coverage

| Spec Item | Status |
|-----------|--------|
| Agent class | Scaffolded |
| Memory dataclass ({N} fields) | Implemented |
| Tools ({N} tools) | Scaffolded with TODOs |
| Guardrails ({N} rules) | Scaffolded with TODOs |
| Event subscriptions ({N}) | Wired |
| Event publications ({N}) | Defined |
| Config keys ({N}) | Mapped |
| Unit tests | Created |
| Integration tests | Created |

### TODO Items Remaining
- [ ] Implement `process()` main logic in agent.py
- [ ] Implement core logic in each tool function
- [ ] Implement guardrail check conditions
- [ ] Implement event handler logic
- [ ] Run full test suite and fix failures
- [ ] Update /progress with relevant IMP task IDs
```

## Important Rules

- Never generate an agent without first reading its complete SSOT specification. If the tag does not exist, stop and inform the user.
- Every generated file must have a module-level docstring with the SSOT tag reference.
- All class and function names must follow the project's naming conventions: PascalCase for classes, snake_case for functions and variables.
- Use `structlog` throughout, never the standard `logging` module.
- All agent methods that perform I/O must be async.
- Do not fabricate spec items. If something is ambiguous in the SSOT, add a TODO comment and note it in the final report.
- If the agent directory already exists, do not overwrite files. Instead, report what exists and ask the user whether to merge or replace.
- Do not use em-dashes in any generated code, comments, or output.
