import { NextRequest, NextResponse } from 'next/server';
import { financialService } from '@/lib/financial/financial-service';
import { jwtValidation } from '@/lib/auth/jwt-validation';
import { rbac } from '@/lib/auth/rbac';

export async function GET(request: NextRequest) {
  try {
    // Validate JWT token
    const validation = await jwtValidation.validateFromHeaders(request);

    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions (premium feature)
    if (!rbac.hasPermission(validation.user, 'financial:create_goals')) {
      return NextResponse.json({ error: 'Forbidden - Premium feature' }, { status: 403 });
    }

    // Extract userId from validated token
    const userId = validation.user.id;

    const goals = await financialService.getFinancialGoals(userId);

    return NextResponse.json({
      success: true,
      data: goals,
    });
  } catch (error) {
    console.error('Error fetching financial goals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch financial goals' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Validate JWT token
    const validation = await jwtValidation.validateFromHeaders(request);

    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions (premium feature)
    if (!rbac.hasPermission(validation.user, 'financial:create_goals')) {
      return NextResponse.json({ error: 'Forbidden - Premium feature' }, { status: 403 });
    }

    // Extract userId from validated token
    const userId = validation.user.id;

    const body = await request.json();
    const { type, name, targetAmount, targetDate } = body;

    if (!type || !name || !targetAmount || !targetDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const goal = await financialService.createFinancialGoal(
      userId,
      type,
      name,
      targetAmount,
      new Date(targetDate)
    );

    return NextResponse.json({
      success: true,
      data: goal,
    });
  } catch (error) {
    console.error('Error creating financial goal:', error);
    return NextResponse.json(
      { error: 'Failed to create financial goal' },
      { status: 500 }
    );
  }
}

