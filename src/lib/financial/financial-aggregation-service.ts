/**
 * Financial Aggregation Service
 *
 * Unified data aggregation service that consolidates all financial data
 * into a single comprehensive profile. Implements caching with 15-minute TTL.
 */

import { getSupabase } from "@/lib/supabase/client";
import { logger } from "@/lib/monitoring/logger";

const supabase = getSupabase();
import { budgetService } from "./budget-service";
import { spendingAnalysisService } from "./spending-analysis-service";
import { billDetectionService } from "./bill-detection-service";
import { savingsAutomationService } from "./savings-automation-service";
import { DebtPayoffService } from "./debt-payoff-service";
import { HealthScoreCalculator } from "./health-score-calculator";
import {
  AggregatedFinancialContext,
  FinancialSnapshot,
  FinancialTrends,
  AggregationOptions,
  SnapshotOptions,
  TrendOptions,
  TrendPeriod,
  TrendData,
  TrendDataPoint,
  CategorySpending,
  SpendingAnomaly,
  NetWorthHistoryPoint,
  DataCompleteness,
  CachedContext,
  HealthScoreHistoryPoint,
  TrendObservation,
  RiskLevel,
} from "./types/aggregated-context.types";
import {
  UserProfile,
  AggregatedAccounts,
  CategorizedTransactions,
  CreditSummary,
  AIInsight,
  Recommendation,
  RecurringBill,
  FinancialGoal,
  AccountSummary,
  BudgetStatus,
  InsightType,
  RecommendationCategory,
  DebtAnalysis,
  DebtItem,
} from "./types/financial-context.types";
import { Budget, BudgetCategoryValue } from "./types/budget.types";
import { Debt, DebtOverview } from "./types/debt-payoff.types";

// `getSupabase()` is untyped (see src/lib/supabase/client.ts), so `.from()`
// query results are not checked against the live schema at compile time.
// This mirrors the row shape verified live against `public.credit_scores`
// (`\d+ credit_scores`) — id, user_id, bureau, score, score_date, created_at.
interface CreditScoreQueryRow {
  id: string;
  user_id: string;
  bureau: string;
  score: number;
  score_date: string;
  created_at: string;
}

// ============================================================================
// CACHE CONFIGURATION
// ============================================================================

const CACHE_TTL_MINUTES = 15;
const MAX_CACHE_SIZE = 100;

// In-memory cache (would be Redis in production)
const contextCache = new Map<
  string,
  CachedContext<AggregatedFinancialContext>
>();
const snapshotCache = new Map<string, CachedContext<FinancialSnapshot>>();

// ============================================================================
// FINANCIAL AGGREGATION SERVICE CLASS
// ============================================================================

export class FinancialAggregationService {
  private debtService: DebtPayoffService;
  private healthScoreCalculator: HealthScoreCalculator;

  constructor() {
    this.debtService = new DebtPayoffService();
    this.healthScoreCalculator = new HealthScoreCalculator();
  }

  // ==========================================================================
  // MAIN AGGREGATION METHODS
  // ==========================================================================

  /**
   * Get complete aggregated financial context for a user
   */
  async getAggregatedContext(
    userId: string,
    options: AggregationOptions = {},
  ): Promise<AggregatedFinancialContext> {
    // Check cache first (unless forceRefresh)
    if (!options.forceRefresh) {
      const cached = this.getCachedContext(userId);
      if (cached) {
        return cached;
      }
    }

    // Fetch all data in parallel
    const [
      user,
      accounts,
      budgetData,
      spendingData,
      billsData,
      savingsData,
      debtData,
      netWorthData,
      investmentData,
      creditData,
      goalsData,
    ] = await Promise.all([
      this.fetchUserProfile(userId),
      this.fetchAccounts(userId),
      options.includeBudgets !== false ? this.fetchBudgetData(userId) : null,
      options.includeSpending !== false
        ? this.fetchSpendingData(userId, options.transactionDays)
        : null,
      options.includeBills !== false ? this.fetchBillsData(userId) : null,
      options.includeSavings !== false ? this.fetchSavingsData(userId) : null,
      options.includeDebt !== false ? this.fetchDebtData(userId) : null,
      this.fetchNetWorthData(userId),
      options.includeInvestments !== false
        ? this.fetchInvestmentData(userId)
        : null,
      options.includeCredit !== false ? this.fetchCreditData(userId) : null,
      this.fetchGoalsData(userId),
    ]);

    // Calculate health score
    const healthScoreInput = {
      accounts: accounts,
      transactions: spendingData?.transactions || this.getEmptyTransactions(),
      budgets: budgetData?.items.map((b) => this.mapBudgetToStatus(b)) || [],
      goals: goalsData,
      debts: this.mapDebtToAnalysis(debtData?.items || [], debtData?.overview),
      creditProfile: creditData || this.getEmptyCreditProfile(),
    };

    const healthScore =
      await this.healthScoreCalculator.calculateScore(healthScoreInput);

    // Generate insights and recommendations
    const insights =
      options.includeInsights !== false
        ? await this.generateInsights(userId, {
            budgetData,
            spendingData,
            debtData,
            savingsData,
          })
        : [];

    const recommendations =
      options.includeInsights !== false
        ? await this.generateRecommendations(userId, {
            budgetData,
            spendingData,
            debtData,
            savingsData,
          })
        : [];

    // Build aggregated context
    const context: AggregatedFinancialContext = {
      user,
      accounts,
      budgets: budgetData || this.getEmptyBudgetData(),
      spending: spendingData || this.getEmptySpendingData(),
      bills: billsData || this.getEmptyBillsData(),
      savings: savingsData || this.getEmptySavingsData(),
      debt: debtData || this.getEmptyDebtData(),
      netWorth: netWorthData,
      investments: investmentData || this.getEmptyInvestmentData(),
      credit: creditData || this.getEmptyCreditProfile(),
      healthScore,
      goals: goalsData,
      insights,
      recommendations,
      lastUpdated: new Date(),
      dataCompleteness: this.calculateDataCompleteness({
        accounts,
        budgetData,
        spendingData,
        billsData,
        savingsData,
        debtData,
        investmentData,
        creditData,
      }),
    };

    // Cache the result
    this.setCachedContext(userId, context);

    return context;
  }

  /**
   * Get a point-in-time financial snapshot
   */
  async getFinancialSnapshot(
    userId: string,
    options: SnapshotOptions = {},
  ): Promise<FinancialSnapshot> {
    const date = options.date || new Date();
    const cacheKey = `${userId}-${date.toISOString().split("T")[0]}`;

    // Check cache
    const cached = snapshotCache.get(cacheKey);
    if (cached && cached.expiresAt > new Date()) {
      return cached.data;
    }

    // Get aggregated context
    const context = await this.getAggregatedContext(userId);

    // Calculate snapshot metrics
    const monthlyIncome = context.spending.transactions.totalIncome;
    const monthlyExpenses = context.spending.transactions.totalExpenses;
    const monthlyCashFlow = monthlyIncome - monthlyExpenses;

    const snapshot: FinancialSnapshot = {
      date,
      netWorth: context.netWorth.current,
      totalAssets: context.netWorth.assets.total,
      totalLiabilities: context.netWorth.liabilities.total,
      totalDebt: context.debt.totalDebt,
      totalSavings: context.savings.totalSaved,
      totalInvestments: context.investments.totalValue,
      monthlyIncome,
      monthlyExpenses,
      monthlyCashFlow,
      debtToIncomeRatio:
        monthlyIncome > 0
          ? (context.debt.monthlyPayments / monthlyIncome) * 100
          : 0,
      savingsRate:
        monthlyIncome > 0
          ? (context.savings.monthlyContributions / monthlyIncome) * 100
          : 0,
      healthScore: context.healthScore.overallScore,
      creditScore: context.credit.currentScore || undefined,
      budgetUtilization: this.calculateBudgetUtilization(context.budgets.items),
      budgetsOnTrack: context.budgets.items.filter(
        (b) => b.status === "on_track",
      ).length,
      budgetsOverBudget: context.budgets.items.filter(
        (b) => b.status === "over_budget",
      ).length,
      goalsProgress: this.calculateOverallGoalsProgress(context.goals),
      activeGoalsCount: context.goals.filter((g) => g.status === "active")
        .length,
      investmentReturn: context.investments.totalGainLoss,
      portfolioValue: context.investments.totalValue,
    };

    // Cache snapshot
    snapshotCache.set(cacheKey, {
      data: snapshot,
      cachedAt: new Date(),
      expiresAt: new Date(Date.now() + CACHE_TTL_MINUTES * 60 * 1000),
      userId,
    });

    return snapshot;
  }

  /**
   * Get financial trends over time
   */
  async getFinancialTrends(
    userId: string,
    options: TrendOptions,
  ): Promise<FinancialTrends> {
    const { period, startDate, endDate } = this.resolveTrendDates(options);

    // Fetch historical data points
    const [
      netWorthHistory,
      incomeHistory,
      spendingHistory,
      savingsHistory,
      debtHistory,
      investmentHistory,
      healthScoreHistory,
    ] = await Promise.all([
      this.fetchNetWorthHistory(userId, startDate, endDate),
      this.fetchIncomeHistory(userId, startDate, endDate),
      this.fetchSpendingHistory(userId, startDate, endDate),
      this.fetchSavingsHistory(userId, startDate, endDate),
      this.fetchDebtHistory(userId, startDate, endDate),
      this.fetchInvestmentHistory(userId, startDate, endDate),
      this.fetchHealthScoreHistory(userId, startDate, endDate),
    ]);

    // Build trend data
    const netWorthTrend = this.buildTrendData(netWorthHistory);
    const incomeTrend = this.buildTrendData(incomeHistory);
    const spendingTrend = this.buildTrendData(spendingHistory);
    const cashFlowTrend = this.buildCashFlowTrend(
      incomeHistory,
      spendingHistory,
    );
    const savingsTrend = this.buildTrendData(savingsHistory);
    const debtTrend = this.buildTrendData(debtHistory);
    const investmentTrend = this.buildTrendData(investmentHistory);

    // Generate observations
    const observations = this.generateTrendObservations({
      netWorthTrend,
      incomeTrend,
      spendingTrend,
      savingsTrend,
      debtTrend,
      investmentTrend,
    });

    return {
      period,
      startDate,
      endDate,
      netWorthTrend,
      incomeTrend,
      spendingTrend,
      cashFlowTrend,
      savingsTrend,
      debtTrend,
      investmentTrend,
      healthScoreHistory,
      observations,
    };
  }

  // ==========================================================================
  // DATA FETCHING METHODS
  // ==========================================================================

  private async fetchUserProfile(userId: string): Promise<UserProfile> {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error || !data) {
      return this.getDefaultUserProfile(userId);
    }

    return {
      id: data.id,
      email: data.email || "",
      fullName: data.full_name || "",
      subscriptionTier: data.subscription_tier || "free",
      createdAt: new Date(data.created_at),
      onboardingCompleted: data.onboarding_completed || false,
      preferences: {
        currency: data.currency || "USD",
        timezone: data.timezone || "America/New_York",
        budgetAlertThreshold: data.budget_alert_threshold || 80,
        goalRemindersEnabled: data.goal_reminders_enabled ?? true,
        insightNotificationsEnabled: data.insight_notifications_enabled ?? true,
      },
    };
  }

  /**
   * `financial_accounts` — NOT `plaid_accounts` (that table has never
   * existed in any migration; plaid-service.ts, the writer, has always used
   * `financial_accounts` — see 20260731000006_plaid_items_accounts.sql for
   * the consolidation rationale). PostgREST resolves an {error} for an
   * unknown table instead of throwing, and this used to only check
   * `error || !data` and silently map both into getEmptyAccounts() — so
   * every user's net worth read $0 regardless of real linked-account
   * balances. Verified against the live schema 2026-07-31.
   *
   * KNOWN REMAINING GAP: `supabase` here is the anon-keyed getSupabase()
   * singleton (module-level, no per-request session — auth.uid() is always
   * NULL for it), and financial_accounts has no authenticated grant
   * (20260731000009). So this query gets a genuine 42501 permission-denied
   * error on every real call, not just on transient failures — the error
   * branch below is now reachable and observable (the actual fix in this
   * commit), but net worth computed via THIS fetcher still reads $0 in
   * production until this method (like its ~8 siblings in this file) moves
   * to a service-role-capable client. plaid-service.ts's getAccounts()
   * already does this correctly for the same table; broadening it to every
   * fetch* method here is a separate, file-wide architectural change beyond
   * this fix's scope.
   */
  private async fetchAccounts(userId: string): Promise<AggregatedAccounts> {
    const { data, error } = await supabase
      .from("financial_accounts")
      .select("*")
      .eq("user_id", userId);

    if (error) {
      // A failed account lookup must not silently read as "this user has no
      // linked accounts" — that is exactly what masked the net-worth-is-
      // always-zero bug above. Log it so it is observable/alertable, but
      // still degrade to empty accounts rather than rethrowing: this
      // fetcher is one of ~9 run in parallel via Promise.all in
      // getAggregatedContext(), and throwing here would fail the user's
      // entire dashboard over one section's transient error — matches the
      // same resilience tradeoff fetchDebtData/fetchCreditData make below.
      logger.error(
        "Failed to fetch financial_accounts data",
        error instanceof Error ? error : new Error(String(error)),
        { userId },
      );
      return this.getEmptyAccounts();
    }

    if (!data) {
      return this.getEmptyAccounts();
    }

    const accounts = data.map(this.mapAccountFromDb);
    const checking = accounts.filter((a) => a.accountType === "checking");
    const savings = accounts.filter((a) => a.accountType === "savings");
    const credit = accounts.filter((a) => a.accountType === "credit");
    const investment = accounts.filter((a) => a.accountType === "investment");
    const loan = accounts.filter((a) => a.accountType === "loan");

    const totalAssets = [...checking, ...savings, ...investment].reduce(
      (sum, a) => sum + Math.max(0, a.currentBalance),
      0,
    );
    const totalLiabilities = [...credit, ...loan].reduce(
      (sum, a) => sum + Math.abs(a.currentBalance),
      0,
    );

    const totalSavings = savings.reduce(
      (sum, a) => sum + Math.max(0, a.currentBalance),
      0,
    );

    return {
      checking,
      savings,
      credit,
      investment,
      loan,
      totalAssets,
      totalLiabilities,
      totalSavings,
      netWorth: totalAssets - totalLiabilities,
      lastSyncedAt: new Date(),
    };
  }

  private async fetchBudgetData(
    userId: string,
  ): Promise<AggregatedFinancialContext["budgets"]> {
    try {
      const [items, summary, alerts] = await Promise.all([
        budgetService.getBudgetsByUser(userId),
        budgetService.getBudgetSummary(userId),
        budgetService.getAlerts(userId, { unreadOnly: false }),
      ]);

      // Get trends for each unique category
      const categories = Array.from(new Set(items.map((b) => b.category)));
      const trendsPromises = categories.map((cat) =>
        budgetService.getBudgetTrends(userId, cat as BudgetCategoryValue),
      );
      const trends = await Promise.all(trendsPromises);

      return { items, summary, alerts, trends };
    } catch {
      return this.getEmptyBudgetData();
    }
  }

  private async fetchSpendingData(
    userId: string,
    days: number = 30,
  ): Promise<AggregatedFinancialContext["spending"]> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Use analyzeSpending which is the public method
      const analysisResult = await spendingAnalysisService.analyzeSpending(
        userId,
        { startDate, endDate },
      );

      // Map CategorySpending trend to CategoryBreakdown trend
      const mapTrend = (trend: string): "up" | "down" | "stable" => {
        if (trend === "increasing") return "up";
        if (trend === "decreasing") return "down";
        return "stable";
      };

      const transactions: CategorizedTransactions = {
        recentTransactions: [],
        byCategory: (analysisResult.byCategory || []).map((c) => ({
          category: c.category,
          amount: c.amount,
          percentage: c.percentage,
          transactionCount: c.transactionCount,
          trend: mapTrend(c.trend),
          changeFromLastPeriod: c.changeFromLastPeriod,
        })),
        byMerchant: (analysisResult.byMerchant || []).map((m) => ({
          merchant: m.merchant,
          category: m.category,
          amount: m.amount,
          transactionCount: m.transactionCount,
        })),
        totalIncome: analysisResult.totalIncome || 0,
        totalExpenses: analysisResult.totalSpending || 0,
        netCashFlow: analysisResult.netCashFlow || 0,
        period: { startDate, endDate, daysIncluded: days },
      };

      const topCategories: CategorySpending[] = (
        analysisResult.byCategory || []
      )
        .slice(0, 5)
        .map((c) => ({
          category: c.category,
          amount: c.amount,
          percentage: c.percentage,
          trend: mapTrend(c.trend),
          changePercent: c.changeFromLastPeriod,
        }));

      return {
        transactions,
        monthlyAverage: analysisResult.totalSpending || 0,
        yearToDateTotal: analysisResult.totalSpending || 0,
        topCategories,
        anomalies: (analysisResult.anomalies || []).map((a) => ({
          id: a.id,
          type: a.type as SpendingAnomaly["type"],
          description: a.description,
          amount: a.amount,
          category: a.category,
          merchant: a.merchant,
          severity: a.severity,
          date: a.detectedAt,
        })),
      };
    } catch {
      return this.getEmptySpendingData();
    }
  }

  private async fetchBillsData(
    userId: string,
  ): Promise<AggregatedFinancialContext["bills"]> {
    try {
      const [items, summary] = await Promise.all([
        billDetectionService.getBillsByUser(userId),
        billDetectionService.getBillSummary(userId),
      ]);

      // Map bill frequency to RecurringBill frequency (yearly -> annually)
      const mapFrequency = (freq: string): RecurringBill["frequency"] => {
        if (freq === "yearly") return "annually";
        return freq as RecurringBill["frequency"];
      };

      const recurring: RecurringBill[] = items.map((bill) => ({
        id: bill.id,
        name: bill.merchantName,
        category: bill.category,
        amount: bill.amount,
        frequency: mapFrequency(bill.frequency),
        dueDay: bill.nextDueDate
          ? new Date(bill.nextDueDate).getDate()
          : undefined,
        linkedAccountId: bill.accountId,
        autoDetected: false,
        negotiationStatus: "not_started" as const,
        lastPaidAt: bill.lastPaidDate,
        nextDueAt: bill.nextDueDate,
        status: bill.status,
      }));

      return {
        items,
        recurring,
        summary,
        totalMonthly: summary.totalMonthlyBills,
        negotiationOpportunities: items.filter((b) =>
          [
            "utilities",
            "internet",
            "phone",
            "insurance",
            "subscription",
          ].includes(b.category),
        ).length,
      };
    } catch {
      return this.getEmptyBillsData();
    }
  }

  private async fetchSavingsData(
    userId: string,
  ): Promise<AggregatedFinancialContext["savings"]> {
    try {
      const [goals, rules, summary] = await Promise.all([
        savingsAutomationService.getGoals(userId),
        savingsAutomationService.getRules(userId),
        savingsAutomationService.getSummary(userId),
      ]);

      return {
        goals,
        rules,
        summary,
        totalSaved: summary.totalSaved,
        monthlyContributions: summary.totalSavedThisMonth,
      };
    } catch {
      return this.getEmptySavingsData();
    }
  }

  private async fetchDebtData(
    userId: string,
  ): Promise<AggregatedFinancialContext["debt"]> {
    try {
      // `debt_accounts` — NOT `debts` (that table has never existed).
      // PostgREST resolves an {error} for an unknown table instead of
      // throwing, and the catch below used to silently map that into
      // "zero debt" — so debtToIncomeRatio read 0 for every user
      // regardless of real debt. Verified against the live schema
      // 2026-07-31 (see wellness-gate.ts for the same fix pattern).
      const { data, error } = await supabase
        .from("debt_accounts")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true);

      if (error) throw error;

      const debts: Debt[] = (data || []).map((d) => ({
        id: d.id,
        userId: d.user_id,
        name: d.name,
        type: d.type,
        balance: d.balance,
        originalBalance: d.original_balance || d.balance,
        interestRate: d.interest_rate,
        minimumPayment: d.minimum_payment,
        dueDate: d.due_date,
        linkedAccountId: d.linked_account_id,
        creditorName: d.creditor_name,
        accountNumber: d.account_number,
        startDate: d.start_date,
        isActive: d.is_active,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
      }));

      const overview = this.debtService.calculateOverview(debts);
      const payoffPlan =
        debts.length > 0
          ? this.debtService.calculatePayoffPlan(debts, "avalanche", 0)
          : undefined;

      return {
        items: debts,
        overview,
        payoffPlan,
        totalDebt: overview.totalDebt,
        monthlyPayments: overview.totalMinimumPayments,
      };
    } catch (error) {
      // A failed debt lookup must not silently read as "this user has no
      // debt" — that is exactly what masked the debtToIncomeRatio-is-always-
      // zero bug. Log it so it is observable/alertable, but still degrade to
      // empty debt data rather than rethrowing: this fetcher is one of ~9
      // run in parallel via Promise.all in getAggregatedContext(), and
      // throwing here would fail the user's entire dashboard (budgets,
      // spending, net worth, etc.) over one section's transient error — a
      // disproportionate blast radius for a point-in-time snapshot
      // aggregator whose sibling fetchers all degrade gracefully the same way.
      logger.error(
        "Failed to fetch debt_accounts data",
        error instanceof Error ? error : new Error(String(error)),
        { userId },
      );
      return this.getEmptyDebtData();
    }
  }

  private async fetchNetWorthData(
    userId: string,
  ): Promise<AggregatedFinancialContext["netWorth"]> {
    const accounts = await this.fetchAccounts(userId);

    // Fetch historical net worth
    const { data: history } = await supabase
      .from("net_worth_history")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(12);

    const historyPoints: NetWorthHistoryPoint[] = (history || []).map((h) => ({
      date: new Date(h.date),
      netWorth: h.net_worth,
      assets: h.total_assets,
      liabilities: h.total_liabilities,
    }));

    const previousMonth =
      historyPoints.length > 1 ? historyPoints[1].netWorth : accounts.netWorth;

    return {
      current: accounts.netWorth,
      previousMonth,
      change: accounts.netWorth - previousMonth,
      changePercent:
        previousMonth !== 0
          ? ((accounts.netWorth - previousMonth) / Math.abs(previousMonth)) *
            100
          : 0,
      assets: {
        cash:
          accounts.checking.reduce((s, a) => s + a.currentBalance, 0) +
          accounts.savings.reduce((s, a) => s + a.currentBalance, 0),
        investments: accounts.investment.reduce(
          (s, a) => s + a.currentBalance,
          0,
        ),
        realEstate: 0, // Would come from manual entries
        vehicles: 0,
        other: 0,
        total: accounts.totalAssets,
      },
      liabilities: {
        creditCards: accounts.credit.reduce(
          (s, a) => s + Math.abs(a.currentBalance),
          0,
        ),
        mortgages: 0,
        studentLoans: 0,
        autoLoans: 0,
        personalLoans: accounts.loan.reduce(
          (s, a) => s + Math.abs(a.currentBalance),
          0,
        ),
        other: 0,
        total: accounts.totalLiabilities,
      },
      history: historyPoints,
    };
  }

  private async fetchInvestmentData(
    userId: string,
  ): Promise<AggregatedFinancialContext["investments"]> {
    // Fetch investment portfolio data
    const { data } = await supabase
      .from("investment_portfolios")
      .select("*")
      .eq("user_id", userId);

    if (!data || data.length === 0) {
      return this.getEmptyInvestmentData();
    }

    const totalValue = data.reduce((s, p) => s + (p.total_value || 0), 0);
    const totalCostBasis = data.reduce((s, p) => s + (p.cost_basis || 0), 0);
    const totalGainLoss = totalValue - totalCostBasis;
    const dayChange = data.reduce((s, p) => s + (p.day_change || 0), 0);

    return {
      portfolio: {
        totalValue,
        totalCostBasis,
        totalGainLoss,
        totalGainLossPercent:
          totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0,
        dayChange,
        dayChangePercent: totalValue > 0 ? (dayChange / totalValue) * 100 : 0,
        portfolios: data.map((p) => ({
          id: p.id,
          name: p.name,
          value: p.total_value || 0,
          gainLoss: (p.total_value || 0) - (p.cost_basis || 0),
          gainLossPercent:
            p.cost_basis > 0
              ? (((p.total_value || 0) - p.cost_basis) / p.cost_basis) * 100
              : 0,
          holdingsCount: p.holdings_count || 0,
        })),
        allocation: [],
        topHoldings: [],
      },
      totalValue,
      dayChange,
      totalGainLoss,
      diversificationScore: this.calculateDiversificationScore(data),
      riskLevel: this.assessRiskLevel(data),
      retirementReadiness: 0, // Would calculate based on age, savings, etc.
    };
  }

  /**
   * `credit_scores` is the canonical credit-score table already read by
   * every other consumer in this codebase (credit-monitoring-service,
   * credit-repair-service, credit-builder-service, the /api/profile route).
   * `credit_profiles` does not exist on the live schema, so this always
   * silently fell back to a zero score for every user.
   *
   * `currentScore` is the single most-recently-recorded score across all
   * bureaus (not a per-bureau breakdown) — the same "latest row wins"
   * convention those other callers already use. `bureauScores` stays `[]`
   * because nothing downstream of this aggregator reads it (verified: no
   * consumer of `AggregatedFinancialContext.credit.bureauScores` exists).
   *
   * `scoreChange` diffs the latest row against the next-most-recent row
   * regardless of bureau, matching the trend calculation already used in
   * `credit-builder-service.ts`.
   *
   * `activeDisputes`/`resolvedDisputes` have no wired data source on this
   * schema — `0` here is an explicit "not tracked yet" default, not a read
   * of a real column (no such columns exist on `credit_scores`).
   */
  private async fetchCreditData(userId: string): Promise<CreditSummary> {
    try {
      const { data, error } = await supabase
        .from("credit_scores")
        .select("*")
        .eq("user_id", userId)
        .order("score_date", { ascending: false })
        .limit(2);

      if (error) throw error;

      const rows = (data ?? []) as CreditScoreQueryRow[];
      const [latest, previous] = rows;
      if (!latest) {
        return this.getEmptyCreditProfile();
      }

      const scoreChange = previous ? latest.score - previous.score : 0;

      return {
        currentScore: latest.score,
        scoreChange,
        scoreChangeDirection:
          scoreChange > 0 ? "up" : scoreChange < 0 ? "down" : "stable",
        lastUpdated: new Date(latest.score_date),
        scoreHistory: [],
        factors: [],
        activeDisputes: 0,
        resolvedDisputes: 0,
        bureauScores: [],
      };
    } catch (error) {
      // A failed lookup must not silently read as "this user has no credit
      // score" — that is exactly what masked the currentScore-is-always-zero
      // bug (see class-level doc comment above). Log it so it is
      // observable/alertable, but still degrade to the empty profile rather
      // than rethrowing: this fetcher is one of ~9 run in parallel via
      // Promise.all in getAggregatedContext(), and throwing here would fail
      // the user's entire dashboard over one section's transient error —
      // matches the same resilience tradeoff fetchDebtData makes below.
      logger.error(
        "Failed to fetch credit score data",
        error instanceof Error ? error : new Error(String(error)),
        { userId },
      );
      return this.getEmptyCreditProfile();
    }
  }

  private async fetchGoalsData(userId: string): Promise<FinancialGoal[]> {
    const { data } = await supabase
      .from("financial_goals")
      .select("*")
      .eq("user_id", userId)
      .order("priority", { ascending: true });

    return (data || []).map((g) => ({
      id: g.id,
      type: g.type,
      name: g.name,
      description: g.description,
      targetAmount: g.target_amount,
      currentAmount: g.current_amount,
      progress:
        g.target_amount > 0 ? (g.current_amount / g.target_amount) * 100 : 0,
      targetDate: g.target_date ? new Date(g.target_date) : undefined,
      autoSaveEnabled: g.auto_save_enabled || false,
      autoSaveAmount: g.auto_save_amount,
      autoSaveFrequency: g.auto_save_frequency,
      linkedAccountId: g.linked_account_id,
      priority: g.priority || 1,
      status: g.status || "active",
      milestones: [],
      createdAt: new Date(g.created_at),
    }));
  }

  // ==========================================================================
  // HISTORY FETCHING METHODS (for trends)
  // ==========================================================================

  private async fetchNetWorthHistory(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<TrendDataPoint[]> {
    const { data } = await supabase
      .from("net_worth_history")
      .select("date, net_worth")
      .eq("user_id", userId)
      .gte("date", startDate.toISOString())
      .lte("date", endDate.toISOString())
      .order("date", { ascending: true });

    return (data || []).map((d) => ({
      date: new Date(d.date),
      value: d.net_worth,
    }));
  }

  private async fetchIncomeHistory(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<TrendDataPoint[]> {
    const { data } = await supabase
      .from("monthly_summaries")
      .select("month, total_income")
      .eq("user_id", userId)
      .gte("month", startDate.toISOString())
      .lte("month", endDate.toISOString())
      .order("month", { ascending: true });

    return (data || []).map((d) => ({
      date: new Date(d.month),
      value: d.total_income || 0,
    }));
  }

  private async fetchSpendingHistory(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<TrendDataPoint[]> {
    const { data } = await supabase
      .from("monthly_summaries")
      .select("month, total_expenses")
      .eq("user_id", userId)
      .gte("month", startDate.toISOString())
      .lte("month", endDate.toISOString())
      .order("month", { ascending: true });

    return (data || []).map((d) => ({
      date: new Date(d.month),
      value: d.total_expenses || 0,
    }));
  }

  private async fetchSavingsHistory(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<TrendDataPoint[]> {
    const { data } = await supabase
      .from("savings_history")
      .select("date, total_saved")
      .eq("user_id", userId)
      .gte("date", startDate.toISOString())
      .lte("date", endDate.toISOString())
      .order("date", { ascending: true });

    return (data || []).map((d) => ({
      date: new Date(d.date),
      value: d.total_saved || 0,
    }));
  }

  private async fetchDebtHistory(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<TrendDataPoint[]> {
    const { data } = await supabase
      .from("debt_history")
      .select("date, total_debt")
      .eq("user_id", userId)
      .gte("date", startDate.toISOString())
      .lte("date", endDate.toISOString())
      .order("date", { ascending: true });

    return (data || []).map((d) => ({
      date: new Date(d.date),
      value: d.total_debt || 0,
    }));
  }

  private async fetchInvestmentHistory(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<TrendDataPoint[]> {
    const { data } = await supabase
      .from("investment_history")
      .select("date, total_value")
      .eq("user_id", userId)
      .gte("date", startDate.toISOString())
      .lte("date", endDate.toISOString())
      .order("date", { ascending: true });

    return (data || []).map((d) => ({
      date: new Date(d.date),
      value: d.total_value || 0,
    }));
  }

  private async fetchHealthScoreHistory(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<HealthScoreHistoryPoint[]> {
    const { data } = await supabase
      .from("health_score_history")
      .select("date, score, grade")
      .eq("user_id", userId)
      .gte("date", startDate.toISOString())
      .lte("date", endDate.toISOString())
      .order("date", { ascending: true });

    return (data || []).map((d) => ({
      date: new Date(d.date),
      score: d.score,
      grade: d.grade,
    }));
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  private resolveTrendDates(options: TrendOptions): {
    period: TrendPeriod;
    startDate: Date;
    endDate: Date;
  } {
    const endDate = options.endDate || new Date();
    let startDate = options.startDate;

    if (!startDate) {
      startDate = new Date(endDate);
      switch (options.period) {
        case "7d":
          startDate.setDate(startDate.getDate() - 7);
          break;
        case "30d":
          startDate.setDate(startDate.getDate() - 30);
          break;
        case "90d":
          startDate.setDate(startDate.getDate() - 90);
          break;
        case "180d":
          startDate.setDate(startDate.getDate() - 180);
          break;
        case "1y":
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
        case "2y":
          startDate.setFullYear(startDate.getFullYear() - 2);
          break;
        case "all":
          startDate = new Date(2020, 0, 1);
          break;
        default:
          startDate.setDate(startDate.getDate() - 30);
      }
    }

    return { period: options.period, startDate, endDate };
  }

  private buildTrendData(points: TrendDataPoint[]): TrendData {
    if (points.length === 0) {
      return {
        values: [],
        startValue: 0,
        endValue: 0,
        change: 0,
        changePercent: 0,
        direction: "stable",
        average: 0,
        min: 0,
        max: 0,
      };
    }

    const values = points.map((p) => p.value);
    const startValue = values[0];
    const endValue = values[values.length - 1];
    const change = endValue - startValue;
    const changePercent =
      startValue !== 0 ? (change / Math.abs(startValue)) * 100 : 0;

    return {
      values: points,
      startValue,
      endValue,
      change,
      changePercent,
      direction: change > 0 ? "up" : change < 0 ? "down" : "stable",
      average: values.reduce((s, v) => s + v, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }

  private buildCashFlowTrend(
    incomeHistory: TrendDataPoint[],
    spendingHistory: TrendDataPoint[],
  ): TrendData {
    const cashFlowPoints: TrendDataPoint[] = incomeHistory.map((income, i) => ({
      date: income.date,
      value: income.value - (spendingHistory[i]?.value || 0),
    }));
    return this.buildTrendData(cashFlowPoints);
  }

  private generateTrendObservations(trends: {
    netWorthTrend: TrendData;
    incomeTrend: TrendData;
    spendingTrend: TrendData;
    savingsTrend: TrendData;
    debtTrend: TrendData;
    investmentTrend: TrendData;
  }): TrendObservation[] {
    const observations: TrendObservation[] = [];

    // Net worth observations
    if (trends.netWorthTrend.changePercent > 10) {
      observations.push({
        type: "improvement",
        metric: "netWorth",
        description: `Net worth increased by ${trends.netWorthTrend.changePercent.toFixed(1)}%`,
        impact: "positive",
      });
    } else if (trends.netWorthTrend.changePercent < -10) {
      observations.push({
        type: "decline",
        metric: "netWorth",
        description: `Net worth decreased by ${Math.abs(trends.netWorthTrend.changePercent).toFixed(1)}%`,
        impact: "negative",
      });
    }

    // Debt observations
    if (
      trends.debtTrend.direction === "down" &&
      trends.debtTrend.changePercent < -5
    ) {
      observations.push({
        type: "improvement",
        metric: "debt",
        description: `Debt reduced by ${Math.abs(trends.debtTrend.changePercent).toFixed(1)}%`,
        impact: "positive",
      });
    }

    // Savings observations
    if (
      trends.savingsTrend.direction === "up" &&
      trends.savingsTrend.changePercent > 5
    ) {
      observations.push({
        type: "improvement",
        metric: "savings",
        description: `Savings increased by ${trends.savingsTrend.changePercent.toFixed(1)}%`,
        impact: "positive",
      });
    }

    // Spending observations
    if (
      trends.spendingTrend.direction === "up" &&
      trends.spendingTrend.changePercent > 15
    ) {
      observations.push({
        type: "anomaly",
        metric: "spending",
        description: `Spending increased significantly by ${trends.spendingTrend.changePercent.toFixed(1)}%`,
        impact: "negative",
      });
    }

    return observations;
  }

  private calculateBudgetUtilization(budgets: Budget[]): number {
    if (budgets.length === 0) return 0;
    const totalSpent = budgets.reduce((s, b) => s + b.spentAmount, 0);
    const totalBudget = budgets.reduce((s, b) => s + b.budgetedAmount, 0);
    return totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  }

  private calculateOverallGoalsProgress(goals: FinancialGoal[]): number {
    if (goals.length === 0) return 0;
    return goals.reduce((s, g) => s + g.progress, 0) / goals.length;
  }

  private calculateDiversificationScore(portfolios: unknown[]): number {
    // Simplified diversification score
    return portfolios.length > 0 ? Math.min(100, portfolios.length * 20) : 0;
  }

  private assessRiskLevel(portfolios: unknown[]): RiskLevel {
    // Simplified risk assessment
    return portfolios.length > 3 ? "moderate" : "conservative";
  }

  private calculateDataCompleteness(data: {
    accounts: AggregatedAccounts;
    budgetData: AggregatedFinancialContext["budgets"] | null;
    spendingData: AggregatedFinancialContext["spending"] | null;
    billsData: AggregatedFinancialContext["bills"] | null;
    savingsData: AggregatedFinancialContext["savings"] | null;
    debtData: AggregatedFinancialContext["debt"] | null;
    investmentData: AggregatedFinancialContext["investments"] | null;
    creditData: CreditSummary | null;
  }): DataCompleteness {
    const hasAccounts =
      data.accounts.checking.length > 0 || data.accounts.savings.length > 0;
    const hasBudgets = (data.budgetData?.items.length || 0) > 0;
    const hasTransactions =
      (data.spendingData?.transactions.recentTransactions.length || 0) > 0;
    const hasBills = (data.billsData?.items.length || 0) > 0;
    const hasSavings = (data.savingsData?.goals.length || 0) > 0;
    const hasDebt = (data.debtData?.items.length || 0) > 0;
    const hasInvestments = (data.investmentData?.totalValue || 0) > 0;
    const hasCredit = (data.creditData?.currentScore || 0) > 0;

    const completedCount = [
      hasAccounts,
      hasBudgets,
      hasTransactions,
      hasBills,
      hasSavings,
      hasDebt,
      hasInvestments,
      hasCredit,
    ].filter(Boolean).length;

    return {
      accounts: hasAccounts,
      budgets: hasBudgets,
      transactions: hasTransactions,
      bills: hasBills,
      savings: hasSavings,
      debt: hasDebt,
      investments: hasInvestments,
      credit: hasCredit,
      overallScore: Math.round((completedCount / 8) * 100),
    };
  }

  // ==========================================================================
  // CACHE METHODS
  // ==========================================================================

  private getCachedContext(userId: string): AggregatedFinancialContext | null {
    const cached = contextCache.get(userId);
    if (cached && cached.expiresAt > new Date()) {
      return cached.data;
    }
    contextCache.delete(userId);
    return null;
  }

  private setCachedContext(
    userId: string,
    context: AggregatedFinancialContext,
  ): void {
    // Enforce max cache size
    if (contextCache.size >= MAX_CACHE_SIZE) {
      const oldestKey = contextCache.keys().next().value;
      if (oldestKey) contextCache.delete(oldestKey);
    }

    contextCache.set(userId, {
      data: context,
      cachedAt: new Date(),
      expiresAt: new Date(Date.now() + CACHE_TTL_MINUTES * 60 * 1000),
      userId,
    });
  }

  /**
   * Clear cache for a specific user
   */
  clearCache(userId: string): void {
    contextCache.delete(userId);
    // Clear all snapshot cache entries for this user
    const keysToDelete: string[] = [];
    snapshotCache.forEach((_, key) => {
      if (key.startsWith(userId)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach((key) => snapshotCache.delete(key));
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    contextCache.clear();
    snapshotCache.clear();
  }

  // ==========================================================================
  // EMPTY DATA GENERATORS
  // ==========================================================================

  private getDefaultUserProfile(userId: string): UserProfile {
    return {
      id: userId,
      email: "",
      fullName: "",
      subscriptionTier: "free",
      createdAt: new Date(),
      onboardingCompleted: false,
      preferences: {
        currency: "USD",
        timezone: "America/New_York",
        budgetAlertThreshold: 80,
        goalRemindersEnabled: true,
        insightNotificationsEnabled: true,
      },
    };
  }

  private getEmptyAccounts(): AggregatedAccounts {
    return {
      checking: [],
      savings: [],
      credit: [],
      investment: [],
      loan: [],
      totalAssets: 0,
      totalLiabilities: 0,
      totalSavings: 0,
      netWorth: 0,
      lastSyncedAt: new Date(),
    };
  }

  private getEmptyBudgetData(): AggregatedFinancialContext["budgets"] {
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const daysRemaining = Math.max(
      0,
      Math.ceil((endOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    );
    const daysElapsed = now.getDate();
    const totalDays = endOfMonth.getDate();

    return {
      items: [],
      summary: {
        totalBudgeted: 0,
        totalSpent: 0,
        totalRemaining: 0,
        overallPercentUsed: 0,
        budgetsByStatus: { onTrack: 0, warning: 0, overBudget: 0, inactive: 0 },
        topOverspentCategories: [],
        topUnderBudgetCategories: [],
        periodSummary: {
          period: "monthly",
          startDate: new Date(now.getFullYear(), now.getMonth(), 1),
          endDate: endOfMonth,
          daysElapsed,
          daysRemaining,
          percentOfPeriodElapsed: (daysElapsed / totalDays) * 100,
        },
        projectedEndOfPeriod: {
          projectedTotal: 0,
          projectedOverage: 0,
          projectedSavings: 0,
          confidence: 0,
        },
      },
      alerts: [],
      trends: [],
    };
  }

  private getEmptySpendingData(): AggregatedFinancialContext["spending"] {
    return {
      transactions: {
        recentTransactions: [],
        byCategory: [],
        byMerchant: [],
        totalIncome: 0,
        totalExpenses: 0,
        netCashFlow: 0,
        period: { startDate: new Date(), endDate: new Date(), daysIncluded: 0 },
      },
      monthlyAverage: 0,
      yearToDateTotal: 0,
      topCategories: [],
      anomalies: [],
    };
  }

  private getEmptyBillsData(): AggregatedFinancialContext["bills"] {
    return {
      items: [],
      recurring: [],
      summary: {
        totalMonthlyBills: 0,
        totalUpcoming: 0,
        totalOverdue: 0,
        upcomingBills: [],
        overdueBills: [],
        billsByCategory: {
          utilities: 0,
          rent: 0,
          mortgage: 0,
          insurance: 0,
          subscription: 0,
          loan: 0,
          credit_card: 0,
          phone: 0,
          internet: 0,
          streaming: 0,
          other: 0,
        },
      },
      totalMonthly: 0,
      negotiationOpportunities: 0,
    };
  }

  private getEmptySavingsData(): AggregatedFinancialContext["savings"] {
    return {
      goals: [],
      rules: [],
      summary: {
        totalSaved: 0,
        totalSavedThisMonth: 0,
        totalSavedThisYear: 0,
        savingsRate: 0,
        activeRules: 0,
        activeGoals: 0,
        goalsOnTrack: 0,
        goalsAtRisk: 0,
        projectedMonthlySavings: 0,
        roundUpSavings: 0,
        autoSaveSavings: 0,
      },
      totalSaved: 0,
      monthlyContributions: 0,
    };
  }

  private getEmptyDebtData(): AggregatedFinancialContext["debt"] {
    return {
      items: [],
      overview: {
        totalDebt: 0,
        totalMinimumPayments: 0,
        averageInterestRate: 0,
        highestInterestRate: 0,
        lowestBalance: 0,
        debtCount: 0,
        debtsByType: {},
      },
      totalDebt: 0,
      monthlyPayments: 0,
    };
  }

  private getEmptyInvestmentData(): AggregatedFinancialContext["investments"] {
    return {
      portfolio: {
        totalValue: 0,
        totalCostBasis: 0,
        totalGainLoss: 0,
        totalGainLossPercent: 0,
        dayChange: 0,
        dayChangePercent: 0,
        portfolios: [],
        allocation: [],
        topHoldings: [],
      },
      totalValue: 0,
      dayChange: 0,
      totalGainLoss: 0,
      diversificationScore: 0,
      riskLevel: "conservative",
      retirementReadiness: 0,
    };
  }

  private getEmptyCreditProfile(): CreditSummary {
    return {
      currentScore: 0,
      scoreChange: 0,
      scoreChangeDirection: "stable",
      lastUpdated: new Date(),
      scoreHistory: [],
      factors: [],
      activeDisputes: 0,
      resolvedDisputes: 0,
      bureauScores: [],
    };
  }

  private getEmptyTransactions(): CategorizedTransactions {
    return {
      recentTransactions: [],
      byCategory: [],
      byMerchant: [],
      totalIncome: 0,
      totalExpenses: 0,
      netCashFlow: 0,
      period: { startDate: new Date(), endDate: new Date(), daysIncluded: 0 },
    };
  }

  // ==========================================================================
  // MAPPING HELPERS
  // ==========================================================================

  private mapAccountFromDb(row: Record<string, unknown>): AccountSummary {
    const accountType = (row.account_type as string) || "checking";
    const validAccountTypes = [
      "savings",
      "checking",
      "credit",
      "investment",
      "loan",
      "other",
    ] as const;
    const mappedType = validAccountTypes.includes(
      accountType as (typeof validAccountTypes)[number],
    )
      ? (accountType as (typeof validAccountTypes)[number])
      : "other";

    return {
      id: row.id as string,
      institutionName: (row.institution_name as string) || "",
      accountName: (row.account_name as string) || "",
      accountType: mappedType,
      currentBalance: (row.current_balance as number) || 0,
      availableBalance: row.available_balance as number,
      creditLimit: row.credit_limit as number,
      interestRate: row.interest_rate as number,
      // `mask`/`last_synced` are the real financial_accounts columns
      // (plaid-service.ts storeAccount) — `last_four_digits`/`updated_at`
      // don't exist on this table and previously read as undefined on every
      // row.
      lastFourDigits: row.mask as string,
      isLinked: true,
      lastUpdatedAt: row.last_synced
        ? new Date(row.last_synced as string)
        : new Date(),
    };
  }

  private mapBudgetToStatus(budget: Budget): BudgetStatus {
    // Map quarterly to monthly for BudgetStatus which doesn't support quarterly
    const mapPeriod = (
      period: string,
    ): "weekly" | "biweekly" | "monthly" | "yearly" => {
      if (period === "quarterly") return "monthly";
      return period as "weekly" | "biweekly" | "monthly" | "yearly";
    };

    return {
      id: budget.id,
      category: budget.category,
      budgetedAmount: budget.budgetedAmount,
      spentAmount: budget.spentAmount,
      remainingAmount: budget.remainingAmount,
      percentUsed: budget.percentUsed,
      period: mapPeriod(budget.period),
      status: budget.status === "inactive" ? "on_track" : budget.status,
      daysRemaining: Math.max(
        0,
        Math.ceil(
          (budget.periodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        ),
      ),
      projectedOverage:
        budget.status === "over_budget"
          ? budget.spentAmount - budget.budgetedAmount
          : 0,
      rolloverEnabled: budget.rolloverEnabled,
      rolloverAmount: budget.rolloverAmount,
    };
  }

  private mapDebtToAnalysis(
    debts: Debt[],
    overview?: DebtOverview,
  ): DebtAnalysis {
    // Map Debt to DebtItem
    const debtItems: DebtItem[] = debts.map((d) => ({
      id: d.id,
      name: d.name,
      type: this.mapDebtType(d.type),
      balance: d.balance,
      interestRate: d.interestRate,
      minimumPayment: d.minimumPayment,
      linkedAccountId: d.linkedAccountId,
    }));

    // Calculate projected payoff date (simple estimate)
    const totalDebt = overview?.totalDebt || 0;
    const monthlyPayments = overview?.totalMinimumPayments || 0;
    const monthsToPayoff =
      monthlyPayments > 0 ? Math.ceil(totalDebt / monthlyPayments) : 0;
    const projectedPayoffDate = new Date();
    projectedPayoffDate.setMonth(
      projectedPayoffDate.getMonth() + monthsToPayoff,
    );

    // Calculate average interest rate
    const averageInterestRate =
      debtItems.length > 0
        ? debtItems.reduce((sum, d) => sum + d.interestRate, 0) /
          debtItems.length
        : 0;

    return {
      totalDebt,
      debtToIncomeRatio: overview?.debtToIncomeRatio || 0,
      averageInterestRate,
      monthlyPayments,
      debts: debtItems,
      payoffStrategies: [
        {
          name: "avalanche",
          description: "Pay off highest interest rate debts first",
          monthsToPayoff,
          totalInterest: 0,
          monthlyPayment: monthlyPayments,
          schedule: [],
        },
      ],
      projectedPayoffDate,
      totalInterestSaved: 0,
    };
  }

  private mapDebtType(type: string): DebtItem["type"] {
    const validTypes: DebtItem["type"][] = [
      "credit_card",
      "student_loan",
      "mortgage",
      "auto_loan",
      "personal_loan",
      "other",
    ];
    return validTypes.includes(type as DebtItem["type"])
      ? (type as DebtItem["type"])
      : "other";
  }

  // ==========================================================================
  // INSIGHT GENERATION
  // ==========================================================================

  private async generateInsights(
    _userId: string,
    data: {
      budgetData: AggregatedFinancialContext["budgets"] | null;
      spendingData: AggregatedFinancialContext["spending"] | null;
      debtData: AggregatedFinancialContext["debt"] | null;
      savingsData: AggregatedFinancialContext["savings"] | null;
    },
  ): Promise<AIInsight[]> {
    const insights: AIInsight[] = [];

    // Budget insights
    if (data.budgetData) {
      const overBudget = data.budgetData.items.filter(
        (b) => b.status === "over_budget",
      );
      if (overBudget.length > 0) {
        insights.push({
          id: `insight-budget-${Date.now()}`,
          type: "budget_warning" as InsightType,
          title: "Budget Alert",
          message: `${overBudget.length} budget(s) are over limit this period`,
          severity: "warning",
          actionType: "review_budgets",
          actionData: { overBudgetIds: overBudget.map((b) => b.id) },
          read: false,
          dismissed: false,
          createdAt: new Date(),
        });
      }
    }

    // Spending insights
    if (data.spendingData && data.spendingData.anomalies.length > 0) {
      insights.push({
        id: `insight-spending-${Date.now()}`,
        type: "spending_alert" as InsightType,
        title: "Unusual Spending Detected",
        message: `${data.spendingData.anomalies.length} unusual transaction(s) detected`,
        severity: "info",
        actionType: "review_transactions",
        read: false,
        dismissed: false,
        createdAt: new Date(),
      });
    }

    // Savings insights
    if (data.savingsData && data.savingsData.summary.savingsRate < 10) {
      insights.push({
        id: `insight-savings-${Date.now()}`,
        type: "savings_opportunity" as InsightType,
        title: "Low Savings Rate",
        message: "Your savings rate is below the recommended 10%",
        severity: "warning",
        actionType: "setup_savings",
        read: false,
        dismissed: false,
        createdAt: new Date(),
      });
    }

    // Debt insights
    if (data.debtData && data.debtData.overview.highestInterestRate > 20) {
      insights.push({
        id: `insight-debt-${Date.now()}`,
        type: "debt_advice" as InsightType,
        title: "High Interest Debt",
        message: `You have debt with ${data.debtData.overview.highestInterestRate.toFixed(1)}% interest rate`,
        severity: "critical",
        actionType: "debt_consolidation",
        read: false,
        dismissed: false,
        createdAt: new Date(),
      });
    }

    return insights;
  }

  private async generateRecommendations(
    _userId: string,
    data: {
      budgetData: AggregatedFinancialContext["budgets"] | null;
      spendingData: AggregatedFinancialContext["spending"] | null;
      debtData: AggregatedFinancialContext["debt"] | null;
      savingsData: AggregatedFinancialContext["savings"] | null;
    },
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // Savings recommendation
    if (!data.savingsData || data.savingsData.rules.length === 0) {
      recommendations.push({
        id: `rec-savings-${Date.now()}`,
        category: "increase_savings" as RecommendationCategory,
        title: "Set Up Automatic Savings",
        description:
          "Automate your savings with round-up rules or percentage-based transfers",
        impact: "high",
        effort: "easy",
        potentialSavings: 150,
        priority: 1,
        actionSteps: [
          "Go to Savings settings",
          "Enable round-up savings",
          "Set a percentage-based transfer rule",
        ],
      });
    }

    // Budget recommendation
    if (!data.budgetData || data.budgetData.items.length === 0) {
      recommendations.push({
        id: `rec-budget-${Date.now()}`,
        category: "reduce_spending" as RecommendationCategory,
        title: "Create Your First Budget",
        description: "Set spending limits for your top expense categories",
        impact: "high",
        effort: "easy",
        priority: 2,
        actionSteps: [
          "Review your spending categories",
          "Set monthly limits for each category",
          "Enable budget alerts",
        ],
      });
    }

    // Debt payoff recommendation
    if (data.debtData && data.debtData.items.length > 1) {
      recommendations.push({
        id: `rec-debt-${Date.now()}`,
        category: "pay_off_debt" as RecommendationCategory,
        title: "Optimize Debt Payoff Strategy",
        description:
          "Use the avalanche or snowball method to pay off debt faster",
        impact: "high",
        effort: "moderate",
        priority: 3,
        actionSteps: [
          "Review your debt list",
          "Choose avalanche (highest interest first) or snowball (smallest balance first)",
          "Set up automatic extra payments",
        ],
      });
    }

    return recommendations;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const financialAggregationService = new FinancialAggregationService();
