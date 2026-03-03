/**
 * Trading Strategy [id] API Route
 *
 * GET    — Fetch a single strategy by ID
 * PUT    — Update a user-owned strategy
 * DELETE — Soft-delete a user-owned strategy
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-guard";
import type { JWTUser } from "@/lib/auth/jwt-validation";
import { supabaseAdmin } from "@/lib/supabase/server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- strategy_library not in generated types yet
const strategyLib = (): any => supabaseAdmin.from("strategy_library");

// ============================================================================
// GET — Fetch single strategy
// ============================================================================

export const GET = withAuth(
  async (
    request: NextRequest,
    user: JWTUser,
  ) => {
    try {
      const id = request.nextUrl.pathname.split("/").pop();

      if (!id) {
        return NextResponse.json({ error: "Strategy ID required" }, { status: 400 });
      }

      const { data, error } = await strategyLib()
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        return NextResponse.json({ error: "Strategy not found" }, { status: 404 });
      }

      // Check visibility: user must own it, or it must be system/public-active
      const canAccess =
        data.user_id === user.id ||
        data.is_system ||
        (data.is_public && data.is_active);

      if (!canAccess) {
        return NextResponse.json({ error: "Strategy not found" }, { status: 404 });
      }

      // Increment usage count
      await strategyLib()
        .update({ usage_count: (data.usage_count || 0) + 1 })
        .eq("id", id);

      return NextResponse.json({ success: true, data });
    } catch (err) {
      console.error("[trading/strategies/[id]] GET error:", err);
      return NextResponse.json(
        {
          error: "Failed to fetch strategy",
          message: err instanceof Error ? err.message : "Unknown error",
        },
        { status: 500 },
      );
    }
  },
);

// ============================================================================
// PUT — Update user-owned strategy
// ============================================================================

export const PUT = withAuth(
  async (
    request: NextRequest,
    user: JWTUser,
  ) => {
    try {
      const id = request.nextUrl.pathname.split("/").pop();

      if (!id) {
        return NextResponse.json({ error: "Strategy ID required" }, { status: 400 });
      }

      // Verify ownership
      const { data: existing, error: fetchError } = await strategyLib()
        .select("id, user_id, is_system")
        .eq("id", id)
        .single();

      if (fetchError || !existing) {
        return NextResponse.json({ error: "Strategy not found" }, { status: 404 });
      }

      if (existing.user_id !== user.id) {
        return NextResponse.json(
          { error: "You can only update your own strategies" },
          { status: 403 },
        );
      }

      if (existing.is_system) {
        return NextResponse.json(
          { error: "System strategies cannot be modified" },
          { status: 403 },
        );
      }

      const body = await request.json();
      const {
        name,
        description,
        category,
        config,
        riskParams,
        isPublic,
        isActive,
        backtestResults,
        degradationFactor,
      } = body as {
        name?: string;
        description?: string;
        category?: string;
        config?: Record<string, unknown>;
        riskParams?: Record<string, unknown>;
        isPublic?: boolean;
        isActive?: boolean;
        backtestResults?: Record<string, unknown>;
        degradationFactor?: number;
      };

      // Build update object — only include provided fields
      const updates: Record<string, unknown> = {};
      if (name !== undefined) updates.name = name.trim();
      if (description !== undefined) updates.description = description?.trim() || null;
      if (category !== undefined) updates.category = category;
      if (config !== undefined) updates.config = config;
      if (riskParams !== undefined) updates.risk_params = riskParams;
      if (isPublic !== undefined) updates.is_public = isPublic;
      if (isActive !== undefined) updates.is_active = isActive;
      if (backtestResults !== undefined) updates.backtest_results = backtestResults;
      if (degradationFactor !== undefined) updates.degradation_factor = degradationFactor;

      if (Object.keys(updates).length === 0) {
        return NextResponse.json(
          { error: "No fields to update" },
          { status: 400 },
        );
      }

      const { data, error } = await strategyLib()
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("[trading/strategies/[id]] PUT error:", error);
        return NextResponse.json(
          { error: "Failed to update strategy", message: error.message },
          { status: 500 },
        );
      }

      return NextResponse.json({ success: true, data });
    } catch (err) {
      console.error("[trading/strategies/[id]] PUT error:", err);
      return NextResponse.json(
        {
          error: "Failed to update strategy",
          message: err instanceof Error ? err.message : "Unknown error",
        },
        { status: 500 },
      );
    }
  },
);

// ============================================================================
// DELETE — Soft-delete user-owned strategy
// ============================================================================

export const DELETE = withAuth(
  async (
    request: NextRequest,
    user: JWTUser,
  ) => {
    try {
      const id = request.nextUrl.pathname.split("/").pop();

      if (!id) {
        return NextResponse.json({ error: "Strategy ID required" }, { status: 400 });
      }

      // Verify ownership
      const { data: existing, error: fetchError } = await strategyLib()
        .select("id, user_id, is_system")
        .eq("id", id)
        .single();

      if (fetchError || !existing) {
        return NextResponse.json({ error: "Strategy not found" }, { status: 404 });
      }

      if (existing.user_id !== user.id) {
        return NextResponse.json(
          { error: "You can only delete your own strategies" },
          { status: 403 },
        );
      }

      if (existing.is_system) {
        return NextResponse.json(
          { error: "System strategies cannot be deleted" },
          { status: 403 },
        );
      }

      // Soft delete — set is_active = false
      const { error } = await strategyLib()
        .update({ is_active: false })
        .eq("id", id);

      if (error) {
        console.error("[trading/strategies/[id]] DELETE error:", error);
        return NextResponse.json(
          { error: "Failed to delete strategy", message: error.message },
          { status: 500 },
        );
      }

      return NextResponse.json({ success: true, message: "Strategy deleted" });
    } catch (err) {
      console.error("[trading/strategies/[id]] DELETE error:", err);
      return NextResponse.json(
        {
          error: "Failed to delete strategy",
          message: err instanceof Error ? err.message : "Unknown error",
        },
        { status: 500 },
      );
    }
  },
);
