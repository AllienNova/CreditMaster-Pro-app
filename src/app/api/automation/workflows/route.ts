import { NextRequest, NextResponse } from 'next/server';
import { jwtValidation } from '@/lib/auth/jwt-validation';
import { rbac } from '@/lib/auth/rbac';
import { WorkflowEngine } from '@/lib/automation/workflow-engine';

/**
 * GET /api/automation/workflows
 * Get user's workflows
 */
export async function GET(request: NextRequest) {
  try {
    // Validate JWT token
    const validation = await jwtValidation.validateFromHeaders(request.headers);

    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startTime = Date.now();

    // Get workflows
    const workflows = await WorkflowEngine.getUserWorkflows(validation.user.id);

    const duration = Date.now() - startTime;

    console.log(`✅ Fetched ${workflows.length} workflows for user ${validation.user.id} in ${duration}ms`);

    return NextResponse.json({ workflows });
  } catch (error) {
    console.error('Error fetching workflows:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workflows' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/automation/workflows
 * Create and execute a new workflow
 */
export async function POST(request: NextRequest) {
  try {
    // Validate JWT token
    const validation = await jwtValidation.validateFromHeaders(request.headers);

    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!rbac.hasPermission(validation.user, 'automation:workflows:create')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const startTime = Date.now();
    const body = await request.json();

    const { template_id, config } = body;

    if (!template_id) {
      return NextResponse.json(
        { error: 'template_id is required' },
        { status: 400 }
      );
    }

    // Execute workflow
    const workflow = await WorkflowEngine.executeWorkflow(
      validation.user.id,
      template_id,
      config
    );

    const duration = Date.now() - startTime;

    console.log(`✅ Created workflow ${workflow.id} for user ${validation.user.id} in ${duration}ms`);

    return NextResponse.json({ workflow });
  } catch (error) {
    console.error('Error creating workflow:', error);
    return NextResponse.json(
      { error: 'Failed to create workflow' },
      { status: 500 }
    );
  }
}

