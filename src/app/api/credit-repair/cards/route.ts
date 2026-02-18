/**
 * Credit Cards API Route
 *
 * GET /api/credit-repair/cards - Get all credit cards
 * POST /api/credit-repair/cards - Add new credit card
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
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { db } from "@/lib/credit-repair/db";
import { auditLogger } from "@/lib/security/audit-logging";

/**
 * GET /api/credit-repair/cards
 * Get all credit cards for authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate
    const validation = await jwtValidation.validateFromHeaders(request);
    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = validation.user;

    // 2. Parse query parameters
    const { searchParams } = new URL(request.url);
    const minUtilization = searchParams.get("minUtilization");
    const maxUtilization = searchParams.get("maxUtilization");
    const limit = Number.parseInt(searchParams.get("limit") || "50");
    const offset = Number.parseInt(searchParams.get("offset") || "0");

    // 3. Get credit cards from database
    const cards = await db.creditCards.getCreditCardsByUser(user.id, {
      minUtilization: minUtilization
        ? Number.parseFloat(minUtilization)
        : undefined,
      maxUtilization: maxUtilization
        ? Number.parseFloat(maxUtilization)
        : undefined,
      limit,
      offset,
    });

    // 4. Calculate total utilization
    const totalUtilization = await db.creditCards.calculateTotalUtilization(
      user.id,
    );

    // 5. Audit log
    await auditLogger.logAIInteraction({
      userId: user.id,
      action: "get_credit_cards",
      input: { minUtilization, maxUtilization, limit, offset },
      output: { count: cards.length, totalUtilization },
      success: true,
    });

    // 6. Return response
    return NextResponse.json({
      success: true,
      data: {
        cards,
        totalUtilization,
        pagination: {
          limit,
          offset,
          total: cards.length,
        },
      },
    });
  } catch (error) {
    // CardsAPI error: Error getting credit cards

    // Audit log error
    try {
      await auditLogger.logSecurityEvent({
        type: "api_error",
        message: `Failed to get credit cards: ${(error as Error).message}`,
        severity: "medium",
      });
    } catch {
      // CardsAPI error: Failed to log audit event
    }

    return NextResponse.json(
      { error: "Failed to get credit cards" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/credit-repair/cards
 * Add new credit card
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const validation = await jwtValidation.validateFromHeaders(request);
    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = validation.user;

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

    // Validate required fields
    if (!cardName || !creditLimit || currentBalance === undefined) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          required: ["cardName", "creditLimit", "currentBalance"],
        },
        { status: 400 },
      );
    }

    // Validate credit limit
    if (creditLimit <= 0) {
      return NextResponse.json(
        { error: "Credit limit must be greater than 0" },
        { status: 400 },
      );
    }

    // Validate current balance
    if (currentBalance < 0) {
      return NextResponse.json(
        { error: "Current balance cannot be negative" },
        { status: 400 },
      );
    }

    // Validate statement closing day
    if (
      statementClosingDay &&
      (statementClosingDay < 1 || statementClosingDay > 31)
    ) {
      return NextResponse.json(
        { error: "Statement closing day must be between 1 and 31" },
        { status: 400 },
      );
    }

    // Validate payment due day
    if (paymentDueDay && (paymentDueDay < 1 || paymentDueDay > 31)) {
      return NextResponse.json(
        { error: "Payment due day must be between 1 and 31" },
        { status: 400 },
      );
    }

    // 3. Save credit card to database (utilization is auto-calculated)
    const card = await db.creditCards.createCreditCard({
      userId: user.id,
      cardName,
      lastFourDigits,
      creditLimit,
      currentBalance,
      statementDate: statementClosingDay ?? 15,
      dueDate: paymentDueDay ?? 25,
    });

    // 4. Audit log
    await auditLogger.logAIInteraction({
      userId: user.id,
      action: "add_credit_card",
      input: { cardName, creditLimit, currentBalance },
      output: { cardId: card.id, utilization: card.utilization },
      success: true,
    });

    // 5. Return response
    return NextResponse.json(
      {
        success: true,
        data: card,
      },
      { status: 201 },
    );
  } catch (error) {
    // CardsAPI error: Error adding credit card

    // Audit log error
    try {
      await auditLogger.logSecurityEvent({
        type: "api_error",
        message: `Failed to add credit card: ${(error as Error).message}`,
        severity: "high",
      });
    } catch {
      // CardsAPI error: Failed to log audit event
    }

    return NextResponse.json(
      { error: "Failed to add credit card" },
      { status: 500 },
    );
  }
}
