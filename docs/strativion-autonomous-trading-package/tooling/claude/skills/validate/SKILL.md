---
name: validate
description: Run all applicable validators on a specified file and report results
---

# /validate: File Validator

You are running a comprehensive validation suite on a file in the Strativion PCTT project. The user provides a file path as an argument (e.g., `/validate src/contexts/agent-contexts/risk_agent.py`). Determine the file type and run all applicable checks. Report results as a pass/fail checklist.

## Step 1: Resolve the File Path

Accept the file path argument. If it is a relative path, resolve it relative to the `Strativion/` project root. Verify the file exists. If it does not exist, respond with: "File not found: {path}. Provide a valid file path relative to the Strativion/ root."

Determine the file type from the extension:
- `.py` = Python
- `.ts` or `.tsx` = TypeScript
- `.yaml` or `.yml` = YAML configuration
- `.json` = JSON
- `.md` = Markdown (SSOT or documentation)

## Step 2: Universal Checks (All File Types)

Run these checks on every file regardless of type:

### 2a. Em-Dash and En-Dash Check
Search the file content for em-dashes (U+2014) and en-dashes (U+2013). Also search for double-hyphens (`--`) that may be intended as em-dashes. Report each occurrence with line number and surrounding context.

- **PASS:** No em-dashes, en-dashes, or double-hyphens found
- **FAIL:** Found {N} occurrences. List each with line number.
- **Fix:** Replace with periods, commas, semicolons, or restructured sentences.

### 2b. SSOT Tag Reference Check
Search the file for SSOT tag references in docstrings, comments, or JSDoc. Valid formats:
- `SSOT: [AG-04]` or `SSOT: [PCTT-01]`
- `@ssot AG-04` or `@ssot PCTT-01`
- `[ref: SSOT-AG-04]`

For Python classes and top-level functions, verify that at least one SSOT tag is present in the docstring. For TypeScript exported functions and classes, verify a `@ssot` JSDoc tag exists.

- **PASS:** All public classes and functions have SSOT tag references
- **WARN:** {N} public symbols missing SSOT references. List them.

### 2c. TODO/FIXME/HACK Check
Search for `TODO`, `FIXME`, `HACK`, `XXX`, or `WORKAROUND` comments. These are not failures but should be reported.

- **INFO:** Found {N} TODO/FIXME markers. List each with line number and content.

### 2d. Secrets Check
Search for patterns that might indicate hardcoded secrets:
- API keys: strings matching `[A-Za-z0-9]{32,}` near keywords like "key", "token", "secret", "password"
- Connection strings with embedded passwords
- Anything resembling `Bearer ...` or `Basic ...` tokens

- **PASS:** No potential secrets detected
- **FAIL:** Potential secret found at line {N}. Review immediately.

## Step 3: Python-Specific Checks (.py files)

### 3a. Ruff Linter
```bash
cd Strativion && python -m ruff check {filepath} --output-format=text
```
- **PASS:** No lint errors
- **FAIL:** {N} lint errors. List each with code, line, and message.
- **Fix:** Run `python -m ruff check {filepath} --fix` for auto-fixable issues.

### 3b. Black Formatter Check
```bash
cd Strativion && python -m black --check --line-length 100 {filepath}
```
- **PASS:** File is properly formatted
- **FAIL:** File needs reformatting.
- **Fix:** Run `python -m black --line-length 100 {filepath}` to auto-format.

### 3c. Mypy Type Check
```bash
cd Strativion && python -m mypy {filepath} --strict --ignore-missing-imports
```
- **PASS:** No type errors
- **FAIL:** {N} type errors. List each with line, code, and message.
- **Fix:** Add type annotations, fix type mismatches, or add `# type: ignore[code]` with justification.

### 3d. Related Test Discovery and Execution
Determine the test file path by mapping the source path:
- `src/contexts/agent-contexts/risk_agent.py` maps to `tests/unit/contexts/agent-contexts/test_risk_agent.py`
- `src/core/event_bus.py` maps to `tests/unit/core/test_event_bus.py`
- `implementations/python-formulas/expectancy.py` maps to `tests/unit/implementations/python-formulas/test_expectancy.py`

If the test file exists, run it:
```bash
cd Strativion && python -m pytest {test_filepath} -v --tb=short
```
- **PASS:** All tests pass ({N}/{N})
- **FAIL:** {M} tests failed out of {N}. List failing test names and error summaries.

If the test file does not exist:
- **WARN:** No test file found at {expected_test_path}. Tests should be created.

### 3e. Decimal Usage Check (for financial code)
If the file is in `src/contexts/agent-contexts/`, `implementations/python-formulas/`, or contains words like "price", "amount", "cost", "profit", "loss", "balance", search for bare `float` usage on monetary values.

- **PASS:** All monetary values use `Decimal`
- **FAIL:** Found `float` used for monetary values at lines {list}. Use `Decimal` from the `decimal` module.

### 3f. Async Pattern Check
For files in `src/contexts/agent-contexts/` or `src/core/`, verify that I/O operations (Redis calls, database queries, HTTP requests, file operations) use `async/await`.

- **PASS:** All I/O operations are async
- **FAIL:** Synchronous I/O found at lines {list}. Convert to async.

## Step 4: TypeScript-Specific Checks (.ts, .tsx files)

### 4a. TypeScript Compiler Check
```bash
cd Strativion/implementations/pctt/engine && npx tsc --noEmit --pretty
```
If the file is in the frontend directory:
```bash
cd Strativion/frontend && npx tsc --noEmit --pretty
```
- **PASS:** No type errors
- **FAIL:** {N} type errors. List each.

### 4b. Related Vitest Execution
Map source to test file:
- `src/stages/pivotDetector.ts` maps to `tests/stages/pivotDetector.test.ts`
- `src/components/TradePanel.tsx` maps to `src/components/TradePanel.test.tsx`

```bash
cd Strativion/implementations/pctt/engine && npx vitest run {test_filepath} --reporter=verbose
```
- **PASS:** All tests pass
- **FAIL:** {M} tests failed. List details.

### 4c. No-Any Check
Search the file for `any` type usage (excluding `// eslint-disable` lines and legitimate `unknown` casts).

- **PASS:** No `any` types found
- **FAIL:** Found `any` at lines {list}. Replace with specific types or `unknown` with type guards.

### 4d. Pure Function Check (PCTT pipeline files only)
For files in `implementations/pctt/engine/src/stages/`, verify:
- No global variable mutation
- No external state access (no `Date.now()`, no `Math.random()`, no network calls)
- All inputs come through function parameters
- All outputs come through return values

- **PASS:** Function is pure
- **FAIL:** Side effects detected at lines {list}. PCTT pipeline functions must be deterministic.

## Step 5: YAML-Specific Checks (.yaml, .yml files)

### 5a. YAML Syntax Validation
Parse the file as YAML and check for syntax errors.
```bash
cd Strativion && python -c "import yaml; yaml.safe_load(open('{filepath}'))"
```
- **PASS:** Valid YAML syntax
- **FAIL:** YAML parse error: {details}

### 5b. Schema Structure Check
Based on the file name, validate against expected structure:
- `canonical/policy/policy.risk.yaml`: must contain `max_risk_per_trade`, `max_portfolio_heat`, `max_correlated_positions`, `drawdown_halt_threshold`
- `canonical/policy/policy.regimes.yaml`: must contain regime type definitions with ER and Hurst boundaries
- `canonical/policy/policy.sizing.yaml`: must contain Kelly fraction parameters
- `rules/*.yaml`: must contain rule definitions with IDs and conditions

- **PASS:** All expected keys present
- **FAIL:** Missing required keys: {list}

### 5c. Value Range Check
For numeric values in configuration files, check against known safe ranges from the SSOT:
- `max_risk_per_trade`: must be <= 0.02 (2%)
- `max_portfolio_heat`: must be <= 0.08 (8%)
- `max_correlated_positions`: must be <= 5
- `drawdown_halt_threshold`: must be <= 0.20 (20%)
- `kelly_divisor`: must be >= 4

- **PASS:** All values within SSOT-defined ranges
- **FAIL:** Value {key}={value} exceeds safe range. SSOT specifies {expected_range}.

## Step 6: JSON-Specific Checks (.json files)

### 6a. JSON Syntax Validation
```bash
cd Strativion && python -c "import json; json.load(open('{filepath}'))"
```
- **PASS:** Valid JSON
- **FAIL:** JSON parse error: {details}

### 6b. Package.json Checks (if applicable)
If the file is a `package.json`, verify:
- All required scripts exist (`dev`, `build`, `test`, `lint`)
- No wildcard version ranges (`*`)
- No obviously outdated major versions

## Step 7: Report Results

Output the validation report in this format:

```
## Validation Report: {filepath}

**File Type:** {type}
**Lines:** {line_count}
**Overall:** {PASS/FAIL/WARN}

### Universal Checks
| # | Check | Result | Details |
|---|-------|--------|---------|
| 1 | Em-dash/En-dash | PASS/FAIL | {details} |
| 2 | SSOT Tag References | PASS/WARN | {details} |
| 3 | TODO/FIXME markers | INFO | {count} found |
| 4 | Secrets scan | PASS/FAIL | {details} |

### {Language}-Specific Checks
| # | Check | Result | Details |
|---|-------|--------|---------|
| 1 | {check_name} | PASS/FAIL | {details} |
| ... | ... | ... | ... |

### Summary
- **Passed:** {N} checks
- **Failed:** {M} checks
- **Warnings:** {W} checks

### Suggested Fixes
1. {fix_description} (line {N})
2. ...
```

If all checks pass, add: "File is fully compliant. No action required."

If any checks fail, add: "Fix the {M} failing checks before committing this file."
