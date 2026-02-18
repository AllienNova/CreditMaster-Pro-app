/**
 * AI Insights API
 * GET /api/ai/insights - Get personalized AI insights
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getBehavioralCoach,
  getSpendingAnalyzer,
} from "@/lib/ai-personalization";
import type { InsightsResponse } from "@/lib/ai-personalization";

export async function GET(request: NextRequest) {
  try {
    // AUTHENTICATION CHECK - Required for all AI endpoints
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const coach = getBehavioralCoach();
    const analyzer = getSpendingAnalyzer();

    // Get user profile
    const profile = await coach.getUserProfile(user.id);

    // Analyze spending patterns
    const analysis = await analyzer.analyzeSpendingPatterns(user.id, 30);

    // Create coaching session for insights
    const session = await coach.createCoachingSession(user.id, "weekly_review");

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
}
