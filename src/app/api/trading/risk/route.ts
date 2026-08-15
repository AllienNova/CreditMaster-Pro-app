/**
 * Trading Risk API Route
 *
 * Handles portfolio risk monitoring and controls:
 * - GET: Retrieve risk metrics, settings, or kill-switch state
 * - POST: Update risk settings, equity, or toggle kill switch
 *
 * Persistence: user_risk_settings table (Supabase). Each user has one row
 * (upserted on first write). Defaults are applied when no row exists yet.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getPositionManager } from "@/lib/trading/positions";

// ============================================================================
// TYPES
// ============================================================================

interface RiskMetrics {
  portfolioHeat: number;
  maxHeat: number;
  heatUtilization: number;

  grossExposure: number;
  netExposure: number;
  longExposure: number;
  shortExposure: number;

  largestPosition: {
    symbol: string;
    value: number;
    percent: number;
  } | null;

  currentDrawdown: number;
  maxDrawdown: number;
  drawdownScaleFactor: number;

  dailyPL: number;
  dailyPLPercent: number;
  weeklyPL: number;
  monthlyPL: number;

  openPositions: number;
  correlatedGroups: string[][];

  riskScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";

  canTrade: boolean;
  blockReasons: string[];

  killSwitch: {
    active: boolean;
    reason?: string;
    activatedAt?: Date;
    activatedBy?: string;
  };
}

interface RiskSettings {
  maxHeat: number;
  maxPositionSize: number;
  maxGrossExposure: number;
  maxNetExposure: number;
  maxDailyLoss: number;
  maxDrawdown: number;
  correlationThreshold: number;
  maxCorrelatedExposure: number;
  enableKillSwitch: boolean;
}

interface KillSwitchState {
  active: boolean;
  reason?: string;
  activatedAt?: Date;
  activatedBy?: string;
}

interface UserRiskRow {
  settings: RiskSettings;
  kill_switch: KillSwitchState;
  equity: number;
  peak_equity: number;
}

// ============================================================================
// DEFAULTS
// ============================================================================

const DEFAULT_RISK_SETTINGS: RiskSettings = {
  maxHeat: 0.06,
  maxPositionSize: 0.2,
  maxGrossExposure: 2.0,
  maxNetExposure: 1.0,
  maxDailyLoss: 0.03,
  maxDrawdown: 0.1,
  correlationThreshold: 0.7,
  maxCorrelatedExposure: 0.3,
  enableKillSwitch: true,
};

const DEFAULT_KILL_SWITCH: KillSwitchState = { active: false };
const DEFAULT_EQUITY = 100000;

// ============================================================================
// DB HELPERS
// ============================================================================

async function loadUserRisk(userId: string): Promise<UserRiskRow> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabaseAdmin as any)
    .from("user_risk_settings")
    .select("settings, kill_switch, equity, peak_equity")
    .eq("user_id", userId)
    .single();

  if (!data) {
    return {
      settings: DEFAULT_RISK_SETTINGS,
      kill_switch: DEFAULT_KILL_SWITCH,
      equity: DEFAULT_EQUITY,
      peak_equity: DEFAULT_EQUITY,
    };
  }

  return {
    settings: { ...DEFAULT_RISK_SETTINGS, ...(data.settings as RiskSettings) },
    kill_switch: (data.kill_switch as KillSwitchState) ?? DEFAULT_KILL_SWITCH,
    equity: Number(data.equity) || DEFAULT_EQUITY,
    peak_equity: Number(data.peak_equity) || DEFAULT_EQUITY,
  };
}

async function saveUserRisk(userId: string, row: Partial<UserRiskRow>): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabaseAdmin as any)
    // idor-audit: pk-owner-checked — INSERT writes `user_id` from the caller-supplied id; there is no prior row to filter on
    .from("user_risk_settings")
    .upsert(
      { user_id: userId, ...row, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
}

// ============================================================================
// GET - Retrieve Risk Metrics
// ============================================================================

export const GET = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get("action");

    const { settings: riskSettings, kill_switch: killSwitchState, equity: accountEquity, peak_equity: peakEquity } =
      await loadUserRisk(user.id);

    // Get kill switch status only
    if (action === "killswitch") {
      return NextResponse.json({ success: true, data: killSwitchState });
    }

    // Get settings only
    if (action === "settings") {
      return NextResponse.json({ success: true, data: riskSettings });
    }

    // Calculate risk metrics (default action or action === "metrics")
    const positionManager = getPositionManager();
    await positionManager.loadPositions(user.id);

    const summary = positionManager.getSummary();

    const currentDrawdown =
      peakEquity > 0 ? (peakEquity - accountEquity) / peakEquity : 0;

    const openPositions = positionManager.getOpenPositions();
    let portfolioHeat = 0;
    for (const position of openPositions) {
      if (position.riskPercent) {
        portfolioHeat += position.riskPercent;
      }
    }

    let riskLevel: RiskMetrics["riskLevel"] = "low";
    const heatRatio = portfolioHeat / riskSettings.maxHeat;
    const drawdownRatio = currentDrawdown / riskSettings.maxDrawdown;
    const exposureRatio =
      summary.grossExposure / (accountEquity * riskSettings.maxGrossExposure);

    const riskScore =
      (heatRatio * 0.4 + drawdownRatio * 0.4 + exposureRatio * 0.2) * 100;

    if (riskScore > 80) riskLevel = "critical";
    else if (riskScore > 60) riskLevel = "high";
    else if (riskScore > 40) riskLevel = "medium";

    const blockReasons: string[] = [];
    if (killSwitchState.active) {
      blockReasons.push(`Kill switch active: ${killSwitchState.reason}`);
    }
    if (portfolioHeat >= riskSettings.maxHeat) {
      blockReasons.push(
        `Portfolio heat (${(portfolioHeat * 100).toFixed(1)}%) exceeds limit`,
      );
    }
    if (currentDrawdown >= riskSettings.maxDrawdown) {
      blockReasons.push(
        `Drawdown (${(currentDrawdown * 100).toFixed(1)}%) exceeds limit`,
      );
    }
    if (Math.abs(summary.dayPL) / accountEquity >= riskSettings.maxDailyLoss) {
      blockReasons.push(`Daily loss limit reached`);
    }

    let drawdownScaleFactor = 1.0;
    if (currentDrawdown > 0.05) drawdownScaleFactor = 0.5;
    if (currentDrawdown > 0.08) drawdownScaleFactor = 0.25;

    const metrics: RiskMetrics = {
      portfolioHeat,
      maxHeat: riskSettings.maxHeat,
      heatUtilization: portfolioHeat / riskSettings.maxHeat,

      grossExposure: summary.grossExposure,
      netExposure: summary.netExposure,
      longExposure:
        summary.totalPositions > 0
          ? summary.grossExposure * (summary.longPositions / summary.totalPositions)
          : 0,
      shortExposure:
        summary.totalPositions > 0
          ? summary.grossExposure * (summary.shortPositions / summary.totalPositions)
          : 0,

      largestPosition: summary.largestPosition,

      currentDrawdown,
      maxDrawdown: riskSettings.maxDrawdown,
      drawdownScaleFactor,

      dailyPL: summary.dayPL,
      dailyPLPercent: accountEquity > 0 ? summary.dayPL / accountEquity : 0,
      weeklyPL: summary.weekPL,
      monthlyPL: summary.monthPL,

      openPositions: summary.totalPositions,
      correlatedGroups: [],

      riskScore,
      riskLevel,

      canTrade: blockReasons.length === 0,
      blockReasons,

      killSwitch: killSwitchState,
    };

    return NextResponse.json({ success: true, data: metrics });
  } catch (_error) {
    void _error;
    return NextResponse.json(
      { error: "Failed to retrieve risk metrics" },
      { status: 500 },
    );
  }
});

// ============================================================================
// POST - Update Risk Settings
// ============================================================================

export const POST = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const body = await request.json();
    const { action } = body;

    const current = await loadUserRisk(user.id);

    switch (action) {
      case "updateSettings": {
        const { settings } = body;

        if (!settings || typeof settings !== "object") {
          return NextResponse.json(
            { error: "settings object required" },
            { status: 400 },
          );
        }

        const updated: RiskSettings = { ...current.settings };

        if (settings.maxHeat !== undefined) {
          updated.maxHeat = Math.max(0.01, Math.min(0.2, settings.maxHeat));
        }
        if (settings.maxPositionSize !== undefined) {
          updated.maxPositionSize = Math.max(0.01, Math.min(0.5, settings.maxPositionSize));
        }
        if (settings.maxGrossExposure !== undefined) {
          updated.maxGrossExposure = Math.max(0.5, Math.min(4.0, settings.maxGrossExposure));
        }
        if (settings.maxDailyLoss !== undefined) {
          updated.maxDailyLoss = Math.max(0.01, Math.min(0.1, settings.maxDailyLoss));
        }
        if (settings.maxDrawdown !== undefined) {
          updated.maxDrawdown = Math.max(0.05, Math.min(0.25, settings.maxDrawdown));
        }
        if (settings.maxNetExposure !== undefined) {
          updated.maxNetExposure = settings.maxNetExposure;
        }
        if (settings.correlationThreshold !== undefined) {
          updated.correlationThreshold = settings.correlationThreshold;
        }
        if (settings.maxCorrelatedExposure !== undefined) {
          updated.maxCorrelatedExposure = settings.maxCorrelatedExposure;
        }
        if (settings.enableKillSwitch !== undefined) {
          updated.enableKillSwitch = Boolean(settings.enableKillSwitch);
        }

        await saveUserRisk(user.id, { settings: updated });

        return NextResponse.json({ success: true, data: updated });
      }

      case "activateKillSwitch": {
        const { reason } = body;

        const killSwitch: KillSwitchState = {
          active: true,
          reason: reason || "Manual activation",
          activatedAt: new Date(),
          activatedBy: user.id,
        };

        await saveUserRisk(user.id, { kill_switch: killSwitch });

        return NextResponse.json({ success: true, data: killSwitch });
      }

      case "deactivateKillSwitch": {
        const killSwitch: KillSwitchState = { active: false };

        await saveUserRisk(user.id, { kill_switch: killSwitch });

        return NextResponse.json({ success: true, data: killSwitch });
      }

      case "updateEquity": {
        const { equity } = body;

        if (typeof equity !== "number" || equity <= 0) {
          return NextResponse.json(
            { error: "Valid equity required" },
            { status: 400 },
          );
        }

        const newPeak = equity > current.peak_equity ? equity : current.peak_equity;

        await saveUserRisk(user.id, { equity, peak_equity: newPeak });

        const positionManager = getPositionManager();
        positionManager.setAccountEquity(equity);

        return NextResponse.json({
          success: true,
          data: { equity, peakEquity: newPeak },
        });
      }

      case "resetPeak": {
        await saveUserRisk(user.id, { peak_equity: current.equity });

        return NextResponse.json({
          success: true,
          data: { equity: current.equity, peakEquity: current.equity },
        });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (_error) {
    void _error;
    return NextResponse.json(
      { error: "Failed to update risk settings" },
      { status: 500 },
    );
  }
});
