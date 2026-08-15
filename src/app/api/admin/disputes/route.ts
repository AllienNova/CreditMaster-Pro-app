/**
 * Admin Disputes API
 *
 * Manages dispute data for admin dashboard.
 * SECURITY: Requires admin authentication
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { withRole } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";

export const GET = withRole(
  "admin",
  async (_request: NextRequest, _user: AuthedUser) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 503 },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
    // Fetch disputes
    const { data: disputes, error } = await supabase
      // idor-audit: cross-user — platform-wide admin report; spans users by definition and the route is gated by withRole("admin")
      .from("disputes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      // AdminDisputesRoute error: Failed to fetch disputes
      return NextResponse.json(
        { error: "Failed to fetch disputes" },
        { status: 500 },
      );
    }

    // Get auth users to merge email data
    const { data: authUsers } = await supabase.auth.admin.listUsers();

    // Enrich with email data
    const enrichedDisputes = disputes?.map((dispute) => {
      const authUser = authUsers?.users?.find((u) => u.id === dispute.user_id);
      return {
        ...dispute,
        user_email: authUser?.email || "Unknown",
      };
    });

    return NextResponse.json({
      disputes: enrichedDisputes || [],
      total: disputes?.length || 0,
    });
    } catch (_error) {
      // AdminDisputesRoute error: Admin disputes operation failed
      void _error;
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  },
);

// Mirrors the disputes-table CHECK constraint in
// 20250204000000_credit_repair_schema.sql (the authoritative migration).
const DISPUTE_STATUS_VALUES = [
  "draft",
  "sent",
  "under_review",
  "resolved",
  "rejected",
  "escalated",
] as const;
type DisputeStatus = (typeof DISPUTE_STATUS_VALUES)[number];

const DISPUTE_OUTCOME_VALUES = [
  "removed",
  "updated",
  "verified",
  "pending",
] as const;
type DisputeOutcome = (typeof DISPUTE_OUTCOME_VALUES)[number];

// A TIMESTAMPTZ column rejects a non-date string at the DB layer (500);
// validate at the boundary so a bad value is a clean 400.
function isIsoDateString(v: unknown): boolean {
  return typeof v === "string" && !Number.isNaN(Date.parse(v));
}

interface AdminDisputePatchPayload {
  status?: DisputeStatus;
  outcome?: DisputeOutcome | null;
  notes?: string | null;
  resolved_at?: string | null;
  sent_at?: string | null;
}

function buildWhitelistedPayload(
  updates: Record<string, unknown>,
): AdminDisputePatchPayload | null {
  const payload: AdminDisputePatchPayload = {};

  if ("status" in updates) {
    if (!DISPUTE_STATUS_VALUES.includes(updates.status as DisputeStatus)) {
      return null;
    }
    payload.status = updates.status as DisputeStatus;
  }

  if ("outcome" in updates) {
    const outcome = updates.outcome;
    if (
      outcome !== null &&
      !DISPUTE_OUTCOME_VALUES.includes(outcome as DisputeOutcome)
    ) {
      return null;
    }
    payload.outcome = outcome as DisputeOutcome | null;
  }

  if ("notes" in updates) {
    payload.notes =
      updates.notes === null ? null : String(updates.notes);
  }

  if ("resolved_at" in updates) {
    if (updates.resolved_at !== null && !isIsoDateString(updates.resolved_at)) {
      return null;
    }
    payload.resolved_at =
      updates.resolved_at === null ? null : String(updates.resolved_at);
  }

  if ("sent_at" in updates) {
    if (updates.sent_at !== null && !isIsoDateString(updates.sent_at)) {
      return null;
    }
    payload.sent_at =
      updates.sent_at === null ? null : String(updates.sent_at);
  }

  return payload;
}

export const PATCH = withRole(
  "admin",
  async (request: NextRequest, _user: AuthedUser) => {
    try {
      const { disputeId, updates } = await request.json();

    if (!disputeId || !updates) {
      return NextResponse.json(
        { error: "Missing disputeId or updates" },
        { status: 400 },
      );
    }

    const safePayload = buildWhitelistedPayload(
      updates as Record<string, unknown>,
    );

    if (safePayload === null) {
      return NextResponse.json(
        { error: "Invalid field value in updates" },
        { status: 400 },
      );
    }

    if (Object.keys(safePayload).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 },
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 503 },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error } = await supabase
      // idor-audit: cross-user — platform-wide admin report; spans users by definition and the route is gated by withRole("admin")
      .from("disputes")
      .update(safePayload)
      .eq("id", disputeId);

    if (error) {
      return NextResponse.json(
        { error: "Failed to update dispute" },
        { status: 500 },
      );
    }

      return NextResponse.json({ success: true });
    } catch (_error) {
      // AdminDisputesRoute error: Dispute update failed
      void _error;
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  },
);
