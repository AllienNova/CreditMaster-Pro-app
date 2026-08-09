import { NextRequest, NextResponse } from "next/server";
import { plaidLiabilitiesService } from "@/lib/financial/plaid-liabilities-service";
import { plaidService } from "@/lib/financial/plaid-service";
import { withPermission } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";

const VALID_LIABILITY_TYPES = ["credit", "student", "mortgage"] as const;
type LiabilityType = (typeof VALID_LIABILITY_TYPES)[number];

/**
 * GET /api/financial/plaid/liabilities
 *
 * Retrieve liabilities for the authenticated user's linked Plaid account.
 *
 * Query params:
 *   - itemId (optional, non-secret): Plaid item ID to use. Required when the user has
 *     multiple linked items. If omitted and the user has exactly one item, that item is used.
 *   - type (optional): Filter by liability type: credit, student, or mortgage.
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
      const typeParam = request.nextUrl.searchParams.get("type");

      // Validate type param before doing any DB work
      if (
        typeParam &&
        !VALID_LIABILITY_TYPES.includes(typeParam as LiabilityType)
      ) {
        return NextResponse.json(
          {
            error: `Invalid type parameter. Must be one of: ${VALID_LIABILITY_TYPES.join(", ")}`,
          },
          { status: 400 },
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

      // If a specific type is requested, return only that type
      if (typeParam === "credit") {
        const credit =
          await plaidLiabilitiesService.getCreditCardLiabilities(accessToken);
        return NextResponse.json({
          success: true,
          data: { credit },
        });
      }

      if (typeParam === "student") {
        const student =
          await plaidLiabilitiesService.getStudentLoanLiabilities(accessToken);
        return NextResponse.json({
          success: true,
          data: { student },
        });
      }

      if (typeParam === "mortgage") {
        const mortgage =
          await plaidLiabilitiesService.getMortgageLiabilities(accessToken);
        return NextResponse.json({
          success: true,
          data: { mortgage },
        });
      }

      // No type filter: return all liabilities
      const result = await plaidLiabilitiesService.getLiabilities(accessToken);

      return NextResponse.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Error fetching liabilities:", error);
      return NextResponse.json(
        { error: "Failed to fetch liabilities" },
        { status: 500 },
      );
    }
  },
);
