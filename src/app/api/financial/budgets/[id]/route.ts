/**
 * Individual Budget API Routes
 *
 * GET /api/financial/budgets/[id] - Get a specific budget
 * PATCH /api/financial/budgets/[id] - Update a budget
 * DELETE /api/financial/budgets/[id] - Delete a budget
 */

import { NextRequest, NextResponse } from 'next/server';
import { budgetService } from '@/lib/financial/budget-service';
import { jwtValidation } from '@/lib/auth/jwt-validation';
import { rbac } from '@/lib/auth/rbac';
import {
  UpdateBudgetInput,
  BudgetCategoryValue,
  BudgetPeriod,
  BUDGET_CATEGORIES,
} from '@/lib/financial/types/budget.types';

/**
 * GET /api/financial/budgets/[id]
 * Get a specific budget by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Validate JWT token
    const validation = await jwtValidation.validateFromHeaders(request);

    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!rbac.hasPermission(validation.user, 'financial:read')) {
      return NextResponse.json(
        { error: 'Forbidden - Premium feature' },
        { status: 403 }
      );
    }

    const userId = validation.user.id;
    const { id: budgetId } = await params;

    const budget = await budgetService.getBudgetById(budgetId, userId);

    if (!budget) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: budget,
    });
  } catch (_error) {
    // BudgetsRoute error: Failed to fetch budget
    return NextResponse.json(
      {
        error: 'Failed to fetch budget',
        message: _error instanceof Error ? _error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/financial/budgets/[id]
 * Update a budget
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Validate JWT token
    const validation = await jwtValidation.validateFromHeaders(request);

    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!rbac.hasPermission(validation.user, 'financial:create_budgets')) {
      return NextResponse.json(
        { error: 'Forbidden - Premium feature' },
        { status: 403 }
      );
    }

    const userId = validation.user.id;
    const { id: budgetId } = await params;

    const body = await request.json();
    const {
      name,
      budgetedAmount,
      period,
      rolloverEnabled,
      alertThreshold,
      isActive,
    } = body;

    // Validate period if provided
    if (period) {
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
    }

    // Validate amount if provided
    if (budgetedAmount !== undefined) {
      if (typeof budgetedAmount !== 'number' || budgetedAmount <= 0) {
        return NextResponse.json(
          { error: 'Budget amount must be a positive number' },
          { status: 400 }
        );
      }
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

    const updates: UpdateBudgetInput = {};
    if (name !== undefined) updates.name = name;
    if (budgetedAmount !== undefined) updates.budgetedAmount = budgetedAmount;
    if (period !== undefined) updates.period = period;
    if (rolloverEnabled !== undefined)
      updates.rolloverEnabled = rolloverEnabled;
    if (alertThreshold !== undefined) updates.alertThreshold = alertThreshold;
    if (isActive !== undefined) updates.isActive = isActive;

    const budget = await budgetService.updateBudget(budgetId, userId, updates);

    if (!budget) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: budget,
      message: 'Budget updated successfully',
    });
  } catch (_error) {
    // BudgetsRoute error: Failed to update budget
    return NextResponse.json(
      {
        error: 'Failed to update budget',
        message: _error instanceof Error ? _error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/financial/budgets/[id]
 * Delete a budget
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Validate JWT token
    const validation = await jwtValidation.validateFromHeaders(request);

    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!rbac.hasPermission(validation.user, 'financial:create_budgets')) {
      return NextResponse.json(
        { error: 'Forbidden - Premium feature' },
        { status: 403 }
      );
    }

    const userId = validation.user.id;
    const { id: budgetId } = await params;

    const success = await budgetService.deleteBudget(budgetId, userId);

    if (!success) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Budget deleted successfully',
    });
  } catch (_error) {
    // BudgetsRoute error: Failed to delete budget
    return NextResponse.json(
      {
        error: 'Failed to delete budget',
        message: _error instanceof Error ? _error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
