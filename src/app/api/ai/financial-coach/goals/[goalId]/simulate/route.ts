/**
 * AI Financial Coach - Goal Simulation API
 *
 * POST /api/ai/financial-coach/goals/[goalId]/simulate - Simulate goal scenarios
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { goalPlanner } from "@/lib/financial/goal-planner";

export const POST = withAuth(
  async (request: NextRequest, _user: AuthedUser) => {
    try {
      // The guard does not forward Next's route `params`; the path ends in
      // /goals/[goalId]/simulate, so goalId is the second-to-last segment.
      const segments = request.nextUrl.pathname.split("/");
      const goalId = segments[segments.length - 2];

      const body = await request.json();
      const { scenarios } = body;

      if (!scenarios || !Array.isArray(scenarios)) {
        return NextResponse.json(
          { error: "Missing required field: scenarios (array)" },
          { status: 400 },
        );
      }

      const simulation = await goalPlanner.simulateGoal({
        goalId,
        scenarios: scenarios.map(
          (s: { monthlyContribution: number; targetDate?: string }) => ({
            monthlyContribution: parseFloat(String(s.monthlyContribution)),
            targetDate: s.targetDate ? new Date(s.targetDate) : undefined,
          }),
        ),
      });

      return NextResponse.json(simulation);
    } catch (error) {
      console.error("Error simulating goal:", error);
      return NextResponse.json(
        { error: "Failed to simulate goal" },
        { status: 500 },
      );
    }
  },
);
