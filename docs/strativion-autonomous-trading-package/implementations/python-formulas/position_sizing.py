"""
Position Sizing Formulas
=========================
From Appendix C, Section 2 of "The 30 Indisputable Laws of Trading."

Law 21: Position sizing determines survival more than entry timing.
The optimal bet size is a function of edge size AND uncertainty about that edge.
"""

import math
from typing import List, Tuple, Optional


def kelly_criterion(
    win_rate: float,
    avg_win: float,
    avg_loss: float,
) -> float:
    """Calculate the Kelly Criterion optimal fraction of capital to risk.

    f* = (b*p - q) / b

    Where:
        b = reward-to-risk ratio (avg_win / avg_loss)
        p = probability of winning (win_rate)
        q = probability of losing (1 - win_rate)

    WARNING: Full Kelly is almost always too aggressive for real trading.
    Use fractional_kelly() instead.

    Args:
        win_rate: Probability of winning (0.0 to 1.0).
        avg_win: Average dollar profit on winning trades.
        avg_loss: Average dollar loss on losing trades (positive number).

    Returns:
        Optimal fraction of capital to risk per trade (0.0 to 1.0).
        Returns 0.0 if the edge is negative.

    Example:
        >>> kelly_criterion(win_rate=0.55, avg_win=2.0, avg_loss=1.0)
        0.325
        # Full Kelly says risk 32.5% per trade. This is too aggressive.
        # Use fractional_kelly with fraction=0.25 for quarter-Kelly.
    """
    if not 0.0 <= win_rate <= 1.0:
        raise ValueError("win_rate must be between 0.0 and 1.0.")
    if avg_loss <= 0:
        raise ValueError("avg_loss must be positive.")

    b = avg_win / avg_loss  # reward-to-risk ratio
    p = win_rate
    q = 1.0 - win_rate

    f_star = (b * p - q) / b
    return max(0.0, f_star)


def fractional_kelly(
    win_rate: float,
    avg_win: float,
    avg_loss: float,
    fraction: float = 0.25,
) -> float:
    """Calculate fractional Kelly position size.

    f = f* x fraction

    Most professionals use quarter-Kelly (0.25) or half-Kelly (0.50).
    Quarter-Kelly sacrifices ~44% of growth rate but reduces volatility by 75%.

    Args:
        win_rate: Probability of winning (0.0 to 1.0).
        avg_win: Average dollar profit on wins.
        avg_loss: Average dollar loss on losses (positive number).
        fraction: Kelly fraction (default 0.25 for quarter-Kelly).
            0.25 = quarter-Kelly (conservative, recommended)
            0.50 = half-Kelly (moderate)
            1.00 = full Kelly (aggressive, not recommended)

    Returns:
        Fraction of capital to risk per trade.

    Example:
        >>> fractional_kelly(win_rate=0.55, avg_win=2.0, avg_loss=1.0, fraction=0.25)
        0.08125
        # Quarter-Kelly: risk 8.13% per trade.
        >>> fractional_kelly(win_rate=0.55, avg_win=2.0, avg_loss=1.0, fraction=0.50)
        0.1625
        # Half-Kelly: risk 16.25% per trade.
    """
    if not 0.0 < fraction <= 1.0:
        raise ValueError("fraction must be between 0 (exclusive) and 1.0 (inclusive).")
    full_kelly = kelly_criterion(win_rate, avg_win, avg_loss)
    return full_kelly * fraction


def atr_based_size(
    account: float,
    risk_pct: float,
    atr: float,
    multiplier: float = 2.0,
    point_value: float = 1.0,
) -> float:
    """Calculate position size using ATR-based method.

    Position Size = Account Risk / (ATR x Multiplier x Point Value)

    This is the primary position sizing method recommended throughout the book.

    Args:
        account: Total account equity in dollars.
        risk_pct: Risk per trade as decimal (e.g., 0.01 for 1%).
        atr: 14-period Average True Range of the instrument.
        multiplier: Stop distance in ATR units (typically 1.5 to 3.0).
        point_value: Dollar value per point of the instrument.
            Stocks: 1.0 (default)
            ES futures: 50.0
            MES futures: 5.0
            NQ futures: 20.0
            CL crude oil: 1000.0
            GC gold: 100.0
            Forex standard lot: 10.0 per pip

    Returns:
        Number of shares/contracts to trade (not rounded).
        Round DOWN to nearest whole number before trading.

    Example:
        >>> # Stock: AAPL with $100K account
        >>> atr_based_size(account=100000, risk_pct=0.01, atr=3.50,
        ...               multiplier=2.0, point_value=1.0)
        142.857...
        # Trade 142 shares of AAPL

        >>> # ES Futures with $100K account
        >>> atr_based_size(account=100000, risk_pct=0.01, atr=45,
        ...               multiplier=2.0, point_value=50.0)
        0.222...
        # Cannot afford 1 ES contract at this risk level.
        # Use MES (point_value=5.0) instead: result = 2.22 -> trade 2 MES.
    """
    if account <= 0:
        raise ValueError("account must be positive.")
    if not 0.0 < risk_pct <= 1.0:
        raise ValueError("risk_pct must be between 0 and 1.")
    if atr <= 0 or multiplier <= 0 or point_value <= 0:
        raise ValueError("atr, multiplier, and point_value must be positive.")

    account_risk = account * risk_pct
    stop_distance_dollars = atr * multiplier * point_value
    return account_risk / stop_distance_dollars


def fixed_fractional_size(
    account: float,
    risk_pct: float,
    entry_price: float,
    stop_price: float,
) -> float:
    """Calculate position size using fixed fractional method.

    Position Size = (Account x Risk%) / (Entry Price - Stop Price)

    The position size is determined by stop distance, not by a fixed dollar amount.
    Wider stops = fewer shares. Tighter stops = more shares.

    Args:
        account: Total account equity.
        risk_pct: Risk per trade as decimal.
        entry_price: Planned entry price.
        stop_price: Planned stop-loss price.

    Returns:
        Number of shares to trade (not rounded).

    Example:
        >>> fixed_fractional_size(account=50000, risk_pct=0.02,
        ...                       entry_price=150.0, stop_price=142.0)
        125.0
        # Trade 125 shares. Position value: $18,750 (37.5% of account).
    """
    risk_per_share = abs(entry_price - stop_price)
    if risk_per_share == 0:
        raise ValueError("Entry and stop price cannot be equal.")

    dollar_risk = account * risk_pct
    return dollar_risk / risk_per_share


def correlation_adjusted_positions(
    num_positions: int,
    avg_correlation: float,
) -> float:
    """Calculate effective number of independent positions after correlation adjustment.

    Effective Positions = N / (1 + (N - 1) x Avg Correlation)

    This reveals how diversified your portfolio actually is.
    Six positions with 0.40 correlation behave like two independent bets.

    Args:
        num_positions: Number of open positions.
        avg_correlation: Average pairwise correlation between positions (0.0 to 1.0).

    Returns:
        Effective number of independent positions.

    Example:
        >>> correlation_adjusted_positions(num_positions=6, avg_correlation=0.40)
        2.0
        # Six positions at 0.40 correlation = only 2 independent bets.
        # You are far less diversified than you think.

        >>> correlation_adjusted_positions(num_positions=5, avg_correlation=0.85)
        1.19...
        # Five tech stocks at 0.85 correlation = basically one bet.
    """
    if num_positions < 1:
        raise ValueError("num_positions must be at least 1.")
    if not 0.0 <= avg_correlation <= 1.0:
        raise ValueError("avg_correlation must be between 0.0 and 1.0.")

    denominator = 1.0 + (num_positions - 1) * avg_correlation
    return num_positions / denominator


def account_heat(
    position_risks: List[float],
    max_heat: float = 0.06,
) -> Tuple[float, float]:
    """Calculate total account heat and remaining capacity.

    Total Heat = Sum of risk% for all open positions.
    Maximum recommended heat: 6% of account equity.

    Args:
        position_risks: List of risk percentages for each open position
            (e.g., [0.015, 0.02, 0.01] for 1.5%, 2%, 1%).
        max_heat: Maximum allowed total heat (default 0.06 = 6%).

    Returns:
        Tuple of (current_heat, remaining_capacity).

    Example:
        >>> account_heat([0.015, 0.020, 0.010])
        (0.045, 0.015)
        # Current heat: 4.5%. Can add one more position risking up to 1.5%.
    """
    current = sum(position_risks)
    remaining = max(0.0, max_heat - current)
    return (current, remaining)
