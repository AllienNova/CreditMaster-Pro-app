import { NextRequest, NextResponse } from "next/server";
import { plaidLiabilitiesService } from "@/lib/financial/plaid-liabilities-service";
import { withPermission } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";

const VALID_LIABILITY_TYPES = ["credit", "student", "mortgage"] as const;
type LiabilityType = (typeof VALID_LIABILITY_TYPES)[number];

/**
 * GET /api/financial/plaid/liabilities
 *
 * Retrieve liabilities for a linked Plaid account.
 * Query params:
 *   - access_token (required): The Plaid access token
 *   - type (optional): Filter by liability type: credit, student, or mortgage
 */
export const GET = withPermission(
  "financial:read",
  async (request: NextRequest, _user: AuthedUser) => {
  try {


    const accessToken = request.nextUrl.searchParams.get("access_token");

    if (!accessToken) {
      return NextResponse.json(
        { error: "access_token query parameter is required" },
        { status: 400 },
      );
    }

    const typeParam = request.nextUrl.searchParams.get("type");

    // Validate type param if provided
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
