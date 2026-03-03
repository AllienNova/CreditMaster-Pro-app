import { NextRequest, NextResponse } from "next/server";
import { plaidInvestmentsService } from "@/lib/financial/plaid-investments-service";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { rbac } from "@/lib/auth/rbac";

/**
 * GET /api/financial/plaid/investments
 *
 * Retrieve investment holdings for a linked Plaid account.
 * Requires `access_token` as a query parameter.
 */
export async function GET(request: NextRequest) {
  try {
    const validation = await jwtValidation.validateFromHeaders(request);

    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!rbac.hasPermission(validation.user, "financial:read")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const accessToken = request.nextUrl.searchParams.get("access_token");

    if (!accessToken) {
      return NextResponse.json(
        { error: "access_token query parameter is required" },
        { status: 400 },
      );
    }

    const result = await plaidInvestmentsService.getHoldings(accessToken);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error fetching investment holdings:", error);
    return NextResponse.json(
      { error: "Failed to fetch investment holdings" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/financial/plaid/investments
 *
 * Retrieve investment transactions for a linked Plaid account.
 * Request body: { access_token, start_date, end_date }
 */
export async function POST(request: NextRequest) {
  try {
    const validation = await jwtValidation.validateFromHeaders(request);

    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!rbac.hasPermission(validation.user, "financial:read")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { access_token: accessToken, start_date: startDate, end_date: endDate } = body;

    if (!accessToken) {
      return NextResponse.json(
        { error: "access_token is required" },
        { status: 400 },
      );
    }

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "start_date and end_date are required" },
        { status: 400 },
      );
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return NextResponse.json(
        { error: "Dates must be in YYYY-MM-DD format" },
        { status: 400 },
      );
    }

    const result = await plaidInvestmentsService.getTransactions(
      accessToken,
      startDate,
      endDate,
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error fetching investment transactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch investment transactions" },
      { status: 500 },
    );
  }
}
