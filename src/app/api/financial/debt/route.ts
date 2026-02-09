/**
 * Debt Payoff API Route
 * GET /api/financial/debt - Get debt overview and payoff plans
 * POST /api/financial/debt - Add new debt
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtValidation } from '@/lib/auth/jwt-validation';
import { debtPayoffService } from '@/lib/financial/debt-payoff-service';
import type {
  Debt,
  PayoffStrategy,
} from '@/lib/financial/types/debt-payoff.types';

// Mock debts for demo - in production, fetch from database
function getMockDebts(userId: string): Debt[] {
  return [
    {
      id: 'debt-1',
      userId,
      name: 'Chase Sapphire',
      type: 'credit_card',
      balance: 4500,
      originalBalance: 5000,
      interestRate: 24.99,
      minimumPayment: 135,
      dueDate: '2025-01-15',
      creditorName: 'Chase',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'debt-2',
      userId,
      name: 'Capital One Quicksilver',
      type: 'credit_card',
      balance: 2800,
      originalBalance: 3500,
      interestRate: 22.99,
      minimumPayment: 84,
      dueDate: '2025-01-20',
      creditorName: 'Capital One',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'debt-3',
      userId,
      name: 'Discover It',
      type: 'credit_card',
      balance: 1200,
      originalBalance: 2000,
      interestRate: 19.99,
      minimumPayment: 36,
      dueDate: '2025-01-25',
      creditorName: 'Discover',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'debt-4',
      userId,
      name: 'Auto Loan',
      type: 'auto_loan',
      balance: 12500,
      originalBalance: 18000,
      interestRate: 6.5,
      minimumPayment: 350,
      dueDate: '2025-01-10',
      creditorName: 'Toyota Financial',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'debt-5',
      userId,
      name: 'Student Loan',
      type: 'student_loan',
      balance: 28000,
      originalBalance: 35000,
      interestRate: 5.5,
      minimumPayment: 280,
      dueDate: '2025-01-05',
      creditorName: 'Navient',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}

export async function GET(request: NextRequest) {
  try {
    const validation = await jwtValidation.validateFromHeaders(request);
    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const strategy =
      (searchParams.get('strategy') as PayoffStrategy) || 'avalanche';
    const extraPayment = parseFloat(searchParams.get('extraPayment') || '0');
    const compare = searchParams.get('compare') === 'true';

    const debts = getMockDebts(validation.user.id);
    const overview = debtPayoffService.calculateOverview(debts, 5000); // Assume $5k monthly income

    const currentPlan = debtPayoffService.calculatePayoffPlan(
      debts,
      strategy,
      extraPayment
    );
    const comparison = compare
      ? debtPayoffService.compareStrategies(debts, extraPayment)
      : undefined;

    const milestones = debtPayoffService.generateMilestones(currentPlan, debts);
    const insights = debtPayoffService.generateInsights(overview, currentPlan);

    return NextResponse.json({
      success: true,
      data: {
        overview,
        debts,
        currentPlan,
        comparison,
        milestones,
        insights,
      },
    });
  } catch (_error) {
    // DebtRoute error: Failed to fetch debt data
    void _error;
    return NextResponse.json(
      { error: 'Failed to fetch debt data' },
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
    const {
      name,
      type,
      balance,
      interestRate,
      minimumPayment,
      dueDate,
      creditorName,
    } = body;

    if (!name || !type || !balance || !interestRate || !minimumPayment) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // In production, save to database
    const newDebt: Debt = {
      id: `debt-${Date.now()}`,
      userId: validation.user.id,
      name,
      type,
      balance,
      originalBalance: balance,
      interestRate,
      minimumPayment,
      dueDate,
      creditorName,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: newDebt,
    });
  } catch (_error) {
    // DebtRoute error: Failed to create debt
    void _error;
    return NextResponse.json(
      { error: 'Failed to create debt' },
      { status: 500 }
    );
  }
}
