/**
 * Health Check API Endpoints
 * Provides health, liveness, and readiness endpoints
 */

import { NextResponse } from "next/server";
import {
  checkHealth,
  livenessCheck,
  readinessCheck,
} from "@/lib/monitoring/health";

// GET /api/health - Full health check
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  try {
    // Liveness probe (for k8s)
    if (type === "live") {
      const result = livenessCheck();
      return NextResponse.json(result, { status: 200 });
    }

    // Readiness probe (for k8s)
    if (type === "ready") {
      const result = await readinessCheck();
      return NextResponse.json(result, { status: result.ready ? 200 : 503 });
    }

    // Full health check
    const health = await checkHealth();
    const status =
      health.status === "healthy"
        ? 200
        : health.status === "degraded"
          ? 200
          : 503;

    return NextResponse.json(health, { status });
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Health check failed",
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
