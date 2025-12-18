/**
 * Debt Payoff Calculator API Route
 * POST /api/financial/debt/calculate - Calculate payoff plan with custom parameters
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtValidation } from '@/lib/auth/jwt-validation';
import { debtPayoffService } from '@/lib/financial/debt-payoff-service';
import type { Debt, PayoffStrategy } from '@/lib/financial/types/debt-payoff.types';

export async function POST(request: NextRequest) {
  try {
    const validation = await jwtValidation.validateFromHeaders(request);
    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      debts,
      strategy = 'avalanche',
      extraPayment = 0,
      monthlyIncome,
      compareAll = false,
    } = body as {
      debts: Debt[];
      strategy?: PayoffStrategy;
      extraPayment?: number;
      monthlyIncome?: number;
      compareAll?: boolean;
    };

    if (!debts || !Array.isArray(debts) || debts.length === 0) {
      return NextResponse.json({ error: 'Debts array is required' }, { status: 400 });
    }

    // Validate debts
    for (const debt of debts) {
      if (!debt.name || !debt.balance || !debt.interestRate || !debt.minimumPayment) {
        return NextResponse.json({ 
          error: 'Each debt must have name, balance, interestRate, and minimumPayment' 
        }, { status: 400 });
      }
    }

    // Ensure debts have required fields
    const processedDebts: Debt[] = debts.map((d, i) => ({
      ...d,
      id: d.id || `debt-${i}`,
      userId: validation.user!.id,
      originalBalance: d.originalBalance || d.balance,
      isActive: d.isActive !== false,
      createdAt: d.createdAt || new Date().toISOString(),
      updatedAt: d.updatedAt || new Date().toISOString(),
    }));

    const overview = debtPayoffService.calculateOverview(processedDebts, monthlyIncome);
    
    let result;
    if (compareAll) {
      const comparison = debtPayoffService.compareStrategies(processedDebts, extraPayment);
      const currentPlan = comparison[strategy];
      const milestones = debtPayoffService.generateMilestones(currentPlan, processedDebts);
      const insights = debtPayoffService.generateInsights(overview, currentPlan);
      
      result = {
        overview,
        currentPlan,
        comparison,
        milestones,
        insights,
      };
    } else {
      const currentPlan = debtPayoffService.calculatePayoffPlan(processedDebts, strategy, extraPayment);
      const milestones = debtPayoffService.generateMilestones(currentPlan, processedDebts);
      const insights = debtPayoffService.generateInsights(overview, currentPlan);
      
      result = {
        overview,
        currentPlan,
        milestones,
        insights,
      };
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error calculating payoff:', error);
    return NextResponse.json({ error: 'Failed to calculate payoff plan' }, { status: 500 });
  }
}

