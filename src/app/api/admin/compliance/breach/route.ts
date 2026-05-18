/**
 * POST /api/admin/compliance/breach
 *
 * Admin-only trigger for GDPR Art. 33 breach notifications.
 * Wraps `gdprService.notifyDataBreach` and enforces admin-role RBAC via
 * `withRole("admin")` (same pattern as other admin routes).
 *
 * Input (JSON body):
 *   breachId        string    required — unique identifier for this breach
 *   discoveredDate  string    required — ISO date string
 *   affectedUsers   string[]  required — user IDs to notify
 *   dataTypes       string[]  required — types of data involved
 *   severity        string    required — "low" | "medium" | "high" | "critical"
 *   mitigationSteps string[]  required — list of remediation actions
 */

import { NextRequest, NextResponse } from "next/server";
import { withRole } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";
import { gdprService } from "@/lib/compliance/gdpr-ccpa";

export const POST = withRole(
  "admin",
  async (request: NextRequest, _user: AuthedUser) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 },
      );
    }

    // Validate required fields at the boundary
    const b = body as Record<string, unknown>;
    const isStringArray = (v: unknown): v is string[] =>
      Array.isArray(v) &&
      (v as unknown[]).length > 0 &&
      (v as unknown[]).every((e) => typeof e === "string");

    if (
      typeof b.breachId !== "string" ||
      !b.breachId ||
      typeof b.discoveredDate !== "string" ||
      !b.discoveredDate ||
      !isStringArray(b.affectedUsers) ||
      !isStringArray(b.dataTypes) ||
      typeof b.severity !== "string" ||
      !["low", "medium", "high", "critical"].includes(b.severity) ||
      !Array.isArray(b.mitigationSteps) ||
      !(b.mitigationSteps as unknown[]).every((e) => typeof e === "string")
    ) {
      return NextResponse.json(
        {
          error:
            "Missing or invalid required fields: breachId, discoveredDate, affectedUsers (string[]), dataTypes (string[]), severity, mitigationSteps (string[])",
        },
        { status: 400 },
      );
    }

    const discoveredDate = new Date(b.discoveredDate);
    if (isNaN(discoveredDate.getTime())) {
      return NextResponse.json(
        { error: "discoveredDate must be a valid ISO date string" },
        { status: 400 },
      );
    }

    try {
      const result = await gdprService.notifyDataBreach({
        breachId: b.breachId,
        discoveredDate,
        affectedUsers: b.affectedUsers,
        dataTypes: b.dataTypes,
        severity: b.severity as "low" | "medium" | "high" | "critical",
        mitigationSteps: b.mitigationSteps as string[],
      });

      return NextResponse.json(
        {
          success: true,
          breachId: b.breachId,
          sent: result.sent,
          failed: result.failed,
        },
        { status: 200 },
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // Misconfiguration (missing API key) → 503 Service Unavailable
      if (message === "RESEND_API_KEY is not configured") {
        return NextResponse.json(
          { error: "Email service is not configured", detail: message },
          { status: 503 },
        );
      }
      // Partial failure — some users were notified, some were not
      if (message.startsWith("Breach notification partially failed")) {
        return NextResponse.json(
          { error: "Breach notification partially failed", detail: message },
          { status: 207 },
        );
      }
      return NextResponse.json(
        { error: "Breach notification failed", detail: message },
        { status: 500 },
      );
    }
  },
);
