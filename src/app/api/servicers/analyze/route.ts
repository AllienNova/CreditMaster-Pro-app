/**
 * Servicer Analysis API
 *
 * Analyzes servicer vulnerabilities and identifies opportunities
 */

import { NextRequest, NextResponse } from "next/server";
import { withPermission, type AuthedUser } from "@/lib/auth/api-guard";
import { servicerIntelligenceEngine } from "@/lib/servicer-intelligence-engine";
import { logAIInteraction } from "@/lib/security/audit-logging";

export const POST = withPermission(
  "servicers:analyze",
  async (request: NextRequest, user: AuthedUser) => {
  try {
    // Parse request body
    const body = await request.json();
    const { servicer_name, loans } = body;

    // Validate required fields
    if (!servicer_name) {
      return NextResponse.json(
        { error: "Missing required field: servicer_name" },
        { status: 400 },
      );
    }

    // Track timing
    const startTime = Date.now();

    // Analyze servicer
    const analysis = await servicerIntelligenceEngine.analyzeServicer(
      servicer_name,
      loans || [],
    );

    const duration = Date.now() - startTime;

    // Audit log
    logAIInteraction({
      userId: user.id,
      model: "servicer-intelligence-engine",
      prompt: JSON.stringify({ servicer_name, loans }),
      response: JSON.stringify(analysis),
      tokens: 0,
      cost: 0,
      duration,
      inputValid: true,
      outputValid: true,
    });

    return NextResponse.json({
      success: true,
      analysis,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Servicer analysis error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to analyze servicer",
      },
      { status: 500 },
    );
  }
},
);

export const GET = withPermission("servicers:analyze", async () => {
  return NextResponse.json({
    message: "Servicer Analysis API",
    method: "POST",
    endpoint: "/api/servicers/analyze",
    requiredFields: ["servicer_name"],
    optionalFields: ["loans"],
    description:
      "Analyzes servicer vulnerabilities and identifies opportunities",
  });
});
