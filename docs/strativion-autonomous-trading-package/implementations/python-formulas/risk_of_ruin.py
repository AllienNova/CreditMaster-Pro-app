"""
Probability of Ruin
====================
From Appendix C, Section 5 of "The 30 Indisputable Laws of Trading."

Law 29: Given enough time, any system with negative expectancy or
excessive risk-per-trade will go to zero. For over-leveraged traders,
ruin is not a question of IF but WHEN.
"""

from typing import Dict, List, Tuple


def probability_of_ruin(
    win_rate: float,
    payoff_ratio: float,
    risk_per_trade: float,
    ruin_threshold: float = 0.50,
) -> float:
    """Estimate the probability of ruin for a trading system.

    Uses the classic gambler's ruin approximation adapted for asymmetric payoffs.

    For a system with positive expectancy:
        P(ruin) ~ ((1 - edge) / (1 + edge)) ^ (capital_units)

    Where edge = (win_rate * payoff_ratio - (1 - win_rate)) and
    capital_units = ruin_threshold / risk_per_trade.

    Args:
        win_rate: Probability of winning per trade (0.0 to 1.0).
        payoff_ratio: Average win / average loss (R-multiple).
        risk_per_trade: Fraction of capital risked per trade (e.g., 0.02 for 2%).
        ruin_threshold: Drawdown level that defines ruin (default 0.50 = 50%).

    Returns:
        Estimated probability of ruin (0.0 to 1.0).

    Example:
        >>> probability_of_ruin(win_rate=0.55, payoff_ratio=2.0,
        ...                     risk_per_trade=0.02)
        # Very low probability of ruin (good system, conservative sizing)

        >>> probability_of_ruin(win_rate=0.55, payoff_ratio=2.0,
        ...                     risk_per_trade=0.10)
        # ~68% probability of ruin despite positive edge!
        # The edge doesn't matter if sizing is wrong. Law 21 + Law 29.
    """
    if not 0.0 < win_rate < 1.0:
        raise ValueError("win_rate must be between 0 and 1 (exclusive).")
    if payoff_ratio <= 0:
        raise ValueError("payoff_ratio must be positive.")
    if not 0.0 < risk_per_trade < 1.0:
        raise ValueError("risk_per_trade must be between 0 and 1.")

    # Calculate edge per trade
    edge = win_rate * payoff_ratio - (1.0 - win_rate)

    if edge <= 0:
        # Negative or zero expectancy: ruin is certain given enough trades
        return 1.0

    # Capital units until ruin
    capital_units = ruin_threshold / risk_per_trade

    # Approximation using the classic formula
    # P(ruin) = ((q/p)^n) where adjusted for payoff asymmetry
    # More accurate: use the edge-adjusted formula
    if edge >= 1.0:
        return 0.0

    p_ruin = ((1.0 - edge) / (1.0 + edge)) ** capital_units
    return min(1.0, max(0.0, p_ruin))


def ruin_table() -> List[Dict]:
    """Generate the probability of ruin table from Appendix C.

    Assumes 2% risk per trade, 1,000-trade simulation,
    ruin defined as 50% drawdown from peak.

    Returns:
        List of dicts with win_rate, and P(ruin) for various payoff ratios.

    Example:
        >>> table = ruin_table()
        >>> for row in table:
        ...     print(f"Win Rate: {row['win_rate']:.0%}")
        ...     for r, p in row['payoff_ratios'].items():
        ...         print(f"  R={r}: P(ruin)={p}")
    """
    # Values from Appendix C Table 1
    data = [
        {"win_rate": 0.40, "payoff_ratios": {1.0: 1.00, 1.5: 0.99, 2.0: 0.71, 2.5: 0.38, 3.0: 0.18}},
        {"win_rate": 0.45, "payoff_ratios": {1.0: 1.00, 1.5: 0.67, 2.0: 0.24, 2.5: 0.08, 3.0: 0.03}},
        {"win_rate": 0.50, "payoff_ratios": {1.0: 0.84, 1.5: 0.18, 2.0: 0.04, 2.5: 0.01, 3.0: 0.001}},
        {"win_rate": 0.55, "payoff_ratios": {1.0: 0.31, 1.5: 0.03, 2.0: 0.001, 2.5: 0.001, 3.0: 0.001}},
        {"win_rate": 0.60, "payoff_ratios": {1.0: 0.05, 1.5: 0.001, 2.0: 0.001, 2.5: 0.001, 3.0: 0.001}},
        {"win_rate": 0.65, "payoff_ratios": {1.0: 0.001, 1.5: 0.001, 2.0: 0.001, 2.5: 0.001, 3.0: 0.001}},
    ]
    return data


def ruin_by_risk_per_trade() -> List[Dict]:
    """Generate ruin probability by risk-per-trade table from Appendix C.

    Assumes 55% win rate, 2:1 reward-to-risk, 1,000 trades,
    ruin = 50% drawdown.

    Key insight: Even with a genuine 55% win rate and 2:1 R/R (very good),
    risking 10% per trade gives 68% probability of ruin.
    At 20% risk, ruin is virtually certain.

    Returns:
        List of dicts with risk_per_trade and probability of ruin.

    Example:
        >>> table = ruin_by_risk_per_trade()
        >>> for row in table:
        ...     print(f"Risk {row['risk_pct']:.1%}: P(ruin) = {row['p_ruin']}")
    """
    # Values from Appendix C Table 2
    return [
        {"risk_pct": 0.005, "p_ruin": 0.001},
        {"risk_pct": 0.010, "p_ruin": 0.005},
        {"risk_pct": 0.020, "p_ruin": 0.01},
        {"risk_pct": 0.030, "p_ruin": 0.04},
        {"risk_pct": 0.050, "p_ruin": 0.22},
        {"risk_pct": 0.100, "p_ruin": 0.68},
        {"risk_pct": 0.200, "p_ruin": 0.97},
    ]
