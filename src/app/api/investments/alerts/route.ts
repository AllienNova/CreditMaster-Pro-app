/**
 * Investment Alerts API
 *
 * Endpoints for managing price alerts and notifications
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _supabase: SupabaseClient | null = null;
const supabase = new Proxy({} as SupabaseClient, {
  get(_t, prop, recv) {
    if (!_supabase)
      _supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      );
    const v = Reflect.get(_supabase, prop, recv);
    return typeof v === "function" ? v.bind(_supabase) : v;
  },
});

// ============================================================================
// GET - List user alerts
// ============================================================================

export const GET = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const userId = user.id;

    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");

    let query = supabase
      .from("investment_alerts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (symbol) {
      query = query.eq("symbol", symbol.toUpperCase());
    }

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      // AlertsAPI error: Error fetching alerts
      return NextResponse.json(
        { error: "Failed to fetch alerts" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      alerts: data || [],
      total: data?.length || 0,
    });
  } catch (_error) {
    // AlertsAPI error: Alerts GET error
    void _error;
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});

// ============================================================================
// POST - Create new alert
// ============================================================================

export const POST = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const userId = user.id;

    const body = await request.json();
    const {
      symbol,
      type,
      priority = "medium",
      condition,
      message,
      repeatEnabled = false,
      cooldownMinutes = 60,
      expiresAt,
    } = body;

    // Validate required fields
    if (!symbol || !type || !condition) {
      return NextResponse.json(
        { error: "Missing required fields: symbol, type, condition" },
        { status: 400 },
      );
    }

    // Validate alert type
    const validTypes = [
      "price_above",
      "price_below",
      "percent_change",
      "volume_spike",
      "indicator_crossover",
      "pattern_detected",
    ];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: "Invalid alert type" },
        { status: 400 },
      );
    }

    const alert = {
      user_id: userId,
      symbol: symbol.toUpperCase(),
      type,
      status: "active",
      priority,
      condition,
      message,
      repeat_enabled: repeatEnabled,
      cooldown_minutes: cooldownMinutes,
      notification_sent: false,
      expires_at: expiresAt || null,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("investment_alerts")
      .insert(alert)
      .select()
      .single();

    if (error) {
      // AlertsAPI error: Error creating alert
      return NextResponse.json(
        { error: "Failed to create alert" },
        { status: 500 },
      );
    }

    return NextResponse.json({ alert: data }, { status: 201 });
  } catch (_error) {
    // AlertsAPI error: Alerts POST error
    void _error;
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});

// ============================================================================
// DELETE - Delete alert(s)
// ============================================================================

export const DELETE = withAuth(
  async (request: NextRequest, user: AuthedUser) => {
  try {
    const userId = user.id;

    const { searchParams } = new URL(request.url);
    const alertId = searchParams.get("id");

    if (!alertId) {
      return NextResponse.json({ error: "Alert ID required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("investment_alerts")
      .delete()
      .eq("id", alertId)
      .eq("user_id", userId);

    if (error) {
      // AlertsAPI error: Error deleting alert
      return NextResponse.json(
        { error: "Failed to delete alert" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (_error) {
    // AlertsAPI error: Alerts DELETE error
    void _error;
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
  },
);

// ============================================================================
// PATCH - Pause or resume an alert
// ============================================================================

/**
 * Only "active" and "disabled" are accepted. "triggered" and "expired" are
 * lifecycle states an evaluator would set — and no evaluator exists — so
 * letting a client claim them would let the UI assert an alert had fired.
 */
const USER_SETTABLE_STATUSES = ["active", "disabled"] as const;

export const PATCH = withAuth(
  async (request: NextRequest, user: AuthedUser) => {
    try {
      const userId = user.id;
      const body = await request.json();
      const { id, status } = body;

      if (!id) {
        return NextResponse.json(
          { error: "Alert ID required" },
          { status: 400 },
        );
      }

      if (
        !USER_SETTABLE_STATUSES.includes(
          status as (typeof USER_SETTABLE_STATUSES)[number],
        )
      ) {
        return NextResponse.json(
          { error: "Invalid status: expected active or disabled" },
          { status: 400 },
        );
      }

      const { data, error } = await supabase
        .from("investment_alerts")
        .update({ status })
        .eq("id", id)
        .eq("user_id", userId)
        .select()
        .maybeSingle();

      if (error) {
        // AlertsAPI error: Error updating alert
        return NextResponse.json(
          { error: "Failed to update alert" },
          { status: 500 },
        );
      }

      // The row is scoped by user_id, so "no row" means it is not this
      // caller's alert. 404 rather than a silent success.
      if (!data) {
        return NextResponse.json({ error: "Alert not found" }, { status: 404 });
      }

      return NextResponse.json({ alert: data });
    } catch (_error) {
      // AlertsAPI error: Alerts PATCH error
      void _error;
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  },
);
