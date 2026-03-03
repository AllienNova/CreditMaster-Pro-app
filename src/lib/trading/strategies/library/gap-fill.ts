/**
 * Gap Fill Strategy
 *
 * Fades opening gaps by entering when price gaps below the previous close
 * (gap down) and RSI is oversold. Targets a fill back to the previous
 * close level. Uses tight stops since gap fills should happen quickly.
 */

import type { StrategyDefinition } from "../strategy-types";

const gapFill: StrategyDefinition = {
  id: "gap-fill",
  strategy: {
    name: "Gap Fill",
    description:
      "Fades opening gaps by entering oversold gap-downs, targeting a price fill back to the previous close. Fast intraday strategy with tight risk management.",

    entryRules: [
      {
        indicator: "rsi_7",
        operator: "lt",
        value: 35,
        params: { period: 7 },
      },
      {
        indicator: "close",
        operator: "lt",
        value: "sma_10",
        params: { period: 10 },
      },
      {
        indicator: "close",
        operator: "gt",
        value: "bb_lower",
      },
    ],

    exitRules: [
      {
        indicator: "close",
        operator: "crosses_above",
        value: "sma_10",
        params: { period: 10 },
      },
    ],

    positionSizing: "risk_based",

    stopLoss: { type: "percent", value: 2 },
    takeProfit: { type: "percent", value: 3 },

    tradingHours: { start: 9, end: 11 },
    daysOfWeek: [1, 2, 3, 4, 5],
  },

  metadata: {
    category: "gap",
    riskLevel: "high",
    timeframe: "intraday",
    idealConditions: ["volatile", "any"],
    suggestedSymbols: ["SPY", "QQQ", "TSLA", "NVDA", "AAPL"],
    indicators: ["RSI(7)", "SMA(10)", "Bollinger Bands(20,2)"],
    expectedReturnRange: { min: 10, max: 35 },
    expectedDrawdownRange: { min: 5, max: 15 },
    minCapital: 10000,
    author: "Fynvita",
    version: "1.0.0",
  },
};

export default gapFill;
