import { NextRequest, NextResponse } from "next/server";
import {
  withAuth,
  withPermission,
  type AuthedUser,
} from "@/lib/auth/api-guard";
import { WorkflowEngine } from "@/lib/automation/workflow-engine";

/**
 * GET /api/automation/workflows
 * Get user's workflows
 */
export const GET = withAuth(async (_request: NextRequest, user: AuthedUser) => {
  try {
    const startTime = Date.now();

    // Get workflows
    const workflows = await WorkflowEngine.getUserWorkflows(user.id);

    const duration = Date.now() - startTime;

    // WorkflowsAPI: Fetched workflows for user

    return NextResponse.json({ workflows });
  } catch (_error) {
    // WorkflowsAPI error: Error fetching workflows
    void _error;
    return NextResponse.json(
      { error: "Failed to fetch workflows" },
      { status: 500 },
    );
  }
});

/**
 * POST /api/automation/workflows
 * Create and execute a new workflow
 */
export const POST = withPermission(
  "automation:workflows:create",
  async (request: NextRequest, user: AuthedUser) => {
  try {
    const startTime = Date.now();
    const body = await request.json();

    const { template_id, config } = body;

    if (!template_id) {
      return NextResponse.json(
        { error: "template_id is required" },
        { status: 400 },
      );
    }

    // Execute workflow
    const workflow = await WorkflowEngine.executeWorkflow(
      user.id,
      template_id,
      config,
    );

    const duration = Date.now() - startTime;

    // WorkflowsAPI: Created workflow for user

    return NextResponse.json({ workflow });
  } catch (_error) {
    // WorkflowsAPI error: Error creating workflow
    void _error;
    return NextResponse.json(
      { error: "Failed to create workflow" },
      { status: 500 },
    );
  }
},
);
