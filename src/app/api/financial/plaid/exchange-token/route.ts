import { NextRequest, NextResponse } from "next/server";
import { plaidService } from "@/lib/financial/plaid-service";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { rbac } from "@/lib/auth/rbac";

export async function POST(request: NextRequest) {
  try {
    // Validate JWT token
    const validation = await jwtValidation.validateFromHeaders(request);

    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permissions
    if (!rbac.hasPermission(validation.user, "financial:link_accounts")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Extract userId from validated token
    const userId = validation.user.id;

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
}
