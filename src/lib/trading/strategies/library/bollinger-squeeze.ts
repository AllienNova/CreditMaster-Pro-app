/**
 * Bollinger Squeeze Strategy
 *
 * Detects low-volatility compression (Bollinger Band width narrows) then
 * enters on the breakout direction when price closes above the upper band
 * with rising RSI. Targets a 2:1 risk-reward ratio.
 */

import type { StrategyDefinition } from "../strategy-types";

const bollingerSqueeze: StrategyDefinition = {
  id: "bollinger-squeeze",
  strategy: {
    name: "Bollinger Squeeze",
    description:
      "Identifies volatility compression via narrowing Bollinger Bands, then enters the breakout when price closes above the upper band with momentum confirmation.",

    entryRules: [
      {
        indicator: "close",
        operator: "crosses_above",
        value: "bb_upper",
      },
      {
        indicator: "rsi_14",
        operator: "gt",
        value: 55,
      },
      {
        indicator: "close",
        operator: "gt",
        value: "sma_20",
      },
    ],

    exitRules: [
      {
        indicator: "close",
        operator: "crosses_below",
        value: "bb_middle",
      },
    ],

    positionSizing: "risk_based",

    stopLoss: { type: "atr", value: 1.5 },
    takeProfit: { type: "risk_multiple", value: 2 },

    tradingHours: { start: 9, end: 16 },
    daysOfWeek: [1, 2, 3, 4, 5],
  },

  metadata: {
    category: "volatility",
    riskLevel: "medium",
    timeframe: "swing",
    idealConditions: ["low_volatility"],
    suggestedSymbols: ["AAPL", "GOOG", "META", "AMZN"],
    indicators: ["Bollinger Bands(20,2)", "RSI(14)", "SMA(20)"],
    expectedReturnRange: { min: 10, max: 30 },
    expectedDrawdownRange: { min: 5, max: 15 },
    minCapital: 5000,
    author: "Fynvita",
    version: "1.0.0",
  },
};

export default bollingerSqueeze;
