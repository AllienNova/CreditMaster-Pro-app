"""
Strativion Trading Formulas
============================
Mathematical formulas from "The 30 Indisputable Laws of Trading"
by Kimal Honour Djam.

Source: Appendix C - Mathematical Formulas Quick Reference

Modules:
    expectancy       - Expectancy, profit factor, Sharpe, Sortino, Calmar ratios
    position_sizing  - Kelly criterion, fractional Kelly, ATR-based sizing, correlation adjustment
    risk_of_ruin     - Probability of ruin calculations and reference tables
    drawdown_recovery - Recovery math and time estimates
    regime_detector  - Market regime detection from ADX, VIX, ATR
    statistical_significance - Sample size, z-score, significance testing
"""

try:
    from .expectancy import (
        calculate_expectancy,
        expectancy_per_dollar_risked,
        profit_factor,
        sharpe_ratio,
        sortino_ratio,
        calmar_ratio,
        max_drawdown,
    )
    from .position_sizing import (
        kelly_criterion,
        fractional_kelly,
        atr_based_size,
        fixed_fractional_size,
        correlation_adjusted_positions,
        account_heat,
    )
    from .risk_of_ruin import (
        probability_of_ruin,
        ruin_table,
        ruin_by_risk_per_trade,
    )
    from .drawdown_recovery import (
        recovery_required,
        recovery_time,
        drawdown_recovery_table,
    )
    from .regime_detector import (
        MarketRegime,
        detect_regime,
        regime_position_adjustment,
    )
    from .statistical_significance import (
        min_sample_size,
        z_score,
        is_significant,
        z_score_for_confidence,
    )
except ImportError:  # absolute fallback when directory is on sys.path directly
    from expectancy import (                    # type: ignore
        calculate_expectancy,
        expectancy_per_dollar_risked,
        profit_factor,
        sharpe_ratio,
        sortino_ratio,
        calmar_ratio,
        max_drawdown,
    )
    from position_sizing import (               # type: ignore
        kelly_criterion,
        fractional_kelly,
        atr_based_size,
        fixed_fractional_size,
        correlation_adjusted_positions,
        account_heat,
    )
    from risk_of_ruin import (                  # type: ignore
        probability_of_ruin,
        ruin_table,
        ruin_by_risk_per_trade,
    )
    from drawdown_recovery import (             # type: ignore
        recovery_required,
        recovery_time,
        drawdown_recovery_table,
    )
    from regime_detector import (               # type: ignore
        MarketRegime,
        detect_regime,
        regime_position_adjustment,
    )
    from statistical_significance import (      # type: ignore
        min_sample_size,
        z_score,
        is_significant,
        z_score_for_confidence,
    )

__version__ = "2.5.0rc1"
__author__ = "Kimal Honour Djam"
__source__ = "The 30 Indisputable Laws of Trading - Appendix C"
