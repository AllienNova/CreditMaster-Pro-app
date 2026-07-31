/**
 * GDPR Art. 17 (Right to Erasure) / CCPA §1798.105 (Right to Delete)
 *
 * POST /api/privacy/delete
 * Body: { confirm: "DELETE", reason?: string }
 *
 * Erases the AUTHENTICATED CALLER'S account only — `user.id` from the auth
 * guard, never a client-supplied id (closes the same IDOR class as
 * FND-041..044). This is IRREVERSIBLE: the cascade (`gdprService.deleteUserData`
 * → `delete_user_data_cascade` RPC) wipes the user's rows across every
 * user-linked table and then deletes the Supabase Auth user. A bare POST is
 * not enough to trigger it — the body must carry the literal confirmation
 * token `"DELETE"`.
 *
 * Audit trail: this route logs BOTH the request and the outcome itself,
 * independent of the RPC's own internal `gdpr_erasure_started`/
 * `gdpr_erasure_completed` rows. Those RPC-side rows are written inside the
 * SAME transaction as the cascade delete, so a mid-transaction failure rolls
 * them back too — this route's logs are the only durable record of a failed
 * erasure attempt.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";
import { gdprService } from "@/lib/compliance/gdpr-ccpa";
import { rateLimit } from "@/lib/security/redis-rate-limiting";
import { writeAuditLog } from "../_lib/audit";

const DELETE_RATE_LIMIT = 3; // requests per hour, per user
const deleteLimiter = rateLimit({ interval: 60 * 60 * 1000 });

const BodySchema = z.object({
  confirm: z.literal("DELETE", {
    error: 'Erasure requires the literal confirmation token "DELETE".',
  }),
  reason: z.string().max(500).optional(),
});

export const POST = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    await deleteLimiter.check(DELETE_RATE_LIMIT, user.id);
  } catch {
    return NextResponse.json(
      {
        error: "Too Many Requests",
        message: "Erasure request rate limit exceeded. Please try again later.",
      },
      { status: 429 },
    );
  }

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
          'Erasure requires an explicit confirmation: { "confirm": "DELETE" }',
        details: parsed.error.issues,
      },
      { status: 400 },
    );
  }

  await writeAuditLog({
    userId: user.id,
    action: "gdpr_erasure_api_requested",
    resourceType: "user_account",
    request,
    details: { reason: parsed.data.reason ?? null },
  });

  try {
    const result = await gdprService.deleteUserData(
      user.id,
      parsed.data.reason,
    );

    if (result.status !== "completed") {
      // Honest failure: the RPC or the auth-user delete failed. Never report
      // success when the account was not actually erased.
      await writeAuditLog({
        userId: user.id,
        action: "gdpr_erasure_api_failed",
        resourceType: "user_account",
        request,
        details: { status: result.status, error: result.error ?? null },
      });

      return NextResponse.json(
        {
          success: false,
          error: "Account erasure failed",
          status: result.status,
          detail: result.error,
        },
        { status: 500 },
      );
    }

    await writeAuditLog({
      userId: user.id,
      action: "gdpr_erasure_api_completed",
      resourceType: "user_account",
      request,
    });

    return NextResponse.json({
      success: true,
      status: result.status,
      completionDate: result.completionDate,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    await writeAuditLog({
      userId: user.id,
      action: "gdpr_erasure_api_failed",
      resourceType: "user_account",
      request,
      details: { error: message },
    });

    return NextResponse.json(
      { success: false, error: "Account erasure failed", detail: message },
      { status: 500 },
    );
  }
});
