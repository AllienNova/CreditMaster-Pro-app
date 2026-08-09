/**
 * AI Insights API
 * GET /api/ai/insights - Get personalized AI insights
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import {
  getBehavioralCoach,
  getSpendingAnalyzer,
} from "@/lib/ai-personalization";
import type { InsightsResponse } from "@/lib/ai-personalization";

export const GET = withAuth(
  async (_request: NextRequest, user: AuthedUser) => {
    try {
      const coach = getBehavioralCoach();
      const analyzer = getSpendingAnalyzer();

      // Get user profile
      const profile = await coach.getUserProfile(user.id);

      // Analyze spending patterns
      const analysis = await analyzer.analyzeSpendingPatterns(user.id, 30);
      void analysis;

      // Create coaching session for insights
      const session = await coach.createCoachingSession(
        user.id,
        "weekly_review",
      );

      const response: InsightsResponse = {
        insights: session.content.insights,
        coaching: {
          currentTopic: session.topic,
          suggestedActions: session.content.actionItems,
        },
        personality: {
          type: profile?.financialPersonality ?? null,
          riskScore: profile?.riskToleranceScore ?? null,
          biases: profile?.biases ?? null,
        },
      };

      return NextResponse.json(response);
    } catch (error) {
      console.error("Error fetching AI insights:", error);
      return NextResponse.json(
        { error: "Failed to fetch insights" },
        { status: 500 },
      );
    }
  },
);
