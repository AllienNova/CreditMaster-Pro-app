# Market Microstructure Guide

## Purpose
This guide covers order flow mechanics, liquidity dynamics, and execution quality for the Strativion trading agent. Understanding microstructure prevents the silent erosion of edge through poor execution (Laws 4, 9, 10, 25).

## Order Book Mechanics

### Bid-Ask Spread
The spread is the cost of immediacy. Every market order pays the spread.

**Spread Interpretation:**
- Tight spread (< 0.02%): High liquidity, competitive market-making. Safe for market orders on small size
- Normal spread (0.02-0.10%): Standard conditions. Use limit orders for entries
- Wide spread (0.10-0.50%): Reduced liquidity. Limit orders only. Expect slippage on exits
- Extreme spread (> 0.50%): Liquidity crisis. Do not trade unless executing pre-placed emergency orders

### Order Book Depth
- **Thick book:** > 5x average daily volume visible within 1% of mid. Safe for larger orders
- **Thin book:** < 1x average daily volume within 1%. Market impact risk is high. Scale orders over time
- **Depth imbalance:** Bid depth >> Ask depth = buying pressure. Ask depth >> Bid depth = selling pressure

### Order Types and Usage
| Order Type | When to Use | Risk |
|---|---|---|
| Market | Emergency exits only, highly liquid names | Slippage |
| Limit | Default for all entries and planned exits | Non-fill |
| Stop-Market | Invalidation/stop-loss in liquid markets | Gap slippage |
| Stop-Limit | Stop-loss in less liquid markets (0.5% buffer) | Non-fill in fast markets |
| TWAP | Large orders (> 5% of daily volume) | Information leakage |
| VWAP | Benchmark execution for institutional-size | Time risk |

## Liquidity Dynamics (Law 4)

### Volume Profile
- **High-Volume Nodes (HVN):** Price levels where significant volume was transacted. Price tends to stall, consolidate, and find support/resistance at HVNs
- **Low-Volume Nodes (LVN):** Price levels with minimal volume. Price accelerates through these voids. Do NOT enter mid-LVN
- **Point of Control (POC):** Highest-volume price level within a session or range. Acts as magnet

### Stop Hunts and Liquidity Sweeps
- Clusters of stops below obvious swing lows (for longs) and above swing highs (for shorts) act as liquidity targets
- Institutional players deliberately trigger stop clusters to fill large orders at favorable prices
- Defense: Place stops beyond structural levels by 0.5 ATR buffer, not exactly at the obvious level

## Execution Quality Metrics

Track these metrics for every trade:
- **Slippage:** Actual fill price minus expected fill price. Target < 0.5x spread
- **Fill rate:** Percentage of limit orders that execute. Target > 70%
- **Market impact:** Price movement caused by your own order. Should be negligible for retail size
- **Implementation shortfall:** Difference between decision price and final execution price including all costs

## Time-of-Day Patterns

| Period | Characteristics | Execution Guidance |
|---|---|---|
| Pre-market (4:00-9:30 ET) | Wide spreads, thin books | Limit orders only, avoid if possible |
| Open (9:30-10:00 ET) | High volatility, heavy volume | Wait for opening range to form |
| Morning session (10:00-12:00 ET) | Best liquidity, tightest spreads | Optimal execution window |
| Midday (12:00-14:00 ET) | Lower volume, wider spreads | Reduce trade frequency |
| Power hour (15:00-16:00 ET) | Volume surge, institutional rebalancing | Good for exits, careful with entries |
| After-hours (16:00-20:00 ET) | Very thin, wide spreads | Avoid unless necessary |

See `canonical/policy/policy.execution.yaml` for exact session times and liquidity windows by market.

## Key Microstructure Rules

1. Never use market orders in illiquid conditions
2. Always measure actual vs. expected slippage. If consistently > 1x spread, execution is broken
3. Size orders relative to visible book depth. Never place an order > 10% of visible depth at your price level
4. Monitor spread widening as an early warning for liquidity withdrawal (precedes fast moves)
5. In crisis conditions, assume all liquidity metrics are 5-10x worse than normal
