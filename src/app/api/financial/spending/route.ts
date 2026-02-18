import { NextRequest, NextResponse } from "next/server";
import { financialService } from "@/lib/financial/financial-service";
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
}
