"""
Expectancy and Performance Metrics
====================================
From Appendix C, Section 3 of "The 30 Indisputable Laws of Trading."

Law 16: A trading system's value is determined by expectancy.
A 30% win rate system can be highly profitable with large enough R-multiples.
"""

import math
from typing import List, Optional


def calculate_expectancy(
    wins: int,
    losses: int,
    avg_win: float,
    avg_loss: float,
) -> float:
    """Calculate the expectancy of a trading system.

    Expectancy = (Win% x Avg Win) - (Loss% x Avg Loss)

    A positive expectancy means the system makes money over time.
    A negative expectancy means the system loses money over time.

    Args:
        wins: Number of winning trades.
        losses: Number of losing trades.
        avg_win: Average dollar profit on winning trades.
        avg_loss: Average dollar loss on losing trades (positive number).

    Returns:
        Expected dollar profit per trade.

    Raises:
        ValueError: If wins + losses == 0 or if avg_loss is negative.

    Example:
        >>> calculate_expectancy(wins=45, losses=55, avg_win=800, avg_loss=400)
        140.0
        # This system makes $140 per trade on average despite losing
        # more often than it wins.
    """
    total = wins + losses
    if total == 0:
        raise ValueError("Total trades (wins + losses) must be greater than 0.")
    if avg_loss < 0:
        raise ValueError("avg_loss should be a positive number representing the magnitude of loss.")

    win_rate = wins / total
    loss_rate = losses / total
    return (win_rate * avg_win) - (loss_rate * avg_loss)


def expectancy_per_dollar_risked(
    win_rate: float,
    avg_r_multiple: float,
) -> float:
    """Calculate expectancy per dollar risked (E/R).

    E/R = (Win% x Avg R-multiple on wins) - (Loss% x 1.0)

    Args:
        win_rate: Probability of winning (0.0 to 1.0).
        avg_r_multiple: Average R-multiple on winning trades.

    Returns:
        Expected R-multiple per trade.

    Example:
        >>> expectancy_per_dollar_risked(win_rate=0.40, avg_r_multiple=3.2)
        0.68
        # For every dollar risked, this system returns $0.68 on average.
    """
    if not 0.0 <= win_rate <= 1.0:
        raise ValueError("win_rate must be between 0.0 and 1.0.")
    loss_rate = 1.0 - win_rate
    return (win_rate * avg_r_multiple) - (loss_rate * 1.0)


def profit_factor(
    gross_profits: float,
    gross_losses: float,
) -> float:
    """Calculate the profit factor.

    PF = Gross Profits / Gross Losses

    Interpretation:
        PF < 1.0:  Losing system
        PF 1.0-1.5: Marginal (transaction costs may kill it)
        PF 1.5-2.0: Good
        PF 2.0-3.0: Excellent
        PF > 3.0:  Exceptional (or sample size too small)

    Args:
        gross_profits: Total dollar amount of all winning trades.
        gross_losses: Total dollar amount of all losing trades (positive number).

    Returns:
        Profit factor ratio.

    Example:
        >>> profit_factor(gross_profits=36000, gross_losses=22000)
        1.636...
    """
    if gross_losses <= 0:
        raise ValueError("gross_losses must be positive.")
    return gross_profits / gross_losses


def sharpe_ratio(
    returns: List[float],
    risk_free_rate: float = 0.0,
    annualize: bool = True,
    periods_per_year: int = 252,
) -> float:
    """Calculate the Sharpe ratio.

    S = (Mean Return - Risk-Free Rate) / Std Dev of Returns
    Annualized: S_annual = S_period x sqrt(periods_per_year)

    Interpretation:
        S < 0.5:  Poor
        S 0.5-1.0: Acceptable
        S 1.0-2.0: Good
        S > 2.0:  Excellent
        S > 3.0:  Either exceptional or something is wrong with the data

    Args:
        returns: List of periodic returns (e.g., daily returns as decimals).
        risk_free_rate: Risk-free rate per period (default 0.0).
        annualize: Whether to annualize the ratio (default True).
        periods_per_year: Number of periods per year (252 for daily, 12 for monthly).

    Returns:
        Sharpe ratio (annualized if annualize=True).

    Example:
        >>> import random; random.seed(42)
        >>> daily_returns = [random.gauss(0.0004, 0.01) for _ in range(252)]
        >>> sharpe_ratio(daily_returns, risk_free_rate=0.0)
        # Returns annualized Sharpe
    """
    if len(returns) < 2:
        raise ValueError("Need at least 2 return observations.")

    n = len(returns)
    mean_return = sum(returns) / n
    excess_return = mean_return - risk_free_rate
    variance = sum((r - mean_return) ** 2 for r in returns) / (n - 1)
    std_dev = math.sqrt(variance)

    if std_dev == 0:
        return float('inf') if excess_return > 0 else 0.0

    ratio = excess_return / std_dev
    if annualize:
        ratio *= math.sqrt(periods_per_year)
    return ratio


def sortino_ratio(
    returns: List[float],
    risk_free_rate: float = 0.0,
    annualize: bool = True,
    periods_per_year: int = 252,
) -> float:
    """Calculate the Sortino ratio.

    Sortino = (Mean Return - Risk-Free Rate) / Downside Deviation

    Superior to Sharpe for asymmetric return distributions (most trading strategies).
    Uses only negative returns in deviation calculation.

    Args:
        returns: List of periodic returns.
        risk_free_rate: Risk-free rate per period.
        annualize: Whether to annualize.
        periods_per_year: Periods per year.

    Returns:
        Sortino ratio.

    Example:
        >>> returns = [0.02, -0.01, 0.03, -0.005, 0.015, -0.02, 0.01]
        >>> sortino_ratio(returns, annualize=False)
        # Returns non-annualized Sortino
    """
    if len(returns) < 2:
        raise ValueError("Need at least 2 return observations.")

    n = len(returns)
    mean_return = sum(returns) / n
    excess_return = mean_return - risk_free_rate

    # Downside deviation: only negative returns
    negative_returns = [r for r in returns if r < risk_free_rate]
    if not negative_returns:
        return float('inf') if excess_return > 0 else 0.0

    downside_variance = sum((r - risk_free_rate) ** 2 for r in negative_returns) / len(negative_returns)
    downside_dev = math.sqrt(downside_variance)

    if downside_dev == 0:
        return float('inf') if excess_return > 0 else 0.0

    ratio = excess_return / downside_dev
    if annualize:
        ratio *= math.sqrt(periods_per_year)
    return ratio


def calmar_ratio(
    annualized_return: float,
    maximum_drawdown: float,
) -> float:
    """Calculate the Calmar ratio.

    Calmar = Annualized Return / Maximum Drawdown

    Calculated over a rolling 36-month window.

    Interpretation:
        Calmar < 0.5:  Painful equity curve
        Calmar 0.5-1.0: Acceptable
        Calmar 1.0-2.0: Good
        Calmar > 2.0:  Excellent
        Calmar > 3.0:  Exceptional (or track record too short)

    Args:
        annualized_return: Annualized return as a decimal (e.g., 0.15 for 15%).
        maximum_drawdown: Maximum drawdown as a positive decimal (e.g., 0.20 for 20%).

    Returns:
        Calmar ratio.

    Example:
        >>> calmar_ratio(annualized_return=0.25, maximum_drawdown=0.15)
        1.666...
    """
    if maximum_drawdown <= 0:
        raise ValueError("maximum_drawdown must be positive.")
    return annualized_return / maximum_drawdown


def max_drawdown(equity_curve: List[float]) -> float:
    """Calculate maximum drawdown from an equity curve.

    MDD = (Peak - Trough) / Peak

    Args:
        equity_curve: List of equity values over time.

    Returns:
        Maximum drawdown as a positive decimal.

    Example:
        >>> max_drawdown([100000, 110000, 125000, 95000, 105000])
        0.24
        # Peak was $125,000, trough was $95,000. MDD = 24%.
    """
    if len(equity_curve) < 2:
        raise ValueError("Need at least 2 equity values.")

    peak = equity_curve[0]
    mdd = 0.0

    for value in equity_curve:
        if value > peak:
            peak = value
        dd = (peak - value) / peak
        if dd > mdd:
            mdd = dd

    return mdd
