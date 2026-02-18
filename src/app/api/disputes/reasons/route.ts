/**
 * Dispute Reasons API
 * GET /api/disputes/reasons - Get available dispute reasons
 */

import { NextRequest, NextResponse } from "next/server";
import { jwtValidation } from "@/lib/auth/jwt-validation";

const DISPUTE_REASONS = [
  {
    id: "not_mine",
    category: "ownership",
    name: "Not My Account",
    description: "This account does not belong to me",
    fcraSection: "611(a)(1)(A)",
  },
  {
    id: "paid_in_full",
    category: "payment",
    name: "Paid in Full",
    description: "This debt was paid in full but still shows as outstanding",
    fcraSection: "623(a)(2)",
  },
  {
    id: "never_late",
    category: "payment",
    name: "Never Late",
    description: "I was never late on this account",
    fcraSection: "623(a)(1)(A)",
  },
  {
    id: "wrong_balance",
    category: "accuracy",
    name: "Incorrect Balance",
    description: "The reported balance is incorrect",
    fcraSection: "623(a)(1)(A)",
  },
  {
    id: "wrong_date",
    category: "accuracy",
    name: "Incorrect Date",
    description: "The dates reported are inaccurate",
    fcraSection: "623(a)(1)(A)",
  },
  {
    id: "wrong_status",
    category: "accuracy",
    name: "Incorrect Status",
    description: "The account status is incorrectly reported",
    fcraSection: "623(a)(1)(A)",
  },
  {
    id: "identity_theft",
    category: "fraud",
    name: "Identity Theft",
    description: "This account was opened fraudulently without my knowledge",
    fcraSection: "605B",
  },
  {
    id: "unauthorized_inquiry",
    category: "inquiry",
    name: "Unauthorized Inquiry",
    description: "I did not authorize this credit inquiry",
    fcraSection: "604(a)",
  },
  {
    id: "duplicate_account",
    category: "accuracy",
    name: "Duplicate Account",
    description: "This account is being reported multiple times",
    fcraSection: "611(a)(1)(A)",
  },
  {
    id: "closed_account",
    category: "status",
    name: "Account Closed",
    description: "This account was closed but shows as open",
    fcraSection: "623(a)(2)",
  },
  {
    id: "settled",
    category: "payment",
    name: "Settled/Negotiated",
    description:
      "This debt was settled but reporting does not reflect the settlement",
    fcraSection: "623(a)(2)",
  },
  {
    id: "included_in_bankruptcy",
    category: "legal",
    name: "Included in Bankruptcy",
    description: "This debt was discharged in bankruptcy",
    fcraSection: "605(a)(1)",
  },
  {
    id: "too_old",
    category: "legal",
    name: "Past Reporting Period",
    description: "This item is too old to be reported (over 7 years)",
    fcraSection: "605(a)",
  },
  {
    id: "other",
    category: "other",
    name: "Other Reason",
    description: "Other inaccuracy not listed above",
    fcraSection: "611(a)(1)(A)",
  },
];

export async function GET(request: NextRequest) {
  try {
    const validation = await jwtValidation.validateFromHeaders(request);
    if (!validation.valid || !validation.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    let reasons = DISPUTE_REASONS;
    if (category) {
      reasons = reasons.filter((r) => r.category === category);
    }

    return NextResponse.json({
      success: true,
      data: { reasons },
    });
  } catch (error) {
    console.error("Get dispute reasons error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get reasons" },
      { status: 500 },
    );
  }
}
