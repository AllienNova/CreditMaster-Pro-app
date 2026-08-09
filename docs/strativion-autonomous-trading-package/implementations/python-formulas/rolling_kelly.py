"""
Rolling Kelly Criterion
=======================
From Appendix C, Section 2 of "The 30 Indisputable Laws of Trading."
Law 21: Position Sizing. Sizing drives survival more reliably than entry precision.

This module replaces the static Kelly calculation with a rolling, discounted
Kelly that weights recent trades more heavily than older trades.

SSOT Ref: SSOT-FRM-11
"""

import math
from dataclasses import dataclass
from typing import List, Tuple

@dataclass
class RollingKellyResult:
    """Result of a rolling Kelly calculation."""
    full_kelly: float
    fractional_kelly: float
    discounted_win_rate: float
    discounted_payoff_ratio: float
    interpretation: str

def calculate_rolling_kelly(
    wins: List[int],
    profits: List[float],
    losses: List[float],
    decay_factor: float = 0.95,
    kelly_fraction: float = 0.25,
) -> RollingKellyResult:
    r"""Calculate the rolling, discounted Kelly criterion.
    
    Formula: K = W - ((1 - W) / R)
    SSOT Ref: SSOT-FRM-11
    
    Args:
        wins: List of 1 (win) or 0 (loss) for recent trades (oldest to newest).
        profits: List of dollar profits for winning trades.
        losses: List of dollar losses for losing trades (positive numbers).
        decay_factor: Weight applied to previous trades (e.g., 0.95 means
            a trade 14 periods ago has half the weight of the current trade).
        kelly_fraction: The fraction of full Kelly to trade (e.g., 0.25 for quarter-Kelly).
            
    Returns:
        RollingKellyResult dataclass.
    """
    if not wins or not profits or not losses:
        raise ValueError("Input lists cannot be empty.")
    if not 0.0 < decay_factor <= 1.0:
        raise ValueError("decay_factor must be between 0 and 1.")
    if not 0.0 < kelly_fraction <= 1.0:
        raise ValueError("kelly_fraction must be between 0 and 1.")
        
    # Calculate discounted win rate
    weighted_wins = 0.0
    total_weight = 0.0
    weight = 1.0
    
    for w in reversed(wins):
        weighted_wins += w * weight
        total_weight += weight
        weight *= decay_factor
        
    discounted_win_rate = weighted_wins / total_weight if total_weight > 0 else 0.0
    
    # Calculate discounted average profit
    weighted_profit = 0.0
    profit_weight = 0.0
    weight = 1.0
    
    for p in reversed(profits):
        weighted_profit += p * weight
        profit_weight += weight
        weight *= decay_factor
        
    avg_profit = weighted_profit / profit_weight if profit_weight > 0 else 0.0
    
    # Calculate discounted average loss
    weighted_loss = 0.0
    loss_weight = 0.0
    weight = 1.0
    
    for l in reversed(losses):
        weighted_loss += l * weight
        loss_weight += weight
        weight *= decay_factor
        
    avg_loss = weighted_loss / loss_weight if loss_weight > 0 else 1.0
    
    # Calculate payoff ratio
    payoff_ratio = avg_profit / avg_loss if avg_loss > 0 else 0.0
    
    # Calculate Kelly
    if payoff_ratio <= 0:
        full_kelly = 0.0
    else:
        full_kelly = discounted_win_rate - ((1.0 - discounted_win_rate) / payoff_ratio)
        
    # Clamp to [0, 1]
    full_kelly = max(0.0, min(1.0, full_kelly))
    
    fractional_kelly = full_kelly * kelly_fraction
    
    interp = f"Rolling Kelly: {full_kelly:.2%} (Win Rate: {discounted_win_rate:.1%}, Payoff: {payoff_ratio:.2f}). Trading {kelly_fraction:.2f} fraction = {fractional_kelly:.2%} risk."
    
    return RollingKellyResult(
        full_kelly=round(full_kelly, 4),
        fractional_kelly=round(fractional_kelly, 4),
        discounted_win_rate=round(discounted_win_rate, 4),
        discounted_payoff_ratio=round(payoff_ratio, 4),
        interpretation=interp
    )
