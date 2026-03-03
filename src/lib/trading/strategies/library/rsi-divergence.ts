/**
 * RSI Divergence Strategy
 *
 * Enters when price makes a lower low but RSI makes a higher low (bullish
 * divergence), signaling weakening selling pressure. Uses RSI crossing
 * back above 40 as confirmation. Exits on overbought RSI or trend break.
 */

import type { StrategyDefinition } from "../strategy-types";

const rsiDivergence: StrategyDefinition = {
  id: "rsi-divergence",
  strategy: {
    name: "RSI Divergence",
    description:
      "Detects bullish RSI divergence patterns. Enters when RSI recovers from oversold while price is still near support, targeting a swing back to the mean.",

    entryRules: [
      {
        indicator: "rsi_14",
        operator: "crosses_above",
        value: 40,
      },
      {
        indicator: "close",
        operator: "lt",
        value: "sma_20",
      },
      {
        indicator: "close",
        operator: "gt",
        value: "bb_lower",
      },
    ],

    exitRules: [
      {
        indicator: "rsi_14",
        operator: "gt",
        value: 70,
      },
    ],

    positionSizing: "risk_based",

    stopLoss: { type: "percent", value: 4 },
    takeProfit: { type: "percent", value: 8 },

    tradingHours: { start: 9, end: 16 },
    daysOfWeek: [1, 2, 3, 4, 5],
  },

  metadata: {
    category: "mean_reversion",
    riskLevel: "medium",
    timeframe: "swing",
    idealConditions: ["ranging", "any"],
    indicators: ["RSI(14)", "SMA(20)", "Bollinger Bands(20,2)"],
    expectedReturnRange: { min: 10, max: 25 },
    expectedDrawdownRange: { min: 5, max: 15 },
    minCapital: 5000,
    author: "Fynvita",
    version: "1.0.0",
  },
};

export default rsiDivergence;
