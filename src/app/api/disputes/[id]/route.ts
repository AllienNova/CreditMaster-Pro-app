/**
 * Dispute by ID API
 * GET /api/disputes/[id] - Get single dispute
 * PATCH /api/disputes/[id] - Update dispute
 * DELETE /api/disputes/[id] - Delete dispute
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { disputeServiceDB } from "@/lib/disputes/dispute-service-db";

// The guard does not forward Next's route `params`; extract the id from the path.
function disputeIdFrom(request: NextRequest): string {
  return request.nextUrl.pathname.split("/").pop() as string;
}

export const GET = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const id = disputeIdFrom(request);
    // getDispute is user-scoped — returns null if the dispute belongs to
    // another user (no IDOR leakage of dispute existence).
    const dispute = await disputeServiceDB.getDispute(id, user.id);

    if (!dispute) {
      return NextResponse.json(
        { success: false, error: "Dispute not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: dispute });
  } catch (_error) {
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

      const { status, outcome, responseDetails } = body;

      let dispute;
      if (status) {
        dispute = await disputeServiceDB.updateDisputeStatus(
          id,
          user.id,
          status,
        );
      } else if (outcome) {
        dispute = await disputeServiceDB.resolveDispute(
          id,
          user.id,
          outcome,
        );
      } else {
        // No recognised mutation field — return the dispute as-is.
        dispute = await disputeServiceDB.getDispute(id, user.id);
        void responseDetails;
        if (!dispute) {
          return NextResponse.json(
            { success: false, error: "Dispute not found" },
            { status: 404 },
          );
        }
      }

      return NextResponse.json({ success: true, data: dispute });
    } catch (_error) {
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
      // deleteDispute is user-scoped — returns false if not owned.
      const deleted = await disputeServiceDB.deleteDispute(id, user.id);

      if (!deleted) {
        return NextResponse.json(
          { success: false, error: "Dispute not found" },
          { status: 404 },
        );
      }

      return NextResponse.json({ success: true, data: { deleted } });
    } catch (_error) {
      void _error;
      return NextResponse.json(
        { success: false, error: "Failed to delete dispute" },
        { status: 500 },
      );
    }
  },
);
