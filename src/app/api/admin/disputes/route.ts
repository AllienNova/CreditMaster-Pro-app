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
    try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      // Return mock data if not configured
      return NextResponse.json({
        disputes: [
          {
            id: "1",
            user_id: "1",
            user_email: "john@example.com",
            bureau: "experian",
            status: "resolved",
            item_type: "Late Payment",
            item_description:
              "Capital One credit card late payment from March 2023",
            outcome: "removed",
            created_at: "2024-10-15T10:00:00Z",
            resolved_at: "2024-11-01T14:30:00Z",
          },
          {
            id: "2",
            user_id: "2",
            user_email: "jane@example.com",
            bureau: "equifax",
            status: "under_review",
            item_type: "Collection Account",
            item_description: "Medical collection from ABC Collections",
            outcome: null,
            created_at: "2024-11-01T09:15:00Z",
            resolved_at: null,
          },
          {
            id: "3",
            user_id: "3",
            user_email: "bob@example.com",
            bureau: "transunion",
            status: "sent",
            item_type: "Inquiry",
            item_description: "Unauthorized hard inquiry from XYZ Lender",
            outcome: null,
            created_at: "2024-11-10T16:45:00Z",
            resolved_at: null,
          },
          {
            id: "4",
            user_id: "1",
            user_email: "john@example.com",
            bureau: "equifax",
            status: "draft",
            item_type: "Account Balance",
            item_description: "Incorrect balance reported on Chase credit card",
            outcome: null,
            created_at: "2024-11-15T11:20:00Z",
            resolved_at: null,
          },
          {
            id: "5",
            user_id: "4",
            user_email: "alice@example.com",
            bureau: "experian",
            status: "rejected",
            item_type: "Late Payment",
            item_description: "Disputed late payment verified by creditor",
            outcome: "verified",
            created_at: "2024-09-20T08:00:00Z",
            resolved_at: "2024-10-25T15:00:00Z",
          },
          {
            id: "6",
            user_id: "2",
            user_email: "jane@example.com",
            bureau: "transunion",
            status: "resolved",
            item_type: "Identity Error",
            item_description: "Wrong address listed on credit report",
            outcome: "updated",
            created_at: "2024-10-01T12:00:00Z",
            resolved_at: "2024-10-20T10:00:00Z",
          },
        ],
        total: 6,
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch disputes
    const { data: disputes, error } = await supabase
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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        success: true,
        message: "Mock update successful",
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error } = await supabase
      .from("disputes")
      .update(updates)
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
