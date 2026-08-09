/**
 * Credit Inquiries API Route
 *
 * GET /api/credit-repair/inquiries - Get the authenticated user's credit-report
 * hard/soft inquiries (real `credit_inquiries` rows, RLS-protected).
 *
 * Features:
 * - Authentication required (IDOR-safe: user id comes from the guard, never
 *   from query/body)
 * - Optional filtering by inquiry type (hard | soft)
 * - Bureau resolved from the parent credit report (embedded FK), not fabricated
 * - Honest empty result when the user has no inquiries (no mock fallback)
 * - Error handling
 * - Audit logging
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";
import { db } from "@/lib/credit-repair/db";
import type { InquiryType } from "@/lib/credit-repair/db";
import { auditLogger } from "@/lib/security/audit-logging";

/**
 * GET /api/credit-repair/inquiries
 * Get all credit inquiries for the authenticated user.
 *
 * The user id is taken from the authenticated session (`user.id`), never from
 * the request — accepting a client-supplied id here would be an IDOR.
 */
export const GET = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);

    const typeParam = searchParams.get("type");
    let type: InquiryType | undefined;
    if (typeParam) {
      if (typeParam !== "hard" && typeParam !== "soft") {
        return NextResponse.json(
          { error: "Invalid inquiry type", validTypes: ["hard", "soft"] },
          { status: 400 },
        );
      }
      type = typeParam;
    }

    const limit = Number.parseInt(searchParams.get("limit") || "50");
    const offset = Number.parseInt(searchParams.get("offset") || "0");

    // Get inquiries + stats (user-scoped by user.id — RLS enforces too)
    const inquiries = await db.inquiries.getInquiriesByUser(user.id, {
      type,
      limit,
      offset,
    });

    const stats = await db.inquiries.getInquiryStats(user.id);

    // `total` reflects the active type filter (derived from stats, no extra
    // query) so pagination stays honest when filtering hard vs soft.
    const total =
      type === "hard"
        ? stats.hard
        : type === "soft"
          ? stats.soft
          : stats.total;

    // Audit log
    await auditLogger.logAIInteraction({
      userId: user.id,
      action: "get_credit_inquiries",
      input: { type, limit, offset },
      output: { count: inquiries.length },
      success: true,
    });

    // Return response — honest empty array when the user has no inquiries
    return NextResponse.json({
      success: true,
      data: {
        inquiries,
        stats,
        pagination: {
          limit,
          offset,
          total,
        },
      },
    });
  } catch (error) {
    // InquiriesAPI error: Error getting credit inquiries

    // Audit log error
    try {
      await auditLogger.logSecurityEvent({
        type: "api_error",
        message: `Failed to get credit inquiries: ${(error as Error).message}`,
        severity: "medium",
      });
    } catch {
      // InquiriesAPI error: Failed to log audit event
    }

    return NextResponse.json(
      { error: "Failed to get credit inquiries" },
      { status: 500 },
    );
  }
});
