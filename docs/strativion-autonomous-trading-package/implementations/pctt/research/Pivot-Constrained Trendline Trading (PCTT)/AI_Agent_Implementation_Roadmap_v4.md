# AI Agent Trading System v4.0: Production-Grade Implementation Roadmap

**Version:** 4.0  
**Date:** January 16, 2026  
**Status:** Production-Grade

---

## Executive Summary

This document provides a production-grade implementation roadmap for the RG Structure Trading System, incorporating all critical enhancements from the v4.0 framework review. The roadmap addresses the 12 identified gap categories with concrete, implementable solutions.

---

## Critical Gap Fixes Summary

| Gap Category          | v3.0 Status    | v4.0 Fix                                        |
| :-------------------- | :------------- | :---------------------------------------------- |
| Statistical Testing   | Missing        | Monte Carlo + Bootstrap + White's Reality Check |
| Boundary Robustness   | Weak           | Huber Loss + Elastic Net + RANSAC               |
| Q-Score Calibration   | Optional       | Mandatory Isotonic Regression                   |
| Market Microstructure | Absent         | Spread + Impact + Liquidity Models              |
| Risk Management       | Insufficient   | Portfolio Heat + Kelly + DD Scaling             |
| Execution Realism     | Oversimplified | Dynamic Slippage + Partial Fills + Gap Risk     |

---

## Phase 1: Statistical Validation Framework (Week 1-2)

### 1.1 Monte Carlo Significance Testing

```python
import numpy as np
from scipy import stats

class StrategyValidator:
    """Statistical validation for trading strategies"""

    def __init__(self, n_simulations: int = 10000):
        self.n_simulations = n_simulations

    def monte_carlo_significance(
        self,
        returns: np.ndarray,
        signals: np.ndarray
    ) -> dict:
        """
        Test if strategy returns are statistically significant.

        Args:
            returns: Array of price returns
            signals: Array of trading signals (+1, 0, -1)

        Returns:
            Dictionary with p-value and null distribution
        """
        # Calculate actual strategy Sharpe
        strategy_returns = returns * signals
        actual_sharpe = self._sharpe_ratio(strategy_returns)

        # Generate null distribution via permutation
        null_sharpes = []
        for _ in range(self.n_simulations):
            # Randomly permute signals (break signal-return relationship)
            permuted_signals = np.random.permutation(signals)
            null_returns = returns * permuted_signals
            null_sharpes.append(self._sharpe_ratio(null_returns))

        null_sharpes = np.array(null_sharpes)

        # Calculate p-value (one-tailed)
        p_value = np.mean(null_sharpes >= actual_sharpe)

        return {
            'actual_sharpe': actual_sharpe,
            'p_value': p_value,
            'null_mean': np.mean(null_sharpes),
            'null_std': np.std(null_sharpes),
            'significant': p_value < 0.05,
            'null_distribution': null_sharpes
        }

    def _sharpe_ratio(self, returns: np.ndarray, risk_free: float = 0.0) -> float:
        """Calculate annualized Sharpe ratio"""
        excess_returns = returns - risk_free / 252
        if np.std(excess_returns) == 0:
            return 0.0
        return np.mean(excess_returns) / np.std(excess_returns) * np.sqrt(252)
```

### 1.2 Bootstrap Confidence Intervals

```python
def bootstrap_metric(
    trades: list,
    metric_func: callable,
    n_bootstrap: int = 10000,
    confidence: float = 0.95
) -> dict:
    """
    Compute bootstrap confidence interval for any metric.

    Args:
        trades: List of trade results
        metric_func: Function that computes metric from trades
        n_bootstrap: Number of bootstrap samples
        confidence: Confidence level (e.g., 0.95 for 95%)

    Returns:
        Dictionary with point estimate and CI bounds
    """
    n = len(trades)
    boot_stats = []

    for _ in range(n_bootstrap):
        # Resample trades with replacement
        boot_sample = np.random.choice(trades, size=n, replace=True)
        boot_stats.append(metric_func(boot_sample))

    boot_stats = np.array(boot_stats)

    alpha = 1 - confidence
    ci_lower = np.percentile(boot_stats, alpha / 2 * 100)
    ci_upper = np.percentile(boot_stats, (1 - alpha / 2) * 100)

    return {
        'point_estimate': metric_func(trades),
        'ci_lower': ci_lower,
        'ci_upper': ci_upper,
        'std_error': np.std(boot_stats),
        'distribution': boot_stats
    }

# Example usage for multiple metrics
def validate_strategy_metrics(trades: list) -> dict:
    """Validate all key metrics with bootstrap CIs"""

    metrics = {
        'sharpe': lambda t: calculate_sharpe(t),
        'profit_factor': lambda t: calculate_pf(t),
        'win_rate': lambda t: sum(1 for x in t if x.pnl > 0) / len(t),
        'avg_r': lambda t: np.mean([x.r_multiple for x in t]),
        'max_dd': lambda t: calculate_max_drawdown(t)
    }

    results = {}
    for name, func in metrics.items():
        results[name] = bootstrap_metric(trades, func)

    return results
```

### 1.3 White's Reality Check

```python
def whites_reality_check(
    strategy_returns: dict,  # {param_set: returns_array}
    benchmark_returns: np.ndarray,
    n_bootstrap: int = 10000
) -> dict:
    """
    White's Reality Check for data mining bias.

    Tests if the best strategy is genuinely better than benchmark
    after accounting for multiple testing.
    """
    # Calculate excess returns for each strategy
    excess_returns = {
        k: v - benchmark_returns
        for k, v in strategy_returns.items()
    }

    # Find best strategy
    mean_excess = {k: np.mean(v) for k, v in excess_returns.items()}
    best_strategy = max(mean_excess, key=mean_excess.get)
    best_excess = mean_excess[best_strategy]

    # Bootstrap under null (center at zero)
    n = len(benchmark_returns)
    boot_maxes = []

    for _ in range(n_bootstrap):
        boot_idx = np.random.choice(n, size=n, replace=True)

        # Get max excess return across all strategies
        max_boot = max(
            np.mean(v[boot_idx] - np.mean(v))  # Centered
            for v in excess_returns.values()
        )
        boot_maxes.append(max_boot)

    boot_maxes = np.array(boot_maxes)

    # P-value
    p_value = np.mean(boot_maxes >= best_excess)

    # Bonferroni-corrected threshold
    n_strategies = len(strategy_returns)
    bonferroni_threshold = 0.05 / n_strategies

    return {
        'best_strategy': best_strategy,
        'best_excess_return': best_excess,
        'p_value': p_value,
        'bonferroni_threshold': bonferroni_threshold,
        'significant': p_value < bonferroni_threshold,
        'n_strategies_tested': n_strategies
    }
```

---

## Phase 2: Robust Boundary Estimation (Week 2-3)

### 2.1 Huber Loss + Elastic Net Regression

```python
from sklearn.linear_model import HuberRegressor, ElasticNet
import numpy as np

class RobustBoundaryEstimator:
    """
    Robust boundary estimation using Huber loss and regularization.
    """

    def __init__(
        self,
        touch_tolerance: float = 0.3,
        violation_penalty: float = 2.0,
        alpha: float = 0.01,  # Regularization strength
        l1_ratio: float = 0.5,  # Elastic net mixing (0.5 = equal L1/L2)
        huber_epsilon: float = 1.35  # Huber loss threshold
    ):
        self.touch_tolerance = touch_tolerance
        self.violation_penalty = violation_penalty
        self.alpha = alpha
        self.l1_ratio = l1_ratio
        self.huber_epsilon = huber_epsilon

    def fit_support_line(
        self,
        pivot_bars: np.ndarray,
        pivot_prices: np.ndarray,
        atr: float
    ) -> dict:
        """
        Fit support line using robust regression.

        Returns:
            Dictionary with intercept, slope, score, and diagnostics
        """
        if len(pivot_bars) < 2:
            return None

        # Reshape for sklearn
        X = pivot_bars.reshape(-1, 1)
        y = pivot_prices

        # Fit Huber regressor (robust to outliers)
        huber = HuberRegressor(
            epsilon=self.huber_epsilon,
            alpha=self.alpha * atr  # Scale regularization by ATR
        )
        huber.fit(X, y)

        intercept = huber.intercept_
        slope = huber.coef_[0]

        # Calculate quality score
        predictions = huber.predict(X)
        residuals = y - predictions

        # Touch count (pivots within tolerance)
        tau = self.touch_tolerance * atr
        touches = np.sum((residuals >= 0) & (residuals <= tau))

        # Violation severity (pivots below line)
        violations = np.sum(np.maximum(0, -residuals - tau) / atr)

        # Score
        touch_score = touches
        violation_score = self.violation_penalty * violations
        span_score = 0.2 * np.log(1 + np.ptp(pivot_bars))

        total_score = touch_score + span_score - violation_score

        return {
            'intercept': intercept,
            'slope': slope,
            'score': total_score,
            'touches': touches,
            'violations': violations,
            'residuals': residuals,
            'outlier_mask': huber.outliers_
        }
```

### 2.2 RANSAC Consensus Validation

```python
from sklearn.linear_model import RANSACRegressor

def ransac_boundary_estimation(
    pivot_bars: np.ndarray,
    pivot_prices: np.ndarray,
    atr: float,
    min_samples: int = 2,
    residual_threshold: float = None,
    max_trials: int = 100
) -> dict:
    """
    RANSAC-based robust boundary estimation.

    Args:
        pivot_bars: Array of pivot bar indices
        pivot_prices: Array of pivot prices
        atr: Current ATR for threshold scaling
        min_samples: Minimum samples for model fitting
        residual_threshold: Max residual for inlier (default: 1.0 * ATR)
        max_trials: Maximum RANSAC iterations

    Returns:
        Dictionary with line parameters and inlier information
    """
    if len(pivot_bars) < min_samples:
        return None

    if residual_threshold is None:
        residual_threshold = 1.0 * atr

    X = pivot_bars.reshape(-1, 1)
    y = pivot_prices

    # Fit RANSAC regressor
    ransac = RANSACRegressor(
        min_samples=min_samples,
        residual_threshold=residual_threshold,
        max_trials=max_trials,
        random_state=42
    )

    try:
        ransac.fit(X, y)
    except ValueError:
        # Not enough inliers found
        return None

    # Get results
    inlier_mask = ransac.inlier_mask_
    intercept = ransac.estimator_.intercept_
    slope = ransac.estimator_.coef_[0]

    # Refit using all inliers for better estimate
    X_inliers = X[inlier_mask]
    y_inliers = y[inlier_mask]

    if len(X_inliers) >= 2:
        from sklearn.linear_model import LinearRegression
        final_model = LinearRegression()
        final_model.fit(X_inliers, y_inliers)
        intercept = final_model.intercept_
        slope = final_model.coef_[0]

    return {
        'intercept': intercept,
        'slope': slope,
        'n_inliers': np.sum(inlier_mask),
        'n_outliers': np.sum(~inlier_mask),
        'inlier_mask': inlier_mask,
        'inlier_bars': pivot_bars[inlier_mask],
        'inlier_prices': pivot_prices[inlier_mask],
        'consensus_ratio': np.mean(inlier_mask)
    }
```

---

## Phase 3: Mandatory Calibration System (Week 3-4)

### 3.1 Isotonic Regression Calibrator

```python
from sklearn.isotonic import IsotonicRegression
from sklearn.metrics import brier_score_loss
import numpy as np
import pandas as pd

class QScoreCalibrator:
    """
    Mandatory Q-score calibration using isotonic regression.
    """

    def __init__(
        self,
        min_samples: int = 200,
        recalibration_window: int = 500,
        brier_alert_threshold: float = 0.25
    ):
        self.min_samples = min_samples
        self.recalibration_window = recalibration_window
        self.brier_alert_threshold = brier_alert_threshold

        self.calibrator = None
        self.is_fitted = False
        self.calibration_history = []

    def fit(
        self,
        q_scores: np.ndarray,
        outcomes: np.ndarray
    ) -> dict:
        """
        Fit calibrator on historical data.

        Args:
            q_scores: Raw Q-scores [0, 1]
            outcomes: Binary outcomes (1=win, 0=loss)

        Returns:
            Calibration diagnostics
        """
        if len(q_scores) < self.min_samples:
            raise ValueError(
                f"Insufficient samples: {len(q_scores)} < {self.min_samples}"
            )

        # Fit isotonic regression
        self.calibrator = IsotonicRegression(
            y_min=0.0,
            y_max=1.0,
            out_of_bounds='clip'
        )
        self.calibrator.fit(q_scores, outcomes)
        self.is_fitted = True

        # Calculate calibration metrics
        calibrated = self.predict(q_scores)
        brier = brier_score_loss(outcomes, calibrated)

        # Reliability curve
        bins = np.linspace(0, 1, 11)
        bin_indices = np.digitize(calibrated, bins) - 1

        reliability = []
        for i in range(10):
            mask = bin_indices == i
            if np.sum(mask) > 0:
                mean_predicted = np.mean(calibrated[mask])
                mean_actual = np.mean(outcomes[mask])
                reliability.append({
                    'bin': i,
                    'predicted': mean_predicted,
                    'actual': mean_actual,
                    'count': np.sum(mask)
                })

        result = {
            'brier_score': brier,
            'n_samples': len(q_scores),
            'reliability': reliability,
            'calibration_error': np.mean([
                abs(r['predicted'] - r['actual'])
                for r in reliability
            ])
        }

        self.calibration_history.append({
            'timestamp': pd.Timestamp.now(),
            **result
        })

        return result

    def predict(self, q_scores: np.ndarray) -> np.ndarray:
        """Convert raw Q-scores to calibrated probabilities"""
        if not self.is_fitted:
            raise ValueError("Calibrator not fitted. Call fit() first.")
        return self.calibrator.predict(q_scores)

    def check_degradation(
        self,
        recent_q_scores: np.ndarray,
        recent_outcomes: np.ndarray
    ) -> dict:
        """
        Monitor calibration quality on recent data.

        Returns:
            Degradation status and metrics
        """
        if not self.is_fitted:
            return {'status': 'not_fitted'}

        calibrated = self.predict(recent_q_scores)
        current_brier = brier_score_loss(recent_outcomes, calibrated)

        # Compare to historical
        if self.calibration_history:
            baseline_brier = self.calibration_history[-1]['brier_score']
            degradation = current_brier - baseline_brier
        else:
            degradation = 0

        alert = current_brier > self.brier_alert_threshold

        return {
            'current_brier': current_brier,
            'baseline_brier': baseline_brier if self.calibration_history else None,
            'degradation': degradation,
            'alert': alert,
            'recommendation': 'RECALIBRATE' if alert else 'OK'
        }

    def rolling_recalibrate(
        self,
        all_q_scores: np.ndarray,
        all_outcomes: np.ndarray
    ) -> dict:
        """
        Perform rolling window recalibration.
        """
        if len(all_q_scores) < self.recalibration_window:
            return {'status': 'insufficient_data'}

        # Use most recent window
        recent_q = all_q_scores[-self.recalibration_window:]
        recent_outcomes = all_outcomes[-self.recalibration_window:]

        return self.fit(recent_q, recent_outcomes)
```

---

## Phase 4: Market Microstructure Model (Week 4-5)

### 4.1 Dynamic Spread Model

```python
from dataclasses import dataclass
from datetime import datetime
import numpy as np

@dataclass
class SpreadModel:
    """Dynamic bid-ask spread estimation"""

    # Base spreads by asset class (in decimal)
    BASE_SPREADS = {
        'stocks_liquid': 0.0002,      # 2 bps
        'stocks_illiquid': 0.001,     # 10 bps
        'forex_major': 0.00005,       # 0.5 pips
        'forex_minor': 0.0002,        # 2 pips
        'crypto_major': 0.001,        # 10 bps
        'crypto_alt': 0.003,          # 30 bps
        'futures': 0.0001             # 1 bp
    }

    def estimate_spread(
        self,
        asset_class: str,
        timestamp: datetime,
        current_volume: float,
        avg_volume: float,
        volatility: float = None
    ) -> float:
        """
        Estimate effective spread.

        Args:
            asset_class: Asset classification
            timestamp: Current timestamp
            current_volume: Current bar volume
            avg_volume: Average daily volume
            volatility: Current volatility (optional)

        Returns:
            Estimated spread as decimal
        """
        base = self.BASE_SPREADS.get(asset_class, 0.001)

        # Time-of-day adjustment
        hour = timestamp.hour
        time_mult = 1.0

        if hour in [0, 1, 2, 22, 23]:  # Off-hours
            time_mult = 1.5
        elif hour in [12, 13]:  # Lunch
            time_mult = 1.2
        elif hour in [9, 10, 15, 16]:  # Market open/close
            time_mult = 0.9  # Tighter spreads

        # Volume adjustment
        volume_ratio = current_volume / avg_volume if avg_volume > 0 else 1.0
        volume_mult = 1.0

        if volume_ratio < 0.3:
            volume_mult = 1.5
        elif volume_ratio < 0.5:
            volume_mult = 1.2
        elif volume_ratio > 2.0:
            volume_mult = 0.9

        # Volatility adjustment (if provided)
        vol_mult = 1.0
        if volatility is not None:
            # Higher vol = wider spreads
            vol_mult = 1.0 + max(0, volatility - 0.02) * 10

        return base * time_mult * volume_mult * vol_mult


class MarketImpactModel:
    """Square-root market impact model"""

    def __init__(
        self,
        max_participation: float = 0.01,  # 1% ADV limit
        urgency_factor: float = 1.0
    ):
        self.max_participation = max_participation
        self.urgency_factor = urgency_factor

    def estimate_impact(
        self,
        position_size: float,
        avg_daily_volume: float,
        daily_volatility: float,
        order_type: str = 'limit'
    ) -> dict:
        """
        Estimate market impact using square-root law.

        Args:
            position_size: Number of shares/contracts
            avg_daily_volume: 20-day ADV
            daily_volatility: Daily return std dev
            order_type: 'market' or 'limit'

        Returns:
            Impact estimate and constraints
        """
        participation = position_size / avg_daily_volume if avg_daily_volume > 0 else 1.0

        # Urgency based on order type
        urgency = 10.0 if order_type == 'market' else self.urgency_factor

        # Square-root impact
        impact = daily_volatility * np.sqrt(participation) * urgency

        # Additional penalty for large orders
        if participation > 0.02:
            impact *= 1.5

        # Check constraint
        exceeds_limit = participation > self.max_participation
        recommended_size = avg_daily_volume * self.max_participation if exceeds_limit else position_size

        return {
            'estimated_impact': impact,
            'participation_rate': participation,
            'exceeds_adv_limit': exceeds_limit,
            'recommended_size': recommended_size,
            'impact_cost': impact * position_size  # Total cost
        }
```

---

## Phase 5: Advanced Risk Management (Week 5-6)

### 5.1 Portfolio Heat Management

```python
from dataclasses import dataclass
from typing import List
import numpy as np

@dataclass
class Position:
    symbol: str
    size: float
    entry_price: float
    current_price: float
    stop_loss: float
    direction: str  # 'long' or 'short'

class PortfolioRiskManager:
    """
    Portfolio-level risk management with heat tracking.
    """

    def __init__(
        self,
        max_portfolio_heat: float = 0.06,  # 6%
        max_single_position_heat: float = 0.02,  # 2%
        max_correlated_heat: float = 0.04  # 4%
    ):
        self.max_portfolio_heat = max_portfolio_heat
        self.max_single_position_heat = max_single_position_heat
        self.max_correlated_heat = max_correlated_heat

    def calculate_portfolio_heat(
        self,
        positions: List[Position],
        equity: float
    ) -> dict:
        """
        Calculate total portfolio heat (risk exposure).
        """
        total_heat = 0.0
        position_heats = []

        for pos in positions:
            # Risk per position = distance to stop
            if pos.direction == 'long':
                risk_pct = (pos.current_price - pos.stop_loss) / pos.current_price
            else:
                risk_pct = (pos.stop_loss - pos.current_price) / pos.current_price

            position_value = pos.size * pos.current_price
            position_weight = position_value / equity

            heat_contribution = position_weight * risk_pct
            total_heat += heat_contribution

            position_heats.append({
                'symbol': pos.symbol,
                'heat': heat_contribution,
                'weight': position_weight,
                'risk_pct': risk_pct
            })

        return {
            'total_heat': total_heat,
            'positions': position_heats,
            'heat_remaining': self.max_portfolio_heat - total_heat,
            'can_add_position': total_heat < self.max_portfolio_heat
        }

    def check_new_trade(
        self,
        positions: List[Position],
        new_position: Position,
        equity: float
    ) -> dict:
        """
        Check if new trade is allowed under risk constraints.
        """
        current = self.calculate_portfolio_heat(positions, equity)

        # Calculate heat of new position
        if new_position.direction == 'long':
            new_risk_pct = (new_position.entry_price - new_position.stop_loss) / new_position.entry_price
        else:
            new_risk_pct = (new_position.stop_loss - new_position.entry_price) / new_position.entry_price

        new_value = new_position.size * new_position.entry_price
        new_weight = new_value / equity
        new_heat = new_weight * new_risk_pct

        # Check constraints
        total_after = current['total_heat'] + new_heat

        allowed = (
            total_after <= self.max_portfolio_heat and
            new_heat <= self.max_single_position_heat
        )

        return {
            'allowed': allowed,
            'current_heat': current['total_heat'],
            'new_heat': new_heat,
            'total_after': total_after,
            'reason': None if allowed else 'Portfolio heat limit exceeded'
        }


class KellyPositionSizer:
    """
    Kelly Criterion position sizing with fractional Kelly.
    """

    def __init__(self, kelly_fraction: float = 0.25):
        self.kelly_fraction = kelly_fraction

    def calculate_kelly(
        self,
        win_rate: float,
        avg_win: float,
        avg_loss: float
    ) -> float:
        """
        Calculate Kelly fraction.

        Args:
            win_rate: Calibrated probability of success
            avg_win: Average winning trade (in R multiples)
            avg_loss: Average losing trade (in R multiples, positive)

        Returns:
            Optimal fraction of capital to risk
        """
        if avg_loss == 0:
            return 0.0

        b = avg_win / avg_loss  # Win/loss ratio

        # Kelly formula
        kelly = (win_rate * (b + 1) - 1) / b

        # Clamp to valid range
        kelly = max(0, min(kelly, 1.0))

        # Apply fractional Kelly
        return kelly * self.kelly_fraction

    def size_position(
        self,
        equity: float,
        calibrated_win_prob: float,
        avg_win_r: float,
        avg_loss_r: float,
        stop_distance: float
    ) -> dict:
        """
        Calculate position size using Kelly Criterion.
        """
        kelly_fraction = self.calculate_kelly(
            calibrated_win_prob, avg_win_r, avg_loss_r
        )

        risk_amount = equity * kelly_fraction
        position_size = risk_amount / stop_distance if stop_distance > 0 else 0

        return {
            'kelly_fraction': kelly_fraction,
            'risk_amount': risk_amount,
            'position_size': position_size,
            'risk_pct': kelly_fraction
        }


class DrawdownScaler:
    """
    Dynamic position sizing based on drawdown.
    """

    def __init__(
        self,
        thresholds: list = [0.05, 0.10, 0.15, 0.20],
        scales: list = [1.0, 0.75, 0.50, 0.25, 0.0]
    ):
        self.thresholds = thresholds
        self.scales = scales

    def get_scale_factor(
        self,
        current_equity: float,
        peak_equity: float
    ) -> float:
        """
        Get position size scale factor based on drawdown.
        """
        if peak_equity <= 0:
            return 0.0

        drawdown = (peak_equity - current_equity) / peak_equity

        for i, threshold in enumerate(self.thresholds):
            if drawdown < threshold:
                return self.scales[i]

        return self.scales[-1]

    def scale_position(
        self,
        base_size: float,
        current_equity: float,
        peak_equity: float
    ) -> dict:
        """
        Scale position size based on current drawdown.
        """
        scale = self.get_scale_factor(current_equity, peak_equity)
        drawdown = (peak_equity - current_equity) / peak_equity if peak_equity > 0 else 0

        return {
            'base_size': base_size,
            'scaled_size': base_size * scale,
            'scale_factor': scale,
            'current_drawdown': drawdown,
            'trading_allowed': scale > 0
        }
```

---

## Phase 6: Realistic Execution Model (Week 6-7)

### 6.1 Dynamic Slippage Model

```python
from datetime import datetime
import numpy as np

class DynamicSlippageModel:
    """
    Realistic slippage model based on market conditions.
    """

    def __init__(
        self,
        base_slippage: float = 0.0002,  # 2 bps
        volatility_coefficient: float = 5.0,
        volume_coefficient: float = 0.0003,
        session_penalty: float = 0.0005
    ):
        self.base_slippage = base_slippage
        self.vol_coef = volatility_coefficient
        self.vol_coef_volume = volume_coefficient
        self.session_penalty = session_penalty

    def estimate_slippage(
        self,
        price: float,
        volatility: float,  # ATR or similar
        volume_ratio: float,  # current / average
        timestamp: datetime,
        order_type: str = 'market'
    ) -> dict:
        """
        Estimate execution slippage.

        Args:
            price: Current price
            volatility: Current volatility measure
            volume_ratio: Current volume / average volume
            timestamp: Order timestamp
            order_type: 'market' or 'limit'

        Returns:
            Slippage estimate and components
        """
        # Base slippage
        slippage = self.base_slippage

        # Volatility impact
        vol_multiple = volatility / price
        vol_slippage = self.vol_coef * vol_multiple

        # Volume impact (low volume = more slippage)
        volume_penalty = max(0, (1.0 - volume_ratio) * self.vol_coef_volume)

        # Time-of-day impact
        hour = timestamp.hour
        session_slippage = 0
        if hour in [0, 1, 23]:  # Rollover/off-hours
            session_slippage = self.session_penalty

        # Order type impact
        urgency_slippage = 0.0003 if order_type == 'market' else 0

        total_slippage = (
            slippage + vol_slippage + volume_penalty +
            session_slippage + urgency_slippage
        )

        return {
            'total_slippage': total_slippage,
            'slippage_amount': price * total_slippage,
            'components': {
                'base': slippage,
                'volatility': vol_slippage,
                'volume': volume_penalty,
                'session': session_slippage,
                'urgency': urgency_slippage
            }
        }


class GapRiskModel:
    """
    Model overnight gap risk for stop-loss execution.
    """

    def __init__(self, gap_volatility_multiple: float = 1.5):
        self.gap_vol_mult = gap_volatility_multiple

    def simulate_gap_stop_execution(
        self,
        stop_price: float,
        close_before: float,
        daily_volatility: float,
        direction: str,  # 'long' or 'short'
        n_simulations: int = 1000
    ) -> dict:
        """
        Simulate stop execution during overnight gaps.

        Uses Student's t distribution for fat tails.
        """
        from scipy.stats import t

        # Gap distribution (fat-tailed)
        gap_std = self.gap_vol_mult * daily_volatility
        gap_returns = t.rvs(df=3, scale=gap_std, size=n_simulations)

        open_prices = close_before * (1 + gap_returns)

        # Determine execution prices
        execution_prices = []
        for open_price in open_prices:
            if direction == 'long':
                # Stop hit if open below stop
                if open_price < stop_price:
                    execution_prices.append(open_price)  # Gap through
                else:
                    execution_prices.append(stop_price)  # Normal execution
            else:
                # Stop hit if open above stop
                if open_price > stop_price:
                    execution_prices.append(open_price)  # Gap through
                else:
                    execution_prices.append(stop_price)  # Normal execution

        execution_prices = np.array(execution_prices)

        # Calculate slippage statistics
        if direction == 'long':
            slippages = stop_price - execution_prices
        else:
            slippages = execution_prices - stop_price

        return {
            'mean_execution': np.mean(execution_prices),
            'worst_execution': np.min(execution_prices) if direction == 'long' else np.max(execution_prices),
            'mean_slippage': np.mean(slippages),
            'max_slippage': np.max(slippages),
            'gap_through_probability': np.mean(
                (open_prices < stop_price) if direction == 'long' else (open_prices > stop_price)
            ),
            'execution_distribution': execution_prices
        }
```

---

## Phase 7: Production Backtesting Engine (Week 7-8)

### 7.1 Complete Production Backtester

```python
from dataclasses import dataclass, field
from typing import List, Dict, Optional
import pandas as pd
import numpy as np

@dataclass
class ProductionBacktestConfig:
    """Complete configuration for production backtesting"""

    # Initial conditions
    initial_capital: float = 100000.0

    # Risk management
    risk_per_trade_a: float = 0.01
    risk_per_trade_b: float = 0.005
    max_portfolio_heat: float = 0.06
    kelly_fraction: float = 0.25

    # Drawdown scaling
    dd_thresholds: List[float] = field(default_factory=lambda: [0.05, 0.10, 0.15, 0.20])
    dd_scales: List[float] = field(default_factory=lambda: [1.0, 0.75, 0.50, 0.25, 0.0])

    # Execution costs
    commission_pct: float = 0.0005
    base_slippage_pct: float = 0.0002

    # Trailing stop
    be_trigger_r: float = 0.8
    tp1_r: float = 1.0
    tp1_pct: float = 0.6
    trail_start_r: float = 1.2

    # Time controls
    max_bars_in_trade: int = 40
    time_stop_min_r: float = 0.3

    # Validation
    min_trades_for_validation: int = 100
    monte_carlo_simulations: int = 10000
    bootstrap_samples: int = 10000


class ProductionBacktester:
    """
    Production-grade backtesting engine with all v4.0 features.
    """

    def __init__(self, config: ProductionBacktestConfig):
        self.config = config

        # Initialize components
        self.spread_model = SpreadModel()
        self.impact_model = MarketImpactModel()
        self.slippage_model = DynamicSlippageModel()
        self.risk_manager = PortfolioRiskManager(config.max_portfolio_heat)
        self.kelly_sizer = KellyPositionSizer(config.kelly_fraction)
        self.dd_scaler = DrawdownScaler(config.dd_thresholds, config.dd_scales)
        self.validator = StrategyValidator(config.monte_carlo_simulations)
        self.calibrator = QScoreCalibrator()

        # Results storage
        self.trades = []
        self.equity_curve = []
        self.signals = []

    def run(
        self,
        data: pd.DataFrame,
        warmup_bars: int = 250
    ) -> dict:
        """
        Execute complete backtest with all v4.0 features.
        """
        # Implementation would follow the structure from earlier phases
        # Combining all components into a unified backtest loop

        # ... (full implementation)

        # After backtest, run validation
        validation_results = self._validate_results()

        return {
            'trades': self.trades,
            'equity_curve': self.equity_curve,
            'metrics': self._calculate_metrics(),
            'validation': validation_results
        }

    def _validate_results(self) -> dict:
        """Run statistical validation on results"""

        if len(self.trades) < self.config.min_trades_for_validation:
            return {'status': 'insufficient_trades'}

        # Monte Carlo significance
        returns = np.array([t.pnl_pct for t in self.trades])
        signals = np.array([1 if t.direction == 'long' else -1 for t in self.trades])

        mc_result = self.validator.monte_carlo_significance(returns, signals)

        # Bootstrap CIs
        metrics_ci = validate_strategy_metrics(self.trades)

        return {
            'monte_carlo': mc_result,
            'bootstrap_ci': metrics_ci,
            'is_significant': mc_result['significant']
        }
```

---

## Deployment Timeline Summary

| Phase                     | Duration  | Key Deliverables                   |
| :------------------------ | :-------- | :--------------------------------- |
| 1. Statistical Validation | Week 1-2  | Monte Carlo, Bootstrap, White's RC |
| 2. Robust Estimation      | Week 2-3  | Huber Loss, RANSAC, Regularization |
| 3. Calibration System     | Week 3-4  | Isotonic Regression, Monitoring    |
| 4. Microstructure         | Week 4-5  | Spread, Impact, Liquidity Models   |
| 5. Risk Management        | Week 5-6  | Portfolio Heat, Kelly, DD Scaling  |
| 6. Execution Model        | Week 6-7  | Dynamic Slippage, Gap Risk         |
| 7. Production Engine      | Week 7-8  | Integrated Backtester              |
| 8. Validation & Testing   | Week 8-10 | Walk-forward, Robustness           |

**Total Timeline: 8-10 weeks**

---

_Document Version: 4.0 | Production-Grade Implementation Roadmap_
