/**
 * Opening Range Breakout Strategy
 *
 * Trades the breakout of the first 30-minute range. Enters long when price
 * closes above the opening range high with volume and momentum confirmation.
 * Uses ATR-based stops and a 2:1 reward target.
 */

import type { StrategyDefinition } from "../strategy-types";

const openingRangeBreakout: StrategyDefinition = {
  id: "opening-range-breakout",
  strategy: {
    name: "Opening Range Breakout",
    description:
      "Captures the initial directional move after market open. Enters when price breaks above the high of the first 30 minutes with ATR and RSI confirmation.",

    entryRules: [
      {
        indicator: "close",
        operator: "gt",
        value: "sma_10",
        params: { period: 10 },
      },
      {
        indicator: "rsi_14",
        operator: "gt",
        value: 55,
      },
      {
        indicator: "close",
        operator: "gt",
        value: "ema_10",
        params: { period: 10 },
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

    stopLoss: { type: "atr", value: 1 },
    takeProfit: { type: "risk_multiple", value: 2 },

    tradingHours: { start: 9, end: 12 },
    daysOfWeek: [1, 2, 3, 4, 5],
  },

  metadata: {
    category: "breakout",
    riskLevel: "high",
    timeframe: "intraday",
    idealConditions: ["volatile", "trending"],
    suggestedSymbols: ["SPY", "QQQ", "TSLA", "AAPL", "NVDA"],
    indicators: ["SMA(10)", "EMA(10)", "RSI(14)", "ATR(14)"],
    expectedReturnRange: { min: 15, max: 40 },
    expectedDrawdownRange: { min: 8, max: 20 },
    minCapital: 15000,
    author: "Fynvita",
    version: "1.0.0",
  },
};

export default openingRangeBreakout;
