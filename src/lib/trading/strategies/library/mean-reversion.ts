/**
 * Mean Reversion Strategy
 *
 * Buys oversold conditions (RSI < 30, price below lower Bollinger Band)
 * and exits when price reverts to the mean (middle Bollinger Band).
 * Best in ranging/low-volatility markets.
 */

import type { StrategyDefinition } from "../strategy-types";

const meanReversion: StrategyDefinition = {
  id: "mean-reversion",
  strategy: {
    name: "Mean Reversion",
    description:
      "Captures bounces from oversold conditions using Bollinger Bands and RSI. Enters when price dips below the lower band with RSI confirmation, exits at the middle band.",

    entryRules: [
      {
        indicator: "close",
        operator: "lt",
        value: "bb_lower",
      },
      {
        indicator: "rsi_14",
        operator: "lt",
        value: 30,
      },
    ],

    exitRules: [
      {
        indicator: "close",
        operator: "crosses_above",
        value: "bb_middle",
      },
    ],

    positionSizing: "risk_based",

    stopLoss: { type: "percent", value: 3 },
    takeProfit: { type: "percent", value: 5 },

    tradingHours: { start: 9, end: 16 },
    daysOfWeek: [1, 2, 3, 4, 5],
  },

  metadata: {
    category: "mean_reversion",
    riskLevel: "low",
    timeframe: "swing",
    idealConditions: ["ranging", "low_volatility"],
    suggestedSymbols: ["SPY", "QQQ", "IWM", "DIA"],
    indicators: ["Bollinger Bands(20,2)", "RSI(14)"],
    expectedReturnRange: { min: 8, max: 20 },
    expectedDrawdownRange: { min: 3, max: 10 },
    minCapital: 5000,
    author: "Fynvita",
    version: "1.0.0",
  },
};

export default meanReversion;
