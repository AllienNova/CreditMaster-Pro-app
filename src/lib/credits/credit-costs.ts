import type { CreditAction, CreditPack, AddonBundle } from "./types";

export const CREDIT_COSTS: Record<CreditAction, number> = {
  signal_analysis: 50,
  trade_execution: 2,
  backtest_standard: 60,
  backtest_ai: 500,
  chat_message: 15,
  dispute_letter_single: 50,
  dispute_letter_all: 150,
  credit_analysis: 12,
  monthly_reset: 0,
  credit_purchase: 0,
  addon_credit: 0,
};

export const CREDIT_PACKS: CreditPack[] = [
  {
    type: "starter",
    credits: 1000,
    priceUsd: 4.99,
    priceCents: 499,
    perCredit: 0.00499,
  },
  {
    type: "value",
    credits: 5000,
    priceUsd: 19.99,
    priceCents: 1999,
    perCredit: 0.003998,
  },
  {
    type: "power",
    credits: 15000,
    priceUsd: 49.99,
    priceCents: 4999,
    perCredit: 0.003333,
  },
];

export const ADDON_BUNDLES: AddonBundle[] = [
  {
    type: "ai_trading_boost",
    name: "AI Trading Boost",
    description: "Extra credits for signal analysis and AI backtests",
    priceUsd: 19.99,
    creditsPerPeriod: 3000,
  },
  {
    type: "credit_repair_pro",
    name: "Credit Repair Pro",
    description: "Unlimited dispute letters and credit analyses",
    priceUsd: 14.99,
    creditsPerPeriod: 2000,
  },
  {
    type: "family_member",
    name: "Additional Family Member",
    description: "Add a family member with their own credit allowance",
    priceUsd: 9.99,
    creditsPerPeriod: 1500,
  },
];

export const TIER_CREDITS: Record<string, number> = {
  free: 500,
  standard: 5000,
  pro: 15000,
  "family-duo": 25000,
  family: 35000,
  "family-plus": 50000,
};

export function getActionCost(action: CreditAction): number {
  return CREDIT_COSTS[action];
}

export function estimateCost(actions: CreditAction[]): number {
  return actions.reduce((sum, action) => sum + CREDIT_COSTS[action], 0);
}
