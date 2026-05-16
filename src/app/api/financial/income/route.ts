/**
 * Income Sources API Route
 *
 * Handles CRUD operations for income sources
 */

import { NextRequest, NextResponse } from "next/server";
import {
  incomeTrackingService,
  CreateIncomeSourceInput,
} from "@/lib/financial/income-tracking-service";
import { withAuth } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";

/**
 * GET /api/financial/income
 * Get all income sources for the current user
 */
export const GET = withAuth(
  async (_request: NextRequest, user: AuthedUser) => {
  try {
    const sources = await incomeTrackingService.getIncomeSources(user.id);
    const stats = await incomeTrackingService.getMonthlyIncomeStats(user.id);
    const countdown = await incomeTrackingService.getPaydayCountdown(user.id);

    return NextResponse.json({
      sources,
      stats,
      countdown,
    });
  } catch (_error) {
    // IncomeAPI error: Error fetching income sources
    void _error;
    return NextResponse.json(
      { error: "Failed to fetch income sources" },
      { status: 500 },
    );
  }
},
);

/**
 * POST /api/financial/income
 * Create a new income source
 */
export const POST = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.amount || !body.frequency || !body.nextPayDate) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: name, amount, frequency, nextPayDate",
        },
        { status: 400 },
      );
    }

    // Validate frequency
    const validFrequencies = ["weekly", "biweekly", "semimonthly", "monthly"];
    if (!validFrequencies.includes(body.frequency)) {
      return NextResponse.json(
        {
          error:
            "Invalid frequency. Must be: weekly, biweekly, semimonthly, or monthly",
        },
        { status: 400 },
      );
    }

    // Validate amount
    if (typeof body.amount !== "number" || body.amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be a positive number" },
        { status: 400 },
      );
    }

    const input: CreateIncomeSourceInput = {
      name: body.name,
      amount: body.amount,
      frequency: body.frequency,
      nextPayDate: new Date(body.nextPayDate),
      accountId: body.accountId,
      isAutoDetected: body.isAutoDetected || false,
    };

    const source = await incomeTrackingService.createIncomeSource(
      user.id,
      input,
    );

    return NextResponse.json({ source }, { status: 201 });
  } catch (_error) {
    // IncomeAPI error: Error creating income source
    void _error;
    return NextResponse.json(
      { error: "Failed to create income source" },
      { status: 500 },
    );
  }
});

/**
 * PUT /api/financial/income
 * Update an existing income source
 */
export const PUT = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: "Missing required field: id" },
        { status: 400 },
      );
    }

    // Validate frequency if provided
    if (body.frequency) {
      const validFrequencies = ["weekly", "biweekly", "semimonthly", "monthly"];
      if (!validFrequencies.includes(body.frequency)) {
        return NextResponse.json(
          {
            error:
              "Invalid frequency. Must be: weekly, biweekly, semimonthly, or monthly",
          },
          { status: 400 },
        );
      }
    }

    // Validate amount if provided
    if (
      body.amount !== undefined &&
      (typeof body.amount !== "number" || body.amount <= 0)
    ) {
      return NextResponse.json(
        { error: "Amount must be a positive number" },
        { status: 400 },
      );
    }

    const source = await incomeTrackingService.updateIncomeSource(
      user.id,
      body.id,
      {
        name: body.name,
        amount: body.amount,
        frequency: body.frequency,
        nextPayDate: body.nextPayDate ? new Date(body.nextPayDate) : undefined,
        accountId: body.accountId,
      },
    );

    return NextResponse.json({ source });
  } catch (_error) {
    // IncomeAPI error: Error updating income source
    void _error;
    return NextResponse.json(
      { error: "Failed to update income source" },
      { status: 500 },
    );
  }
});

/**
 * DELETE /api/financial/income
 * Delete an income source
 */
export const DELETE = withAuth(
  async (request: NextRequest, user: AuthedUser) => {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing required parameter: id" },
        { status: 400 },
      );
    }

    await incomeTrackingService.deleteIncomeSource(user.id, id);

    return NextResponse.json({ success: true });
  } catch (_error) {
    // IncomeAPI error: Error deleting income source
    void _error;
    return NextResponse.json(
      { error: "Failed to delete income source" },
      { status: 500 },
    );
  }
},
);
