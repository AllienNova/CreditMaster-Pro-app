import { NextRequest, NextResponse } from "next/server";
import { plaidService } from "@/lib/financial/plaid-service";
import { withPermission } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";

export const POST = withPermission(
  "financial:link_accounts",
  async (request: NextRequest, user: AuthedUser) => {
    const userId = user.id;
  try {


    const linkToken = await plaidService.createLinkToken(userId);

    return NextResponse.json({
      success: true,
      data: linkToken,
    });
  } catch (error) {
    console.error("Error creating link token:", error);
    return NextResponse.json(
      { error: "Failed to create link token" },
      { status: 500 },
    );
  }
},
);
