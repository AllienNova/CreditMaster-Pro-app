# PCTT Regime Extension (strategy-specific)

> **STATUS:** implementation-level, strategy-specific.
> **AUTHORITY:** subordinate to canonical `policy.regimes.yaml`. PCTT regime labels are sub-regime signals; the canonical primary regime is authoritative for system-wide decisions.

## PCTT Regime Indicators

1. **Efficiency Ratio (ER)** over n=20 bars:
   - ER ≥ 0.40: TRENDING.
   - ER ≤ 0.25: MEAN_REVERTING.
   - 0.25 < ER < 0.40: TRANSITION.
2. **Crossing Count** over n=20 bars:
   - Low (< 5): confirms trending.
   - High (≥ 8): confirms choppy/ranging.
3. **Combined:**
   - TRENDING: ER ≥ 0.40 AND crossings ≤ theta_cross_max.
   - MEAN_REVERTING: ER ≤ 0.25 OR crossings ≥ theta_cross_min.
   - CHOPPY: ER in 0.25–0.40 AND crossings high.

## Mapping to Canonical Primary Regime

- PCTT TRENDING → canonical `TRENDING`.
- PCTT MEAN_REVERTING → canonical `RANGING`.
- PCTT CHOPPY → canonical `TRANSITION` or `RANGING` depending on volatility.
- PCTT TRANSITION → canonical `TRANSITION`.

When the canonical primary regime is `SHOCK` or `CRISIS`, PCTT never emits entries regardless of ER/crossings.

## Active-Trade Regime Change

When the canonical regime flips from `TRENDING` to something that disallows PCTT while PCTT positions are open:

- Signal Meta to exit open PCTT positions.
- Tighten remaining stops to `0.5R` from current price.
- Suspend new PCTT signals until the canonical regime resolves.

## Advanced (Optional) Indicators

- Hurst exponent, Kalman-filtered slope, CUSUM change-point — consumer-optional, non-binding.
