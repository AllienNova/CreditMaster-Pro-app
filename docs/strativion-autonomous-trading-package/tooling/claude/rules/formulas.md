---
paths:
  - "implementations/python-formulas/**/*.py"
---

# Formula Module Rules (Strativion PCTT Platform)

## SSOT Specification Compliance
- Every formula module MUST match its `SSOT-FRM-XX` specification EXACTLY: parameters, return types, and mathematical definition.
- Include LaTeX notation in docstrings for the core equation:
  ```python
  r"""Expectancy: E = (W * avg_win) - (L * avg_loss)
  SSOT Ref: SSOT-FRM-01"""
  ```
- Any deviation from the SSOT math requires updating the SSOT document first, then the code.

## Existing Formula Modules (Extend Only, Do Not Rewrite)
- `expectancy.py` (SSOT-FRM-01): Expectancy calculation
- `position_sizing.py` (SSOT-FRM-02): Kelly criterion and fractional Kelly
- `risk_of_ruin.py` (SSOT-FRM-03): Risk of ruin probability
- `drawdown_recovery.py` (SSOT-FRM-04): Drawdown recovery time estimation
- `regime_detector.py` (SSOT-FRM-05): Market regime classification
- `statistical_significance.py` (SSOT-FRM-06): Statistical significance testing

## New Formula Modules (from SSOT Enhancements)
- Transaction cost model (SSOT-FRM-09): Time-of-day adjusted slippage. Must account for spread widening at open/close.
- Q-Score calibration (SSOT-FRM-10): Use Platt scaling for probability calibration. No arbitrary sigmoid functions.
- Adaptive risk feedback (SSOT-FRM-11): Rolling win rate and Sharpe ratio scaling. Window size defined in SSOT-CFG.

## Input Validation
- Validate ALL inputs against valid ranges defined in the SSOT before computing.
- Raise `ValueError` with a descriptive message for out-of-range inputs. Include the parameter name, received value, and valid range.
- Check for: negative values where only positive allowed, zero denominators, empty sequences, NaN inputs.

## Return Types
- Return `@dataclass` result objects. NEVER return raw tuples, dicts, or bare floats.
- Result dataclasses include the computed value plus metadata: input parameters used, computation timestamp, confidence interval if applicable.

## Numerical Safety
- Handle edge cases explicitly: division by zero, empty arrays, NaN propagation, overflow.
- Use `math.isnan()` and `math.isinf()` checks before returning results.
- For division, use a helper: `safe_divide(numerator, denominator, default=0.0)`.
- Floating point comparisons use `math.isclose()` with appropriate tolerances, never `==`.

## Performance Constraints
- No numpy or pandas in core formula modules. Use pure Python with the `math` module for speed.
- numpy is permitted ONLY in batch analysis wrappers (files suffixed `_batch.py`).
- Core formulas must execute in under 1ms for single-trade calculations.

## Testing
- Minimum 5 known-answer test vectors per formula, sourced from the SSOT specification.
- Test vectors must cover: normal case, boundary values, edge cases (zero, minimum, maximum), and error conditions.
- Property-based tests with `hypothesis` for mathematical invariants (e.g., position size is always positive, expectancy sign matches win rate vs. loss rate).
