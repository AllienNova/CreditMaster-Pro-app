"""
Market Regime Detection
========================
From Chapters 8 (Market Regimes) and the market playbooks.

Law 8: Markets operate in distinct regimes. Strategies that work in one
regime fail in another.

This module provides algorithmic regime detection using ADX, VIX, and ATR ratio.
"""

from enum import Enum
from typing import Dict, Optional


class MarketRegime(Enum):
    """Market regime classifications.

    Each regime demands a different strategy:
        TRENDING:   Trend-following, momentum. Ride the move.
        RANGING:    Fade extremes, VWAP reversion, range trading.
        TRANSITION: Reduce exposure, wait for clarity.
        SHOCK:      Capital preservation. No new directional trades.
    """
    TRENDING = "trending"
    RANGING = "ranging"
    TRANSITION = "transition"
    SHOCK = "shock"


def detect_regime(
    adx: float,
    vix: float,
    atr_ratio: float,
) -> MarketRegime:
    """Detect the current market regime from three inputs.

    Uses the canonical four-regime model from `canonical/policy/policy.regimes.yaml`:

    1. SHOCK:       VIX > 30 OR atr_ratio > 2.0
    2. TRENDING:    ADX >= 25
    3. RANGING:     ADX <= 20
    4. TRANSITION:  everything in between

    Args:
        adx: Average Directional Index (14-period). Measures trend strength.
            ADX > 25 = trending market.
            ADX < 20 = range-bound.
        vix: CBOE Volatility Index (VIX). Current level.
            VIX > 30 elevates the market into shock handling.
        atr_ratio: Current ATR / 200-period average ATR. Measures relative volatility.
            atr_ratio > 2.0 = shock regime candidate.

    Returns:
        MarketRegime enum value.

    Example:
        >>> detect_regime(adx=32, vix=16, atr_ratio=1.1)
        <MarketRegime.TRENDING: 'trending'>

        >>> detect_regime(adx=18, vix=14, atr_ratio=0.8)
        <MarketRegime.RANGING: 'ranging'>

        >>> detect_regime(adx=22, vix=18, atr_ratio=1.1)
        <MarketRegime.TRANSITION: 'transition'>

        >>> detect_regime(adx=35, vix=45, atr_ratio=2.5)
        <MarketRegime.SHOCK: 'shock'>
    """
    # Shock takes priority over directional classification
    if vix > 30 or atr_ratio > 2.0:
        return MarketRegime.SHOCK

    if adx >= 25:
        return MarketRegime.TRENDING

    if adx <= 20:
        return MarketRegime.RANGING

    return MarketRegime.TRANSITION


def regime_position_adjustment(regime: MarketRegime) -> Dict:
    """Get position sizing and strategy adjustments for the current regime.

    Different regimes demand different position sizes, stop widths,
    and strategy selection.

    Args:
        regime: Current MarketRegime.

    Returns:
        Dict with adjustment parameters:
            position_size_multiplier: Scale factor for position size (1.0 = normal)
            stop_width_multiplier: Scale factor for stop distance
            preferred_strategies: List of strategies that work in this regime
            avoid_strategies: List of strategies that fail in this regime
            max_risk_per_trade: Adjusted max risk per trade

    Example:
        >>> regime = detect_regime(adx=32, vix=16, atr_ratio=1.1)
        >>> adj = regime_position_adjustment(regime)
        >>> print(adj['preferred_strategies'])
        ['trend_following', 'breakout', 'momentum']
        >>> print(adj['position_size_multiplier'])
        1.0
    """
    adjustments = {
        MarketRegime.TRENDING: {
            "position_size_multiplier": 1.0,
            "stop_width_multiplier": 1.0,
            "max_risk_per_trade": 0.01,
            "preferred_strategies": [
                "trend_following",
                "breakout",
                "momentum",
                "opening_range_breakout",
            ],
            "avoid_strategies": [
                "mean_reversion",
                "fade_breakout",
                "iron_condor",
            ],
            "notes": "Let winners run. Trail stops. Do not fight the trend (Law 1).",
        },
        MarketRegime.RANGING: {
            "position_size_multiplier": 0.75,
            "stop_width_multiplier": 0.8,
            "max_risk_per_trade": 0.0075,
            "preferred_strategies": [
                "mean_reversion",
                "vwap_reversion",
                "range_trading",
            ],
            "avoid_strategies": [
                "breakout",
                "trend_following",
            ],
            "notes": "Fade extremes inside confirmed ranges. VWAP and boundaries matter most.",
        },
        MarketRegime.TRANSITION: {
            "position_size_multiplier": 0.5,
            "stop_width_multiplier": 1.0,
            "max_risk_per_trade": 0.005,
            "preferred_strategies": [
                "wait",
                "reduced_exposure",
            ],
            "avoid_strategies": [
                "full_size_breakout",
                "full_size_mean_reversion",
            ],
            "notes": "Structural break may be forming. Reduce size and wait for clarity.",
        },
        MarketRegime.SHOCK: {
            "position_size_multiplier": 0.25,
            "stop_width_multiplier": 1.5,
            "max_risk_per_trade": 0.005,
            "preferred_strategies": [
                "cash",
                "capital_preservation",
                "treasury_longs",
            ],
            "avoid_strategies": [
                "new_directional_trades",
                "leveraged_longs",
                "short_volatility",
            ],
            "notes": "Capital preservation regime. Reduce exposure aggressively and prefer supervision.",
        },
    }

    return adjustments.get(regime, adjustments[MarketRegime.TRANSITION])
