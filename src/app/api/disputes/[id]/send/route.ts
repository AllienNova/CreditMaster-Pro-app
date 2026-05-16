/**
 * Send Dispute API
 * PATCH /api/disputes/[id]/send - Mark dispute as sent
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { disputeService } from "@/lib/disputes/dispute-service";

export const PATCH = withAuth(
  async (request: NextRequest, user: AuthedUser) => {
    try {
      // The guard does not forward Next's route `params`; the path ends in
      // /disputes/[id]/send, so the id is the second-to-last segment.
      const segments = request.nextUrl.pathname.split("/");
      const id = segments[segments.length - 2];

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

      const dispute = disputeService.sendDispute(id);

      if (!dispute) {
        return NextResponse.json(
          { success: false, error: "Failed to send dispute" },
          { status: 500 },
        );
      }

      return NextResponse.json({ success: true, data: dispute });
    } catch (error) {
      console.error("Send dispute error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to send dispute" },
        { status: 500 },
      );
    }
  },
);
