/**
 * Trading Strategies API Route
 *
 * GET  — List strategies (system + user's own + public)
 * POST — Create a custom strategy
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-guard";
import type { JWTUser } from "@/lib/auth/jwt-validation";
import { supabaseAdmin } from "@/lib/supabase/server";
import { validateStrategyDefinition } from "@/lib/trading/strategies/strategy-validator";

// ============================================================================
// TYPES
// ============================================================================

export interface StrategyLibraryRow {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  config: Record<string, unknown>;
  risk_params: Record<string, unknown> | null;
  is_system: boolean;
  is_public: boolean;
  is_active: boolean;
  usage_count?: number;
  backtest_results?: Record<string, unknown> | null;
  degradation_factor?: number | null;
  created_at: string;
  updated_at: string;
}

type StrategyInsert = Omit<
  StrategyLibraryRow,
  "id" | "created_at" | "updated_at" | "usage_count" | "backtest_results" | "degradation_factor"
>;

// strategy_library is not in the generated Database types yet.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const strategyLib = () => supabaseAdmin.from("strategy_library") as any;

// ============================================================================
// GET — List strategies
// ============================================================================

export const GET = withAuth(async (request: NextRequest, user: JWTUser) => {
  try {
    const params = request.nextUrl.searchParams;
    const category = params.get("category");
    const search = params.get("search");
    const systemOnly = params.get("system") === "true";
    const limit = Math.min(parseInt(params.get("limit") || "50", 10), 100);
    const offset = parseInt(params.get("offset") || "0", 10);

    let query = strategyLib().select("*", { count: "exact" });

    // Users see: their own + system + public-active
    if (systemOnly) {
      query = query.eq("is_system", true);
    } else {
      query = query.or(
        `user_id.eq.${user.id},is_system.eq.true,and(is_public.eq.true,is_active.eq.true)`,
      );
    }

    if (category) {
      query = query.eq("category", category);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    query = query
      .eq("is_active", true)
      .order("is_system", { ascending: false })
      .order("usage_count", { ascending: false })
      .range(offset, offset + limit - 1);

    const {
      data,
      count,
      error,
    }: {
      data: StrategyLibraryRow[] | null;
      count: number | null;
      error: { message: string } | null;
    } = await query;

    if (error) {
      console.error("[trading/strategies] GET error:", error);
      return NextResponse.json(
        { error: "Failed to fetch strategies", message: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: data ?? [],
      count: count ?? 0,
      limit,
      offset,
    });
  } catch (err) {
    console.error("[trading/strategies] GET error:", err);
    return NextResponse.json(
      {
        error: "Failed to fetch strategies",
        message: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 },
    );
  }
});

// ============================================================================
// POST — Create a custom strategy
// ============================================================================

export const POST = withAuth(async (request: NextRequest, user: JWTUser) => {
  try {
    const body = await request.json();
    const { name, description, category, config, riskParams, isPublic, slug } =
      body as {
        name?: string;
        description?: string;
        category?: string;
        config?: Record<string, unknown>;
        riskParams?: Record<string, unknown>;
        isPublic?: boolean;
        slug?: string;
      };

    // Required fields
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 },
      );
    }

    if (!category || typeof category !== "string") {
      return NextResponse.json(
        { error: "category is required" },
        { status: 400 },
      );
    }

    if (!config || typeof config !== "object") {
      return NextResponse.json(
        { error: "config is required and must be an object" },
        { status: 400 },
      );
    }

    // Validate strategy config using the validator
    const strategyConfig = config as Record<string, unknown>;
    if (strategyConfig.name && strategyConfig.entryRules) {
      // Full BacktestStrategy config — validate it
      const defToValidate = {
        id:
          slug ||
          name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, ""),
        strategy: strategyConfig,
        metadata: {
          category,
          riskLevel: (riskParams as Record<string, unknown>)?.riskLevel || "medium",
          timeframe: (riskParams as Record<string, unknown>)?.timeframe || "swing",
          idealConditions: ["any"],
          indicators: [],
        },
      };

      const validation = validateStrategyDefinition(defToValidate);
      if (!validation.valid) {
        return NextResponse.json(
          {
            error: "Strategy validation failed",
            details: validation.errors,
            warnings: validation.warnings,
          },
          { status: 400 },
        );
      }
    }

    // Generate slug
    const strategySlug =
      slug ||
      `${name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")}-${Date.now().toString(36)}`;

    const insertRow: StrategyInsert = {
      user_id: user.id,
      name: name.trim(),
      slug: strategySlug,
      description: description?.trim() || null,
      category,
      config,
      risk_params: riskParams || {},
      is_system: false,
      is_public: isPublic ?? false,
      is_active: true,
    };

    const {
      data,
      error,
    }: { data: StrategyLibraryRow | null; error: { message: string; code: string } | null } =
      await strategyLib().insert(insertRow).select().single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A strategy with this slug already exists" },
          { status: 409 },
        );
      }
      console.error("[trading/strategies] POST error:", error);
      return NextResponse.json(
        { error: "Failed to create strategy", message: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err) {
    console.error("[trading/strategies] POST error:", err);
    return NextResponse.json(
      {
        error: "Failed to create strategy",
        message: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 },
    );
  }
});
