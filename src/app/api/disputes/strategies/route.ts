/**
 * Dispute Strategies API
 * GET /api/disputes/strategies - Get available dispute strategies
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-guard";

const DISPUTE_STRATEGIES = [
  {
    id: "fcra_violation",
    name: "FCRA Violation",
    description:
      "Challenge items that violate the Fair Credit Reporting Act requirements for accuracy and verification.",
    difficulty: "intermediate",
    successRate: 78,
    estimatedDays: 30,
    steps: [
      "Identify specific FCRA violations",
      "Document the inaccuracies",
      "Send dispute letter citing specific FCRA sections",
      "Follow up within 30 days",
    ],
  },
  {
    id: "validation_request",
    name: "Debt Validation",
    description:
      "Request debt collectors to validate the debt under FDCPA regulations.",
    difficulty: "beginner",
    successRate: 65,
    estimatedDays: 45,
    steps: [
      "Send debt validation letter within 30 days of first contact",
      "Request original creditor documentation",
      "Challenge if validation is insufficient",
    ],
  },
  {
    id: "goodwill_adjustment",
    name: "Goodwill Adjustment",
    description:
      "Request creditors to remove negative items as a gesture of goodwill for loyal customers.",
    difficulty: "beginner",
    successRate: 45,
    estimatedDays: 14,
    steps: [
      "Write a sincere goodwill letter",
      "Highlight positive payment history",
      "Explain circumstances that led to the issue",
      "Request removal as one-time courtesy",
    ],
  },
  {
    id: "pay_for_delete",
    name: "Pay for Delete",
    description:
      "Negotiate with creditors to remove negative items in exchange for payment.",
    difficulty: "intermediate",
    successRate: 55,
    estimatedDays: 21,
    steps: [
      "Contact creditor or collection agency",
      "Negotiate deletion in exchange for payment",
      "Get agreement in writing before paying",
      "Verify deletion after payment",
    ],
  },
  {
    id: "identity_theft",
    name: "Identity Theft Dispute",
    description:
      "Dispute items that resulted from identity theft with supporting documentation.",
    difficulty: "advanced",
    successRate: 85,
    estimatedDays: 45,
    steps: [
      "File FTC identity theft report",
      "File police report",
      "Send dispute with identity theft affidavit",
      "Request fraud alert or credit freeze",
    ],
  },
  {
    id: "statute_of_limitations",
    name: "Statute of Limitations",
    description:
      "Challenge debts that are past the statute of limitations for collection.",
    difficulty: "intermediate",
    successRate: 70,
    estimatedDays: 30,
    steps: [
      "Determine SOL for your state",
      "Calculate if debt is time-barred",
      "Send cease and desist if applicable",
      "Dispute reporting if debt is obsolete",
    ],
  },
  {
    id: "procedural_error",
    name: "Procedural Error Challenge",
    description:
      "Challenge items where creditors failed to follow proper procedures.",
    difficulty: "advanced",
    successRate: 72,
    estimatedDays: 45,
    steps: [
      "Research creditor procedures and requirements",
      "Identify procedural violations",
      "Document all errors",
      "File dispute citing specific procedural failures",
    ],
  },
];

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const difficulty = searchParams.get("difficulty");

    let strategies = DISPUTE_STRATEGIES;
    if (difficulty) {
      strategies = strategies.filter((s) => s.difficulty === difficulty);
    }

    return NextResponse.json({
      success: true,
      data: { strategies },
    });
  } catch (error) {
    console.error("Get dispute strategies error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get strategies" },
      { status: 500 },
    );
  }
});
