import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";
import { billDetectionService } from "@/lib/financial/bill-detection-service";
import type { BillDetectionOptions } from "@/lib/financial/types/bill.types";

/**
 * POST /api/financial/bills/detect
 * Detect recurring bills from transactions
 */
export const POST = withPermission(
  "financial:read",
  async (request: NextRequest, user: AuthedUser) => {
  try {
    const userId = user.id;

    // Parse request body
    const body = await request.json();

    // Build detection options
    const options: BillDetectionOptions = {};

    if (body.startDate) {
      const startDate = new Date(body.startDate);
      if (isNaN(startDate.getTime())) {
        return NextResponse.json(
          { error: "Invalid start date" },
          { status: 400 },
        );
      }
      options.startDate = startDate;
    }

    if (body.endDate) {
      const endDate = new Date(body.endDate);
      if (isNaN(endDate.getTime())) {
        return NextResponse.json(
          { error: "Invalid end date" },
          { status: 400 },
        );
      }
      options.endDate = endDate;
    }

    if (body.minOccurrences !== undefined) {
      options.minOccurrences = parseInt(body.minOccurrences);
    }

    if (body.confidenceThreshold !== undefined) {
      options.confidenceThreshold = parseInt(body.confidenceThreshold);
    }

    // Detect bills
    const detectedBills = await billDetectionService.detectBills(
      userId,
      options,
    );

    return NextResponse.json({ detectedBills });
  } catch (error) {
    console.error("Error detecting bills:", error);
    return NextResponse.json(
      { error: "Failed to detect bills" },
      { status: 500 },
    );
  }
},
);
