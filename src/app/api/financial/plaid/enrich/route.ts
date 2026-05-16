import { NextRequest, NextResponse } from "next/server";
import {
  plaidEnrichService,
  EnrichTransactionInput,
} from "@/lib/financial/plaid-enrich-service";
import { withPermission } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";

/**
 * POST /api/financial/plaid/enrich
 *
 * Enrich transactions with merchant info, categories, logos.
 * Request body:
 *   - transactions (required): Array of transaction objects
 *   - account_type (optional): "depository" | "credit" (default: "depository")
 *
 * Each transaction object must have:
 *   - id: string
 *   - description: string
 *   - amount: number
 *   - direction: "INFLOW" | "OUTFLOW"
 *   - iso_currency_code: string
 */
export const POST = withPermission(
  "financial:read",
  async (request: NextRequest, _user: AuthedUser) => {
  try {


    const body = await request.json();
    const { transactions, account_type: accountType } = body;

    if (!transactions || !Array.isArray(transactions)) {
      return NextResponse.json(
        { error: "transactions array is required" },
        { status: 400 },
      );
    }

    if (transactions.length === 0) {
      return NextResponse.json({
        success: true,
        data: { enrichedTransactions: [], requestId: null },
      });
    }

    if (transactions.length > 100) {
      return NextResponse.json(
        { error: "Maximum of 100 transactions per request" },
        { status: 400 },
      );
    }

    // Validate each transaction has required fields
    for (let i = 0; i < transactions.length; i++) {
      const t = transactions[i];
      if (!t.id || typeof t.id !== "string") {
        return NextResponse.json(
          { error: `Transaction at index ${i} is missing required field: id` },
          { status: 400 },
        );
      }
      if (!t.description || typeof t.description !== "string") {
        return NextResponse.json(
          {
            error: `Transaction at index ${i} is missing required field: description`,
          },
          { status: 400 },
        );
      }
      if (typeof t.amount !== "number") {
        return NextResponse.json(
          {
            error: `Transaction at index ${i} is missing required field: amount`,
          },
          { status: 400 },
        );
      }
      if (!t.direction || (t.direction !== "INFLOW" && t.direction !== "OUTFLOW")) {
        return NextResponse.json(
          {
            error: `Transaction at index ${i} has invalid direction. Must be "INFLOW" or "OUTFLOW"`,
          },
          { status: 400 },
        );
      }
      if (!t.iso_currency_code || typeof t.iso_currency_code !== "string") {
        return NextResponse.json(
          {
            error: `Transaction at index ${i} is missing required field: iso_currency_code`,
          },
          { status: 400 },
        );
      }
    }

    const result = await plaidEnrichService.enrichTransactions(
      transactions as EnrichTransactionInput[],
      (accountType as string) || "depository",
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error enriching transactions:", error);
    return NextResponse.json(
      { error: "Failed to enrich transactions" },
      { status: 500 },
    );
  }
},
);
