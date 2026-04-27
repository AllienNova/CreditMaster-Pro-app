"""
Edge Decay Detection (CUSUM)
============================
From Appendix C, Section 5 of "The 30 Indisputable Laws of Trading."
Law 19: Edge and Pattern Decay. Edges degrade as market structure changes.

This module implements Cumulative Sum (CUSUM) control charts to detect
small, persistent shifts in the mean of a trading system's expectancy
before hard thresholds are breached.

SSOT Ref: SSOT-FRM-07
"""

import math
from dataclasses import dataclass
from typing import List, Dict, Optional

@dataclass
class CUSUMResult:
    """Result of a CUSUM edge decay calculation."""
    is_decaying: bool
    current_cusum: float
    threshold: float
    trades_since_shift: int
    interpretation: str

def calculate_cusum(
    r_multiples: List[float],
    baseline_expectancy: float,
    sensitivity_k: float = 0.5,
    threshold_h: float = 4.0,
) -> CUSUMResult:
    r"""Calculate the CUSUM for edge decay detection.
    
    Formula: S_t = max(0, S_{t-1} + (mu_0 - x_t - k))
    SSOT Ref: SSOT-FRM-07
    
    Args:
        r_multiples: List of recent trade R-multiples (chronological order).
        baseline_expectancy: The historical expected R-multiple (mu_0).
        sensitivity_k: Allowance value. Shifts smaller than k are ignored.
            Typically set to 0.5 * expected_shift_size.
        threshold_h: The control limit. If S_t > h, an alert is triggered.
            Typically set to 4.0 or 5.0 standard deviations.
            
    Returns:
        CUSUMResult dataclass.
    """
    if not r_multiples:
        raise ValueError("r_multiples list cannot be empty.")
        
    s_t = 0.0
    trades_since_shift = 0
    
    for x_t in r_multiples:
        # We are looking for a DECREASE in expectancy, so we subtract x_t from mu_0
        deviation = baseline_expectancy - x_t - sensitivity_k
        s_t = max(0.0, s_t + deviation)
        
        if s_t > 0:
            trades_since_shift += 1
        else:
            trades_since_shift = 0
            
    is_decaying = s_t > threshold_h
    
    if is_decaying:
        interp = f"ALERT: Edge decay detected. CUSUM ({s_t:.2f}) exceeded threshold ({threshold_h}). Shift began ~{trades_since_shift} trades ago."
    else:
        interp = f"OK: No significant edge decay detected. CUSUM ({s_t:.2f}) is below threshold ({threshold_h})."
        
    return CUSUMResult(
        is_decaying=is_decaying,
        current_cusum=s_t,
        threshold=threshold_h,
        trades_since_shift=trades_since_shift,
        interpretation=interp
    )
