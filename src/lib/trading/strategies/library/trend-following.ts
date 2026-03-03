/**
 * Trend Following Strategy
 *
 * Classic dual-moving-average crossover: enters when the 20-EMA crosses
 * above the 50-EMA with price above the 200-SMA (confirming uptrend).
 * Exits on the reverse crossover. Wide trailing stop preserves gains.
 */

import type { StrategyDefinition } from "../strategy-types";

const trendFollowing: StrategyDefinition = {
  id: "trend-following",
  strategy: {
    name: "Trend Following",
    description:
      "Dual-EMA crossover system with 200-SMA trend filter. Rides extended trends using a wide ATR trailing stop to let winners run.",

    entryRules: [
      {
        indicator: "ema_20",
        operator: "crosses_above",
        value: "ema_50",
      },
      {
        indicator: "close",
        operator: "gt",
        value: "sma_200",
      },
    ],

    exitRules: [
      {
        indicator: "ema_20",
        operator: "crosses_below",
        value: "ema_50",
      },
    ],

    positionSizing: "percent",
    positionValue: 10,

    stopLoss: { type: "atr", value: 3 },
    trailingStop: { type: "atr", value: 3, activation: 2 },

    daysOfWeek: [1, 2, 3, 4, 5],
  },

  metadata: {
    category: "trend_following",
    riskLevel: "medium",
    timeframe: "position",
    idealConditions: ["trending"],
    suggestedSymbols: ["SPY", "QQQ", "AAPL", "MSFT", "GOOG"],
    indicators: ["EMA(20)", "EMA(50)", "SMA(200)"],
    expectedReturnRange: { min: 12, max: 30 },
    expectedDrawdownRange: { min: 10, max: 25 },
    minCapital: 10000,
    author: "Fynvita",
    version: "1.0.0",
  },
};

export default trendFollowing;
