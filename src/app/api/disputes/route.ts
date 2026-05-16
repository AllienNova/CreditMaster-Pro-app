import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { disputeService } from "@/lib/disputes/dispute-service";

export const GET = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const { searchParams } = new URL(request.url);

    const statusParam = searchParams.get("status");
    const bureau = searchParams.get("bureau");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    // Disputes are always scoped to the authenticated user's id from the
    // guard — never a client-supplied `userId` query param.
    const disputes = disputeService.getUserDisputes(
      user.id,
      statusParam as Parameters<typeof disputeService.getUserDisputes>[1],
    );

    // Filter by bureau if specified
    const filteredDisputes = bureau
      ? disputes.filter((d) => d.bureau === bureau)
      : disputes;

    // Paginate
    const startIdx = (page - 1) * limit;
    const paginatedDisputes = filteredDisputes.slice(
      startIdx,
      startIdx + limit,
    );

    return NextResponse.json({
      success: true,
      data: {
        items: paginatedDisputes,
        total: filteredDisputes.length,
        page,
        limit,
        totalPages: Math.ceil(filteredDisputes.length / limit),
      },
    });
  } catch (error) {
    // Error handled - returning 500
    void error;
    return NextResponse.json(
      { success: false, error: "Failed to get disputes" },
      { status: 500 },
    );
  }
});

export const POST = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const body = await request.json();

    const {
      bureau,
      itemType,
      itemDescription,
      creditorName,
      accountNumber,
      disputeReason,
      reason,
      letterContent,
      documents,
      evidence,
    } = body;
    void accountNumber;

    // Support both old and new field names
    const finalItemType = itemType || "general";
    const finalDescription = itemDescription || creditorName || "";
    const finalReason = reason || disputeReason || "";
    const finalEvidence = evidence || documents || [];

    if (!bureau || !finalDescription || !finalReason) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing required fields: bureau, description, and reason are required",
        },
        { status: 400 },
      );
    }

    // The dispute is always created for the authenticated user — a
    // client-supplied `userId` in the body is never trusted.
    const dispute = disputeService.createDispute(
      user.id,
      bureau,
      finalItemType,
      finalDescription,
      finalReason,
      letterContent || "",
      finalEvidence,
    );

    return NextResponse.json({ success: true, data: dispute });
  } catch (error) {
    // Error handled - returning 500
    void error;
    return NextResponse.json(
      { success: false, error: "Failed to create dispute" },
      { status: 500 },
    );
  }
});

export const PATCH = withAuth(
  async (request: NextRequest, user: AuthedUser) => {
    try {
      const body = await request.json();
      const {
        disputeId,
        action,
        status,
        outcome,
        note,
        evidenceUrl,
        description,
      } = body;

      if (!disputeId || !action) {
        return NextResponse.json(
          { error: "Missing required fields" },
          { status: 400 },
        );
      }

      // Ownership check: the dispute must belong to the authenticated user.
      const existing = disputeService.getDispute(disputeId);
      if (!existing) {
        return NextResponse.json(
          { error: "Dispute not found" },
          { status: 404 },
        );
      }
      if (existing.userId !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      let dispute;

      switch (action) {
        case "send":
          dispute = disputeService.sendDispute(disputeId);
          break;
        case "update_status":
          if (!status) {
            return NextResponse.json(
              { error: "Missing status" },
              { status: 400 },
            );
          }
          dispute = disputeService.updateDisputeStatus(
            disputeId,
            status,
            description,
          );
          break;
        case "resolve":
          if (!outcome) {
            return NextResponse.json(
              { error: "Missing outcome" },
              { status: 400 },
            );
          }
          dispute = disputeService.resolveDispute(disputeId, outcome, note);
          break;
        case "add_note":
          if (!note) {
            return NextResponse.json(
              { error: "Missing note" },
              { status: 400 },
            );
          }
          dispute = disputeService.addNote(disputeId, note);
          break;
        case "add_evidence":
          if (!evidenceUrl) {
            return NextResponse.json(
              { error: "Missing evidenceUrl" },
              { status: 400 },
            );
          }
          dispute = disputeService.addEvidence(disputeId, evidenceUrl);
          break;
        default:
          return NextResponse.json(
            { error: "Invalid action" },
            { status: 400 },
          );
      }

      if (!dispute) {
        return NextResponse.json(
          { error: "Dispute not found" },
          { status: 404 },
        );
      }

      return NextResponse.json({ dispute });
    } catch (error) {
      // Error handled - returning 500
      void error;
      return NextResponse.json(
        { error: "Failed to update dispute" },
        { status: 500 },
      );
    }
  },
);

export const DELETE = withAuth(
  async (request: NextRequest, user: AuthedUser) => {
    try {
      const { searchParams } = new URL(request.url);
      const disputeId = searchParams.get("disputeId");

      if (!disputeId) {
        return NextResponse.json(
          { error: "Missing disputeId parameter" },
          { status: 400 },
        );
      }

      // Ownership check: the dispute must belong to the authenticated user.
      const existing = disputeService.getDispute(disputeId);
      if (!existing) {
        return NextResponse.json(
          { error: "Dispute not found" },
          { status: 404 },
        );
      }
      if (existing.userId !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const success = disputeService.deleteDispute(disputeId);
      return NextResponse.json({ success });
    } catch (error) {
      // Error handled - returning 500
      void error;
      return NextResponse.json(
        { error: "Failed to delete dispute" },
        { status: 500 },
      );
    }
  },
);
