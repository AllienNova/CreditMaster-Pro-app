/**
 * Shared goals API.
 *
 * GET /api/goals/shared — the shared savings goals the caller belongs to.
 *
 * WHY THIS ROUTE IS NEW, and the fourth unexposed feature of the session.
 * `src/lib/gamification/shared-goals-service.ts` has 33 database calls and no
 * randomness, including `getUserGoals`. Nothing under src/app called it, so
 * /goals/shared rendered a hardcoded "Dream Home Down Payment" — $42,500 saved
 * of $60,000, with members and their contributions, including "You,
 * contributed $24,000".
 *
 * NOTE ON HOW THIS ONE HID. `audit:reachable-services` did NOT flag the
 * service, because reachability there is module-level: routes import
 * `@/lib/gamification` for getAchievementService and
 * getCommunityChallengesService, and the barrel re-exports shared-goals too, so
 * the whole subtree counted as reached. `getSharedGoalsService` was called
 * nowhere. That gap is documented in the audit's header and tracked as task
 * #104; this route is one of the services it was hiding.
 *
 * IDOR: `getUserGoals` takes a userId and this route passes `user.id` from the
 * auth guard, never a client-supplied id. Shared goals are shared with named
 * members, so returning someone else's would leak both the goal and the
 * members' contribution amounts.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { getSharedGoalsService } from "@/lib/gamification/shared-goals-service";

export const GET = withAuth(async (_request: NextRequest, user: AuthedUser) => {
  try {
    const service = getSharedGoalsService();

    // user.id comes from the auth guard, never from the request (route-contract §2).
    const goals = await service.getUserGoals(user.id);

    return NextResponse.json({
      success: true,
      data: { goals, total: goals.length },
    });
  } catch (error) {
    // Honest infra failure. Having no shared goals and being unable to load
    // them must not look the same (route-contract §3).
    console.error("Shared goals GET failed", {
      userId: user.id,
      route: "/api/goals/shared",
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { success: false, error: "Failed to load shared goals" },
      { status: 500 },
    );
  }
});
