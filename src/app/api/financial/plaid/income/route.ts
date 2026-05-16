import { NextRequest, NextResponse } from "next/server";
import { plaidIncomeService } from "@/lib/financial/plaid-income-service";
import { withPermission } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";

/**
 * GET /api/financial/plaid/income
 *
 * Retrieve income verification data for a linked Plaid account.
 * Query params:
 *   - access_token (required): Plaid access token
 *   - type (optional): "paystubs" | "taxforms" | "bank_income" (default: "paystubs")
 *   - user_token (required for bank_income type): Plaid user token
 */
export const GET = withPermission(
  "financial:read",
  async (request: NextRequest, _user: AuthedUser) => {
  try {


    const type = request.nextUrl.searchParams.get("type") || "paystubs";
    const accessToken = request.nextUrl.searchParams.get("access_token");
    const userToken = request.nextUrl.searchParams.get("user_token");

    if (type === "bank_income") {
      if (!userToken) {
        return NextResponse.json(
          { error: "user_token query parameter is required for bank_income type" },
          { status: 400 },
        );
      }

      const result = await plaidIncomeService.getBankIncome(userToken);
      return NextResponse.json({
        success: true,
        data: result,
      });
    }

    if (!accessToken) {
      return NextResponse.json(
        { error: "access_token query parameter is required" },
        { status: 400 },
      );
    }

    if (type === "taxforms") {
      const result = await plaidIncomeService.getTaxForms(accessToken);
      return NextResponse.json({
        success: true,
        data: result,
      });
    }

    // Default: paystubs
    const result = await plaidIncomeService.getPaystubs(accessToken);
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error fetching income data:", error);
    return NextResponse.json(
      { error: "Failed to fetch income data" },
      { status: 500 },
    );
  }
},
);

/**
 * POST /api/financial/plaid/income
 *
 * Create an income verification session or refresh bank income.
 * Request body:
 *   - action (required): "create" | "refresh"
 *   For "create": { webhook: string, access_tokens?: string[], precheck_id?: string }
 *   For "refresh": { user_token: string, days_requested?: number }
 */
export const POST = withPermission(
  "financial:write",
  async (request: NextRequest, _user: AuthedUser) => {
  try {


    const body = await request.json();
    const { action } = body;

    if (!action || (action !== "create" && action !== "refresh")) {
      return NextResponse.json(
        { error: 'action is required and must be "create" or "refresh"' },
        { status: 400 },
      );
    }

    if (action === "create") {
      const { webhook, access_tokens: accessTokens, precheck_id: precheckId } = body;

      if (!webhook) {
        return NextResponse.json(
          { error: "webhook is required for create action" },
          { status: 400 },
        );
      }

      const result = await plaidIncomeService.createIncomeVerification(
        webhook,
        {
          accessTokens: accessTokens as string[] | undefined,
          precheckId: precheckId as string | undefined,
        },
      );

      return NextResponse.json({
        success: true,
        data: result,
      });
    }

    // action === "refresh"
    const { user_token: userToken, days_requested: daysRequested } = body;

    if (!userToken) {
      return NextResponse.json(
        { error: "user_token is required for refresh action" },
        { status: 400 },
      );
    }

    const result = await plaidIncomeService.refreshBankIncome(
      userToken as string,
      daysRequested as number | undefined,
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error processing income request:", error);
    return NextResponse.json(
      { error: "Failed to process income request" },
      { status: 500 },
    );
  }
},
);
