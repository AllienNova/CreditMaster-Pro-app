import { NextRequest, NextResponse } from 'next/server';
import { financialService } from '@/lib/financial/financial-service';
import { jwtValidation } from '@/lib/auth/jwt-validation';
import { rbac } from '@/lib/auth/rbac';

export async function GET(request: NextRequest) {
  try {
    // Validate JWT token
    const validation = await jwtValidation.validateFromHeaders(request.headers);

    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions (premium feature)
    if (!rbac.hasPermission(validation.user, 'financial:create_budgets')) {
      return NextResponse.json({ error: 'Forbidden - Premium feature' }, { status: 403 });
    }

    // Extract userId from validated token
    const userId = validation.user.id;

    const budgets = await financialService.getBudgets(userId);

    return NextResponse.json({
      success: true,
      data: budgets,
    });
  } catch (error) {
    console.error('Error fetching budgets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch budgets' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Validate JWT token
    const validation = await jwtValidation.validateFromHeaders(request.headers);

    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions (premium feature)
    if (!rbac.hasPermission(validation.user, 'financial:create_budgets')) {
      return NextResponse.json({ error: 'Forbidden - Premium feature' }, { status: 403 });
    }

    // Extract userId from validated token
    const userId = validation.user.id;

    const body = await request.json();
    const { category, amount, period } = body;

    if (!category || !amount || !period) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const budget = await financialService.createBudget(userId, category, amount, period);

    return NextResponse.json({
      success: true,
      data: budget,
    });
  } catch (error) {
    console.error('Error creating budget:', error);
    return NextResponse.json(
      { error: 'Failed to create budget' },
      { status: 500 }
    );
  }
}

