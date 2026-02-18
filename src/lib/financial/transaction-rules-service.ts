/**
 * Fynvita Transaction Rules Engine
 *
 * Allows users to create rules for automatic transaction categorization,
 * tagging, splitting, and other operations.
 */

import { supabaseAdmin } from "@/lib/supabase/server";

// ============================================================================
// Types
// ============================================================================

export type ConditionType =
  | "merchant_contains"
  | "merchant_equals"
  | "merchant_starts_with"
  | "amount_equals"
  | "amount_greater_than"
  | "amount_less_than"
  | "amount_between"
  | "category_equals"
  | "date_range"
  | "account_equals"
  | "description_contains";

export type ActionType =
  | "set_category"
  | "add_tag"
  | "remove_tag"
  | "mark_tax_deductible"
  | "split"
  | "ignore"
  | "rename_merchant"
  | "set_note";

export interface RuleCondition {
  type: ConditionType;
  value: string | number;
  secondaryValue?: string | number; // For 'between' conditions
}

export interface RuleAction {
  type: ActionType;
  value: string | number | boolean;
  metadata?: Record<string, unknown>;
}

export interface SplitConfig {
  category: string;
  percentage: number;
  amount?: number;
}

export interface TransactionRule {
  id: string;
  userId: string;
  name: string;
  description?: string;
  conditions: RuleCondition[];
  conditionLogic: "AND" | "OR";
  actions: RuleAction[];
  isActive: boolean;
  priority: number;
  matchCount: number;
  lastMatchedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRuleInput {
  name: string;
  description?: string;
  conditions: RuleCondition[];
  conditionLogic: "AND" | "OR";
  actions: RuleAction[];
  isActive?: boolean;
  priority?: number;
}

export interface UpdateRuleInput {
  name?: string;
  description?: string;
  conditions?: RuleCondition[];
  conditionLogic?: "AND" | "OR";
  actions?: RuleAction[];
  isActive?: boolean;
  priority?: number;
}

export interface Transaction {
  id: string;
  date: Date;
  amount: number;
  merchantName: string;
  description?: string;
  category?: string;
  accountId?: string;
  tags?: string[];
  isTaxDeductible?: boolean;
  note?: string;
}

export interface RuleMatchResult {
  ruleId: string;
  ruleName: string;
  matched: boolean;
  appliedActions: RuleAction[];
  modifiedTransaction: Transaction;
}

export interface SuggestedRule {
  name: string;
  description: string;
  conditions: RuleCondition[];
  conditionLogic: "AND" | "OR";
  actions: RuleAction[];
  confidence: number;
  matchingTransactions: number;
  estimatedAffected: number;
}

// ============================================================================
// Transaction Rules Service
// ============================================================================

class TransactionRulesService {
  /**
   * Get all rules for a user
   */
  async getRules(userId: string): Promise<TransactionRule[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = supabaseAdmin as any;

    const { data, error } = await supabase
      .from("transaction_rules")
      .select("*")
      .eq("user_id", userId)
      .order("priority", { ascending: true });

    if (error) {
      // TransactionRulesService error: Error fetching rules
      throw new Error("Failed to fetch transaction rules");
    }

    return (data || []).map(this.mapDbToRule);
  }

  /**
   * Get a single rule
   */
  async getRule(
    userId: string,
    ruleId: string,
  ): Promise<TransactionRule | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = supabaseAdmin as any;

    const { data, error } = await supabase
      .from("transaction_rules")
      .select("*")
      .eq("id", ruleId)
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error("Failed to fetch rule");
    }

    return this.mapDbToRule(data);
  }

  /**
   * Create a new rule
   */
  async createRule(
    userId: string,
    input: CreateRuleInput,
  ): Promise<TransactionRule> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = supabaseAdmin as any;

    // Validate conditions and actions
    this.validateConditions(input.conditions);
    this.validateActions(input.actions);

    // Get next priority if not specified
    let priority = input.priority;
    if (priority === undefined) {
      const { data: maxPriority } = await supabase
        .from("transaction_rules")
        .select("priority")
        .eq("user_id", userId)
        .order("priority", { ascending: false })
        .limit(1)
        .single();

      priority = (maxPriority?.priority || 0) + 1;
    }

    const { data, error } = await supabase
      .from("transaction_rules")
      .insert({
        user_id: userId,
        name: input.name,
        description: input.description,
        conditions: input.conditions,
        condition_logic: input.conditionLogic,
        actions: input.actions,
        is_active: input.isActive ?? true,
        priority,
        match_count: 0,
      })
      .select()
      .single();

    if (error) {
      // TransactionRulesService error: Error creating rule
      throw new Error("Failed to create rule");
    }

    return this.mapDbToRule(data);
  }

  /**
   * Update a rule
   */
  async updateRule(
    userId: string,
    ruleId: string,
    input: UpdateRuleInput,
  ): Promise<TransactionRule> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = supabaseAdmin as any;

    if (input.conditions) {
      this.validateConditions(input.conditions);
    }
    if (input.actions) {
      this.validateActions(input.actions);
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined)
      updateData.description = input.description;
    if (input.conditions !== undefined)
      updateData.conditions = input.conditions;
    if (input.conditionLogic !== undefined)
      updateData.condition_logic = input.conditionLogic;
    if (input.actions !== undefined) updateData.actions = input.actions;
    if (input.isActive !== undefined) updateData.is_active = input.isActive;
    if (input.priority !== undefined) updateData.priority = input.priority;

    const { data, error } = await supabase
      .from("transaction_rules")
      .update(updateData)
      .eq("id", ruleId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      // TransactionRulesService error: Error updating rule
      throw new Error("Failed to update rule");
    }

    return this.mapDbToRule(data);
  }

  /**
   * Delete a rule
   */
  async deleteRule(userId: string, ruleId: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = supabaseAdmin as any;

    const { error } = await supabase
      .from("transaction_rules")
      .delete()
      .eq("id", ruleId)
      .eq("user_id", userId);

    if (error) {
      // TransactionRulesService error: Error deleting rule
      throw new Error("Failed to delete rule");
    }
  }

  /**
   * Apply all rules to a transaction
   */
  async applyRules(
    userId: string,
    transaction: Transaction,
  ): Promise<{ transaction: Transaction; appliedRules: string[] }> {
    const rules = await this.getRules(userId);
    const activeRules = rules.filter((r) => r.isActive);

    let modifiedTransaction = { ...transaction };
    const appliedRules: string[] = [];

    for (const rule of activeRules) {
      if (
        this.matchesConditions(
          modifiedTransaction,
          rule.conditions,
          rule.conditionLogic,
        )
      ) {
        modifiedTransaction = this.applyActions(
          modifiedTransaction,
          rule.actions,
        );
        appliedRules.push(rule.id);

        // Update match count
        await this.incrementMatchCount(userId, rule.id);
      }
    }

    return { transaction: modifiedTransaction, appliedRules };
  }

  /**
   * Test a rule against transactions without applying
   */
  async testRule(
    rule: CreateRuleInput,
    transactions: Transaction[],
  ): Promise<{ matches: Transaction[]; matchCount: number }> {
    const matches = transactions.filter((txn) =>
      this.matchesConditions(txn, rule.conditions, rule.conditionLogic),
    );

    return {
      matches,
      matchCount: matches.length,
    };
  }

  /**
   * Suggest rules based on transaction patterns
   */
  async suggestRules(transactions: Transaction[]): Promise<SuggestedRule[]> {
    const suggestions: SuggestedRule[] = [];

    // Group transactions by merchant
    const merchantGroups = new Map<string, Transaction[]>();
    for (const txn of transactions) {
      const key = txn.merchantName.toLowerCase().trim();
      const existing = merchantGroups.get(key) || [];
      existing.push(txn);
      merchantGroups.set(key, existing);
    }

    // Find merchants with multiple transactions but inconsistent categories
    for (const [merchant, txns] of merchantGroups) {
      if (txns.length < 3) continue;

      const categories = new Set(txns.map((t) => t.category).filter(Boolean));

      // If same merchant has multiple categories, suggest a rule
      if (categories.size > 1) {
        // Find most common category
        const categoryCounts = new Map<string, number>();
        for (const txn of txns) {
          if (txn.category) {
            categoryCounts.set(
              txn.category,
              (categoryCounts.get(txn.category) || 0) + 1,
            );
          }
        }

        const [mostCommonCategory, count] = [...categoryCounts.entries()].sort(
          ([, a], [, b]) => b - a,
        )[0] || ["Uncategorized", 0];

        const confidence = count / txns.length;

        if (confidence >= 0.5) {
          suggestions.push({
            name: `Auto-categorize ${txns[0].merchantName}`,
            description: `Always categorize transactions from ${txns[0].merchantName} as ${mostCommonCategory}`,
            conditions: [
              {
                type: "merchant_contains",
                value: merchant,
              },
            ],
            conditionLogic: "AND",
            actions: [
              {
                type: "set_category",
                value: mostCommonCategory,
              },
            ],
            confidence,
            matchingTransactions: txns.length,
            estimatedAffected: txns.filter(
              (t) => t.category !== mostCommonCategory,
            ).length,
          });
        }
      }
    }

    // Find amount patterns for recurring payments
    const amountGroups = new Map<number, Transaction[]>();
    for (const txn of transactions) {
      if (txn.amount <= 0) continue;
      const roundedAmount = Math.round(txn.amount * 100) / 100;
      const existing = amountGroups.get(roundedAmount) || [];
      existing.push(txn);
      amountGroups.set(roundedAmount, existing);
    }

    for (const [amount, txns] of amountGroups) {
      if (txns.length < 2) continue;

      // Check if same merchant
      const merchants = new Set(txns.map((t) => t.merchantName.toLowerCase()));
      if (merchants.size === 1) {
        const merchant = txns[0].merchantName;

        // Check if uncategorized
        const uncategorized = txns.filter(
          (t) => !t.category || t.category === "Uncategorized",
        );
        if (uncategorized.length > 0) {
          suggestions.push({
            name: `Recurring ${merchant} payment`,
            description: `Tag $${amount} payments from ${merchant} as recurring`,
            conditions: [
              { type: "merchant_contains", value: merchant.toLowerCase() },
              { type: "amount_equals", value: amount },
            ],
            conditionLogic: "AND",
            actions: [{ type: "add_tag", value: "recurring" }],
            confidence: 0.9,
            matchingTransactions: txns.length,
            estimatedAffected: uncategorized.length,
          });
        }
      }
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Reorder rule priorities
   */
  async reorderRules(userId: string, ruleIds: string[]): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = supabaseAdmin as any;

    // Update priorities in order
    for (let i = 0; i < ruleIds.length; i++) {
      await supabase
        .from("transaction_rules")
        .update({ priority: i, updated_at: new Date().toISOString() })
        .eq("id", ruleIds[i])
        .eq("user_id", userId);
    }
  }

  /**
   * Check if transaction matches conditions
   */
  private matchesConditions(
    transaction: Transaction,
    conditions: RuleCondition[],
    logic: "AND" | "OR",
  ): boolean {
    if (conditions.length === 0) return false;

    const results = conditions.map((condition) =>
      this.matchesCondition(transaction, condition),
    );

    return logic === "AND" ? results.every((r) => r) : results.some((r) => r);
  }

  /**
   * Check if transaction matches a single condition
   */
  private matchesCondition(
    transaction: Transaction,
    condition: RuleCondition,
  ): boolean {
    const merchantLower = transaction.merchantName.toLowerCase();
    const value =
      typeof condition.value === "string"
        ? condition.value.toLowerCase()
        : condition.value;

    switch (condition.type) {
      case "merchant_contains":
        return merchantLower.includes(value as string);

      case "merchant_equals":
        return merchantLower === value;

      case "merchant_starts_with":
        return merchantLower.startsWith(value as string);

      case "amount_equals":
        return Math.abs(transaction.amount - (value as number)) < 0.01;

      case "amount_greater_than":
        return transaction.amount > (value as number);

      case "amount_less_than":
        return transaction.amount < (value as number);

      case "amount_between":
        return (
          transaction.amount >= (value as number) &&
          transaction.amount <= (condition.secondaryValue as number)
        );

      case "category_equals":
        return transaction.category?.toLowerCase() === value;

      case "account_equals":
        return transaction.accountId === value;

      case "description_contains":
        return (
          transaction.description?.toLowerCase().includes(value as string) ??
          false
        );

      case "date_range":
        // Implement date range logic if needed
        return true;

      default:
        return false;
    }
  }

  /**
   * Apply actions to a transaction
   */
  private applyActions(
    transaction: Transaction,
    actions: RuleAction[],
  ): Transaction {
    const modified = { ...transaction };

    for (const action of actions) {
      switch (action.type) {
        case "set_category":
          modified.category = action.value as string;
          break;

        case "add_tag":
          modified.tags = [...(modified.tags || []), action.value as string];
          break;

        case "remove_tag":
          modified.tags = (modified.tags || []).filter(
            (t) => t !== action.value,
          );
          break;

        case "mark_tax_deductible":
          modified.isTaxDeductible = action.value as boolean;
          break;

        case "rename_merchant":
          modified.merchantName = action.value as string;
          break;

        case "set_note":
          modified.note = action.value as string;
          break;

        case "ignore":
          // Transaction would be flagged to be ignored
          break;

        case "split":
          // Split logic would be handled separately
          break;
      }
    }

    return modified;
  }

  /**
   * Increment match count for a rule
   */
  private async incrementMatchCount(
    userId: string,
    ruleId: string,
  ): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = supabaseAdmin as any;

    await supabase.rpc("increment_rule_match_count", {
      p_rule_id: ruleId,
      p_user_id: userId,
    });
  }

  /**
   * Validate conditions
   */
  private validateConditions(conditions: RuleCondition[]): void {
    if (!conditions || conditions.length === 0) {
      throw new Error("At least one condition is required");
    }

    for (const condition of conditions) {
      if (!condition.type || condition.value === undefined) {
        throw new Error("Each condition must have a type and value");
      }

      if (
        condition.type === "amount_between" &&
        condition.secondaryValue === undefined
      ) {
        throw new Error("amount_between condition requires secondaryValue");
      }
    }
  }

  /**
   * Validate actions
   */
  private validateActions(actions: RuleAction[]): void {
    if (!actions || actions.length === 0) {
      throw new Error("At least one action is required");
    }

    for (const action of actions) {
      if (!action.type || action.value === undefined) {
        throw new Error("Each action must have a type and value");
      }
    }
  }

  /**
   * Map database row to TransactionRule
   */
  private mapDbToRule(row: Record<string, unknown>): TransactionRule {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      name: row.name as string,
      description: row.description as string | undefined,
      conditions: row.conditions as RuleCondition[],
      conditionLogic: row.condition_logic as "AND" | "OR",
      actions: row.actions as RuleAction[],
      isActive: row.is_active as boolean,
      priority: row.priority as number,
      matchCount: row.match_count as number,
      lastMatchedAt: row.last_matched_at
        ? new Date(row.last_matched_at as string)
        : undefined,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }
}

// Export singleton instance
export const transactionRulesService = new TransactionRulesService();
export default transactionRulesService;
