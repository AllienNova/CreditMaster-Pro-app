/**
 * Individual Bill Negotiation API
 *
 * GET /api/financial/bills/negotiate/[id] - Get a specific negotiation
 * PATCH /api/financial/bills/negotiate/[id] - Update a negotiation
 * POST /api/financial/bills/negotiate/[id]/attempt - Add an attempt
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";
import { billNegotiationService } from "@/lib/financial/bill-negotiation-service";
import type {
  NegotiationUpdateInput,
  NegotiationAttemptInput,
} from "@/lib/financial/types/bill-negotiation.types";

export const GET = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const id = request.nextUrl.pathname.split("/").pop() as string;
    const userId = user.id;

    const negotiation = await billNegotiationService.getNegotiation(id, userId);
    if (!negotiation) {
      return NextResponse.json(
        { error: "Negotiation not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ negotiation });
  } catch (_error) {
    // BillNegotiateRoute error: Failed to get negotiation
    void _error;
    return NextResponse.json(
      { error: "Failed to get negotiation" },
      { status: 500 },
    );
  }
});

export const PATCH = withAuth(
  async (request: NextRequest, user: AuthedUser) => {
  try {
    const id = request.nextUrl.pathname.split("/").pop() as string;
    const userId = user.id;
    const body = await request.json();

    const input: NegotiationUpdateInput = {};
    if (body.status) input.status = body.status;
    if (body.outcome) input.outcome = body.outcome;
    if (body.actualSavings !== undefined)
      input.actualSavings = body.actualSavings;
    if (body.notes) input.notes = body.notes;
    if (body.targetAmount) input.targetAmount = body.targetAmount;

    const negotiation = await billNegotiationService.updateNegotiation(
      id,
      userId,
      input,
    );

    return NextResponse.json({ negotiation });
  } catch (_error) {
    // BillNegotiateRoute error: Failed to update negotiation
    void _error;
    return NextResponse.json(
      { error: "Failed to update negotiation" },
      { status: 500 },
    );
  }
});

export const POST = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const id = request.nextUrl.pathname.split("/").pop() as string;
    const userId = user.id;
    const body = await request.json();

    // Validate required fields for attempt
    if (!body.method || !body.outcome) {
      return NextResponse.json(
        { error: "Missing required fields: method, outcome" },
        { status: 400 },
      );
    }

    const attemptInput: NegotiationAttemptInput = {
      method: body.method,
      contactName: body.contactName,
      outcome: body.outcome,
      offeredAmount: body.offeredAmount,
      notes: body.notes,
      followUpDate: body.followUpDate ? new Date(body.followUpDate) : undefined,
    };

    const negotiation = await billNegotiationService.addAttempt(
      id,
      userId,
      attemptInput,
    );

    return NextResponse.json({ negotiation });
  } catch (_error) {
    // BillNegotiateRoute error: Failed to add attempt
    void _error;
    return NextResponse.json(
      { error: "Failed to add attempt" },
      { status: 500 },
    );
  }
});
