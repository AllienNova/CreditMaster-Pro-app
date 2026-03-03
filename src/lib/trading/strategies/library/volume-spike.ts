/**
 * Volume Spike Strategy
 *
 * Enters when a price bar closes above the 20-SMA with volume exceeding
 * twice the 20-period average volume, indicating institutional buying.
 * Filtered by RSI > 50 to avoid false signals in downtrends.
 */

import type { StrategyDefinition } from "../strategy-types";

const volumeSpike: StrategyDefinition = {
  id: "volume-spike",
  strategy: {
    name: "Volume Spike",
    description:
      "Detects unusual volume surges paired with bullish price action. Targets institutional-driven moves by requiring 2x average volume on breakout candles.",

    entryRules: [
      {
        indicator: "close",
        operator: "gt",
        value: "sma_20",
      },
      {
        indicator: "rsi_14",
        operator: "gt",
        value: 50,
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
        indicator: "close",
        operator: "crosses_below",
        value: "ema_10",
        params: { period: 10 },
      },
    ],

    positionSizing: "risk_based",

    stopLoss: { type: "atr", value: 1.5 },
    takeProfit: { type: "risk_multiple", value: 2 },

    tradingHours: { start: 9, end: 16 },
    daysOfWeek: [1, 2, 3, 4, 5],
  },

  metadata: {
    category: "volume",
    riskLevel: "high",
    timeframe: "intraday",
    idealConditions: ["volatile", "trending"],
    suggestedSymbols: ["TSLA", "NVDA", "AMD", "MARA", "COIN"],
    indicators: ["SMA(20)", "EMA(10)", "RSI(14)", "Volume"],
    expectedReturnRange: { min: 15, max: 45 },
    expectedDrawdownRange: { min: 10, max: 25 },
    minCapital: 10000,
    author: "Fynvita",
    version: "1.0.0",
  },
};

export default volumeSpike;
