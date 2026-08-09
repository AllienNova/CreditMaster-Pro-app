---
name: pctt-check
description: Verify a PCTT pipeline stage against its SSOT specification
---

# /pctt-check: Pipeline Stage Compliance Verifier

You are verifying that a PCTT pipeline stage implementation matches its SSOT specification exactly. The user provides a stage number (1 through 12) as an argument (e.g., `/pctt-check 7`). Run compliance checks, non-repainting verification, and known-answer tests.

## Step 1: Map Stage Number to SSOT Tag and Identity

Accept the stage number argument (1 through 12). Map it using this table:

| Stage | SSOT Tag | Name | Key Function |
|-------|----------|------|-------------|
| 1 | SSOT-PCTT-01 | Pivot Detection | Identify swing highs and lows from OHLCV bars |
| 2 | SSOT-PCTT-02 | Candidate Line Generation | Generate trendline candidates from pivot pairs |
| 3 | SSOT-PCTT-03 | Boundary Estimation | Fit robust regression (Huber/RANSAC) to establish boundaries |
| 4 | SSOT-PCTT-04 | Q-Score Scoring | Score each candidate line on quality metrics |
| 5 | SSOT-PCTT-05 | Regime Detection (Statistical) | Classify market regime using statistical methods |
| 6 | SSOT-PCTT-06 | Regime Detection (Ensemble) | Combine 6 regime detection methods |
| 7 | SSOT-PCTT-07 | Break Detection | Finite state machine for trendline break confirmation |
| 8 | SSOT-PCTT-08 | Line Freezing | Freeze broken trendlines to prevent repainting |
| 9 | SSOT-PCTT-09 | Retest Detection | Detect price retesting the broken trendline |
| 10 | SSOT-PCTT-10 | Rejection Scoring | Score the quality of the retest rejection |
| 11 | SSOT-PCTT-11 | Risk Geometry Filter | Filter by geometric risk/reward (dGeom) |
| 12 | SSOT-PCTT-12 | Pipeline Orchestrator | Wire all stages together, manage data flow |

If the argument is not a number from 1 to 12, respond with:
"Invalid stage number: {input}. PCTT pipeline has 12 stages (1 through 12). Usage: `/pctt-check 7`"

## Step 2: Read the SSOT Stage Specification

Read `implementations/pctt/SSOT-batch1b.md` and search for the HTML comment markers `<!-- SSOT-PCTT-NN -->` through `<!-- /SSOT-PCTT-NN -->` where NN is the zero-padded stage number.

Extract the full specification including:

- **Mathematical definition** (formulas, algorithms, threshold conditions)
- **Input type** (what data structure the stage receives)
- **Output type** (what data structure the stage produces)
- **Parameters** (configurable values with defaults and valid ranges)
- **Invariants** (constraints this stage must enforce, especially non-repainting)
- **Edge cases** (documented boundary conditions)
- **Dependencies** (which previous stages must complete first)

If the stage also references `SSOT-PCTT-NONREPAINT` or `SSOT-PCTT-TRAIL`, read those sections too for additional constraints.

Also check `implementations/pctt/SSOT-batch2a.md` for any CFG (configuration) tags related to this stage's parameters.

## Step 3: Locate the Stage Implementation

Search for the stage implementation files. Expected locations:

```
implementations/pctt/engine/src/stages/{stageName}.ts     # TypeScript implementation
src/pctt/stages/{stage_name}.py           # Python implementation
```

Stage file naming conventions:
| Stage | TypeScript File | Python File |
|-------|----------------|-------------|
| 1 | `pivotDetector.ts` | `pivot_detector.py` |
| 2 | `candidateLineGenerator.ts` | `candidate_line_generator.py` |
| 3 | `boundaryEstimator.ts` | `boundary_estimator.py` |
| 4 | `qScoreCalculator.ts` | `q_score_calculator.py` |
| 5 | `regimeDetectorStatistical.ts` | `regime_detector_statistical.py` |
| 6 | `regimeDetectorEnsemble.ts` | `regime_detector_ensemble.py` |
| 7 | `breakDetector.ts` | `break_detector.py` |
| 8 | `lineFreezer.ts` | `line_freezer.py` |
| 9 | `retestDetector.ts` | `retest_detector.py` |
| 10 | `rejectionScorer.ts` | `rejection_scorer.py` |
| 11 | `riskGeometryFilter.ts` | `risk_geometry_filter.py` |
| 12 | `pipelineOrchestrator.ts` | `pipeline_orchestrator.py` |

If the implementation file does not exist, report: "Stage {N} ({name}) has not been implemented yet. Expected file: {path}. Relevant IMP task: IMP-P2-{NNN}."

Search `implementations/pctt/IMPLEMENTATION-PLAN.md` for the corresponding IMP-P2 task to provide the correct task ID.

## Step 4: Verify Input/Output Types Match SSOT

Read the implementation file and extract:
- The function signature(s) for the main stage entry point
- Input parameter types (TypeScript interfaces or Python type hints)
- Return type

Compare against the SSOT specification:

1. **Input type match:** Every field defined in the SSOT input schema must appear in the implementation's input type. No extra required fields that are not in the SSOT.
2. **Output type match:** Every field defined in the SSOT output schema must appear in the implementation's return type. No missing fields.
3. **Type compatibility:** Numeric types must be compatible (e.g., SSOT says `float64`, implementation uses `number` in TS or `float` in Python).

Report:
```
### Input/Output Type Compliance
| Field | SSOT Type | Implementation Type | Match |
|-------|-----------|-------------------|-------|
| {field} | {ssot_type} | {impl_type} | YES/NO |
```

- **PASS:** All fields match
- **FAIL:** {N} type mismatches found. List each.

## Step 5: Non-Repainting Test

This is the most critical test for any PCTT stage. The non-repainting guarantee means that adding new bars to the end of the data series must never change results for previously processed bars.

### Test Protocol

1. **Generate or locate test data:** Use synthetic OHLCV bar data with known properties, or locate existing test vectors in `tests/fixtures/` or `implementations/pctt/engine/tests/fixtures/`.

2. **First run (N bars):** Feed N bars (e.g., 200) through the stage. Record all outputs for bars 1 through N.

3. **Second run (N+M bars):** Feed N+M bars (e.g., 250, where bars 1-200 are identical and bars 201-250 are new) through the stage. Record all outputs for bars 1 through N+M.

4. **Compare:** The outputs for bars 1 through N from the first run must be IDENTICAL to the outputs for bars 1 through N from the second run. No value may change.

If using TypeScript:
```bash
cd Strativion/implementations/pctt/engine && npx vitest run tests/stages/{stageName}.test.ts -t "non-repainting" --reporter=verbose
```

If using Python:
```bash
cd Strativion && python -m pytest tests/unit/pctt/test_{stage_name}.py -k "non_repainting" -v --tb=long
```

If no non-repainting test exists, **write one** following this pattern:

```python
def test_non_repainting_{stage_name}():
    """Verify that adding new bars does not change historical outputs.

    SSOT: [PCTT-NN], [PCTT-NONREPAINT]
    Invariant: #7 (no future data access)
    """
    bars_200 = generate_synthetic_bars(count=200)
    bars_250 = bars_200 + generate_synthetic_bars(count=50, start_after=bars_200[-1])

    results_200 = stage_function(bars_200)
    results_250 = stage_function(bars_250)

    # First 200 results must be identical
    for i in range(len(results_200)):
        assert results_200[i] == results_250[i], (
            f"Repainting detected at bar {i}: "
            f"200-bar run={results_200[i]}, 250-bar run={results_250[i]}"
        )
```

- **PASS:** No repainting detected. Outputs for bars 1-N are identical across both runs.
- **CRITICAL FAIL:** Repainting detected at bar {i}. This violates System Invariant #7 and must be fixed immediately. The stage must only use data from index <= current bar index.

## Step 6: Known-Answer Test Vectors

Check the SSOT specification for documented test vectors (specific inputs with expected outputs). These are typically listed in the SSOT section under "Test Vectors", "Examples", or "Validation Cases".

For each test vector:
1. Feed the documented input through the stage
2. Compare the actual output against the expected output
3. Allow small floating-point tolerance (1e-10) for numerical comparisons

If running tests:
```bash
cd Strativion && python -m pytest tests/unit/pctt/test_{stage_name}.py -k "known_answer" -v
```

- **PASS:** All test vectors produce expected outputs within tolerance
- **FAIL:** Test vector {ID} expected {expected}, got {actual} (difference: {delta})

If no known-answer tests exist and the SSOT defines test vectors, create the tests.

## Step 7: Parameter Range Validation

From the SSOT, extract all configurable parameters for this stage with their default values and valid ranges. Then:

1. Read the implementation to find where parameters are loaded or defined
2. Verify default values match the SSOT
3. Verify that range validation exists (parameters reject out-of-range values)
4. Cross-reference with `config/master-config.yaml` and any stage-specific config files

Check the SSOT-CFG section in `implementations/pctt/SSOT-batch2a.md` for parameter definitions.

Report:
```
### Parameter Compliance
| Parameter | SSOT Default | Impl Default | SSOT Range | Range Validated | Match |
|-----------|-------------|-------------|-----------|----------------|-------|
| {name} | {value} | {value} | [{min}, {max}] | YES/NO | YES/NO |
```

- **PASS:** All parameters match SSOT defaults and enforce range validation
- **FAIL:** {N} parameter mismatches or missing validations

## Step 8: Pure Function Verification

PCTT pipeline stages must be pure functions: deterministic output for the same input, no side effects, no external state access.

Search the implementation for violations:

1. **Global variable reads or writes** (any reference to module-level mutable state)
2. **Current time access** (`Date.now()`, `time.time()`, `datetime.now()`)
3. **Random number generation** (`Math.random()`, `random.random()`) without deterministic seeding
4. **Network calls** (HTTP requests, WebSocket, database queries)
5. **File I/O** (reading or writing files during computation)
6. **Logging with side effects** (logging that affects control flow)

Permitted:
- Reading from function parameters
- Creating local variables
- Returning computed values
- Importing pure utility functions
- Logging that does not affect return values

Report each violation with file, line number, and the offending code.

- **PASS:** No side effects detected. Function is pure.
- **FAIL:** {N} side effects found. List each with remediation.

## Step 9: Run Full Stage Test Suite

If test files exist, run the complete test suite for this stage:

```bash
cd Strativion && python -m pytest tests/unit/pctt/test_{stage_name}.py -v --tb=short --cov=src/pctt/stages/{stage_name} --cov-report=term-missing
```

Or for TypeScript:
```bash
cd Strativion/implementations/pctt/engine && npx vitest run tests/stages/{stageName}.test.ts --reporter=verbose --coverage
```

Record: total tests, passed, failed, coverage percentage.

## Step 10: Report Results

Output the full compliance report:

```
## PCTT Stage {N} Compliance Report: {Stage Name}

**SSOT Tag:** SSOT-PCTT-{NN}
**Implementation:** {filepath}
**Overall Status:** {COMPLIANT / NON-COMPLIANT / NOT IMPLEMENTED}

### Input/Output Type Compliance
| Check | Status |
|-------|--------|
| Input schema matches SSOT | PASS/FAIL |
| Output schema matches SSOT | PASS/FAIL |

### Non-Repainting Test
| Check | Status | Details |
|-------|--------|---------|
| N-bar vs N+M-bar consistency | PASS/CRITICAL FAIL | {details} |
| No future data access in code | PASS/FAIL | {details} |

### Known-Answer Test Vectors
| Vector ID | Expected | Actual | Status |
|-----------|----------|--------|--------|
| {id} | {value} | {value} | PASS/FAIL |

### Parameter Compliance
| Parameter | Default Match | Range Validated | Status |
|-----------|-------------|----------------|--------|
| {name} | YES/NO | YES/NO | PASS/FAIL |

### Pure Function Verification
| Check | Status | Details |
|-------|--------|---------|
| No global state | PASS/FAIL | {details} |
| No time access | PASS/FAIL | {details} |
| No randomness | PASS/FAIL | {details} |
| No I/O | PASS/FAIL | {details} |

### Test Suite Results
| Metric | Value |
|--------|-------|
| Total Tests | {N} |
| Passed | {N} |
| Failed | {N} |
| Line Coverage | {X}% |

### Deviations from SSOT
(list any differences between implementation and specification, with severity: CRITICAL / MAJOR / MINOR)

### Recommendations
1. {actionable fix or improvement}
2. ...
```

### Severity Definitions
- **CRITICAL:** Non-repainting violation, incorrect mathematical formula, missing invariant enforcement. Must fix before any other work.
- **MAJOR:** Type mismatch, missing parameter validation, untested guardrail. Fix before integration testing.
- **MINOR:** Style issue, missing documentation, suboptimal but correct implementation. Fix during polish phase.

If the stage is not yet implemented, output:
```
## PCTT Stage {N}: {Stage Name} - NOT IMPLEMENTED

**SSOT Tag:** SSOT-PCTT-{NN}
**Expected File:** {filepath}
**IMP Task:** {task_id} ({task_title})
**Task Status:** {status from PROGRESS-TRACKER.md}
**Dependencies:** {list from IMP task}

To implement this stage, run: `/implement {task_id}`
```
