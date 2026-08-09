/**
 * Credit Score History API
 *
 * GET /api/credit-bureau/score-history - Retrieve score history for the authenticated user
 *
 * Query params:
 *   - bureau (optional): "experian" | "equifax" | "transunion"
 *   - limit (optional): max number of entries (default 50)
 *   - from_date (optional): ISO-8601 start date
 *   - to_date (optional): ISO-8601 end date
 */

import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";
import { CreditBureauService } from "@/lib/credit-bureau/credit-bureau-service";
import type { Bureau, ScoreHistoryQuery } from "@/lib/credit-bureau/types";

const VALID_BUREAUS = new Set<string>(["experian", "equifax", "transunion"]);

export const GET = withPermission(
  "credit:read",
  async (request: NextRequest, user: AuthedUser) => {
  try {
    // 3. Parse query parameters
    const { searchParams } = new URL(request.url);
    const bureau = searchParams.get("bureau");
    const limitStr = searchParams.get("limit");
    const fromDate = searchParams.get("from_date");
    const toDate = searchParams.get("to_date");

    // Validate bureau if provided
    if (bureau && !VALID_BUREAUS.has(bureau)) {
      return NextResponse.json(
        { error: `Invalid bureau: ${bureau}. Must be one of: experian, equifax, transunion` },
        { status: 400 },
      );
    }

    // Validate limit if provided
    const limit = limitStr ? parseInt(limitStr, 10) : 50;
    if (isNaN(limit) || limit < 1 || limit > 500) {
      return NextResponse.json(
        { error: "Invalid limit: must be a number between 1 and 500" },
        { status: 400 },
      );
    }

    // 4. Build query
    const query: ScoreHistoryQuery = {
      user_id: user.id,
      bureau: bureau as Bureau | undefined,
      limit,
      from_date: fromDate ?? undefined,
      to_date: toDate ?? undefined,
    };

    // 5. Retrieve score history
    const history = await CreditBureauService.getScoreHistory(query);

    // 6. Return response
    return NextResponse.json({
      success: true,
      data: history,
      count: history.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to retrieve score history",
      },
      { status: 500 },
    );
  }
  },
);
