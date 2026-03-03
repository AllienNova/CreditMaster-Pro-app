/**
 * 30 Trading Law Definitions
 *
 * Each law represents a best-practice rule for systematic trading.
 * Laws are grouped into 8 categories and evaluated against every signal.
 */

import type { LawDefinition, LawId } from "./compliance-types";

// ============================================================================
// TRADING LAWS
// ============================================================================

export const TRADING_LAWS: Record<LawId, LawDefinition> = {
  // ─── Risk Management (LAW-01 to LAW-06) ──────────────────────────

  "LAW-01": {
    id: "LAW-01",
    name: "Position Size Limit",
    description: "Never risk more than 2% of portfolio on a single trade",
    category: "risk_management",
    weight: 0.9,
    canBlock: true,
    violationSeverity: "critical",
    applicableTo: ["buy"],
    applicableModes: "all",
  },
  "LAW-02": {
    id: "LAW-02",
    name: "Stop Loss Required",
    description: "Every entry must have a defined stop loss",
    category: "risk_management",
    weight: 0.95,
    canBlock: true,
    violationSeverity: "blocking",
    applicableTo: ["buy", "sell"],
    applicableModes: "all",
  },
  "LAW-03": {
    id: "LAW-03",
    name: "Daily Loss Limit",
    description: "Stop trading when daily loss exceeds threshold",
    category: "risk_management",
    weight: 0.85,
    canBlock: true,
    violationSeverity: "critical",
    applicableTo: "all",
    applicableModes: "all",
  },
  "LAW-04": {
    id: "LAW-04",
    name: "Max Open Positions",
    description: "Do not exceed maximum number of open positions",
    category: "risk_management",
    weight: 0.7,
    canBlock: true,
    violationSeverity: "critical",
    applicableTo: ["buy"],
    applicableModes: "all",
  },
  "LAW-05": {
    id: "LAW-05",
    name: "Portfolio Heat",
    description: "Total portfolio risk (sum of all position risks) must stay at or below 6%",
    category: "risk_management",
    weight: 0.8,
    canBlock: true,
    violationSeverity: "critical",
    applicableTo: ["buy"],
    applicableModes: "all",
  },
  "LAW-06": {
    id: "LAW-06",
    name: "Drawdown Protection",
    description: "Reduce position size when portfolio is in drawdown greater than 10%",
    category: "risk_management",
    weight: 0.75,
    canBlock: false,
    violationSeverity: "warning",
    applicableTo: ["buy"],
    applicableModes: "all",
  },

  // ─── Position Sizing (LAW-07 to LAW-10) ──────────────────────────

  "LAW-07": {
    id: "LAW-07",
    name: "ATR-Based Sizing",
    description: "Position size should be calibrated to Average True Range",
    category: "position_sizing",
    weight: 0.6,
    canBlock: false,
    violationSeverity: "warning",
    applicableTo: ["buy"],
    applicableModes: "all",
  },
  "LAW-08": {
    id: "LAW-08",
    name: "Risk/Reward Minimum",
    description: "Only take trades with risk/reward ratio of at least 1.5:1",
    category: "position_sizing",
    weight: 0.8,
    canBlock: true,
    violationSeverity: "critical",
    applicableTo: ["buy"],
    applicableModes: "all",
  },
  "LAW-09": {
    id: "LAW-09",
    name: "Scaling Rules",
    description: "Do not add to losing positions",
    category: "position_sizing",
    weight: 0.7,
    canBlock: false,
    violationSeverity: "warning",
    applicableTo: ["buy"],
    applicableModes: "all",
  },
  "LAW-10": {
    id: "LAW-10",
    name: "Concentration Limit",
    description: "No single position may exceed 20% of portfolio",
    category: "position_sizing",
    weight: 0.85,
    canBlock: true,
    violationSeverity: "critical",
    applicableTo: ["buy"],
    applicableModes: "all",
  },

  // ─── Entry Criteria (LAW-11 to LAW-16) ───────────────────────────

  "LAW-11": {
    id: "LAW-11",
    name: "Regime Alignment",
    description: "Signal must align with the detected market regime",
    category: "entry_criteria",
    weight: 0.7,
    canBlock: false,
    violationSeverity: "warning",
    applicableTo: ["buy", "sell"],
    applicableModes: "all",
  },
  "LAW-12": {
    id: "LAW-12",
    name: "Signal Strength Minimum",
    description: "Signal confidence must exceed minimum threshold",
    category: "entry_criteria",
    weight: 0.75,
    canBlock: true,
    violationSeverity: "critical",
    applicableTo: ["buy", "sell"],
    applicableModes: "all",
  },
  "LAW-13": {
    id: "LAW-13",
    name: "Volume Confirmation",
    description: "Volume must be above average for entries",
    category: "entry_criteria",
    weight: 0.5,
    canBlock: false,
    violationSeverity: "warning",
    applicableTo: ["buy"],
    applicableModes: "all",
  },
  "LAW-14": {
    id: "LAW-14",
    name: "Multi-Timeframe Alignment",
    description: "Signal should be confirmed across multiple timeframes",
    category: "entry_criteria",
    weight: 0.5,
    canBlock: false,
    violationSeverity: "info",
    applicableTo: ["buy", "sell"],
    applicableModes: ["guided", "autonomous"],
  },
  "LAW-15": {
    id: "LAW-15",
    name: "No Counter-Trend Entries",
    description: "Do not enter against strong prevailing trends",
    category: "entry_criteria",
    weight: 0.65,
    canBlock: false,
    violationSeverity: "warning",
    applicableTo: ["buy", "sell"],
    applicableModes: "all",
  },
  "LAW-16": {
    id: "LAW-16",
    name: "Earnings Blackout",
    description: "Avoid entries within 2 days before or after earnings releases",
    category: "entry_criteria",
    weight: 0.55,
    canBlock: false,
    violationSeverity: "warning",
    applicableTo: ["buy"],
    applicableModes: "all",
  },

  // ─── Exit Criteria (LAW-17 to LAW-20) ────────────────────────────

  "LAW-17": {
    id: "LAW-17",
    name: "Trailing Stop",
    description: "Winning positions must have trailing stop protection",
    category: "exit_criteria",
    weight: 0.65,
    canBlock: false,
    violationSeverity: "warning",
    applicableTo: ["hold"],
    applicableModes: "all",
  },
  "LAW-18": {
    id: "LAW-18",
    name: "Time-Based Exit",
    description: "Close trades that have not moved after a set number of days",
    category: "exit_criteria",
    weight: 0.4,
    canBlock: false,
    violationSeverity: "info",
    applicableTo: ["hold"],
    applicableModes: "all",
  },
  "LAW-19": {
    id: "LAW-19",
    name: "Target Respect",
    description: "Take profits at predefined target levels",
    category: "exit_criteria",
    weight: 0.5,
    canBlock: false,
    violationSeverity: "info",
    applicableTo: ["hold", "sell"],
    applicableModes: "all",
  },
  "LAW-20": {
    id: "LAW-20",
    name: "Cut Losers Early",
    description: "Do not let small losses grow into large ones",
    category: "exit_criteria",
    weight: 0.8,
    canBlock: false,
    violationSeverity: "warning",
    applicableTo: ["hold"],
    applicableModes: "all",
  },

  // ─── Market Structure (LAW-21 to LAW-24) ─────────────────────────

  "LAW-21": {
    id: "LAW-21",
    name: "Market Hours",
    description: "Trade only during regular market hours unless explicitly allowed",
    category: "market_structure",
    weight: 0.6,
    canBlock: true,
    violationSeverity: "critical",
    applicableTo: ["buy", "sell"],
    applicableModes: "all",
  },
  "LAW-22": {
    id: "LAW-22",
    name: "Liquidity Check",
    description: "Do not trade in illiquid conditions",
    category: "market_structure",
    weight: 0.55,
    canBlock: false,
    violationSeverity: "warning",
    applicableTo: ["buy"],
    applicableModes: "all",
  },
  "LAW-23": {
    id: "LAW-23",
    name: "Spread Check",
    description: "Avoid trades with excessive bid-ask spread",
    category: "market_structure",
    weight: 0.45,
    canBlock: false,
    violationSeverity: "info",
    applicableTo: ["buy", "sell"],
    applicableModes: "all",
  },
  "LAW-24": {
    id: "LAW-24",
    name: "Volatility Filter",
    description: "Pause trading in extreme volatility environments",
    category: "market_structure",
    weight: 0.65,
    canBlock: true,
    violationSeverity: "critical",
    applicableTo: ["buy"],
    applicableModes: "all",
  },

  // ─── Portfolio Management (LAW-25 to LAW-27) ─────────────────────

  "LAW-25": {
    id: "LAW-25",
    name: "Sector Diversification",
    description: "No more than 30% of portfolio in any single sector",
    category: "portfolio_management",
    weight: 0.7,
    canBlock: false,
    violationSeverity: "warning",
    applicableTo: ["buy"],
    applicableModes: "all",
  },
  "LAW-26": {
    id: "LAW-26",
    name: "Correlation Check",
    description: "New positions should not be highly correlated with existing holdings",
    category: "portfolio_management",
    weight: 0.6,
    canBlock: false,
    violationSeverity: "warning",
    applicableTo: ["buy"],
    applicableModes: "all",
  },
  "LAW-27": {
    id: "LAW-27",
    name: "Rebalance Trigger",
    description: "Rebalance when any position deviates more than 5% from target allocation",
    category: "portfolio_management",
    weight: 0.4,
    canBlock: false,
    violationSeverity: "info",
    applicableTo: ["hold"],
    applicableModes: "all",
  },

  // ─── Behavioral (LAW-28 to LAW-29) ───────────────────────────────

  "LAW-28": {
    id: "LAW-28",
    name: "Cooldown Period",
    description: "Wait a minimum time between trades on the same symbol",
    category: "behavioral",
    weight: 0.5,
    canBlock: false,
    violationSeverity: "warning",
    applicableTo: ["buy"],
    applicableModes: "all",
  },
  "LAW-29": {
    id: "LAW-29",
    name: "Revenge Trading",
    description: "Do not increase position size after a losing trade",
    category: "behavioral",
    weight: 0.6,
    canBlock: false,
    violationSeverity: "warning",
    applicableTo: ["buy"],
    applicableModes: "all",
  },

  // ─── Execution (LAW-30) ──────────────────────────────────────────

  "LAW-30": {
    id: "LAW-30",
    name: "Compliance Score Gate",
    description: "Composite compliance score must meet mode-dependent minimum threshold",
    category: "execution",
    weight: 1.0,
    canBlock: true,
    violationSeverity: "blocking",
    applicableTo: "all",
    applicableModes: "all",
  },
};

/** Ordered list of all trading laws */
export const TRADING_LAWS_LIST: LawDefinition[] = Object.values(TRADING_LAWS);

/** Laws grouped by category */
export const LAWS_BY_CATEGORY: Record<string, LawDefinition[]> =
  TRADING_LAWS_LIST.reduce(
    (acc, law) => {
      const list = acc[law.category] ?? [];
      list.push(law);
      acc[law.category] = list;
      return acc;
    },
    {} as Record<string, LawDefinition[]>,
  );

/** All law IDs */
export const ALL_LAW_IDS: LawId[] = Object.keys(TRADING_LAWS) as LawId[];
