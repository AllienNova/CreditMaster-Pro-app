import { NextRequest, NextResponse } from "next/server";
import { plaidService } from "@/lib/financial/plaid-service";
import { withPermission } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";

export const GET = withPermission(
  "financial:read",
  async (request: NextRequest, _user: AuthedUser) => {
  try {


    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("accountId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!accountId || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Account ID, start date, and end date are required" },
        { status: 400 },
      );
    }

    const transactions = await plaidService.getTransactions(
      accountId,
      new Date(startDate),
      new Date(endDate),
    );

    return NextResponse.json({
      success: true,
      data: transactions,
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 },
    );
  }
},
);
