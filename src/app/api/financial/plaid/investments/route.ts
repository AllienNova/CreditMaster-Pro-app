import { NextRequest, NextResponse } from "next/server";
import { plaidInvestmentsService } from "@/lib/financial/plaid-investments-service";
import { plaidService } from "@/lib/financial/plaid-service";
import { withPermission } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";

/**
 * GET /api/financial/plaid/investments
 *
 * Retrieve investment holdings for the authenticated user's linked Plaid account.
 *
 * Query params:
 *   - itemId (optional, non-secret): Plaid item ID to use. Required when the user has
 *     multiple linked items. If omitted and the user has exactly one item, that item is used.
 *
 * FND-038b fix: access_token must never be a query param. The secret Plaid access token
 * is resolved server-side via plaidService.getAccessTokenForUser, scoped to the
 * authenticated user (preventing both URL exposure and cross-user IDOR).
 */
export const GET = withPermission(
  "financial:read",
  async (request: NextRequest, user: AuthedUser) => {
    try {
      const itemIdParam = request.nextUrl.searchParams.get("itemId");

      // Resolve the user's linked items server-side
      const accounts = await plaidService.getAccounts(user.id);

      if (accounts.length === 0) {
        return NextResponse.json(
          { error: "No linked Plaid accounts found for this user" },
          { status: 400 },
        );
      }

      const itemIds = [...new Set(accounts.map((a) => a.itemId))];

      let resolvedItemId: string;

      if (itemIdParam) {
        // IDOR guard: verify the requested itemId belongs to this user
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

      // Resolve the access token server-side — never from the request (FND-038b)
      const accessToken = await plaidService.getAccessTokenForUser(
        resolvedItemId,
        user.id,
      );

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
  },
);

/**
 * POST /api/financial/plaid/investments
 *
 * Retrieve investment transactions for a linked Plaid account.
 * Request body: { access_token, start_date, end_date }
 *
 * Note: POST body is not URL-logged, so the body-based token path is out of scope
 * for FND-038b (which targets query params / URL exposure). POST is unchanged.
 */
export const POST = withPermission(
  "financial:read",
  async (request: NextRequest, _user: AuthedUser) => {
  try {


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
},
);
