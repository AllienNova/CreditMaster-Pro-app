import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { disputeServiceDB } from "@/lib/disputes/dispute-service-db";

export const GET = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const { searchParams } = new URL(request.url);

    const statusParam = searchParams.get("status");
    const bureau = searchParams.get("bureau");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    // Disputes are always scoped to the authenticated user's id from the
    // guard — never a client-supplied `userId` query param.
    const disputes = await disputeServiceDB.getUserDisputes(
      user.id,
      statusParam as Parameters<typeof disputeServiceDB.getUserDisputes>[1],
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
    } = body;
    void accountNumber;

    // Support both old and new field names
    const finalItemType = itemType || "general";
    const finalDescription = itemDescription || creditorName || "";
    const finalReason = reason || disputeReason || "";

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
    const dispute = await disputeServiceDB.createDispute(
      user.id,
      bureau,
      finalItemType,
      finalDescription,
      finalReason,
      letterContent || "",
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
      const { disputeId, action, status, outcome, note, evidenceUrl } = body;

      if (!disputeId || !action) {
        return NextResponse.json(
          { error: "Missing required fields" },
          { status: 400 },
        );
      }

      let dispute;

      switch (action) {
        case "send":
          dispute = await disputeServiceDB.sendDispute(disputeId, user.id);
          break;
        case "update_status":
          if (!status) {
            return NextResponse.json(
              { error: "Missing status" },
              { status: 400 },
            );
          }
          dispute = await disputeServiceDB.updateDisputeStatus(
            disputeId,
            user.id,
            status,
          );
          break;
        case "resolve":
          if (!outcome) {
            return NextResponse.json(
              { error: "Missing outcome" },
              { status: 400 },
            );
          }
          dispute = await disputeServiceDB.resolveDispute(
            disputeId,
            user.id,
            outcome,
          );
          break;
        case "add_note":
          if (!note) {
            return NextResponse.json(
              { error: "Missing note" },
              { status: 400 },
            );
          }
          dispute = await disputeServiceDB.addNote(disputeId, user.id, note);
          break;
        case "add_evidence":
          if (!evidenceUrl) {
            return NextResponse.json(
              { error: "Missing evidenceUrl" },
              { status: 400 },
            );
          }
          dispute = await disputeServiceDB.addEvidence(
            disputeId,
            user.id,
            evidenceUrl,
          );
          break;
        default:
          return NextResponse.json(
            { error: "Invalid action" },
            { status: 400 },
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

      const success = await disputeServiceDB.deleteDispute(disputeId, user.id);
      if (!success) {
        return NextResponse.json(
          { error: "Dispute not found" },
          { status: 404 },
        );
      }
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
