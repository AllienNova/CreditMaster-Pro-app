/**
 * Gamification Events API
 * POST /api/gamification/events - Process a game event
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGamificationEngine } from '@/lib/gamification';
import type { GameEvent, GameEventType } from '@/lib/gamification';

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
    const { eventType, metadata } = body;

    if (!eventType) {
      return NextResponse.json(
        { error: 'Event type required' },
        { status: 400 }
      );
    }

    const event: GameEvent = {
      type: eventType as GameEventType,
      userId: user.id,
      timestamp: new Date().toISOString(),
      metadata,
    };

    const engine = getGamificationEngine();
    const result = await engine.processGameEvent(event);

    return NextResponse.json({
      xpEarned: result.xpEarned,
      newBadges: result.newBadges,
      levelUp: result.levelUp,
      streakUpdate: result.streakUpdate,
      questsCompleted: result.questsCompleted,
      challengeProgress: result.challengeProgress,
    });
  } catch (error) {
    console.error('Error processing game event:', error);
    return NextResponse.json(
      { error: 'Failed to process event' },
      { status: 500 }
    );
  }
}
