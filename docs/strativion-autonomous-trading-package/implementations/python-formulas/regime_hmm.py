"""
Hidden Markov Model (HMM) Regime Detection
==========================================
From Appendix C, Section 6 of "The 30 Indisputable Laws of Trading."
Law 8: Market Regimes. Markets operate in distinct states.

This module replaces hard cliff-edge thresholds (e.g., VIX > 35) with
probabilistic state vectors using a simplified 3-state HMM approximation.

SSOT Ref: SSOT-FRM-08
"""

import math
from dataclasses import dataclass
from typing import List, Dict, Tuple

@dataclass
class RegimeProbabilities:
    """Probabilistic state vector for market regimes."""
    trending: float
    ranging: float
    shock: float
    dominant_regime: str
    entropy: float

def calculate_regime_probabilities(
    adx: float,
    vix: float,
    atr_ratio: float,
) -> RegimeProbabilities:
    r"""Calculate regime probabilities using a simplified Gaussian emission model.
    
    Instead of discrete states, this outputs a probability vector.
    SSOT Ref: SSOT-FRM-08
    
    Args:
        adx: Average Directional Index (0-100).
        vix: Volatility Index.
        atr_ratio: Current ATR / 200-period ATR.
        
    Returns:
        RegimeProbabilities dataclass.
    """
    if adx < 0 or vix < 0 or atr_ratio < 0:
        raise ValueError("Inputs must be non-negative.")
        
    # Simplified Gaussian emission probabilities (unnormalized)
    # Trending: High ADX, Low/Med VIX, Normal ATR
    p_trend = math.exp(-0.5 * (((adx - 35) / 10)**2 + ((vix - 15) / 5)**2 + ((atr_ratio - 1.0) / 0.2)**2))
    
    # Ranging: Low ADX, Low VIX, Low ATR
    p_range = math.exp(-0.5 * (((adx - 15) / 5)**2 + ((vix - 12) / 4)**2 + ((atr_ratio - 0.8) / 0.2)**2))
    
    # Shock: Any ADX, High VIX, High ATR
    p_shock = math.exp(-0.5 * (((vix - 35) / 10)**2 + ((atr_ratio - 2.5) / 0.5)**2))
    
    # Normalize to sum to 1.0
    total = p_trend + p_range + p_shock
    if total == 0:
        # Fallback if all probabilities are infinitesimally small
        return RegimeProbabilities(0.0, 1.0, 0.0, "ranging", 0.0)
        
    p_trend /= total
    p_range /= total
    p_shock /= total
    
    # Determine dominant regime
    probs = {"trending": p_trend, "ranging": p_range, "shock": p_shock}
    dominant = max(probs, key=probs.get)
    
    # Calculate Shannon entropy (measure of regime uncertainty)
    entropy = 0.0
    for p in [p_trend, p_range, p_shock]:
        if p > 0:
            entropy -= p * math.log2(p)
            
    return RegimeProbabilities(
        trending=round(p_trend, 4),
        ranging=round(p_range, 4),
        shock=round(p_shock, 4),
        dominant_regime=dominant,
        entropy=round(entropy, 4)
    )
