import { NextRequest, NextResponse } from "next/server";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import {
  createRankingService,
  createRotationService,
  type Instrument,
  type InstrumentFeatures,
  type InstrumentPerformance,
  type UserConstraints,
  type UserTier,
  type AssetClass,
} from "@/lib/trading";

/**
 * POST /api/trading/ise/rankings
 * Run a full ranking cycle with provided instrument data
 */
export async function POST(request: NextRequest) {
  try {
    const validation = await jwtValidation.validateFromHeaders(request);

    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      instruments,
      features,
      performance,
      constraints,
      tier = "pro",
      assetClasses,
      timeframe = "1h",
      maxActiveSize = 5,
    } = body as {
      instruments: Instrument[];
      features: Record<string, InstrumentFeatures>;
      performance?: Record<string, InstrumentPerformance>;
      constraints: UserConstraints;
      tier?: UserTier;
      assetClasses?: AssetClass[];
      timeframe?: string;
      maxActiveSize?: number;
    };

    // Validate required fields
    if (!instruments || !Array.isArray(instruments)) {
      return NextResponse.json(
        { error: "instruments array required" },
        { status: 400 },
      );
    }
    if (!features || typeof features !== "object") {
      return NextResponse.json(
        { error: "features map required" },
        { status: 400 },
      );
    }
    if (!constraints) {
      return NextResponse.json(
        { error: "constraints required" },
        { status: 400 },
      );
    }

    // Convert to Maps
    const featuresMap = new Map(Object.entries(features));
    const performanceMap = new Map(Object.entries(performance || {}));

    // Ensure userId is set
    constraints.userId = validation.user.id;

    // Create services
    const rankingService = createRankingService();
    const rotationService = createRotationService(maxActiveSize);

    // Run ranking
    const { rankings, run } = await rankingService.rank({
      instruments,
      featuresMap,
      performanceMap,
      constraints,
      tier,
      assetClasses,
      timeframe,
    });

    // Run rotation based on rankings
    const rotationDecision = rotationService.rotate(rankings);

    return NextResponse.json({
      rankings: rankings.slice(0, 50), // Limit response size
      run,
      rotation: {
        decision: rotationDecision,
        activeSymbols: rotationService.getActiveSymbols(),
        events: rotationService.getRecentEvents(5),
      },
      summary: rankingService.getSummary(),
    });
  } catch (error) {
    console.error("ISE rankings error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 },
    );
  }
}
