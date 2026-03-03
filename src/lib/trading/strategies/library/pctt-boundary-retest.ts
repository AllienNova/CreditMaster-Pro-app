/**
 * PCTT Boundary Retest Strategy
 *
 * Based on the Pivot-Constrained Trendline Trading methodology.
 * Enters when price retests a key trendline boundary (support/resistance)
 * with RSI confirmation and the overall regime is bullish (price > 100-SMA).
 * Uses tight ATR stops since boundary retests should hold quickly.
 */

import type { StrategyDefinition } from "../strategy-types";

const pcttBoundaryRetest: StrategyDefinition = {
  id: "pctt-boundary-retest",
  strategy: {
    name: "PCTT Boundary Retest",
    description:
      "Trades pullbacks to key trendline boundaries identified by the PCTT framework. Enters on support retests in bullish regimes with momentum divergence.",

    entryRules: [
      {
        indicator: "close",
        operator: "crosses_above",
        value: "sma_20",
      },
      {
        indicator: "close",
        operator: "gt",
        value: "sma_100",
      },
      {
        indicator: "rsi_14",
        operator: "gt",
        value: 45,
      },
      {
        indicator: "rsi_14",
        operator: "lt",
        value: 65,
      },
    ],

    exitRules: [
      {
        indicator: "rsi_14",
        operator: "gt",
        value: 75,
      },
    ],

    positionSizing: "risk_based",

    stopLoss: { type: "atr", value: 1.5 },
    takeProfit: { type: "risk_multiple", value: 3 },
    trailingStop: { type: "atr", value: 2, activation: 1.5 },

    daysOfWeek: [1, 2, 3, 4, 5],
  },

  metadata: {
    category: "pctt",
    riskLevel: "medium",
    timeframe: "swing",
    idealConditions: ["trending"],
    suggestedSymbols: ["SPY", "QQQ", "AAPL", "MSFT", "GOOG"],
    indicators: ["SMA(20)", "SMA(100)", "RSI(14)", "ATR(14)"],
    expectedReturnRange: { min: 15, max: 35 },
    expectedDrawdownRange: { min: 8, max: 18 },
    minCapital: 10000,
    author: "Fynvita",
    version: "1.0.0",
  },
};

export default pcttBoundaryRetest;
