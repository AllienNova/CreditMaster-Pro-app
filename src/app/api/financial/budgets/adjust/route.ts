/**
 * Budget Adjustment Suggestions API
 * 
 * GET /api/financial/budgets/adjust - Get AI-powered budget adjustment suggestions
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

/**
 * GET /api/financial/budgets/adjust
 * Get AI-powered budget adjustment suggestions based on spending patterns
 * 
 * @openapi
 * /api/financial/budgets/adjust:
 *   get:
 *     summary: Get budget adjustment suggestions
 *     description: AI analyzes spending patterns and suggests category adjustments
 *     tags: [Budgets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Suggestions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/BudgetRecommendation'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Apply middleware
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
    
    // Check permissions
    if (!rbac.hasPermission(validation.user, 'financial:read')) {
      return NextResponse.json(
        { error: 'Forbidden - Premium feature required' },
        { status: 403 }
      );
    }
    
    // Get adjustment suggestions
    const smartBudgetEngine = getSmartBudgetEngine();
    const suggestions = await smartBudgetEngine.suggestCategoryAdjustments(userId);
    
    const response = NextResponse.json({
      success: true,
      data: suggestions,
      count: suggestions.length,
      _meta: {
        generatedAt: new Date().toISOString(),
        aiPowered: true,
      },
    });
    
    return finalizeResponse(request, response, startTime, userId);
  } catch (error) {
    console.error('Error getting budget adjustment suggestions:', error);
    
    const response = NextResponse.json(
      {
        success: false,
        error: 'Failed to get budget adjustment suggestions',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
    
    return finalizeResponse(request, response, startTime, 'anonymous');
  }
}

