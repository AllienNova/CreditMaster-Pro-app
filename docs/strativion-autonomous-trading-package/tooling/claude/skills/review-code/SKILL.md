---
name: review-code
description: Perform an architectural review of source files checking SSOT compliance, coding standards, security, and test coverage
---

# /review-code Skill

You are performing a thorough architectural review of Strativion PCTT source code. Every review checks four dimensions: SSOT compliance, coding standards, security, and test coverage. The output is a structured report with PASS, WARN, and FAIL verdicts for each check.

## Arguments

Accept a file path or directory path relative to the Strativion project root. Examples:
- `/review-code src/contexts/agent-contexts/risk/agent.py`
- `/review-code src/contexts/agent-contexts/sentinel/`
- `/review-code src/core/`

If a directory is given, review all `.py`, `.ts`, and `.tsx` files within it recursively.

## SSOT Reference Files

These files contain the authoritative specifications:

| Domain | File |
|--------|------|
| Agents AG-01 to AG-05, META, ARCH | `implementations/pctt/SSOT.md` |
| Agents AG-06 to AG-11 | `implementations/pctt/SSOT-batch1b.md` |
| Dataclasses (DC), Events (EVT) | `implementations/pctt/SSOT-batch1c.md` |
| Tools (TOOL), Config (CFG), Formulas (FRM-01 to FRM-08) | `implementations/pctt/SSOT-batch2a.md` |
| APIs (API) | `implementations/pctt/SSOT-batch2a-apis.md` |
| UI, Security (SEC), Infrastructure (INF), Deployment (DEP), File structure (FILE) | `implementations/pctt/SSOT-batch2b.md` |
| Enhanced formulas (FRM-09 to FRM-11), edge cases, enhancements | `implementations/pctt/SSOT-enhancements.md` |

## Step 1: Identify Relevant SSOT Sections

For each file under review:

1. **By file path**: Map the path to SSOT domains.
   - `src/contexts/agent-contexts/{name}/` maps to the agent's SSOT-AG-XX tag.
   - `src/core/events/` maps to SSOT-EVT sections.
   - `src/core/dataclasses/` or files with `@dataclass` map to SSOT-DC sections.
   - `src/tools/` or files with `@tool_spec` map to SSOT-TOOL sections.
   - `config/` maps to SSOT-CFG sections.
   - `implementations/python-formulas/` maps to SSOT-FRM sections.
   - `src/ui/` maps to SSOT-UI sections.
   - `src/security/` or `src/auth/` maps to SSOT-SEC sections.

2. **By content**: Scan the file for SSOT tag references (patterns like `SSOT-AG-04`, `SSOT-DC-03`, etc.) and note which tags are claimed.

## Step 2: SSOT Compliance Checks

For each file, verify:

### 2a. Docstring SSOT References
- Every class definition must have a docstring containing an SSOT tag reference (e.g., `"""Risk Agent. Ref: SSOT-AG-04"""`).
- Every public function (not prefixed with `_`) must reference an SSOT tag if it implements a specified behavior.
- **FAIL** if a class has no SSOT reference and should have one based on file path.
- **WARN** if a public function lacks an SSOT reference but appears to implement SSOT-specified behavior.

### 2b. Dataclass Field Matching
- For any `@dataclass` class, read the corresponding SSOT-DC definition from `implementations/pctt/SSOT-batch1c.md`.
- Compare field names, types, and default values.
- **FAIL** if fields are missing, extra, or have wrong types compared to the SSOT spec.
- **WARN** if extra fields exist that are not in the spec (may be intentional extensions).

### 2c. Event Type Matching
- For event classes or event handler registrations, verify against SSOT-EVT definitions in `implementations/pctt/SSOT-batch1c.md`.
- Check that event names, payload fields, and publisher/subscriber assignments match.
- **FAIL** if an event type is used that does not exist in SSOT-EVT.
- **WARN** if an event handler subscribes to events not listed in the agent's SSOT spec.

### 2d. Tool Signature Matching
- For functions decorated with `@tool_spec` or similar, verify against SSOT-TOOL-REGISTRY in `implementations/pctt/SSOT-batch2a.md`.
- Check parameter names, types, return types, permission levels, rate limits.
- **FAIL** if the signature diverges from the SSOT spec.

## Step 3: Coding Standards Checks

### Python Files (.py)

| Check | Rule | Severity |
|-------|------|----------|
| Type hints | All function parameters and return types must have type hints | WARN |
| Async patterns | Agent methods that do I/O must be async; no blocking calls in async context | FAIL |
| Logging | Must use `structlog` (not `logging` module directly) | WARN |
| Bare except | No bare `except:` clauses; must catch specific exceptions | FAIL |
| Import order | stdlib, third-party, local; separated by blank lines | WARN |
| Docstrings | All public classes and functions must have docstrings | WARN |
| No print statements | Use structlog instead of print() | WARN |
| String formatting | Use f-strings, not .format() or % formatting | WARN |

### TypeScript Files (.ts)

| Check | Rule | Severity |
|-------|------|----------|
| Strict mode | `"strict": true` must be in tsconfig or file must not use `any` | FAIL |
| No `any` type | Explicit `any` usage is prohibited; use `unknown` or proper types | FAIL |
| Interface definitions | All data shapes must have interface or type definitions | WARN |
| Null safety | Use optional chaining and nullish coalescing, not truthy checks for null | WARN |

### React Files (.tsx)

| Check | Rule | Severity |
|-------|------|----------|
| Functional components | No class components; all must be functional with hooks | FAIL |
| Recoil state | Global state must use Recoil atoms/selectors, not useState for shared state | WARN |
| Accessibility | Interactive elements must have aria labels or semantic HTML | WARN |
| Key props | List renders must have stable key props (not array index) | WARN |

## Step 4: Security Checks

| Check | Rule | Severity |
|-------|------|----------|
| Hardcoded secrets | No API keys, passwords, tokens, or connection strings in source | FAIL |
| Tool permissions | Tool functions must check caller permissions before execution (ref: SSOT-SEC-02) | FAIL |
| Input validation | All external data (API inputs, user inputs, file reads) must be validated | WARN |
| SQL injection | No string concatenation in database queries; use parameterized queries | FAIL |
| Path traversal | File path inputs must be sanitized against directory traversal | WARN |
| Secrets in logs | No sensitive data (passwords, tokens, PII) in log statements | FAIL |

## Step 5: Test Coverage Check

For each source file `src/{path}/{name}.py`:

1. Check for `tests/{path}/test_{name}.py` (unit tests).
2. Check for `tests/{path}/test_{name}_integration.py` (integration tests).
3. **WARN** if unit test file is missing.
4. **WARN** if integration test file is missing for agent or tool files.
5. If the test file exists, do a quick scan to verify it actually tests the main classes/functions from the source file.

## Output Format

Present the review as a structured report:

```
## Review: {file_or_directory_path}

### Summary
- Files reviewed: {count}
- PASS: {count}
- WARN: {count}
- FAIL: {count}

### FAIL Items (Must Fix)

| # | File | Check | Issue | Fix |
|---|------|-------|-------|-----|
| 1 | src/contexts/agent-contexts/risk/agent.py | SSOT Docstring | RiskAgent class missing SSOT-AG-04 reference | Add `Ref: SSOT-AG-04` to class docstring |
...

### WARN Items (Should Fix)

| # | File | Check | Issue | Suggestion |
|---|------|-------|-------|------------|
| 1 | src/contexts/agent-contexts/risk/tools.py | Type Hints | `check_exposure()` missing return type | Add `-> ExposureReport` return annotation |
...

### PASS Items

| File | Checks Passed |
|------|---------------|
| src/contexts/agent-contexts/risk/memory.py | SSOT, Standards, Security, Tests |
...
```

## Important Rules

- Read every file fully before reviewing. Never review based on assumptions.
- Read the relevant SSOT sections to verify compliance. Do not guess at specs.
- For each FAIL, provide the exact fix needed (code snippet or specific instruction).
- For each WARN, provide a concrete suggestion.
- If a file has no SSOT-relevant content (e.g., utility functions, pure helpers), note it as "N/A for SSOT" and still check coding standards and security.
- Never skip the security check, even for test files.
- Do not use em-dashes in any output.
