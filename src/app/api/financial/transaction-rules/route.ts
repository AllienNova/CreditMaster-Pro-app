/**
 * Transaction Rules API
 *
 * GET  /api/financial/transaction-rules  — the caller's rules
 * POST /api/financial/transaction-rules  — create one
 *
 * WHY THIS EXISTS. Everything behind it was already built and nothing could
 * reach it. `transaction_rules` is a real table with RLS
 * (supabase/migrations/20260110000003_transaction_rules.sql), and
 * transactionRulesService has full user-scoped CRUD — getRules, createRule,
 * updateRule, deleteRule, applyRules, testRule, reorderRules. There was no
 * HTTP route, so the mobile screen shipped INITIAL_RULES instead: a "Coffee
 * Shops" rule the user never wrote, carrying matchCount 47 — a count of
 * matches that never happened, presented as evidence the rule was working.
 *
 * The table even has the `match_count` column that number was imitating.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";
import { transactionRulesService } from "@/lib/financial/transaction-rules-service";

const conditionSchema = z.object({
  type: z.enum([
    "merchant_contains",
    "merchant_equals",
    "merchant_starts_with",
    "amount_equals",
    "amount_greater_than",
    "amount_less_than",
    "amount_between",
    "category_equals",
    "date_range",
    "account_equals",
    "description_contains",
  ]),
  value: z.union([z.string(), z.number()]),
  // `secondaryValue`, matching RuleCondition — not `secondValue`. The two
  // that use it are amount_between and date_range.
  secondaryValue: z.union([z.string(), z.number()]).optional(),
});

// Mirrors ActionType exactly (transaction-rules-service.ts:27-35). An earlier
// draft of this file invented `mark_reviewed`, `exclude_from_budget` and
// `split_transaction`, none of which the engine can execute — the rule would
// have saved and then matched nothing.
const actionSchema = z.object({
  type: z.enum([
    "set_category",
    "add_tag",
    "remove_tag",
    "mark_tax_deductible",
    "split",
    "ignore",
    "rename_merchant",
    "set_note",
  ]),
  // Required on RuleAction, and boolean is a legitimate value (ignore,
  // mark_tax_deductible).
  value: z.union([z.string(), z.number(), z.boolean()]),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const createRuleSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name too long"),
  description: z.string().max(1000).optional(),
  conditions: z.array(conditionSchema).min(1, "At least one condition"),
  conditionLogic: z.enum(["AND", "OR"]).default("AND"),
  actions: z.array(actionSchema).min(1, "At least one action"),
  isActive: z.boolean().default(true),
  priority: z.number().int().min(0).default(0),
});

export const GET = withAuth(async (_request: NextRequest, user: AuthedUser) => {
  try {
    const rules = await transactionRulesService.getRules(user.id);
    return NextResponse.json({ success: true, data: { rules } });
  } catch (error) {
    // No fabricated fallback. Failing to read someone's rules is not the same
    // as their having none — and the screen this serves used to make exactly
    // that substitution.
    console.error("[transaction-rules] failed to list", error);
    return NextResponse.json(
      { success: false, error: { message: "Failed to load rules" } },
      { status: 500 },
    );
  }
});

export const POST = withAuth(async (request: NextRequest, user: AuthedUser) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { message: "Invalid JSON body" } },
      { status: 400 },
    );
  }

  const parsed = createRuleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: "Invalid rule",
          details: parsed.error.flatten().fieldErrors,
        },
      },
      { status: 400 },
    );
  }

  try {
    // user.id comes from the guard, never from the body: a rule is created
    // for the caller and no one else.
    const rule = await transactionRulesService.createRule(user.id, parsed.data);
    return NextResponse.json({ success: true, data: { rule } }, { status: 201 });
  } catch (error) {
    console.error("[transaction-rules] failed to create", error);
    return NextResponse.json(
      { success: false, error: { message: "Failed to create rule" } },
      { status: 500 },
    );
  }
});
