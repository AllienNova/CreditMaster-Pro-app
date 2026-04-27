# Regime Detection Guide

## Purpose
This guide provides the complete regime identification system for the Strativion trading agent. Regime detection is the master skill (Law 8). Every strategy selection, position sizing decision, and risk parameter depends on correctly identifying the current market regime.

## The Three Primary Regimes

### 1. Trending Regime
**Definition:** Price moving directionally with statistical persistence. Positive autocorrelation. Momentum strategies outperform.

**Detection Criteria (ALL must be met):**
- ADX(14) > 25 and rising
- Hurst exponent > 0.55 on daily data
- 20-day MA slope: absolute value > 0.5% per bar
- Volume confirmation: above-average volume in trend direction
- Autocorrelation (lag-1, 20-bar) > 0.05

**Sub-classifications:**
- **Early Trend:** ADX crossing above 25, momentum accelerating. Highest-probability entries
- **Mature Trend:** ADX > 35, extended duration (> 30 bars). Trail stops. Do not add positions
- **Late/Exhausting Trend:** ADX declining from peak, volume divergence. Take profits, prepare for transition

**Active Laws:** 1 (Inertia), 2 (Feedback Loops), 13 (Momentum), 12 (Multi-TF Alignment)
**Active Strategies:** Trend-following, momentum, breakout continuation
**Disabled Strategies:** Mean-reversion, counter-trend fading

### 2. Ranging Regime
**Definition:** Price oscillating between boundaries without directional persistence. Autocorrelation near zero or negative. Mean-reversion strategies outperform.

**Detection Criteria (ALL must be met):**
- ADX(14) < 20 and flat or declining
- Hurst exponent < 0.45 on daily data
- 20-day MA slope: absolute value < 0.2% per bar
- Price contained within identifiable range (2+ touches of both boundaries)
- Autocorrelation (lag-1, 20-bar) < 0.0 or near zero

**Sub-classifications:**
- **Tight Range:** Range width < 2x ATR. Compression building (Law 3). Expect breakout
- **Wide Range:** Range width > 5x ATR. Tradeable swings between boundaries
- **Choppy Range:** No clear boundaries. ADX very low (< 15). STAND ASIDE. No edge exists

**Active Laws:** 5 (Mean Reversion), 11 (Structural Levels), 3 (Volatility Compression watch)
**Active Strategies:** Mean-reversion, range-bound, volatility selling (cautiously)
**Disabled Strategies:** Trend-following, breakout

### 3. Crisis/Volatile Regime
**Definition:** Extreme volatility, correlation spikes, liquidity withdrawal. Normal strategies fail. Survival mode.

**Detection Criteria (ANY triggers crisis mode):**
- VIX > 30 (or equivalent volatility measure > 2x 90-day average)
- Average portfolio correlation > 0.7
- Bid-ask spreads > 3x normal
- Circuit breakers triggered or limit-down events
- Multiple 3-sigma daily moves within a 5-day window

**Sub-classifications:**
- **Acute Crisis:** VIX > 40, correlation > 0.8, liquidity evaporating. MAXIMUM DEFENSE
- **Elevated Volatility:** VIX 25-40, correlations elevated. Reduce exposure, widen stops
- **Recovery/Transition:** VIX declining from crisis peak, correlations normalizing. Begin cautious re-engagement

**Active Laws:** 7 (Fat Tails), 24 (Systemic Correlation), 29 (Probability of Ruin), 30 (Survival)
**Active Strategies:** Crisis alpha, tail hedges, cash preservation
**Disabled Strategies:** ALL normal strategies suspended

## The 60-Second Regime Check

Execute this check at the start of every trading session and whenever a regime transition signal fires:

1. **ADX Direction (10 sec):** ADX > 25 rising = trending. ADX < 20 flat = ranging. Skip to VIX
2. **VIX Level (10 sec):** VIX > 30 = crisis override (regardless of ADX). VIX 20-30 = caution
3. **200-Day MA Slope (10 sec):** Rising = bullish trending. Falling = bearish trending. Flat = ranging
4. **Correlation Check (10 sec):** Average pairwise correlation > 0.6 = systemic risk elevated
5. **Volume Pattern (10 sec):** Expanding in trend direction = confirming. Contracting = weakening
6. **Regime Verdict (10 sec):** Classify and log. Set strategy activation flags. See `canonical/policy/policy.regimes.yaml` for exact values

## Regime Transition Detection

Transitions are more dangerous than any regime. During transition (typically 3-10 days):
- Reduce all position sizes by 50%
- Widen stops by 1.5x
- Do not add new positions until new regime is confirmed
- Monitor transition signals:
  - ADX crossing 25 (either direction)
  - VIX crossing 20 or 30
  - Autocorrelation sign change (positive to negative or vice versa)
  - 200-day MA slope changing sign

## Regime History Logging

Log every regime classification with timestamp, supporting data, and confidence level (0-100%). Maintain a rolling 90-day regime history. Use this history for:
- Strategy performance attribution by regime
- Transition pattern recognition
- False signal tracking (how often did regime detection get it wrong?)

See `canonical/policy/policy.regimes.yaml` for all configurable thresholds and parameters.
