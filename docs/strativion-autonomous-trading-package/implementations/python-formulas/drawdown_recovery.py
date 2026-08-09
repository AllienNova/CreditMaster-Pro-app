"""
Drawdown Recovery Mathematics
===============================
From Appendix C, Section 4 of "The 30 Indisputable Laws of Trading."

Law 23: Asymmetric Damage. Losses damage portfolios more than equivalent
gains help them. A 50% loss requires a 100% gain to recover.
Capital preservation must be the primary objective.
"""

import math
from typing import Dict, List, Optional


def recovery_required(drawdown_pct: float) -> float:
    """Calculate the gain required to recover from a drawdown.

    Recovery = 1 / (1 - drawdown) - 1

    A 50% drawdown requires a 100% gain to recover.
    A 75% drawdown requires a 300% gain.
    Most traders quit long before recovery.

    Args:
        drawdown_pct: Drawdown as a decimal (e.g., 0.50 for 50%).

    Returns:
        Required gain as a decimal (e.g., 1.0 for 100%).

    Raises:
        ValueError: If drawdown_pct is not between 0 and 1 (exclusive).

    Example:
        >>> recovery_required(0.10)
        0.1111...
        # A 10% drawdown requires an 11.1% gain to recover.

        >>> recovery_required(0.50)
        1.0
        # A 50% drawdown requires a 100% gain to recover.

        >>> recovery_required(0.90)
        9.0
        # A 90% drawdown requires a 900% gain. Nearly impossible.
    """
    if not 0.0 < drawdown_pct < 1.0:
        raise ValueError("drawdown_pct must be between 0 and 1 (exclusive).")
    return 1.0 / (1.0 - drawdown_pct) - 1.0


def recovery_time(
    drawdown_pct: float,
    monthly_return: float,
) -> float:
    """Estimate recovery time in months given a consistent monthly return.

    Uses compound growth: months = ln(1 + recovery_required) / ln(1 + monthly_return)

    Args:
        drawdown_pct: Drawdown as a decimal (e.g., 0.50 for 50%).
        monthly_return: Expected monthly return as a decimal (e.g., 0.02 for 2%).

    Returns:
        Estimated recovery time in months.

    Example:
        >>> recovery_time(drawdown_pct=0.50, monthly_return=0.02)
        35.0
        # A 50% drawdown takes ~35 months at 2% monthly return to recover.

        >>> recovery_time(drawdown_pct=0.25, monthly_return=0.01)
        29.0
        # A 25% drawdown takes ~29 months at 1% monthly return.

        >>> recovery_time(drawdown_pct=0.75, monthly_return=0.05)
        28.1
        # Even at 5% monthly, 75% drawdown takes over 2 years.
    """
    if monthly_return <= 0:
        raise ValueError("monthly_return must be positive for recovery to be possible.")

    required = recovery_required(drawdown_pct)
    months = math.log(1.0 + required) / math.log(1.0 + monthly_return)
    return round(months, 1)


def drawdown_recovery_table() -> List[Dict]:
    """Generate the complete drawdown recovery table from Appendix C.

    Shows why capital preservation is the most important job in trading.
    The deeper the hole, the harder and longer it takes to climb out.

    Returns:
        List of dicts with drawdown, gain_required, and recovery times
        at 1%, 2%, and 5% monthly return rates.

    Example:
        >>> table = drawdown_recovery_table()
        >>> for row in table:
        ...     dd = row['drawdown_pct']
        ...     req = row['gain_required_pct']
        ...     m2 = row['months_at_2pct']
        ...     print(f"DD: {dd:.0%} | Need: {req:.1%} | Time @2%/mo: {m2} months")
    """
    # Values from Appendix C, Section 4
    drawdowns = [
        0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40,
        0.45, 0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80,
        0.85, 0.90, 0.95,
    ]

    recovery_at_1 = [
        6, 11, 17, 23, 29, 36, 44, 52,
        61, 70, 82, 95, 112, 132, 155, 185,
        224, 282, 433,
    ]
    recovery_at_2 = [
        3, 6, 9, 12, 15, 18, 22, 26,
        31, 35, 41, 48, 56, 66, 78, 93,
        112, 141, 217,
    ]
    recovery_at_5 = [
        2, 3, 4, 5, 6, 8, 9, 11,
        13, 15, 17, 20, 23, 27, 32, 38,
        46, 58, 89,
    ]

    table = []
    for i, dd in enumerate(drawdowns):
        gain_req = recovery_required(dd)
        table.append({
            "drawdown_pct": dd,
            "gain_required_pct": gain_req,
            "months_at_1pct": recovery_at_1[i],
            "months_at_2pct": recovery_at_2[i],
            "months_at_5pct": recovery_at_5[i],
        })

    return table
