/**
 * Financial Goals API - Phase 1.5
 *
 * GET /api/financial/goals - Get all goals for authenticated user
 * POST /api/financial/goals - Create a new financial goal
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { jwtValidation } from '@/lib/auth/jwt-validation';
import { rbac } from '@/lib/auth/rbac';
import { goalTracker } from '@/lib/financial/goal-tracker';
import { supabase } from '@/lib/supabase';

// Zod validation schemas
const createGoalSchema = z.object({
  type: z.string().min(1, 'Goal type is required'),
  name: z.string().min(1, 'Goal name is required').max(200, 'Goal name too long'),
  targetAmount: z.number().positive('Target amount must be positive'),
  targetDate: z.string().refine((date) => {
    const targetDate = new Date(date);
    return targetDate > new Date();
  }, 'Target date must be in the future'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().default('medium'),
  description: z.string().max(1000, 'Description too long').optional(),
  currentAmount: z.number().min(0, 'Current amount cannot be negative').optional().default(0),
});

export async function GET(request: NextRequest) {
  try {
    // Validate JWT token
    const validation = await jwtValidation.validateFromHeaders(request);

    if (!validation.valid || !validation.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized - Invalid or missing JWT token',
        },
        { status: 401 }
      );
    }

    // Check permissions (premium feature)
    if (!rbac.hasPermission(validation.user, 'financial:create_goals')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden - Premium feature required',
        },
        { status: 403 }
      );
    }

    const userId = validation.user.id;
    const searchParams = request.nextUrl.searchParams;

    // Parse filter parameters
    const statusFilter = searchParams.get('status');
    const typeFilter = searchParams.get('type');
    const priorityFilter = searchParams.get('priority');

    // Build query
    let query = supabase
      .from('financial_goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // Apply filters
    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }
    if (typeFilter) {
      query = query.eq('type', typeFilter);
    }
    if (priorityFilter) {
      query = query.gte('priority', priorityFilter);
    }

    const { data: goals, error } = await query;

    if (error) {
      throw error;
    }

    // Enrich goals with progress metrics
    const enrichedGoals = await Promise.all(
      (goals || []).map(async (goal) => {
        try {
          const progress = await goalTracker.calculateProgressMetrics(goal.id);
          return {
            id: goal.id,
            type: goal.type,
            name: goal.name,
            description: goal.description,
            targetAmount: goal.target_amount,
            currentAmount: goal.current_amount,
            targetDate: goal.target_date,
            status: goal.status,
            priority: goal.priority,
            createdAt: goal.created_at,
            progress: {
              percentage: progress.progressPercentage,
              velocity: progress.velocity.monthlyVelocity,
              performanceGrade: progress.performanceScore.grade,
              onTrack: progress.performanceScore.onTrack,
              estimatedCompletion: progress.predictions.estimatedCompletionDate,
            },
          };
        } catch (err) {
          // If progress calculation fails, return basic goal info
          return {
            id: goal.id,
            type: goal.type,
            name: goal.name,
            description: goal.description,
            targetAmount: goal.target_amount,
            currentAmount: goal.current_amount,
            targetDate: goal.target_date,
            status: goal.status,
            priority: goal.priority,
            createdAt: goal.created_at,
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      data: enrichedGoals,
      _meta: {
        count: enrichedGoals.length,
        filters: {
          status: statusFilter,
          type: typeFilter,
          priority: priorityFilter,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching financial goals:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch financial goals';

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        _meta: {
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Validate JWT token
    const validation = await jwtValidation.validateFromHeaders(request);

    if (!validation.valid || !validation.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized - Invalid or missing JWT token',
        },
        { status: 401 }
      );
    }

    // Check permissions (premium feature)
    if (!rbac.hasPermission(validation.user, 'financial:create_goals')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden - Premium feature required',
        },
        { status: 403 }
      );
    }

    const userId = validation.user.id;

    // Parse and validate request body
    const body = await request.json();
    const validationResult = createGoalSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationResult.error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    const goalData = validationResult.data;

    // Create goal using goal tracker
    const goal = await goalTracker.createGoal({
      userId,
      type: goalData.type,
      name: goalData.name,
      targetAmount: goalData.targetAmount,
      currentAmount: goalData.currentAmount || 0,
      targetDate: new Date(goalData.targetDate),
      priority: goalData.priority || 'medium',
      description: goalData.description,
    });

    // Calculate initial progress metrics
    const progress = await goalTracker.calculateProgressMetrics(goal.id);

    return NextResponse.json(
      {
        success: true,
        data: {
          id: goal.id,
          type: goal.type,
          name: goal.name,
          description: goal.description,
          targetAmount: goal.targetAmount,
          currentAmount: goal.currentAmount,
          targetDate: goal.targetDate,
          status: goal.status,
          priority: goal.priority,
          createdAt: goal.createdAt,
          progress: {
            percentage: progress.progressPercentage,
            velocity: progress.velocity.monthlyVelocity,
            performanceGrade: progress.performanceScore.grade,
            onTrack: progress.performanceScore.onTrack,
            estimatedCompletion: progress.predictions.estimatedCompletionDate,
          },
        },
        message: 'Financial goal created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating financial goal:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to create financial goal';

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        _meta: {
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}

