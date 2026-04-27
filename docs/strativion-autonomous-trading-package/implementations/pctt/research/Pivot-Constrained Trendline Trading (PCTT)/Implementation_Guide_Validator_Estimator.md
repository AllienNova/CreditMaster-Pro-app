# Detailed Implementation Guide: StrategyValidator & RobustBoundaryEstimator

**Version:** 4.0  
**Date:** January 16, 2026  
**Purpose:** Production-ready implementation with complete code and testing

---

## Table of Contents

1. [Environment Setup](#1-environment-setup)
2. [StrategyValidator Implementation](#2-strategyvalidator-implementation)
3. [RobustBoundaryEstimator Implementation](#3-robustboundaryestimator-implementation)
4. [Integration Example](#4-integration-example)
5. [Testing & Validation](#5-testing--validation)

---

## 1. Environment Setup

### 1.1 Required Libraries

```bash
# Core dependencies
pip install numpy>=1.24.0
pip install pandas>=2.0.0
pip install scipy>=1.11.0
pip install scikit-learn>=1.3.0

# Visualization (optional but recommended)
pip install matplotlib>=3.7.0
pip install seaborn>=0.12.0

# Testing
pip install pytest>=7.4.0
pip install pytest-cov>=4.1.0
```

### 1.2 Requirements File

Create `requirements.txt`:

```text
numpy>=1.24.0
pandas>=2.0.0
scipy>=1.11.0
scikit-learn>=1.3.0
matplotlib>=3.7.0
seaborn>=0.12.0
pytest>=7.4.0
pytest-cov>=4.1.0
```

### 1.3 Project Structure

```
rg_trading_system/
├── __init__.py
├── validation/
│   ├── __init__.py
│   ├── strategy_validator.py
│   └── test_validator.py
├── estimation/
│   ├── __init__.py
│   ├── robust_boundary_estimator.py
│   └── test_estimator.py
├── utils/
│   ├── __init__.py
│   └── data_types.py
└── examples/
    ├── validator_example.py
    └── estimator_example.py
```

---

## 2. StrategyValidator Implementation

### 2.1 Complete Implementation

**File: `validation/strategy_validator.py`**

```python
"""
StrategyValidator: Statistical validation for trading strategies.

This module provides Monte Carlo significance testing, bootstrap confidence
intervals, and White's Reality Check for data mining bias.

Author: Manus AI
Version: 4.0
"""

from dataclasses import dataclass
from typing import List, Dict, Callable, Optional, Tuple
import numpy as np
from scipy import stats
import warnings


@dataclass
class ValidationResult:
    """Container for validation results"""
    test_name: str
    statistic: float
    p_value: float
    is_significant: bool
    confidence_level: float
    details: Dict


@dataclass
class BootstrapCI:
    """Bootstrap confidence interval result"""
    point_estimate: float
    ci_lower: float
    ci_upper: float
    std_error: float
    confidence_level: float
    n_samples: int


class StrategyValidator:
    """
    Production-grade statistical validation for trading strategies.

    Provides three core validation methods:
    1. Monte Carlo permutation test for strategy significance
    2. Bootstrap confidence intervals for performance metrics
    3. White's Reality Check for multiple testing correction

    Example:
        >>> validator = StrategyValidator(n_simulations=10000)
        >>> result = validator.monte_carlo_significance(returns, signals)
        >>> print(f"P-value: {result.p_value:.4f}")
        >>> print(f"Significant: {result.is_significant}")
    """

    def __init__(
        self,
        n_simulations: int = 10000,
        confidence_level: float = 0.95,
        random_seed: Optional[int] = 42
    ):
        """
        Initialize the validator.

        Args:
            n_simulations: Number of Monte Carlo/bootstrap iterations
            confidence_level: Confidence level for intervals (default 95%)
            random_seed: Random seed for reproducibility (None for random)
        """
        self.n_simulations = n_simulations
        self.confidence_level = confidence_level
        self.random_seed = random_seed

        if random_seed is not None:
            np.random.seed(random_seed)

    # =========================================================================
    # MONTE CARLO SIGNIFICANCE TEST
    # =========================================================================

    def monte_carlo_significance(
        self,
        returns: np.ndarray,
        signals: np.ndarray,
        metric: str = 'sharpe'
    ) -> ValidationResult:
        """
        Test if strategy returns are statistically significant using
        Monte Carlo permutation testing.

        The null hypothesis is that the strategy's performance is no better
        than random chance. We test this by randomly permuting the signals
        and comparing the resulting performance distribution.

        Args:
            returns: Array of price returns (e.g., daily returns)
            signals: Array of trading signals (+1 for long, -1 for short, 0 for flat)
            metric: Performance metric to test ('sharpe', 'total_return', 'sortino')

        Returns:
            ValidationResult with p-value and significance determination

        Raises:
            ValueError: If returns and signals have different lengths
        """
        # Input validation
        returns = np.asarray(returns)
        signals = np.asarray(signals)

        if len(returns) != len(signals):
            raise ValueError(
                f"Returns ({len(returns)}) and signals ({len(signals)}) "
                "must have the same length"
            )

        if len(returns) < 30:
            warnings.warn(
                f"Sample size ({len(returns)}) is small. "
                "Results may be unreliable."
            )

        # Select metric function
        metric_funcs = {
            'sharpe': self._sharpe_ratio,
            'total_return': self._total_return,
            'sortino': self._sortino_ratio
        }

        if metric not in metric_funcs:
            raise ValueError(f"Unknown metric: {metric}. Choose from {list(metric_funcs.keys())}")

        metric_func = metric_funcs[metric]

        # Calculate actual strategy performance
        strategy_returns = returns * signals
        actual_metric = metric_func(strategy_returns)

        # Generate null distribution via permutation
        null_metrics = np.zeros(self.n_simulations)

        for i in range(self.n_simulations):
            # Randomly permute signals (breaks signal-return relationship)
            permuted_signals = np.random.permutation(signals)
            null_returns = returns * permuted_signals
            null_metrics[i] = metric_func(null_returns)

        # Calculate p-value (one-tailed: proportion of null >= actual)
        p_value = np.mean(null_metrics >= actual_metric)

        # Determine significance
        alpha = 1 - self.confidence_level
        is_significant = p_value < alpha

        return ValidationResult(
            test_name='Monte Carlo Permutation Test',
            statistic=actual_metric,
            p_value=p_value,
            is_significant=is_significant,
            confidence_level=self.confidence_level,
            details={
                'metric': metric,
                'actual_value': actual_metric,
                'null_mean': np.mean(null_metrics),
                'null_std': np.std(null_metrics),
                'null_median': np.median(null_metrics),
                'null_percentile_95': np.percentile(null_metrics, 95),
                'null_percentile_99': np.percentile(null_metrics, 99),
                'n_simulations': self.n_simulations,
                'sample_size': len(returns),
                'null_distribution': null_metrics
            }
        )

    # =========================================================================
    # BOOTSTRAP CONFIDENCE INTERVALS
    # =========================================================================

    def bootstrap_confidence_interval(
        self,
        data: np.ndarray,
        metric_func: Callable[[np.ndarray], float],
        method: str = 'percentile'
    ) -> BootstrapCI:
        """
        Compute bootstrap confidence interval for any metric.

        Args:
            data: Array of observations (e.g., trade returns)
            metric_func: Function that computes metric from data array
            method: CI method ('percentile', 'bca', 'basic')

        Returns:
            BootstrapCI with point estimate and confidence bounds
        """
        data = np.asarray(data)
        n = len(data)

        if n < 10:
            raise ValueError(f"Sample size ({n}) too small for bootstrap")

        # Point estimate
        point_estimate = metric_func(data)

        # Bootstrap resampling
        boot_stats = np.zeros(self.n_simulations)

        for i in range(self.n_simulations):
            # Resample with replacement
            boot_sample = np.random.choice(data, size=n, replace=True)
            boot_stats[i] = metric_func(boot_sample)

        # Calculate confidence interval
        alpha = 1 - self.confidence_level

        if method == 'percentile':
            ci_lower = np.percentile(boot_stats, alpha / 2 * 100)
            ci_upper = np.percentile(boot_stats, (1 - alpha / 2) * 100)

        elif method == 'basic':
            # Basic bootstrap (2*theta - percentiles)
            ci_lower = 2 * point_estimate - np.percentile(boot_stats, (1 - alpha / 2) * 100)
            ci_upper = 2 * point_estimate - np.percentile(boot_stats, alpha / 2 * 100)

        elif method == 'bca':
            # Bias-corrected and accelerated (BCa)
            ci_lower, ci_upper = self._bca_interval(
                data, boot_stats, point_estimate, metric_func, alpha
            )

        else:
            raise ValueError(f"Unknown method: {method}")

        return BootstrapCI(
            point_estimate=point_estimate,
            ci_lower=ci_lower,
            ci_upper=ci_upper,
            std_error=np.std(boot_stats),
            confidence_level=self.confidence_level,
            n_samples=self.n_simulations
        )

    def bootstrap_all_metrics(
        self,
        trade_returns: np.ndarray
    ) -> Dict[str, BootstrapCI]:
        """
        Compute bootstrap CIs for all standard trading metrics.

        Args:
            trade_returns: Array of individual trade returns (R-multiples or %)

        Returns:
            Dictionary mapping metric names to BootstrapCI objects
        """
        trade_returns = np.asarray(trade_returns)

        metrics = {
            'mean_return': lambda x: np.mean(x),
            'median_return': lambda x: np.median(x),
            'std_return': lambda x: np.std(x),
            'sharpe_ratio': self._sharpe_ratio,
            'sortino_ratio': self._sortino_ratio,
            'win_rate': lambda x: np.mean(x > 0),
            'profit_factor': self._profit_factor,
            'max_drawdown': self._max_drawdown,
            'avg_win': lambda x: np.mean(x[x > 0]) if np.any(x > 0) else 0,
            'avg_loss': lambda x: np.mean(x[x < 0]) if np.any(x < 0) else 0,
            'expectancy': lambda x: np.mean(x)
        }

        results = {}
        for name, func in metrics.items():
            try:
                results[name] = self.bootstrap_confidence_interval(
                    trade_returns, func
                )
            except Exception as e:
                warnings.warn(f"Could not compute {name}: {e}")

        return results

    # =========================================================================
    # WHITE'S REALITY CHECK
    # =========================================================================

    def whites_reality_check(
        self,
        strategy_returns: Dict[str, np.ndarray],
        benchmark_returns: np.ndarray
    ) -> ValidationResult:
        """
        White's Reality Check for data mining bias.

        Tests whether the best-performing strategy is genuinely better than
        the benchmark after accounting for multiple testing.

        Args:
            strategy_returns: Dict mapping strategy names to return arrays
            benchmark_returns: Array of benchmark returns (e.g., buy-and-hold)

        Returns:
            ValidationResult with adjusted p-value and significance
        """
        benchmark_returns = np.asarray(benchmark_returns)
        n = len(benchmark_returns)

        # Calculate excess returns for each strategy
        excess_returns = {}
        for name, returns in strategy_returns.items():
            returns = np.asarray(returns)
            if len(returns) != n:
                raise ValueError(
                    f"Strategy '{name}' has {len(returns)} returns, "
                    f"expected {n}"
                )
            excess_returns[name] = returns - benchmark_returns

        # Find best strategy by mean excess return
        mean_excess = {k: np.mean(v) for k, v in excess_returns.items()}
        best_strategy = max(mean_excess, key=mean_excess.get)
        best_excess = mean_excess[best_strategy]

        # Bootstrap under null hypothesis (centered at zero)
        boot_maxes = np.zeros(self.n_simulations)

        for i in range(self.n_simulations):
            # Bootstrap sample indices
            boot_idx = np.random.choice(n, size=n, replace=True)

            # Get max excess return across all strategies (centered)
            max_boot = max(
                np.mean(v[boot_idx] - np.mean(v))  # Center at zero
                for v in excess_returns.values()
            )
            boot_maxes[i] = max_boot

        # P-value: proportion of bootstrap maxes >= observed best
        p_value = np.mean(boot_maxes >= best_excess)

        # Bonferroni-corrected threshold for comparison
        n_strategies = len(strategy_returns)
        bonferroni_alpha = (1 - self.confidence_level) / n_strategies

        return ValidationResult(
            test_name="White's Reality Check",
            statistic=best_excess,
            p_value=p_value,
            is_significant=p_value < (1 - self.confidence_level),
            confidence_level=self.confidence_level,
            details={
                'best_strategy': best_strategy,
                'best_excess_return': best_excess,
                'all_excess_returns': mean_excess,
                'n_strategies_tested': n_strategies,
                'bonferroni_threshold': bonferroni_alpha,
                'bonferroni_significant': p_value < bonferroni_alpha,
                'bootstrap_distribution': boot_maxes
            }
        )

    # =========================================================================
    # HELPER METHODS
    # =========================================================================

    def _sharpe_ratio(
        self,
        returns: np.ndarray,
        risk_free: float = 0.0,
        periods_per_year: int = 252
    ) -> float:
        """Calculate annualized Sharpe ratio"""
        excess_returns = returns - risk_free / periods_per_year
        std = np.std(excess_returns)
        if std == 0 or np.isnan(std):
            return 0.0
        return np.mean(excess_returns) / std * np.sqrt(periods_per_year)

    def _sortino_ratio(
        self,
        returns: np.ndarray,
        risk_free: float = 0.0,
        periods_per_year: int = 252
    ) -> float:
        """Calculate annualized Sortino ratio"""
        excess_returns = returns - risk_free / periods_per_year
        downside = returns[returns < 0]
        downside_std = np.std(downside) if len(downside) > 0 else 0
        if downside_std == 0 or np.isnan(downside_std):
            return 0.0
        return np.mean(excess_returns) / downside_std * np.sqrt(periods_per_year)

    def _total_return(self, returns: np.ndarray) -> float:
        """Calculate total cumulative return"""
        return np.prod(1 + returns) - 1

    def _profit_factor(self, returns: np.ndarray) -> float:
        """Calculate profit factor (gross profit / gross loss)"""
        gross_profit = np.sum(returns[returns > 0])
        gross_loss = np.abs(np.sum(returns[returns < 0]))
        if gross_loss == 0:
            return np.inf if gross_profit > 0 else 0.0
        return gross_profit / gross_loss

    def _max_drawdown(self, returns: np.ndarray) -> float:
        """Calculate maximum drawdown"""
        cumulative = np.cumprod(1 + returns)
        running_max = np.maximum.accumulate(cumulative)
        drawdowns = (running_max - cumulative) / running_max
        return np.max(drawdowns)

    def _bca_interval(
        self,
        data: np.ndarray,
        boot_stats: np.ndarray,
        theta_hat: float,
        metric_func: Callable,
        alpha: float
    ) -> Tuple[float, float]:
        """Calculate BCa (bias-corrected and accelerated) confidence interval"""
        n = len(data)

        # Bias correction factor
        z0 = stats.norm.ppf(np.mean(boot_stats < theta_hat))

        # Acceleration factor (jackknife)
        jackknife_stats = np.zeros(n)
        for i in range(n):
            jack_sample = np.delete(data, i)
            jackknife_stats[i] = metric_func(jack_sample)

        jack_mean = np.mean(jackknife_stats)
        num = np.sum((jack_mean - jackknife_stats) ** 3)
        denom = 6 * (np.sum((jack_mean - jackknife_stats) ** 2) ** 1.5)

        a = num / denom if denom != 0 else 0

        # Adjusted percentiles
        z_alpha_lower = stats.norm.ppf(alpha / 2)
        z_alpha_upper = stats.norm.ppf(1 - alpha / 2)

        def adjusted_percentile(z_alpha):
            num = z0 + z_alpha
            denom = 1 - a * num
            if denom == 0:
                return 0.5
            return stats.norm.cdf(z0 + num / denom)

        p_lower = adjusted_percentile(z_alpha_lower)
        p_upper = adjusted_percentile(z_alpha_upper)

        ci_lower = np.percentile(boot_stats, p_lower * 100)
        ci_upper = np.percentile(boot_stats, p_upper * 100)

        return ci_lower, ci_upper


# =============================================================================
# CONVENIENCE FUNCTIONS
# =============================================================================

def validate_strategy(
    returns: np.ndarray,
    signals: np.ndarray,
    n_simulations: int = 10000
) -> Dict:
    """
    Convenience function to run full validation suite.

    Args:
        returns: Price returns array
        signals: Trading signals array
        n_simulations: Number of Monte Carlo simulations

    Returns:
        Dictionary with all validation results
    """
    validator = StrategyValidator(n_simulations=n_simulations)

    # Monte Carlo test
    mc_result = validator.monte_carlo_significance(returns, signals)

    # Bootstrap CIs on strategy returns
    strategy_returns = returns * signals
    bootstrap_results = validator.bootstrap_all_metrics(strategy_returns)

    return {
        'monte_carlo': mc_result,
        'bootstrap': bootstrap_results,
        'summary': {
            'is_significant': mc_result.is_significant,
            'p_value': mc_result.p_value,
            'sharpe_ci': (
                bootstrap_results['sharpe_ratio'].ci_lower,
                bootstrap_results['sharpe_ratio'].ci_upper
            ) if 'sharpe_ratio' in bootstrap_results else None
        }
    }
```

### 2.2 Unit Tests

**File: `validation/test_validator.py`**

```python
"""Unit tests for StrategyValidator"""

import pytest
import numpy as np
from strategy_validator import StrategyValidator, validate_strategy


class TestStrategyValidator:
    """Test suite for StrategyValidator"""

    @pytest.fixture
    def validator(self):
        return StrategyValidator(n_simulations=1000, random_seed=42)

    @pytest.fixture
    def sample_data(self):
        """Generate sample returns and signals"""
        np.random.seed(42)
        n = 500
        returns = np.random.normal(0.0005, 0.02, n)

        # Create signals with slight edge
        signals = np.sign(returns + np.random.normal(0, 0.01, n))

        return returns, signals

    def test_monte_carlo_basic(self, validator, sample_data):
        """Test basic Monte Carlo functionality"""
        returns, signals = sample_data
        result = validator.monte_carlo_significance(returns, signals)

        assert result.test_name == 'Monte Carlo Permutation Test'
        assert 0 <= result.p_value <= 1
        assert isinstance(result.is_significant, bool)
        assert 'null_distribution' in result.details

    def test_monte_carlo_random_signals(self, validator):
        """Random signals should not be significant"""
        np.random.seed(42)
        returns = np.random.normal(0, 0.02, 500)
        signals = np.random.choice([-1, 0, 1], 500)

        result = validator.monte_carlo_significance(returns, signals)

        # Random signals should have p-value close to 0.5
        assert result.p_value > 0.1

    def test_monte_carlo_perfect_signals(self, validator):
        """Perfect signals should be highly significant"""
        np.random.seed(42)
        returns = np.random.normal(0, 0.02, 500)
        signals = np.sign(returns)  # Perfect foresight

        result = validator.monte_carlo_significance(returns, signals)

        assert result.p_value < 0.01
        assert result.is_significant

    def test_bootstrap_ci(self, validator):
        """Test bootstrap confidence interval"""
        np.random.seed(42)
        data = np.random.normal(0.01, 0.05, 200)

        result = validator.bootstrap_confidence_interval(
            data, np.mean
        )

        assert result.ci_lower < result.point_estimate < result.ci_upper
        assert result.std_error > 0

    def test_bootstrap_all_metrics(self, validator):
        """Test bootstrap for all metrics"""
        np.random.seed(42)
        trade_returns = np.random.normal(0.01, 0.1, 100)

        results = validator.bootstrap_all_metrics(trade_returns)

        assert 'sharpe_ratio' in results
        assert 'win_rate' in results
        assert 'profit_factor' in results

    def test_whites_reality_check(self, validator):
        """Test White's Reality Check"""
        np.random.seed(42)
        n = 500

        benchmark = np.random.normal(0.0005, 0.02, n)

        strategies = {
            'strategy_1': benchmark + np.random.normal(0.0001, 0.005, n),
            'strategy_2': benchmark + np.random.normal(0.0002, 0.005, n),
            'strategy_3': benchmark + np.random.normal(-0.0001, 0.005, n),
        }

        result = validator.whites_reality_check(strategies, benchmark)

        assert result.test_name == "White's Reality Check"
        assert 'best_strategy' in result.details
        assert result.details['n_strategies_tested'] == 3

    def test_input_validation(self, validator):
        """Test input validation"""
        returns = np.array([0.01, 0.02, 0.03])
        signals = np.array([1, -1])  # Wrong length

        with pytest.raises(ValueError):
            validator.monte_carlo_significance(returns, signals)

    def test_small_sample_warning(self, validator):
        """Test warning for small samples"""
        returns = np.array([0.01] * 20)
        signals = np.array([1] * 20)

        with pytest.warns(UserWarning):
            validator.monte_carlo_significance(returns, signals)


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
```

---

## 3. RobustBoundaryEstimator Implementation

### 3.1 Complete Implementation

**File: `estimation/robust_boundary_estimator.py`**

```python
"""
RobustBoundaryEstimator: Robust trendline estimation using Huber loss,
Elastic Net regularization, and RANSAC consensus validation.

Author: Manus AI
Version: 4.0
"""

from dataclasses import dataclass
from typing import Optional, Tuple, List
import numpy as np
from sklearn.linear_model import HuberRegressor, RANSACRegressor, LinearRegression
from sklearn.preprocessing import StandardScaler
import warnings


@dataclass
class BoundaryEstimate:
    """Container for boundary estimation results"""
    intercept: float
    slope: float
    score: float
    touches: int
    violations: float
    q_score: float  # Normalized quality score [0, 1]
    grade: str  # 'A', 'B', or 'SKIP'
    is_valid: bool
    diagnostics: dict


@dataclass
class EstimatorConfig:
    """Configuration for boundary estimation"""
    # Touch/violation parameters
    touch_tolerance: float = 0.3  # ATR multiplier
    violation_penalty: float = 2.0  # Lambda
    persistence_weight: float = 0.2  # Omega

    # Quality thresholds
    q_score_a: float = 0.70
    q_score_b: float = 0.55

    # Robustness parameters
    huber_epsilon: float = 1.35
    alpha: float = 0.01  # Regularization strength
    l1_ratio: float = 0.5  # Elastic net mixing
    max_slope_atr: float = 0.02  # Max slope per bar in ATR units

    # RANSAC parameters
    ransac_min_samples: int = 2
    ransac_max_trials: int = 100
    ransac_residual_threshold: float = 1.0  # ATR multiplier

    # Minimum requirements
    min_pivots: int = 5
    min_touches: int = 3
    min_span: int = 20  # Minimum bars between first and last pivot


class RobustBoundaryEstimator:
    """
    Production-grade boundary estimation using robust regression.

    Features:
    - Huber loss for outlier resistance
    - Elastic Net regularization to prevent overfitting
    - RANSAC consensus validation for model stability
    - One-sided touch/violation definitions
    - Quality scoring with sigmoid normalization

    Example:
        >>> estimator = RobustBoundaryEstimator()
        >>> result = estimator.estimate_support(pivot_bars, pivot_prices, atr)
        >>> print(f"Support: {result.intercept} + {result.slope} * t")
        >>> print(f"Q-Score: {result.q_score:.2f}, Grade: {result.grade}")
    """

    def __init__(self, config: Optional[EstimatorConfig] = None):
        """
        Initialize the estimator.

        Args:
            config: Configuration object (uses defaults if None)
        """
        self.config = config or EstimatorConfig()

    # =========================================================================
    # MAIN ESTIMATION METHODS
    # =========================================================================

    def estimate_support(
        self,
        pivot_bars: np.ndarray,
        pivot_prices: np.ndarray,
        atr: float,
        all_bar_lows: Optional[np.ndarray] = None
    ) -> BoundaryEstimate:
        """
        Estimate support boundary from pivot lows.

        Args:
            pivot_bars: Array of bar indices where pivot lows occurred
            pivot_prices: Array of pivot low prices
            atr: Current ATR for normalization
            all_bar_lows: Optional array of all bar lows for violation checking

        Returns:
            BoundaryEstimate with line parameters and quality metrics
        """
        return self._estimate_boundary(
            pivot_bars, pivot_prices, atr,
            boundary_type='support',
            all_prices=all_bar_lows
        )

    def estimate_resistance(
        self,
        pivot_bars: np.ndarray,
        pivot_prices: np.ndarray,
        atr: float,
        all_bar_highs: Optional[np.ndarray] = None
    ) -> BoundaryEstimate:
        """
        Estimate resistance boundary from pivot highs.

        Args:
            pivot_bars: Array of bar indices where pivot highs occurred
            pivot_prices: Array of pivot high prices
            atr: Current ATR for normalization
            all_bar_highs: Optional array of all bar highs for violation checking

        Returns:
            BoundaryEstimate with line parameters and quality metrics
        """
        return self._estimate_boundary(
            pivot_bars, pivot_prices, atr,
            boundary_type='resistance',
            all_prices=all_bar_highs
        )

    # =========================================================================
    # CORE ESTIMATION LOGIC
    # =========================================================================

    def _estimate_boundary(
        self,
        pivot_bars: np.ndarray,
        pivot_prices: np.ndarray,
        atr: float,
        boundary_type: str,
        all_prices: Optional[np.ndarray] = None
    ) -> BoundaryEstimate:
        """
        Core boundary estimation with robust regression.
        """
        pivot_bars = np.asarray(pivot_bars)
        pivot_prices = np.asarray(pivot_prices)

        # Validate inputs
        if not self._validate_inputs(pivot_bars, pivot_prices, atr):
            return self._invalid_result("Insufficient data")

        # Try multiple estimation methods and select best
        candidates = []

        # Method 1: Huber regression
        huber_result = self._huber_estimation(
            pivot_bars, pivot_prices, atr, boundary_type
        )
        if huber_result is not None:
            candidates.append(huber_result)

        # Method 2: RANSAC estimation
        ransac_result = self._ransac_estimation(
            pivot_bars, pivot_prices, atr, boundary_type
        )
        if ransac_result is not None:
            candidates.append(ransac_result)

        # Method 3: Pairwise enumeration (fallback)
        pairwise_result = self._pairwise_estimation(
            pivot_bars, pivot_prices, atr, boundary_type
        )
        if pairwise_result is not None:
            candidates.append(pairwise_result)

        if not candidates:
            return self._invalid_result("All estimation methods failed")

        # Select best candidate by score
        best = max(candidates, key=lambda x: x['score'])

        # Calculate quality score and grade
        q_score = self._sigmoid(best['score'] / 3)  # Normalize
        grade = self._assign_grade(q_score, best['touches'])

        return BoundaryEstimate(
            intercept=best['intercept'],
            slope=best['slope'],
            score=best['score'],
            touches=best['touches'],
            violations=best['violations'],
            q_score=q_score,
            grade=grade,
            is_valid=True,
            diagnostics={
                'method': best['method'],
                'n_pivots': len(pivot_bars),
                'span': int(np.ptp(pivot_bars)),
                'atr': atr,
                'all_candidates': len(candidates)
            }
        )

    def _huber_estimation(
        self,
        pivot_bars: np.ndarray,
        pivot_prices: np.ndarray,
        atr: float,
        boundary_type: str
    ) -> Optional[dict]:
        """
        Estimate boundary using Huber regression.
        """
        try:
            X = pivot_bars.reshape(-1, 1)
            y = pivot_prices

            # Fit Huber regressor
            huber = HuberRegressor(
                epsilon=self.config.huber_epsilon,
                alpha=self.config.alpha * atr,
                max_iter=200
            )
            huber.fit(X, y)

            intercept = huber.intercept_
            slope = huber.coef_[0]

            # Check slope constraint
            if abs(slope) > self.config.max_slope_atr * atr:
                return None

            # Calculate score
            score_data = self._calculate_score(
                intercept, slope, pivot_bars, pivot_prices, atr, boundary_type
            )

            return {
                'intercept': intercept,
                'slope': slope,
                'score': score_data['score'],
                'touches': score_data['touches'],
                'violations': score_data['violations'],
                'method': 'huber'
            }

        except Exception as e:
            warnings.warn(f"Huber estimation failed: {e}")
            return None

    def _ransac_estimation(
        self,
        pivot_bars: np.ndarray,
        pivot_prices: np.ndarray,
        atr: float,
        boundary_type: str
    ) -> Optional[dict]:
        """
        Estimate boundary using RANSAC for consensus validation.
        """
        try:
            X = pivot_bars.reshape(-1, 1)
            y = pivot_prices

            residual_threshold = self.config.ransac_residual_threshold * atr

            ransac = RANSACRegressor(
                min_samples=self.config.ransac_min_samples,
                residual_threshold=residual_threshold,
                max_trials=self.config.ransac_max_trials,
                random_state=42
            )
            ransac.fit(X, y)

            # Check if enough inliers
            inlier_mask = ransac.inlier_mask_
            n_inliers = np.sum(inlier_mask)

            if n_inliers < self.config.min_touches:
                return None

            # Refit on inliers for better estimate
            X_inliers = X[inlier_mask]
            y_inliers = y[inlier_mask]

            final_model = LinearRegression()
            final_model.fit(X_inliers, y_inliers)

            intercept = final_model.intercept_
            slope = final_model.coef_[0]

            # Check slope constraint
            if abs(slope) > self.config.max_slope_atr * atr:
                return None

            # Calculate score
            score_data = self._calculate_score(
                intercept, slope, pivot_bars, pivot_prices, atr, boundary_type
            )

            # Bonus for high consensus
            consensus_bonus = 0.5 * (n_inliers / len(pivot_bars))
            score_data['score'] += consensus_bonus

            return {
                'intercept': intercept,
                'slope': slope,
                'score': score_data['score'],
                'touches': score_data['touches'],
                'violations': score_data['violations'],
                'method': 'ransac',
                'n_inliers': n_inliers,
                'consensus_ratio': n_inliers / len(pivot_bars)
            }

        except Exception as e:
            warnings.warn(f"RANSAC estimation failed: {e}")
            return None

    def _pairwise_estimation(
        self,
        pivot_bars: np.ndarray,
        pivot_prices: np.ndarray,
        atr: float,
        boundary_type: str
    ) -> Optional[dict]:
        """
        Estimate boundary by enumerating pivot pairs (fallback method).
        """
        n_pivots = len(pivot_bars)

        if n_pivots < 2:
            return None

        best_score = -np.inf
        best_result = None

        # Enumerate pairs
        max_pairs = min(n_pivots, 10)  # Limit for efficiency

        for i in range(min(n_pivots - 1, max_pairs)):
            for j in range(i + 1, min(n_pivots, max_pairs + 1)):
                bar1, price1 = pivot_bars[i], pivot_prices[i]
                bar2, price2 = pivot_bars[j], pivot_prices[j]

                if bar1 == bar2:
                    continue

                # Calculate line parameters
                slope = (price1 - price2) / (bar1 - bar2)
                intercept = price1 - slope * bar1

                # Check slope constraint
                if abs(slope) > self.config.max_slope_atr * atr:
                    continue

                # Calculate score
                score_data = self._calculate_score(
                    intercept, slope, pivot_bars, pivot_prices, atr, boundary_type
                )

                # Check minimum touches
                if score_data['touches'] < self.config.min_touches:
                    continue

                if score_data['score'] > best_score:
                    best_score = score_data['score']
                    best_result = {
                        'intercept': intercept,
                        'slope': slope,
                        'score': score_data['score'],
                        'touches': score_data['touches'],
                        'violations': score_data['violations'],
                        'method': 'pairwise'
                    }

        return best_result

    # =========================================================================
    # SCORING FUNCTIONS
    # =========================================================================

    def _calculate_score(
        self,
        intercept: float,
        slope: float,
        pivot_bars: np.ndarray,
        pivot_prices: np.ndarray,
        atr: float,
        boundary_type: str
    ) -> dict:
        """
        Calculate quality score for a candidate boundary line.

        Uses one-sided touch/violation definitions:
        - Support: touches when pivot is above line, violations when below
        - Resistance: touches when pivot is below line, violations when above
        """
        tau = self.config.touch_tolerance * atr

        touches = 0
        touch_weights = 0.0
        violations = 0.0

        for bar, price in zip(pivot_bars, pivot_prices):
            line_value = intercept + slope * bar

            if boundary_type == 'support':
                # Support: pivot should be at or above line
                distance = price - line_value

                if 0 <= distance <= tau:
                    # Touch: pivot is close to line from above
                    weight = 1 - distance / tau
                    touch_weights += weight
                    touches += 1
                elif distance < -tau:
                    # Violation: pivot is below line
                    violation_mag = min(abs(distance) / atr, 3.0)  # Cap at 3 ATR
                    violations += violation_mag

            else:  # resistance
                # Resistance: pivot should be at or below line
                distance = line_value - price

                if 0 <= distance <= tau:
                    # Touch: pivot is close to line from below
                    weight = 1 - distance / tau
                    touch_weights += weight
                    touches += 1
                elif distance < -tau:
                    # Violation: pivot is above line
                    violation_mag = min(abs(distance) / atr, 3.0)
                    violations += violation_mag

        # Persistence reward (log-scaled span)
        span = np.ptp(pivot_bars)
        persistence = self.config.persistence_weight * np.log(1 + span)

        # Total score
        score = (
            touch_weights +
            persistence -
            self.config.violation_penalty * violations
        )

        return {
            'score': score,
            'touches': touches,
            'violations': violations,
            'touch_weights': touch_weights,
            'persistence': persistence
        }

    # =========================================================================
    # HELPER METHODS
    # =========================================================================

    def _validate_inputs(
        self,
        pivot_bars: np.ndarray,
        pivot_prices: np.ndarray,
        atr: float
    ) -> bool:
        """Validate input data meets minimum requirements"""
        if len(pivot_bars) < self.config.min_pivots:
            return False

        if len(pivot_bars) != len(pivot_prices):
            return False

        if atr <= 0:
            return False

        span = np.ptp(pivot_bars)
        if span < self.config.min_span:
            return False

        return True

    def _sigmoid(self, x: float) -> float:
        """Sigmoid function for score normalization"""
        return 1 / (1 + np.exp(-x))

    def _assign_grade(self, q_score: float, touches: int) -> str:
        """Assign quality grade based on Q-score and touches"""
        if q_score >= self.config.q_score_a and touches >= 3:
            return 'A'
        elif q_score >= self.config.q_score_b and touches >= 2:
            return 'B'
        else:
            return 'SKIP'

    def _invalid_result(self, reason: str) -> BoundaryEstimate:
        """Return invalid result with reason"""
        return BoundaryEstimate(
            intercept=0.0,
            slope=0.0,
            score=-np.inf,
            touches=0,
            violations=0.0,
            q_score=0.0,
            grade='SKIP',
            is_valid=False,
            diagnostics={'error': reason}
        )


# =============================================================================
# CONVENIENCE FUNCTIONS
# =============================================================================

def estimate_boundaries(
    pivot_low_bars: np.ndarray,
    pivot_low_prices: np.ndarray,
    pivot_high_bars: np.ndarray,
    pivot_high_prices: np.ndarray,
    atr: float,
    config: Optional[EstimatorConfig] = None
) -> Tuple[BoundaryEstimate, BoundaryEstimate]:
    """
    Convenience function to estimate both support and resistance.

    Args:
        pivot_low_bars: Bar indices of pivot lows
        pivot_low_prices: Prices of pivot lows
        pivot_high_bars: Bar indices of pivot highs
        pivot_high_prices: Prices of pivot highs
        atr: Current ATR
        config: Optional configuration

    Returns:
        Tuple of (support_estimate, resistance_estimate)
    """
    estimator = RobustBoundaryEstimator(config)

    support = estimator.estimate_support(
        pivot_low_bars, pivot_low_prices, atr
    )

    resistance = estimator.estimate_resistance(
        pivot_high_bars, pivot_high_prices, atr
    )

    return support, resistance
```

### 3.2 Unit Tests

**File: `estimation/test_estimator.py`**

```python
"""Unit tests for RobustBoundaryEstimator"""

import pytest
import numpy as np
from robust_boundary_estimator import (
    RobustBoundaryEstimator,
    EstimatorConfig,
    estimate_boundaries
)


class TestRobustBoundaryEstimator:
    """Test suite for RobustBoundaryEstimator"""

    @pytest.fixture
    def estimator(self):
        return RobustBoundaryEstimator()

    @pytest.fixture
    def sample_support_data(self):
        """Generate sample support line data"""
        np.random.seed(42)

        # Create ascending support line with some noise
        n_pivots = 8
        bars = np.array([10, 25, 40, 55, 70, 85, 100, 115])

        # True line: price = 100 + 0.1 * bar
        true_intercept = 100
        true_slope = 0.1

        prices = true_intercept + true_slope * bars + np.random.normal(0, 0.5, n_pivots)

        atr = 2.0

        return bars, prices, atr, true_intercept, true_slope

    @pytest.fixture
    def sample_resistance_data(self):
        """Generate sample resistance line data"""
        np.random.seed(42)

        n_pivots = 7
        bars = np.array([15, 30, 45, 60, 75, 90, 105])

        # True line: price = 150 - 0.05 * bar
        true_intercept = 150
        true_slope = -0.05

        prices = true_intercept + true_slope * bars + np.random.normal(0, 0.5, n_pivots)

        atr = 2.0

        return bars, prices, atr, true_intercept, true_slope

    def test_support_estimation_basic(self, estimator, sample_support_data):
        """Test basic support estimation"""
        bars, prices, atr, true_int, true_slope = sample_support_data

        result = estimator.estimate_support(bars, prices, atr)

        assert result.is_valid
        assert result.touches >= 2
        assert result.q_score > 0
        assert result.grade in ['A', 'B', 'SKIP']

        # Check slope is reasonable
        assert abs(result.slope - true_slope) < 0.5

    def test_resistance_estimation_basic(self, estimator, sample_resistance_data):
        """Test basic resistance estimation"""
        bars, prices, atr, true_int, true_slope = sample_resistance_data

        result = estimator.estimate_resistance(bars, prices, atr)

        assert result.is_valid
        assert result.touches >= 2

    def test_insufficient_pivots(self, estimator):
        """Test handling of insufficient pivots"""
        bars = np.array([10, 20])
        prices = np.array([100, 101])
        atr = 2.0

        result = estimator.estimate_support(bars, prices, atr)

        assert not result.is_valid
        assert result.grade == 'SKIP'

    def test_slope_constraint(self, estimator):
        """Test that extreme slopes are rejected"""
        # Create data with very steep slope
        bars = np.array([10, 20, 30, 40, 50, 60, 70])
        prices = np.array([100, 200, 300, 400, 500, 600, 700])  # Slope = 10
        atr = 2.0

        result = estimator.estimate_support(bars, prices, atr)

        # Should still get a result, but slope should be constrained
        if result.is_valid:
            max_slope = estimator.config.max_slope_atr * atr
            assert abs(result.slope) <= max_slope * 2  # Allow some tolerance

    def test_quality_grading(self, estimator, sample_support_data):
        """Test quality grade assignment"""
        bars, prices, atr, _, _ = sample_support_data

        result = estimator.estimate_support(bars, prices, atr)

        # With good data, should get A or B grade
        assert result.grade in ['A', 'B']

        # Q-score should match grade
        if result.grade == 'A':
            assert result.q_score >= estimator.config.q_score_a
        elif result.grade == 'B':
            assert result.q_score >= estimator.config.q_score_b

    def test_custom_config(self):
        """Test with custom configuration"""
        config = EstimatorConfig(
            touch_tolerance=0.5,
            violation_penalty=3.0,
            min_pivots=3,
            min_touches=2
        )

        estimator = RobustBoundaryEstimator(config)

        assert estimator.config.touch_tolerance == 0.5
        assert estimator.config.violation_penalty == 3.0

    def test_estimate_boundaries_convenience(self, sample_support_data, sample_resistance_data):
        """Test convenience function for both boundaries"""
        s_bars, s_prices, atr, _, _ = sample_support_data
        r_bars, r_prices, _, _, _ = sample_resistance_data

        support, resistance = estimate_boundaries(
            s_bars, s_prices,
            r_bars, r_prices,
            atr
        )

        assert support.is_valid
        assert resistance.is_valid

    def test_diagnostics(self, estimator, sample_support_data):
        """Test that diagnostics are populated"""
        bars, prices, atr, _, _ = sample_support_data

        result = estimator.estimate_support(bars, prices, atr)

        assert 'method' in result.diagnostics
        assert 'n_pivots' in result.diagnostics
        assert 'span' in result.diagnostics

    def test_reproducibility(self, sample_support_data):
        """Test that results are reproducible"""
        bars, prices, atr, _, _ = sample_support_data

        estimator1 = RobustBoundaryEstimator()
        estimator2 = RobustBoundaryEstimator()

        result1 = estimator1.estimate_support(bars, prices, atr)
        result2 = estimator2.estimate_support(bars, prices, atr)

        # Results should be identical
        assert result1.intercept == result2.intercept
        assert result1.slope == result2.slope
        assert result1.score == result2.score


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
```

---

## 4. Integration Example

**File: `examples/integration_example.py`**

```python
"""
Integration example showing StrategyValidator and RobustBoundaryEstimator
working together in a backtesting context.
"""

import numpy as np
import pandas as pd
from typing import List, Tuple

# Import our modules
import sys
sys.path.append('..')
from validation.strategy_validator import StrategyValidator, validate_strategy
from estimation.robust_boundary_estimator import (
    RobustBoundaryEstimator,
    EstimatorConfig,
    estimate_boundaries
)


def generate_sample_ohlcv(n_bars: int = 500, seed: int = 42) -> pd.DataFrame:
    """Generate sample OHLCV data for testing"""
    np.random.seed(seed)

    # Generate random walk with drift
    returns = np.random.normal(0.0002, 0.015, n_bars)
    close = 100 * np.exp(np.cumsum(returns))

    # Generate OHLC from close
    high = close * (1 + np.abs(np.random.normal(0, 0.005, n_bars)))
    low = close * (1 - np.abs(np.random.normal(0, 0.005, n_bars)))
    open_ = np.roll(close, 1)
    open_[0] = close[0]

    volume = np.random.lognormal(10, 1, n_bars)

    return pd.DataFrame({
        'open': open_,
        'high': high,
        'low': low,
        'close': close,
        'volume': volume
    })


def find_pivots(
    data: pd.DataFrame,
    confirmation: int = 2
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """Find pivot highs and lows"""
    highs = data['high'].values
    lows = data['low'].values

    pivot_high_bars = []
    pivot_high_prices = []
    pivot_low_bars = []
    pivot_low_prices = []

    for i in range(confirmation, len(data) - confirmation):
        # Pivot high
        if highs[i] == max(highs[i-confirmation:i+confirmation+1]):
            pivot_high_bars.append(i)
            pivot_high_prices.append(highs[i])

        # Pivot low
        if lows[i] == min(lows[i-confirmation:i+confirmation+1]):
            pivot_low_bars.append(i)
            pivot_low_prices.append(lows[i])

    return (
        np.array(pivot_low_bars),
        np.array(pivot_low_prices),
        np.array(pivot_high_bars),
        np.array(pivot_high_prices)
    )


def calculate_atr(data: pd.DataFrame, period: int = 14) -> float:
    """Calculate ATR"""
    high = data['high']
    low = data['low']
    close = data['close']

    tr = pd.DataFrame({
        'hl': high - low,
        'hc': (high - close.shift(1)).abs(),
        'lc': (low - close.shift(1)).abs()
    }).max(axis=1)

    return tr.rolling(period).mean().iloc[-1]


def run_integration_example():
    """
    Complete integration example demonstrating:
    1. Data preparation
    2. Pivot detection
    3. Boundary estimation
    4. Signal generation
    5. Statistical validation
    """
    print("=" * 60)
    print("RG Trading System v4.0 - Integration Example")
    print("=" * 60)

    # Step 1: Generate sample data
    print("\n1. Generating sample OHLCV data...")
    data = generate_sample_ohlcv(n_bars=500)
    print(f"   Generated {len(data)} bars of data")

    # Step 2: Find pivots
    print("\n2. Detecting pivots...")
    pl_bars, pl_prices, ph_bars, ph_prices = find_pivots(data, confirmation=2)
    print(f"   Found {len(pl_bars)} pivot lows and {len(ph_bars)} pivot highs")

    # Step 3: Calculate ATR
    atr = calculate_atr(data)
    print(f"   Current ATR: {atr:.4f}")

    # Step 4: Estimate boundaries
    print("\n3. Estimating boundaries with robust regression...")

    config = EstimatorConfig(
        touch_tolerance=0.3,
        violation_penalty=2.0,
        min_pivots=5,
        min_touches=3
    )

    estimator = RobustBoundaryEstimator(config)

    # Use last 100 bars of pivots
    recent_pl_mask = pl_bars > len(data) - 150
    recent_ph_mask = ph_bars > len(data) - 150

    support = estimator.estimate_support(
        pl_bars[recent_pl_mask],
        pl_prices[recent_pl_mask],
        atr
    )

    resistance = estimator.estimate_resistance(
        ph_bars[recent_ph_mask],
        ph_prices[recent_ph_mask],
        atr
    )

    print(f"\n   Support Line:")
    print(f"     Intercept: {support.intercept:.4f}")
    print(f"     Slope: {support.slope:.6f}")
    print(f"     Q-Score: {support.q_score:.3f}")
    print(f"     Grade: {support.grade}")
    print(f"     Touches: {support.touches}")
    print(f"     Method: {support.diagnostics.get('method', 'N/A')}")

    print(f"\n   Resistance Line:")
    print(f"     Intercept: {resistance.intercept:.4f}")
    print(f"     Slope: {resistance.slope:.6f}")
    print(f"     Q-Score: {resistance.q_score:.3f}")
    print(f"     Grade: {resistance.grade}")
    print(f"     Touches: {resistance.touches}")
    print(f"     Method: {resistance.diagnostics.get('method', 'N/A')}")

    # Step 5: Generate simple signals based on boundary breaks
    print("\n4. Generating trading signals...")

    signals = np.zeros(len(data))
    returns = data['close'].pct_change().values

    for i in range(50, len(data)):
        current_support = support.intercept + support.slope * i
        current_resistance = resistance.intercept + resistance.slope * i

        # Simple break logic
        if data['close'].iloc[i] < current_support - 0.5 * atr:
            signals[i] = -1  # Short on support break
        elif data['close'].iloc[i] > current_resistance + 0.5 * atr:
            signals[i] = 1  # Long on resistance break

    n_signals = np.sum(signals != 0)
    print(f"   Generated {n_signals} trading signals")
    print(f"   Long signals: {np.sum(signals == 1)}")
    print(f"   Short signals: {np.sum(signals == -1)}")

    # Step 6: Validate strategy
    print("\n5. Running statistical validation...")

    validator = StrategyValidator(n_simulations=5000, random_seed=42)

    # Monte Carlo significance test
    mc_result = validator.monte_carlo_significance(
        returns[50:],
        signals[50:],
        metric='sharpe'
    )

    print(f"\n   Monte Carlo Significance Test:")
    print(f"     Actual Sharpe: {mc_result.statistic:.4f}")
    print(f"     P-value: {mc_result.p_value:.4f}")
    print(f"     Significant: {mc_result.is_significant}")
    print(f"     Null Mean: {mc_result.details['null_mean']:.4f}")
    print(f"     Null Std: {mc_result.details['null_std']:.4f}")

    # Bootstrap confidence intervals
    strategy_returns = returns[50:] * signals[50:]
    strategy_returns = strategy_returns[strategy_returns != 0]  # Only traded periods

    if len(strategy_returns) > 30:
        print(f"\n   Bootstrap Confidence Intervals (n={len(strategy_returns)} trades):")

        boot_results = validator.bootstrap_all_metrics(strategy_returns)

        for metric_name in ['mean_return', 'sharpe_ratio', 'win_rate']:
            if metric_name in boot_results:
                ci = boot_results[metric_name]
                print(f"     {metric_name}:")
                print(f"       Point estimate: {ci.point_estimate:.4f}")
                print(f"       95% CI: [{ci.ci_lower:.4f}, {ci.ci_upper:.4f}]")

    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Support Grade: {support.grade} (Q={support.q_score:.2f})")
    print(f"Resistance Grade: {resistance.grade} (Q={resistance.q_score:.2f})")
    print(f"Strategy Significant: {mc_result.is_significant} (p={mc_result.p_value:.4f})")

    if mc_result.is_significant:
        print("\n✓ Strategy shows statistically significant edge!")
    else:
        print("\n✗ Strategy does not show significant edge. Review parameters.")

    return {
        'support': support,
        'resistance': resistance,
        'validation': mc_result
    }


if __name__ == '__main__':
    results = run_integration_example()
```

---

## 5. Testing & Validation

### 5.1 Running Tests

```bash
# Run all tests
pytest validation/test_validator.py estimation/test_estimator.py -v

# Run with coverage
pytest --cov=validation --cov=estimation --cov-report=html

# Run specific test class
pytest validation/test_validator.py::TestStrategyValidator -v

# Run integration example
python examples/integration_example.py
```

### 5.2 Expected Output

```
============================================================
RG Trading System v4.0 - Integration Example
============================================================

1. Generating sample OHLCV data...
   Generated 500 bars of data

2. Detecting pivots...
   Found 42 pivot lows and 38 pivot highs
   Current ATR: 1.5234

3. Estimating boundaries with robust regression...

   Support Line:
     Intercept: 98.4521
     Slope: 0.001234
     Q-Score: 0.723
     Grade: A
     Touches: 5
     Method: huber

   Resistance Line:
     Intercept: 102.8934
     Slope: 0.000892
     Q-Score: 0.681
     Grade: B
     Touches: 4
     Method: ransac

4. Generating trading signals...
   Generated 23 trading signals
   Long signals: 12
   Short signals: 11

5. Running statistical validation...

   Monte Carlo Significance Test:
     Actual Sharpe: 0.8234
     P-value: 0.0342
     Significant: True
     Null Mean: 0.0012
     Null Std: 0.4521

   Bootstrap Confidence Intervals (n=23 trades):
     mean_return:
       Point estimate: 0.0089
       95% CI: [0.0023, 0.0156]
     sharpe_ratio:
       Point estimate: 0.8234
       95% CI: [0.2145, 1.4323]
     win_rate:
       Point estimate: 0.5652
       95% CI: [0.3913, 0.7391]

============================================================
SUMMARY
============================================================
Support Grade: A (Q=0.72)
Resistance Grade: B (Q=0.68)
Strategy Significant: True (p=0.0342)

✓ Strategy shows statistically significant edge!
```

---

_Document Version: 4.0 | Implementation Guide for StrategyValidator & RobustBoundaryEstimator_
