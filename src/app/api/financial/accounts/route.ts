import { NextRequest, NextResponse } from "next/server";
import { plaidService } from "@/lib/financial/plaid-service";
import { withPermission } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";

export const GET = withPermission(
  "financial:read",
  async (request: NextRequest, user: AuthedUser) => {
    const userId = user.id;
  try {


    const accounts = await plaidService.getAccounts(userId);

    return NextResponse.json({
      success: true,
      data: accounts,
    });
  } catch (error) {
    console.error("Error fetching accounts:", error);
    return NextResponse.json(
      { error: "Failed to fetch accounts" },
      { status: 500 },
    );
  }
},
);
