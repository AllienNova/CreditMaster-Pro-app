import { NextRequest, NextResponse } from "next/server";
import { plaidService } from "@/lib/financial/plaid-service";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { rbac } from "@/lib/auth/rbac";

export async function GET(request: NextRequest) {
  try {
    // Validate JWT token
    const validation = await jwtValidation.validateFromHeaders(request);

    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permissions
    if (!rbac.hasPermission(validation.user, "financial:read")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Extract userId from validated token
    const userId = validation.user.id;

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
}
