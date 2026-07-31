/**
 * GDPR Art. 15 (Right to Access) / Art. 20 (Right to Data Portability)
 * CCPA §1798.100/§1798.110 (Right to Know)
 *
 * GET /api/privacy/export?format=json|csv|xml
 *
 * Returns the AUTHENTICATED CALLER'S data only. The exported user is always
 * `user.id` from the auth guard — this route never reads a client-supplied
 * user id from query/body, closing the IDOR class documented at FND-041..044
 * (notifications routes previously trusted a client-supplied userId).
 *
 * Export is itself a data-exfiltration surface even for the account owner
 * (a leaked session token should not be able to enumerate the full profile
 * repeatedly), so it is rate-limited in addition to being authenticated.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";
import { gdprService } from "@/lib/compliance/gdpr-ccpa";
import { rateLimit } from "@/lib/security/redis-rate-limiting";
import { writeAuditLog } from "../_lib/audit";

const EXPORT_RATE_LIMIT = 5; // requests per hour, per user
const exportLimiter = rateLimit({ interval: 60 * 60 * 1000 });

const QuerySchema = z.object({
  format: z.enum(["json", "csv", "xml"]).default("json"),
});

export const GET = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    await exportLimiter.check(EXPORT_RATE_LIMIT, user.id);
  } catch {
    return NextResponse.json(
      {
        error: "Too Many Requests",
        message: "Export rate limit exceeded. Please try again later.",
      },
      { status: 429 },
    );
  }

  const { searchParams } = new URL(request.url);
  const parsed = QuerySchema.safeParse({
    format: searchParams.get("format") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const exportResult = await gdprService.exportUserData(
      user.id,
      parsed.data.format,
    );

    await writeAuditLog({
      userId: user.id,
      action: "gdpr_export_completed",
      resourceType: "user_data_export",
      request,
      details: { format: parsed.data.format },
    });

    return NextResponse.json({ success: true, data: exportResult });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    await writeAuditLog({
      userId: user.id,
      action: "gdpr_export_failed",
      resourceType: "user_data_export",
      request,
      details: { format: parsed.data.format, error: message },
    });

    // The service throws this exact message for csv/xml — surface as 501
    // rather than a generic 500 since it is a known, honest "not built yet."
    if (message.includes("is not yet implemented")) {
      return NextResponse.json(
        { success: false, error: "Export format not yet supported", detail: message },
        { status: 501 },
      );
    }

    // Honest failure: a failed export must never report success. This is
    // the same requirement enforced end-to-end by the gdpr-ccpa.ts fix that
    // makes the underlying query errors reach this catch block at all.
    return NextResponse.json(
      { success: false, error: "Failed to export user data", detail: message },
      { status: 500 },
    );
  }
});
