/**
 * Bill Negotiation API
 *
 * GET /api/financial/bills/negotiate - Get negotiation summary and opportunities
 * POST /api/financial/bills/negotiate - Create a new negotiation
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";
import { billNegotiationService } from "@/lib/financial/bill-negotiation-service";
import { billDetectionService } from "@/lib/financial/bill-detection-service";
import type { NegotiationCreateInput } from "@/lib/financial/types/bill-negotiation.types";

export const GET = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const userId = user.id;
    const { searchParams } = new URL(request.url);
    const view = searchParams.get("view") || "summary";

    if (view === "opportunities") {
      const opportunities =
        await billNegotiationService.identifyOpportunities(userId);
      return NextResponse.json({ opportunities });
    }

    if (view === "insights") {
      const insights = await billNegotiationService.getInsights(userId);
      return NextResponse.json({ insights });
    }

    if (view === "active") {
      const negotiations = await billNegotiationService.getUserNegotiations(
        userId,
        "in_progress",
      );
      return NextResponse.json({ negotiations });
    }

    // Default: summary view
    const summary = await billNegotiationService.getNegotiationSummary(userId);
    const insights = await billNegotiationService.getInsights(userId);

    return NextResponse.json({
      summary,
      insights,
    });
  } catch (error) {
    console.error("Bill negotiation GET error:", error);
    return NextResponse.json(
      { error: "Failed to get negotiation data" },
      { status: 500 },
    );
  }
});

export const POST = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const userId = user.id;
    const body = await request.json();

    // Validate required fields
    if (!body.billId || !body.negotiationType) {
      return NextResponse.json(
        { error: "Missing required fields: billId, negotiationType" },
        { status: 400 },
      );
    }

    // Get the bill
    const bill = await billDetectionService.getBillById(body.billId, userId);
    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    const input: NegotiationCreateInput = {
      billId: body.billId,
      negotiationType: body.negotiationType,
      targetAmount: body.targetAmount,
      notes: body.notes,
      generateScripts: body.generateScripts !== false,
    };

    const negotiation = await billNegotiationService.createNegotiation(
      userId,
      input,
      bill,
    );

    return NextResponse.json({ negotiation }, { status: 201 });
  } catch (error) {
    console.error("Bill negotiation POST error:", error);
    return NextResponse.json(
      { error: "Failed to create negotiation" },
      { status: 500 },
    );
  }
});
