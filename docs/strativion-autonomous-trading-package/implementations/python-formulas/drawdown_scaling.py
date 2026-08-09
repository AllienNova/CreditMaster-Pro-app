"""
Continuous Drawdown Scaling
===========================
From Appendix C, Section 4 of "The 30 Indisputable Laws of Trading."
Law 23: Asymmetric Damage. Losses compound nonlinearly.

This module replaces the step-function drawdown scaling in policy.sizing.yaml
with a continuous exponential decay curve to eliminate cliff-edge effects.

SSOT Ref: SSOT-FRM-09
"""

import math
from dataclasses import dataclass

@dataclass
class DrawdownScalingResult:
    """Result of a continuous drawdown scaling calculation."""
    multiplier: float
    drawdown_pct: float
    k_factor: float
    interpretation: str

def calculate_drawdown_multiplier(
    drawdown_pct: float,
    k_factor: float = 10.0,
) -> DrawdownScalingResult:
    r"""Calculate the continuous drawdown scaling multiplier.
    
    Formula: Multiplier = e^(-k * Drawdown)
    SSOT Ref: SSOT-FRM-09
    
    Args:
        drawdown_pct: Current high-water mark drawdown (0.0 to 1.0).
        k_factor: Aggressiveness of the scaling.
            k=10 means a 10% drawdown reduces size by ~63% (multiplier 0.37).
            k=5 means a 10% drawdown reduces size by ~39% (multiplier 0.61).
            
    Returns:
        DrawdownScalingResult dataclass.
    """
    if not 0.0 <= drawdown_pct <= 1.0:
        raise ValueError("drawdown_pct must be between 0 and 1.")
    if k_factor <= 0:
        raise ValueError("k_factor must be positive.")
        
    # Exponential decay
    multiplier = math.exp(-k_factor * drawdown_pct)
    
    # Clamp to [0, 1] just in case
    multiplier = max(0.0, min(1.0, multiplier))
    
    interp = f"At {drawdown_pct:.1%} drawdown (k={k_factor}), position size is scaled to {multiplier:.1%} of normal."
    
    return DrawdownScalingResult(
        multiplier=round(multiplier, 4),
        drawdown_pct=drawdown_pct,
        k_factor=k_factor,
        interpretation=interp
    )
