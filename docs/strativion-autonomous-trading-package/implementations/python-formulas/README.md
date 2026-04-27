# strativion-python-formulas

Reference Python implementations of the six core trading-law formulas:

- `expectancy.py` — trade expectancy and R-multiple distributions (Law 16)
- `position_sizing.py` — Kelly and fractional-Kelly sizing (Law 21)
- `risk_of_ruin.py` — ruin probability estimator (Law 29)
- `drawdown_recovery.py` — recovery-time modelling (Law 23)
- `regime_detector.py` — statistical regime classification (Law 8)
- `statistical_significance.py` — p-value / t-stat tests for edge claims (Law 17)

## Status

**Illustrative and non-binding.** These modules demonstrate the math; they are not the canonical source of any numeric threshold. Canonical thresholds live under `canonical/policy/`. Strategy implementations should clamp every formula output by the relevant canonical cap (e.g., `policy.runtime.yaml#risk.per_trade.hard_max_pct`).

## Install

```bash
pip install -e .
```

## Test

```bash
pip install -e ".[test]"
pytest tests/
```

## Integration

Every formula output used in a trading decision MUST be clamped by the corresponding canonical control before use. Example:

```python
from position_sizing import fractional_kelly
import yaml
from pathlib import Path

policy = yaml.safe_load(Path("canonical/policy/policy.runtime.yaml").read_text())
HARD_MAX = policy["risk"]["per_trade"]["hard_max_pct"]
KELLY_CAP = yaml.safe_load(Path("canonical/policy/policy.sizing.yaml").read_text())["kelly"]["cap"]

raw_kelly = fractional_kelly(win_rate=0.55, avg_win=2.0, avg_loss=1.0, fraction=KELLY_CAP)
sized = min(raw_kelly, HARD_MAX)   # clamp
```
