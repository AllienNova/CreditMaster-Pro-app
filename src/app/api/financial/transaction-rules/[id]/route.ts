/**
 * PATCH  /api/financial/transaction-rules/{id} — update one
 * DELETE /api/financial/transaction-rules/{id} — remove one
 *
 * Companion to the collection route. Without these, the mobile screen's
 * toggle and delete were local-only: flipping a rule off looked like it
 * worked and the rule was still active on the next load.
 *
 * Both service calls take userId as their FIRST argument and scope the query
 * by it, so a caller cannot reach another user's rule by guessing an id.
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
  secondaryValue: z.union([z.string(), z.number()]).optional(),
});

// Mirrors ActionType (transaction-rules-service.ts:27-35).
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
  value: z.union([z.string(), z.number(), z.boolean()]),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const updateRuleSchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().max(1000).optional(),
    conditions: z.array(conditionSchema).min(1).optional(),
    conditionLogic: z.enum(["AND", "OR"]).optional(),
    actions: z.array(actionSchema).min(1).optional(),
    isActive: z.boolean().optional(),
    priority: z.number().int().min(0).optional(),
  })
  // Every field is optional, so an empty object would parse and then write
  // nothing while reporting success.
  .refine((v) => Object.keys(v).length > 0, {
    message: "No fields to update",
  });

/** `/api/financial/transaction-rules/{id}` — the convention used by sibling routes. */
const ruleIdFrom = (request: NextRequest) =>
  request.nextUrl.pathname.split("/").pop() ?? "";

export const PATCH = withAuth(
  async (request: NextRequest, user: AuthedUser) => {
    const id = ruleIdFrom(request);
    if (!id) {
      return NextResponse.json(
        { success: false, error: { message: "Rule id is required" } },
        { status: 400 },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: { message: "Invalid JSON body" } },
        { status: 400 },
      );
    }

    const parsed = updateRuleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Invalid update",
            details: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400 },
      );
    }

    try {
      const rule = await transactionRulesService.updateRule(
        user.id,
        id,
        parsed.data,
      );
      return NextResponse.json({ success: true, data: { rule } });
    } catch (error) {
      console.error("[transaction-rules] failed to update", error);
      return NextResponse.json(
        { success: false, error: { message: "Failed to update rule" } },
        { status: 500 },
      );
    }
  },
);

export const DELETE = withAuth(
  async (request: NextRequest, user: AuthedUser) => {
    const id = ruleIdFrom(request);
    if (!id) {
      return NextResponse.json(
        { success: false, error: { message: "Rule id is required" } },
        { status: 400 },
      );
    }

    try {
      await transactionRulesService.deleteRule(user.id, id);
      return NextResponse.json({ success: true, data: { id } });
    } catch (error) {
      console.error("[transaction-rules] failed to delete", error);
      return NextResponse.json(
        { success: false, error: { message: "Failed to delete rule" } },
        { status: 500 },
      );
    }
  },
);
