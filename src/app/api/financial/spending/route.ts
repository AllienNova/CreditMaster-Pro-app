import { NextRequest, NextResponse } from "next/server";
import { financialService } from "@/lib/financial/financial-service";
import { withPermission } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";

export const GET = withPermission(
  "financial:read",
  async (request: NextRequest, user: AuthedUser) => {
    const userId = user.id;
  try {


    const { searchParams } = new URL(request.url);
    const days = Number.parseInt(searchParams.get("days") || "30");

    const analysis = await financialService.getSpendingAnalysis(userId, days);

    return NextResponse.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    console.error("Error fetching spending analysis:", error);
    return NextResponse.json(
      { error: "Failed to fetch spending analysis" },
      { status: 500 },
    );
  }
},
);
