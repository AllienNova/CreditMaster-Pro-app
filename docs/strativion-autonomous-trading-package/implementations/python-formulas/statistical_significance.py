"""
Statistical Significance Testing
==================================
From Appendix C, Section 8 of "The 30 Indisputable Laws of Trading."

Law 17: A trading edge must be tested over a sufficient sample size
to distinguish skill from luck. Minimum sample sizes depend on win rate,
payoff ratio, and desired confidence level.

If you have fewer than 300 trades in your track record, you do not know
whether your system works or whether you have been lucky.
"""

import math
from typing import Dict, List


# Z-score lookup table for common confidence levels
_Z_SCORES = {
    0.90: 1.645,
    0.95: 1.960,
    0.99: 2.576,
    0.999: 3.291,
}


def z_score_for_confidence(confidence: float) -> float:
    """Get the z-score for a given confidence level.

    Common confidence levels:
        90%  -> z = 1.645  (1 in 10 chance result is random)
        95%  -> z = 1.960  (1 in 20 chance, minimum for trading)
        99%  -> z = 2.576  (1 in 100 chance)
        99.9% -> z = 3.291 (1 in 1,000 chance)

    Args:
        confidence: Desired confidence level (e.g., 0.95 for 95%).

    Returns:
        Z-score value.

    Raises:
        ValueError: If confidence level is not in the lookup table.

    Example:
        >>> z_score_for_confidence(0.95)
        1.96
    """
    if confidence in _Z_SCORES:
        return _Z_SCORES[confidence]

    # For non-standard values, use an approximation
    # Rational approximation of the inverse normal CDF
    if not 0.5 < confidence < 1.0:
        raise ValueError("confidence must be between 0.5 and 1.0.")

    # Beasley-Springer-Moro approximation
    p = 1.0 - (1.0 - confidence) / 2.0  # two-tailed to one-tailed
    t = math.sqrt(-2.0 * math.log(1.0 - p))
    c0, c1, c2 = 2.515517, 0.802853, 0.010328
    d1, d2, d3 = 1.432788, 0.189269, 0.001308
    z = t - (c0 + c1 * t + c2 * t**2) / (1.0 + d1 * t + d2 * t**2 + d3 * t**3)
    return round(z, 3)


def min_sample_size(
    win_rate: float,
    confidence: float = 0.95,
    margin_of_error: float = 0.05,
) -> int:
    """Calculate the minimum number of trades to confirm an edge.

    Formula: n = (z^2 x p x (1-p)) / e^2

    For trading purposes, 95% confidence is the minimum acceptable threshold.

    Args:
        win_rate: Observed win rate (0.0 to 1.0). Use 0.50 if unknown.
        confidence: Desired confidence level (default 0.95).
        margin_of_error: Acceptable margin of error (default 0.05 = 5%).

    Returns:
        Minimum number of trades required (rounded up).

    Example:
        >>> min_sample_size(win_rate=0.55, confidence=0.95)
        381
        # You need at least 381 trades to confirm this edge at 95% confidence.
        # Not 20. Not 50. Three hundred and eighty-one.

        >>> min_sample_size(win_rate=0.50, confidence=0.99)
        664
        # At 99% confidence, you need 664 trades.
    """
    if not 0.0 < win_rate < 1.0:
        raise ValueError("win_rate must be between 0 and 1 (exclusive).")
    if margin_of_error <= 0:
        raise ValueError("margin_of_error must be positive.")

    z = z_score_for_confidence(confidence)
    n = (z**2 * win_rate * (1.0 - win_rate)) / (margin_of_error**2)
    return math.ceil(n)


def z_score(
    win_rate: float,
    sample_size: int,
    null_hypothesis: float = 0.50,
) -> float:
    """Calculate the z-score for an observed win rate.

    Tests whether the observed win rate is statistically different from
    the null hypothesis (default: 50% = random chance).

    Formula: z = (p_observed - p_null) / sqrt(p_null * (1-p_null) / n)

    Args:
        win_rate: Observed win rate from your trades.
        sample_size: Number of trades in the sample.
        null_hypothesis: The win rate under the null hypothesis
            (default 0.50 = random coin flip).

    Returns:
        Z-score. Positive = better than null. Negative = worse than null.

    Example:
        >>> z_score(win_rate=0.55, sample_size=400)
        2.0
        # A z-score of 2.0 means the result is 2 standard deviations
        # above random chance. This is significant at the 95% level.

        >>> z_score(win_rate=0.53, sample_size=100)
        0.6
        # A z-score of 0.6 is NOT significant. The 53% win rate
        # could easily be random luck with only 100 trades.
    """
    if sample_size < 1:
        raise ValueError("sample_size must be at least 1.")
    if not 0.0 < null_hypothesis < 1.0:
        raise ValueError("null_hypothesis must be between 0 and 1.")

    standard_error = math.sqrt(null_hypothesis * (1.0 - null_hypothesis) / sample_size)
    if standard_error == 0:
        return 0.0

    return (win_rate - null_hypothesis) / standard_error


def is_significant(
    win_rate: float,
    sample_size: int,
    confidence: float = 0.95,
    null_hypothesis: float = 0.50,
) -> Dict:
    """Test whether an observed win rate is statistically significant.

    Combines z_score calculation with significance threshold comparison.

    Args:
        win_rate: Observed win rate.
        sample_size: Number of trades.
        confidence: Required confidence level (default 0.95).
        null_hypothesis: Win rate under null hypothesis (default 0.50).

    Returns:
        Dict with:
            significant: bool - whether the result is significant
            z_score: float - calculated z-score
            z_threshold: float - required z-score for significance
            p_value_approx: float - approximate one-tailed p-value
            interpretation: str - human-readable interpretation

    Example:
        >>> result = is_significant(win_rate=0.58, sample_size=200)
        >>> print(result['significant'])
        True
        >>> print(result['interpretation'])
        'Statistically significant at 95% confidence. Edge likely real.'

        >>> result = is_significant(win_rate=0.53, sample_size=50)
        >>> print(result['significant'])
        False
        >>> print(result['interpretation'])
        'NOT significant. Could be random luck. Need more trades.'
    """
    z = z_score(win_rate, sample_size, null_hypothesis)
    z_threshold = z_score_for_confidence(confidence)

    significant = z > z_threshold

    # Approximate p-value using the complementary error function
    p_value = 0.5 * math.erfc(z / math.sqrt(2))

    if significant:
        interpretation = (
            f"Statistically significant at {confidence:.0%} confidence. "
            f"Edge likely real."
        )
    else:
        min_trades = min_sample_size(win_rate, confidence)
        interpretation = (
            f"NOT significant at {confidence:.0%} confidence. "
            f"Could be random luck. Need ~{min_trades} trades minimum."
        )

    return {
        "significant": significant,
        "z_score": round(z, 3),
        "z_threshold": z_threshold,
        "p_value_approx": round(p_value, 4),
        "win_rate": win_rate,
        "sample_size": sample_size,
        "confidence_level": confidence,
        "interpretation": interpretation,
    }


def quick_reference_table() -> List[Dict]:
    """Generate the minimum trades quick reference from Appendix C.

    Shows minimum trades by observed win rate at 95% and 99% confidence.

    Returns:
        List of dicts with win_rate, trades_95pct, trades_99pct.

    Example:
        >>> table = quick_reference_table()
        >>> for row in table:
        ...     print(f"Win Rate {row['win_rate']:.0%}: "
        ...           f"95% needs {row['trades_95pct']}, "
        ...           f"99% needs {row['trades_99pct']}")
    """
    return [
        {"win_rate": 0.50, "trades_95pct": 385, "trades_99pct": 664},
        {"win_rate": 0.55, "trades_95pct": 380, "trades_99pct": 656},
        {"win_rate": 0.60, "trades_95pct": 369, "trades_99pct": 637},
        {"win_rate": 0.65, "trades_95pct": 350, "trades_99pct": 604},
        {"win_rate": 0.70, "trades_95pct": 323, "trades_99pct": 557},
    ]
