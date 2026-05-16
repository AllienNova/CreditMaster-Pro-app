/**
 * Individual Credit Card API Route
 *
 * GET /api/credit-repair/cards/[id] - Get single credit card
 * PUT /api/credit-repair/cards/[id] - Update credit card
 * DELETE /api/credit-repair/cards/[id] - Delete credit card
 *
 * Features:
 * - Full CRUD operations
 * - Database integration
 * - Authentication required
 * - Input validation
 * - Auto-calculated utilization
 * - Error handling
 * - Audit logging
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";
import { db } from "@/lib/credit-repair/db";
import { auditLogger } from "@/lib/security/audit-logging";

interface CardUpdatePayload {
  cardName?: string;
  lastFourDigits?: string;
  creditLimit?: number;
  currentBalance?: number;
  statementClosingDay?: number;
  paymentDueDay?: number;
}

/**
 * GET /api/credit-repair/cards/[id]
 * Get single credit card by ID
 */
export const GET = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const cardId = request.nextUrl.pathname.split("/").pop() as string;

    // 2. Get credit card from database
    const card = await db.creditCards.getCreditCard(cardId, user.id);

    if (!card) {
      return NextResponse.json(
        { error: "Credit card not found" },
        { status: 404 },
      );
    }

    // 3. Audit log
    await auditLogger.logAIInteraction({
      userId: user.id,
      action: "get_credit_card",
      input: { cardId },
      output: { found: true },
      success: true,
    });

    // 4. Return response
    return NextResponse.json({
      success: true,
      data: card,
    });
  } catch (_error) {
    // CreditCardsRoute error: Failed to get credit card
    void _error;
    return NextResponse.json(
      { error: "Failed to get credit card" },
      { status: 500 },
    );
  }
});

/**
 * PUT /api/credit-repair/cards/[id]
 * Update credit card (utilization is auto-calculated)
 */
export const PUT = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const cardId = request.nextUrl.pathname.split("/").pop() as string;

    // 2. Parse and validate input
    const body = await request.json();
    const {
      cardName,
      lastFourDigits,
      creditLimit,
      currentBalance,
      statementClosingDay,
      paymentDueDay,
    } = body;

    // Validate credit limit if provided
    if (creditLimit !== undefined && creditLimit <= 0) {
      return NextResponse.json(
        { error: "Credit limit must be greater than 0" },
        { status: 400 },
      );
    }

    // Validate current balance if provided
    if (currentBalance !== undefined && currentBalance < 0) {
      return NextResponse.json(
        { error: "Current balance cannot be negative" },
        { status: 400 },
      );
    }

    // Validate statement closing day if provided
    if (
      statementClosingDay !== undefined &&
      (statementClosingDay < 1 || statementClosingDay > 31)
    ) {
      return NextResponse.json(
        { error: "Statement closing day must be between 1 and 31" },
        { status: 400 },
      );
    }

    // Validate payment due day if provided
    if (
      paymentDueDay !== undefined &&
      (paymentDueDay < 1 || paymentDueDay > 31)
    ) {
      return NextResponse.json(
        { error: "Payment due day must be between 1 and 31" },
        { status: 400 },
      );
    }

    // 3. Update credit card in database (utilization is auto-calculated)
    const updates: CardUpdatePayload = {};
    if (cardName !== undefined) updates.cardName = cardName;
    if (lastFourDigits !== undefined) updates.lastFourDigits = lastFourDigits;
    if (creditLimit !== undefined) updates.creditLimit = creditLimit;
    if (currentBalance !== undefined) updates.currentBalance = currentBalance;
    if (statementClosingDay !== undefined)
      updates.statementClosingDay = statementClosingDay;
    if (paymentDueDay !== undefined) updates.paymentDueDay = paymentDueDay;

    const card = await db.creditCards.updateCreditCard(
      cardId,
      user.id,
      updates,
    );

    // 4. Audit log
    await auditLogger.logAIInteraction({
      userId: user.id,
      action: "update_credit_card",
      input: { cardId, updates: Object.keys(updates) },
      output: { success: true, utilization: card.utilization },
      success: true,
    });

    // 5. Return response
    return NextResponse.json({
      success: true,
      data: card,
    });
  } catch (_error) {
    // CreditCardsRoute error: Failed to update credit card
    void _error;
    return NextResponse.json(
      { error: "Failed to update credit card" },
      { status: 500 },
    );
  }
});

/**
 * DELETE /api/credit-repair/cards/[id]
 * Delete credit card
 */
export const DELETE = withAuth(
  async (request: NextRequest, user: AuthedUser) => {
  try {
    const cardId = request.nextUrl.pathname.split("/").pop() as string;

    // 2. Delete credit card from database
    const deleted = await db.creditCards.deleteCreditCard(cardId, user.id);

    if (!deleted) {
      return NextResponse.json(
        { error: "Credit card not found" },
        { status: 404 },
      );
    }

    // 3. Audit log
    await auditLogger.logAIInteraction({
      userId: user.id,
      action: "delete_credit_card",
      input: { cardId },
      output: { deleted: true },
      success: true,
    });

    // 4. Return response
    return NextResponse.json({
      success: true,
      message: "Credit card deleted successfully",
    });
  } catch (_error) {
    // CreditCardsRoute error: Failed to delete credit card
    void _error;
    return NextResponse.json(
      { error: "Failed to delete credit card" },
      { status: 500 },
    );
  }
});
