/**
 * Gamification Quests API
 * GET /api/gamification/quests - Get daily quests
 * POST /api/gamification/quests - Complete a quest
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGamificationEngine } from '@/lib/gamification';
import type { QuestsResponse } from '@/lib/gamification';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const engine = getGamificationEngine();
    const { quests, progress } = await engine.getDailyQuests(user.id);

    const today = quests.map((quest) => ({
      id: '',
      odgeId: quest.id,
      quest,
      questDate: new Date().toISOString().split('T')[0],
      isCompleted: progress[quest.id] === 100,
      completedAt: progress[quest.id] === 100 ? new Date().toISOString() : null,
      progressValue: progress[quest.id] ?? 0,
      userId: user.id,
      questId: quest.id,
    }));

    const completedCount = today.filter((q) => q.isCompleted).length;
    const availableXp = quests
      .filter((q) => progress[q.id] !== 100)
      .reduce((sum, q) => sum + q.xpReward, 0);

    const response: QuestsResponse = {
      today,
      completedToday: completedCount,
      totalToday: quests.length,
      availableXp,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching quests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quests' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { questId } = body;

    if (!questId) {
      return NextResponse.json({ error: 'Quest ID required' }, { status: 400 });
    }

    const engine = getGamificationEngine();
    const result = await engine.completeQuest(user.id, questId);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Quest already completed or not found' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      xpEarned: result.xpEarned,
    });
  } catch (error) {
    console.error('Error completing quest:', error);
    return NextResponse.json(
      { error: 'Failed to complete quest' },
      { status: 500 }
    );
  }
}
