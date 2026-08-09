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
