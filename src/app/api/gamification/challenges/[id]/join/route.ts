/**
 * Join a community challenge.
 *
 * POST /api/gamification/challenges/[id]/join
 *
 * `CommunityChallengesService.joinChallenge` (community-challenges-service.ts:366)
 * was complete — status and capacity guards, an atomic participant-count RPC —
 * and nothing could call it. GET /api/gamification/challenges already told a
 * member whether they had joined; there was no way to become joined.
 *
 * The user ID comes from the guard, never the body: a caller must not be able
 * to enrol somebody else by naming them.
 *
 * WHY THE ERROR MAPPING IS EXPLICIT. Every failure here is a fact the member
 * should be told, not a generic 500:
 *
 *   no such challenge          -> 404
 *   closed, or already full    -> 409, with the reason
 *   already joined (23505)     -> 409, and this is the common one
 *
 * user_challenge_participation carries UNIQUE(user_id, challenge_id)
 * (20260120000000:140), so a double-join is rejected by the database rather
 * than by a check-then-insert race. The insert runs BEFORE the participant
 * count is incremented, so a rejected duplicate cannot inflate the count.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { getCommunityChallengesService } from "@/lib/gamification";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** `/api/gamification/challenges/<id>/join` — the id is the penultimate segment. */
function challengeIdFrom(request: NextRequest): string {
  const segments = request.nextUrl.pathname.split("/").filter(Boolean);
  return segments[segments.length - 2] ?? "";
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === "23505"
  );
}

export const POST = withAuth(
  async (request: NextRequest, user: AuthedUser) => {
    const challengeId = challengeIdFrom(request);
    if (!UUID.test(challengeId)) {
      return NextResponse.json(
        { error: "Invalid challenge id" },
        { status: 400 },
      );
    }

    try {
      const participant = await getCommunityChallengesService().joinChallenge(
        challengeId,
        // From the verified session. A body-supplied id would let one member
        // enrol another.
        user.id,
      );

      return NextResponse.json({ participant }, { status: 201 });
    } catch (error) {
      if (isUniqueViolation(error)) {
        return NextResponse.json(
          { error: "You have already joined this challenge" },
          { status: 409 },
        );
      }

      const message = error instanceof Error ? error.message : "";

      if (message === "Challenge not found") {
        return NextResponse.json(
          { error: "Challenge not found" },
          { status: 404 },
        );
      }
      if (
        message === "Challenge is not open for joining" ||
        message === "Challenge is full"
      ) {
        return NextResponse.json({ error: message }, { status: 409 });
      }

      console.error("[challenges/:id/join] failed", error);
      return NextResponse.json(
        { error: "Could not join that challenge" },
        { status: 500 },
      );
    }
  },
);
