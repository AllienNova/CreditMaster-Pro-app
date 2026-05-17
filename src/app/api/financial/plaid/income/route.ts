import { NextRequest, NextResponse } from "next/server";
import { plaidService } from "@/lib/financial/plaid-service";
import { plaidIncomeService } from "@/lib/financial/plaid-income-service";
import { withPermission } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";

/**
 * GET /api/financial/plaid/income
 *
 * Retrieve income verification data for the authenticated user's linked Plaid account.
 *
 * Query params:
 *   - type (optional): "paystubs" | "taxforms" | "bank_income" (default: "paystubs")
 *   - itemId (optional, non-secret): Plaid item ID to use. Required when the user has
 *     multiple linked items. If omitted and the user has exactly one item, that item is used.
 *
 * FND-038 fix: access_token and user_token must never be accepted as query params.
 * The secret Plaid access token is resolved server-side via plaidService.getAccessToken,
 * scoped to the authenticated user (FND-037 fix).
 *
 * KNOWN LIMITATION (STOP-and-report — FND-038 partial):
 *   The "bank_income" type requires a Plaid user_token, which is a different credential
 *   from the access_token. There is no server-side storage for Plaid user_tokens in this
 *   codebase (no plaid_users table, no user_token column in plaid_items). Until a
 *   user_token persistence layer is added, bank_income requests return 501 rather than
 *   accepting the user_token as an insecure query param. Implement TASK-PLD-06 to add
 *   server-side user_token storage before enabling this path.
 */
export const GET = withPermission(
  "financial:read",
  async (request: NextRequest, user: AuthedUser) => {
    try {
      const type = request.nextUrl.searchParams.get("type") ?? "paystubs";
      const itemIdParam = request.nextUrl.searchParams.get("itemId");

      // bank_income requires a Plaid user_token — no server-side storage exists.
      // Return 501 rather than accept it as an insecure query param. (FND-038 STOP clause)
      if (type === "bank_income") {
        return NextResponse.json(
          {
            error:
              "bank_income is not available: no server-side Plaid user_token storage exists. " +
              "Implement TASK-PLD-06 to add user_token persistence before enabling this endpoint.",
          },
          { status: 501 },
        );
      }

      // Resolve the user's linked items server-side
      const accounts = await plaidService.getAccounts(user.id);

      if (accounts.length === 0) {
        return NextResponse.json(
          { error: "No linked Plaid accounts found for this user" },
          { status: 400 },
        );
      }

      // Collect unique item IDs from the user's accounts
      const itemIds = [...new Set(accounts.map((a) => a.itemId))];

      let resolvedItemId: string;

      if (itemIdParam) {
        // Verify the requested itemId belongs to this user (IDOR guard)
        if (!itemIds.includes(itemIdParam)) {
          return NextResponse.json(
            { error: "itemId does not belong to the authenticated user" },
            { status: 400 },
          );
        }
        resolvedItemId = itemIdParam;
      } else if (itemIds.length === 1) {
        resolvedItemId = itemIds[0];
      } else {
        return NextResponse.json(
          {
            error:
              "Multiple linked items found. Provide an itemId query parameter to specify which item to use.",
          },
          { status: 400 },
        );
      }

      // Resolve the access token server-side — never from the request (FND-037 + FND-038)
      // getAccessToken is private; we reach it via plaid-service's public syncAccounts,
      // but for income we need the token directly. Since PlaidService exposes it via
      // the private method, we use a dedicated public accessor added for this purpose.
      const accessToken = await plaidService.getAccessTokenForUser(resolvedItemId, user.id);

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
 *
 * Note: POST body is not URL-logged, so the body-based token paths are out of scope
 * for FND-038 (which targets query params / URL exposure). POST is unchanged.
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
