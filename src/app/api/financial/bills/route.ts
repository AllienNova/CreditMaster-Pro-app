/**
 * Bills API
 *
 * GET /api/financial/bills - Get all bills
 * POST /api/financial/bills - Create a new bill
 */

import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";
import { billDetectionService } from "@/lib/financial/bill-detection-service";
import type {
  BillCreateInput,
  BillCategory,
} from "@/lib/financial/types/bill.types";

/**
 * GET /api/financial/bills
 * List all bills for the authenticated user
 */
export const GET = withPermission(
  "financial:read",
  async (request: NextRequest, user: AuthedUser) => {
  try {
    const userId = user.id;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") === "true";
    const category = searchParams.get("category") as BillCategory | null;

    // Get bills
    const bills = await billDetectionService.getBillsByUser(userId, {
      activeOnly,
      category: category || undefined,
    });

    return NextResponse.json({ bills });
  } catch (_error) {
    // BillsRoute error: Failed to fetch bills
    void _error;
    return NextResponse.json(
      { error: "Failed to fetch bills" },
      { status: 500 },
    );
  }
},
);

/**
 * POST /api/financial/bills
 * Create a new bill
 */
export const POST = withPermission(
  "financial:write",
  async (request: NextRequest, user: AuthedUser) => {
  try {
    const userId = user.id;

    // Parse request body
    const body = await request.json();

    // Validate required fields
    if (
      !body.merchantName ||
      !body.category ||
      !body.amount ||
      !body.frequency ||
      !body.nextDueDate
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Create bill input
    const input: BillCreateInput = {
      merchantName: body.merchantName,
      category: body.category,
      amount: parseFloat(body.amount),
      frequency: body.frequency,
      nextDueDate: new Date(body.nextDueDate),
      isAutoPay: body.isAutoPay || false,
      accountId: body.accountId,
      notes: body.notes,
    };

    // Validate amount
    if (isNaN(input.amount) || input.amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    // Validate date
    if (isNaN(input.nextDueDate.getTime())) {
      return NextResponse.json({ error: "Invalid due date" }, { status: 400 });
    }

    // Create bill
    const bill = await billDetectionService.createBill(userId, input);

    return NextResponse.json({ bill }, { status: 201 });
  } catch (_error) {
    // BillsRoute error: Failed to create bill
    void _error;
    return NextResponse.json(
      { error: "Failed to create bill" },
      { status: 500 },
    );
  }
},
);
