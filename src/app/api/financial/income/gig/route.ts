/**
 * Gig Economy Income API Route
 *
 * Handles gig income CRUD operations with platform and date filtering.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  gigIncomeService,
  type CreateGigIncomeInput,
  type GigIncomeType,
} from "@/lib/financial/gig-income-service";
import { withAuth } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";

const VALID_INCOME_TYPES: GigIncomeType[] = ["payment", "tip", "bonus", "refund"];

/**
 * GET /api/financial/income/gig
 * List gig income entries with optional filters: platformId, startDate, endDate, type
 */
export const GET = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const { searchParams } = new URL(request.url);
    const platformId = searchParams.get("platformId") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const type = searchParams.get("type") || undefined;

    // Validate type if provided
    if (type && !VALID_INCOME_TYPES.includes(type as GigIncomeType)) {
      return NextResponse.json(
        {
          error: "Invalid type. Must be: payment, tip, bonus, or refund",
        },
        { status: 400 },
      );
    }

    const income = await gigIncomeService.getIncome(user.id, {
      platformId,
      startDate,
      endDate,
      type: type as GigIncomeType | undefined,
    });

    return NextResponse.json({ income });
  } catch (_error) {
    void _error;
    return NextResponse.json(
      { error: "Failed to fetch gig income" },
      { status: 500 },
    );
  }
});

/**
 * POST /api/financial/income/gig
 * Add a gig income entry
 */
export const POST = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.platformId || body.amount === undefined || !body.date || !body.type) {
      return NextResponse.json(
        {
          error: "Missing required fields: platformId, amount, date, type",
        },
        { status: 400 },
      );
    }

    // Validate type
    if (!VALID_INCOME_TYPES.includes(body.type)) {
      return NextResponse.json(
        {
          error: "Invalid type. Must be: payment, tip, bonus, or refund",
        },
        { status: 400 },
      );
    }

    // Validate amount
    if (typeof body.amount !== "number") {
      return NextResponse.json(
        { error: "Amount must be a number" },
        { status: 400 },
      );
    }

    if (body.amount <= 0 && body.type !== "refund") {
      return NextResponse.json(
        { error: "Amount must be positive (except for refunds)" },
        { status: 400 },
      );
    }

    const input: CreateGigIncomeInput = {
      platformId: body.platformId,
      amount: body.amount,
      date: body.date,
      type: body.type,
      description: body.description,
    };

    const income = await gigIncomeService.addIncome(user.id, input);

    return NextResponse.json({ income }, { status: 201 });
  } catch (_error) {
    void _error;
    return NextResponse.json(
      { error: "Failed to add gig income" },
      { status: 500 },
    );
  }
});
