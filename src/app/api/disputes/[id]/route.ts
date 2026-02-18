/**
 * Dispute by ID API
 * GET /api/disputes/[id] - Get single dispute
 * PATCH /api/disputes/[id] - Update dispute
 * DELETE /api/disputes/[id] - Delete dispute
 */

import { NextRequest, NextResponse } from "next/server";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { disputeService } from "@/lib/disputes/dispute-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const validation = await jwtValidation.validateFromHeaders(request);
    if (!validation.valid || !validation.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id } = await params;
    const dispute = disputeService.getDispute(id);

    if (!dispute) {
      return NextResponse.json(
        { success: false, error: "Dispute not found" },
        { status: 404 },
      );
    }

    if (dispute.userId !== validation.user.id) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    return NextResponse.json({ success: true, data: dispute });
  } catch (_error) {
    // DisputeByIdRoute error: Failed to get dispute
    void _error;
    return NextResponse.json(
      { success: false, error: "Failed to get dispute" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const validation = await jwtValidation.validateFromHeaders(request);
    if (!validation.valid || !validation.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id } = await params;
    const body = await request.json();

    const existingDispute = disputeService.getDispute(id);
    if (!existingDispute) {
      return NextResponse.json(
        { success: false, error: "Dispute not found" },
        { status: 404 },
      );
    }

    if (existingDispute.userId !== validation.user.id) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    const { status, letterContent, outcome, responseDetails } = body;

    let dispute;
    if (status) {
      dispute = disputeService.updateDisputeStatus(id, status, responseDetails);
    } else if (outcome) {
      dispute = disputeService.resolveDispute(id, outcome, responseDetails);
    } else {
      // Generic update - for now just return existing
      dispute = existingDispute;
    }

    return NextResponse.json({ success: true, data: dispute });
  } catch (_error) {
    // DisputeByIdRoute error: Failed to update dispute
    void _error;
    return NextResponse.json(
      { success: false, error: "Failed to update dispute" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const validation = await jwtValidation.validateFromHeaders(request);
    if (!validation.valid || !validation.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id } = await params;
    const existingDispute = disputeService.getDispute(id);

    if (!existingDispute) {
      return NextResponse.json(
        { success: false, error: "Dispute not found" },
        { status: 404 },
      );
    }

    if (existingDispute.userId !== validation.user.id) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    const success = disputeService.deleteDispute(id);
    return NextResponse.json({ success: true, data: { deleted: success } });
  } catch (_error) {
    // DisputeByIdRoute error: Failed to delete dispute
    void _error;
    return NextResponse.json(
      { success: false, error: "Failed to delete dispute" },
      { status: 500 },
    );
  }
}
