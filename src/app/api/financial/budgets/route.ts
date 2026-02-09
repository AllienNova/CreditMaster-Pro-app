/**
 * Budget API Routes
 *
 * GET /api/financial/budgets - List all budgets for user
 * POST /api/financial/budgets - Create a new budget
 *
 * Uses the new withPermission guard for consistent authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { budgetService } from '@/lib/financial/budget-service';
import { withPermission } from '@/lib/auth/api-guard';
import { JWTUser } from '@/lib/auth/jwt-validation';
import {
  CreateBudgetInput,
  BudgetCategoryValue,
  BudgetPeriod,
  BUDGET_CATEGORIES,
} from '@/lib/financial/types/budget.types';

/**
 * GET /api/financial/budgets
 * List all budgets for the authenticated user
 * Requires: financial:read permission
 */
export const GET = withPermission('financial:read', async (request: NextRequest, user: JWTUser) => {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';
    const category = searchParams.get('category') as BudgetCategoryValue | null;

    const budgets = await budgetService.getBudgetsByUser(user.id, {
      activeOnly,
      category: category || undefined,
    });

    return NextResponse.json({
      success: true,
      data: budgets,
      count: budgets.length,
    });
  } catch (_error) {
    // BudgetsRoute error: Failed to fetch budgets
    return NextResponse.json(
      {
        error: 'Failed to fetch budgets',
        message: _error instanceof Error ? _error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});

/**
 * POST /api/financial/budgets
 * Create a new budget
 * Requires: financial:create_budgets permission
 */
export const POST = withPermission('financial:create_budgets', async (request: NextRequest, user: JWTUser) => {
  try {
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
      userId: user.id,
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
  } catch (_error) {
    // BudgetsRoute error: Failed to create budget
    return NextResponse.json(
      {
        error: 'Failed to create budget',
        message: _error instanceof Error ? _error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});
