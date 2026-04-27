import { supabaseAdmin } from "@/lib/supabase/server";
import type { CreditAction, CreditBalance, CreditTransaction } from "./types";
import { CREDIT_COSTS } from "./credit-costs";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;
const userCredits = () => db.from("user_credits");
const creditTransactions = () => db.from("credit_transactions");

const DEFAULT_FREE_ALLOWANCE = 500;

export class CreditService {
  async getBalance(userId: string): Promise<CreditBalance> {
    const { data, error } = await userCredits()
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error && error.code === "PGRST116") {
      // Row not found — auto-create with free tier defaults
      const now = new Date();
      const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      await userCredits().insert({
        user_id: userId,
        credit_balance: DEFAULT_FREE_ALLOWANCE,
        subscription_allowance: DEFAULT_FREE_ALLOWANCE,
        purchased_credits: 0,
        period_start: now.toISOString(),
        period_end: periodEnd.toISOString(),
      });

      const usedThisPeriod = await this.getUsageThisPeriod(userId);

      return {
        userId,
        creditBalance: DEFAULT_FREE_ALLOWANCE,
        subscriptionAllowance: DEFAULT_FREE_ALLOWANCE,
        purchasedCredits: 0,
        periodStart: now,
        periodEnd,
        usedThisPeriod,
      };
    }

    if (error) {
      throw new Error(`Failed to fetch credit balance: ${error.message}`);
    }

    const usedThisPeriod = await this.getUsageThisPeriod(userId);

    return {
      userId: data.user_id,
      creditBalance: data.credit_balance,
      subscriptionAllowance: data.subscription_allowance,
      purchasedCredits: data.purchased_credits,
      periodStart: new Date(data.period_start),
      periodEnd: new Date(data.period_end),
      usedThisPeriod,
    };
  }

  async deductCredits(
    userId: string,
    action: CreditAction,
    metadata: Record<string, unknown> = {},
  ): Promise<{ success: boolean; remaining: number }> {
    const cost = CREDIT_COSTS[action];
    if (cost === 0) {
      const balance = await this.getBalance(userId);
      return { success: true, remaining: balance.creditBalance };
    }

    const { data, error } = await db.rpc("deduct_credits", {
      p_user_id: userId,
      p_amount: cost,
      p_action: action,
      p_metadata: metadata,
    });

    if (error) {
      throw new Error(`Failed to deduct credits: ${error.message}`);
    }

    const row = Array.isArray(data) ? data[0] : data;
    return {
      success: row.success,
      remaining: row.remaining,
    };
  }

  async addCredits(
    userId: string,
    amount: number,
    source: CreditAction,
    metadata: Record<string, unknown> = {},
  ): Promise<number> {
    // Ensure user row exists
    await this.getBalance(userId);

    const { data: current, error: readErr } = await userCredits()
      .select("credit_balance, purchased_credits")
      .eq("user_id", userId)
      .single();

    if (readErr) {
      throw new Error(`Failed to read credit balance: ${readErr.message}`);
    }

    const newBalance = (current.credit_balance as number) + amount;
    const updateFields: Record<string, unknown> = {
      credit_balance: newBalance,
      updated_at: new Date().toISOString(),
    };

    if (source === "credit_purchase") {
      updateFields.purchased_credits =
        (current.purchased_credits as number) + amount;
    }

    const { error: setErr } = await userCredits()
      .update(updateFields)
      .eq("user_id", userId);

    if (setErr) {
      throw new Error(`Failed to add credits: ${setErr.message}`);
    }

    await creditTransactions().insert({
      user_id: userId,
      action_type: source,
      credits_added: amount,
      credits_consumed: 0,
      balance_after: newBalance,
      metadata,
    });

    return newBalance;
  }

  async resetMonthlyAllowance(
    userId: string,
    tierCredits: number,
  ): Promise<void> {
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const { data: current } = await userCredits()
      .select("purchased_credits")
      .eq("user_id", userId)
      .single();

    const purchasedCredits = current?.purchased_credits ?? 0;
    const newBalance = tierCredits + purchasedCredits;

    const { error } = await userCredits()
      .update({
        credit_balance: newBalance,
        subscription_allowance: tierCredits,
        period_start: now.toISOString(),
        period_end: periodEnd.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq("user_id", userId);

    if (error) {
      throw new Error(`Failed to reset monthly allowance: ${error.message}`);
    }

    await creditTransactions().insert({
      user_id: userId,
      action_type: "monthly_reset",
      credits_added: tierCredits,
      credits_consumed: 0,
      balance_after: newBalance,
      metadata: { tier_credits: tierCredits, purchased_carried: purchasedCredits },
    });
  }

  async checkSufficientCredits(
    userId: string,
    requiredCredits: number,
  ): Promise<boolean> {
    const balance = await this.getBalance(userId);
    return balance.creditBalance >= requiredCredits;
  }

  async getUsageThisPeriod(userId: string): Promise<number> {
    const { data: userRow } = await userCredits()
      .select("period_start")
      .eq("user_id", userId)
      .single();

    if (!userRow) return 0;

    const { data, error } = await creditTransactions()
      .select("credits_consumed")
      .eq("user_id", userId)
      .gte("created_at", userRow.period_start)
      .gt("credits_consumed", 0);

    if (error) {
      throw new Error(`Failed to fetch usage: ${error.message}`);
    }

    return (data ?? []).reduce(
      (sum: number, row: { credits_consumed: number }) =>
        sum + row.credits_consumed,
      0,
    );
  }

  async getTransactionHistory(
    userId: string,
    limit = 50,
    offset = 0,
  ): Promise<CreditTransaction[]> {
    const { data, error } = await creditTransactions()
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to fetch transaction history: ${error.message}`);
    }

    return (data ?? []).map(
      (row: Record<string, unknown>): CreditTransaction => ({
        id: row.id as string,
        userId: row.user_id as string,
        actionType: row.action_type as CreditAction,
        creditsConsumed: row.credits_consumed as number,
        creditsAdded: row.credits_added as number,
        balanceAfter: row.balance_after as number,
        aiModel: row.ai_model as string | undefined,
        tokensInput: row.tokens_input as number | undefined,
        tokensOutput: row.tokens_output as number | undefined,
        rawCostUsd: row.raw_cost_usd as number | undefined,
        metadata: (row.metadata as Record<string, unknown>) ?? {},
        createdAt: new Date(row.created_at as string),
      }),
    );
  }
}

export const creditService = new CreditService();
