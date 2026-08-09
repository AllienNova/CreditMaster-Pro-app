import { NextRequest, NextResponse } from "next/server";
import { financialService } from "@/lib/financial/financial-service";
import { withPermission } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";

export const GET = withPermission(
  "financial:read",
  async (request: NextRequest, user: AuthedUser) => {
    const userId = user.id;
  try {


    const dashboard = await financialService.getFinancialDashboard(userId);

    return NextResponse.json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    console.error("Error fetching financial dashboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch financial dashboard" },
      { status: 500 },
    );
  }
},
);
