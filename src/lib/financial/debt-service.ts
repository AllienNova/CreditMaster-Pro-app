/**
 * Debt Service (MOK-03 / TASK-FIN-5)
 *
 * User-scoped CRUD persistence over the debt_accounts table.
 * EVERY query carries an explicit .eq("user_id", userId) — RLS is
 * defence-in-depth, not a substitute for application-level scoping.
 */

import { z } from "zod";
import { getSupabase } from "@/lib/supabase/client";
import type { Debt } from "@/lib/financial/types/debt-payoff.types";

// ---------------------------------------------------------------------------
// Zod schema for validated debt input
// ---------------------------------------------------------------------------

export const debtInputSchema = z.object({
  name: z.string().min(1),
  type: z.enum([
    "credit_card",
    "student_loan",
    "auto_loan",
    "mortgage",
    "personal_loan",
    "medical",
    "other",
  ]),
  balance: z.number().nonnegative(),
  originalBalance: z.number().nonnegative().optional(),
  interestRate: z.number().nonnegative(),
  minimumPayment: z.number().nonnegative(),
  dueDate: z.string().optional(),
  creditorName: z.string().optional(),
});

export type DebtInput = z.infer<typeof debtInputSchema>;

export const debtPatchSchema = debtInputSchema.partial();
export type DebtPatch = z.infer<typeof debtPatchSchema>;

// ---------------------------------------------------------------------------
// DB row → Debt (camelCase) mapper
// ---------------------------------------------------------------------------

type DebtRow = {
  id: string;
  user_id: string;
  name: string | null;
  type: string | null;
  balance: number | null;
  original_balance: number | null;
  interest_rate: number | null;
  minimum_payment: number | null;
  due_date: string | null;
  creditor_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

function rowToDebt(row: DebtRow): Debt {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name ?? "",
    type: (row.type ?? "other") as Debt["type"],
    balance: row.balance ?? 0,
    originalBalance: row.original_balance ?? 0,
    interestRate: row.interest_rate ?? 0,
    minimumPayment: row.minimum_payment ?? 0,
    dueDate: row.due_date ?? undefined,
    creditorName: row.creditor_name ?? undefined,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Service class
// ---------------------------------------------------------------------------

class DebtService {
  async listDebts(userId: string): Promise<Debt[]> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("debt_accounts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to list debts: ${error.message}`);
    }

    return ((data ?? []) as DebtRow[]).map(rowToDebt);
  }

  async createDebt(userId: string, input: DebtInput): Promise<Debt> {
    const validated = debtInputSchema.parse(input);
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("debt_accounts")
      .insert({
        user_id: userId,
        name: validated.name,
        type: validated.type,
        balance: validated.balance,
        original_balance: validated.originalBalance ?? validated.balance,
        interest_rate: validated.interestRate,
        minimum_payment: validated.minimumPayment,
        due_date: validated.dueDate ?? null,
        creditor_name: validated.creditorName ?? null,
      })
      .select("*");

    if (error) {
      throw new Error(`Failed to create debt: ${error.message}`);
    }

    const rows = (data ?? []) as DebtRow[];
    if (rows.length === 0) {
      throw new Error("Failed to create debt: no row returned");
    }

    return rowToDebt(rows[0]);
  }

  async updateDebt(debtId: string, userId: string, patch: DebtPatch): Promise<Debt> {
    const validated = debtPatchSchema.parse(patch);
    const supabase = getSupabase();

    // Verify ownership before updating.
    const { data: existing, error: fetchError } = await supabase
      .from("debt_accounts")
      .select("*")
      .eq("id", debtId)
      .eq("user_id", userId)
      .single();

    if (fetchError || !existing) {
      throw new Error("Debt not found");
    }

    const updates: Record<string, unknown> = {};
    if (validated.name !== undefined) updates["name"] = validated.name;
    if (validated.type !== undefined) updates["type"] = validated.type;
    if (validated.balance !== undefined) updates["balance"] = validated.balance;
    if (validated.originalBalance !== undefined) updates["original_balance"] = validated.originalBalance;
    if (validated.interestRate !== undefined) updates["interest_rate"] = validated.interestRate;
    if (validated.minimumPayment !== undefined) updates["minimum_payment"] = validated.minimumPayment;
    if (validated.dueDate !== undefined) updates["due_date"] = validated.dueDate;
    if (validated.creditorName !== undefined) updates["creditor_name"] = validated.creditorName;
    updates["updated_at"] = new Date().toISOString();

    const { data, error } = await supabase
      .from("debt_accounts")
      .update(updates)
      .eq("id", debtId)
      .eq("user_id", userId)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error("Debt not found");
    }

    return rowToDebt(data as DebtRow);
  }

  async deleteDebt(debtId: string, userId: string): Promise<void> {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("debt_accounts")
      .delete()
      .eq("id", debtId)
      .eq("user_id", userId);

    if (error) {
      throw new Error(`Failed to delete debt: ${error.message}`);
    }
  }
}

export const debtService = new DebtService();
export default debtService;
