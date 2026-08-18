/**
 * Fynvita Mobile Financial API Service
 * Handles banking, budgets, transactions, goals, and debt management
 */

import { api } from "./client";
import type {
  AccountType,
  BankAccount,
  Transaction,
  Budget,
  FinancialGoal,
  GoalType,
  ApiResponse,
  PaginatedResponse,
} from "./types";

// Bank Account Types
export interface PlaidLinkToken {
  linkToken: string;
  expiration: string;
}

export interface PlaidExchangeResult {
  success: boolean;
  accountsConnected: number;
}

// ---------------------------------------------------------------------------
// Financial dashboard — web -> mobile adapter (PARITY-P1)
// ---------------------------------------------------------------------------
// The real web route (GET /api/financial/dashboard) returns the full aggregate
// from financialService.getFinancialDashboard. Alongside the headline numbers it
// carries `spendingByCategory` (per-category month spend) and `monthlyTrend`
// (6-month income/expense/savings history). The mobile client previously declared
// a narrower shape that DROPPED both, so the dashboard tab had no real source for
// its spending breakdown or its month-over-month delta and fell back to hardcoded
// values. Surface the real fields; ignore web-only extras (accounts,
// recentTransactions, cashFlow).
export interface DashboardCategorySpending {
  category: string;
  amount: number;
  percentage: number;
  transactionCount: number;
}

export interface DashboardMonthlyTrend {
  month: string;
  income: number;
  expenses: number;
  savings: number;
}

export interface FinancialDashboardData {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsRate: number;
  spendingByCategory: DashboardCategorySpending[];
  monthlyTrend: DashboardMonthlyTrend[];
}

interface WebFinancialDashboard {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsRate: number;
  spendingByCategory?: {
    category: string;
    amount: number;
    percentage: number;
    transactionCount?: number;
  }[];
  monthlyTrend?: {
    month: string;
    income: number;
    expenses: number;
    savings: number;
  }[];
}

export function mapWebDashboard(
  d: WebFinancialDashboard,
): FinancialDashboardData {
  return {
    netWorth: d.netWorth,
    totalAssets: d.totalAssets,
    totalLiabilities: d.totalLiabilities,
    monthlyIncome: d.monthlyIncome,
    monthlyExpenses: d.monthlyExpenses,
    savingsRate: d.savingsRate,
    spendingByCategory: Array.isArray(d.spendingByCategory)
      ? d.spendingByCategory.map((c) => ({
          category: c.category,
          amount: c.amount,
          percentage: c.percentage,
          transactionCount: c.transactionCount ?? 0,
        }))
      : [],
    monthlyTrend: Array.isArray(d.monthlyTrend)
      ? d.monthlyTrend.map((m) => ({
          month: m.month,
          income: m.income,
          expenses: m.expenses,
          savings: m.savings,
        }))
      : [],
  };
}

// ---------------------------------------------------------------------------
// AI insights — web -> mobile adapter (PARITY-P1)
// ---------------------------------------------------------------------------
// The real web route (GET /api/ai/insights, withAuth) is what the web /insights
// page renders. It returns an InsightsResponse whose `insights` array is
// CoachingInsight[] = { type, title, description, data? } — a NARROW 4-value type
// union (observation|suggestion|warning|celebration) with NO id, priority, amount,
// or action fields. The mobile screen previously rendered a fabricated 6-type
// Insight carrying invented priority/amount/action data; adapt the real, narrower
// shape at the boundary instead of faking those fields. The source carries no id,
// so derive a stable one from list position.
export type InsightType =
  | "observation"
  | "suggestion"
  | "warning"
  | "celebration";

export interface Insight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
}

interface WebCoachingInsight {
  type?: string;
  title?: string;
  description?: string;
  data?: Record<string, unknown>;
}

// The /api/ai/insights payload also carries `coaching` and `personality`; the
// mobile screen renders only the insights list, so the rest is ignored here.
interface WebInsightsResponse {
  insights?: WebCoachingInsight[];
}

const INSIGHT_TYPES: readonly InsightType[] = [
  "observation",
  "suggestion",
  "warning",
  "celebration",
];

export function mapWebInsight(raw: WebCoachingInsight, index: number): Insight {
  const type =
    raw.type && (INSIGHT_TYPES as readonly string[]).includes(raw.type)
      ? (raw.type as InsightType)
      : "observation";
  return {
    id: `insight-${index}`,
    type,
    title: raw.title ?? "",
    description: raw.description ?? "",
  };
}

// ---------------------------------------------------------------------------
// Cash flow — web -> mobile adapter (PARITY-P2)
// ---------------------------------------------------------------------------
// The mobile Cash Flow screen (app/financial/cash-flow.tsx) renders 6 months of
// income vs expenses plus cash-flow recommendations. Its honest source is
// GET /api/financial/spending/cashflow (withAuth) ->
// spendingAnalysisService.getCashFlowAnalysis, which derives each month's income
// and expenses from the user's real Plaid transactions and returns a
// CashFlowAnalysis: { monthlyData: [{ month, monthLabel, income, expenses,
// netFlow, savingsRate }], summary, trends, health, recommendations }.
//
// The old getCashFlow / getSpendingInsights methods pointed at
// /financial/insights/{cashflow,spending} — routes that DO NOT EXIST (the real
// cash-flow route lives under /financial/spending/cashflow) — and declared shapes
// those routes never return. Every call 404'd and the callers (cash-flow.tsx and
// spending.tsx) silently fell back to hardcoded mock arrays, so real users saw
// invented figures. Both dead methods were deleted once those screens moved onto
// this adapter, which carries only the fields the endpoint truly provides; nothing
// is fabricated (an absent income/expenses becomes 0, an absent month becomes an
// empty label, absent recommendations become []).
export interface CashFlowMonthPoint {
  month: string; // short label, e.g. "Jan" (from monthLabel); "" when the source omits it
  income: number;
  expenses: number;
}

export interface CashFlowAnalysisData {
  months: CashFlowMonthPoint[];
  recommendations: string[];
}

interface WebCashFlowAnalysis {
  monthlyData?: {
    month?: string;
    monthLabel?: string;
    income?: number;
    expenses?: number;
  }[];
  recommendations?: string[];
}

// monthLabel is "Jan 2026"; the chart shows a compact month, so take the first
// token. Fall back to the ISO `month` ("2026-01") when the label is absent. This
// only reformats the real value — it never invents one.
function shortMonthLabel(monthLabel?: string, month?: string): string {
  const source = monthLabel ?? month ?? "";
  return source.split(" ")[0];
}

export function mapWebCashFlow(raw: WebCashFlowAnalysis): CashFlowAnalysisData {
  const months = Array.isArray(raw.monthlyData)
    ? raw.monthlyData.map((m) => ({
        month: shortMonthLabel(m.monthLabel, m.month),
        income: m.income ?? 0,
        expenses: m.expenses ?? 0,
      }))
    : [];
  return {
    months,
    recommendations: Array.isArray(raw.recommendations)
      ? raw.recommendations
      : [],
  };
}

// ---------------------------------------------------------------------------
// Spending analysis — web -> mobile adapter (PARITY)
// ---------------------------------------------------------------------------
// The Insights > Spending Analysis screen (app/insights/spending.tsx) renders the
// user's real spending broken down by category, the patterns detected in it, and
// the resulting recommendations. Its honest source is POST
// /api/financial/spending/analyze (withPermission "financial:read") ->
// spendingAnalysisService.analyzeSpending, a DETERMINISTIC (no-LLM) analysis of the
// user's real Plaid transactions for a date range. It returns a SpendingAnalysisResult:
// { totalSpending, averageDailySpending, byCategory[], anomalies[], patterns[],
//   insights[], comparison{ spendingChangePercent, categoryChanges[] } }.
//
// The screen previously rendered a hardcoded MOCK_ANALYSIS (invented totals,
// categories, an overall "risk score", per-category budgets, a monthly projection,
// and pattern/recommendation copy) behind a fake setTimeout, so every user saw the
// same fabricated figures. This adapter carries only the fields the endpoint truly
// provides:
//   - each category's `trend`/`trendPercent` come from the REAL period-over-period
//     `comparison.categoryChanges[cat].changePercent` (joined by category key), NOT
//     the service's placeholder per-category `trend`, which is always "stable".
//   - `patterns` merge the real `anomalies` (z-score / duplicate detections), the
//     recurring/weekend `patterns`, and savings-opportunity `insights`; every
//     `impact` string is built from a REAL amount on the payload.
//   - `recommendations` are the real `insights[].actionSuggestion` values.
// Fields the endpoint does NOT provide are omitted rather than faked: there is no
// overall spending "risk score", no monthly projection, and no per-category budget in
// this path (budget tracking lives on app/financial/budgets.tsx).
export type SpendingTrendDirection = "up" | "down" | "stable";
export type SpendingPatternKind =
  | "anomaly"
  | "trend"
  | "recurring"
  | "opportunity";
export type SpendingSeverity = "low" | "medium" | "high";

export interface SpendingAnalysisCategory {
  name: string;
  amount: number;
  percentOfTotal: number; // real share of total spending, 0-100
  trend: SpendingTrendDirection; // from the real period-over-period change
  trendPercent: number; // |changePercent|, rounded; 0 when stable/unknown
  transactionCount: number;
}

export interface SpendingAnalysisPattern {
  id: string;
  kind: SpendingPatternKind;
  title: string;
  description: string;
  impact: string; // human-readable, always derived from a real amount
  severity: SpendingSeverity;
}

export interface SpendingAnalysisData {
  totalSpending: number;
  transactionCount: number;
  averageTransaction: number;
  dailyAverage: number;
  comparedToLastPeriod: number; // percent vs the previous period
  categories: SpendingAnalysisCategory[];
  patterns: SpendingAnalysisPattern[];
  recommendations: string[];
}

// Date range for the analyze request. The screen maps its 7d/30d/90d filter to this.
export interface SpendingAnalysisRange {
  startDate: string; // ISO 8601
  endDate: string; // ISO 8601
}

interface WebCategorySpending {
  category?: string;
  displayName?: string;
  amount?: number;
  percentage?: number;
  transactionCount?: number;
}
interface WebSpendingAnomaly {
  id?: string;
  type?: string;
  severity?: SpendingSeverity;
  description?: string;
  amount?: number;
  category?: string;
}
interface WebSpendingPatternRaw {
  type?: string;
  description?: string;
  averageAmount?: number;
}
interface WebSpendingInsightRaw {
  id?: string;
  title?: string;
  description?: string;
  potentialSavings?: number;
  actionSuggestion?: string;
}
interface WebCategoryChange {
  category?: string;
  changePercent?: number;
}
interface WebSpendingAnalysis {
  totalSpending?: number;
  averageDailySpending?: number;
  byCategory?: WebCategorySpending[];
  anomalies?: WebSpendingAnomaly[];
  patterns?: WebSpendingPatternRaw[];
  insights?: WebSpendingInsightRaw[];
  comparison?: {
    spendingChangePercent?: number;
    categoryChanges?: WebCategoryChange[];
  };
}

// ±5% matches the service's own trend threshold (calculateTrend); below it a
// category is "stable" rather than up/down.
const CATEGORY_TREND_THRESHOLD_PCT = 5;

const ANOMALY_TITLES: Record<string, string> = {
  unusual_large_transaction: "Large transaction",
  unusual_merchant: "Unusual merchant",
  unusual_category: "Unusual category spend",
  unusual_frequency: "Unusual frequency",
  duplicate_charge: "Possible duplicate charge",
  subscription_increase: "Subscription increase",
};

const PATTERN_TITLES: Record<string, string> = {
  recurring_subscription: "Recurring subscription",
  weekly_spending: "Weekly spending pattern",
  payday_spending: "Payday spending pattern",
  seasonal_spending: "Seasonal spending pattern",
  weekend_spending: "Weekend spending pattern",
};

function usd(amount: number): string {
  return `$${Math.round(amount).toLocaleString("en-US")}`;
}

export function mapWebSpendingAnalysis(
  raw: WebSpendingAnalysis,
): SpendingAnalysisData {
  const byCategory = Array.isArray(raw.byCategory) ? raw.byCategory : [];
  const anomalies = Array.isArray(raw.anomalies) ? raw.anomalies : [];
  const patternsRaw = Array.isArray(raw.patterns) ? raw.patterns : [];
  const insights = Array.isArray(raw.insights) ? raw.insights : [];
  const categoryChanges = Array.isArray(raw.comparison?.categoryChanges)
    ? raw.comparison!.categoryChanges!
    : [];

  const changeByCategory = new Map<string, number>();
  for (const c of categoryChanges) {
    if (c.category != null) {
      changeByCategory.set(c.category, c.changePercent ?? 0);
    }
  }

  const totalSpending = raw.totalSpending ?? 0;
  const transactionCount = byCategory.reduce(
    (sum, c) => sum + (c.transactionCount ?? 0),
    0,
  );

  const categories: SpendingAnalysisCategory[] = byCategory.map((c) => {
    const changePct = changeByCategory.get(c.category ?? "") ?? 0;
    const trend: SpendingTrendDirection =
      changePct > CATEGORY_TREND_THRESHOLD_PCT
        ? "up"
        : changePct < -CATEGORY_TREND_THRESHOLD_PCT
          ? "down"
          : "stable";
    return {
      name: c.displayName ?? c.category ?? "Other",
      amount: c.amount ?? 0,
      percentOfTotal: c.percentage ?? 0,
      trend,
      trendPercent: Math.round(Math.abs(changePct)),
      transactionCount: c.transactionCount ?? 0,
    };
  });

  const patterns: SpendingAnalysisPattern[] = [];
  anomalies.forEach((a, i) => {
    patterns.push({
      id: a.id ?? `anomaly-${i}`,
      kind: "anomaly",
      title: ANOMALY_TITLES[a.type ?? ""] ?? "Unusual activity",
      description: a.description ?? "",
      impact: usd(a.amount ?? 0),
      severity: a.severity ?? "medium",
    });
  });
  patternsRaw.forEach((p, i) => {
    patterns.push({
      id: `pattern-${i}`,
      kind: p.type === "recurring_subscription" ? "recurring" : "trend",
      title: PATTERN_TITLES[p.type ?? ""] ?? "Spending pattern",
      description: p.description ?? "",
      impact: `${usd(p.averageAmount ?? 0)} avg`,
      severity: "low",
    });
  });
  insights.forEach((ins, i) => {
    if (typeof ins.potentialSavings === "number" && ins.potentialSavings > 0) {
      patterns.push({
        id: ins.id ?? `opportunity-${i}`,
        kind: "opportunity",
        title: ins.title ?? "Savings opportunity",
        description: ins.description ?? "",
        impact: `Save ${usd(ins.potentialSavings)}`,
        severity: "low",
      });
    }
  });

  const recommendations = insights
    .map((ins) => ins.actionSuggestion)
    .filter((s): s is string => typeof s === "string" && s.length > 0);

  return {
    totalSpending,
    transactionCount,
    averageTransaction:
      transactionCount > 0
        ? Math.round((totalSpending / transactionCount) * 100) / 100
        : 0,
    dailyAverage: raw.averageDailySpending ?? 0,
    comparedToLastPeriod: raw.comparison?.spendingChangePercent ?? 0,
    categories,
    patterns,
    recommendations,
  };
}

// ---------------------------------------------------------------------------
// Net worth — web -> mobile adapter (PARITY)
// ---------------------------------------------------------------------------
// The mobile Net Worth screen (app/financial/net-worth.tsx) renders the user's
// assets, liabilities, and net worth. Its honest source is GET
// /api/financial/accounts (withPermission "financial:read") ->
// plaidService.getAccounts, which returns PlaidAccount[] straight through as the
// response `data` (a bare array, NOT { accounts: [...] }). Each PlaidAccount carries
// accountType ("depository" | "credit" | "loan" | "investment"), accountSubtype,
// accountName, and currentBalance (Date columns serialize to ISO strings over HTTP;
// the net-worth view reads none of them).
//
// The screen previously classified accounts by balance SIGN (balance > 0 = asset,
// balance < 0 = liability) and, on any gap, silently fell back to hardcoded
// MOCK_ASSETS / MOCK_LIABILITIES / MOCK_HISTORY. That sign rule is wrong for Plaid:
// credit and loan balances are POSITIVE (the amount owed), so every debt was
// miscounted as an asset. This adapter instead classifies by accountType exactly as
// the web dashboard does (src/lib/financial/financial-service.ts:127): depository +
// investment are assets (summed at currentBalance); credit + loan are liabilities
// (summed at |currentBalance|); any other or absent type is excluded from net worth,
// matching web. Nothing is fabricated — an absent balance becomes 0 and an absent
// name an empty string. There is NO honest month-over-month net-worth series (the
// dashboard's monthlyTrend is income/expense/savings, not net worth), so the screen
// omits the history chart rather than invent one.
export type NetWorthAccountType =
  | "depository"
  | "credit"
  | "loan"
  | "investment";

export interface NetWorthAccount {
  id: string;
  name: string; // from accountName
  value: number; // assets: currentBalance; liabilities: |currentBalance|
  accountType: NetWorthAccountType;
  subtype: string; // from accountSubtype
}

export interface NetWorthData {
  assets: NetWorthAccount[];
  liabilities: NetWorthAccount[];
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
}

// Raw account as returned by GET /api/financial/accounts (PlaidAccount, defined in
// src/lib/financial/plaid-service.ts). Only the fields the net-worth view reads are
// declared; each is optional and tolerant so a partial payload never throws.
interface WebAccount {
  id?: string;
  accountId?: string;
  accountName?: string;
  accountType?: string;
  accountSubtype?: string;
  currentBalance?: number;
}

const ASSET_ACCOUNT_TYPES = ["depository", "investment"] as const;
const LIABILITY_ACCOUNT_TYPES = ["credit", "loan"] as const;

function isAssetType(t: string): t is "depository" | "investment" {
  return (ASSET_ACCOUNT_TYPES as readonly string[]).includes(t);
}

function isLiabilityType(t: string): t is "credit" | "loan" {
  return (LIABILITY_ACCOUNT_TYPES as readonly string[]).includes(t);
}

export function mapWebAccountsToNetWorth(raw: WebAccount[]): NetWorthData {
  const assets: NetWorthAccount[] = [];
  const liabilities: NetWorthAccount[] = [];

  for (const a of raw) {
    const type = a.accountType ?? "";
    const balance = a.currentBalance ?? 0;
    const base = {
      id: a.id ?? a.accountId ?? "",
      name: a.accountName ?? "",
      subtype: a.accountSubtype ?? "",
    };
    if (isAssetType(type)) {
      assets.push({ ...base, accountType: type, value: balance });
    } else if (isLiabilityType(type)) {
      liabilities.push({ ...base, accountType: type, value: Math.abs(balance) });
    }
    // Any other or absent accountType is excluded from net worth, matching the
    // web dashboard's classification — never guessed into a bucket.
  }

  const totalAssets = assets.reduce((sum, a) => sum + a.value, 0);
  const totalLiabilities = liabilities.reduce((sum, l) => sum + l.value, 0);

  return {
    assets,
    liabilities,
    totalAssets,
    totalLiabilities,
    netWorth: totalAssets - totalLiabilities,
  };
}

// Financial Overview
export const financialOverviewApi = {
  /**
   * Get financial dashboard overview. The web route returns the full aggregate
   * (headline numbers + spendingByCategory + monthlyTrend); adapt web -> mobile
   * so the store/screens see one shape. Never fabricate on failure — pass the
   * error through.
   */
  getDashboard: async (): Promise<ApiResponse<FinancialDashboardData>> => {
    const res = await api.get<WebFinancialDashboard>("/financial/dashboard");
    if (res.success && res.data) {
      return { success: true, data: mapWebDashboard(res.data) };
    }
    return { success: false, error: res.error };
  },

  /**
   * Get personalized AI insights. Hits the same real route the web /insights page
   * uses (GET /api/ai/insights, withAuth); extract the `insights` list and adapt
   * each web CoachingInsight to the mobile Insight shape. Never fabricate on
   * failure — pass the error through.
   */
  getInsights: async (): Promise<ApiResponse<{ insights: Insight[] }>> => {
    const res = await api.get<WebInsightsResponse>("/ai/insights");
    if (res.success && res.data) {
      const raw = Array.isArray(res.data.insights) ? res.data.insights : [];
      return { success: true, data: { insights: raw.map(mapWebInsight) } };
    }
    return { success: false, error: res.error };
  },

  /**
   * Get cash flow analysis. Hits the real route GET /api/financial/spending/cashflow
   * (withAuth) and adapts the CashFlowAnalysis payload web -> mobile via
   * mapWebCashFlow. Each month's income/expenses are derived from the user's real
   * Plaid transactions server-side; a failed request passes straight through without
   * fabricating data. Consumed by app/financial/cash-flow.tsx.
   */
  getCashFlowAnalysis: async (
    months?: number,
  ): Promise<ApiResponse<CashFlowAnalysisData>> => {
    const res = await api.get<WebCashFlowAnalysis>(
      `/financial/spending/cashflow${months ? `?months=${months}` : ""}`,
    );
    if (res.success && res.data) {
      return { success: true, data: mapWebCashFlow(res.data) };
    }
    return { success: false, error: res.error };
  },

  /**
   * Get the user's net worth. Hits the real route GET /api/financial/accounts
   * (withPermission "financial:read"), which returns PlaidAccount[] as the response
   * data, and splits those accounts into assets vs liabilities via
   * mapWebAccountsToNetWorth — classifying by accountType exactly as the web
   * dashboard does. A failed request passes straight through without fabricating
   * data. Consumed by app/financial/net-worth.tsx.
   */
  getNetWorth: async (): Promise<ApiResponse<NetWorthData>> => {
    const res = await api.get<WebAccount[]>("/financial/accounts");
    if (res.success && res.data) {
      const raw = Array.isArray(res.data) ? res.data : [];
      return { success: true, data: mapWebAccountsToNetWorth(raw) };
    }
    return { success: false, error: res.error };
  },

  /**
   * Get the user's spending analysis for a date range. Hits the real route POST
   * /api/financial/spending/analyze (withPermission "financial:read") ->
   * spendingAnalysisService.analyzeSpending, a deterministic analysis of the user's
   * real Plaid transactions, and adapts the payload web -> mobile via
   * mapWebSpendingAnalysis. A failed request passes straight through without
   * fabricating data. Consumed by app/insights/spending.tsx.
   */
  getSpendingAnalysis: async (
    range: SpendingAnalysisRange,
  ): Promise<ApiResponse<SpendingAnalysisData>> => {
    const res = await api.post<WebSpendingAnalysis>(
      "/financial/spending/analyze",
      { startDate: range.startDate, endDate: range.endDate },
    );
    if (res.success && res.data) {
      return { success: true, data: mapWebSpendingAnalysis(res.data) };
    }
    return { success: false, error: res.error };
  },
};

// ---------------------------------------------------------------------------
// Bank connections — the unit the user actually grants and revokes
// ---------------------------------------------------------------------------
// A user connects an INSTITUTION, not an account: one Plaid Item, one consent,
// N accounts. Revocation has the same granularity — /item/remove takes an
// access_token and ends the whole Item. GET /api/financial/connections is the
// only surface that carries the institution, the consent state, and an id that
// can be revoked; /financial/accounts carries none of them.
//
// This replaces app/settings/connected-accounts.tsx's hardcoded array, which
// showed every user three "connected" credit bureaus plus Chase, Marcus and
// Fidelity, with a Disconnect button that filtered local state and a Reconnect
// button that set the status to "connected" and the sync time to "Just now".

export type BankConnectionStatus = "active" | "needs_attention";

export interface BankConnectionAccount {
  id: string;
  accountName: string;
  /** Plaid's raw type: depository | credit | loan | investment | other. */
  accountType: string;
  accountSubtype: string;
  mask: string;
  currentBalance: number;
  currency: string;
  /** ISO 8601 — the real last sync, never a relative phrase. */
  lastSynced: string;
}

export interface BankConnection {
  id: string;
  provider: string;
  institutionId: string | null;
  /** Null when Plaid could not resolve it — never a plausible bank name. */
  institutionName: string | null;
  status: BankConnectionStatus;
  errorCode: string | null;
  errorMessage: string | null;
  consentExpiresAt: string | null;
  createdAt: string;
  accounts: BankConnectionAccount[];
}

/**
 * Plaid's account types are not the five the mobile UI models. `depository`
 * splits into checking vs savings by SUBTYPE, and anything unrecognised stays
 * "other" rather than being rounded into whichever bucket looks closest — a
 * loan filed as checking would be counted as an asset.
 */
export function toMobileAccountType(
  plaidType: string,
  plaidSubtype: string,
): AccountType {
  if (plaidType === "depository") {
    return plaidSubtype === "savings" ? "savings" : "checking";
  }
  if (plaidType === "credit") return "credit";
  if (plaidType === "loan") return "loan";
  if (plaidType === "investment") return "investment";
  return "other";
}

/**
 * Flatten connections into the flat account list the stores and tabs render.
 *
 * Every field has a real source, which is why the flattening happens here
 * rather than off /financial/accounts: `institutionName` comes from the
 * CONNECTION (the accounts route's own institution_name held the account's
 * name until this change), and `isConnected` comes from the connection's
 * webhook-derived status. Neither is answerable from an account row alone, and
 * the previous code answered them anyway.
 */
export function flattenConnectionsToAccounts(
  connections: BankConnection[],
): BankAccount[] {
  return connections.flatMap((connection) =>
    connection.accounts.map((account) => {
      const accountType = toMobileAccountType(
        account.accountType,
        account.accountSubtype,
      );
      return {
        id: account.id,
        // The route scopes every row to the caller, so it does not echo the
        // owner back and there is nothing to read here. Empty, matching the
        // `?? ""` convention used for absent ids elsewhere in this file —
        // nothing renders it, and an invented id would be worse than none.
        userId: "",
        institutionName: connection.institutionName ?? "",
        accountType,
        type: accountType,
        accountName: account.accountName,
        name: account.accountName,
        balance: account.currentBalance,
        lastSynced: account.lastSynced,
        isConnected: connection.status === "active",
      };
    }),
  );
}

export const bankConnectionApi = {
  /** Every bank the caller has linked, each with the accounts it granted. */
  getConnections: () =>
    api.get<{ connections: BankConnection[] }>("/financial/connections"),

  /**
   * Revoke a connection at the provider and remove it here.
   *
   * A 502 means Plaid refused and NOTHING was changed — the bank is still
   * connected and retrying is the correct next step. Callers must not treat a
   * failure as a removal.
   */
  disconnect: (connectionId: string) =>
    api.delete<{ success: boolean }>(
      `/financial/connections/${connectionId}`,
    ),
};

// Bank Account Endpoints
export const bankAccountApi = {
  /**
   * Get all connected bank accounts.
   *
   * Reads /financial/connections and flattens, NOT /financial/accounts. Two
   * reasons, both defects this replaces:
   *
   *  1. GET /api/financial/accounts answers with plaidService.getAccounts()'s
   *     result as a bare array (`{ success, data: PlaidAccount[] }`), while
   *     this helper declared `{ accounts: BankAccount[] }` and accountStore
   *     read `response.data.accounts` — always undefined. The financial tab's
   *     "N connected" therefore read 0 for every user, however many banks they
   *     had linked.
   *  2. Even with the shape corrected, an account row cannot answer
   *     `institutionName` or `isConnected` honestly. The connection can.
   */
  getAccounts: () =>
    api.get<{ connections: BankConnection[] }>("/financial/connections"),

  /**
   * Get single account details
   */
  getAccount: (accountId: string) =>
    api.get<BankAccount>(`/financial/accounts/${accountId}`),

  /**
   * Get Plaid link token for connecting new accounts
   */
  getPlaidLinkToken: () =>
    api.post<PlaidLinkToken>("/financial/plaid/link-token"),

  /**
   * Exchange Plaid public token for access
   */
  exchangePlaidToken: (
    publicToken: string,
    metadata?: Record<string, unknown>,
  ) =>
    // The route is /financial/plaid/exchange-token (src/app/api/financial/plaid/
    // exchange-token/route.ts:14 reads `publicToken` from the body). This asked
    // for /exchange, which does not exist — so every bank link made through
    // this helper 404'd at the final step, after the user had already completed
    // the Plaid flow and handed over their credentials. PlaidHostedLink.tsx
    // calls the correct path; only this one drifted.
    api.post<PlaidExchangeResult>("/financial/plaid/exchange-token", {
      publicToken,
      metadata,
    }),

  /**
   * Refresh account data.
   *
   * The route is /financial/accounts/[accountId]/sync — this asked for
   * /refresh, which does not exist, so every pull-to-refresh on an account
   * 404'd. Same naming drift as the exchange-token helper above: two names for
   * one operation, and only one of them was ever built.
   */
  refreshAccount: (accountId: string) =>
    api.post<BankAccount>(`/financial/accounts/${accountId}/sync`),

};

// Transaction Endpoints
export const transactionApi = {
  /**
   * Get all transactions
   */
  getAll: (params?: {
    page?: number;
    limit?: number;
    accountId?: string;
    category?: string;
    startDate?: string;
    endDate?: string;
    type?: "income" | "expense" | "transfer";
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.accountId) queryParams.append("accountId", params.accountId);
    if (params?.category) queryParams.append("category", params.category);
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    if (params?.endDate) queryParams.append("endDate", params.endDate);
    if (params?.type) queryParams.append("type", params.type);
    const query = queryParams.toString();
    return api.get<PaginatedResponse<Transaction>>(
      `/financial/transactions${query ? `?${query}` : ""}`,
    );
  },

  /**
   * Get transaction categories
   */
  getCategories: () =>
    api.get<{ categories: string[] }>("/financial/transactions/categories", {
      enableCache: true,
    }),

  /**
   * Update transaction category
   */
  updateCategory: (transactionId: string, category: string) =>
    api.patch<Transaction>(`/financial/transactions/${transactionId}`, {
      category,
    }),

  /**
   * Search transactions
   */
  search: (query: string) =>
    api.get<{ transactions: Transaction[] }>(
      `/financial/transactions/search?q=${encodeURIComponent(query)}`,
    ),
};

// ── Budget overview (real source: GET /api/financial/budgets/summary) ─────────
// budgetService.getBudgetSummary returns the authenticated user's real budget
// aggregates: totals, an overall percent-used, a monthly period summary (with
// daysRemaining), and the top over-/under-budget categories. Date fields inside
// periodSummary arrive as ISO strings over JSON, but this view-model needs only the
// numeric daysRemaining.
//
// The smart-budget overview screen previously rendered a hardcoded BudgetAnalysis
// (invented $5,000 budgeted / $3,200 spent / 64% used / 12 days left) behind a fake
// setTimeout, so every user saw the same figures. This adapter carries ONLY the
// fields the endpoint truly provides. Alerts are not fabricated: each is derived from
// the payload's own topOverspentCategories — real over-budget categories — with a
// message formatted from that category's real name and real dollar overage (the same
// over-budget signal the web budgetService itself emits). A user with no budgets
// yields all-zero totals and no alerts, which the screen empty-states rather than
// dressing up as a real budget.

interface WebBudgetCategorySummary {
  category: string;
  categoryDisplayName: string;
  // spentAmount - budgetedAmount for an overspent category (a positive overage).
  variance: number;
}

interface WebBudgetPeriodSummary {
  daysRemaining: number;
}

export interface WebBudgetSummary {
  totalBudgeted: number;
  totalSpent: number;
  totalRemaining: number;
  overallPercentUsed: number;
  topOverspentCategories: WebBudgetCategorySummary[];
  periodSummary: WebBudgetPeriodSummary;
}

/** A real over-budget category, reduced to the alert the overview screen renders. */
export interface BudgetOverviewAlert {
  category: string;
  severity: "high" | "medium" | "low";
  message: string;
}

/** The mobile smart-budget overview view-model — every field sourced, none invented. */
export interface BudgetOverviewData {
  totalBudgeted: number;
  totalSpent: number;
  totalRemaining: number;
  percentUsed: number;
  daysRemaining: number;
  alerts: BudgetOverviewAlert[];
}

/** Coerce a JSON-boundary value to a finite number, defaulting to 0 (never NaN). */
function toFiniteOrZero(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/**
 * Adapt the web budget-summary payload to the mobile BudgetOverviewData view-model.
 * Every rendered field is sourced from the payload; a malformed row degrades to 0
 * rather than fabricating, and alerts derive solely from real over-budget categories.
 */
export function mapBudgetSummary(res: WebBudgetSummary): BudgetOverviewData {
  const overspent = Array.isArray(res.topOverspentCategories)
    ? res.topOverspentCategories
    : [];
  return {
    totalBudgeted: toFiniteOrZero(res.totalBudgeted),
    totalSpent: toFiniteOrZero(res.totalSpent),
    totalRemaining: toFiniteOrZero(res.totalRemaining),
    percentUsed: toFiniteOrZero(res.overallPercentUsed),
    daysRemaining: toFiniteOrZero(res.periodSummary?.daysRemaining),
    // Each alert is a real over-budget category from the same payload; the message
    // formats that category's real name + real dollar overage — no invented data.
    alerts: overspent.map((c) => {
      const name = c.categoryDisplayName || c.category;
      return {
        category: name,
        severity: "high" as const,
        message: `${name} is over budget by $${Math.round(toFiniteOrZero(c.variance))}`,
      };
    }),
  };
}

// Budget Endpoints
export const budgetApi = {
  /**
   * Get all budgets
   */
  getAll: () => api.get<{ budgets: Budget[] }>("/financial/budgets"),

  /**
   * Get budget by category
   */
  getByCategory: (category: string) =>
    api.get<Budget>(`/financial/budgets/${encodeURIComponent(category)}`),

  /**
   * Create or update budget
   */
  upsert: (budget: {
    category: string;
    limit: number;
    period: Budget["period"];
  }) => api.post<Budget>("/financial/budgets", budget),

  /**
   * Delete budget
   */
  delete: (category: string) =>
    api.delete<{ success: boolean }>(
      `/financial/budgets/${encodeURIComponent(category)}`,
    ),

  /**
   * Get budget alerts
   */
  getAlerts: () =>
    api.get<{
      alerts: { category: string; percentUsed: number; remaining: number }[];
    }>("/financial/budgets/alerts"),

  /**
   * Get the real budget overview (totals, overall percent-used, days remaining, and
   * over-budget alerts) from GET /api/financial/budgets/summary, adapted to the mobile
   * BudgetOverviewData view-model by mapBudgetSummary. Replaces the smart-budget
   * screen's former hardcoded BudgetAnalysis. A user with no budgets yields all-zero
   * totals and no alerts — never a fabricated budget.
   */
  getBudgetSummary: async (): Promise<ApiResponse<BudgetOverviewData>> => {
    const res = await api.get<WebBudgetSummary>("/financial/budgets/summary");
    if (res.success && res.data) {
      return { success: true, data: mapBudgetSummary(res.data) };
    }
    return { success: false, error: res.error };
  },
};

// The real web route (GET /api/financial/goals) returns the goals array directly
// as `data` (not `{ goals: [...] }`), each enriched goal carrying `targetDate`
// (no `deadline`), no `userId`, and a wider GoalStatus enum
// (not_started|in_progress|on_track|behind|ahead|completed|paused) than the mobile
// FinancialGoal.status union. Adapt web -> mobile at the boundary so the
// store/screen see one shape. Getting this wrong leaves goals invisible
// (goalStore reads response.data.goals) or mis-filtered (status !== "active").
interface WebFinancialGoal {
  id: string;
  userId?: string;
  type?: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  deadline?: string;
  monthlyContribution?: number;
  status?: string;
}

const WEB_TO_MOBILE_GOAL_STATUS: Record<string, FinancialGoal["status"]> = {
  completed: "completed",
  paused: "paused",
  not_started: "active",
  in_progress: "active",
  on_track: "active",
  behind: "active",
  ahead: "active",
  active: "active",
};

const WEB_TO_MOBILE_GOAL_TYPE: Record<string, GoalType> = {
  emergency_fund: "emergency_fund",
  debt_payoff: "debt_payoff",
  savings: "savings",
  investment: "investment",
  retirement: "retirement",
  education: "education",
  vacation: "vacation",
  home: "home",
  home_down_payment: "home",
  major_purchase: "other",
  custom: "other",
  other: "other",
};

export function mapWebGoal(g: WebFinancialGoal): FinancialGoal {
  const targetDate = g.targetDate ?? g.deadline;
  return {
    id: g.id,
    userId: g.userId ?? "",
    name: g.name,
    type: g.type ? (WEB_TO_MOBILE_GOAL_TYPE[g.type] ?? "other") : undefined,
    targetAmount: g.targetAmount,
    currentAmount: g.currentAmount,
    deadline: targetDate,
    targetDate,
    monthlyContribution: g.monthlyContribution,
    status: g.status ? (WEB_TO_MOBILE_GOAL_STATUS[g.status] ?? "active") : "active",
  };
}

// Financial Goals Endpoints
export const financialGoalsApi = {
  /**
   * Get all financial goals. The web route returns a bare array; adapt each web
   * goal to the mobile FinancialGoal shape and re-wrap as { goals } so the
   * goalStore contract (response.data.goals) holds.
   */
  getAll: async (): Promise<ApiResponse<{ goals: FinancialGoal[] }>> => {
    const res = await api.get<WebFinancialGoal[]>("/financial/goals");
    if (res.success && res.data) {
      const raw = Array.isArray(res.data) ? res.data : [];
      return { success: true, data: { goals: raw.map(mapWebGoal) } };
    }
    return { success: false, error: res.error };
  },

  /**
   * Get single goal
   */
  getById: (goalId: string) =>
    api.get<FinancialGoal>(`/financial/goals/${goalId}`),

  /**
   * Create new goal
   */
  create: (
    goal: Omit<FinancialGoal, "id" | "userId" | "currentAmount" | "status">,
  ) => api.post<FinancialGoal>("/financial/goals", goal),

  /**
   * Update goal
   */
  update: (goalId: string, updates: Partial<FinancialGoal>) =>
    api.patch<FinancialGoal>(`/financial/goals/${goalId}`, updates),

  /**
   * Add contribution to goal
   */
  addContribution: (goalId: string, amount: number) =>
    api.post<FinancialGoal>(`/financial/goals/${goalId}/contribute`, {
      amount,
    }),

  /**
   * Delete goal
   */
  delete: (goalId: string) =>
    api.delete<{ success: boolean }>(`/financial/goals/${goalId}`),
};

// ---------------------------------------------------------------------------
// Debt — web -> mobile adapter (PARITY)
// ---------------------------------------------------------------------------
// The mobile Debt screen (app/financial/debt.tsx) renders the user's real debts, a
// debt summary, and an avalanche-vs-snowball payoff comparison. Its honest source is
// GET /api/financial/debt (withAuth) -> debtService.listDebts + debtPayoffService,
// which returns data: { overview, debts, currentPlan, comparison, milestones,
// insights } (src/app/api/financial/debt/route.ts). With ?compare=true the route also
// computes `comparison` (a StrategyComparison of real avalanche/snowball/hybrid
// PayoffPlans). Over HTTP each PayoffPlan's `payoffDate` Date serializes to an ISO
// string via NextResponse.json.
//
// The mobile client previously declared this route as a FLAT
// { totalDebt, debts, monthlyPayments, projectedPayoffDate } shape — but those
// headline fields actually live under data.overview (totalDebt, totalMinimumPayments)
// and data.currentPlan (payoffDate), so the store read `undefined` for all of them
// (the debt screen additionally hardcoded a MOCK_DEBTS array and a fabricated
// STRATEGIES object with invented interest/months). These adapters map the REAL nested
// payload: getOverview flattens overview+currentPlan for the store/reports; getDebtPlan
// carries the overview, real debts, and the real comparison for the screen. Nothing is
// fabricated — an absent number becomes 0, an absent name an empty string, and an
// unknown debt type falls back to "other".
export type DebtAccountType =
  | "credit_card"
  | "student_loan"
  | "auto_loan"
  | "mortgage"
  | "personal_loan"
  | "medical"
  | "other";

export interface DebtAccount {
  id: string;
  name: string;
  type: DebtAccountType;
  balance: number;
  interestRate: number; // APR as a percentage, e.g. 18.5
  minimumPayment: number;
}

export interface DebtOverviewSummary {
  totalDebt: number;
  totalMinimumPayments: number;
  averageInterestRate: number;
  highestInterestRate: number;
  debtCount: number;
  projectedPayoffDate: string; // from currentPlan.payoffDate (ISO); "" when absent
}

export interface DebtStrategyMetrics {
  totalInterestPaid: number;
  totalMonths: number;
  interestSaved: number; // vs minimum payments only, for the requested extra payment
  monthsSaved: number;
}

export interface DebtStrategyComparison {
  avalanche: DebtStrategyMetrics;
  snowball: DebtStrategyMetrics;
  recommendation: string; // real PayoffStrategy from the route
  recommendationReason: string;
}

export interface DebtPlanData {
  overview: DebtOverviewSummary;
  debts: DebtAccount[];
  comparison: DebtStrategyComparison | null;
}

// Raw shapes as returned by GET /api/financial/debt (after the api client unwraps the
// { success, data } envelope). Only the fields the mobile debt views read are declared;
// each is optional and tolerant so a partial payload never throws.
interface WebDebt {
  id: string;
  name?: string;
  type?: string;
  balance?: number;
  interestRate?: number;
  minimumPayment?: number;
}

interface WebDebtOverview {
  totalDebt?: number;
  totalMinimumPayments?: number;
  averageInterestRate?: number;
  highestInterestRate?: number;
  debtCount?: number;
}

interface WebPayoffPlan {
  totalInterestPaid?: number;
  totalMonths?: number;
  interestSaved?: number;
  monthsSaved?: number;
  payoffDate?: string;
}

interface WebStrategyComparison {
  avalanche?: WebPayoffPlan;
  snowball?: WebPayoffPlan;
  recommendation?: string;
  recommendationReason?: string;
}

interface WebDebtResponse {
  overview?: WebDebtOverview;
  debts?: WebDebt[];
  currentPlan?: WebPayoffPlan;
  comparison?: WebStrategyComparison;
}

const DEBT_ACCOUNT_TYPES: readonly DebtAccountType[] = [
  "credit_card",
  "student_loan",
  "auto_loan",
  "mortgage",
  "personal_loan",
  "medical",
  "other",
];

function toDebtAccountType(type?: string): DebtAccountType {
  return type && (DEBT_ACCOUNT_TYPES as readonly string[]).includes(type)
    ? (type as DebtAccountType)
    : "other";
}

export function mapWebDebt(raw: WebDebt): DebtAccount {
  return {
    id: raw.id,
    name: raw.name ?? "",
    type: toDebtAccountType(raw.type),
    balance: raw.balance ?? 0,
    interestRate: raw.interestRate ?? 0,
    minimumPayment: raw.minimumPayment ?? 0,
  };
}

function mapStrategyMetrics(plan?: WebPayoffPlan): DebtStrategyMetrics {
  return {
    totalInterestPaid: plan?.totalInterestPaid ?? 0,
    totalMonths: plan?.totalMonths ?? 0,
    interestSaved: plan?.interestSaved ?? 0,
    monthsSaved: plan?.monthsSaved ?? 0,
  };
}

export function mapWebDebtPlan(raw: WebDebtResponse): DebtPlanData {
  const o = raw.overview ?? {};
  const overview: DebtOverviewSummary = {
    totalDebt: o.totalDebt ?? 0,
    totalMinimumPayments: o.totalMinimumPayments ?? 0,
    averageInterestRate: o.averageInterestRate ?? 0,
    highestInterestRate: o.highestInterestRate ?? 0,
    debtCount: o.debtCount ?? 0,
    projectedPayoffDate: raw.currentPlan?.payoffDate ?? "",
  };
  const debts = Array.isArray(raw.debts) ? raw.debts.map(mapWebDebt) : [];
  const comparison: DebtStrategyComparison | null = raw.comparison
    ? {
        avalanche: mapStrategyMetrics(raw.comparison.avalanche),
        snowball: mapStrategyMetrics(raw.comparison.snowball),
        recommendation: raw.comparison.recommendation ?? "avalanche",
        recommendationReason: raw.comparison.recommendationReason ?? "",
      }
    : null;
  return { overview, debts, comparison };
}

// Debt Management Endpoints
export const debtApi = {
  /**
   * Get the flat debt overview the debtStore / reports screen read. Hits the real route
   * GET /api/financial/debt and adapts its nested { overview, debts, currentPlan }
   * payload into the store's flat shape (totalDebt/monthlyPayments/projectedPayoffDate
   * come from overview + currentPlan, NOT the top level). Never fabricate on failure —
   * pass the error through.
   */
  getOverview: async (): Promise<
    ApiResponse<{
      totalDebt: number;
      debts: DebtAccount[];
      monthlyPayments: number;
      projectedPayoffDate: string;
    }>
  > => {
    const res = await api.get<WebDebtResponse>("/financial/debt");
    if (res.success && res.data) {
      const plan = mapWebDebtPlan(res.data);
      return {
        success: true,
        data: {
          totalDebt: plan.overview.totalDebt,
          debts: plan.debts,
          monthlyPayments: plan.overview.totalMinimumPayments,
          projectedPayoffDate: plan.overview.projectedPayoffDate,
        },
      };
    }
    return { success: false, error: res.error };
  },

  /**
   * Get the full debt payoff plan for the debt screen: the real overview, the real
   * debts, and the real avalanche/snowball comparison (compare=true). extraPayment is
   * forwarded so the comparison's interest/months/savings reflect the user's chosen
   * extra monthly payment — the numbers are computed server-side by debtPayoffService,
   * never fabricated on the client. Consumed by app/financial/debt.tsx.
   */
  getDebtPlan: async (
    extraPayment = 0,
  ): Promise<ApiResponse<DebtPlanData>> => {
    const params = new URLSearchParams({
      compare: "true",
      extraPayment: String(extraPayment),
    });
    const res = await api.get<WebDebtResponse>(
      `/financial/debt?${params.toString()}`,
    );
    if (res.success && res.data) {
      return { success: true, data: mapWebDebtPlan(res.data) };
    }
    return { success: false, error: res.error };
  },

  /**
   * Calculate payoff strategy
   */
  calculatePayoff: (
    strategy: "snowball" | "avalanche",
    extraPayment?: number,
  ) =>
    api.post<{
      strategy: string;
      timeline: { month: string; totalPaid: number; remainingDebt: number }[];
      totalInterestPaid: number;
      payoffDate: string;
      monthsSaved: number;
      interestSaved: number;
    }>("/financial/debt/calculate", { strategy, extraPayment }),

  /**
   * Add debt
   */
  addDebt: (debt: {
    name: string;
    type: string;
    balance: number;
    interestRate: number;
    minimumPayment: number;
  }) => api.post<{ id: string }>("/financial/debt", debt),

  /**
   * Update debt
   */
  updateDebt: (
    debtId: string,
    updates: Partial<{
      balance: number;
      interestRate: number;
      minimumPayment: number;
    }>,
  ) => api.patch<{ success: boolean }>(`/financial/debt/${debtId}`, updates),

  /**
   * Delete debt
   */
  deleteDebt: (debtId: string) =>
    api.delete<{ success: boolean }>(`/financial/debt/${debtId}`),
};

// ---------------------------------------------------------------------------
// Bills — web -> mobile adapter (PARITY-P2)
// ---------------------------------------------------------------------------
// The mobile Payments screen (credit-repair/payments.tsx) renders the user's
// recurring bills: a merchant, an amount, and a due date. Its honest source is
// GET /api/financial/bills (withPermission "financial:read"), which returns
// { bills: Bill[] } from billDetectionService.getBillsByUser — the recurring-bill
// records defined in src/lib/financial/types/bill.types.ts. Over HTTP the record's
// Date columns (nextDueDate, ...) serialize to ISO strings via NextResponse.json.
//
// The screen previously also rendered a hardcoded on-time %, paid/late/missed
// per-bill statuses, and a "late" count. Those describe PAYMENT HISTORY
// (BillPayment.isLate in bill.types.ts), which the service exposes only through
// billDetectionService.getPaymentHistory — with NO HTTP route. Because no honest
// source reaches the client, this adapter carries only the fields the bills
// endpoint truly provides (merchant, amount, due date, category, autopay); the
// screen omits the on-time %/late metrics rather than fabricate them.
//
// getBills is the single honest getter for the bills endpoint. It replaced the old
// billsApi.getUpcoming, which was mis-typed against a payload the route never returns
// (name/dueDate/autopay/totalDue): its consumer app/financial/bills.tsx read undefined
// fields, produced Invalid Dates, and silently fell back to a hardcoded MOCK_BILLS
// array. Both screens (credit-repair/payments.tsx and financial/bills.tsx) now consume
// getBills; getUpcoming was deleted.

export interface BillItem {
  id: string;
  merchant: string; // from Bill.merchantName
  amount: number;
  dueDate: string; // ISO 8601 over HTTP (Bill.nextDueDate)
  category: string;
  isAutoPay: boolean;
  /**
   * How often the bill recurs — the real Bill.frequency
   * (weekly|biweekly|monthly|quarterly|yearly). Was dropped by the mapper,
   * which made a monthly total impossible to compute honestly: a yearly
   * subscription and a monthly one looked identical.
   */
  frequency: string;
}

/**
 * Raw bill as returned by GET /api/financial/bills
 * (src/lib/financial/types/bill.types.ts `Bill`, mapped by
 * bill-detection-service.mapBillFromDb). Date columns serialize to ISO strings
 * over HTTP. Fields the mobile screen does not render are declared for
 * documentation but left optional and tolerant, so a partial payload never throws.
 */
export interface WebBill {
  id: string;
  userId?: string;
  merchantName?: string;
  category?: string;
  amount?: number;
  frequency?: string;
  nextDueDate?: string;
  lastPaidDate?: string;
  lastPaidAmount?: number;
  status?: string;
  isAutoPay?: boolean;
  accountId?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Map a web bill onto the mobile BillItem shape. Web uses `merchantName` and
 * `nextDueDate`; mobile uses `merchant` and `dueDate`. Nothing is fabricated: an
 * absent merchant becomes an empty string rather than a made-up name, an absent
 * amount becomes 0 rather than an invented figure, an absent due date becomes an
 * empty string, and autopay defaults to false.
 */
export function mapWebBill(raw: WebBill): BillItem {
  return {
    id: raw.id,
    merchant: raw.merchantName ?? "",
    amount: raw.amount ?? 0,
    dueDate: raw.nextDueDate ?? "",
    category: raw.category ?? "",
    isAutoPay: raw.isAutoPay ?? false,
    frequency: raw.frequency ?? "",
  };
}

/**
 * A bill's cost expressed per month.
 *
 * Returns null for an unrecognised or absent frequency rather than assuming
 * monthly: an unknown cadence silently treated as monthly would put a yearly
 * charge into a monthly total at twelve times its real weight.
 */
export function monthlyCost(bill: BillItem): number | null {
  switch (bill.frequency) {
    case "weekly":
      return (bill.amount * 52) / 12;
    case "biweekly":
      return (bill.amount * 26) / 12;
    case "monthly":
      return bill.amount;
    case "quarterly":
      return bill.amount / 3;
    case "yearly":
      return bill.amount / 12;
    default:
      return null;
  }
}

/**
 * The bill categories that describe a subscription.
 *
 * Both are real BillCategory values (src/lib/financial/types/bill.types.ts);
 * bill-detection-service assigns them from the merchant. The subscriptions
 * screen previously invented its own set — "Entertainment", "Software",
 * "Services", "Fitness", "Cloud" — none of which the database can hold.
 */
export const SUBSCRIPTION_BILL_CATEGORIES = ["subscription", "streaming"];

// ---------------------------------------------------------------------------
// Savings automation rules
// ---------------------------------------------------------------------------
// app/budgeting/auto-save.tsx rendered a MOCK_RULES array — a "Purchase
// Round-Up" saving $45 a month, a "Paycheck Percentage", and so on — with
// toggles that only flipped local state. A user reading it believed money was
// being set aside automatically. Nothing was.
//
// GET /api/financial/savings?type=rules has existed the whole time, reading
// the real savings_rules table through savingsAutomationService.getRules.
//
// NOTE FOR ANYONE WIRING MORE OF THIS: there is a SECOND service,
// src/lib/financial/auto-save-rules-service.ts, whose name makes it look like
// the right one. It queries `auto_save_rules` and `save_transfers`, and
// NEITHER TABLE EXISTS in any migration — the real table is `savings_rules`
// with a different column set and a narrower type CHECK. That module is dead
// against a schema that was never created; every call would fail with
// undefined_table. Use savings-automation-service, which is what the route
// already does.

export type SavingsRuleType =
  | "round_up"
  | "percentage"
  | "fixed"
  | "surplus"
  | "goal_based";

export type SavingsRuleStatus = "active" | "paused" | "completed" | "cancelled";

export interface SavingsRuleConfig {
  roundUpTo?: number;
  roundUpMultiplier?: number;
  percentageOfIncome?: number;
  percentageOfTransaction?: number;
  fixedAmount?: number;
  surplusThreshold?: number;
  surplusPercentage?: number;
}

export interface SavingsRule {
  id: string;
  name: string;
  type: SavingsRuleType;
  frequency: string;
  status: SavingsRuleStatus;
  config: SavingsRuleConfig;
  /** CUMULATIVE, not monthly — savings_rules.total_saved. */
  totalSaved: number;
  transferCount: number;
  lastTriggeredAt?: string;
  createdAt: string;
}

export const savingsRulesApi = {
  /** The caller's automation rules, from the real savings_rules table. */
  getRules: async (): Promise<ApiResponse<{ rules: SavingsRule[] }>> => {
    const res = await api.get<{ rules: SavingsRule[] }>(
      "/financial/savings?type=rules",
    );
    if (res.success && res.data) {
      return {
        success: true,
        data: { rules: Array.isArray(res.data.rules) ? res.data.rules : [] },
      };
    }
    return { success: false, error: res.error };
  },

  /**
   * Pause or resume a rule.
   *
   * The route reads `action: "toggle"` from the body and calls
   * toggleRuleStatus, which is user-scoped server-side. The screen's old
   * toggle changed a local flag and nothing else, so a user who paused a
   * savings rule saw it pause and it never did.
   */
  toggleRule: (ruleId: string) =>
    api.patch<{ rule: SavingsRule }>(`/financial/savings/rules/${ruleId}`, {
      action: "toggle",
    }),
};

// Bills & Payments Endpoints
export const billsApi = {
  /**
   * Get the current user's recurring bills. Hits the real route GET
   * /api/financial/bills with activeOnly=true (paused/cancelled bills are not
   * upcoming, so they are excluded) and adapts each web Bill onto the mobile BillItem
   * shape. A failed request passes straight through without fabricating data. Consumed
   * by both credit-repair/payments.tsx and financial/bills.tsx.
   */
  getBills: async (): Promise<ApiResponse<{ bills: BillItem[] }>> => {
    const res = await api.get<{ bills?: WebBill[] }>(
      "/financial/bills?activeOnly=true",
    );
    if (res.success && res.data) {
      const bills = Array.isArray(res.data.bills)
        ? res.data.bills.map(mapWebBill)
        : [];
      return { success: true, data: { bills } };
    }
    return { success: false, error: res.error };
  },

  /**
   * Add bill reminder
   */
  addReminder: (bill: {
    name: string;
    amount: number;
    dueDate: string;
    frequency: "weekly" | "monthly" | "yearly";
    autopay: boolean;
  }) => api.post<{ id: string }>("/financial/bills", bill),

  /**
   * Update bill
   */
  updateBill: (
    billId: string,
    updates: Partial<{
      amount: number;
      dueDate: string;
      autopay: boolean;
    }>,
  ) => api.patch<{ success: boolean }>(`/financial/bills/${billId}`, updates),

  /**
   * Delete bill
   */
  deleteBill: (billId: string) =>
    api.delete<{ success: boolean }>(`/financial/bills/${billId}`),
};

export default {
  overview: financialOverviewApi,
  accounts: bankAccountApi,
  transactions: transactionApi,
  budgets: budgetApi,
  goals: financialGoalsApi,
  debt: debtApi,
  bills: billsApi,
};

/**
 * Transaction rules — GET/POST /api/financial/transaction-rules and
 * PATCH/DELETE on {id}.
 *
 * The routes are new; the table (`transaction_rules`, with RLS) and
 * transactionRulesService were already there. Only the HTTP surface was
 * missing, which is why app/settings/transaction-rules.tsx shipped a "Coffee
 * Shops" rule the user never wrote, carrying matchCount 47.
 */
export interface WebRuleCondition {
  type: string;
  value: string | number;
  secondaryValue?: string | number;
}

export interface WebRuleAction {
  type: string;
  value: string | number | boolean;
  metadata?: Record<string, unknown>;
}

export interface WebTransactionRule {
  id: string;
  name: string;
  description?: string;
  conditions: WebRuleCondition[];
  conditionLogic: "AND" | "OR";
  actions: WebRuleAction[];
  isActive: boolean;
  priority: number;
  /** Real column on transaction_rules, maintained by the engine. */
  matchCount: number;
  lastMatchedAt?: string;
}

export interface CreateTransactionRuleInput {
  name: string;
  description?: string;
  conditions: WebRuleCondition[];
  conditionLogic: "AND" | "OR";
  actions: WebRuleAction[];
  isActive?: boolean;
  priority?: number;
}

export const transactionRuleApi = {
  getAll: () =>
    api.get<{ rules: WebTransactionRule[] }>("/financial/transaction-rules"),

  create: (input: CreateTransactionRuleInput) =>
    api.post<{ rule: WebTransactionRule }>(
      "/financial/transaction-rules",
      input,
    ),

  update: (id: string, input: Partial<CreateTransactionRuleInput>) =>
    api.patch<{ rule: WebTransactionRule }>(
      `/financial/transaction-rules/${id}`,
      input,
    ),

  remove: (id: string) =>
    api.delete<{ id: string }>(`/financial/transaction-rules/${id}`),
};
