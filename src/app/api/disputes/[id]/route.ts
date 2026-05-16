/**
 * Dispute by ID API
 * GET /api/disputes/[id] - Get single dispute
 * PATCH /api/disputes/[id] - Update dispute
 * DELETE /api/disputes/[id] - Delete dispute
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { disputeService } from "@/lib/disputes/dispute-service";

// The guard does not forward Next's route `params`; extract the id from the path.
function disputeIdFrom(request: NextRequest): string {
  return request.nextUrl.pathname.split("/").pop() as string;
}

export const GET = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const id = disputeIdFrom(request);
    const dispute = disputeService.getDispute(id);

    if (!dispute) {
      return NextResponse.json(
        { success: false, error: "Dispute not found" },
        { status: 404 },
      );
    }

    if (dispute.userId !== user.id) {
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
});

export const PATCH = withAuth(
  async (request: NextRequest, user: AuthedUser) => {
    try {
      const id = disputeIdFrom(request);
      const body = await request.json();

      const existingDispute = disputeService.getDispute(id);
      if (!existingDispute) {
        return NextResponse.json(
          { success: false, error: "Dispute not found" },
          { status: 404 },
        );
      }

      if (existingDispute.userId !== user.id) {
        return NextResponse.json(
          { success: false, error: "Forbidden" },
          { status: 403 },
        );
      }

      const { status, letterContent, outcome, responseDetails } = body;
      void letterContent;

      let dispute;
      if (status) {
        dispute = disputeService.updateDisputeStatus(
          id,
          status,
          responseDetails,
        );
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
  },
);

export const DELETE = withAuth(
  async (request: NextRequest, user: AuthedUser) => {
    try {
      const id = disputeIdFrom(request);
      const existingDispute = disputeService.getDispute(id);

      if (!existingDispute) {
        return NextResponse.json(
          { success: false, error: "Dispute not found" },
          { status: 404 },
        );
      }

      if (existingDispute.userId !== user.id) {
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
  },
);
