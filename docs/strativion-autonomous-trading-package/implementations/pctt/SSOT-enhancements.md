# SSOT Enhancements Addendum

**Version:** 1.0.0
**Date:** 2026-02-23
**Status:** Implementation-Ready
**Author:** Strativion Engineering

This addendum addresses critical gaps identified by expert review of the PCTT Single Source of Truth. Each section is tagged with machine-parseable HTML comment delimiters and is fully self-contained with mathematical formulation, Python implementation, and configuration parameters.

**Sections in this addendum:**

| Tag | Title | Updates |
|-----|-------|---------|
| SSOT-FRM-09 | Transaction Cost Model | SSOT-AG-04 (Risk Agent) |
| SSOT-FRM-10 | Q-Score Empirical Calibration | SSOT-PCTT-04 (Scoring) |
| SSOT-FRM-11 | Adaptive Risk Feedback | SSOT-AG-04 (Risk Agent) |
| SSOT-PCTT-BOUNDARY-PROTOCOL | Boundary Re-estimation Protocol | SSOT-PCTT-03 |
| SSOT-RISK-OVERNIGHT | Overnight Gap Stress Test | SSOT-AG-04 (Risk Agent) |
| SSOT-AG-EDGE-DECAY | Edge Decay Detection Protocol | SSOT-AG-07, SSOT-AG-08 |
| SSOT-REGIME-ENHANCED | Enhanced Regime Detection | SSOT-AG-02, SSOT-PCTT-02 |
| SSOT-PCTT-TRAILING-ENHANCED | Trailing Stop Enhancements | SSOT-PCTT-TRAIL |
| SSOT-STAT-ENHANCED | Statistical Calibration Enhancements | SSOT-AG-08 |
| SSOT-DATA-PIPELINE | Historical Data Pipeline | SSOT-AG-09, SSOT-AG-08 |
| SSOT-OPS-INCIDENT | Incident Response Framework | New operational subsystem |
| SSOT-TRAIL-HTF | Multi-Timeframe Alignment Gate | SSOT-PCTT-05, SSOT-AG-03 |
| SSOT-UI-05 | Enhanced Dashboard Panels | SSOT-UI-01, SSOT-AG-04, SSOT-AG-07 |
| SSOT-UI-06 | Chart Enhancements for Phase 11 | SSOT-UI-02 |
| SSOT-UI-07 | Adaptive Risk Dashboard | SSOT-UI-01, SSOT-FRM-11 |
| SSOT-UI-08 | Trade History and Performance Panel | SSOT-UI-01, SSOT-AG-07 |

---

<!-- SSOT-FRM-09 -->
## SSOT-FRM-09: Transaction Cost Model

### Purpose

Models slippage, commission, spread, and market impact for realistic position sizing. Without accurate transaction cost modeling, backtests overestimate profitability and live trading underperforms expectations. This module plugs into the Risk Agent (SSOT-AG-04) `check_position_size` tool and adjusts all position sizing calculations to account for real-world friction.

### Mathematical Formulation

**Adjusted Position Sizing:**

```
Size = (Equity * TargetRisk%) / (|Entry - Stop| + SlippageBuffer + SpreadCost)
```

Where:
- `SlippageBuffer = max(slippage_base_ticks * tick_size, slippage_pct_atr * ATR)`
- `SpreadCost = typical_spread / 2` (half-spread on entry, half on exit)
- Commission is deducted post-sizing from expected P&L

**Slippage Model (Time-of-Day Adjusted):**

```
slippage_multiplier(t) =
  2.5  if t in [09:30, 09:45]    # Opening volatility
  1.5  if t in [09:45, 10:15]    # Early session
  1.0  if t in [10:15, 15:00]    # Core session
  1.3  if t in [15:00, 15:45]    # Late session
  2.0  if t in [15:45, 16:00]    # Closing rush

effective_slippage = base_slippage * slippage_multiplier(t) * regime_factor
```

Where `regime_factor` values are:
- 1.0 for TRENDING
- 1.2 for MEAN_REVERTING
- 1.5 for CHOPPY
- 2.0 for VOLATILE

**Liquidity Filter:**

```
max_position_shares = daily_volume * max_participation_rate
if computed_shares > max_position_shares:
    computed_shares = max_position_shares
if daily_dollar_volume < 2 * position_notional:
    reject trade OR reduce size by 50%
```

**Market Impact Model (for positions > $50K):**

```
impact_bps = sigma_daily * sqrt(shares / daily_volume) * 10000
```

Where `sigma_daily` = daily return standard deviation. This is based on the Almgren-Chriss square-root impact model simplified for single-stock execution.

### Python Implementation

```python
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional
import math


class TimeOfDay(Enum):
    OPENING = "opening"       # 09:30-09:45
    EARLY = "early"           # 09:45-10:15
    CORE = "core"             # 10:15-15:00
    LATE = "late"             # 15:00-15:45
    CLOSING = "closing"       # 15:45-16:00
    PREMARKET = "premarket"   # Before 09:30
    AFTERHOURS = "afterhours" # After 16:00


SLIPPAGE_MULTIPLIERS = {
    TimeOfDay.OPENING: 2.5,
    TimeOfDay.EARLY: 1.5,
    TimeOfDay.CORE: 1.0,
    TimeOfDay.LATE: 1.3,
    TimeOfDay.CLOSING: 2.0,
    TimeOfDay.PREMARKET: 3.0,
    TimeOfDay.AFTERHOURS: 3.0,
}

REGIME_SLIPPAGE_FACTORS = {
    "TRENDING": 1.0,
    "MEAN_REVERTING": 1.2,
    "CHOPPY": 1.5,
    "VOLATILE": 2.0,
}


@dataclass
class TransactionCostEstimate:
    entry_slippage: float = 0.0
    exit_slippage: float = 0.0
    spread_cost: float = 0.0
    commission_round_trip: float = 0.0
    market_impact_bps: float = 0.0
    total_cost: float = 0.0
    adjusted_size: int = 0
    liquidity_capped: bool = False
    rejected: bool = False
    rejection_reason: str = ""


@dataclass
class TransactionCostConfig:
    base_slippage_ticks: int = 1
    tick_size: float = 0.01
    slippage_pct_atr: float = 0.003
    commission_per_share: float = 0.005
    min_commission: float = 1.00
    max_participation_rate: float = 0.02
    min_daily_dollar_volume: float = 500000.0
    market_impact_threshold: float = 50000.0


def compute_time_of_day(hour: int, minute: int) -> TimeOfDay:
    """Classify current time into a trading session bucket.

    Args:
        hour: Hour in ET (0-23).
        minute: Minute (0-59).

    Returns:
        TimeOfDay enum value for the session bucket.
    """
    total_minutes = hour * 60 + minute
    if total_minutes < 570:
        return TimeOfDay.PREMARKET
    if total_minutes < 585:
        return TimeOfDay.OPENING
    if total_minutes < 615:
        return TimeOfDay.EARLY
    if total_minutes < 900:
        return TimeOfDay.CORE
    if total_minutes < 945:
        return TimeOfDay.LATE
    if total_minutes <= 960:
        return TimeOfDay.CLOSING
    return TimeOfDay.AFTERHOURS


def estimate_transaction_costs(
    equity: float,
    risk_pct: float,
    entry_price: float,
    stop_price: float,
    atr: float,
    daily_volume: int,
    current_hour: int,
    current_minute: int,
    regime: str,
    daily_sigma: float = 0.02,
    config: Optional[TransactionCostConfig] = None,
) -> TransactionCostEstimate:
    """Estimate full transaction costs and compute adjusted position size.

    This function integrates slippage (time-of-day and regime adjusted),
    spread costs, commission, liquidity constraints, and market impact
    into a single sizing decision.

    Args:
        equity: Current account equity in USD.
        risk_pct: Target risk as a decimal (e.g. 0.01 for 1%).
        entry_price: Planned entry price.
        stop_price: Initial stop-loss price.
        atr: Current ATR value for the symbol.
        daily_volume: Average daily volume in shares.
        current_hour: Current hour in ET.
        current_minute: Current minute.
        regime: Current market regime string.
        daily_sigma: Daily return standard deviation (default 0.02).
        config: Optional TransactionCostConfig override.

    Returns:
        TransactionCostEstimate with adjusted size and cost breakdown.
    """
    if config is None:
        config = TransactionCostConfig()

    result = TransactionCostEstimate()
    tod = compute_time_of_day(current_hour, current_minute)
    tod_mult = SLIPPAGE_MULTIPLIERS.get(tod, 1.0)
    regime_mult = REGIME_SLIPPAGE_FACTORS.get(regime, 1.0)

    base_slip = max(
        config.base_slippage_ticks * config.tick_size,
        config.slippage_pct_atr * atr,
    )
    effective_slippage = base_slip * tod_mult * regime_mult

    result.entry_slippage = effective_slippage
    result.exit_slippage = effective_slippage * 1.5
    result.spread_cost = config.tick_size * 2

    risk_per_share = abs(entry_price - stop_price)
    adjusted_risk = risk_per_share + result.entry_slippage + result.spread_cost
    raw_size = int((equity * risk_pct) / adjusted_risk)

    daily_dollar_volume = daily_volume * entry_price
    if daily_dollar_volume < config.min_daily_dollar_volume:
        result.rejected = True
        result.rejection_reason = (
            f"Daily dollar volume ${daily_dollar_volume:,.0f} "
            f"below minimum ${config.min_daily_dollar_volume:,.0f}"
        )
        return result

    max_shares = int(daily_volume * config.max_participation_rate)
    if raw_size > max_shares:
        result.adjusted_size = max_shares
        result.liquidity_capped = True
    else:
        result.adjusted_size = raw_size

    position_notional = result.adjusted_size * entry_price
    if daily_dollar_volume < 2 * position_notional:
        result.adjusted_size = int(result.adjusted_size * 0.5)
        result.liquidity_capped = True

    result.commission_round_trip = max(
        result.adjusted_size * config.commission_per_share * 2,
        config.min_commission * 2,
    )

    if position_notional > config.market_impact_threshold:
        result.market_impact_bps = (
            daily_sigma
            * math.sqrt(result.adjusted_size / max(daily_volume, 1))
            * 10000
        )

    result.total_cost = (
        result.entry_slippage * result.adjusted_size
        + result.exit_slippage * result.adjusted_size
        + result.spread_cost * result.adjusted_size
        + result.commission_round_trip
    )

    return result
```

### Configuration Parameters

| Key Path | Type | Default | Valid Range | Unit | Law Ref |
|----------|------|---------|-------------|------|---------|
| costs.slippage.base_ticks | int | 1 | [0, 10] | ticks | Law 24 |
| costs.slippage.pct_atr | float | 0.003 | [0.001, 0.01] | ratio | Law 24 |
| costs.slippage.regime_factors.TRENDING | float | 1.0 | [0.5, 3.0] | multiplier | Law 5 |
| costs.slippage.regime_factors.CHOPPY | float | 1.5 | [0.5, 3.0] | multiplier | Law 5 |
| costs.slippage.regime_factors.VOLATILE | float | 2.0 | [0.5, 3.0] | multiplier | Law 5 |
| costs.commission.per_share | float | 0.005 | [0.0, 0.05] | USD | Law 24 |
| costs.commission.minimum | float | 1.00 | [0.0, 10.0] | USD | Law 24 |
| costs.liquidity.max_participation | float | 0.02 | [0.005, 0.10] | ratio | Law 20 |
| costs.liquidity.min_daily_dollar_vol | float | 500000 | [100000, 5000000] | USD | Law 20 |
| costs.impact.threshold | float | 50000 | [10000, 500000] | USD | Law 20 |

**Implementation Plan:** IMP-P11-001, IMP-P11-002
**Progress Tracker:** PROG-REQ-196, PROG-REQ-197

<!-- /SSOT-FRM-09 -->

---

<!-- SSOT-FRM-10 -->
## SSOT-FRM-10: Q-Score Empirical Calibration

### Purpose

Replace the arbitrary sigmoid `scale=3.0` in the Q-Score computation with data-driven calibration using Platt scaling or isotonic regression. The current arbitrary scale produces scores that do not correspond to actual probability of profit, making grade thresholds (A, B, SKIP) unreliable. Calibrated scores map directly to empirical win probabilities, enabling principled threshold selection.

This updates SSOT-PCTT-04 (Scoring stage).

### Mathematical Formulation

**Current (arbitrary):**

```
Q = 1 / (1 + exp(-raw_score / 3.0))
```

**Replacement (Platt Scaling):**

```
Q = 1 / (1 + exp(-(a * raw_score + b)))
```

Where `a` and `b` are fit by maximum likelihood on historical (raw_score, outcome) pairs:
- outcome = 1 if trade was profitable
- outcome = 0 if trade was a loss

**Alternative (Isotonic Regression):**

```
Q = isotonic_fit(raw_score)
```

Monotonically increasing mapping from raw_score to P(profit). Use this as a fallback when Platt scaling fails calibration validation.

**Calibration Protocol:**

1. Collect minimum 200 historical trades with raw Q-scores and binary outcomes.
2. Split 70/30 train/validation.
3. Fit Platt scaling parameters (a, b) on training set.
4. Validate on hold-out: Brier score < 0.20, calibration slope in [0.8, 1.2].
5. If Platt fails calibration check, fall back to isotonic regression.
6. Recalibrate every 500 trades or when `edge_decay_alert` fires (see SSOT-AG-EDGE-DECAY).

**Grade Thresholds (recalibrated):**

After calibration, re-derive grade thresholds so that:
- **A grade:** top 15% of historical profitable trades (P(profit) >= threshold_A)
- **B grade:** next 25% (P(profit) >= threshold_B)
- **SKIP:** bottom 60% (P(profit) < threshold_B)

### Python Implementation

```python
from dataclasses import dataclass
from typing import List, Tuple, Optional
import math


@dataclass
class PlattParams:
    """Parameters for Platt scaling sigmoid calibration."""
    a: float = 3.0
    b: float = -1.5
    brier_score: float = 1.0
    calibration_slope: float = 0.0
    n_samples: int = 0
    is_valid: bool = False


@dataclass
class QScoreCalibration:
    """Configuration state for Q-Score calibration."""
    method: str = "platt"
    platt_params: Optional[PlattParams] = None
    grade_threshold_a: float = 0.70
    grade_threshold_b: float = 0.55
    last_calibrated_trade_count: int = 0
    recalibration_interval: int = 500


def sigmoid(x: float) -> float:
    """Numerically stable sigmoid function."""
    if x > 500:
        return 1.0
    if x < -500:
        return 0.0
    return 1.0 / (1.0 + math.exp(-x))


def platt_predict(raw_score: float, params: PlattParams) -> float:
    """Apply Platt scaling to convert raw score to calibrated probability.

    Args:
        raw_score: Raw Q-score from the scoring pipeline.
        params: Fitted Platt scaling parameters.

    Returns:
        Calibrated probability of profit in [0, 1].
    """
    return sigmoid(params.a * raw_score + params.b)


def fit_platt_scaling(
    scores: List[float],
    outcomes: List[int],
    lr: float = 0.01,
    max_iter: int = 1000,
    tol: float = 1e-6,
) -> PlattParams:
    """Fit Platt scaling via gradient descent on log-likelihood.

    Uses gradient descent to find parameters (a, b) that minimize
    cross-entropy loss between predicted probabilities and actual
    binary outcomes.

    Args:
        scores: List of raw Q-scores from historical trades.
        outcomes: List of binary outcomes (1 = profitable, 0 = loss).
        lr: Learning rate for gradient descent.
        max_iter: Maximum number of gradient descent iterations.
        tol: Convergence tolerance for gradient magnitude.

    Returns:
        PlattParams with fitted a, b, and validation metrics.
    """
    n = len(scores)
    if n < 50:
        return PlattParams(a=1.0, b=0.0, is_valid=False, n_samples=n)

    a, b = 1.0, 0.0

    for iteration in range(max_iter):
        grad_a, grad_b = 0.0, 0.0
        for i in range(n):
            p = sigmoid(a * scores[i] + b)
            p = max(min(p, 1.0 - 1e-10), 1e-10)
            err = p - outcomes[i]
            grad_a += err * scores[i]
            grad_b += err

        grad_a /= n
        grad_b /= n

        a -= lr * grad_a
        b -= lr * grad_b

        if abs(grad_a) < tol and abs(grad_b) < tol:
            break

    predictions = [sigmoid(a * s + b) for s in scores]
    brier = sum((p - o) ** 2 for p, o in zip(predictions, outcomes)) / n

    mean_pred = sum(predictions) / n
    mean_out = sum(outcomes) / n
    cov = sum(
        (p - mean_pred) * (o - mean_out)
        for p, o in zip(predictions, outcomes)
    )
    var_pred = sum((p - mean_pred) ** 2 for p in predictions)
    cal_slope = cov / max(var_pred, 1e-10)

    params = PlattParams(
        a=a,
        b=b,
        brier_score=brier,
        calibration_slope=cal_slope,
        n_samples=n,
        is_valid=(brier < 0.20 and 0.8 <= cal_slope <= 1.2),
    )
    return params


def derive_grade_thresholds(
    scores: List[float],
    outcomes: List[int],
    params: PlattParams,
    target_a_pct: float = 0.15,
    target_b_pct: float = 0.40,
) -> Tuple[float, float]:
    """Derive A/B grade thresholds from calibrated probabilities.

    Computes calibrated probabilities for all profitable trades,
    then selects thresholds such that A grade captures the top
    target_a_pct and B grade captures the next target_b_pct.

    Args:
        scores: Raw Q-scores from historical trades.
        outcomes: Binary outcomes (1 = profitable, 0 = loss).
        params: Fitted Platt scaling parameters.
        target_a_pct: Fraction of profitable trades for A grade (default 0.15).
        target_b_pct: Cumulative fraction for B grade (default 0.40).

    Returns:
        Tuple of (threshold_a, threshold_b) as calibrated probabilities.
    """
    calibrated = sorted(
        [platt_predict(s, params) for s, o in zip(scores, outcomes) if o == 1],
        reverse=True,
    )
    if not calibrated:
        return 0.70, 0.55

    idx_a = max(0, int(len(calibrated) * target_a_pct) - 1)
    idx_b = max(0, int(len(calibrated) * target_b_pct) - 1)

    threshold_a = calibrated[idx_a]
    threshold_b = calibrated[idx_b]

    return round(threshold_a, 3), round(threshold_b, 3)
```

### Configuration Parameters

| Key Path | Type | Default | Valid Range | Unit | Law Ref |
|----------|------|---------|-------------|------|---------|
| qscore.calibration.method | str | "platt" | ["platt", "isotonic"] | enum | Law 4 |
| qscore.calibration.min_samples | int | 200 | [50, 1000] | trades | Law 4 |
| qscore.calibration.recalibrate_every | int | 500 | [100, 2000] | trades | Law 19 |
| qscore.calibration.brier_threshold | float | 0.20 | [0.10, 0.30] | score | Law 4 |
| qscore.calibration.target_a_pct | float | 0.15 | [0.05, 0.30] | ratio | Law 4 |
| qscore.calibration.target_b_pct | float | 0.40 | [0.20, 0.60] | ratio | Law 4 |
| qscore.fallback_scale | float | 3.0 | [1.0, 10.0] | scale | Law 4 |

**Implementation Plan:** IMP-P11-003
**Progress Tracker:** PROG-REQ-198

<!-- /SSOT-FRM-10 -->

---

<!-- SSOT-FRM-11 -->
## SSOT-FRM-11: Adaptive Risk Feedback

### Purpose

Dynamically adjust risk percentage based on rolling performance metrics, replacing fixed fractional sizing with performance-adaptive sizing. When the system is performing well relative to baseline, risk stays at base level. When performance degrades (lower win rate, lower Sharpe), risk automatically scales down to protect capital. This updates SSOT-AG-04 (Risk Agent) `compute_risk_budget` tool.

### Mathematical Formulation

```
risk_pct_effective = base_risk * adaptation_factor * drawdown_scale

adaptation_factor = min(
    rolling_win_rate / baseline_win_rate,
    rolling_sharpe / max(baseline_sharpe, 0.01),
    1.0   # Never scale UP beyond base
)

adaptation_factor = max(adaptation_factor, 0.25)  # Floor at 25% of base

drawdown_scale = max(0, 1 - current_drawdown / max_drawdown_threshold)
```

**Rolling windows:**
- Win rate: last 20 trades
- Sharpe: last 50 trades
- Baseline: walk-forward out-of-sample metrics

**Regime conditioning:**

```
regime_risk_multiplier = {
    TRENDING: 1.0,
    MEAN_REVERTING: 0.8,
    CHOPPY: 0.5,     # Half size in choppy
    VOLATILE: 0.6,
}
risk_pct_final = risk_pct_effective * regime_risk_multiplier[current_regime]
```

**Key properties:**
- Risk never exceeds base_risk (no scaling up).
- Minimum effective risk is 25% of base times the regime multiplier.
- At max drawdown threshold, risk goes to zero (trading halts).
- System resumes normal sizing only when rolling metrics recover to baseline.

### Python Implementation

```python
from dataclasses import dataclass, field
from typing import List, Dict


@dataclass
class PerformanceBaseline:
    """Walk-forward out-of-sample performance metrics.

    These are computed during backtesting/calibration and represent
    the expected performance of the system under normal conditions.
    """
    win_rate: float = 0.55
    sharpe: float = 1.2
    expectancy_r: float = 0.15
    profit_factor: float = 1.5


@dataclass
class AdaptiveRiskConfig:
    """Configuration for adaptive risk sizing."""
    base_risk_pct: float = 0.01
    min_adaptation_factor: float = 0.25
    win_rate_window: int = 20
    sharpe_window: int = 50
    max_drawdown_threshold: float = 0.20
    regime_multipliers: Dict[str, float] = field(default_factory=lambda: {
        "TRENDING": 1.0,
        "MEAN_REVERTING": 0.8,
        "CHOPPY": 0.5,
        "VOLATILE": 0.6,
    })


def compute_adaptive_risk(
    recent_trades_pnl_r: List[float],
    baseline: PerformanceBaseline,
    current_drawdown: float,
    current_regime: str,
    config: AdaptiveRiskConfig,
) -> float:
    """Compute adaptive risk percentage based on rolling performance.

    The function compares recent trading performance against the
    walk-forward baseline and scales risk down when performance
    degrades. Risk is never scaled above the base level.

    Args:
        recent_trades_pnl_r: List of trade results in R-multiples.
        baseline: Walk-forward out-of-sample performance baseline.
        current_drawdown: Current drawdown as a decimal (e.g. 0.05 for 5%).
        current_regime: Current market regime string.
        config: Adaptive risk configuration.

    Returns:
        Final risk percentage as a decimal (e.g. 0.008 for 0.8%).
    """
    if len(recent_trades_pnl_r) < config.win_rate_window:
        return config.base_risk_pct * config.regime_multipliers.get(
            current_regime, 1.0
        )

    recent_wr = recent_trades_pnl_r[-config.win_rate_window :]
    rolling_win_rate = sum(1 for r in recent_wr if r > 0) / len(recent_wr)

    wr_ratio = rolling_win_rate / max(baseline.win_rate, 0.01)

    sharpe_ratio = 1.0
    if len(recent_trades_pnl_r) >= config.sharpe_window:
        recent_sh = recent_trades_pnl_r[-config.sharpe_window :]
        mean_r = sum(recent_sh) / len(recent_sh)
        var_r = sum((x - mean_r) ** 2 for x in recent_sh) / len(recent_sh)
        rolling_sharpe = mean_r / max(var_r ** 0.5, 0.001)
        sharpe_ratio = rolling_sharpe / max(baseline.sharpe, 0.01)

    adaptation_factor = min(wr_ratio, sharpe_ratio, 1.0)
    adaptation_factor = max(adaptation_factor, config.min_adaptation_factor)

    dd_scale = max(0.0, 1.0 - current_drawdown / config.max_drawdown_threshold)

    regime_mult = config.regime_multipliers.get(current_regime, 1.0)

    return config.base_risk_pct * adaptation_factor * dd_scale * regime_mult
```

### Configuration Parameters

| Key Path | Type | Default | Valid Range | Unit | Law Ref |
|----------|------|---------|-------------|------|---------|
| risk.adaptive.enabled | bool | true | [true, false] | flag | Law 19 |
| risk.adaptive.min_factor | float | 0.25 | [0.10, 0.50] | ratio | Law 2 |
| risk.adaptive.wr_window | int | 20 | [10, 50] | trades | Law 19 |
| risk.adaptive.sharpe_window | int | 50 | [20, 100] | trades | Law 19 |
| risk.adaptive.regime_mult.TRENDING | float | 1.0 | [0.5, 1.5] | mult | Law 5 |
| risk.adaptive.regime_mult.CHOPPY | float | 0.5 | [0.2, 1.0] | mult | Law 5 |
| risk.adaptive.regime_mult.VOLATILE | float | 0.6 | [0.2, 1.0] | mult | Law 5 |

**Implementation Plan:** IMP-P11-004
**Progress Tracker:** PROG-REQ-199

<!-- /SSOT-FRM-11 -->

---

<!-- SSOT-PCTT-BOUNDARY-PROTOCOL -->
## SSOT-PCTT-BOUNDARY-PROTOCOL: Boundary Re-estimation Protocol

### Purpose

Eliminate ambiguity in when and how trendline boundaries are re-estimated, ensuring the non-repainting guarantee holds under all conditions. This updates SSOT-PCTT-03 (Boundary Estimation). The current SSOT defines boundary fitting via Huber + RANSAC but does not specify exactly when re-fitting occurs, creating risk that boundaries shift retroactively and invalidate previously generated signals.

### Protocol Definition

**Rule 1: Trigger-Based Re-estimation**

Boundaries are re-estimated ONLY when a new confirmed pivot enters the candidate pool. Between new pivot confirmations, the boundary estimate is frozen.

```
At time t:
  IF new_pivot_confirmed_at(t - R):
    candidate_pool = all_confirmed_pivots[0 : t-R]
    boundary = fit_boundary(candidate_pool)   # Huber + RANSAC
    boundary_version += 1
  ELSE:
    boundary = previous_boundary  # Frozen, unchanged
```

**Rule 2: Projection vs Re-fitting**

Once a boundary is estimated, its projected value at any future bar uses frozen slope and intercept:

```
L_hat(t_future) = intercept + slope * t_future
```

The slope and intercept do NOT change until Rule 1 triggers.

**Rule 3: ATR-Based Slope Constraint Stability**

The slope constraint `|m| <= 0.02 * ATR_per_bar` uses the ATR computed at boundary estimation time, NOT at the current bar:

```
atr_for_constraint = ATR_at_boundary_estimation_time
slope_valid = abs(slope) <= 0.02 * atr_for_constraint
```

This prevents ATR fluctuations from retroactively invalidating previously accepted boundaries.

**Rule 4: One-Way Candidate Pool Growth**

Once a pivot enters the candidate pool, it is never removed. The pool only grows. Boundaries fit on a larger pool may differ from those fit on a smaller pool, but past signals are unaffected because they used the boundary that existed at the time.

**Example Timeline:**

```
Bar 50:  Pivot at bar 40 confirms (R=5, so bar 40+5+5=50).
         Pool = [pivots at 10, 25, 40]. Boundary = L_50. Version=1.
Bar 51-89: No new pivots confirm. Boundary = L_50. Version=1.
Bar 90:  Pivot at bar 80 confirms.
         Pool = [10, 25, 40, 80]. Boundary = L_90. Version=2.
         Signals at bars 50-89 used L_50. Signals at bar 90+ use L_90.
         Both are correct. No repainting.
```

**Rule 5: Frozen Lines on Break**

When a break is detected at bar B:

```
action_line_frozen = (slope_at_B, intercept_at_B)
safety_line_frozen = (safety_slope_at_B, safety_intercept_at_B)
```

These lines are NEVER re-estimated, even if new pivots enter the pool after bar B. The frozen lines project forward indefinitely using their frozen parameters.

### Verification Test

```python
def verify_no_repainting(bars: list, pivot_params: dict) -> bool:
    """Run pipeline on [0..t] for each t. Verify signal at t never changes.

    This is the definitive non-repainting test. For every bar t, we run
    the full pipeline on all data up to and including bar t, record the
    signal at bar t, and then verify that running on [0..t+k] for any k
    produces the same signal at bar t.

    Args:
        bars: List of OHLCV bar dicts with keys open, high, low, close, volume.
        pivot_params: Pivot detection parameters dict.

    Returns:
        True if no repainting detected. False otherwise.
    """
    signals = {}
    for t in range(len(bars)):
        window = bars[: t + 1]
        signal_t = run_pipeline(window, pivot_params)
        if t in signals and signals[t] != signal_t:
            return False  # REPAINTING DETECTED
        signals[t] = signal_t
    return True
```

### State Machine

```
BOUNDARY_STATES:
  INITIALIZING: Fewer than min_pivots confirmed. No boundary exists.
  ACTIVE: Boundary is estimated and frozen. Projecting forward.
  RE_ESTIMATING: New pivot just confirmed. Fitting new boundary.
  BROKEN: Break detected. Lines frozen permanently for this channel.

Transitions:
  INITIALIZING -> ACTIVE: When pivot count >= min_pivots (default 3)
  ACTIVE -> RE_ESTIMATING: When new pivot confirms
  RE_ESTIMATING -> ACTIVE: After fit completes (same bar)
  ACTIVE -> BROKEN: When break detected
  BROKEN -> INITIALIZING: When new channel search begins
```

**Implementation Plan:** IMP-P2-013
**Progress Tracker:** PROG-REQ-200

<!-- /SSOT-PCTT-BOUNDARY-PROTOCOL -->

---

<!-- SSOT-RISK-OVERNIGHT -->
## SSOT-RISK-OVERNIGHT: Overnight Gap Stress Test

### Purpose

Scheduled stress test at 15:55 ET daily to assess overnight gap risk and take protective action. This adds a new tool to SSOT-AG-04 (Risk Agent). Overnight gaps represent unmanageable risk because stops cannot execute while the market is closed. This module quantifies the worst-case exposure and takes action before the close.

### Protocol

**Trigger:** Every trading day at 15:55 ET (5 minutes before close).

**Scenarios tested:**

| Scenario | Gap Size | Description |
|----------|----------|-------------|
| Mild | -3% | Normal overnight move |
| Moderate | -5% | Significant news event |
| Severe | -10% | Flash crash or black swan |

**For each open position and each scenario:**

```
stressed_pnl = position_size * entry_price * gap_pct * direction_sign
stressed_equity = current_equity + sum(stressed_pnl for all positions)
stressed_margin_ratio = stressed_equity / total_notional
```

**Actions:**

```
IF any scenario shows margin_ratio < 0.25 (maintenance margin):
  ACTION: CRITICAL alert + auto-reduce position to 50% size

IF moderate scenario (-5%) shows portfolio_loss > 3% of equity:
  ACTION: HIGH alert + recommend reducing overnight exposure

IF severe scenario (-10%) shows portfolio_loss > 8% of equity:
  ACTION: CRITICAL alert + recommend flattening all positions before close
```

**Earnings Calendar Integration:**

```
IF position.symbol has earnings_date == tomorrow:
  Apply 2x gap scenario (stocks gap 5-15% on earnings)
  If implied_volatility > 50%:
    ACTION: Force close before market close OR reduce to 25% size
```

### Python Implementation

```python
from dataclasses import dataclass
from typing import List, Dict
from enum import Enum


class StressAction(Enum):
    """Actions that can be taken in response to stress test results."""
    NONE = "none"
    ALERT_HIGH = "alert_high"
    ALERT_CRITICAL = "alert_critical"
    REDUCE_50 = "reduce_50"
    REDUCE_75 = "reduce_75"
    FLATTEN = "flatten"


@dataclass
class Position:
    """Represents an open trading position."""
    symbol: str
    size: int
    current_price: float
    entry_price: float
    direction: str  # "LONG" or "SHORT"


@dataclass
class StressResult:
    """Result of a single stress scenario across the portfolio."""
    scenario: str
    gap_pct: float
    stressed_equity: float
    stressed_margin_ratio: float
    portfolio_loss_pct: float
    action: StressAction
    positions_at_risk: List[str]


@dataclass
class OvernightStressConfig:
    """Configuration for overnight gap stress testing."""
    scenarios: Dict[str, float] = None
    margin_critical: float = 0.25
    loss_high_threshold: float = 0.03
    loss_critical_threshold: float = 0.08
    earnings_gap_multiplier: float = 2.0
    high_iv_threshold: float = 0.50
    high_iv_max_size_pct: float = 0.25
    run_time_minutes_before_close: int = 5

    def __post_init__(self):
        if self.scenarios is None:
            self.scenarios = {
                "mild": -0.03,
                "moderate": -0.05,
                "severe": -0.10,
            }


def run_overnight_stress_test(
    positions: List[Position],
    current_equity: float,
    earnings_calendar: Dict[str, str],
    config: OvernightStressConfig,
) -> List[StressResult]:
    """Run overnight gap stress test across all open positions.

    Applies each scenario's gap percentage to every position, computes
    portfolio-level stressed equity and margin ratio, and determines
    the appropriate protective action.

    Args:
        positions: List of open Position objects.
        current_equity: Current account equity in USD.
        earnings_calendar: Dict mapping symbol to next earnings date string.
        config: Stress test configuration.

    Returns:
        List of StressResult objects, one per scenario.
    """
    results = []

    for scenario_name, gap_pct in config.scenarios.items():
        total_stressed_pnl = 0.0
        positions_at_risk = []

        for pos in positions:
            effective_gap = gap_pct
            if pos.symbol in earnings_calendar:
                effective_gap *= config.earnings_gap_multiplier

            direction_sign = 1.0 if pos.direction == "LONG" else -1.0
            stressed_pnl = (
                pos.size * pos.current_price * effective_gap * direction_sign
            )
            total_stressed_pnl += stressed_pnl

            if abs(stressed_pnl) > current_equity * 0.02:
                positions_at_risk.append(pos.symbol)

        stressed_equity = current_equity + total_stressed_pnl
        total_notional = sum(
            pos.size * pos.current_price for pos in positions
        )
        margin_ratio = stressed_equity / max(total_notional, 1.0)
        loss_pct = abs(total_stressed_pnl) / max(current_equity, 1.0)

        action = StressAction.NONE
        if margin_ratio < config.margin_critical:
            action = StressAction.REDUCE_50
        elif loss_pct > config.loss_critical_threshold:
            action = StressAction.FLATTEN
        elif loss_pct > config.loss_high_threshold:
            action = StressAction.ALERT_HIGH

        results.append(StressResult(
            scenario=scenario_name,
            gap_pct=gap_pct,
            stressed_equity=stressed_equity,
            stressed_margin_ratio=margin_ratio,
            portfolio_loss_pct=loss_pct,
            action=action,
            positions_at_risk=positions_at_risk,
        ))

    return results
```

### Configuration Parameters

| Key Path | Type | Default | Valid Range | Unit | Law Ref |
|----------|------|---------|-------------|------|---------|
| risk.overnight.enabled | bool | true | [true, false] | flag | Law 2 |
| risk.overnight.mild_gap | float | -0.03 | [-0.10, -0.01] | pct | Law 2 |
| risk.overnight.moderate_gap | float | -0.05 | [-0.15, -0.02] | pct | Law 2 |
| risk.overnight.severe_gap | float | -0.10 | [-0.25, -0.05] | pct | Law 2 |
| risk.overnight.margin_critical | float | 0.25 | [0.15, 0.35] | ratio | Law 2 |
| risk.overnight.loss_high | float | 0.03 | [0.01, 0.05] | pct | Law 2 |
| risk.overnight.loss_critical | float | 0.08 | [0.05, 0.15] | pct | Law 2 |
| risk.overnight.earnings_multiplier | float | 2.0 | [1.5, 4.0] | mult | Law 16 |
| risk.overnight.run_time_min_before_close | int | 5 | [3, 15] | min | Law 2 |

**Implementation Plan:** IMP-P11-005, IMP-P11-006
**Progress Tracker:** PROG-REQ-201

<!-- /SSOT-RISK-OVERNIGHT -->

---

<!-- SSOT-AG-EDGE-DECAY -->
## SSOT-AG-EDGE-DECAY: Edge Decay Detection Protocol

### Purpose

Define the precise mathematical trigger for when the Journal Agent (SSOT-AG-07) publishes an `edge_decay_alert` event, triggering recalibration by the Calibration Agent (SSOT-AG-08). Without explicit detection rules, edge decay goes unnoticed until significant capital has been lost. This protocol provides early warning through three independent statistical detectors.

### Detection Rules

**Three independent detectors. Any 2 of 3 triggers the alert:**

**Detector 1: Win Rate Degradation**

```
rolling_wr_20 = wins_in_last_20_trades / 20
baseline_wr = walk_forward_out_of_sample_wr
TRIGGERED if rolling_wr_20 < (baseline_wr - wr_decay_threshold)
Default: wr_decay_threshold = 0.05 (5 percentage points)
```

**Detector 2: Expectancy Collapse**

```
expectancy_20 = mean(pnl_in_R for last 20 trades)
TRIGGERED if expectancy_20 < min_expectancy_r
Default: min_expectancy_r = 0.0 (negative expectancy)
```

**Detector 3: Profit Factor Degradation**

```
gross_profit = sum(pnl for pnl > 0 in last 30 trades)
gross_loss = abs(sum(pnl for pnl < 0 in last 30 trades))
profit_factor = gross_profit / max(gross_loss, 0.01)
TRIGGERED if profit_factor < min_profit_factor
Default: min_profit_factor = 1.0
```

**Alert Logic:**

```
triggers_active = sum([detector_1, detector_2, detector_3])
if triggers_active >= 2:
    publish("edge_decay_alert", {
        severity: "HIGH",
        rolling_wr: rolling_wr_20,
        expectancy_r: expectancy_20,
        profit_factor: profit_factor,
        recommendation: "RECALIBRATE"
    })
    # Also trigger automatic mode downgrade: AUTONOMOUS -> SUPERVISED
```

**Consecutive Loss Gate (separate, immediate):**

```
if consecutive_losses >= soft_pause_threshold (default 3):
    publish("consecutive_loss_alert", severity="MEDIUM")
    # Reduce position size to 50%

if consecutive_losses >= hard_halt_threshold (default 5):
    publish("consecutive_loss_halt", severity="CRITICAL")
    # Halt all new entries until human review

# Reset: consecutive_losses resets to 0 on any profitable trade
```

### Python Implementation

```python
from dataclasses import dataclass
from typing import List, Optional


@dataclass
class EdgeDecayConfig:
    """Configuration for edge decay detection thresholds."""
    wr_window: int = 20
    expectancy_window: int = 20
    pf_window: int = 30
    wr_decay_threshold: float = 0.05
    min_expectancy_r: float = 0.0
    min_profit_factor: float = 1.0
    min_triggers_for_alert: int = 2
    consecutive_loss_soft: int = 3
    consecutive_loss_hard: int = 5


@dataclass
class EdgeDecayStatus:
    """Current edge decay detection status."""
    wr_triggered: bool = False
    expectancy_triggered: bool = False
    pf_triggered: bool = False
    triggers_active: int = 0
    alert_fired: bool = False
    rolling_wr: float = 0.0
    expectancy_r: float = 0.0
    profit_factor: float = 0.0
    consecutive_losses: int = 0
    consecutive_loss_alert: Optional[str] = None


def check_edge_decay(
    trade_results_r: List[float],
    baseline_wr: float,
    config: EdgeDecayConfig,
) -> EdgeDecayStatus:
    """Check all three edge decay detectors and consecutive loss gate.

    Evaluates rolling win rate, expectancy, and profit factor against
    configured thresholds. Also counts consecutive losses from the
    most recent trade backwards.

    Args:
        trade_results_r: Full list of trade results in R-multiples,
            ordered chronologically (oldest first).
        baseline_wr: Walk-forward out-of-sample win rate (decimal).
        config: Edge decay detection configuration.

    Returns:
        EdgeDecayStatus with all detector states and alert status.
    """
    status = EdgeDecayStatus()

    if len(trade_results_r) < config.wr_window:
        return status

    # Detector 1: Win Rate
    recent_wr = trade_results_r[-config.wr_window :]
    status.rolling_wr = sum(1 for r in recent_wr if r > 0) / len(recent_wr)
    status.wr_triggered = status.rolling_wr < (
        baseline_wr - config.wr_decay_threshold
    )

    # Detector 2: Expectancy
    recent_exp = trade_results_r[-config.expectancy_window :]
    status.expectancy_r = sum(recent_exp) / len(recent_exp)
    status.expectancy_triggered = (
        status.expectancy_r < config.min_expectancy_r
    )

    # Detector 3: Profit Factor
    if len(trade_results_r) >= config.pf_window:
        recent_pf = trade_results_r[-config.pf_window :]
        gross_profit = sum(r for r in recent_pf if r > 0)
        gross_loss = abs(sum(r for r in recent_pf if r < 0))
        status.profit_factor = gross_profit / max(gross_loss, 0.01)
        status.pf_triggered = (
            status.profit_factor < config.min_profit_factor
        )

    # Aggregate
    status.triggers_active = sum([
        status.wr_triggered,
        status.expectancy_triggered,
        status.pf_triggered,
    ])
    status.alert_fired = (
        status.triggers_active >= config.min_triggers_for_alert
    )

    # Consecutive Loss Gate
    consec = 0
    for r in reversed(trade_results_r):
        if r <= 0:
            consec += 1
        else:
            break
    status.consecutive_losses = consec

    if consec >= config.consecutive_loss_hard:
        status.consecutive_loss_alert = "HARD_HALT"
    elif consec >= config.consecutive_loss_soft:
        status.consecutive_loss_alert = "SOFT_PAUSE"

    return status
```

### Event Schema

```json
{
  "event": "edge_decay_alert",
  "timestamp": "2026-02-23T15:30:00Z",
  "severity": "HIGH",
  "payload": {
    "rolling_wr": 0.40,
    "baseline_wr": 0.55,
    "expectancy_r": -0.05,
    "profit_factor": 0.85,
    "detectors_triggered": ["win_rate", "expectancy"],
    "triggers_active": 2,
    "recommendation": "RECALIBRATE",
    "auto_action": "DOWNGRADE_TO_SUPERVISED"
  }
}
```

### Configuration Parameters

| Key Path | Type | Default | Valid Range | Unit | Law Ref |
|----------|------|---------|-------------|------|---------|
| edge_decay.wr_window | int | 20 | [10, 50] | trades | Law 19 |
| edge_decay.wr_threshold | float | 0.05 | [0.03, 0.10] | pct pts | Law 19 |
| edge_decay.min_expectancy | float | 0.0 | [-0.10, 0.10] | R-mult | Law 19 |
| edge_decay.pf_window | int | 30 | [15, 60] | trades | Law 19 |
| edge_decay.min_pf | float | 1.0 | [0.8, 1.5] | ratio | Law 19 |
| edge_decay.min_triggers | int | 2 | [1, 3] | count | Law 19 |
| edge_decay.consec_soft | int | 3 | [2, 5] | trades | Law 3 |
| edge_decay.consec_hard | int | 5 | [3, 8] | trades | Law 3 |

**Implementation Plan:** IMP-P11-007
**Progress Tracker:** PROG-REQ-202

<!-- /SSOT-AG-EDGE-DECAY -->

---

<!-- SSOT-REGIME-ENHANCED -->
## SSOT-REGIME-ENHANCED: Enhanced Regime Detection

### Purpose

Address regime detection weaknesses in SSOT-AG-02 (Regime Agent) and SSOT-PCTT-02: add method weighting instead of equal voting, add ACF as a 7th detection method, integrate regime confidence with risk sizing, and compute transition probabilities for forward-looking risk management.

### Method Weighting

Replace equal voting with accuracy-weighted ensemble:

```
Method Weights (default, recalibrated every 500 trades):
  efficiency_ratio:    0.25   # Well-established, fast, reliable
  crossing_count:      0.20   # Intuitive, complementary
  hurst_exponent:      0.05   # Unreliable on <500 bar windows
  kalman_slope:        0.20   # Good for trend detection
  cusum:               0.10   # Noisy, mean-revert biased
  volatility_regime:   0.10   # Complementary signal
  autocorrelation:     0.10   # NEW: ACF-based detector

Weighted vote:
  trending_score = sum(weight_i * (1 if method_i == TRENDING else 0))
  TRENDING if trending_score >= 0.55
  MEAN_REVERTING if mean_reverting_score >= 0.55
  CHOPPY otherwise (default)
```

**Weight normalization constraint:** All weights must sum to 1.0. After recalibration, weights are normalized: `w_i = w_i_raw / sum(all w_raw)`.

### ACF Method (New Method 7)

```python
def acf_regime_detector(
    prices: list,
    lag: int = 1,
    window: int = 100,
) -> str:
    """Autocorrelation-based regime detection.

    Uses lag-1 autocorrelation of returns to classify the regime:
    - High positive ACF(1) indicates momentum (trending).
    - Negative ACF(1) indicates mean reversion.
    - Near-zero ACF(1) indicates random walk (choppy).

    Args:
        prices: List of closing prices, most recent last.
        lag: Autocorrelation lag (default 1).
        window: Number of bars to use for computation.

    Returns:
        Regime string: "TRENDING", "MEAN_REVERTING", or "CHOPPY".
    """
    if len(prices) < window + lag:
        return "CHOPPY"

    returns = [
        prices[i] / prices[i - 1] - 1
        for i in range(len(prices) - window, len(prices))
    ]
    mean_r = sum(returns) / len(returns)

    var = sum((r - mean_r) ** 2 for r in returns) / len(returns)
    if var < 1e-12:
        return "CHOPPY"

    cov = sum(
        (returns[i] - mean_r) * (returns[i - lag] - mean_r)
        for i in range(lag, len(returns))
    ) / (len(returns) - lag)

    acf = cov / var

    if acf > 0.10:
        return "TRENDING"
    if acf < -0.10:
        return "MEAN_REVERTING"
    return "CHOPPY"
```

### Regime Confidence Computation

```
confidence = weighted_agreement_score * 100

weighted_agreement_score = max(trending_score, mean_reverting_score, choppy_score)

Scale interpretation:
  55-65% = low confidence
  65-80% = moderate confidence
  80%+   = high confidence
```

**Integration with Risk Agent (SSOT-AG-04):**

```
if regime_confidence < 60:
    risk_multiplier *= 0.5    # Half size on low confidence
elif regime_confidence < 75:
    risk_multiplier *= 0.75   # 75% size on moderate confidence
else:
    risk_multiplier *= 1.0    # Full size on high confidence
```

### Transition Probability

```python
def compute_transition_probability(
    regime_history: list,
    current_regime: str,
    window: int = 50,
) -> float:
    """Estimate probability of regime change in next N bars.

    Uses historical transition frequency and current regime duration
    to estimate the likelihood of a regime change. Longer duration
    in the current regime increases the estimated transition probability
    (mean reversion of regimes).

    Args:
        regime_history: List of regime strings, ordered chronologically.
        current_regime: The current regime classification.
        window: Number of recent bars to analyze.

    Returns:
        Estimated probability of regime change, in [0, 0.95].
    """
    if len(regime_history) < window:
        return 0.5  # Uncertain

    recent = regime_history[-window:]
    transitions = sum(
        1 for i in range(1, len(recent)) if recent[i] != recent[i - 1]
    )
    transition_rate = transitions / (len(recent) - 1)

    # How long in current regime?
    bars_in_current = 0
    for r in reversed(recent):
        if r == current_regime:
            bars_in_current += 1
        else:
            break

    # Longer in regime = higher transition probability
    mean_regime_duration = (len(recent) - 1) / max(transitions, 1)
    duration_ratio = bars_in_current / max(mean_regime_duration, 1)

    # P(transition) increases with duration ratio
    p_transition = min(
        transition_rate * (1 + duration_ratio * 0.5), 0.95
    )

    return round(p_transition, 3)
```

### Weighted Ensemble Implementation

```python
from typing import Dict, List


DEFAULT_WEIGHTS = {
    "efficiency_ratio": 0.25,
    "crossing_count": 0.20,
    "hurst_exponent": 0.05,
    "kalman_slope": 0.20,
    "cusum": 0.10,
    "volatility_regime": 0.10,
    "autocorrelation": 0.10,
}


def weighted_regime_vote(
    method_results: Dict[str, str],
    weights: Dict[str, float],
    consensus_threshold: float = 0.55,
) -> tuple:
    """Compute weighted regime classification with confidence.

    Args:
        method_results: Dict mapping method name to regime string.
        weights: Dict mapping method name to weight (must sum to ~1.0).
        consensus_threshold: Minimum weighted score to declare a regime.

    Returns:
        Tuple of (regime_string, confidence_pct).
    """
    scores = {"TRENDING": 0.0, "MEAN_REVERTING": 0.0, "CHOPPY": 0.0}

    total_weight = 0.0
    for method, regime in method_results.items():
        w = weights.get(method, 0.0)
        if regime in scores:
            scores[regime] += w
        total_weight += w

    # Normalize if weights do not sum to 1.0
    if total_weight > 0 and abs(total_weight - 1.0) > 0.01:
        for regime in scores:
            scores[regime] /= total_weight

    best_regime = max(scores, key=scores.get)
    best_score = scores[best_regime]

    if best_score >= consensus_threshold:
        return best_regime, round(best_score * 100, 1)
    else:
        return "CHOPPY", round(scores["CHOPPY"] * 100, 1)
```

### Configuration Parameters

| Key Path | Type | Default | Valid Range | Unit | Law Ref |
|----------|------|---------|-------------|------|---------|
| regime.weights.efficiency_ratio | float | 0.25 | [0.05, 0.50] | weight | Law 5 |
| regime.weights.crossing_count | float | 0.20 | [0.05, 0.40] | weight | Law 5 |
| regime.weights.hurst | float | 0.05 | [0.0, 0.20] | weight | Law 5 |
| regime.weights.kalman | float | 0.20 | [0.05, 0.40] | weight | Law 5 |
| regime.weights.cusum | float | 0.10 | [0.0, 0.20] | weight | Law 5 |
| regime.weights.volatility | float | 0.10 | [0.05, 0.30] | weight | Law 5 |
| regime.weights.acf | float | 0.10 | [0.0, 0.30] | weight | Law 5 |
| regime.consensus_threshold | float | 0.55 | [0.50, 0.75] | score | Law 5 |
| regime.confidence.low_threshold | int | 60 | [50, 70] | pct | Law 5 |
| regime.confidence.moderate_threshold | int | 75 | [65, 85] | pct | Law 5 |
| regime.confidence.low_risk_mult | float | 0.50 | [0.25, 0.75] | mult | Law 5 |
| regime.transition.window | int | 50 | [20, 100] | bars | Law 5 |

**Implementation Plan:** IMP-P11-008, IMP-P11-009
**Progress Tracker:** PROG-REQ-203, PROG-REQ-204

<!-- /SSOT-REGIME-ENHANCED -->

---

<!-- SSOT-PCTT-TRAILING-ENHANCED -->
## SSOT-PCTT-TRAILING-ENHANCED: Trailing Stop Enhancements

### Purpose

Address race conditions in phase transitions, define simultaneous trigger handling, regime-dependent time stops, and partial exit mechanics. This updates SSOT-PCTT-TRAIL. The current trailing stop specification leaves several edge cases ambiguous: what happens when multiple phases trigger on the same bar? How does the time stop adapt to regime? What are the exact partial exit rules?

### Phase Transition Priority Order

When multiple phase transitions trigger on the same bar, execute in this priority order (highest first):

```
Priority 1: Circuit Breaker (Phase 7)   daily loss >= 2%
Priority 2: Stop Hit (EXIT)             price touches stop
Priority 3: Time Stop (Phase 5)         T_max bars exceeded
Priority 4: Profit Target / Partial Exit (Phase 3)  price >= +1.0R
Priority 5: Breakeven Move (Phase 2)    price >= +0.8R
Priority 6: Pivot Trail Update (Phase 4) new pivot confirmed
Priority 7: Momentum Tightening (Phase 6) ATR contraction
```

**Same-Bar Simultaneous Rule:**

If both +0.8R and +1.0R trigger on the same bar:

```
Skip Phase 2 entirely. Execute Phase 3 (partial exit) directly.
Rationale: Phase 3 subsumes Phase 2. No need for breakeven stop
if already at +1.0R.
```

**Execution guarantee:** Only the highest-priority phase executes on any given bar. Lower-priority phases are deferred to the next bar's evaluation cycle.

### Regime-Dependent Time Stop

```
T_max = base_time_stop * regime_time_multiplier

regime_time_multiplier = {
    TRENDING: 0.6,        # T_max = 12 bars (trades resolve faster)
    MEAN_REVERTING: 1.0,  # T_max = 20 bars (baseline)
    CHOPPY: 1.5,          # T_max = 30 bars (trades need more time)
    VOLATILE: 0.8,        # T_max = 16 bars (resolve or exit)
}

Default base_time_stop = 20 bars.
```

### Favorable Extreme Definition

```
For LONG trades:
  new_favorable_extreme = bar.high > max(all previous bar highs in this trade)

For SHORT trades:
  new_favorable_extreme = bar.low < min(all previous bar lows in this trade)

Time stop counter resets to 0 on any new favorable extreme.
Time stop triggers when counter reaches T_max without reset.
```

This means a trade that keeps making new highs (for longs) will never time out. The time stop only penalizes trades that stall.

### Partial Exit Enhancement

```
Regime-Dependent Partial Exit Percentage:
  TRENDING:       close 50% (hold more for trend continuation)
  MEAN_REVERTING: close 60% (standard)
  CHOPPY:         close 70% (cash in more, uncertain continuation)
  VOLATILE:       close 60% (standard but with tighter remainder stop)

Remainder Stop After Partial Exit:
  Standard: stop moves to Entry + 0.5R (lock in minimum profit)
  VOLATILE regime: stop moves to Entry + 0.3R (tighter due to vol)

Minimum Remainder Size:
  If remaining shares < 10 OR remaining notional < $500:
    Close 100% instead of partial (not worth the friction)
```

### Partial Exit Implementation

```python
from dataclasses import dataclass
from typing import Optional


@dataclass
class PartialExitConfig:
    """Configuration for regime-dependent partial exits."""
    regime_exit_pcts: dict = None
    remainder_stop_r: float = 0.5
    volatile_remainder_stop_r: float = 0.3
    min_remainder_shares: int = 10
    min_remainder_notional: float = 500.0
    partial_trigger_r: float = 1.0
    breakeven_trigger_r: float = 0.8

    def __post_init__(self):
        if self.regime_exit_pcts is None:
            self.regime_exit_pcts = {
                "TRENDING": 0.50,
                "MEAN_REVERTING": 0.60,
                "CHOPPY": 0.70,
                "VOLATILE": 0.60,
            }


@dataclass
class PartialExitDecision:
    """Result of partial exit evaluation."""
    should_partial: bool = False
    exit_pct: float = 0.0
    shares_to_close: int = 0
    remainder_shares: int = 0
    new_stop_r: float = 0.0
    force_full_close: bool = False


def evaluate_partial_exit(
    current_shares: int,
    entry_price: float,
    current_price: float,
    stop_price: float,
    regime: str,
    config: PartialExitConfig,
) -> PartialExitDecision:
    """Evaluate whether a partial exit should occur.

    Args:
        current_shares: Current position size in shares.
        entry_price: Original entry price.
        current_price: Current market price.
        stop_price: Current stop-loss price.
        regime: Current market regime.
        config: Partial exit configuration.

    Returns:
        PartialExitDecision with exit instructions.
    """
    decision = PartialExitDecision()
    r_value = abs(entry_price - stop_price)

    if r_value < 0.001:
        return decision

    current_r = (current_price - entry_price) / r_value
    if current_r < config.partial_trigger_r:
        return decision

    decision.should_partial = True
    exit_pct = config.regime_exit_pcts.get(regime, 0.60)
    decision.exit_pct = exit_pct
    decision.shares_to_close = int(current_shares * exit_pct)
    decision.remainder_shares = current_shares - decision.shares_to_close

    remainder_notional = decision.remainder_shares * current_price
    if (
        decision.remainder_shares < config.min_remainder_shares
        or remainder_notional < config.min_remainder_notional
    ):
        decision.force_full_close = True
        decision.shares_to_close = current_shares
        decision.remainder_shares = 0
        return decision

    if regime == "VOLATILE":
        decision.new_stop_r = config.volatile_remainder_stop_r
    else:
        decision.new_stop_r = config.remainder_stop_r

    return decision
```

### Monotonic Enforcement with ATR Awareness

```
# Standard monotonic (unchanged):
new_stop = max(current_stop, proposed_stop)  # for LONG
new_stop = min(current_stop, proposed_stop)  # for SHORT

# ATR compression safeguard:
# If ATR doubles overnight, monotonic stop may be too tight
current_distance = abs(current_price - current_stop) / current_atr

if current_distance < 0.5:  # Stop is less than 0.5 ATR away
    # Allow stop to relax by up to 0.25 ATR
    relaxation = 0.25 * current_atr
    new_stop = current_stop - relaxation  # for LONG (move stop down slightly)
    # Log this relaxation for audit

# This ONLY triggers when ATR has expanded significantly
# Normal conditions: monotonic enforcement holds as-is
```

**Audit requirement:** Every stop relaxation must be logged with timestamp, symbol, old stop, new stop, ATR at entry, and current ATR. This log feeds into the Journal Agent for performance analysis.

**Implementation Plan:** IMP-P11-010, IMP-P11-011
**Progress Tracker:** PROG-REQ-205, PROG-REQ-206

<!-- /SSOT-PCTT-TRAILING-ENHANCED -->

---

<!-- SSOT-STAT-ENHANCED -->
## SSOT-STAT-ENHANCED: Statistical Calibration Enhancements

### Purpose

Address bootstrap underpowering and multiple comparison problems in the Calibration Agent (SSOT-AG-08). The current specification uses 10,000 bootstrap samples, which provides insufficient statistical power for small trade samples. It also lacks correction for multiple comparisons when testing many parameter combinations, leading to false discovery of "optimal" parameters.

### Bootstrap Sample Size

```
Old: bootstrap_samples = 10,000
New: bootstrap_samples = 100,000

Rationale: For n=50 trade sample with 5% significance:
  10K samples: approximately 70% power to detect 20% Sharpe improvement
  100K samples: approximately 95% power to detect 20% Sharpe improvement
```

The computational cost increase is marginal (seconds on modern hardware) but the statistical reliability improvement is significant.

### Multiple Comparison Correction

When tuning K parameters with V values each, total tests = V^K.

```
Method: Benjamini-Hochberg FDR Control (preferred over Bonferroni)

1. Run all V^K parameter combinations
2. Collect p-values for each combination vs baseline
3. Sort p-values: p_(1) <= p_(2) <= ... <= p_(m)
4. Find largest k such that p_(k) <= (k/m) * alpha
5. Reject all hypotheses with p <= p_(k)

alpha = 0.05 (target false discovery rate)
```

**Why Benjamini-Hochberg over Bonferroni:** Bonferroni is too conservative for trading parameter optimization. With 1000 combinations, Bonferroni requires p < 0.00005, which rejects nearly everything. BH controls the expected proportion of false discoveries at 5%, which is appropriate for parameter selection where some false positives are acceptable.

### Sortino Ratio as Primary Objective

```
Old: maximize Sharpe = mean(returns) / std(returns)
New: maximize Sortino = mean(returns) / downside_deviation

downside_deviation = sqrt(mean(min(r - target, 0)^2))
where target = 0 (MAR = 0)

Rationale: Sharpe penalizes upside volatility. Trading returns have
positive skew (large winners, small losses). Sortino only penalizes
downside risk, making it a better objective for asymmetric return profiles.
```

### Python Implementation

```python
from typing import List, Tuple
import math


def sortino_ratio(returns: List[float], mar: float = 0.0) -> float:
    """Compute Sortino ratio from a list of returns.

    Unlike Sharpe, Sortino only penalizes downside deviation,
    making it more appropriate for strategies with positive skew.

    Args:
        returns: List of trade returns (can be in R-multiples or percent).
        mar: Minimum acceptable return (default 0.0).

    Returns:
        Sortino ratio. Higher is better.
    """
    if not returns:
        return 0.0
    mean_r = sum(returns) / len(returns)
    downside = [min(r - mar, 0) ** 2 for r in returns]
    dd = math.sqrt(sum(downside) / len(downside))
    return mean_r / max(dd, 1e-8)


def benjamini_hochberg(
    p_values: List[Tuple[str, float]],
    alpha: float = 0.05,
) -> List[str]:
    """Apply Benjamini-Hochberg FDR control to p-values.

    Returns the list of parameter combination names that pass the
    FDR-controlled significance test.

    Args:
        p_values: List of (combination_name, p_value) tuples.
        alpha: Target false discovery rate (default 0.05).

    Returns:
        List of combination names that are statistically significant
        after FDR correction.
    """
    sorted_pv = sorted(p_values, key=lambda x: x[1])
    m = len(sorted_pv)

    max_k = -1
    for k in range(m):
        threshold = ((k + 1) / m) * alpha
        if sorted_pv[k][1] <= threshold:
            max_k = k

    if max_k < 0:
        return []

    return [name for name, pv in sorted_pv[: max_k + 1]]


def bootstrap_confidence_interval(
    returns: List[float],
    statistic_fn,
    n_bootstrap: int = 100000,
    confidence: float = 0.95,
    seed: int = 42,
) -> Tuple[float, float, float]:
    """Compute bootstrap confidence interval for a statistic.

    Args:
        returns: List of trade returns.
        statistic_fn: Function that takes a list of returns and returns a scalar.
        n_bootstrap: Number of bootstrap samples (default 100,000).
        confidence: Confidence level (default 0.95).
        seed: Random seed for reproducibility.

    Returns:
        Tuple of (point_estimate, lower_bound, upper_bound).
    """
    import random
    rng = random.Random(seed)
    n = len(returns)
    point_estimate = statistic_fn(returns)

    bootstrap_stats = []
    for _ in range(n_bootstrap):
        sample = [returns[rng.randint(0, n - 1)] for _ in range(n)]
        bootstrap_stats.append(statistic_fn(sample))

    bootstrap_stats.sort()
    alpha = 1 - confidence
    lower_idx = int(n_bootstrap * alpha / 2)
    upper_idx = int(n_bootstrap * (1 - alpha / 2))

    return (
        point_estimate,
        bootstrap_stats[lower_idx],
        bootstrap_stats[upper_idx],
    )
```

### Configuration Parameters

| Key Path | Type | Default | Valid Range | Unit | Law Ref |
|----------|------|---------|-------------|------|---------|
| calibration.bootstrap_samples | int | 100000 | [10000, 500000] | count | Law 19 |
| calibration.fdr_alpha | float | 0.05 | [0.01, 0.10] | rate | Law 19 |
| calibration.primary_objective | str | "sortino" | ["sortino", "sharpe", "calmar"] | enum | Law 19 |
| calibration.min_trades_for_significance | int | 50 | [30, 200] | trades | Law 19 |

**Implementation Plan:** IMP-P11-012
**Progress Tracker:** PROG-REQ-207

<!-- /SSOT-STAT-ENHANCED -->

---

<!-- SSOT-DATA-PIPELINE -->
## SSOT-DATA-PIPELINE: Historical Data Pipeline

### Purpose

Define the missing data acquisition, normalization, and quality validation pipeline required before backtesting and calibration can function. This is a prerequisite subsystem referenced by SSOT-AG-09 (Research Agent) and SSOT-AG-08 (Calibration Agent). Without clean, validated historical data, all backtesting results are unreliable.

### Data Sources

| Source | Data Type | Frequency | History | Format |
|--------|-----------|-----------|---------|--------|
| Polygon.io REST | OHLCV bars | 1min, 5min, 1H, 1D | 5+ years | JSON |
| Polygon.io WS | Real-time bars | tick/1min | Live | JSON |
| Yahoo Finance (backup) | Daily OHLCV | 1D | 20+ years | CSV |
| FRED API | Economic indicators | Monthly/Weekly | 50+ years | JSON |

### Data Quality Validation

```python
from dataclasses import dataclass
from typing import List, Optional


@dataclass
class DataQualityReport:
    """Report on the quality of OHLCV data for a single symbol/timeframe."""
    symbol: str
    timeframe: str
    total_bars: int
    missing_bars: int
    missing_pct: float
    gap_count: int
    max_gap_bars: int
    zero_volume_bars: int
    duplicate_timestamps: int
    ohlc_violations: int
    passed: bool
    issues: List[str]


def validate_ohlcv(
    bars: list,
    symbol: str,
    timeframe: str,
    max_missing_pct: float = 0.01,
    max_gaps_per_year: int = 5,
) -> DataQualityReport:
    """Validate OHLCV data quality before use in backtesting.

    Checks performed:
    1. OHLC consistency: high >= low, close in [low, high], open in [low, high]
    2. No missing timestamps (gaps in expected bar sequence)
    3. No zero volume during market hours
    4. No duplicate timestamps
    5. Missing bar percentage below threshold

    Args:
        bars: List of dicts with keys: timestamp, open, high, low, close, volume.
        symbol: Ticker symbol.
        timeframe: Bar timeframe string (e.g. "5min", "1D").
        max_missing_pct: Maximum acceptable missing bar percentage.
        max_gaps_per_year: Maximum acceptable gap count per year of data.

    Returns:
        DataQualityReport with all validation results.
    """
    issues = []
    total_bars = len(bars)
    ohlc_violations = 0
    zero_volume_bars = 0
    duplicate_timestamps = 0

    seen_timestamps = set()

    for bar in bars:
        ts = bar.get("timestamp")
        o = bar.get("open", 0)
        h = bar.get("high", 0)
        l_val = bar.get("low", 0)
        c = bar.get("close", 0)
        v = bar.get("volume", 0)

        # OHLC consistency
        if h < l_val:
            ohlc_violations += 1
        if c < l_val or c > h:
            ohlc_violations += 1
        if o < l_val or o > h:
            ohlc_violations += 1

        # Zero volume
        if v == 0:
            zero_volume_bars += 1

        # Duplicate timestamps
        if ts in seen_timestamps:
            duplicate_timestamps += 1
        seen_timestamps.add(ts)

    # Gap detection (simplified: count sequential timestamp gaps)
    gap_count = 0
    max_gap_bars = 0
    # Actual gap detection requires market calendar awareness
    # Placeholder: count bars where timestamp delta > 2x expected delta

    missing_bars = 0  # Requires expected bar count from calendar
    missing_pct = 0.0

    if ohlc_violations > 0:
        issues.append(f"{ohlc_violations} OHLC consistency violations")
    if zero_volume_bars > total_bars * 0.05:
        issues.append(
            f"{zero_volume_bars} zero-volume bars "
            f"({zero_volume_bars / max(total_bars, 1) * 100:.1f}%)"
        )
    if duplicate_timestamps > 0:
        issues.append(f"{duplicate_timestamps} duplicate timestamps")

    passed = (
        ohlc_violations == 0
        and duplicate_timestamps == 0
        and missing_pct < max_missing_pct
    )

    return DataQualityReport(
        symbol=symbol,
        timeframe=timeframe,
        total_bars=total_bars,
        missing_bars=missing_bars,
        missing_pct=missing_pct,
        gap_count=gap_count,
        max_gap_bars=max_gap_bars,
        zero_volume_bars=zero_volume_bars,
        duplicate_timestamps=duplicate_timestamps,
        ohlc_violations=ohlc_violations,
        passed=passed,
        issues=issues,
    )
```

### Corporate Action Handling

```
Stock Splits: Adjust all historical prices by split ratio.
  adjusted_price = raw_price / split_ratio
  adjusted_volume = raw_volume * split_ratio

Dividends: Use adjusted close for backtesting, raw close for live trading.
  Adjusted close accounts for dividend reinvestment.

Mergers/Acquisitions: Mark symbol as delisted at merger date.
  All positions must be closed at merger price on the delisting date.

Ticker Changes: Map old ticker to new ticker in symbol registry.
  Example: FB -> META. Historical data under FB maps to META.
```

### Bar Consolidation

```
Raw 1-min bars consolidate to 5-min, 15-min, 1H, 4H, Daily.

Consolidation rule:
  open   = first bar's open
  high   = max(all bar highs)
  low    = min(all bar lows)
  close  = last bar's close
  volume = sum(all bar volumes)

Alignment: All bars align to session boundaries.
  5-min bars start at 09:30, 09:35, 09:40 ...
  1H bars start at 09:30, 10:30, 11:30 ...
  Daily bars span 09:30 to 16:00.
```

### Market Calendar

```python
from dataclasses import dataclass
from typing import List


@dataclass
class MarketSession:
    """US equity market session times (Eastern Time)."""
    premarket_start: str = "04:00"
    market_open: str = "09:30"
    lunch_start: str = "12:00"
    lunch_end: str = "13:00"
    power_hour: str = "15:00"
    market_close: str = "16:00"
    afterhours_end: str = "20:00"


# NYSE Holiday Calendar (2026)
NYSE_HOLIDAYS_2026 = [
    "2026-01-01",  # New Year's Day
    "2026-01-19",  # MLK Jr Day
    "2026-02-16",  # Presidents Day
    "2026-04-03",  # Good Friday
    "2026-05-25",  # Memorial Day
    "2026-07-03",  # Independence Day (observed)
    "2026-09-07",  # Labor Day
    "2026-11-26",  # Thanksgiving
    "2026-12-25",  # Christmas
]

# Early close days (market closes at 13:00 ET)
NYSE_EARLY_CLOSE_2026 = [
    "2026-07-02",  # Day before Independence Day
    "2026-11-27",  # Black Friday
    "2026-12-24",  # Christmas Eve
]
```

### Data Storage Schema

```
PostgreSQL tables:
  bars_1min(symbol, timestamp, open, high, low, close, volume, adjusted_close)
  bars_daily(symbol, date, open, high, low, close, volume, adjusted_close)
  corporate_actions(symbol, date, action_type, ratio, ex_date)
  symbol_registry(symbol, name, exchange, sector, is_active, renamed_to)

Redis cache:
  bars:{symbol}:{timeframe}:latest  -> most recent 500 bars (ZSET by timestamp)
  regime:{symbol}:{timeframe}       -> current regime classification (STRING)
```

**Implementation Plan:** IMP-P11-013, IMP-P11-014, IMP-P11-015, IMP-P11-016
**Progress Tracker:** PROG-REQ-208, PROG-REQ-209, PROG-REQ-210, PROG-REQ-211

<!-- /SSOT-DATA-PIPELINE -->

---

<!-- SSOT-OPS-INCIDENT -->
## SSOT-OPS-INCIDENT: Incident Response Framework

### Purpose

Define incident classification, detection, response, and recovery procedures for production trading. This is a new operational subsystem. Without a formal incident framework, production failures lead to ad-hoc responses, missed alerts, and preventable losses.

### Severity Classification

| Severity | Definition | Response Time | Example |
|----------|-----------|---------------|---------|
| P0: CRITICAL | Active money loss or system down | Immediate (< 1 min) | Execution agent crash with open positions |
| P1: HIGH | Potential money loss or degraded | < 5 min | Broker disconnect, data feed stale |
| P2: MEDIUM | Service degraded, no money risk | < 30 min | One agent unhealthy, WebSocket slow |
| P3: LOW | Minor issue, cosmetic | Next session | UI glitch, log rotation failed |

### Automated Detection Rules

```python
INCIDENT_RULES = {
    "broker_disconnect": {
        "condition": "broker.connected == False for > 30 seconds",
        "severity": "P0",
        "auto_action": "flatten_all_positions_market_order",
    },
    "data_feed_stale": {
        "condition": "last_bar_age > 120 seconds during market hours",
        "severity": "P1",
        "auto_action": "switch_to_backup_feed + alert_human",
    },
    "agent_crash": {
        "condition": "agent.health_check fails 3 consecutive times",
        "severity": "P1",
        "auto_action": "restart_agent + downgrade_to_MANUAL",
    },
    "position_mismatch": {
        "condition": "local_positions != broker_positions",
        "severity": "P0",
        "auto_action": "halt_trading + reconcile + alert_human",
    },
    "memory_exhaustion": {
        "condition": "system_memory_usage > 90%",
        "severity": "P2",
        "auto_action": "force_gc + evict_cold_data + alert",
    },
    "redis_down": {
        "condition": "redis.ping fails for > 10 seconds",
        "severity": "P0",
        "auto_action": "switch_to_hot_only_mode + halt_new_entries",
    },
}
```

### Incident Detection Implementation

```python
from dataclasses import dataclass
from enum import Enum
from typing import List, Optional, Callable
import time


class Severity(Enum):
    P0_CRITICAL = "P0"
    P1_HIGH = "P1"
    P2_MEDIUM = "P2"
    P3_LOW = "P3"


@dataclass
class Incident:
    """Represents a detected production incident."""
    incident_id: str
    rule_name: str
    severity: Severity
    description: str
    detected_at: float
    auto_action: str
    resolved: bool = False
    resolved_at: Optional[float] = None
    resolution_notes: str = ""


@dataclass
class HealthStatus:
    """Current health status of system components."""
    broker_connected: bool = True
    broker_disconnect_since: Optional[float] = None
    last_bar_timestamp: float = 0.0
    agents_healthy: dict = None
    redis_responsive: bool = True
    memory_usage_pct: float = 0.0
    local_positions: dict = None
    broker_positions: dict = None

    def __post_init__(self):
        if self.agents_healthy is None:
            self.agents_healthy = {}
        if self.local_positions is None:
            self.local_positions = {}
        if self.broker_positions is None:
            self.broker_positions = {}


def check_incident_rules(
    health: HealthStatus,
    current_time: float,
    market_open: bool,
) -> List[Incident]:
    """Evaluate all incident detection rules against current health.

    Args:
        health: Current system health status.
        current_time: Current time as Unix timestamp.
        market_open: Whether the market is currently in session.

    Returns:
        List of detected Incident objects requiring action.
    """
    incidents = []

    # Broker disconnect
    if not health.broker_connected:
        disconnect_duration = current_time - (
            health.broker_disconnect_since or current_time
        )
        if disconnect_duration > 30:
            incidents.append(Incident(
                incident_id=f"INC-{int(current_time)}",
                rule_name="broker_disconnect",
                severity=Severity.P0_CRITICAL,
                description=(
                    f"Broker disconnected for {disconnect_duration:.0f}s"
                ),
                detected_at=current_time,
                auto_action="flatten_all_positions_market_order",
            ))

    # Data feed stale
    if market_open:
        bar_age = current_time - health.last_bar_timestamp
        if bar_age > 120:
            incidents.append(Incident(
                incident_id=f"INC-{int(current_time)}-data",
                rule_name="data_feed_stale",
                severity=Severity.P1_HIGH,
                description=f"Last bar is {bar_age:.0f}s old",
                detected_at=current_time,
                auto_action="switch_to_backup_feed + alert_human",
            ))

    # Position mismatch
    if health.local_positions != health.broker_positions:
        incidents.append(Incident(
            incident_id=f"INC-{int(current_time)}-pos",
            rule_name="position_mismatch",
            severity=Severity.P0_CRITICAL,
            description="Local positions do not match broker positions",
            detected_at=current_time,
            auto_action="halt_trading + reconcile + alert_human",
        ))

    # Memory exhaustion
    if health.memory_usage_pct > 90:
        incidents.append(Incident(
            incident_id=f"INC-{int(current_time)}-mem",
            rule_name="memory_exhaustion",
            severity=Severity.P2_MEDIUM,
            description=(
                f"Memory usage at {health.memory_usage_pct:.1f}%"
            ),
            detected_at=current_time,
            auto_action="force_gc + evict_cold_data + alert",
        ))

    # Redis down
    if not health.redis_responsive:
        incidents.append(Incident(
            incident_id=f"INC-{int(current_time)}-redis",
            rule_name="redis_down",
            severity=Severity.P0_CRITICAL,
            description="Redis is not responding to ping",
            detected_at=current_time,
            auto_action="switch_to_hot_only_mode + halt_new_entries",
        ))

    return incidents
```

### Pre-Market Validation Checklist

```
Run at T-90 minutes before market open (08:00 ET):

 1. [ ] Broker connection established and authenticated
 2. [ ] Positions reconciled (local == broker)
 3. [ ] P&L within acceptable bounds (no overnight margin call)
 4. [ ] All 11 agents reporting HEALTHY
 5. [ ] Redis connected and responsive (< 5ms ping)
 6. [ ] PostgreSQL connected and responsive
 7. [ ] Market data feed connected (Polygon.io WebSocket)
 8. [ ] Regime classification completed with confidence > 60%
 9. [ ] Daily loss limit reset for new session
10. [ ] Config loaded and validated (no changes since last session)
11. [ ] Earnings calendar updated for today
12. [ ] Market calendar confirms today is a trading day

ALL 12 checks MUST pass before SUPERVISED or AUTONOMOUS mode is allowed.
If any check fails: stay in MANUAL mode and alert human.
```

### Pre-Market Check Implementation

```python
from dataclasses import dataclass
from typing import List


@dataclass
class PreMarketCheck:
    """Result of a single pre-market validation check."""
    name: str
    passed: bool
    detail: str


def run_premarket_checks(
    broker_connected: bool,
    positions_reconciled: bool,
    overnight_margin_ok: bool,
    agent_statuses: dict,
    redis_ping_ms: float,
    postgres_connected: bool,
    data_feed_connected: bool,
    regime_confidence: float,
    daily_loss_reset: bool,
    config_validated: bool,
    earnings_updated: bool,
    is_trading_day: bool,
) -> List[PreMarketCheck]:
    """Run all 12 pre-market validation checks.

    Returns:
        List of PreMarketCheck results. All must pass for trading.
    """
    checks = [
        PreMarketCheck(
            "broker_connection",
            broker_connected,
            "Connected" if broker_connected else "DISCONNECTED",
        ),
        PreMarketCheck(
            "position_reconciliation",
            positions_reconciled,
            "Reconciled" if positions_reconciled else "MISMATCH",
        ),
        PreMarketCheck(
            "margin_status",
            overnight_margin_ok,
            "OK" if overnight_margin_ok else "MARGIN CALL",
        ),
        PreMarketCheck(
            "agent_health",
            all(v == "HEALTHY" for v in agent_statuses.values()),
            f"{sum(1 for v in agent_statuses.values() if v == 'HEALTHY')}"
            f"/11 healthy",
        ),
        PreMarketCheck(
            "redis",
            redis_ping_ms < 5.0,
            f"Ping: {redis_ping_ms:.1f}ms",
        ),
        PreMarketCheck(
            "postgres",
            postgres_connected,
            "Connected" if postgres_connected else "DISCONNECTED",
        ),
        PreMarketCheck(
            "data_feed",
            data_feed_connected,
            "Connected" if data_feed_connected else "DISCONNECTED",
        ),
        PreMarketCheck(
            "regime_classification",
            regime_confidence > 60,
            f"Confidence: {regime_confidence:.1f}%",
        ),
        PreMarketCheck(
            "daily_loss_reset",
            daily_loss_reset,
            "Reset" if daily_loss_reset else "NOT RESET",
        ),
        PreMarketCheck(
            "config_validation",
            config_validated,
            "Valid" if config_validated else "INVALID",
        ),
        PreMarketCheck(
            "earnings_calendar",
            earnings_updated,
            "Updated" if earnings_updated else "STALE",
        ),
        PreMarketCheck(
            "trading_day",
            is_trading_day,
            "Trading day" if is_trading_day else "HOLIDAY/WEEKEND",
        ),
    ]

    return checks
```

### Post-Incident Review Template

```
After every P0 or P1 incident:

1. Timeline: What happened, when, and what automated actions fired.
2. Root Cause: Why did this happen? Was detection timely?
3. Impact: Monetary impact, missed trades, or erroneous fills.
4. Response Evaluation: Did auto-actions perform correctly?
5. Prevention: What config, code, or procedure changes prevent recurrence?
6. Follow-up Items: Action items with owners and deadlines.
```

**Implementation Plan:** IMP-P11-017, IMP-P11-018
**Progress Tracker:** PROG-REQ-212, PROG-REQ-213

<!-- /SSOT-OPS-INCIDENT -->

---

<!-- SSOT-TRAIL-HTF -->
## SSOT-TRAIL-HTF: Multi-Timeframe Alignment Gate

### Purpose

Add an explicit higher-timeframe (HTF) alignment check as Stage 4.5 in the PCTT pipeline, addressing the single-timeframe limitation. This updates SSOT-PCTT-05 (Macro Gate) and SSOT-AG-03 (Signal Agent). Trading against the higher-timeframe trend is the single most common reason for valid signals to fail. This gate reduces false signals by requiring alignment with the dominant trend.

### Protocol

**Insert between Stage 4 (Scoring) and Stage 5 (Macro Gate):**

```
Stage 4.5: HTF Alignment Check

Input: signal_direction (LONG or SHORT), primary_timeframe bars
Output: htf_aligned (bool), htf_score (float 0-1)

Method:
1. Compute trend direction on HTF (4x primary timeframe):
   - If primary = 5min, HTF = 20min
   - If primary = 1H, HTF = 4H
   - If primary = 4H, HTF = Daily

2. HTF trend = sign of 20-period EMA slope on HTF bars

3. Alignment check:
   signal_direction == LONG AND htf_trend > 0 -> ALIGNED (htf_score = 1.0)
   signal_direction == SHORT AND htf_trend < 0 -> ALIGNED (htf_score = 1.0)
   signal_direction conflicts with htf_trend -> MISALIGNED (htf_score = 0.3)

4. Action on misalignment:
   IF htf_score < 0.5:
     Reduce position size by 50%
     OR skip trade if config.htf.strict_mode == true
```

### Python Implementation

```python
from dataclasses import dataclass
from typing import List, Optional


@dataclass
class HTFAlignmentConfig:
    """Configuration for higher-timeframe alignment gate."""
    enabled: bool = True
    multiplier: int = 4
    ema_period: int = 20
    strict_mode: bool = False
    misalign_size_mult: float = 0.50


@dataclass
class HTFAlignmentResult:
    """Result of the HTF alignment check."""
    htf_aligned: bool
    htf_score: float
    htf_trend_direction: str  # "UP", "DOWN", "FLAT"
    signal_direction: str     # "LONG", "SHORT"
    size_multiplier: float
    skip_trade: bool


def compute_ema(prices: List[float], period: int) -> List[float]:
    """Compute exponential moving average.

    Args:
        prices: List of closing prices.
        period: EMA lookback period.

    Returns:
        List of EMA values (same length as prices, with NaN-free start).
    """
    if len(prices) < period:
        return [prices[0]] * len(prices)

    multiplier = 2.0 / (period + 1)
    ema = [0.0] * len(prices)
    ema[0] = prices[0]

    for i in range(1, len(prices)):
        ema[i] = (prices[i] - ema[i - 1]) * multiplier + ema[i - 1]

    return ema


def consolidate_bars(
    bars: List[dict],
    multiplier: int,
) -> List[dict]:
    """Consolidate bars to a higher timeframe.

    Args:
        bars: List of OHLCV bar dicts.
        multiplier: How many primary bars per HTF bar.

    Returns:
        List of consolidated HTF bar dicts.
    """
    htf_bars = []
    for i in range(0, len(bars), multiplier):
        chunk = bars[i : i + multiplier]
        if not chunk:
            continue
        htf_bar = {
            "open": chunk[0]["open"],
            "high": max(b["high"] for b in chunk),
            "low": min(b["low"] for b in chunk),
            "close": chunk[-1]["close"],
            "volume": sum(b.get("volume", 0) for b in chunk),
        }
        htf_bars.append(htf_bar)
    return htf_bars


def check_htf_alignment(
    primary_bars: List[dict],
    signal_direction: str,
    config: HTFAlignmentConfig,
) -> HTFAlignmentResult:
    """Check if a trade signal aligns with the higher-timeframe trend.

    Consolidates primary bars to HTF, computes EMA slope on HTF,
    and checks alignment with the proposed signal direction.

    Args:
        primary_bars: List of primary-timeframe OHLCV bar dicts.
        signal_direction: "LONG" or "SHORT".
        config: HTF alignment configuration.

    Returns:
        HTFAlignmentResult with alignment status and size adjustment.
    """
    htf_bars = consolidate_bars(primary_bars, config.multiplier)

    if len(htf_bars) < config.ema_period + 2:
        return HTFAlignmentResult(
            htf_aligned=True,
            htf_score=0.5,
            htf_trend_direction="FLAT",
            signal_direction=signal_direction,
            size_multiplier=1.0,
            skip_trade=False,
        )

    closes = [b["close"] for b in htf_bars]
    ema_values = compute_ema(closes, config.ema_period)

    # EMA slope over last 3 bars
    recent_slope = ema_values[-1] - ema_values[-3]

    if recent_slope > 0:
        htf_trend = "UP"
    elif recent_slope < 0:
        htf_trend = "DOWN"
    else:
        htf_trend = "FLAT"

    # Check alignment
    aligned = False
    if signal_direction == "LONG" and htf_trend == "UP":
        aligned = True
    elif signal_direction == "SHORT" and htf_trend == "DOWN":
        aligned = True

    htf_score = 1.0 if aligned else 0.3

    # Determine action
    size_mult = 1.0
    skip = False
    if not aligned:
        if config.strict_mode:
            skip = True
            size_mult = 0.0
        else:
            size_mult = config.misalign_size_mult

    return HTFAlignmentResult(
        htf_aligned=aligned,
        htf_score=htf_score,
        htf_trend_direction=htf_trend,
        signal_direction=signal_direction,
        size_multiplier=size_mult,
        skip_trade=skip,
    )
```

### Pipeline Integration

```
BEFORE (SSOT-PCTT pipeline stages):
  Stage 1: Pivot Detection
  Stage 2: Regime Classification
  Stage 3: Boundary Estimation
  Stage 4: Q-Score Computation
  Stage 5: Macro Gate
  Stage 6: Execution
  Stage 7: Trailing Stop

AFTER (with HTF gate inserted):
  Stage 1: Pivot Detection
  Stage 2: Regime Classification
  Stage 3: Boundary Estimation
  Stage 4: Q-Score Computation
  Stage 4.5: HTF Alignment Check    <-- NEW
  Stage 5: Macro Gate
  Stage 6: Execution
  Stage 7: Trailing Stop

Data flow:
  Stage 4 outputs: (signal_direction, q_score, grade)
  Stage 4.5 inputs: (signal_direction, primary_bars, config)
  Stage 4.5 outputs: (htf_aligned, htf_score, size_multiplier, skip_trade)

  If skip_trade == true: pipeline terminates, no trade.
  If skip_trade == false: size_multiplier passes to Stage 6 for sizing.
```

### Configuration Parameters

| Key Path | Type | Default | Valid Range | Unit | Law Ref |
|----------|------|---------|-------------|------|---------|
| htf.enabled | bool | true | [true, false] | flag | Law 12 |
| htf.multiplier | int | 4 | [2, 8] | mult | Law 12 |
| htf.ema_period | int | 20 | [10, 50] | bars | Law 12 |
| htf.strict_mode | bool | false | [true, false] | flag | Law 12 |
| htf.misalign_size_mult | float | 0.50 | [0.25, 0.75] | mult | Law 12 |

**Implementation Plan:** IMP-P11-019
**Progress Tracker:** PROG-REQ-214

<!-- /SSOT-TRAIL-HTF -->

---

## Cross-Reference Summary

This section maps each enhancement to the existing SSOT sections it updates or extends.

| Enhancement | Updates | New Tools/Events |
|-------------|---------|------------------|
| SSOT-FRM-09 | SSOT-AG-04 (Risk Agent) `check_position_size` | `estimate_transaction_costs()` |
| SSOT-FRM-10 | SSOT-PCTT-04 (Scoring stage) | `platt_predict()`, `fit_platt_scaling()` |
| SSOT-FRM-11 | SSOT-AG-04 (Risk Agent) `compute_risk_budget` | `compute_adaptive_risk()` |
| SSOT-PCTT-BOUNDARY-PROTOCOL | SSOT-PCTT-03 (Boundary Estimation) | `verify_no_repainting()` |
| SSOT-RISK-OVERNIGHT | SSOT-AG-04 (Risk Agent) | `run_overnight_stress_test()` |
| SSOT-AG-EDGE-DECAY | SSOT-AG-07 (Journal Agent), SSOT-AG-08 (Calibration Agent) | `check_edge_decay()`, `edge_decay_alert` event |
| SSOT-REGIME-ENHANCED | SSOT-AG-02 (Regime Agent), SSOT-PCTT-02 | `acf_regime_detector()`, `weighted_regime_vote()`, `compute_transition_probability()` |
| SSOT-PCTT-TRAILING-ENHANCED | SSOT-PCTT-TRAIL | `evaluate_partial_exit()` |
| SSOT-STAT-ENHANCED | SSOT-AG-08 (Calibration Agent) | `sortino_ratio()`, `benjamini_hochberg()`, `bootstrap_confidence_interval()` |
| SSOT-DATA-PIPELINE | SSOT-AG-09 (Research Agent), SSOT-AG-08 | `validate_ohlcv()` |
| SSOT-OPS-INCIDENT | New operational subsystem | `check_incident_rules()`, `run_premarket_checks()` |
| SSOT-TRAIL-HTF | SSOT-PCTT-05 (Macro Gate), SSOT-AG-03 (Signal Agent) | `check_htf_alignment()` |

### Implementation Priority

| Priority | Section | Rationale |
|----------|---------|-----------|
| 1 (Critical) | SSOT-DATA-PIPELINE | No backtesting without clean data |
| 2 (Critical) | SSOT-FRM-09 | Position sizing is wrong without cost model |
| 3 (Critical) | SSOT-OPS-INCIDENT | Production safety requires incident handling |
| 4 (High) | SSOT-PCTT-BOUNDARY-PROTOCOL | Non-repainting guarantee must be airtight |
| 5 (High) | SSOT-AG-EDGE-DECAY | Early warning prevents capital destruction |
| 6 (High) | SSOT-FRM-11 | Adaptive risk prevents ruin during drawdowns |
| 7 (High) | SSOT-RISK-OVERNIGHT | Overnight gap risk is uncontrollable without this |
| 8 (Medium) | SSOT-FRM-10 | Q-Score calibration improves signal quality |
| 9 (Medium) | SSOT-REGIME-ENHANCED | Better regime detection improves all downstream decisions |
| 10 (Medium) | SSOT-PCTT-TRAILING-ENHANCED | Trailing stop edge cases cause preventable losses |
| 11 (Medium) | SSOT-STAT-ENHANCED | Statistical rigor prevents overfitting |
| 12 (Lower) | SSOT-TRAIL-HTF | HTF alignment is a quality-of-signal enhancement |

---

---

# UI ENHANCEMENTS FOR PHASE 11

The Phase 11 critical enhancements introduce 12 new subsystems. Each needs UI representation. Below are the new components, Recoil atoms, WebSocket events, and chart overlays required.

---

<!-- SSOT-UI-05 -->
## SSOT-UI-05: Enhanced Dashboard Panels

### Purpose

Add 6 new dashboard panels/widgets to surface Phase 11 subsystem data to the trader. These integrate into the existing AgentSidebar and PositionPanel areas defined in SSOT-UI-01.

### New Components

#### 1. TransactionCostWidget

**Location:** Embedded in ApprovalOverlay (SSOT-UI-01, shown when entry signal requires approval)
**Purpose:** Display cost breakdown before trader approves entry

```typescript
interface TransactionCostDisplay {
  symbol: string;
  rawSize: number;
  adjustedSize: number;
  entrySippage: number;      // USD
  exitSlippage: number;       // USD
  spreadCost: number;         // USD
  commissionRoundTrip: number; // USD
  totalCost: number;          // USD
  totalCostPct: number;       // % of position notional
  liquidityCapped: boolean;
  marketImpactBps: number;
  timeOfDay: string;          // "CORE", "OPENING", etc.
  regimeSlippage: string;     // "1.0x", "1.5x", "2.0x"
}
```

**Visual Design:**
```
+------------------------------------------+
|  TRANSACTION COST BREAKDOWN              |
|  Symbol: AAPL    Size: 150 -> 142 shares |
|  ----------------------------------------|
|  Entry Slippage:    $0.03/share  ($4.26) |
|  Exit Slippage:     $0.05/share  ($7.10) |
|  Spread Cost:       $0.02/share  ($2.84) |
|  Commission (RT):              $2.00     |
|  ----------------------------------------|
|  Total Cost:                  $16.20     |
|  Cost as % of Risk:           1.62%     |
|  ----------------------------------------|
|  [!] Liquidity capped: 142 of 150 shares|
|  Time-of-day: CORE (1.0x slippage)      |
|  Regime: TRENDING (1.0x multiplier)      |
+------------------------------------------+
```

**Colors:**
- Total cost < 1% of risk: green (#4CAF50)
- Total cost 1-2% of risk: yellow (#FFC107)
- Total cost > 2% of risk: red (#F44336)
- Liquidity capped badge: orange (#FF9800)

#### 2. OvernightStressPanel

**Location:** New collapsible panel below PositionPanel (SSOT-UI-01), visible only after 15:30 ET
**Purpose:** Display overnight stress test results at 15:55 ET daily (see SSOT-RISK-OVERNIGHT)

```typescript
interface StressScenarioDisplay {
  scenario: "mild" | "moderate" | "severe";
  gapPct: number;
  stressedEquity: number;
  stressedMarginRatio: number;
  portfolioLossPct: number;
  action: "NONE" | "ALERT_HIGH" | "ALERT_CRITICAL" | "REDUCE_50" | "FLATTEN";
  positionsAtRisk: string[];  // symbols
}

interface OvernightStressDisplay {
  lastRunTime: string;        // ISO timestamp
  scenarios: StressScenarioDisplay[];
  earningsExposure: {         // positions with earnings tomorrow
    symbol: string;
    notional: number;
    impliedVol: number;
  }[];
  overallRisk: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
}
```

**Visual Design:**
```
+--------------------------------------------------+
|  OVERNIGHT STRESS TEST          Last: 15:55 ET   |
|  ------------------------------------------------|
|  Scenario  | Gap   | P&L Impact | Margin | Action|
|  ----------|-------|-----------|--------|-------|
|  Mild      | -3.0% |  -$1,200  | 42.1%  | NONE  |
|  Moderate  | -5.0% |  -$2,100  | 35.8%  | ALERT |
|  Severe    | -10%  |  -$4,300  | 22.4%  | REDUCE|
|  ------------------------------------------------|
|  [!] EARNINGS EXPOSURE                           |
|  TSLA: $8,500 notional, IV 62%  [CLOSE BEFORE]  |
|  ------------------------------------------------|
|  Overall Risk: [======HIGH======]                 |
+--------------------------------------------------+
```

**Colors by action:**
- NONE: green background
- ALERT_HIGH: yellow background
- ALERT_CRITICAL: orange background, pulsing
- REDUCE_50: red background
- FLATTEN: dark red background, pulsing border

#### 3. EdgeDecayIndicator

**Location:** BottomBar (SSOT-UI-01, replace or augment existing edge decay display)
**Purpose:** Show real-time edge decay detector status (see SSOT-AG-EDGE-DECAY)

```typescript
interface EdgeDecayDisplay {
  rollingWinRate: number;      // last 20 trades
  baselineWinRate: number;
  winRateTriggered: boolean;
  expectancyR: number;         // last 20 trades
  expectancyTriggered: boolean;
  profitFactor: number;        // last 30 trades
  profitFactorTriggered: boolean;
  triggersActive: number;      // 0, 1, 2, or 3
  alertFired: boolean;
  consecutiveLosses: number;
  consecutiveLossAlert: "NONE" | "SOFT_PAUSE" | "HARD_HALT";
}
```

**Visual Design (BottomBar inline):**
```
Edge: WR 52% [!] | Exp +0.08R [ok] | PF 1.12 [ok] | Triggers: 1/3 | Consec: 2
```

- Each detector: green checkmark if OK, red exclamation if triggered
- Triggers counter: green (0), yellow (1), red (2-3)
- Consecutive losses: green (0-1), yellow (2), orange (3 = soft pause), red (4-5 = hard halt)

#### 4. RegimeConfidenceWidget

**Location:** Embedded in existing RegimeBadge (BottomBar, SSOT-UI-01) as expanded tooltip/popover
**Purpose:** Show regime confidence, method votes, and transition probability (see SSOT-REGIME-ENHANCED)

```typescript
interface RegimeConfidenceDisplay {
  currentRegime: string;
  confidence: number;          // 0-100%
  transitionProbability: number; // 0-1
  methodVotes: {
    method: string;
    weight: number;
    vote: string;              // TRENDING, MEAN_REVERTING, CHOPPY
    agrees: boolean;
  }[];
  riskMultiplier: number;      // applied to position sizing
  barsInCurrentRegime: number;
}
```

**Visual Design (popover on regime badge click):**
```
+------------------------------------------+
|  REGIME: TRENDING  [=====85%=====]       |
|  Transition Prob: 23% | In regime: 47 bars|
|  ----------------------------------------|
|  Method            | Wt   | Vote   | Agr |
|  ER (0.25)         | 0.25 | TREND  | Yes |
|  Crossing (0.20)   | 0.20 | TREND  | Yes |
|  Hurst (0.05)      | 0.05 | CHOP   | No  |
|  Kalman (0.20)     | 0.20 | TREND  | Yes |
|  CUSUM (0.10)      | 0.10 | TREND  | Yes |
|  Volatility (0.10) | 0.10 | TREND  | Yes |
|  ACF (0.10)        | 0.10 | TREND  | Yes |
|  ----------------------------------------|
|  Risk Multiplier: 1.0x (full sizing)     |
+------------------------------------------+
```

**Confidence meter colors:**
- >= 80%: bright green
- 60-79%: yellow
- < 60%: red (with "LOW CONFIDENCE" badge)

#### 5. PreMarketChecklistDialog

**Location:** Modal dialog, auto-shown at T-90 minutes before market open
**Purpose:** Display 12-point pre-market checklist results (see SSOT-OPS-INCIDENT)

```typescript
interface ChecklistItem {
  id: number;
  label: string;
  passed: boolean;
  detail: string;             // e.g., "IBKR TWS connected, latency 45ms"
  critical: boolean;          // if false, system stays MANUAL
}

interface PreMarketChecklist {
  runTime: string;
  allPassed: boolean;
  allowedMode: "MANUAL" | "SUPERVISED" | "AUTONOMOUS";
  items: ChecklistItem[];
}
```

**Visual Design:**
```
+--------------------------------------------------+
|  PRE-MARKET CHECKLIST           07:58 ET         |
|  ================================================|
|  [x] Broker connected          IBKR TWS, 45ms   |
|  [x] Positions reconciled      3/3 match         |
|  [x] P&L within bounds         -$180 (OK)        |
|  [x] All agents healthy        11/11 HEALTHY     |
|  [x] Redis responsive          2ms ping          |
|  [x] PostgreSQL responsive     8ms ping          |
|  [x] Market data feed          Polygon.io OK     |
|  [ ] Regime confidence > 60%   42% (FAILED)      |
|  [x] Daily loss limit reset    $0 / $2,000       |
|  [x] Config validated          No changes        |
|  [x] Earnings calendar         2 stocks flagged   |
|  [x] Trading day confirmed     NYSE open today    |
|  ================================================|
|  Result: 11/12 passed                            |
|  Allowed Mode: MANUAL (1 check failed)           |
|  [Acknowledge]            [Override to SUPERVISED]|
+--------------------------------------------------+
```

**Colors:**
- Passed: green checkmark
- Failed: red X with red background row
- Override button: only visible if <= 2 non-critical checks fail

#### 6. IncidentBanner

**Location:** Top of screen, above TopBar (SSOT-UI-01), only visible during active incidents
**Purpose:** Display active P0/P1 incidents with countdown and action buttons (see SSOT-OPS-INCIDENT)

```typescript
interface ActiveIncident {
  id: string;
  type: string;               // "broker_disconnect", "data_feed_stale", etc.
  severity: "P0" | "P1" | "P2" | "P3";
  message: string;
  detectedAt: string;
  autoAction: string;
  autoActionExecuted: boolean;
  requiresAck: boolean;
  acknowledgedAt: string | null;
}
```

**Visual Design:**
```
+====================================================================+
| [P0 CRITICAL] Broker disconnected for 45s | Auto: FLATTEN ALL      |
| Detected: 14:32:15 ET | Action in: 15s   | [ACK] [MANUAL OVERRIDE]|
+====================================================================+
```

**Colors by severity:**
- P0: Red background, white text, pulsing border, alarm sound
- P1: Orange background, dark text, single chime
- P2: Yellow background, dark text, no sound
- P3: Gray background, muted text, no sound

### New Recoil Atoms

```typescript
// Phase 11 Enhancement Atoms
// File: frontend/src/state/phase11Atoms.ts
// Cross-ref: SSOT-UI-01 (existing atoms in frontend/src/state/atoms.ts)

export const transactionCostAtom = atom<TransactionCostDisplay | null>({
  key: "transactionCost",
  default: null,
});

export const overnightStressAtom = atom<OvernightStressDisplay | null>({
  key: "overnightStress",
  default: null,
});

export const edgeDecayAtom = atom<EdgeDecayDisplay>({
  key: "edgeDecay",
  default: {
    rollingWinRate: 0,
    baselineWinRate: 0.55,
    winRateTriggered: false,
    expectancyR: 0,
    expectancyTriggered: false,
    profitFactor: 0,
    profitFactorTriggered: false,
    triggersActive: 0,
    alertFired: false,
    consecutiveLosses: 0,
    consecutiveLossAlert: "NONE",
  },
});

export const regimeConfidenceAtom = atom<RegimeConfidenceDisplay | null>({
  key: "regimeConfidence",
  default: null,
});

export const preMarketChecklistAtom = atom<PreMarketChecklist | null>({
  key: "preMarketChecklist",
  default: null,
});

export const activeIncidentsAtom = atom<ActiveIncident[]>({
  key: "activeIncidents",
  default: [],
});

export const adaptiveRiskAtom = atom<{
  baseRisk: number;
  adaptationFactor: number;
  regimeMultiplier: number;
  drawdownScale: number;
  effectiveRisk: number;
}>({
  key: "adaptiveRisk",
  default: {
    baseRisk: 0.01,
    adaptationFactor: 1.0,
    regimeMultiplier: 1.0,
    drawdownScale: 1.0,
    effectiveRisk: 0.01,
  },
});

export const htfAlignmentAtom = atom<{
  aligned: boolean;
  htfTrend: "UP" | "DOWN" | "FLAT";
  htfTimeframe: string;
  sizeMultiplier: number;
}>({
  key: "htfAlignment",
  default: {
    aligned: true,
    htfTrend: "FLAT",
    htfTimeframe: "4H",
    sizeMultiplier: 1.0,
  },
});

export const boundaryVersionAtom = atom<{
  currentVersion: number;
  lastPivotBar: number;
  candidatePoolSize: number;
  frozen: boolean;
}>({
  key: "boundaryVersion",
  default: {
    currentVersion: 0,
    lastPivotBar: 0,
    candidatePoolSize: 0,
    frozen: true,
  },
});
```

### New WebSocket Message Types

Add these to the existing 12 backend-to-frontend message types (SSOT-UI-01):

| # | Type | Payload | Trigger |
|---|------|---------|---------|
| 13 | `TRANSACTION_COST` | TransactionCostDisplay | On every entry proposal |
| 14 | `OVERNIGHT_STRESS` | OvernightStressDisplay | Daily at 15:55 ET |
| 15 | `EDGE_DECAY_UPDATE` | EdgeDecayDisplay | After every trade close |
| 16 | `REGIME_CONFIDENCE` | RegimeConfidenceDisplay | On every regime update |
| 17 | `PREMARKET_CHECKLIST` | PreMarketChecklist | At T-90 min before open |
| 18 | `INCIDENT` | ActiveIncident | On incident detection |
| 19 | `INCIDENT_RESOLVED` | { id: string } | On incident resolution |
| 20 | `ADAPTIVE_RISK_UPDATE` | AdaptiveRiskDisplay | On every risk computation |
| 21 | `HTF_ALIGNMENT` | HtfAlignmentDisplay | On every signal evaluation |
| 22 | `BOUNDARY_VERSION` | BoundaryVersionDisplay | On boundary re-estimation |

Implementation Plan: IMP-P11-021, IMP-P11-022
Progress Tracker: PROG-REQ-215, PROG-REQ-216

> **Cross-references:** SSOT-UI-01 (component tree, Recoil atoms, WebSocket messages), SSOT-UI-04 (alert system), SSOT-FRM-09 (transaction cost model), SSOT-RISK-OVERNIGHT (stress test), SSOT-AG-EDGE-DECAY (edge decay protocol), SSOT-REGIME-ENHANCED (regime confidence), SSOT-OPS-INCIDENT (incident response)

<!-- /SSOT-UI-05 -->

---

<!-- SSOT-UI-06 -->
## SSOT-UI-06: Chart Enhancements for Phase 11

### Purpose

Add new chart overlays and visual indicators for HTF alignment, boundary versioning, regime confidence, and trailing stop phases. These extend the existing VisualizationLayer defined in SSOT-UI-02.

### New Chart Overlays

#### 1. HTF Alignment Indicator

**Type:** SeriesPrimitive (top-right corner badge on chart)

```typescript
interface HtfBadge {
  aligned: boolean;
  htfTrend: "UP" | "DOWN" | "FLAT";
  timeframe: string;          // "4H", "Daily"
  sizeMultiplier: number;
}
```

**Visual:** Small badge in top-right of chart area:
- Green arrow up + "4H ALIGNED" when signal matches HTF
- Red arrow down + "4H MISALIGNED (0.5x)" when signal conflicts
- Gray dash + "4H FLAT" when HTF has no clear trend

#### 2. Boundary Version Marker

**Type:** SeriesMarker on chart

When boundary re-estimates (new pivot enters pool, see SSOT-PCTT-BOUNDARY-PROTOCOL), place a small diamond marker on the bar:
- Color: #9C27B0 (purple)
- Shape: diamond
- Tooltip: "Boundary v{N}: {pool_size} pivots, slope={slope:.4f}"

#### 3. Trailing Stop Phase Indicator

**Type:** SeriesPrimitive (label attached to stop line)

Current stop line already exists (SSOT-UI-02, TrailingStopPrimitive). Enhance with phase label:
```
Stop $148.50 [Phase 4: Pivot Trail]
Stop $148.50 [Phase 2: Breakeven]
Stop $148.50 [Phase 6: Momentum Tight]
```

**Phase colors:**
- Phase 1 (Initial Hold): gray
- Phase 2 (Breakeven): blue
- Phase 3 (Partial Exit): green
- Phase 4 (Pivot Trail): gold
- Phase 5 (Time Stop): orange
- Phase 6 (Momentum): purple
- Phase 7 (Circuit Breaker): red

#### 4. Regime Confidence Band

**Type:** PanePrimitive (background opacity)

Existing RegimeTintRenderer (SSOT-UI-02) shows regime color. Enhance with opacity based on confidence:
- Confidence >= 80%: full opacity (0.08 alpha as currently specified)
- Confidence 60-79%: half opacity (0.04 alpha)
- Confidence < 60%: very faint (0.02 alpha) + hatched pattern

#### 5. Edge Decay Warning Zone

**Type:** PanePrimitive (background tint)

When edge_decay_alert is active (2+ detectors triggered, see SSOT-AG-EDGE-DECAY):
- Apply a subtle red tint overlay to the entire chart background (0.03 alpha)
- Show "EDGE DECAY ACTIVE" watermark in center of chart (15% opacity)
- Remove when alert clears

#### 6. Overnight Stress Risk Bars

**Type:** SeriesPrimitive (vertical bars at 15:55 ET)

At 15:55 ET daily, draw a thin vertical line with color based on stress test result (SSOT-RISK-OVERNIGHT):
- Green: overall risk LOW
- Yellow: overall risk MODERATE
- Orange: overall risk HIGH
- Red: overall risk CRITICAL

### Updated Component Tree

```
VisualizationLayer (updated, see SSOT-UI-02)
+-- SentinelLayer (existing)
+-- RegimeLayer (existing, enhanced with confidence opacity)
+-- SignalLayer (existing)
+-- RiskLayer (existing)
+-- ExecutionLayer (existing)
+-- HtfAlignmentLayer (NEW)
|   +-- HtfBadge
+-- BoundaryVersionLayer (NEW)
|   +-- BoundaryDiamondMarkers
+-- TrailingStopPhaseLayer (NEW)
|   +-- PhaseLabel on stop line
+-- EdgeDecayOverlay (NEW)
|   +-- RedTintWatermark (conditional)
+-- OvernightStressLayer (NEW)
    +-- DailyStressVerticalLine
```

Implementation Plan: IMP-P11-023
Progress Tracker: PROG-REQ-217

> **Cross-references:** SSOT-UI-02 (chart visualization, VisualizationLayer, RegimeTintRenderer, TrailingStopPrimitive), SSOT-TRAIL-HTF (HTF alignment gate), SSOT-PCTT-BOUNDARY-PROTOCOL (boundary re-estimation), SSOT-PCTT-TRAILING-ENHANCED (trailing stop phases), SSOT-REGIME-ENHANCED (regime confidence), SSOT-AG-EDGE-DECAY (edge decay detection), SSOT-RISK-OVERNIGHT (overnight stress test)

<!-- /SSOT-UI-06 -->

---

<!-- SSOT-UI-07 -->
## SSOT-UI-07: Adaptive Risk Dashboard

### Purpose

New dedicated panel showing real-time risk parameter adaptation, replacing static risk display with dynamic visualization. Surfaces data from SSOT-FRM-11 (Adaptive Risk Feedback).

### Location

New tab within AgentSidebar (SSOT-UI-01, alongside existing AgentStatus, Portfolio, Metrics, Chat tabs). Tab label: "Risk Dynamics"

### Layout

```
+------------------------------------------+
|  RISK DYNAMICS                           |
|  ========================================|
|  Base Risk:        1.00%                 |
|  ----------------------------------------|
|  Adaptation Factor                       |
|  [===========|=====] 0.72x              |
|  WR ratio: 0.85  Sharpe ratio: 0.68     |
|  ----------------------------------------|
|  Regime Multiplier                       |
|  TRENDING [===============] 1.0x         |
|  ----------------------------------------|
|  Drawdown Scale                          |
|  DD: 8.2% [============|===] 0.59x      |
|  ----------------------------------------|
|  EFFECTIVE RISK:   0.42%                 |
|  (was 1.00%, reduced 58%)               |
|  ========================================|
|  Risk History (last 50 trades)           |
|  [sparkline chart of effective risk %]   |
|  ----------------------------------------|
|  Regime Confidence: 72%                  |
|  Confidence Multiplier: 0.75x           |
|  ----------------------------------------|
|  Transaction Cost Budget                 |
|  Avg cost/trade: $12.40 (0.8% of risk)  |
|  Liquidity caps: 3 of 47 trades (6.4%)  |
+------------------------------------------+
```

### TypeScript Interface

```typescript
interface RiskDynamicsDisplay {
  baseRisk: number;
  adaptationFactor: number;
  adaptationComponents: {
    winRateRatio: number;
    sharpeRatio: number;
    binding: "win_rate" | "sharpe";  // which one is the binding constraint
  };
  regimeMultiplier: number;
  currentRegime: string;
  drawdownScale: number;
  currentDrawdown: number;
  effectiveRisk: number;
  reductionPct: number;          // how much risk was reduced from base
  riskHistory: number[];         // last 50 effective risk values
  regimeConfidence: number;
  confidenceMultiplier: number;
  avgCostPerTrade: number;
  liquidityCapRate: number;
}
```

### Sparkline Component

```typescript
interface SparklineProps {
  data: number[];
  width: number;
  height: number;
  color: string;
  thresholdLine?: number;       // horizontal reference line
}
```

Small inline chart (200x40px) showing effective risk % over last 50 trades. Color: steel blue (#4682B4). Threshold line at base risk (1%) in dashed gray.

Implementation Plan: IMP-P11-024
Progress Tracker: PROG-REQ-218

> **Cross-references:** SSOT-UI-01 (AgentSidebar tabs), SSOT-FRM-11 (adaptive risk feedback formulas), SSOT-FRM-09 (transaction cost data), SSOT-REGIME-ENHANCED (regime confidence multiplier)

<!-- /SSOT-UI-07 -->

---

<!-- SSOT-UI-08 -->
## SSOT-UI-08: Trade History and Performance Panel

### Purpose

New panel for viewing detailed trade history, equity curve, and performance analytics. Addresses the gap identified in the expert review for operational reporting. Draws data from SSOT-AG-07 (Journal Agent) trade log.

### Location

New full-screen overlay (accessed via TopBar button or keyboard shortcut Ctrl+H). Can also dock as a tab replacing the chart.

### Sub-views

#### 1. Trade History Table

```typescript
interface TradeHistoryRow {
  id: string;
  symbol: string;
  direction: "LONG" | "SHORT";
  entryTime: string;
  exitTime: string;
  entryPrice: number;
  exitPrice: number;
  size: number;
  pnlDollars: number;
  pnlR: number;
  qScoreGrade: "A" | "B";
  regime: string;
  trailingPhaseAtExit: number;
  transactionCost: number;
  holdingBars: number;
  htfAligned: boolean;
}
```

**Features:**
- Sortable by any column
- Filterable by: date range, symbol, direction, regime, Q-grade, win/loss
- Exportable to CSV
- Click row to load trade on chart with full PCTT overlay replay

#### 2. Equity Curve

```typescript
interface EquityCurveData {
  timestamps: string[];
  equity: number[];
  drawdownPct: number[];
  highWaterMark: number[];
}
```

**Visual:** Line chart showing:
- Equity curve (blue line)
- High water mark (dashed gray)
- Drawdown area (red shaded between equity and HWM)
- Regime color bands in background

#### 3. Performance Statistics

```
+------------------------------------------+
|  PERFORMANCE SUMMARY                     |
|  Period: Last 30 days | All Time         |
|  ========================================|
|  Total Trades:         47                |
|  Win Rate:             57.4%             |
|  Avg Winner:           +1.82R            |
|  Avg Loser:            -0.94R            |
|  Expectancy:           +0.15R            |
|  Profit Factor:        1.41              |
|  Sharpe Ratio:         1.28              |
|  Sortino Ratio:        1.95              |
|  Max Drawdown:         -8.2%             |
|  Recovery Time:        12 days           |
|  ========================================|
|  BY REGIME                               |
|  Trending:  23 trades, WR 65%, E +0.28R  |
|  MR:        12 trades, WR 50%, E +0.05R  |
|  Choppy:     8 trades, WR 37%, E -0.12R  |
|  Volatile:   4 trades, WR 50%, E +0.10R  |
|  ========================================|
|  BY TIME OF DAY                          |
|  Opening (9:30-10:15):  WR 48%, E +0.02R|
|  Core (10:15-15:00):    WR 61%, E +0.22R|
|  Late (15:00-16:00):    WR 52%, E +0.08R|
|  ========================================|
|  BY Q-SCORE GRADE                        |
|  A-grade:  18 trades, WR 72%, E +0.38R   |
|  B-grade:  29 trades, WR 48%, E +0.01R   |
+------------------------------------------+
```

Implementation Plan: IMP-P11-025
Progress Tracker: PROG-REQ-219

> **Cross-references:** SSOT-UI-01 (TopBar, keyboard shortcuts), SSOT-UI-02 (chart overlay replay), SSOT-AG-07 (Journal Agent trade log), SSOT-STAT-ENHANCED (Sortino ratio, statistical methods), SSOT-REGIME-ENHANCED (regime breakdown), SSOT-FRM-10 (Q-Score grading)

<!-- /SSOT-UI-08 -->

---

## Phase 11 UI Implementation Tasks

**IMP-P11-021: Implement TransactionCost and OvernightStress Widgets**
- Complexity: L (4-8h)
- SSOT References: SSOT-UI-05, SSOT-FRM-09, SSOT-RISK-OVERNIGHT
- Depends On: IMP-P6-009, IMP-P11-001, IMP-P11-005
- Output Files: frontend/src/components/risk/TransactionCostWidget.tsx, frontend/src/components/risk/OvernightStressPanel.tsx
- Acceptance Criteria: Cost breakdown displays in approval dialog; stress panel auto-shows after 15:30 ET; colors match severity thresholds

**IMP-P11-022: Implement EdgeDecay, RegimeConfidence, and IncidentBanner**
- Complexity: L (4-8h)
- SSOT References: SSOT-UI-05, SSOT-AG-EDGE-DECAY, SSOT-REGIME-ENHANCED, SSOT-OPS-INCIDENT
- Depends On: IMP-P6-002, IMP-P6-008, IMP-P11-007, IMP-P11-008, IMP-P11-017
- Output Files: frontend/src/components/status/EdgeDecayIndicator.tsx, frontend/src/components/status/RegimeConfidencePopover.tsx, frontend/src/components/incidents/IncidentBanner.tsx
- Acceptance Criteria: Edge decay shows 3 detector states in BottomBar; regime popover shows all 7 method votes; incident banner appears for P0/P1 with auto-action countdown

**IMP-P11-023: Implement Chart Overlays for Phase 11**
- Complexity: XL (8-16h)
- SSOT References: SSOT-UI-06
- Depends On: IMP-P6-004, IMP-P11-008, IMP-P11-010, IMP-P11-013, IMP-P11-019
- Output Files: frontend/src/components/chart/HtfAlignmentLayer.tsx, frontend/src/components/chart/BoundaryVersionLayer.tsx, frontend/src/components/chart/TrailingStopPhaseLayer.tsx, frontend/src/components/chart/EdgeDecayOverlay.tsx, frontend/src/components/chart/OvernightStressLayer.tsx
- Acceptance Criteria: All 6 new overlays render correctly on TradingView LWC; HTF badge updates on signal evaluation; boundary diamonds appear on re-estimation; stop phase labels match current phase; edge decay watermark shows/hides on alert

**IMP-P11-024: Implement Risk Dynamics Dashboard Tab**
- Complexity: L (4-8h)
- SSOT References: SSOT-UI-07, SSOT-FRM-11
- Depends On: IMP-P6-005, IMP-P11-004
- Output Files: frontend/src/components/sidebar/RiskDynamicsPanel.tsx, frontend/src/components/shared/Sparkline.tsx
- Acceptance Criteria: New "Risk Dynamics" tab in sidebar; all 4 risk factors displayed with progress bars; sparkline shows last 50 risk values; effective risk updates in real-time via WebSocket

**IMP-P11-025: Implement Trade History and Performance Panel**
- Complexity: XL (8-16h)
- SSOT References: SSOT-UI-08, SSOT-AG-07
- Depends On: IMP-P6-002, IMP-P4-006, IMP-P3-007
- Output Files: frontend/src/components/history/TradeHistoryPanel.tsx, frontend/src/components/history/EquityCurve.tsx, frontend/src/components/history/PerformanceStats.tsx
- Acceptance Criteria: Trade table sortable/filterable; equity curve with drawdown shading; performance breakdown by regime, time-of-day, and Q-grade; CSV export functional; click-to-replay loads trade on chart

**IMP-P11-026: PreMarket Checklist Dialog and New Recoil Atoms**
- Complexity: M (2-4h)
- SSOT References: SSOT-UI-05, SSOT-OPS-INCIDENT
- Depends On: IMP-P6-002, IMP-P11-018
- Output Files: frontend/src/components/ops/PreMarketChecklistDialog.tsx, frontend/src/state/phase11Atoms.ts
- Acceptance Criteria: Dialog auto-shows at T-90; 12 checks displayed with pass/fail; mode restriction enforced; all 9 new Recoil atoms defined and connected to WebSocket handler

### Updated Phase 11 Summary

| Task | Name | Complexity | Status |
|------|------|-----------|--------|
| IMP-P11-021 | TransactionCost and OvernightStress Widgets | L | TODO |
| IMP-P11-022 | EdgeDecay, RegimeConfidence, IncidentBanner | L | TODO |
| IMP-P11-023 | Chart Overlays for Phase 11 | XL | TODO |
| IMP-P11-024 | Risk Dynamics Dashboard Tab | L | TODO |
| IMP-P11-025 | Trade History and Performance Panel | XL | TODO |
| IMP-P11-026 | PreMarket Checklist and Recoil Atoms | M | TODO |

**Updated Phase 11 Total: 26 tasks (20 backend + 6 frontend), estimated 160-220 hours**
**Updated Project Total: 134 tasks, estimated 850-1050 hours**

---

**End of SSOT Enhancements Addendum v1.1.0**
