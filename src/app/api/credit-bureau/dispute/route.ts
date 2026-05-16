/**
 * Credit Bureau Dispute API
 *
 * POST /api/credit-bureau/dispute - Submit dispute to credit bureau
 */

import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";
import { validateInput } from "@/lib/security/input-validation";
import { CreditBureauService } from "@/lib/credit-bureau/credit-bureau-service";
import type { DisputeSubmission, Bureau } from "@/lib/credit-bureau/types";

export const POST = withPermission(
  "disputes:create",
  async (request: NextRequest, user: AuthedUser) => {
  try {
    // 3. Parse and validate request body
    const body = await request.json();
    const {
      bureau,
      creditItemId,
      disputeReason,
      disputeMethod = "online",
      supportingDocuments = [],
      consumerStatement,
    } = body;

    // Validate required fields
    if (!bureau || !creditItemId || !disputeReason) {
      return NextResponse.json(
        { error: "Bureau, credit item ID, and dispute reason are required" },
        { status: 400 },
      );
    }

    // Validate bureau
    const validBureaus: Bureau[] = ["experian", "equifax", "transunion"];
    if (!validBureaus.includes(bureau)) {
      return NextResponse.json(
        { error: "Invalid bureau. Must be experian, equifax, or transunion" },
        { status: 400 },
      );
    }

    // Validate consumer statement if provided
    if (consumerStatement) {
      const inputValidation = validateInput(consumerStatement, {
        maxLength: 1000,
        checkPromptInjection: true,
      });

      if (!inputValidation.isValid) {
        return NextResponse.json(
          {
            error: `Invalid consumer statement: ${inputValidation.errors.join(", ")}`,
          },
          { status: 400 },
        );
      }
    }

    // 4. Create dispute submission
    const dispute: DisputeSubmission = {
      bureau,
      credit_item_id: creditItemId,
      dispute_reason: disputeReason,
      dispute_method: disputeMethod,
      supporting_documents: supportingDocuments,
      consumer_statement: consumerStatement,
    };

    // 5. Submit dispute to bureau
    const result = await CreditBureauService.submitDispute(user.id, dispute);

    // 6. Return response
    return NextResponse.json({
      success: result.success,
      data: result,
    });
  } catch (_error) {
    // Error logged
    return NextResponse.json(
      {
        success: false,
        error:
          _error instanceof Error ? _error.message : "Failed to submit dispute",
      },
      { status: 500 },
    );
  }
  },
);
