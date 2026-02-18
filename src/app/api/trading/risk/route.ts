/**
 * Trading Risk API Route
 *
 * Handles portfolio risk monitoring and controls:
 * - GET: Retrieve risk metrics, exposure, heat
 * - POST: Update risk settings, trigger kill switch
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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

// In-memory risk state
const riskSettings: RiskSettings = {
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

let killSwitchState = {
  active: false,
  reason: undefined as string | undefined,
  activatedAt: undefined as Date | undefined,
  activatedBy: undefined as string | undefined,
};

let accountEquity = 100000;
let peakEquity = 100000;

// ============================================================================
// GET - Retrieve Risk Metrics
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get("action");

    const positionManager = getPositionManager();
    await positionManager.loadPositions(user.id);

    const summary = positionManager.getSummary();

    // Calculate risk metrics
    if (action === "metrics" || !action) {
      const currentDrawdown =
        peakEquity > 0 ? (peakEquity - accountEquity) / peakEquity : 0;

      // Calculate portfolio heat (sum of position risks)
      const openPositions = positionManager.getOpenPositions();
      let portfolioHeat = 0;

      for (const position of openPositions) {
        if (position.riskPercent) {
          portfolioHeat += position.riskPercent;
        }
      }

      // Determine risk level
      let riskLevel: RiskMetrics["riskLevel"] = "low";
      let riskScore = 0;

      const heatRatio = portfolioHeat / riskSettings.maxHeat;
      const drawdownRatio = currentDrawdown / riskSettings.maxDrawdown;
      const exposureRatio =
        summary.grossExposure / (accountEquity * riskSettings.maxGrossExposure);

      riskScore =
        (heatRatio * 0.4 + drawdownRatio * 0.4 + exposureRatio * 0.2) * 100;

      if (riskScore > 80) riskLevel = "critical";
      else if (riskScore > 60) riskLevel = "high";
      else if (riskScore > 40) riskLevel = "medium";

      // Determine if trading is allowed
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
      if (
        Math.abs(summary.dayPL) / accountEquity >=
        riskSettings.maxDailyLoss
      ) {
        blockReasons.push(`Daily loss limit reached`);
      }

      // Calculate drawdown scale factor
      let drawdownScaleFactor = 1.0;
      if (currentDrawdown > 0.05) {
        drawdownScaleFactor = 0.5; // Half size at 5% drawdown
      }
      if (currentDrawdown > 0.08) {
        drawdownScaleFactor = 0.25; // Quarter size at 8% drawdown
      }

      const metrics: RiskMetrics = {
        portfolioHeat,
        maxHeat: riskSettings.maxHeat,
        heatUtilization: portfolioHeat / riskSettings.maxHeat,

        grossExposure: summary.grossExposure,
        netExposure: summary.netExposure,
        longExposure:
          summary.totalPositions > 0
            ? summary.grossExposure *
              (summary.longPositions / summary.totalPositions)
            : 0,
        shortExposure:
          summary.totalPositions > 0
            ? summary.grossExposure *
              (summary.shortPositions / summary.totalPositions)
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
        correlatedGroups: [], // Would need correlation calculation

        riskScore,
        riskLevel,

        canTrade: blockReasons.length === 0,
        blockReasons,

        killSwitch: killSwitchState,
      };

      return NextResponse.json({ success: true, data: metrics });
    }

    // Get settings
    if (action === "settings") {
      return NextResponse.json({
        success: true,
        data: riskSettings,
      });
    }

    // Get kill switch status
    if (action === "killswitch") {
      return NextResponse.json({
        success: true,
        data: killSwitchState,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (_error) {
    // RiskAPI error: Risk GET error
    void _error;
    return NextResponse.json(
      { error: "Failed to retrieve risk metrics" },
      { status: 500 },
    );
  }
}

// ============================================================================
// POST - Update Risk Settings
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "updateSettings": {
        const { settings } = body;

        if (!settings || typeof settings !== "object") {
          return NextResponse.json(
            { error: "settings object required" },
            { status: 400 },
          );
        }

        // Validate and update settings
        if (settings.maxHeat !== undefined) {
          riskSettings.maxHeat = Math.max(
            0.01,
            Math.min(0.2, settings.maxHeat),
          );
        }
        if (settings.maxPositionSize !== undefined) {
          riskSettings.maxPositionSize = Math.max(
            0.01,
            Math.min(0.5, settings.maxPositionSize),
          );
        }
        if (settings.maxGrossExposure !== undefined) {
          riskSettings.maxGrossExposure = Math.max(
            0.5,
            Math.min(4.0, settings.maxGrossExposure),
          );
        }
        if (settings.maxDailyLoss !== undefined) {
          riskSettings.maxDailyLoss = Math.max(
            0.01,
            Math.min(0.1, settings.maxDailyLoss),
          );
        }
        if (settings.maxDrawdown !== undefined) {
          riskSettings.maxDrawdown = Math.max(
            0.05,
            Math.min(0.25, settings.maxDrawdown),
          );
        }

        return NextResponse.json({
          success: true,
          data: riskSettings,
        });
      }

      case "activateKillSwitch": {
        const { reason } = body;

        killSwitchState = {
          active: true,
          reason: reason || "Manual activation",
          activatedAt: new Date(),
          activatedBy: user.id,
        };

        return NextResponse.json({
          success: true,
          data: killSwitchState,
        });
      }

      case "deactivateKillSwitch": {
        killSwitchState = {
          active: false,
          reason: undefined,
          activatedAt: undefined,
          activatedBy: undefined,
        };

        return NextResponse.json({
          success: true,
          data: killSwitchState,
        });
      }

      case "updateEquity": {
        const { equity } = body;

        if (typeof equity !== "number" || equity <= 0) {
          return NextResponse.json(
            { error: "Valid equity required" },
            { status: 400 },
          );
        }

        accountEquity = equity;
        if (equity > peakEquity) {
          peakEquity = equity;
        }

        const positionManager = getPositionManager();
        positionManager.setAccountEquity(equity);

        return NextResponse.json({
          success: true,
          data: { equity: accountEquity, peakEquity },
        });
      }

      case "resetPeak": {
        peakEquity = accountEquity;

        return NextResponse.json({
          success: true,
          data: { equity: accountEquity, peakEquity },
        });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (_error) {
    // RiskAPI error: Risk POST error
    void _error;
    return NextResponse.json(
      { error: "Failed to update risk settings" },
      { status: 500 },
    );
  }
}
