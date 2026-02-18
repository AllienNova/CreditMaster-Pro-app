/**
 * Individual Negotiation API Route
 *
 * GET /api/credit-repair/negotiate/[id] - Get single negotiation
 * PUT /api/credit-repair/negotiate/[id] - Update negotiation
 * DELETE /api/credit-repair/negotiate/[id] - Delete negotiation
 *
 * Features:
 * - Full CRUD operations
 * - Database integration
 * - Authentication required
 * - Input validation
 * - Error handling
 * - Audit logging
 */

import { NextRequest, NextResponse } from "next/server";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { db } from "@/lib/credit-repair/db";
import { auditLogger } from "@/lib/security/audit-logging";
import type { UpdateNegotiationInput } from "@/lib/credit-repair/db/negotiations-db-service";

/**
 * GET /api/credit-repair/negotiate/[id]
 * Get single negotiation by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // 1. Authenticate
    const validation = await jwtValidation.validateFromHeaders(request);
    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = validation.user;
    const { id: negotiationId } = await params;

    // 2. Get negotiation from database
    const negotiation = await db.negotiations.getNegotiation(
      negotiationId,
      user.id,
    );

    if (!negotiation) {
      return NextResponse.json(
        { error: "Negotiation not found" },
        { status: 404 },
      );
    }

    // 3. Audit log
    await auditLogger.logAIInteraction({
      userId: user.id,
      action: "get_negotiation",
      input: { negotiationId },
      output: { found: true },
      success: true,
    });

    // 4. Return response
    return NextResponse.json({
      success: true,
      data: negotiation,
    });
  } catch (_error) {
    // NegotiateRoute error: Failed to get negotiation
    void _error;
    return NextResponse.json(
      { error: "Failed to get negotiation" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/credit-repair/negotiate/[id]
 * Update negotiation
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // 1. Authenticate
    const validation = await jwtValidation.validateFromHeaders(request);
    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = validation.user;
    const { id: negotiationId } = await params;

    // 2. Parse and validate input
    const body = await request.json();
    const {
      collectionAgency,
      originalCreditor,
      accountNumber,
      originalBalance,
      currentBalance,
      targetSettlement,
      scripts,
      status,
      notes,
    } = body;

    // Validate status if provided
    const statusMap: Record<string, UpdateNegotiationInput["status"]> = {
      pending: "pending",
      draft: "pending",
      sent: "pending",
      negotiating: "negotiating",
      accepted: "agreed",
      agreed: "agreed",
      paid: "paid",
      completed: "completed",
      failed: "failed",
      rejected: "failed",
    };
    let normalizedStatus: UpdateNegotiationInput["status"] | undefined;
    if (status) {
      normalizedStatus = statusMap[status];
      if (!normalizedStatus) {
        return NextResponse.json(
          { error: "Invalid status", validStatuses: Object.keys(statusMap) },
          { status: 400 },
        );
      }
    }

    // 3. Update negotiation in database
    const updates: UpdateNegotiationInput = {};
    if (collectionAgency !== undefined)
      updates.collectionAgency = collectionAgency;
    if (originalCreditor !== undefined)
      updates.originalCreditor = originalCreditor;
    if (accountNumber !== undefined) updates.accountNumber = accountNumber;
    if (originalBalance !== undefined)
      updates.originalBalance = originalBalance;
    if (currentBalance !== undefined) updates.currentBalance = currentBalance;
    if (targetSettlement !== undefined)
      updates.settlementAmount = targetSettlement;
    if (scripts !== undefined)
      updates.scripts = scripts as Record<string, string>;
    if (normalizedStatus !== undefined) updates.status = normalizedStatus;
    if (notes !== undefined) updates.notes = notes;

    const negotiation = await db.negotiations.updateNegotiation(
      negotiationId,
      user.id,
      updates,
    );

    // 4. Audit log
    await auditLogger.logAIInteraction({
      userId: user.id,
      action: "update_negotiation",
      input: { negotiationId, updates: Object.keys(updates) },
      output: { success: true },
      success: true,
    });

    // 5. Return response
    return NextResponse.json({
      success: true,
      data: negotiation,
    });
  } catch (_error) {
    // NegotiateRoute error: Failed to update negotiation
    void _error;
    return NextResponse.json(
      { error: "Failed to update negotiation" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/credit-repair/negotiate/[id]
 * Delete negotiation
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // 1. Authenticate
    const validation = await jwtValidation.validateFromHeaders(request);
    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = validation.user;
    const { id: negotiationId } = await params;

    // 2. Delete negotiation from database
    const deleted = await db.negotiations.deleteNegotiation(
      negotiationId,
      user.id,
    );

    if (!deleted) {
      return NextResponse.json(
        { error: "Negotiation not found" },
        { status: 404 },
      );
    }

    // 3. Audit log
    await auditLogger.logAIInteraction({
      userId: user.id,
      action: "delete_negotiation",
      input: { negotiationId },
      output: { deleted: true },
      success: true,
    });

    // 4. Return response
    return NextResponse.json({
      success: true,
      message: "Negotiation deleted successfully",
    });
  } catch (_error) {
    // NegotiateRoute error: Failed to delete negotiation
    void _error;
    return NextResponse.json(
      { error: "Failed to delete negotiation" },
      { status: 500 },
    );
  }
}
