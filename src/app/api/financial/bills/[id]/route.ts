import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";
import { billDetectionService } from "@/lib/financial/bill-detection-service";
import type { BillUpdateInput } from "@/lib/financial/types/bill.types";

/**
 * GET /api/financial/bills/[id]
 * Get a single bill by ID
 */
export const GET = withPermission(
  "financial:read",
  async (request: NextRequest, user: AuthedUser) => {
  try {
    const userId = user.id;
    const id = request.nextUrl.pathname.split("/").pop() as string;

    // Get bill
    const bill = await billDetectionService.getBillById(id, userId);

    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    return NextResponse.json({ bill });
  } catch (_error) {
    // BillsRoute error: Failed to fetch bill
    void _error;
    return NextResponse.json(
      { error: "Failed to fetch bill" },
      { status: 500 },
    );
  }
},
);

/**
 * PATCH /api/financial/bills/[id]
 * Update a bill
 */
export const PATCH = withPermission(
  "financial:write",
  async (request: NextRequest, user: AuthedUser) => {
  try {
    const userId = user.id;
    const id = request.nextUrl.pathname.split("/").pop() as string;

    // Parse request body
    const body = await request.json();

    // Build update input
    const input: BillUpdateInput = {};

    if (body.merchantName !== undefined) input.merchantName = body.merchantName;
    if (body.category !== undefined) input.category = body.category;
    if (body.amount !== undefined) {
      const amount = parseFloat(body.amount);
      if (isNaN(amount) || amount <= 0) {
        return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
      }
      input.amount = amount;
    }
    if (body.frequency !== undefined) input.frequency = body.frequency;
    if (body.nextDueDate !== undefined) {
      const date = new Date(body.nextDueDate);
      if (isNaN(date.getTime())) {
        return NextResponse.json(
          { error: "Invalid due date" },
          { status: 400 },
        );
      }
      input.nextDueDate = date;
    }
    if (body.status !== undefined) input.status = body.status;
    if (body.isAutoPay !== undefined) input.isAutoPay = body.isAutoPay;
    if (body.accountId !== undefined) input.accountId = body.accountId;
    if (body.notes !== undefined) input.notes = body.notes;

    // Update bill
    const bill = await billDetectionService.updateBill(id, userId, input);

    return NextResponse.json({ bill });
  } catch (_error) {
    // BillsRoute error: Failed to update bill
    void _error;
    return NextResponse.json(
      { error: "Failed to update bill" },
      { status: 500 },
    );
  }
},
);

/**
 * DELETE /api/financial/bills/[id]
 * Delete a bill
 */
export const DELETE = withPermission(
  "financial:write",
  async (request: NextRequest, user: AuthedUser) => {
  try {
    const userId = user.id;
    const id = request.nextUrl.pathname.split("/").pop() as string;

    // Delete bill
    await billDetectionService.deleteBill(id, userId);

    return NextResponse.json({ success: true });
  } catch (_error) {
    // BillsRoute error: Failed to delete bill
    void _error;
    return NextResponse.json(
      { error: "Failed to delete bill" },
      { status: 500 },
    );
  }
},
);
