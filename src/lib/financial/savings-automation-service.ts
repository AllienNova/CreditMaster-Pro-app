/**
 * Savings Automation Service
 *
 * Provides smart savings automation including:
 * - Round-up savings rules
 * - Percentage-based auto-save
 * - Fixed amount transfers
 * - Surplus savings
 * - Goal-based automation
 */

import { getServiceRoleClient } from "@/lib/supabase/service-role";
import {
  createClient as createSupabaseClient,
  SupabaseClient,
} from "@supabase/supabase-js";

/**
 * `getServiceRoleClient()` (anon key, no forwarded JWT) cannot satisfy this table's
 * `auth.uid() = user_id` RLS policies — auth.uid() evaluates to NULL for
 * that client, and the underlying `anon`/`authenticated` Postgres roles hold
 * no base SELECT/INSERT/UPDATE/DELETE grant on `financial_goals` or the
 * `savings_*` tables either (verified live 2026-07-31 via
 * information_schema.role_table_grants), so every call would fail closed
 * with 42501 permission denied regardless of RLS. service_role is the
 * established fix for this pattern in this session (wellness-gate.ts,
 * plaid-service.ts) — this service already enforces per-user scoping
 * itself via explicit `.eq("user_id", userId)` on every query below, so
 * bypassing RLS here does not weaken authorization.
 *
 * The shared, typed `supabaseAdmin` (@/lib/supabase/admin) cannot be used
 * directly: none of financial_goals' new columns or the three new
 * savings_* tables are in the generated `Database` type (src/lib/supabase/
 * types.ts covers ~27 of the 40+ real tables), so its `<Database>` generic
 * infers `never` for every call here and rejects them at compile time. This
 * mirrors plaid-service.ts's getServiceRoleClient() (same root cause,
 * documented there in full) and the other ~20 call sites across this
 * codebase that hit the same generated-type gap — untyped, service-role,
 * lazily constructed so `next build`'s page-data-collection phase (which
 * imports every route module with no runtime env) doesn't abort on an
 * eager `createClient()` call.
 */
const supabaseAdmin = getServiceRoleClient();

import {
  SavingsRule,
  SavingsRuleType,
  SavingsRuleStatus,
  SavingsGoal,
  SavingsGoalStatus,
  SavingsGoalCategory,
  SavingsContribution,
  SavingsTransfer,
  SavingsSummary,
  SavingsInsight,
  SavingsRecommendation,
  CreateSavingsRuleInput,
  UpdateSavingsRuleInput,
  CreateSavingsGoalInput,
  UpdateSavingsGoalInput,
  AddContributionInput,
  RoundUpCalculation,
  SavingsRuleConfig,
} from "./types/savings.types";

/**
 * `financial_goals.type` is a pre-existing NOT NULL column (with its own
 * CHECK constraint) already populated by 13+ other reachable consumers
 * (goal-planner.ts, GoalInvestmentService.ts, financial-chat-engine.ts,
 * wellness-gate.ts, etc.) for general goal-tracking. This service's
 * `SavingsGoal.category` is a separate, savings-specific vocabulary (see
 * `savings.types.ts`) stored in a new, additive `category` column — it does
 * NOT reuse `type`, so it can't corrupt the general goal-tracking feature's
 * discriminator. But every INSERT into the shared table must still satisfy
 * `type`'s NOT NULL + CHECK constraint, so this maps the savings category
 * onto the closest existing `type` value. Categories with no direct
 * equivalent in `type`'s vocabulary (vacation, major_purchase) fall back to
 * "custom"; `home_down_payment` maps to the semantically closest
 * "home_purchase".
 */
function mapCategoryToGoalType(category: SavingsGoalCategory): string {
  const mapping: Record<SavingsGoalCategory, string> = {
    emergency_fund: "emergency_fund",
    debt_payoff: "debt_payoff",
    retirement: "retirement",
    education: "education",
    custom: "custom",
    vacation: "custom",
    major_purchase: "custom",
    home_down_payment: "home_purchase",
  };
  return mapping[category] ?? "custom";
}

/**
 * Savings Automation Service Class
 */
class SavingsAutomationService {
  // ============================================
  // SAVINGS RULES MANAGEMENT
  // ============================================

  /**
   * Get all savings rules for a user
   */
  async getRules(userId: string): Promise<SavingsRule[]> {
    const { data, error } = await supabaseAdmin
      .from("savings_rules")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      // SavingsAutomationService error: Error fetching savings rules
      return [];
    }

    return (data || []).map(this.mapRuleFromDb);
  }

  /**
   * Get a single savings rule by ID
   */
  async getRule(userId: string, ruleId: string): Promise<SavingsRule | null> {
    const { data, error } = await supabaseAdmin
      .from("savings_rules")
      .select("*")
      .eq("id", ruleId)
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapRuleFromDb(data);
  }

  /**
   * Create a new savings rule
   */
  async createRule(
    userId: string,
    input: CreateSavingsRuleInput,
  ): Promise<SavingsRule> {
    const { data, error } = await supabaseAdmin
      // idor-audit: pk-owner-checked — INSERT writes `user_id` from the caller-supplied id; there is no prior row to filter on
      .from("savings_rules")
      .insert({
        user_id: userId,
        name: input.name,
        type: input.type,
        frequency: input.frequency,
        status: "active",
        config: input.config,
        goal_id: input.goalId,
        source_account_id: input.sourceAccountId,
        destination_account_id: input.destinationAccountId,
        total_saved: 0,
        transfer_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create savings rule: ${error?.message}`);
    }

    return this.mapRuleFromDb(data);
  }

  /**
   * Update a savings rule
   */
  async updateRule(
    userId: string,
    ruleId: string,
    input: UpdateSavingsRuleInput,
  ): Promise<SavingsRule> {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.config !== undefined) {
      // Merge with existing config
      const existing = await this.getRule(userId, ruleId);
      if (existing) {
        updateData.config = { ...existing.config, ...input.config };
      }
    }
    if (input.goalId !== undefined) updateData.goal_id = input.goalId;
    if (input.sourceAccountId !== undefined)
      updateData.source_account_id = input.sourceAccountId;
    if (input.destinationAccountId !== undefined)
      updateData.destination_account_id = input.destinationAccountId;

    const { data, error } = await supabaseAdmin
      .from("savings_rules")
      .update(updateData)
      .eq("id", ruleId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to update savings rule: ${error?.message}`);
    }

    return this.mapRuleFromDb(data);
  }

  /**
   * Delete a savings rule
   */
  async deleteRule(userId: string, ruleId: string): Promise<boolean> {
    const { error } = await supabaseAdmin
      .from("savings_rules")
      .delete()
      .eq("id", ruleId)
      .eq("user_id", userId);

    return !error;
  }

  /**
   * Toggle rule status (active/paused)
   */
  async toggleRuleStatus(userId: string, ruleId: string): Promise<SavingsRule> {
    const rule = await this.getRule(userId, ruleId);
    if (!rule) {
      throw new Error("Rule not found");
    }

    const newStatus: SavingsRuleStatus =
      rule.status === "active" ? "paused" : "active";
    return this.updateRule(userId, ruleId, { status: newStatus });
  }

  // ============================================
  // SAVINGS GOALS MANAGEMENT
  // ============================================

  /**
   * Get all savings goals for a user
   */
  async getGoals(userId: string): Promise<SavingsGoal[]> {
    const { data, error } = await supabaseAdmin
      .from("financial_goals")
      .select("*")
      .eq("user_id", userId)
      .order("priority", { ascending: true });

    if (error) {
      // SavingsAutomationService error: Error fetching savings goals
      return [];
    }

    const goals = (data || []).map(this.mapGoalFromDb);

    // Fetch contributions for each goal
    for (const goal of goals) {
      goal.contributions = await this.getContributions(goal.id, userId);
    }

    return goals;
  }

  /**
   * Get a single savings goal by ID
   */
  async getGoal(userId: string, goalId: string): Promise<SavingsGoal | null> {
    const { data, error } = await supabaseAdmin
      .from("financial_goals")
      .select("*")
      .eq("id", goalId)
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      return null;
    }

    const goal = this.mapGoalFromDb(data);
    goal.contributions = await this.getContributions(goalId, userId);
    return goal;
  }

  /**
   * Create a new savings goal
   */
  async createGoal(
    userId: string,
    input: CreateSavingsGoalInput,
  ): Promise<SavingsGoal> {
    const { data, error } = await supabaseAdmin
      // idor-audit: pk-owner-checked — INSERT writes `user_id` from the caller-supplied id; there is no prior row to filter on
      .from("financial_goals")
      .insert({
        user_id: userId,
        name: input.name,
        category: input.category,
        // financial_goals.type is NOT NULL — see mapCategoryToGoalType doc.
        type: mapCategoryToGoalType(input.category),
        status: "active",
        target_amount: input.targetAmount,
        current_amount: 0,
        target_date: input.targetDate?.toISOString(),
        start_date: new Date().toISOString(),
        auto_save_enabled: input.autoSaveEnabled ?? false,
        priority: input.priority ?? 1,
        icon: input.icon,
        color: input.color,
        notes: input.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create savings goal: ${error?.message}`);
    }

    const goal = this.mapGoalFromDb(data);
    goal.contributions = [];
    return goal;
  }

  /**
   * Update a savings goal
   */
  async updateGoal(
    userId: string,
    goalId: string,
    input: UpdateSavingsGoalInput,
  ): Promise<SavingsGoal> {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.category !== undefined) {
      updateData.category = input.category;
      // Keep financial_goals.type (shared, NOT NULL) in sync so a stale
      // value doesn't leak into the general goal-tracking feature's type
      // filter — see mapCategoryToGoalType doc.
      updateData.type = mapCategoryToGoalType(input.category);
    }
    if (input.status !== undefined) updateData.status = input.status;
    if (input.targetAmount !== undefined)
      updateData.target_amount = input.targetAmount;
    if (input.targetDate !== undefined)
      updateData.target_date = input.targetDate?.toISOString();
    if (input.priority !== undefined) updateData.priority = input.priority;
    if (input.autoSaveEnabled !== undefined)
      updateData.auto_save_enabled = input.autoSaveEnabled;
    if (input.icon !== undefined) updateData.icon = input.icon;
    if (input.color !== undefined) updateData.color = input.color;
    if (input.notes !== undefined) updateData.notes = input.notes;

    const { data, error } = await supabaseAdmin
      .from("financial_goals")
      .update(updateData)
      .eq("id", goalId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to update savings goal: ${error?.message}`);
    }

    const goal = this.mapGoalFromDb(data);
    goal.contributions = await this.getContributions(goalId, userId);
    return goal;
  }

  /**
   * Delete a savings goal
   */
  async deleteGoal(userId: string, goalId: string): Promise<boolean> {
    const { error } = await supabaseAdmin
      .from("financial_goals")
      .delete()
      .eq("id", goalId)
      .eq("user_id", userId);

    return !error;
  }

  /**
   * Add contribution to a goal
   */
  async addContribution(
    userId: string,
    input: AddContributionInput,
  ): Promise<SavingsContribution> {
    // Create contribution record
    const { data: contribution, error: contribError } = await supabaseAdmin
      // idor-audit: pk-owner-checked — INSERT writes `user_id` from the caller-supplied id; there is no prior row to filter on
      .from("savings_contributions")
      .insert({
        // user_id is required (NOT NULL, RLS-backing column) — the caller
        // already has it; nothing upstream previously threaded it through.
        user_id: userId,
        goal_id: input.goalId,
        amount: input.amount,
        source: input.source || "manual",
        note: input.note,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (contribError || !contribution) {
      throw new Error(`Failed to add contribution: ${contribError?.message}`);
    }

    // Update goal's current amount
    const goal = await this.getGoal(userId, input.goalId);
    if (goal) {
      const newAmount = goal.currentAmount + input.amount;
      const newStatus: SavingsGoalStatus =
        newAmount >= goal.targetAmount ? "completed" : goal.status;

      await supabaseAdmin
        .from("financial_goals")
        .update({
          current_amount: newAmount,
          status: newStatus,
          completed_at:
            newStatus === "completed" ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", input.goalId)
        .eq("user_id", userId);
    }

    return this.mapContributionFromDb(contribution);
  }

  /**
   * Get contributions for a goal
   */
  /**
   * Contributions for one goal.
   *
   * `userId` is required, not optional. This runs on the service role, which
   * bypasses RLS, so scoping by `goal_id` alone was safe only because all
   * three internal callers happened to resolve the goal through a
   * `.eq("user_id", ...)` query first. That is safe by convention, and the
   * method is public — the next caller to pass a goalId straight off a request
   * path would have made it an IDOR with no code change here at all.
   */
  async getContributions(
    goalId: string,
    userId: string,
  ): Promise<SavingsContribution[]> {
    const { data, error } = await supabaseAdmin
      .from("savings_contributions")
      .select("*")
      .eq("goal_id", goalId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      // An empty list here is indistinguishable from "this goal has no
      // contributions", which is how a broken query reads as a legitimate
      // answer. Log it so the failure is observable, then degrade — the goal
      // itself still renders.
      console.error("getContributions failed", {
        goalId,
        userId,
        error: error.message,
      });
      return [];
    }

    return (data || []).map(this.mapContributionFromDb);
  }

  // ============================================
  // ROUND-UP CALCULATIONS
  // ============================================

  /**
   * Calculate round-up amount for a transaction
   */
  calculateRoundUp(
    amount: number,
    roundUpTo: 1 | 5 | 10 = 1,
    multiplier: number = 1,
  ): RoundUpCalculation {
    const roundedAmount = Math.ceil(amount / roundUpTo) * roundUpTo;
    const roundUpAmount = roundedAmount - amount;
    const multipliedAmount = roundUpAmount * multiplier;

    return {
      originalAmount: amount,
      roundedAmount,
      roundUpAmount,
      multipliedAmount,
    };
  }

  /**
   * Process round-up for a transaction
   */
  async processRoundUp(
    userId: string,
    transactionAmount: number,
    ruleId: string,
  ): Promise<SavingsTransfer | null> {
    const rule = await this.getRule(userId, ruleId);
    if (!rule || rule.status !== "active" || rule.type !== "round_up") {
      return null;
    }

    const config = rule.config;
    const roundUp = this.calculateRoundUp(
      transactionAmount,
      config.roundUpTo || 1,
      config.roundUpMultiplier || 1,
    );

    // Check limits
    if (
      config.maxPerTransaction &&
      roundUp.multipliedAmount > config.maxPerTransaction
    ) {
      return null;
    }

    // Create transfer record
    const transfer = await this.createTransfer(userId, {
      ruleId,
      goalId: rule.goalId,
      amount: roundUp.multipliedAmount,
      sourceAccountId: rule.sourceAccountId || "",
      destinationAccountId: rule.destinationAccountId || "",
      triggerType: "transaction",
    });

    // Update rule statistics
    await this.updateRuleStats(userId, ruleId, roundUp.multipliedAmount);

    return transfer;
  }

  // ============================================
  // SAVINGS SUMMARY & INSIGHTS
  // ============================================

  /**
   * Get savings summary for a user
   */
  async getSummary(userId: string): Promise<SavingsSummary> {
    const rules = await this.getRules(userId);
    const goals = await this.getGoals(userId);

    const activeRules = rules.filter((r) => r.status === "active");
    const activeGoals = goals.filter((g) => g.status === "active");

    const totalSaved = rules.reduce((sum, r) => sum + r.totalSaved, 0);

    // Calculate this month's savings
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: monthTransfers } = await supabaseAdmin
      .from("savings_transfers")
      .select("amount")
      .eq("user_id", userId)
      .eq("status", "completed")
      .gte("created_at", startOfMonth.toISOString());

    const totalSavedThisMonth = (monthTransfers || []).reduce(
      (sum: number, t: { amount: number }) => sum + t.amount,
      0,
    );

    // Calculate this year's savings
    const startOfYear = new Date();
    startOfYear.setMonth(0, 1);
    startOfYear.setHours(0, 0, 0, 0);

    const { data: yearTransfers } = await supabaseAdmin
      .from("savings_transfers")
      .select("amount")
      .eq("user_id", userId)
      .eq("status", "completed")
      .gte("created_at", startOfYear.toISOString());

    const totalSavedThisYear = (yearTransfers || []).reduce(
      (sum: number, t: { amount: number }) => sum + t.amount,
      0,
    );

    // Calculate round-up vs auto-save breakdown
    const roundUpRules = rules.filter((r) => r.type === "round_up");
    const roundUpSavings = roundUpRules.reduce(
      (sum, r) => sum + r.totalSaved,
      0,
    );
    const autoSaveSavings = totalSaved - roundUpSavings;

    // Goals on track calculation
    const goalsOnTrack = activeGoals.filter((g) => g.onTrack).length;
    const goalsAtRisk = activeGoals.length - goalsOnTrack;

    // Project monthly savings based on active rules
    const projectedMonthlySavings =
      this.calculateProjectedMonthlySavings(activeRules);

    return {
      totalSaved,
      totalSavedThisMonth,
      totalSavedThisYear,
      savingsRate: 0, // Would need income data to calculate
      activeRules: activeRules.length,
      activeGoals: activeGoals.length,
      goalsOnTrack,
      goalsAtRisk,
      projectedMonthlySavings,
      roundUpSavings,
      autoSaveSavings,
    };
  }

  /**
   * Get savings insights and recommendations
   */
  async getInsights(userId: string): Promise<SavingsInsight[]> {
    const insights: SavingsInsight[] = [];
    const rules = await this.getRules(userId);
    const goals = await this.getGoals(userId);
    const summary = await this.getSummary(userId);

    // Check if no rules exist
    if (rules.length === 0) {
      insights.push({
        type: "opportunity",
        title: "Start Saving Automatically",
        description:
          "Set up your first savings rule to start building wealth automatically.",
        actionable: true,
        action: {
          label: "Create Rule",
          type: "create_rule",
        },
      });
    }

    // Check for round-up opportunity
    const hasRoundUp = rules.some((r) => r.type === "round_up");
    if (!hasRoundUp) {
      insights.push({
        type: "tip",
        title: "Try Round-Up Savings",
        description:
          "Round up your purchases to the nearest dollar and save the difference. Small amounts add up!",
        impact: 50, // Estimated monthly impact
        actionable: true,
        action: {
          label: "Enable Round-Up",
          type: "create_rule",
          data: { type: "round_up" },
        },
      });
    }

    // Check goals at risk
    const atRiskGoals = goals.filter(
      (g) => g.status === "active" && !g.onTrack,
    );
    for (const goal of atRiskGoals) {
      insights.push({
        type: "warning",
        title: `${goal.name} is Behind Schedule`,
        description: `You need to increase contributions to reach your goal by ${goal.targetDate?.toLocaleDateString() || "the target date"}.`,
        actionable: true,
        action: {
          label: "View Goal",
          type: "view_goal",
          data: { goalId: goal.id },
        },
      });
    }

    // Achievement for savings milestones
    if (summary.totalSaved >= 1000 && summary.totalSaved < 1100) {
      insights.push({
        type: "achievement",
        title: "$1,000 Saved!",
        description:
          "Congratulations! You've saved over $1,000 with automation.",
        actionable: false,
      });
    }

    return insights;
  }

  /**
   * Get savings recommendations
   */
  async getRecommendations(userId: string): Promise<SavingsRecommendation[]> {
    const recommendations: SavingsRecommendation[] = [];
    const rules = await this.getRules(userId);
    const goals = await this.getGoals(userId);

    // Recommend round-up if not enabled
    const hasRoundUp = rules.some(
      (r) => r.type === "round_up" && r.status === "active",
    );
    if (!hasRoundUp) {
      recommendations.push({
        id: "rec-roundup",
        type: "new_rule",
        title: "Enable Round-Up Savings",
        description: "Automatically save spare change from every purchase.",
        potentialSavings: 50,
        confidence: 0.9,
        suggestedRule: {
          name: "Round-Up Savings",
          type: "round_up",
          config: { roundUpTo: 1, roundUpMultiplier: 1 },
        },
      });
    }

    // Recommend percentage savings if income detected
    const hasPercentage = rules.some(
      (r) => r.type === "percentage" && r.status === "active",
    );
    if (!hasPercentage) {
      recommendations.push({
        id: "rec-percentage",
        type: "new_rule",
        title: "Save 10% of Income",
        description: "Automatically save a percentage of each paycheck.",
        potentialSavings: 300,
        confidence: 0.85,
        suggestedRule: {
          name: "10% Income Savings",
          type: "percentage",
          config: { percentageOfIncome: 10 },
        },
      });
    }

    // Recommend emergency fund goal if not exists
    const hasEmergencyFund = goals.some((g) => g.category === "emergency_fund");
    if (!hasEmergencyFund) {
      recommendations.push({
        id: "rec-emergency",
        type: "new_goal",
        title: "Start an Emergency Fund",
        description: "Build a safety net of 3-6 months of expenses.",
        potentialSavings: 0,
        confidence: 0.95,
        suggestedGoal: {
          name: "Emergency Fund",
          category: "emergency_fund",
          targetAmount: 10000,
        },
      });
    }

    return recommendations;
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Create a savings transfer record
   */
  private async createTransfer(
    userId: string,
    data: {
      ruleId: string;
      goalId?: string;
      amount: number;
      sourceAccountId: string;
      destinationAccountId: string;
      triggerType: "transaction" | "scheduled" | "manual";
      triggerTransactionId?: string;
    },
  ): Promise<SavingsTransfer> {
    const { data: transfer, error } = await supabaseAdmin
      // idor-audit: pk-owner-checked — INSERT writes `user_id` from the caller-supplied id; there is no prior row to filter on
      .from("savings_transfers")
      .insert({
        user_id: userId,
        rule_id: data.ruleId,
        goal_id: data.goalId,
        amount: data.amount,
        status: "completed", // In real implementation, this would be 'pending' until confirmed
        source_account_id: data.sourceAccountId,
        destination_account_id: data.destinationAccountId,
        trigger_type: data.triggerType,
        trigger_transaction_id: data.triggerTransactionId,
        executed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !transfer) {
      throw new Error(`Failed to create transfer: ${error?.message}`);
    }

    // If linked to a goal, add contribution
    if (data.goalId) {
      await this.addContribution(userId, {
        goalId: data.goalId,
        amount: data.amount,
        source: "auto_rule",
      });
    }

    return this.mapTransferFromDb(transfer);
  }

  /**
   * Update rule statistics after a transfer
   */
  private async updateRuleStats(
    userId: string,
    ruleId: string,
    amount: number,
  ): Promise<void> {
    const rule = await this.getRule(userId, ruleId);
    if (!rule) return;

    await supabaseAdmin
      .from("savings_rules")
      .update({
        total_saved: rule.totalSaved + amount,
        transfer_count: rule.transferCount + 1,
        last_triggered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", ruleId)
      .eq("user_id", userId);
  }

  /**
   * Calculate projected monthly savings from active rules
   */
  private calculateProjectedMonthlySavings(rules: SavingsRule[]): number {
    let projected = 0;

    for (const rule of rules) {
      if (rule.status !== "active") continue;

      switch (rule.type) {
        case "round_up":
          // Estimate based on average transactions per month
          projected += 50; // Average round-up savings
          break;
        case "percentage":
          // Would need income data
          projected += (rule.config.percentageOfIncome || 10) * 30; // Rough estimate
          break;
        case "fixed":
          const amount = rule.config.fixedAmount || 0;
          switch (rule.frequency) {
            case "daily":
              projected += amount * 30;
              break;
            case "weekly":
              projected += amount * 4;
              break;
            case "biweekly":
              projected += amount * 2;
              break;
            case "monthly":
              projected += amount;
              break;
          }
          break;
      }
    }

    return Math.round(projected * 100) / 100;
  }

  // ============================================
  // DATABASE MAPPERS
  // ============================================

  private mapRuleFromDb(row: Record<string, unknown>): SavingsRule {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      name: row.name as string,
      type: row.type as SavingsRuleType,
      frequency: row.frequency as SavingsRule["frequency"],
      status: row.status as SavingsRuleStatus,
      config: (row.config as SavingsRuleConfig) || {},
      goalId: row.goal_id as string | undefined,
      sourceAccountId: row.source_account_id as string | undefined,
      destinationAccountId: row.destination_account_id as string | undefined,
      totalSaved: (row.total_saved as number) || 0,
      transferCount: (row.transfer_count as number) || 0,
      lastTriggeredAt: row.last_triggered_at
        ? new Date(row.last_triggered_at as string)
        : undefined,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  private mapGoalFromDb(row: Record<string, unknown>): SavingsGoal {
    const currentAmount = (row.current_amount as number) || 0;
    const targetAmount = (row.target_amount as number) || 1;
    const progressPercentage = Math.min(
      100,
      (currentAmount / targetAmount) * 100,
    );

    // Calculate if on track
    const targetDate = row.target_date
      ? new Date(row.target_date as string)
      : null;
    const startDate = new Date(row.start_date as string);
    const now = new Date();

    let onTrack = true;
    let projectedCompletionDate: Date | undefined;

    if (targetDate && currentAmount < targetAmount) {
      const totalDays =
        (targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      const elapsedDays =
        (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      const expectedProgress = (elapsedDays / totalDays) * 100;
      onTrack = progressPercentage >= expectedProgress * 0.9; // 10% buffer

      // Project completion date based on current rate
      if (currentAmount > 0 && elapsedDays > 0) {
        const dailyRate = currentAmount / elapsedDays;
        const remainingAmount = targetAmount - currentAmount;
        const daysToComplete = remainingAmount / dailyRate;
        projectedCompletionDate = new Date(
          now.getTime() + daysToComplete * 24 * 60 * 60 * 1000,
        );
      }
    }

    return {
      id: row.id as string,
      userId: row.user_id as string,
      name: row.name as string,
      category: row.category as SavingsGoal["category"],
      status: row.status as SavingsGoalStatus,
      targetAmount,
      currentAmount,
      targetDate: targetDate || undefined,
      startDate,
      completedAt: row.completed_at
        ? new Date(row.completed_at as string)
        : undefined,
      autoSaveEnabled: (row.auto_save_enabled as boolean) || false,
      linkedRuleIds: (row.linked_rule_ids as string[]) || [],
      priority: (row.priority as number) || 1,
      progressPercentage: Math.round(progressPercentage * 10) / 10,
      projectedCompletionDate,
      onTrack,
      contributions: [],
      icon: row.icon as string | undefined,
      color: row.color as string | undefined,
      notes: row.notes as string | undefined,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  private mapContributionFromDb(
    row: Record<string, unknown>,
  ): SavingsContribution {
    return {
      id: row.id as string,
      goalId: row.goal_id as string,
      amount: row.amount as number,
      source: row.source as SavingsContribution["source"],
      ruleId: row.rule_id as string | undefined,
      transactionId: row.transaction_id as string | undefined,
      note: row.note as string | undefined,
      createdAt: new Date(row.created_at as string),
    };
  }

  private mapTransferFromDb(row: Record<string, unknown>): SavingsTransfer {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      ruleId: row.rule_id as string,
      goalId: row.goal_id as string | undefined,
      amount: row.amount as number,
      status: row.status as SavingsTransfer["status"],
      sourceAccountId: row.source_account_id as string,
      destinationAccountId: row.destination_account_id as string,
      triggerType: row.trigger_type as SavingsTransfer["triggerType"],
      triggerTransactionId: row.trigger_transaction_id as string | undefined,
      errorMessage: row.error_message as string | undefined,
      executedAt: row.executed_at
        ? new Date(row.executed_at as string)
        : undefined,
      createdAt: new Date(row.created_at as string),
    };
  }
}

// Export singleton instance
export const savingsAutomationService = new SavingsAutomationService();
