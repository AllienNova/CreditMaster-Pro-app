import { NextRequest, NextResponse } from "next/server";
import { plaidService } from "@/lib/financial/plaid-service";
import { withPermission } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";

export const POST = withPermission(
  "financial:link_accounts",
  async (request: NextRequest, user: AuthedUser) => {
    const userId = user.id;
  try {


    const body = await request.json();
    const { publicToken } = body;

    if (!publicToken) {
      return NextResponse.json(
        { error: "Public token is required" },
        { status: 400 },
      );
    }

    const itemId = await plaidService.exchangePublicToken(publicToken, userId);

    // Sync accounts after successful connection
    const accounts = await plaidService.syncAccounts(itemId, userId);

    // Sync transactions for the last 30 days
    await plaidService.syncTransactions(itemId, userId, 30);

    return NextResponse.json({
      success: true,
      data: { itemId, accounts },
    });
  } catch (error) {
    console.error("Error exchanging public token:", error);
    return NextResponse.json(
      { error: "Failed to exchange public token" },
      { status: 500 },
    );
  }
},
);
