export type CreditAction =
  | "signal_analysis"
  | "trade_execution"
  | "backtest_standard"
  | "backtest_ai"
  | "chat_message"
  | "dispute_letter_single"
  | "dispute_letter_all"
  | "credit_analysis"
  | "monthly_reset"
  | "credit_purchase"
  | "addon_credit";

export interface CreditBalance {
  userId: string;
  creditBalance: number;
  subscriptionAllowance: number;
  purchasedCredits: number;
  periodStart: Date;
  periodEnd: Date;
  usedThisPeriod: number;
}

export interface CreditTransaction {
  id: string;
  userId: string;
  actionType: CreditAction;
  creditsConsumed: number;
  creditsAdded: number;
  balanceAfter: number;
  aiModel?: string;
  tokensInput?: number;
  tokensOutput?: number;
  rawCostUsd?: number;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export type CreditPackType = "starter" | "value" | "power";
export type AddonBundleType =
  | "ai_trading_boost"
  | "credit_repair_pro"
  | "family_member";

export interface CreditPack {
  type: CreditPackType;
  credits: number;
  priceUsd: number;
  priceCents: number;
  perCredit: number;
}

export interface AddonBundle {
  type: AddonBundleType;
  name: string;
  description: string;
  priceUsd: number;
  creditsPerPeriod: number;
}
