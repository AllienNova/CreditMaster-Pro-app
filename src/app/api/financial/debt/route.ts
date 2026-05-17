/**
 * Debt Payoff API Route
 * GET /api/financial/debt - Get debt overview and payoff plans
 * POST /api/financial/debt - Add new debt
 *
 * Note: PATCH/DELETE /api/financial/debt/[id] routes are intentionally absent.
 * The only consumer of this endpoint is DebtPayoffPlanner.tsx (GET only);
 * DebtManagement.tsx does not call this endpoint at all. Adding PATCH/DELETE
 * routes would be unused surface (YAGNI).
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";
import { debtPayoffService } from "@/lib/financial/debt-payoff-service";
import { debtService, debtInputSchema } from "@/lib/financial/debt-service";
import type { PayoffStrategy } from "@/lib/financial/types/debt-payoff.types";
import { ZodError } from "zod";

export const GET = withAuth(
  async (request: NextRequest, user: AuthedUser) => {
    try {
      const { searchParams } = new URL(request.url);
      const strategy =
        (searchParams.get("strategy") as PayoffStrategy) || "avalanche";
      const extraPayment = parseFloat(searchParams.get("extraPayment") || "0");
      const compare = searchParams.get("compare") === "true";

      const debts = await debtService.listDebts(user.id);
      const overview = debtPayoffService.calculateOverview(debts, 5000);

      const currentPlan = debtPayoffService.calculatePayoffPlan(
        debts,
        strategy,
        extraPayment,
      );
      const comparison = compare
        ? debtPayoffService.compareStrategies(debts, extraPayment)
        : undefined;

      const milestones = debtPayoffService.generateMilestones(currentPlan, debts);
      const insights = debtPayoffService.generateInsights(overview, currentPlan);

      return NextResponse.json({
        success: true,
        data: {
          overview,
          debts,
          currentPlan,
          comparison,
          milestones,
          insights,
        },
      });
    } catch (_error) {
      void _error;
      return NextResponse.json(
        { error: "Failed to fetch debt data" },
        { status: 500 },
      );
    }
  },
);

export const POST = withAuth(
  async (request: NextRequest, user: AuthedUser) => {
    try {
      const body = await request.json();

      let validatedInput;
      try {
        validatedInput = debtInputSchema.parse(body);
      } catch (err) {
        if (err instanceof ZodError) {
          return NextResponse.json(
            { error: "Missing required fields", details: err.issues },
            { status: 400 },
          );
        }
        throw err;
      }

      const newDebt = await debtService.createDebt(user.id, validatedInput);

      return NextResponse.json({
        success: true,
        data: newDebt,
      });
    } catch (_error) {
      void _error;
      return NextResponse.json(
        { error: "Failed to create debt" },
        { status: 500 },
      );
    }
  },
);
