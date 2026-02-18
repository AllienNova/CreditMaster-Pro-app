/**
 * Financial Insights API - Phase 1.5
 *
 * GET /api/financial/insights - Get AI-powered financial insights
 * POST /api/financial/insights - Dismiss an insight or record an action
 * PATCH /api/financial/insights - Bulk operations on insights
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { rbac } from "@/lib/auth/rbac";
import { smartInsightsEngine } from "@/lib/financial/smart-insights-engine";
import {
  InsightType,
  InsightCategory,
  InsightPriority,
  InsightGenerationOptions,
} from "@/lib/financial/types/insight.types";

// Zod validation schema for bulk operations
const bulkOperationSchema = z.object({
  insightIds: z.array(z.string()).min(1, "At least one insight ID is required"),
  action: z.enum(["mark_read", "dismiss"], {
    errorMap: () => ({ message: "Action must be either mark_read or dismiss" }),
  }),
});

/**
 * GET /api/financial/insights
 * Returns AI-powered financial insights for the authenticated user
 *
 * Query Parameters:
 * - types: comma-separated insight types to include
 * - categories: comma-separated categories to include
 * - minPriority: minimum priority level (critical, high, medium, low, info)
 * - limit: maximum number of insights to return (default: 20)
 * - offset: pagination offset (default: 0)
 * - is_read: filter by read status (true/false)
 * - includeAI: include AI-generated recommendations (default: true)
 * - includeDismissed: include dismissed insights (default: false)
 * - stored: get stored insights from database instead of generating new ones
 * - sort: sorting field (priority, created_at) (default: priority)
 * - order: sort order (asc, desc) (default: desc)
 */
export async function GET(request: NextRequest) {
  try {
    // Validate JWT token
    const validation = await jwtValidation.validateFromHeaders(request);

    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permissions
    if (
      !rbac.hasPermission(
        validation.user as Parameters<typeof rbac.hasPermission>[0],
        "financial:read",
      )
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;

    // Parse options from query params
    const options: InsightGenerationOptions = {};

    const typesParam = searchParams.get("types");
    if (typesParam) {
      options.types = typesParam.split(",") as InsightType[];
    }

    const categoriesParam = searchParams.get("categories");
    if (categoriesParam) {
      options.categories = categoriesParam.split(",") as InsightCategory[];
    }

    const minPriority = searchParams.get("minPriority");
    if (minPriority) {
      options.minPriority = minPriority as InsightPriority;
    }

    const limit = searchParams.get("limit");
    if (limit) {
      options.limit = parseInt(limit, 10);
    }

    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const isReadFilter = searchParams.get("is_read");
    const sortField = searchParams.get("sort") || "priority";
    const sortOrder = searchParams.get("order") || "desc";

    options.includeAI = searchParams.get("includeAI") !== "false";
    options.includeDismissed = searchParams.get("includeDismissed") === "true";

    // Check if requesting stored insights or generating new ones
    const useStored = searchParams.get("stored") === "true";

    if (useStored) {
      let insights = await smartInsightsEngine.getStoredInsights(
        validation.user.id,
        options,
      );

      // Apply additional filters
      if (isReadFilter !== null) {
        const isRead = isReadFilter === "true";
        insights = insights.filter((insight) => !insight.dismissed === isRead);
      }

      // Apply sorting
      insights.sort((a, b) => {
        if (sortField === "priority") {
          const priorityOrder = {
            critical: 5,
            high: 4,
            medium: 3,
            low: 2,
            info: 1,
          };
          const diff = priorityOrder[a.priority] - priorityOrder[b.priority];
          return sortOrder === "desc" ? -diff : diff;
        } else if (sortField === "created_at") {
          const diff =
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          return sortOrder === "desc" ? -diff : diff;
        }
        return 0;
      });

      // Apply pagination
      const total = insights.length;
      const paginatedInsights = insights.slice(
        offset,
        offset + (options.limit || 20),
      );

      return NextResponse.json({
        success: true,
        data: paginatedInsights,
        _meta: {
          source: "stored",
          total,
          offset,
          limit: options.limit || 20,
          hasMore: offset + paginatedInsights.length < total,
        },
      });
    }

    // Generate new insights
    const result = await smartInsightsEngine.generateInsights(
      validation.user.id,
      options,
    );

    let insights = result.insights;

    // Apply additional filters
    if (isReadFilter !== null) {
      const isRead = isReadFilter === "true";
      insights = insights.filter((insight) => !insight.dismissed === isRead);
    }

    // Apply sorting
    insights.sort((a, b) => {
      if (sortField === "priority") {
        const priorityOrder = {
          critical: 5,
          high: 4,
          medium: 3,
          low: 2,
          info: 1,
        };
        const diff = priorityOrder[a.priority] - priorityOrder[b.priority];
        return sortOrder === "desc" ? -diff : diff;
      } else if (sortField === "created_at") {
        const diff =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        return sortOrder === "desc" ? -diff : diff;
      }
      return 0;
    });

    // Apply pagination
    const total = insights.length;
    const paginatedInsights = insights.slice(
      offset,
      offset + (options.limit || 20),
    );

    return NextResponse.json({
      success: true,
      data: paginatedInsights,
      _meta: {
        source: "generated",
        generatedAt: result.generatedAt,
        processingTimeMs: result.processingTimeMs,
        aiModelUsed: result.aiModelUsed,
        dataSourcesUsed: result.dataSourcesUsed,
        total,
        offset,
        limit: options.limit || 20,
        hasMore: offset + paginatedInsights.length < total,
      },
    });
  } catch (_error) {
    // FinancialInsightsRoute error: Failed to fetch insights

    const errorMessage =
      _error instanceof Error
        ? _error.message
        : "Failed to fetch financial insights";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        _meta: {
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/financial/insights
 * Dismiss an insight or record an action
 */
export async function POST(request: NextRequest) {
  try {
    const validation = await jwtValidation.validateFromHeaders(request);

    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (
      !rbac.hasPermission(
        validation.user as Parameters<typeof rbac.hasPermission>[0],
        "financial:write",
      )
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { insightId, action } = body;

    if (!insightId) {
      return NextResponse.json(
        { error: "insightId is required" },
        { status: 400 },
      );
    }

    if (action === "dismiss") {
      const success = await smartInsightsEngine.dismissInsight(
        insightId,
        validation.user.id,
      );
      return NextResponse.json({ success });
    }

    if (action) {
      const success = await smartInsightsEngine.recordAction(
        insightId,
        validation.user.id,
        action,
      );
      return NextResponse.json({ success });
    }

    return NextResponse.json({ error: "action is required" }, { status: 400 });
  } catch (_error) {
    // FinancialInsightsRoute error: Failed to process action

    const errorMessage =
      _error instanceof Error
        ? _error.message
        : "Failed to process insight action";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        _meta: {
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/financial/insights
 * Bulk operations on insights (mark_read, dismiss)
 */
export async function PATCH(request: NextRequest) {
  try {
    const validation = await jwtValidation.validateFromHeaders(request);

    if (!validation.valid || !validation.user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized - Invalid or missing JWT token",
        },
        { status: 401 },
      );
    }

    if (
      !rbac.hasPermission(
        validation.user as Parameters<typeof rbac.hasPermission>[0],
        "financial:write",
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden - Insufficient permissions",
        },
        { status: 403 },
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = bulkOperationSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: validationResult.error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        },
        { status: 400 },
      );
    }

    const { insightIds, action } = validationResult.data;
    const userId = validation.user.id;

    // Process bulk operation
    const results = await Promise.allSettled(
      insightIds.map(async (insightId) => {
        if (action === "dismiss") {
          return await smartInsightsEngine.dismissInsight(insightId, userId);
        } else if (action === "mark_read") {
          // Assuming there's a method to mark as read
          return await smartInsightsEngine.recordAction(
            insightId,
            userId,
            "viewed",
          );
        }
        return false;
      }),
    );

    const successCount = results.filter(
      (r) => r.status === "fulfilled" && r.value === true,
    ).length;
    const failureCount = results.length - successCount;

    return NextResponse.json({
      success: true,
      data: {
        processed: results.length,
        successful: successCount,
        failed: failureCount,
      },
      message: `Bulk operation completed: ${successCount} successful, ${failureCount} failed`,
    });
  } catch (_error) {
    // FinancialInsightsRoute error: Bulk operation failed

    const errorMessage =
      _error instanceof Error
        ? _error.message
        : "Failed to process bulk operation";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        _meta: {
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 },
    );
  }
}
