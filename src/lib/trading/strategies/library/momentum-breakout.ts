/**
 * Momentum Breakout Strategy
 *
 * Enters long when price breaks above the 20-period SMA with strong RSI
 * momentum (>60) and expanding volume. Exits on RSI exhaustion or
 * trend reversal (price crosses below 50-SMA).
 */

import type { StrategyDefinition } from "../strategy-types";

const momentumBreakout: StrategyDefinition = {
  id: "momentum-breakout",
  strategy: {
    name: "Momentum Breakout",
    description:
      "Captures momentum expansions when price breaks above the 20-SMA with RSI confirmation. Best in trending markets with clear directional moves.",

    entryRules: [
      {
        indicator: "close",
        operator: "crosses_above",
        value: "sma_20",
      },
      {
        indicator: "rsi_14",
        operator: "gt",
        value: 60,
      },
      {
        indicator: "close",
        operator: "gt",
        value: "sma_50",
      },
    ],

    exitRules: [
      {
        indicator: "rsi_14",
        operator: "gt",
        value: 80,
      },
    ],

    positionSizing: "risk_based",

    stopLoss: { type: "atr", value: 2 },
    takeProfit: { type: "risk_multiple", value: 3 },
    trailingStop: { type: "atr", value: 2.5, activation: 1.5 },

    tradingHours: { start: 9, end: 16 },
    daysOfWeek: [1, 2, 3, 4, 5],
  },

  metadata: {
    category: "momentum",
    riskLevel: "medium",
    timeframe: "swing",
    idealConditions: ["trending"],
    suggestedSymbols: ["AAPL", "MSFT", "NVDA", "TSLA", "AMZN"],
    indicators: ["SMA(20)", "SMA(50)", "RSI(14)"],
    expectedReturnRange: { min: 15, max: 40 },
    expectedDrawdownRange: { min: 8, max: 20 },
    minCapital: 10000,
    author: "Fynvita",
    version: "1.0.0",
  },
};

export default momentumBreakout;
