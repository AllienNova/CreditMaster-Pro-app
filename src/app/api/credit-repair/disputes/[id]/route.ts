/**
 * Individual Dispute API Route
 *
 * GET /api/credit-repair/disputes/[id] - Get single dispute
 * PUT /api/credit-repair/disputes/[id] - Update dispute
 * DELETE /api/credit-repair/disputes/[id] - Delete dispute
 *
 * Features:
 * - Full CRUD operations
 * - Database integration
 * - Authentication required
 * - Input validation
 * - Optimistic locking support
 * - Error handling
 * - Audit logging
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";
import { db } from "@/lib/credit-repair/db";
import { auditLogger } from "@/lib/security/audit-logging";
import type {
  DisputeStrategy,
  DisputeStatus,
  Bureau,
} from "@/lib/credit-repair/db/types";

interface DisputeUpdatePayload {
  itemType?: string;
  itemDescription?: string;
  creditorName?: string;
  accountNumber?: string;
  balance?: number;
  inaccuracyType?: string;
  strategy?: DisputeStrategy;
  letterContent?: string;
  status?: DisputeStatus;
  bureau?: Bureau;
  sentAt?: Date;
  responseReceivedAt?: Date;
  outcome?: "removed" | "updated" | "verified" | "pending";
  notes?: string;
}

/**
 * GET /api/credit-repair/disputes/[id]
 * Get single dispute by ID
 */
export const GET = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const disputeId = request.nextUrl.pathname.split("/").pop() as string;

    // 2. Get dispute from database
    const dispute = await db.disputes.getDispute(disputeId, user.id);

    if (!dispute) {
      return NextResponse.json({ error: "Dispute not found" }, { status: 404 });
    }

    // 3. Audit log
    await auditLogger.logAIInteraction({
      userId: user.id,
      action: "get_dispute",
      input: { disputeId },
      output: { found: true },
      success: true,
    });

    // 4. Return response
    return NextResponse.json({
      success: true,
      data: dispute,
    });
  } catch (_error) {
    // CreditRepairDisputeRoute error: Failed to get dispute
    void _error;
    return NextResponse.json(
      { error: "Failed to get dispute" },
      { status: 500 },
    );
  }
});

/**
 * PUT /api/credit-repair/disputes/[id]
 * Update dispute with optimistic locking support
 */
export const PUT = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const disputeId = request.nextUrl.pathname.split("/").pop() as string;

    // 2. Parse and validate input
    const body = await request.json();
    const {
      itemType,
      itemDescription,
      creditorName,
      accountNumber,
      balance,
      inaccuracyType,
      strategy,
      letterContent,
      status,
      bureau,
      sentAt,
      responseReceivedAt,
      outcome,
      notes,
      expectedUpdatedAt, // For optimistic locking
    } = body;

    // Validate enum values if provided
    if (strategy) {
      const validStrategies: DisputeStrategy[] = [
        "basic_dispute",
        "debt_validation",
        "method_of_verification",
        "procedural_violation",
        "statute_of_limitations",
        "identity_theft",
        "mixed_file",
        "creditor_direct",
        "goodwill",
        "pay_for_delete",
      ];

      if (!validStrategies.includes(strategy)) {
        return NextResponse.json(
          { error: "Invalid strategy", validStrategies },
          { status: 400 },
        );
      }
    }

    if (status) {
      const validStatuses: DisputeStatus[] = [
        "draft",
        "sent",
        "under_review",
        "resolved",
        "rejected",
      ];

      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: "Invalid status", validStatuses },
          { status: 400 },
        );
      }
    }

    if (bureau) {
      const validBureaus: Bureau[] = ["experian", "equifax", "transunion"];
      if (!validBureaus.includes(bureau)) {
        return NextResponse.json(
          { error: "Invalid bureau", validBureaus },
          { status: 400 },
        );
      }
    }

    // 3. Update dispute in database
    const updates: DisputeUpdatePayload = {};
    if (itemType !== undefined) updates.itemType = itemType;
    if (itemDescription !== undefined)
      updates.itemDescription = itemDescription;
    if (creditorName !== undefined) updates.creditorName = creditorName;
    if (accountNumber !== undefined) updates.accountNumber = accountNumber;
    if (balance !== undefined) updates.balance = balance;
    if (inaccuracyType !== undefined) updates.inaccuracyType = inaccuracyType;
    if (strategy !== undefined) updates.strategy = strategy;
    if (letterContent !== undefined) updates.letterContent = letterContent;
    if (status !== undefined) updates.status = status;
    if (bureau !== undefined) updates.bureau = bureau;
    if (sentAt !== undefined) updates.sentAt = new Date(sentAt);
    if (responseReceivedAt !== undefined)
      updates.responseReceivedAt = new Date(responseReceivedAt);
    if (outcome !== undefined) updates.outcome = outcome;
    if (notes !== undefined) updates.notes = notes;

    // Parse expectedUpdatedAt for optimistic locking
    const expectedDate = expectedUpdatedAt
      ? new Date(expectedUpdatedAt)
      : undefined;

    const dispute = await db.disputes.updateDispute(
      disputeId,
      user.id,
      updates,
      expectedDate,
    );

    // 4. Audit log
    await auditLogger.logAIInteraction({
      userId: user.id,
      action: "update_dispute",
      input: { disputeId, updates: Object.keys(updates) },
      output: { success: true },
      success: true,
    });

    // 5. Return response
    return NextResponse.json({
      success: true,
      data: dispute,
    });
  } catch (_error) {
    // CreditRepairDisputeRoute error: Failed to update dispute

    // Check for optimistic locking error
    if ((_error as Error).message.includes("modified by another process")) {
      return NextResponse.json(
        {
          error:
            "Dispute has been modified by another process. Please refresh and try again.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "Failed to update dispute" },
      { status: 500 },
    );
  }
});

/**
 * DELETE /api/credit-repair/disputes/[id]
 * Delete dispute
 */
export const DELETE = withAuth(
  async (request: NextRequest, user: AuthedUser) => {
  try {
    const disputeId = request.nextUrl.pathname.split("/").pop() as string;

    // 2. Delete dispute from database
    const deleted = await db.disputes.deleteDispute(disputeId, user.id);

    if (!deleted) {
      return NextResponse.json({ error: "Dispute not found" }, { status: 404 });
    }

    // 3. Audit log
    await auditLogger.logAIInteraction({
      userId: user.id,
      action: "delete_dispute",
      input: { disputeId },
      output: { deleted: true },
      success: true,
    });

    // 4. Return response
    return NextResponse.json({
      success: true,
      message: "Dispute deleted successfully",
    });
  } catch (_error) {
    // CreditRepairDisputeRoute error: Failed to delete dispute
    void _error;
    return NextResponse.json(
      { error: "Failed to delete dispute" },
      { status: 500 },
    );
  }
});
