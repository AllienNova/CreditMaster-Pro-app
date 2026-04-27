---
paths:
  - "src/**/*.py"
  - "contexts/agent-contexts/**/*.py"
  - "core/**/*.py"
---

# Python Backend Rules (Strativion PCTT Platform)

## Language and Typing
- Python 3.11+ required. Use modern syntax (match/case, `X | Y` union types).
- Mandatory type hints on ALL function signatures and return types. No untyped public functions.
- Use `@dataclass` for all data structures. Reference `SSOT-DC-REGISTRY` tag in the class docstring.
- No mutable default arguments in function signatures. Use `field(default_factory=...)` for dataclass fields.
- Maximum function length: 50 lines. Extract private helpers for longer logic.

## Async and I/O
- Use `async def` for ALL I/O operations: Redis, PostgreSQL, HTTP, WebSocket, file I/O.
- External service calls MUST use the circuit breaker pattern via `pybreaker`. Config: `fail_max=3`, `reset_timeout=30` seconds.
- Use `tenacity` for retry logic with exponential backoff on transient failures. Set `max_attempts=3`, `wait=wait_exponential(multiplier=1, max=10)`.

## SSOT Compliance
- Every class and public function docstring MUST include an `SSOT Ref: SSOT-XX-YY` tag.
- All agent classes inherit from `BaseAgent` defined in `SSOT-DC-REGISTRY.BaseAgent`.
- Handoff between agents uses the `AgentResult.next_agent` field (Swarm pattern). Never call another agent directly.

## Tool Decorators
- Every tool function decorated with `@tool_spec` must define: `name`, `permission_level`, `timeout`, `rate_limit`.
- Tool permissions are enforced at runtime against the SSOT-SEC-02 permission matrix.

## Logging
- Use `structlog` for ALL logging. Do not use stdlib `logging` module.
- Always bind `agent_name` and `correlation_id` to the log context at function entry.
- Log at appropriate levels: DEBUG for internals, INFO for state transitions, WARNING for recoverable errors, ERROR for failures.

## Error Handling
- No bare `except:` clauses. Always catch specific exceptions.
- Catch the narrowest exception type possible. Prefer `except ValueError` over `except Exception`.
- Re-raise unknown exceptions after logging. Never silently swallow errors.

## Import Order (enforced by ruff)
1. Standard library imports
2. Blank line
3. Third-party imports (`fastapi`, `redis`, `sqlalchemy`, `structlog`, `pybreaker`, `tenacity`)
4. Blank line
5. Local/project imports (`from core...`, `from agents...`)

## Code Style
- Use `ruff` for linting and formatting. Config in `pyproject.toml`.
- String formatting: f-strings preferred. No `%` formatting or `.format()` calls.
- Constants in UPPER_SNAKE_CASE at module level.
- Private methods prefixed with underscore.
- Prefer composition over inheritance (except the required `BaseAgent` hierarchy).
