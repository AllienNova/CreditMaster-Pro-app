/**
 * Auto-Save Rules Service
 *
 * Automated savings rules engine supporting:
 * - Round-up savings on transactions
 * - Percentage-based transfers
 * - Fixed recurring transfers
 * - Goal-based automation
 * - Trigger-based rules (paycheck, windfall, etc.)
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ============================================================================
// TYPES
// ============================================================================

export type RuleType =
  | "round_up"
  | "percentage"
  | "fixed_amount"
  | "goal_contribution"
  | "paycheck_split"
  | "surplus_sweep"
  | "windfall_capture";

export type RuleStatus = "active" | "paused" | "disabled";
export type RuleFrequency =
  | "per_transaction"
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly";
export type TriggerType =
  | "transaction"
  | "income"
  | "balance"
  | "schedule"
  | "manual";

export interface AutoSaveRule {
  id: string;
  userId: string;
  name: string;
  description?: string;
  type: RuleType;
  status: RuleStatus;

  // Source and destination
  sourceAccountId: string;
  destinationAccountId: string;
  destinationGoalId?: string;

  // Rule configuration
  config: RuleConfig;

  // Triggers
  triggerType: TriggerType;
  triggerConditions?: TriggerConditions;

  // Limits
  minTransferAmount?: number;
  maxTransferAmount?: number;
  monthlyLimit?: number;

  // Tracking
  totalSaved: number;
  transferCount: number;
  lastTriggered?: Date;

  // Metadata
  priority: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type RuleConfig =
  | RoundUpConfig
  | PercentageConfig
  | FixedAmountConfig
  | GoalContributionConfig
  | PaycheckSplitConfig
  | SurplusSweepConfig
  | WindfallCaptureConfig;

export interface RoundUpConfig {
  type: "round_up";
  roundTo: 1 | 5 | 10; // Round to nearest $1, $5, or $10
  multiplier: number; // 1x, 2x, 3x the round-up amount
  includeCategories?: string[]; // Only round up certain categories
  excludeCategories?: string[]; // Exclude certain categories
}

export interface PercentageConfig {
  type: "percentage";
  percentage: number; // 1-100
  basedOn: "income" | "transaction" | "category_spending";
  category?: string;
}

export interface FixedAmountConfig {
  type: "fixed_amount";
  amount: number;
  frequency: RuleFrequency;
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
}

export interface GoalContributionConfig {
  type: "goal_contribution";
  goalId: string;
  targetDate: Date;
  calculatedAmount?: number; // Auto-calculated based on goal
}

export interface PaycheckSplitConfig {
  type: "paycheck_split";
  percentage: number;
  fixedAmount?: number; // Alternative to percentage
  employerName?: string; // Match specific employer
  minPaycheckAmount?: number;
}

export interface SurplusSweepConfig {
  type: "surplus_sweep";
  targetBalance: number; // Keep this much in checking
  sweepPercentage: number; // Sweep this % of surplus
  sweepDay: number; // Day of month to sweep
}

export interface WindfallCaptureConfig {
  type: "windfall_capture";
  minAmount: number; // Minimum to consider a windfall
  capturePercentage: number;
  windfallCategories: string[]; // Tax refund, bonus, gift, etc.
}

export interface TriggerConditions {
  minBalance?: number;
  maxBalance?: number;
  transactionCategories?: string[];
  transactionMinAmount?: number;
  dayOfWeek?: number[];
  dayOfMonth?: number[];
}

export interface SaveTransfer {
  id: string;
  ruleId: string;
  userId: string;
  amount: number;
  sourceAccountId: string;
  destinationAccountId: string;
  triggerTransactionId?: string;
  status: "pending" | "completed" | "failed" | "cancelled";
  failureReason?: string;
  scheduledDate: Date;
  executedDate?: Date;
  createdAt: Date;
}

export interface RuleSummary {
  totalRules: number;
  activeRules: number;
  totalSavedThisMonth: number;
  totalSavedAllTime: number;
  projectedMonthlySavings: number;
  topPerformingRule?: { name: string; amount: number };
}

// ============================================================================
// SERVICE
// ============================================================================

export class AutoSaveRulesService {
  private readonly supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // ==========================================================================
  // RULE CRUD
  // ==========================================================================

  async createRule(
    rule: Omit<
      AutoSaveRule,
      "id" | "totalSaved" | "transferCount" | "createdAt" | "updatedAt"
    >,
  ): Promise<AutoSaveRule> {
    const now = new Date();
    const newRule: AutoSaveRule = {
      ...rule,
      id: crypto.randomUUID(),
      totalSaved: 0,
      transferCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    const { data, error } = await this.supabase
      .from("auto_save_rules")
      .insert(this.toDbFormat(newRule))
      .select()
      .single();

    if (error) throw error;
    return this.fromDbFormat(data);
  }

  async updateRule(
    ruleId: string,
    updates: Partial<AutoSaveRule>,
  ): Promise<AutoSaveRule> {
    const { data, error } = await this.supabase
      .from("auto_save_rules")
      .update({
        ...this.toDbFormat(updates),
        updated_at: new Date().toISOString(),
      })
      .eq("id", ruleId)
      .select()
      .single();

    if (error) throw error;
    return this.fromDbFormat(data);
  }

  async toggleRuleStatus(
    ruleId: string,
    status: RuleStatus,
  ): Promise<AutoSaveRule> {
    return this.updateRule(ruleId, { status });
  }

  async deleteRule(ruleId: string): Promise<void> {
    const { error } = await this.supabase
      .from("auto_save_rules")
      .delete()
      .eq("id", ruleId);

    if (error) throw error;
  }

  async getRule(ruleId: string): Promise<AutoSaveRule | null> {
    const { data } = await this.supabase
      .from("auto_save_rules")
      .select("*")
      .eq("id", ruleId)
      .single();

    return data ? this.fromDbFormat(data) : null;
  }

  async getUserRules(
    userId: string,
    status?: RuleStatus,
  ): Promise<AutoSaveRule[]> {
    let query = this.supabase
      .from("auto_save_rules")
      .select("*")
      .eq("user_id", userId)
      .order("priority", { ascending: true });

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(this.fromDbFormat);
  }

  // ==========================================================================
  // RULE EXECUTION
  // ==========================================================================

  async evaluateTransaction(
    userId: string,
    transactionId: string,
    amount: number,
    category: string,
  ): Promise<SaveTransfer[]> {
    const rules = await this.getUserRules(userId, "active");
    const transfers: SaveTransfer[] = [];

    for (const rule of rules) {
      if (rule.triggerType !== "transaction") continue;

      const transferAmount = this.calculateTransferAmount(
        rule,
        amount,
        category,
      );
      if (transferAmount <= 0) continue;

      // Check limits
      if (rule.minTransferAmount && transferAmount < rule.minTransferAmount)
        continue;
      if (rule.maxTransferAmount && transferAmount > rule.maxTransferAmount)
        continue;

      // Check monthly limit
      if (rule.monthlyLimit) {
        const monthlyTotal = await this.getMonthlyTotalForRule(rule.id);
        if (monthlyTotal + transferAmount > rule.monthlyLimit) continue;
      }

      const transfer = await this.createTransfer({
        ruleId: rule.id,
        userId,
        amount: transferAmount,
        sourceAccountId: rule.sourceAccountId,
        destinationAccountId: rule.destinationAccountId,
        triggerTransactionId: transactionId,
        status: "pending",
        scheduledDate: new Date(),
      });

      transfers.push(transfer);
    }

    return transfers;
  }

  private calculateTransferAmount(
    rule: AutoSaveRule,
    transactionAmount: number,
    category: string,
  ): number {
    const config = rule.config;

    switch (config.type) {
      case "round_up": {
        // Check category filters
        if (
          config.includeCategories?.length &&
          !config.includeCategories.includes(category)
        ) {
          return 0;
        }
        if (config.excludeCategories?.includes(category)) {
          return 0;
        }

        const rounded =
          Math.ceil(transactionAmount / config.roundTo) * config.roundTo;
        const roundUp = (rounded - transactionAmount) * config.multiplier;
        return Math.max(0, roundUp);
      }

      case "percentage": {
        if (config.basedOn === "transaction") {
          return transactionAmount * (config.percentage / 100);
        }
        if (
          config.basedOn === "category_spending" &&
          config.category === category
        ) {
          return transactionAmount * (config.percentage / 100);
        }
        return 0;
      }

      case "windfall_capture": {
        if (
          transactionAmount >= config.minAmount &&
          config.windfallCategories.includes(category)
        ) {
          return transactionAmount * (config.capturePercentage / 100);
        }
        return 0;
      }

      default:
        return 0;
    }
  }

  async evaluateScheduledRules(userId: string): Promise<SaveTransfer[]> {
    const rules = await this.getUserRules(userId, "active");
    const transfers: SaveTransfer[] = [];
    const now = new Date();

    for (const rule of rules) {
      if (rule.triggerType !== "schedule") continue;

      const config = rule.config as FixedAmountConfig | SurplusSweepConfig;

      if (config.type === "fixed_amount") {
        if (this.shouldTriggerFixedAmount(config, now)) {
          const transfer = await this.createTransfer({
            ruleId: rule.id,
            userId,
            amount: config.amount,
            sourceAccountId: rule.sourceAccountId,
            destinationAccountId: rule.destinationAccountId,
            status: "pending",
            scheduledDate: now,
          });
          transfers.push(transfer);
        }
      }

      if (config.type === "surplus_sweep") {
        if (now.getDate() === config.sweepDay) {
          // Would need account balance integration here
          // For now, this creates the framework
        }
      }
    }

    return transfers;
  }

  private shouldTriggerFixedAmount(
    config: FixedAmountConfig,
    date: Date,
  ): boolean {
    switch (config.frequency) {
      case "daily":
        return true;
      case "weekly":
        return config.dayOfWeek === date.getDay();
      case "biweekly":
        // Simplified: trigger on specific day every other week
        const weekNumber = Math.floor(
          date.getTime() / (7 * 24 * 60 * 60 * 1000),
        );
        return config.dayOfWeek === date.getDay() && weekNumber % 2 === 0;
      case "monthly":
        return config.dayOfMonth === date.getDate();
      default:
        return false;
    }
  }

  // ==========================================================================
  // TRANSFERS
  // ==========================================================================

  async createTransfer(
    transfer: Omit<SaveTransfer, "id" | "createdAt">,
  ): Promise<SaveTransfer> {
    const newTransfer = {
      ...transfer,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };

    const { data, error } = await this.supabase
      .from("save_transfers")
      .insert({
        id: newTransfer.id,
        rule_id: newTransfer.ruleId,
        user_id: newTransfer.userId,
        amount: newTransfer.amount,
        source_account_id: newTransfer.sourceAccountId,
        destination_account_id: newTransfer.destinationAccountId,
        trigger_transaction_id: newTransfer.triggerTransactionId,
        status: newTransfer.status,
        scheduled_date: newTransfer.scheduledDate.toISOString(),
        created_at: newTransfer.created_at,
      })
      .select()
      .single();

    if (error) throw error;
    return this.transferFromDb(data);
  }

  async executeTransfer(transferId: string): Promise<SaveTransfer> {
    const { data: transfer } = await this.supabase
      .from("save_transfers")
      .select("*")
      .eq("id", transferId)
      .single();

    if (!transfer) throw new Error("Transfer not found");

    // In a real implementation, this would integrate with banking APIs
    // For now, we mark it as completed and update stats

    const { data, error } = await this.supabase
      .from("save_transfers")
      .update({
        status: "completed",
        executed_date: new Date().toISOString(),
      })
      .eq("id", transferId)
      .select()
      .single();

    if (error) throw error;

    // Update rule statistics
    await this.supabase.rpc("increment_rule_stats", {
      rule_id: transfer.rule_id,
      amount: transfer.amount,
    });

    return this.transferFromDb(data);
  }

  async getTransferHistory(
    userId: string,
    limit: number = 50,
  ): Promise<SaveTransfer[]> {
    const { data, error } = await this.supabase
      .from("save_transfers")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []).map(this.transferFromDb);
  }

  // ==========================================================================
  // ANALYTICS
  // ==========================================================================

  async getRuleSummary(userId: string): Promise<RuleSummary> {
    const rules = await this.getUserRules(userId);
    const activeRules = rules.filter((r) => r.status === "active");

    // Get this month's savings
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: monthlyTransfers } = await this.supabase
      .from("save_transfers")
      .select("amount")
      .eq("user_id", userId)
      .eq("status", "completed")
      .gte("executed_date", startOfMonth.toISOString());

    const totalSavedThisMonth = (monthlyTransfers || []).reduce(
      (sum, t) => sum + t.amount,
      0,
    );
    const totalSavedAllTime = rules.reduce((sum, r) => sum + r.totalSaved, 0);

    // Calculate projected monthly savings
    let projectedMonthlySavings = 0;
    for (const rule of activeRules) {
      projectedMonthlySavings += this.estimateMonthlyContribution(rule);
    }

    // Find top performing rule
    const sortedRules = [...rules].sort((a, b) => b.totalSaved - a.totalSaved);
    const topRule = sortedRules[0];

    return {
      totalRules: rules.length,
      activeRules: activeRules.length,
      totalSavedThisMonth,
      totalSavedAllTime,
      projectedMonthlySavings,
      topPerformingRule: topRule
        ? { name: topRule.name, amount: topRule.totalSaved }
        : undefined,
    };
  }

  private estimateMonthlyContribution(rule: AutoSaveRule): number {
    const config = rule.config;

    switch (config.type) {
      case "fixed_amount":
        switch (config.frequency) {
          case "daily":
            return config.amount * 30;
          case "weekly":
            return config.amount * 4;
          case "biweekly":
            return config.amount * 2;
          case "monthly":
            return config.amount;
          default:
            return 0;
        }
      case "round_up":
        // Estimate based on average transaction count
        return (config.roundTo / 2) * config.multiplier * 50; // ~50 transactions/month
      case "percentage":
        // Would need income data for accurate estimate
        return 0;
      default:
        return 0;
    }
  }

  private async getMonthlyTotalForRule(ruleId: string): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data } = await this.supabase
      .from("save_transfers")
      .select("amount")
      .eq("rule_id", ruleId)
      .eq("status", "completed")
      .gte("executed_date", startOfMonth.toISOString());

    return (data || []).reduce((sum, t) => sum + t.amount, 0);
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private toDbFormat(rule: Partial<AutoSaveRule>): Record<string, unknown> {
    return {
      id: rule.id,
      user_id: rule.userId,
      name: rule.name,
      description: rule.description,
      type: rule.type,
      status: rule.status,
      source_account_id: rule.sourceAccountId,
      destination_account_id: rule.destinationAccountId,
      destination_goal_id: rule.destinationGoalId,
      config: rule.config,
      trigger_type: rule.triggerType,
      trigger_conditions: rule.triggerConditions,
      min_transfer_amount: rule.minTransferAmount,
      max_transfer_amount: rule.maxTransferAmount,
      monthly_limit: rule.monthlyLimit,
      total_saved: rule.totalSaved,
      transfer_count: rule.transferCount,
      last_triggered: rule.lastTriggered?.toISOString(),
      priority: rule.priority,
      tags: rule.tags,
      created_at: rule.createdAt?.toISOString(),
      updated_at: rule.updatedAt?.toISOString(),
    };
  }

  private fromDbFormat(data: Record<string, unknown>): AutoSaveRule {
    return {
      id: data.id as string,
      userId: data.user_id as string,
      name: data.name as string,
      description: data.description as string | undefined,
      type: data.type as RuleType,
      status: data.status as RuleStatus,
      sourceAccountId: data.source_account_id as string,
      destinationAccountId: data.destination_account_id as string,
      destinationGoalId: data.destination_goal_id as string | undefined,
      config: data.config as RuleConfig,
      triggerType: data.trigger_type as TriggerType,
      triggerConditions: data.trigger_conditions as
        | TriggerConditions
        | undefined,
      minTransferAmount: data.min_transfer_amount as number | undefined,
      maxTransferAmount: data.max_transfer_amount as number | undefined,
      monthlyLimit: data.monthly_limit as number | undefined,
      totalSaved: data.total_saved as number,
      transferCount: data.transfer_count as number,
      lastTriggered: data.last_triggered
        ? new Date(data.last_triggered as string)
        : undefined,
      priority: data.priority as number,
      tags: (data.tags as string[]) || [],
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
    };
  }

  private transferFromDb(data: Record<string, unknown>): SaveTransfer {
    return {
      id: data.id as string,
      ruleId: data.rule_id as string,
      userId: data.user_id as string,
      amount: data.amount as number,
      sourceAccountId: data.source_account_id as string,
      destinationAccountId: data.destination_account_id as string,
      triggerTransactionId: data.trigger_transaction_id as string | undefined,
      status: data.status as "pending" | "completed" | "failed" | "cancelled",
      failureReason: data.failure_reason as string | undefined,
      scheduledDate: new Date(data.scheduled_date as string),
      executedDate: data.executed_date
        ? new Date(data.executed_date as string)
        : undefined,
      createdAt: new Date(data.created_at as string),
    };
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let autoSaveRulesServiceInstance: AutoSaveRulesService | null = null;

export function getAutoSaveRulesService(): AutoSaveRulesService {
  if (!autoSaveRulesServiceInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    autoSaveRulesServiceInstance = new AutoSaveRulesService(
      supabaseUrl,
      supabaseKey,
    );
  }
  return autoSaveRulesServiceInstance;
}
