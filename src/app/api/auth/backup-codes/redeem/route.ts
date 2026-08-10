/**
 * Backup-code redemption — the recovery path for a user who has lost their
 * authenticator.
 *
 * This is the ONE route that may be reached at `aal1`, and it has to be: a user
 * stuck without their second factor is at aal1 by definition, so guarding it
 * with plain `withAuth` would refuse the exact request that exists to un-stick
 * them.
 *
 * WHY THE SERVER HAS TO DO THIS. `mfa.unenroll` requires aal2 to remove a
 * verified factor (@supabase/auth-js types.d.ts:1012), which a locked-out user
 * cannot reach — that is the whole predicament. And Supabase issues no recovery
 * codes of its own: "Supabase does not return recovery codes"
 * (supabase.com/docs/guides/platform/multi-factor-authentication). So the only
 * viable design is: verify a code server-side, then remove the factor with the
 * admin API on the user's behalf.
 *
 * The server never mints or elevates a session. Deleting a verified factor logs
 * the user out of all sessions (types.d.ts:1087-1089); they sign in again with
 * their password, now hold no factor, and are asked to re-enrol.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  withAuthAllowingAal1,
  type AuthedUser,
} from "@/lib/auth/api-guard";
import { redeemBackupCode } from "@/lib/auth/backup-codes-server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { authRateLimiter } from "@/lib/security/redis-rate-limiting";
import { logger } from "@/lib/monitoring/logger";

/**
 * One response for "no such code" and for "already used".
 *
 * Distinguishing them tells an attacker which guesses were once valid, which is
 * a meaningful hint when the set is only ten codes wide. Same status, same body,
 * same shape.
 */
const REJECTED = {
  body: { error: "invalid_code", message: "That backup code is not valid." },
  init: { status: 400 as const },
};

export const POST = withAuthAllowingAal1(
  async (request: NextRequest, user: AuthedUser) => {
    // Keyed on the authenticated user, never on anything from the request:
    // an IP key is trivially rotated, and a body-supplied id would let an
    // attacker exhaust someone else's budget to lock THEM out.
    const limit = await authRateLimiter.check(`backup-redeem:${user.id}`);
    if (!limit.allowed) {
      logger.warn("backup code: rate limited", { userId: user.id });
      return NextResponse.json(
        {
          error: "rate_limited",
          message: "Too many attempts. Try again later.",
        },
        { status: 429 },
      );
    }

    let code: unknown;
    try {
      ({ code } = await request.json());
    } catch {
      return NextResponse.json(REJECTED.body, REJECTED.init);
    }

    if (typeof code !== "string" || code.length === 0 || code.length > 64) {
      // Bounded before hashing: scrypt on an unbounded input is a CPU DoS.
      return NextResponse.json(REJECTED.body, REJECTED.init);
    }

    let redeemed = false;
    try {
      redeemed = await redeemBackupCode(user.id, code);
    } catch (error) {
      logger.error("backup code: redemption failed", error as Error, {
        userId: user.id,
      });
      return NextResponse.json(
        { error: "server_error", message: "Could not process that code." },
        { status: 500 },
      );
    }

    if (!redeemed) {
      logger.warn("backup code: rejected", { userId: user.id });
      return NextResponse.json(REJECTED.body, REJECTED.init);
    }

    // The code is spent whether or not the unenrol below succeeds. That
    // ordering is deliberate: a code that could be replayed after a partial
    // failure is worse than a user who has to spend a second code.
    const removed = await removeVerifiedFactors(user.id);

    logger.info("backup code: redeemed", {
      userId: user.id,
      factorsRemoved: removed,
    });

    return NextResponse.json(
      {
        success: true,
        factorsRemoved: removed,
        message:
          "Backup code accepted. Your authenticator has been removed and you have been signed out — sign in again and set up a new authenticator.",
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, private",
        },
      },
    );
  },
);

/**
 * Remove every verified factor for the user.
 *
 * Returns the count rather than throwing on a partial failure: the code has
 * already been consumed by this point, so aborting would leave the user holding
 * a spent code AND a factor they still cannot use.
 */
async function removeVerifiedFactors(userId: string): Promise<number> {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.mfa.listFactors({
      userId,
    });
    if (error) throw error;

    const verified = (data?.factors ?? []).filter(
      (f) => f.status === "verified",
    );

    let removed = 0;
    for (const factor of verified) {
      const { error: delError } =
        await supabaseAdmin.auth.admin.mfa.deleteFactor({
          id: factor.id,
          userId,
        });
      if (delError) {
        logger.error("backup code: factor removal failed", delError as Error, {
          userId,
          factorId: factor.id,
        });
        continue;
      }
      removed += 1;
    }
    return removed;
  } catch (error) {
    logger.error("backup code: factor enumeration failed", error as Error, {
      userId,
    });
    return 0;
  }
}
