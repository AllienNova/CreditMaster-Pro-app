/**
 * GDPR Art. 7 (Consent) — read and record consent for the authenticated user.
 *
 * GET  /api/privacy/consent              — full consent history (append-only)
 * POST /api/privacy/consent               — record a consent event
 *   Body: { consentType: "marketing"|"analytics"|"ai_processing"|"data_sharing", granted: boolean }
 *
 * Always operates on `user.id` from the auth guard — never a client-supplied
 * id, same IDOR closure as the export/delete routes.
 *
 * No separate `audit_logs` write here: `consent_records` is itself an
 * append-only history (ip_address/user_agent/timestamp per row — see
 * ConsentManagementService.recordConsent) and already serves as the audit
 * trail for consent changes. A duplicate `audit_logs` row per call would be
 * redundant with that table's own purpose.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";
import { consentService } from "@/lib/compliance/gdpr-ccpa";
import { getClientIp } from "../_lib/audit";

const CONSENT_TYPES = [
  "marketing",
  "analytics",
  "ai_processing",
  "data_sharing",
] as const;

const BodySchema = z.object({
  consentType: z.enum(CONSENT_TYPES),
  granted: z.boolean(),
});

export const GET = withAuth(async (_request: NextRequest, user: AuthedUser) => {
  try {
    const consents = await consentService.getUserConsents(user.id);
    return NextResponse.json({ success: true, data: { consents } });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: "Failed to read consent history", detail: message },
      { status: 500 },
    );
  }
});

export const POST = withAuth(async (request: NextRequest, user: AuthedUser) => {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          "consentType must be one of marketing|analytics|ai_processing|data_sharing and granted must be a boolean",
        details: parsed.error.issues,
      },
      { status: 400 },
    );
  }

  try {
    await consentService.recordConsent({
      userId: user.id,
      consentType: parsed.data.consentType,
      granted: parsed.data.granted,
      timestamp: new Date(),
      ipAddress: getClientIp(request),
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    return NextResponse.json({
      success: true,
      data: {
        consentType: parsed.data.consentType,
        granted: parsed.data.granted,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: "Failed to record consent", detail: message },
      { status: 500 },
    );
  }
});
