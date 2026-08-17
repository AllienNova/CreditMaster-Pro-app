/**
 * Add a contribution to a savings goal.
 *
 * mobile-app/src/services/api/financial.ts:1012 has always POSTed { amount }
 * here and no route existed, so "add contribution" did nothing. The goal detail
 * route next door (GET, PATCH, DELETE) exists; only this child was missing.
 *
 * A CONTRIBUTION IS A DELTA. THE SERVICE TAKES AN ABSOLUTE TOTAL. That
 * mismatch is the whole reason this file is more than a passthrough:
 *
 *   goalPlanner.updateGoalProgress(userId, goalId, newAmount)
 *     -> progress = (newAmount / targetAmount) * 100        (goal-planner.ts:192)
 *
 * `newAmount` REPLACES current_amount. Forwarding the client's `amount`
 * straight into it would set a goal with $800 saved to $50 when the user
 * contributed $50 — silently erasing their progress and reporting success. So
 * the current total is read first and the contribution added to it.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withPermission, type AuthedUser } from "@/lib/auth/api-guard";
import { getServiceRoleClient } from "@/lib/supabase/service-role";
import { goalTracker } from "@/lib/financial/goal-tracker";

/** A single contribution nobody would make deliberately; guards a fat finger. */
const MAX_CONTRIBUTION = 10_000_000;

const ContributeSchema = z.object({
  amount: z.number().positive().max(MAX_CONTRIBUTION),
});

export const POST = withPermission(
  "financial:write",
  async (request: NextRequest, user: AuthedUser) => {
    try {
      // The guard does not forward Next's route params; the path ends in
      // /goals/[id]/contribute, so the id is the second-to-last segment.
      const segments = request.nextUrl.pathname.split("/");
      const goalId = segments[segments.length - 2];
      if (!goalId) {
        return NextResponse.json({ error: "Goal id required" }, { status: 400 });
      }

      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json(
          { error: "Body must be valid JSON" },
          { status: 400 },
        );
      }

      const parsed = ContributeSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "amount must be a positive number" },
          { status: 400 },
        );
      }

      // idor-audit: pk-owner-checked — filtered by the caller's own user_id
      // alongside the id, so a guessed goalId cannot be contributed to. The
      // service called below applies the same pair of filters again.
      const { data: goal, error } = await getServiceRoleClient()
        .from("financial_goals")
        .select("current_amount")
        .eq("user_id", user.id)
        .eq("id", goalId)
        .maybeSingle();

      if (error) {
        console.error("Error reading goal before contribution:", error);
        return NextResponse.json(
          { error: "Could not add the contribution" },
          { status: 500 },
        );
      }
      if (!goal) {
        return NextResponse.json({ error: "Goal not found" }, { status: 404 });
      }

      const current = Number((goal as { current_amount: number }).current_amount) || 0;
      const newTotal = current + parsed.data.amount;

      const updated = await goalTracker.updateGoalProgress(
        user.id,
        goalId,
        newTotal,
      );

      if (!updated) {
        return NextResponse.json(
          { error: "Could not add the contribution" },
          { status: 500 },
        );
      }

      // Both figures are returned so the caller can see what the contribution
      // did, rather than having to trust that it was added rather than assigned.
      return NextResponse.json({
        success: true,
        data: updated,
        contribution: { amount: parsed.data.amount, previousAmount: current, newAmount: newTotal },
      });
    } catch (error) {
      console.error("Error adding contribution:", error);
      return NextResponse.json(
        { error: "Failed to add the contribution" },
        { status: 500 },
      );
    }
  },
);
