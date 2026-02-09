/**
 * Savings Automation API Routes
 * GET /api/financial/savings - Get savings summary, rules, and goals
 * POST /api/financial/savings - Create a new savings rule or goal
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtValidation } from '@/lib/auth/jwt-validation';
import { savingsAutomationService } from '@/lib/financial/savings-automation-service';

export async function GET(request: NextRequest) {
  try {
    const validation = await jwtValidation.validateFromHeaders(request);
    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'summary';

    const userId = validation.user.id;

    switch (type) {
      case 'summary': {
        const summary = await savingsAutomationService.getSummary(userId);
        const insights = await savingsAutomationService.getInsights(userId);
        const recommendations =
          await savingsAutomationService.getRecommendations(userId);
        return NextResponse.json({
          success: true,
          data: { summary, insights, recommendations },
        });
      }

      case 'rules': {
        const rules = await savingsAutomationService.getRules(userId);
        return NextResponse.json({
          success: true,
          data: { rules },
        });
      }

      case 'goals': {
        const goals = await savingsAutomationService.getGoals(userId);
        return NextResponse.json({
          success: true,
          data: { goals },
        });
      }

      case 'all': {
        const [summary, rules, goals, insights, recommendations] =
          await Promise.all([
            savingsAutomationService.getSummary(userId),
            savingsAutomationService.getRules(userId),
            savingsAutomationService.getGoals(userId),
            savingsAutomationService.getInsights(userId),
            savingsAutomationService.getRecommendations(userId),
          ]);
        return NextResponse.json({
          success: true,
          data: { summary, rules, goals, insights, recommendations },
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid type parameter' },
          { status: 400 }
        );
    }
  } catch (_error) {
    // SavingsRoute error: Failed to fetch savings data
    void _error;
    return NextResponse.json(
      { error: 'Failed to fetch savings data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const validation = await jwtValidation.validateFromHeaders(request);
    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, ...data } = body;
    const userId = validation.user.id;

    switch (action) {
      case 'create_rule': {
        const rule = await savingsAutomationService.createRule(userId, {
          name: data.name,
          type: data.type,
          frequency: data.frequency,
          config: data.config || {},
          goalId: data.goalId,
          sourceAccountId: data.sourceAccountId,
          destinationAccountId: data.destinationAccountId,
        });
        return NextResponse.json({ success: true, data: { rule } });
      }

      case 'create_goal': {
        const goal = await savingsAutomationService.createGoal(userId, {
          name: data.name,
          category: data.category,
          targetAmount: data.targetAmount,
          targetDate: data.targetDate ? new Date(data.targetDate) : undefined,
          priority: data.priority,
          autoSaveEnabled: data.autoSaveEnabled,
          icon: data.icon,
          color: data.color,
          notes: data.notes,
        });
        return NextResponse.json({ success: true, data: { goal } });
      }

      case 'add_contribution': {
        const contribution = await savingsAutomationService.addContribution(
          userId,
          {
            goalId: data.goalId,
            amount: data.amount,
            source: data.source,
            note: data.note,
          }
        );
        return NextResponse.json({ success: true, data: { contribution } });
      }

      case 'calculate_roundup': {
        const calculation = savingsAutomationService.calculateRoundUp(
          data.amount,
          data.roundUpTo || 1,
          data.multiplier || 1
        );
        return NextResponse.json({ success: true, data: { calculation } });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (_error) {
    // SavingsRoute error: Failed to process savings action
    void _error;
    return NextResponse.json(
      { error: 'Failed to process savings action' },
      { status: 500 }
    );
  }
}
