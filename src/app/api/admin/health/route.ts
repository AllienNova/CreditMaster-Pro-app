/**
 * GET /api/admin/health (FR-303 / M4-1)
 *
 * Admin-only system health: probes 6 external dependencies (Supabase, Stripe,
 * AIML, Plaid, S3, Resend) with cheap, time-bounded liveness checks and returns
 * a per-service status list. Unconfigured services report `unknown` (never
 * `healthy`); a failed probe reports `down`. This replaces the fake-green
 * hardcoded page and the always-healthy `/api/health` monitoring stub.
 *
 * Reporting endpoint semantics: always 200 with the health payload — a `down`
 * dependency is conveyed by the body's `status` field, not by the HTTP status.
 */

import { NextResponse } from "next/server";
import { withRole } from "@/lib/auth/api-guard";
import { probeAllServices } from "@/lib/monitoring/service-probes";

// Probes make live outbound calls on every request; never cache the result.
export const dynamic = "force-dynamic";

export const GET = withRole("admin", async () => {
  const health = await probeAllServices();
  return NextResponse.json(health);
});
