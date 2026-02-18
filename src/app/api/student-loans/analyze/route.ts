/**
 * Student Loan Portfolio Analysis API
 *
 * Analyzes complete student loan portfolio and provides insights
 */

import { NextRequest, NextResponse } from "next/server";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { rbac } from "@/lib/auth/rbac";
import { logAIInteraction } from "@/lib/security/audit-logging";

export async function POST(request: NextRequest) {
  try {
    // Validate JWT token
    const validation = await jwtValidation.validateFromHeaders(request);

    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permissions
    if (!rbac.hasPermission(validation.user, "student_loans:analyze")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const user = validation.user;

    // Parse request body
    const body = await request.json();
    const { loans } = body;

    if (!loans || !Array.isArray(loans)) {
      return NextResponse.json(
        { error: "Missing required field: loans (array)" },
        { status: 400 },
      );
    }

    // Track timing
    const startTime = Date.now();

    // Analyze portfolio - calculate basic statistics
    const totalDebt = loans.reduce(
      (sum, loan) => sum + loan.current_balance,
      0,
    );
    const weightedInterestRate =
      loans.reduce(
        (sum, loan) => sum + loan.interest_rate * loan.current_balance,
        0,
      ) / totalDebt;

    const analysis = {
      total_loans: loans.length,
      total_debt: totalDebt,
      weighted_interest_rate: weightedInterestRate,
      loans_by_status: loans.reduce(
        (acc, loan) => {
          acc[loan.loan_status] = (acc[loan.loan_status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
      loans_by_servicer: loans.reduce(
        (acc, loan) => {
          acc[loan.servicer_name] = (acc[loan.servicer_name] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
    };

    const duration = Date.now() - startTime;

    // Audit log
    logAIInteraction({
      userId: user.id,
      model: "student-loan-service",
      prompt: JSON.stringify({ loans }),
      response: JSON.stringify(analysis),
      tokens: 0,
      cost: 0,
      duration,
      inputValid: true,
      outputValid: true,
    });

    return NextResponse.json({
      success: true,
      analysis,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Portfolio analysis error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to analyze portfolio",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Student Loan Portfolio Analysis API",
    method: "POST",
    endpoint: "/api/student-loans/analyze",
    requiredFields: ["loans"],
    description:
      "Analyzes complete student loan portfolio and provides insights",
  });
}
