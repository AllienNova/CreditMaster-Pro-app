/**
 * MSW Request Handlers
 *
 * Mock API responses for all AI-powered endpoints
 */

import { rest } from 'msw';

const BASE_URL = 'http://localhost';

export const handlers = [
  // 1. Financial Dashboard - AI Insights
  rest.get(`${BASE_URL}/api/financial/ai-insights`, (req, res, ctx) => {
    return res(ctx.json({
      data: {
        insights: [
          {
            id: '1',
            type: 'warning',
            title: 'High Dining Expenses',
            description: 'Your dining expenses are 45% above average',
            impact: 'medium',
            actionable: true,
            actionLabel: 'View Details',
          },
        ],
        predictions: [
          {
            metric: 'Monthly Savings',
            currentValue: 1200,
            predictedValue: 1650,
            timeframe: '3 months',
            confidence: 82,
            trend: 'up',
          },
        ],
        healthScore: 78,
        healthTrend: 'improving',
        topRecommendation: 'Optimize Subscriptions',
      },
    }));
  }),

  // 2. Budget Management - AI Budget Optimizer
  rest.get(`${BASE_URL}/api/financial/budget/ai-optimize`, (req, res, ctx) => {
    return res(ctx.json({
      data: {
        optimizationScore: 82,
        currentBudget: {
          income: 5000,
          expenses: 4200,
        savings: 800,
      },
      optimizedBudget: {
        income: 5000,
        expenses: 3800,
        savings: 1200,
      },
      categoryOptimizations: [
        {
          category: 'Dining',
          current: 600,
          recommended: 400,
          savings: 200,
          difficulty: 'medium',
          priority: 'high',
        },
      ],
      savingsOpportunities: [
        {
          title: 'Reduce dining expenses',
          amount: 200,
          confidence: 88,
        },
      ],
      },
    }));
  }),

  // 2b. Budget Recommendations (used by AIBudgetOptimizer component)
  rest.get(`${BASE_URL}/api/financial/budgets/recommendations`, (req, res, ctx) => {
    return res(ctx.json({
      data: [
        {
          id: '1',
          category: 'Dining',
          currentAmount: 600,
          suggestedAmount: 400,
          reason: 'Your dining expenses are 50% above average',
          potentialSavings: 200,
          impact: 'high',
        },
        {
          id: '2',
          category: 'Shopping',
          currentAmount: 500,
          suggestedAmount: 350,
          reason: 'Reduce non-essential shopping',
          potentialSavings: 150,
          impact: 'medium',
        },
      ],
    }));
  }),

  // 3. Goals Management - AI Goals Optimizer (used by AIGoalsOptimizer component)
  rest.get(`${BASE_URL}/api/financial/goals/optimizations`, (req, res, ctx) => {
    return res(ctx.json({
      data: {
        autoSaveEnabled: true,
        autoSaveRules: [
          {
            id: '1',
            name: 'Round Up Savings',
            type: 'round_up',
            amount: 1,
            linkedGoalId: 'goal-1',
            linkedGoalName: 'Emergency Fund',
            isActive: true,
            estimatedMonthlySavings: 50,
          },
        ],
        totalAutoSavings: 50,
        optimizations: [
          {
            goalId: 'goal-1',
            goalName: 'Emergency Fund',
            currentContribution: 200,
            recommendedContribution: 300,
            projectedCompletion: '2026-12-31',
            optimizedCompletion: '2026-08-31',
            monthsSaved: 4,
            confidence: 85,
          },
        ],
        achievementPredictions: [
          {
            goalId: 'goal-1',
            goalName: 'Emergency Fund',
            probability: 85,
            projectedDate: '2026-08-31',
            riskFactors: ['Irregular income', 'High expenses'],
          },
        ],
      }
    }));
  }),

  // 3b. Goals Management - Legacy endpoint (for backward compatibility)
  rest.get(`${BASE_URL}/api/financial/goals/ai-optimize`, (req, res, ctx) => {
    return res(ctx.json({
      data: {
        optimizationScore: 85,
        goals: [
          {
            id: '1',
            name: 'Emergency Fund',
            targetAmount: 10000,
            currentAmount: 5000,
            targetDate: '2025-12-31',
            onTrack: true,
            confidence: 92,
          },
        ],
        recommendations: [
          {
            goalId: '1',
            title: 'Increase monthly contribution',
            description: 'Increase from $400 to $500/month',
            impact: 'Reach goal 2 months earlier',
            priority: 'medium',
          },
        ],
      },
    }));
  }),

  // 4. Spending Analysis - AI Spending Insights
  rest.get(`${BASE_URL}/api/financial/spending/ai-insights`, (req, res, ctx) => {
    return res(ctx.json({
      data: {
        spendingScore: 72,
        anomalyScore: 72,
        totalPotentialSavings: 450,
        patterns: [
          {
            category: 'Dining',
            currentSpending: 600,
            averageSpending: 400,
            trend: 'increasing',
            percentChange: 25,
            recommendation: 'Consider reducing dining expenses by cooking at home more often',
            potentialSavings: 200,
            confidence: 85,
          },
        ],
        anomalies: [
          {
            id: '1',
            type: 'unusual_large',
            severity: 'medium',
            description: 'Unusual spending spike in Shopping category',
            amount: 450,
            expectedAmount: 200,
            category: 'Shopping',
            merchant: 'Amazon',
            date: '2025-12-15',
            actionable: true,
          },
        ],
        predictions: [
          {
            metric: 'Monthly Spending',
            currentValue: 3200,
            predictedValue: 2950,
            timeframe: '3 months',
            confidence: 78,
            trend: 'down',
          },
        ],
        recommendations: [
          {
            id: '1',
            title: 'Set dining budget',
            description: 'Limit dining to $400/month',
            category: 'Dining',
            currentAmount: 600,
            targetAmount: 400,
            monthlySavings: 200,
            difficulty: 'medium',
            impact: 'high',
          },
        ],
        categoryInsights: [
          {
            category: 'Dining',
            currentSpending: 600,
            averageSpending: 400,
            trend: 'increasing',
            percentChange: 25,
            recommendation: 'Consider reducing dining expenses by cooking at home more often',
            potentialSavings: 200,
          },
        ],
        reductionRecommendations: [
          {
            id: '1',
            title: 'Set dining budget',
            description: 'Limit dining to $400/month',
            category: 'Dining',
            currentAmount: 600,
            targetAmount: 400,
            monthlySavings: 200,
            difficulty: 'medium',
            impact: 'high',
          },
        ],
      },
    }));
  }),

  // 5. Bills Management - AI Bills Optimizer (used by AIBillsOptimizer component)
  rest.get(`${BASE_URL}/api/financial/bills/optimizations`, (req, res, ctx) => {
    return res(ctx.json({
      data: {
        negotiationOpportunities: [
          {
            id: '1',
            billName: 'Internet Service',
            category: 'Utilities',
            currentAmount: 89,
            estimatedSavings: 25,
            savingsPercentage: 28,
            difficulty: 'easy',
            successProbability: 85,
            bestTimeToCall: 'Weekday mornings',
            tips: ['Mention competitor pricing', 'Ask for loyalty discount'],
          },
        ],
        subscriptionOptimizations: [
          {
            id: '1',
            name: 'Streaming Service',
            amount: 15,
            frequency: 'monthly',
            lastUsed: '2025-11-15',
            usageScore: 30,
            recommendation: 'cancel',
            alternativeSuggestion: 'Use free tier',
            potentialSavings: 15,
          },
        ],
        dueDateOptimizations: [
          {
            billName: 'Credit Card',
            currentDueDate: 5,
            recommendedDueDate: 15,
            reason: 'Align with paycheck schedule',
            benefit: 'Better cash flow management',
          },
        ],
        totalPotentialSavings: 145,
        optimizationScore: 88,
      },
    }));
  }),

  // 5b. Bills Management - Legacy endpoint (for backward compatibility)
  rest.get(`${BASE_URL}/api/financial/bills/ai-optimize`, (req, res, ctx) => {
    return res(ctx.json({
      data: {
        optimizationScore: 88,
        totalMonthlySavings: 145,
        bills: [
          {
            id: '1',
            name: 'Internet',
            amount: 89,
            dueDate: '2025-01-05',
            category: 'Utilities',
            potentialSavings: 25,
          },
        ],
        savingsOpportunities: [
          {
            billId: '1',
            title: 'Switch to cheaper plan',
            savings: 25,
            difficulty: 'easy',
            confidence: 90,
          },
        ],
      },
    }));
  }),

  // 6. Credit Monitoring - AI Credit Insights
  rest.get(`${BASE_URL}/api/financial/credit/ai-insights`, (req, res, ctx) => {
    return res(ctx.json({
      data: {
        creditHealthScore: 78,
        scorePredictions: [
          {
            timeframe: '30_days',
            predictedScore: 665,
            confidence: 85,
            factors: ['Reduced credit utilization', 'On-time payments', 'Account age'],
          },
        ],
        factorImpacts: [
          {
            factor: 'Payment History',
            currentImpact: 'positive',
            impactScore: 35,
            description: 'Your payment history is excellent with 100% on-time payments',
            recommendation: 'Continue making all payments on time',
            potentialImprovement: 0,
          },
        ],
        improvementOpportunities: [
          {
            id: '1',
            title: 'Reduce credit utilization',
            description: 'Lower your credit card balances to below 30% utilization',
            difficulty: 'medium',
            timeframe: '30-60 days',
            potentialIncrease: 25,
            steps: [
              'Pay down high-balance cards first',
              'Request credit limit increases',
              'Avoid new charges',
            ],
            priority: 'high',
          },
        ],
        alerts: [
          {
            id: '1',
            type: 'utilization_spike',
            severity: 'medium',
            title: 'Credit Utilization Alert',
            description: 'Credit utilization increased by 15%',
            date: '2025-12-25',
            actionable: true,
          },
        ],
        recommendedActions: [
          'Pay down credit card balances',
          'Set up automatic payments',
          'Monitor credit reports monthly',
        ],
      },
    }));
  }),

  // 7. Dispute Management - AI Dispute Strategy
  rest.get(`${BASE_URL}/api/financial/disputes/ai-strategy`, (req, res, ctx) => {
    return res(ctx.json({
      data: {
        strategyScore: 85,
        overallSuccessScore: 85,
        disputes: [
          {
            id: '1',
            itemType: 'Late Payment',
            itemDescription: 'Late payment on Chase Bank credit card - March 2024',
            bureau: 'equifax',
            successProbability: 65,
            estimatedImpact: 35,
            recommendedStrategy: 'Goodwill Letter',
            strategyDescription: 'Request goodwill adjustment from creditor based on positive payment history',
            difficulty: 'medium',
            timeline: '30-45 days',
            priority: 'high',
          },
        ],
        recommendations: [
          {
            id: '1',
            title: 'Draft goodwill letter',
            description: 'Use template to request removal of late payment',
            priority: 'high',
            impact: 'medium',
            difficulty: 'easy',
          },
        ],
        opportunities: [
          {
            id: '1',
            itemType: 'Late Payment',
            itemDescription: 'Late payment on Chase Bank credit card - March 2024',
            bureau: 'equifax',
            successProbability: 65,
            estimatedImpact: 35,
            recommendedStrategy: 'Goodwill Letter',
            strategyDescription: 'Request goodwill adjustment from creditor based on positive payment history',
            difficulty: 'medium',
            timeline: '30-45 days',
            priority: 'high',
          },
        ],
        templates: [
          {
            id: '1',
            name: 'Goodwill Adjustment Request',
            description: 'Template for requesting goodwill removal of late payment',
            successRate: 65,
            bestFor: ['Late payments', 'Good payment history', 'Established relationship'],
            steps: [
              'Acknowledge the late payment',
              'Explain circumstances',
              'Highlight positive payment history',
              'Request goodwill adjustment',
            ],
            legalBasis: 'Voluntary creditor action - no legal requirement',
          },
        ],
        evidenceAssessments: [
          {
            itemId: '1',
            itemDescription: 'Late payment on Chase Bank',
            evidenceStrength: 'moderate',
            strengthScore: 70,
            missingEvidence: ['Payment history documentation', 'Proof of circumstances'],
            recommendations: ['Gather bank statements', 'Document hardship if applicable'],
          },
        ],
        timelinePredictions: [
          {
            disputeType: 'Goodwill Letter',
            estimatedDays: 37,
            confidence: 75,
            milestones: [
              { day: 0, event: 'Send goodwill letter' },
              { day: 14, event: 'Follow up if no response' },
              { day: 30, event: 'Expected response' },
            ],
          },
        ],
        recommendedNextSteps: [
          'Draft goodwill letter using template',
          'Gather supporting documentation',
          'Send letter via certified mail',
          'Set reminder for 14-day follow-up',
        ],
      },
    }));
  }),

  // 8. Investments - AI Investment Insights
  rest.get(`${BASE_URL}/api/financial/investments/ai-insights`, (req, res, ctx) => {
    return res(ctx.json({
      data: {
        portfolioHealthScore: 78,
        recommendations: [
          {
            id: '1',
            symbol: 'AAPL',
            name: 'Apple Inc.',
            type: 'buy',
            reasoning: 'Strong fundamentals and growth potential',
            confidence: 85,
            targetPrice: 200,
            currentPrice: 180,
            potentialReturn: 11.1,
            riskLevel: 'medium',
            timeframe: '6-12 months',
          },
        ],
        riskAnalysis: {
          overallRisk: 'medium',
          riskScore: 65,
          factors: [
            {
              factor: 'Market Volatility',
              level: 'medium',
              description: 'Current market conditions show moderate volatility',
            },
          ],
          recommendations: [
            'Consider diversifying into bonds',
            'Maintain emergency fund',
          ],
        },
        diversificationSuggestions: [
          {
            id: '1',
            assetClass: 'Bonds',
            currentAllocation: 20,
            recommendedAllocation: 30,
            reasoning: 'Reduce portfolio volatility and improve risk-adjusted returns',
            impact: 'high',
          },
        ],
        marketPredictions: [
          {
            timeframe: '3_months',
            predictedReturn: 5.5,
            confidence: 75,
            factors: ['Economic growth', 'Interest rates', 'Corporate earnings'],
          },
        ],
        performanceForecasts: [
          {
            period: '1 Year',
            projectedValue: 105000,
            projectedReturn: 8.5,
            confidence: 70,
          },
        ],
        aiInsights: [
          'Your portfolio is well-diversified across sectors',
          'Consider rebalancing to maintain target allocations',
          'Market conditions favor defensive stocks',
        ],
      },
    }));
  }),

  // 9. Credit Builder - AI Credit Roadmap
  rest.get(`${BASE_URL}/api/financial/credit-builder/ai-roadmap`, (req, res, ctx) => {
    return res(ctx.json({
      data: {
        roadmapScore: 85,
        milestones: [
          {
            id: '1',
            title: 'Reduce credit utilization below 30%',
            description: 'Lower your credit card balances to improve your credit score',
            targetScore: 700,
            estimatedDays: 90,
            actions: ['Pay down credit card #1', 'Request credit limit increase', 'Avoid new charges'],
            priority: 'high',
            status: 'in_progress',
            successProbability: 85,
          },
        ],
        timelinePredictions: [
          {
            milestone: 'Reach 700 credit score',
            currentScore: 650,
            targetScore: 700,
            estimatedDate: '2025-06-30',
            confidence: 78,
            requiredActions: 3,
          },
        ],
        prioritizedActions: [
          {
            id: '1',
            title: 'Pay down credit card #1',
            description: 'Reduce balance on Chase Sapphire card',
            impact: 30,
            difficulty: 'medium',
            timeToComplete: '30-60 days',
            priority: 'high',
            category: 'utilization',
            completed: false,
          },
        ],
        progressMetrics: {
          currentScore: 650,
          startingScore: 620,
          targetScore: 700,
          pointsGained: 30,
          daysElapsed: 45,
          estimatedDaysRemaining: 90,
          completionPercentage: 33,
          onTrack: true,
        },
        strategyRecommendations: [
          {
            id: '1',
            strategy: 'Debt Snowball Method',
            description: 'Pay off smallest debts first for quick wins',
            expectedImpact: 25,
            timeframe: '3-6 months',
            difficulty: 'easy',
            steps: ['List all debts', 'Pay minimums on all', 'Extra payments to smallest debt'],
          },
        ],
        nextSteps: [
          'Pay down credit card #1',
          'Set up automatic payments',
          'Monitor credit reports monthly',
        ],
      },
    }));
  }),

  // 10. Credit Repair - AI Credit Repair Strategy
  rest.get(`${BASE_URL}/api/financial/credit-repair/ai-strategy`, (req, res, ctx) => {
    return res(ctx.json({
      data: {
        repairScore: 88,
        quickWins: [
          'Pay down Chase card from 78% to 20% utilization',
          'Dispute duplicate account on Experian report',
          'Set up autopay for all credit cards to prevent future late payments',
        ],
        prioritizedActions: [
          {
            id: '1',
            title: 'Dispute inaccurate late payment',
            description: 'Challenge the late payment mark on your Capital One account from March 2024',
            category: 'dispute',
            impact: 45,
            successProbability: 85,
            timeframe: '30-45 days',
            difficulty: 'medium',
            priority: 'critical',
            steps: [
              'Gather proof of on-time payment (bank statements, confirmation emails)',
              'File dispute with all three credit bureaus online',
              'Follow up every 10 days until resolved',
            ],
            estimatedCost: '$0 (DIY) or $50-100 (professional letter)',
          },
          {
            id: '2',
            title: 'Negotiate pay-for-delete with collection agency',
            description: 'Contact ABC Collections to remove $450 medical debt in exchange for payment',
            category: 'negotiation',
            impact: 35,
            successProbability: 65,
            timeframe: '45-60 days',
            difficulty: 'medium',
            priority: 'high',
            steps: [
              'Request debt validation letter',
              'Negotiate settlement at 50-70% of balance',
              'Get pay-for-delete agreement in writing before paying',
            ],
            estimatedCost: '$225-315 (50-70% of $450)',
          },
        ],
        impactPredictions: [
          {
            action: 'Pay down utilization to 10%',
            currentScore: 620,
            predictedScore: 675,
            scoreIncrease: 55,
            confidence: 90,
            timeToImpact: '30-45 days',
          },
          {
            action: 'Remove late payment',
            currentScore: 620,
            predictedScore: 665,
            scoreIncrease: 45,
            confidence: 75,
            timeToImpact: '60-90 days',
          },
        ],
        timelineEstimates: [
          {
            phase: 'Immediate Actions (0-30 days)',
            duration: '30 days',
            actions: [
              'Pay down credit card balances',
              'Set up autopay',
              'File disputes for inaccurate items',
            ],
            expectedScoreRange: {
              min: 620,
              max: 645,
            },
            milestones: [
              'Utilization below 30%',
              'All disputes filed',
              'Autopay confirmed',
            ],
          },
          {
            phase: 'Short-term Progress (30-90 days)',
            duration: '60 days',
            actions: [
              'Follow up on disputes',
              'Negotiate pay-for-delete agreements',
              'Maintain low utilization',
            ],
            expectedScoreRange: {
              min: 645,
              max: 685,
            },
            milestones: [
              'First dispute resolved',
              'Collection account removed',
              'Utilization below 10%',
            ],
          },
        ],
        successMetrics: {
          overallSuccessProbability: 82,
          estimatedScoreIncrease: 100,
          estimatedTimeframe: '90-120 days',
          confidenceLevel: 'high',
          riskFactors: [
            'Collection agency may not agree to pay-for-delete',
            'Disputes may be rejected if insufficient evidence',
            'New late payments would significantly harm progress',
          ],
        },
        strategyOptimizations: [
          {
            id: '1',
            strategy: 'Aggressive Dispute Strategy',
            description: 'Challenge all negative items simultaneously for maximum impact',
            pros: [
              'Fastest potential score improvement',
              'Multiple items may be removed due to bureau errors',
            ],
            cons: [
              'May trigger closer scrutiny of your credit file',
              'Could be seen as frivolous if items are accurate',
            ],
            bestFor: [
              'Accounts with known inaccuracies',
              'Time-sensitive credit needs (mortgage, car loan)',
            ],
            expectedOutcome: '+45-65 points in 60-90 days',
            successRate: 78,
          },
          {
            id: '2',
            strategy: 'Conservative Negotiation Strategy',
            description: 'Focus on pay-for-delete and goodwill adjustments',
            pros: [
              'Lower risk approach',
              'Builds positive relationships with creditors',
            ],
            cons: [
              'Slower results',
              'May cost more money upfront',
            ],
            bestFor: [
              'Accurate negative items',
              'Long-term credit building',
            ],
            expectedOutcome: '+30-50 points in 90-120 days',
            successRate: 85,
          },
        ],
      },
    }));
  }),
];


