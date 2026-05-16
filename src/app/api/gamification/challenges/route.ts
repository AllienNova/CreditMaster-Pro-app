/**
 * Community Challenges API
 * GET /api/gamification/challenges - Get active and upcoming challenges
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { getCommunityChallengesService } from "@/lib/gamification";

export const GET = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "active";

    const service = getCommunityChallengesService();

    let challenges;
    if (status === "upcoming") {
      challenges = await service.getUpcomingChallenges();
    } else {
      challenges = await service.getActiveChallenes();
    }

    const participations = await service.getUserParticipations(user.id);
    const joinedIds = new Set(participations.map((p) => p.challengeId));

    const result = challenges.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      type: c.type,
      status: c.status,
      startDate: c.startDate,
      endDate: c.endDate,
      goalValue: c.goalValue,
      goalUnit: c.goalUnit,
      participants: c.currentParticipants,
      xpReward: c.xpReward,
      userJoined: joinedIds.has(c.id),
      userProgress: participations.find((p) => p.challengeId === c.id)
        ?.currentProgress,
    }));

    return NextResponse.json({ challenges: result });
  } catch (error) {
    console.error("Error fetching challenges:", error);
    return NextResponse.json(
      { error: "Failed to fetch challenges" },
      { status: 500 },
    );
  }
});
