/**
 * MACD Crossover Strategy
 *
 * Classic MACD signal-line crossover with trend filter. Enters long when
 * MACD crosses above its signal line while price is above the 100-SMA.
 * Exits on the reverse crossover or MACD histogram turning negative.
 */

import type { StrategyDefinition } from "../strategy-types";

const macdCrossover: StrategyDefinition = {
  id: "macd-crossover",
  strategy: {
    name: "MACD Crossover",
    description:
      "Standard MACD/signal crossover with a 100-SMA trend filter. Captures medium-term momentum shifts with disciplined stop-loss management.",

    entryRules: [
      {
        indicator: "macd",
        operator: "crosses_above",
        value: "macd_signal",
      },
      {
        indicator: "close",
        operator: "gt",
        value: "sma_100",
      },
    ],

    exitRules: [
      {
        indicator: "macd",
        operator: "crosses_below",
        value: "macd_signal",
      },
    ],

    positionSizing: "percent",
    positionValue: 10,

    stopLoss: { type: "atr", value: 2 },
    takeProfit: { type: "risk_multiple", value: 2.5 },

    daysOfWeek: [1, 2, 3, 4, 5],
  },

  metadata: {
    category: "momentum",
    riskLevel: "medium",
    timeframe: "swing",
    idealConditions: ["trending", "any"],
    suggestedSymbols: ["SPY", "QQQ", "AAPL", "TSLA", "NVDA"],
    indicators: ["MACD(12,26,9)", "SMA(100)"],
    expectedReturnRange: { min: 10, max: 25 },
    expectedDrawdownRange: { min: 8, max: 18 },
    minCapital: 5000,
    author: "Fynvita",
    version: "1.0.0",
  },
};

export default macdCrossover;
