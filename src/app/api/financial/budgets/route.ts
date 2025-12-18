/**
 * Budget API Routes
 *
 * GET /api/financial/budgets - List all budgets for user
 * POST /api/financial/budgets - Create a new budget
 */

import { NextRequest, NextResponse } from 'next/server';
import { budgetService } from '@/lib/financial/budget-service';
import { jwtValidation } from '@/lib/auth/jwt-validation';
import { rbac } from '@/lib/auth/rbac';
import {
  CreateBudgetInput,
  BudgetCategoryValue,
  BudgetPeriod,
  BUDGET_CATEGORIES,
} from '@/lib/financial/types/budget.types';

/**
 * GET /api/financial/budgets
 * List all budgets for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Validate JWT token
    const validation = await jwtValidation.validateFromHeaders(request);

    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions (premium feature)
    if (!rbac.hasPermission(validation.user, 'financial:read')) {
      return NextResponse.json(
        { error: 'Forbidden - Premium feature' },
        { status: 403 }
      );
    }

    const userId = validation.user.id;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';
    const category = searchParams.get('category') as BudgetCategoryValue | null;

    const budgets = await budgetService.getBudgetsByUser(userId, {
      activeOnly,
      category: category || undefined,
    });

    return NextResponse.json({
      success: true,
      data: budgets,
      count: budgets.length,
    });
  } catch (error) {
    console.error('Error fetching budgets:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch budgets',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/financial/budgets
 * Create a new budget
 */
export async function POST(request: NextRequest) {
  try {
    // Validate JWT token
    const validation = await jwtValidation.validateFromHeaders(request);

    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions (premium feature)
    if (!rbac.hasPermission(validation.user, 'financial:create_budgets')) {
      return NextResponse.json(
        { error: 'Forbidden - Premium feature' },
        { status: 403 }
      );
    }

    const userId = validation.user.id;

    const body = await request.json();
    const {
      name,
      category,
      budgetedAmount,
      period,
      rolloverEnabled,
      alertThreshold,
    } = body;

    // Validate required fields
    if (!name || !category || !budgetedAmount || !period) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          required: ['name', 'category', 'budgetedAmount', 'period'],
        },
        { status: 400 }
      );
    }

    // Validate category
    const validCategories = Object.values(BUDGET_CATEGORIES);
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        {
          error: 'Invalid category',
          validCategories,
        },
        { status: 400 }
      );
    }

    // Validate period
    const validPeriods: BudgetPeriod[] = [
      'weekly',
      'biweekly',
      'monthly',
      'quarterly',
      'yearly',
    ];
    if (!validPeriods.includes(period)) {
      return NextResponse.json(
        {
          error: 'Invalid period',
          validPeriods,
        },
        { status: 400 }
      );
    }

    // Validate amount
    if (typeof budgetedAmount !== 'number' || budgetedAmount <= 0) {
      return NextResponse.json(
        { error: 'Budget amount must be a positive number' },
        { status: 400 }
      );
    }

    // Validate alert threshold if provided
    if (
      alertThreshold !== undefined &&
      (typeof alertThreshold !== 'number' ||
        alertThreshold < 0 ||
        alertThreshold > 100)
    ) {
      return NextResponse.json(
        { error: 'Alert threshold must be between 0 and 100' },
        { status: 400 }
      );
    }

    const input: CreateBudgetInput = {
      userId,
      name,
      category,
      budgetedAmount,
      period,
      rolloverEnabled,
      alertThreshold,
    };

    const budget = await budgetService.createBudget(input);

    return NextResponse.json(
      {
        success: true,
        data: budget,
        message: 'Budget created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating budget:', error);
    return NextResponse.json(
      {
        error: 'Failed to create budget',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
