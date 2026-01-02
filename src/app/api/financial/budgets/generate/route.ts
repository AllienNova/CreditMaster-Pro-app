/**
 * Smart Budget Generation API
 * 
 * POST /api/financial/budgets/generate - AI-powered budget generation
 * 
 * @see Phase 2.1.4: Budget API Endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSmartBudgetEngine } from '@/lib/financial/smart-budget-engine';
import { jwtValidation } from '@/lib/auth/jwt-validation';
import { rbac } from '@/lib/auth/rbac';
import {
  applyFinancialAPIMiddleware,
  finalizeResponse,
} from '@/lib/api/financial-api-middleware';
import { BudgetPreferences } from '@/lib/financial/types/budget.types';
import { z } from 'zod';

// ============================================================================
// ZOD VALIDATION SCHEMAS
// ============================================================================

const GenerateBudgetSchema = z.object({
  monthlyIncome: z.number().positive('Monthly income must be positive'),
  savingsGoalPercentage: z.number().min(0).max(100).optional(),
  debtPaymentPriority: z.enum(['aggressive', 'moderate', 'minimum']).optional(),
  lifestylePreference: z.enum(['frugal', 'balanced', 'comfortable']).optional(),
  essentialCategories: z.array(z.string()).optional(),
  excludeCategories: z.array(z.string()).optional(),
  customRules: z.array(z.object({
    category: z.string(),
    minAmount: z.number().optional(),
    maxAmount: z.number().optional(),
    percentage: z.number().min(0).max(100).optional(),
  })).optional(),
});

/**
 * POST /api/financial/budgets/generate
 * Generate AI-powered budget based on user preferences and spending history
 * 
 * @openapi
 * /api/financial/budgets/generate:
 *   post:
 *     summary: Generate AI-powered budget
 *     description: Analyzes 6+ months of transaction history and generates an optimized budget using AI
 *     tags: [Budgets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - monthlyIncome
 *             properties:
 *               monthlyIncome:
 *                 type: number
 *                 description: User's monthly income
 *                 example: 5000
 *               savingsGoalPercentage:
 *                 type: number
 *                 description: Target savings percentage (default: 20%)
 *                 example: 20
 *               debtPaymentPriority:
 *                 type: string
 *                 enum: [aggressive, moderate, minimum]
 *                 description: Debt payment priority level
 *                 example: moderate
 *               lifestylePreference:
 *                 type: string
 *                 enum: [frugal, balanced, comfortable]
 *                 description: Lifestyle preference
 *                 example: balanced
 *     responses:
 *       201:
 *         description: Budget generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/SmartBudget'
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Premium feature
 *       500:
 *         description: Server error
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Apply middleware (auth, rate limiting, CORS, logging)
    const middleware = await applyFinancialAPIMiddleware(request, {
      requireAuth: true,
      rateLimit: true,
      cors: true,
      logging: true,
    });
    
    if (middleware.error) {
      return middleware.error;
    }
    
    const userId = middleware.userId!;
    
    // Validate JWT token
    const validation = await jwtValidation.validateFromHeaders(request);
    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check permissions (premium feature)
    if (!rbac.hasPermission(validation.user, 'financial:create_budgets')) {
      return NextResponse.json(
        { error: 'Forbidden - Premium feature required' },
        { status: 403 }
      );
    }
    
    // Parse and validate request body
    const body = await request.json();
    const validationResult = GenerateBudgetSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }
    
    const preferences: BudgetPreferences = validationResult.data;
    
    // Generate smart budget
    const smartBudgetEngine = getSmartBudgetEngine();
    const budget = await smartBudgetEngine.generateBudget(userId, preferences);
    
    const response = NextResponse.json(
      {
        success: true,
        data: budget,
        message: 'Smart budget generated successfully',
        _meta: {
          aiGenerated: budget.aiGenerated,
          confidence: budget.confidence,
          generatedAt: new Date().toISOString(),
        },
      },
      { status: 201 }
    );
    
    return finalizeResponse(request, response, startTime, userId);
  } catch (error) {
    console.error('Error generating smart budget:', error);
    
    const response = NextResponse.json(
      {
        success: false,
        error: 'Failed to generate smart budget',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
    
    return finalizeResponse(request, response, startTime, 'anonymous');
  }
}

