/**
 * Backup-code management. Authenticated, and implicitly aal2 for anyone who has
 * a factor.
 *
 * GET  — how many unused codes remain
 * POST — regenerate the set, returning plaintext EXACTLY ONCE
 *
 * FR-011 ("generation requires aal2, or no enrolled factor") needs no extra
 * check here: `withAuth` already refuses aal1 from a user who holds a verified
 * factor. A user with no factor reaches this at aal1, which is correct — they
 * have no second factor to bypass. Adding a redundant aal test would imply the
 * guard is untrustworthy and invite someone to relax one of the two.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import {
  generateBackupCodes,
  countUnusedCodes,
} from "@/lib/auth/backup-codes-server";
import { logger } from "@/lib/monitoring/logger";

export const GET = withAuth(async (_request: NextRequest, user: AuthedUser) => {
  try {
    const remaining = await countUnusedCodes(user.id);
    return NextResponse.json({ remaining });
  } catch (error) {
    logger.error("backup codes: count failed", error as Error, {
      userId: user.id,
    });
    return NextResponse.json(
      { error: "Failed to read backup codes" },
      { status: 500 },
    );
  }
});

export const POST = withAuth(async (_request: NextRequest, user: AuthedUser) => {
  try {
    const { codes } = await generateBackupCodes(user.id);

    // The ONLY time plaintext leaves the server. There is no endpoint to read
    // them back — the table stores scrypt hashes, so a later read is not merely
    // withheld, it is impossible.
    return NextResponse.json(
      {
        codes,
        count: codes.length,
        warning:
          "These codes are shown once. Store them somewhere safe — they cannot be retrieved again.",
      },
      {
        status: 201,
        // Recovery codes must never sit in a shared cache or a browser's
        // back-forward cache.
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, private",
        },
      },
    );
  } catch (error) {
    logger.error("backup codes: generation failed", error as Error, {
      userId: user.id,
    });
    return NextResponse.json(
      { error: "Failed to generate backup codes" },
      { status: 500 },
    );
  }
});
