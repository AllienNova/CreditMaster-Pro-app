/**
 * Credit Score Simulator API Routes
 * GET /api/financial/credit/simulator - Get simulation for current profile (with query params)
 * POST /api/financial/credit/simulator - Run simulation with custom profile and actions
 */

import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";
import {
  creditScoreSimulator,
  type CreditProfile,
  type SimulationAction,
  type CreditMixDetails,
  type StudentLoanDetails,
} from "@/lib/credit/services/CreditScoreSimulator";

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

function isValidScore(score: number): boolean {
  return typeof score === "number" && score >= 300 && score <= 850;
}

function isValidProfile(profile: unknown): profile is CreditProfile {
  if (!profile || typeof profile !== "object") return false;
  const p = profile as Record<string, unknown>;
  return (
    typeof p.currentScore === "number" &&
    typeof p.totalCreditLimit === "number" &&
    typeof p.totalBalance === "number" &&
    typeof p.numberOfAccounts === "number" &&
    typeof p.oldestAccountAgeMonths === "number" &&
    typeof p.averageAccountAgeMonths === "number" &&
    typeof p.hardInquiriesLast12Months === "number" &&
    typeof p.latePaymentsLast24Months === "number" &&
    typeof p.collectionsCount === "number" &&
    typeof p.bankruptcyOnRecord === "boolean" &&
    typeof p.utilizationPercentage === "number"
  );
}

function isValidAction(action: unknown): action is SimulationAction {
  if (!action || typeof action !== "object") return false;
  const a = action as Record<string, unknown>;
  const validTypes = [
    "pay_down_debt",
    "pay_off_card",
    "open_new_card",
    "close_account",
    "hard_inquiry",
    "become_authorized_user",
    "remove_late_payment",
    "pay_collection",
    "wait_months",
    "increase_credit_limit",
  ];
  return typeof a.type === "string" && validTypes.includes(a.type);
}

// ============================================================================
// GET - Simulate with query parameters
// ============================================================================

/**
 * GET /api/financial/credit/simulator?type=optimal_path&targetScore=750
 * GET /api/financial/credit/simulator?type=secured_card_recommendations
 * GET /api/financial/credit/simulator?type=credit_mix
 *
 * Returns simulation results based on stored profile data (mocked for now)
 */
export const GET = withPermission(
  "credit:read",
  async (request: NextRequest, _user: AuthedUser) => {
  try {


    const { searchParams } = request.nextUrl;
    const simulationType = searchParams.get("type") || "optimal_path";
    const targetScoreParam = searchParams.get("targetScore");

    // Use a representative default profile (in production, load from DB)
    const defaultProfile: CreditProfile = {
      currentScore: 680,
      totalCreditLimit: 15000,
      totalBalance: 5000,
      numberOfAccounts: 4,
      oldestAccountAgeMonths: 60,
      averageAccountAgeMonths: 36,
      hardInquiriesLast12Months: 1,
      latePaymentsLast24Months: 0,
      collectionsCount: 0,
      bankruptcyOnRecord: false,
      utilizationPercentage: 33,
    };

    switch (simulationType) {
      case "optimal_path": {
        const targetScore = targetScoreParam
          ? parseInt(targetScoreParam, 10)
          : 750;

        if (!isValidScore(targetScore)) {
          return NextResponse.json(
            { error: "Target score must be between 300 and 850" },
            { status: 400 },
          );
        }

        const result = creditScoreSimulator.getOptimalPath(
          defaultProfile,
          targetScore,
        );

        return NextResponse.json({
          success: true,
          data: result,
          _meta: {
            simulationType,
            targetScore,
            generatedAt: new Date().toISOString(),
          },
        });
      }

      case "secured_card_recommendations": {
        const recommendations =
          creditScoreSimulator.getSecuredCardRecommendations(defaultProfile);

        return NextResponse.json({
          success: true,
          data: { recommendations },
          _meta: {
            simulationType,
            generatedAt: new Date().toISOString(),
          },
        });
      }

      case "credit_mix": {
        const mixProfile: CreditProfile & CreditMixDetails = {
          ...defaultProfile,
          accountTypes: {
            revolving: 2,
            installment: 1,
            mortgage: 0,
          },
        };

        const analysis = creditScoreSimulator.analyzeCreditMix(mixProfile);

        return NextResponse.json({
          success: true,
          data: { analysis },
          _meta: {
            simulationType,
            generatedAt: new Date().toISOString(),
          },
        });
      }

      default:
        return NextResponse.json(
          {
            error: "Invalid simulation type",
            validTypes: [
              "optimal_path",
              "secured_card_recommendations",
              "credit_mix",
            ],
          },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("Error in credit simulator GET:", error);
    return NextResponse.json(
      {
        error: "Failed to run simulation",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
},
);

// ============================================================================
// POST - Run custom simulation
// ============================================================================

/**
 * POST /api/financial/credit/simulator
 *
 * Body:
 * {
 *   "profile": { ...CreditProfile },
 *   "simulationType": "actions" | "pay_off_card" | "new_card" | "scenarios" | "student_loan",
 *   "actions": [...SimulationAction[]] (for "actions" type),
 *   "cardBalance": number (for "pay_off_card"),
 *   "cardLimit": number (for "pay_off_card"),
 *   "newCardLimit": number (for "new_card"),
 *   "scenarios": [{ name, actions }] (for "scenarios"),
 *   "loans": [...StudentLoanDetails[]] (for "student_loan"),
 *   "income": number (for "student_loan")
 * }
 */
export const POST = withPermission(
  "credit:read",
  async (request: NextRequest, _user: AuthedUser) => {
  try {


    const body = await request.json();
    const { profile, simulationType = "actions" } = body as {
      profile: unknown;
      simulationType?: string;
    };

    // Validate profile is present and valid
    if (!isValidProfile(profile)) {
      return NextResponse.json(
        {
          error: "Invalid or missing credit profile",
          required: [
            "currentScore",
            "totalCreditLimit",
            "totalBalance",
            "numberOfAccounts",
            "oldestAccountAgeMonths",
            "averageAccountAgeMonths",
            "hardInquiriesLast12Months",
            "latePaymentsLast24Months",
            "collectionsCount",
            "bankruptcyOnRecord",
            "utilizationPercentage",
          ],
        },
        { status: 400 },
      );
    }

    if (!isValidScore(profile.currentScore)) {
      return NextResponse.json(
        { error: "Current score must be between 300 and 850" },
        { status: 400 },
      );
    }

    switch (simulationType) {
      case "actions": {
        const { actions } = body as { actions: unknown[] };
        if (!actions || !Array.isArray(actions) || actions.length === 0) {
          return NextResponse.json(
            { error: "Actions array is required and must not be empty" },
            { status: 400 },
          );
        }

        for (const action of actions) {
          if (!isValidAction(action)) {
            return NextResponse.json(
              { error: "Invalid action in actions array" },
              { status: 400 },
            );
          }
        }

        const result = creditScoreSimulator.simulateActions(
          profile,
          actions as SimulationAction[],
        );

        return NextResponse.json({
          success: true,
          data: result,
          _meta: { simulationType, generatedAt: new Date().toISOString() },
        });
      }

      case "pay_off_card": {
        const { cardBalance, cardLimit } = body as {
          cardBalance: number;
          cardLimit: number;
        };

        if (
          typeof cardBalance !== "number" ||
          typeof cardLimit !== "number" ||
          cardBalance < 0 ||
          cardLimit <= 0
        ) {
          return NextResponse.json(
            {
              error:
                "cardBalance (>= 0) and cardLimit (> 0) are required for pay_off_card simulation",
            },
            { status: 400 },
          );
        }

        const result = creditScoreSimulator.simulatePayOffCard(
          profile,
          cardBalance,
          cardLimit,
        );

        return NextResponse.json({
          success: true,
          data: result,
          _meta: { simulationType, generatedAt: new Date().toISOString() },
        });
      }

      case "new_card": {
        const { newCardLimit } = body as { newCardLimit: number };

        if (typeof newCardLimit !== "number" || newCardLimit <= 0) {
          return NextResponse.json(
            { error: "newCardLimit (> 0) is required for new_card simulation" },
            { status: 400 },
          );
        }

        const result = creditScoreSimulator.simulateNewCard(
          profile,
          newCardLimit,
        );

        return NextResponse.json({
          success: true,
          data: result,
          _meta: { simulationType, generatedAt: new Date().toISOString() },
        });
      }

      case "scenarios": {
        const { scenarios } = body as {
          scenarios: { name: string; actions: SimulationAction[] }[];
        };

        if (!scenarios || !Array.isArray(scenarios) || scenarios.length === 0) {
          return NextResponse.json(
            { error: "Scenarios array is required and must not be empty" },
            { status: 400 },
          );
        }

        for (const scenario of scenarios) {
          if (!scenario.name || !Array.isArray(scenario.actions)) {
            return NextResponse.json(
              {
                error:
                  "Each scenario must have a name and actions array",
              },
              { status: 400 },
            );
          }
        }

        const result = creditScoreSimulator.compareScenarios(
          profile,
          scenarios,
        );

        return NextResponse.json({
          success: true,
          data: result,
          _meta: { simulationType, generatedAt: new Date().toISOString() },
        });
      }

      case "student_loan": {
        const { loans, income } = body as {
          loans: StudentLoanDetails[];
          income: number;
        };

        if (!loans || !Array.isArray(loans) || loans.length === 0) {
          return NextResponse.json(
            { error: "Loans array is required and must not be empty" },
            { status: 400 },
          );
        }

        if (typeof income !== "number" || income < 0) {
          return NextResponse.json(
            { error: "Income (>= 0) is required for student_loan simulation" },
            { status: 400 },
          );
        }

        const result = creditScoreSimulator.analyzeStudentLoanOptimization(
          loans,
          profile,
          income,
        );

        return NextResponse.json({
          success: true,
          data: result,
          _meta: { simulationType, generatedAt: new Date().toISOString() },
        });
      }

      default:
        return NextResponse.json(
          {
            error: "Invalid simulation type",
            validTypes: [
              "actions",
              "pay_off_card",
              "new_card",
              "scenarios",
              "student_loan",
            ],
          },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("Error in credit simulator POST:", error);
    return NextResponse.json(
      {
        error: "Failed to run simulation",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
},
);
