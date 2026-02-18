/**
 * Investment Alerts API
 *
 * Endpoints for managing price alerts and notifications
 */

import { NextRequest, NextResponse } from "next/server";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// ============================================================================
// GET - List user alerts
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const validation = await jwtValidation.validateFromHeaders(request);
    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = validation.user.id;

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
}

// ============================================================================
// POST - Create new alert
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const validation = await jwtValidation.validateFromHeaders(request);
    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = validation.user.id;

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
}

// ============================================================================
// DELETE - Delete alert(s)
// ============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const validation = await jwtValidation.validateFromHeaders(request);
    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = validation.user.id;

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
}
