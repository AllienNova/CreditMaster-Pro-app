/**
 * OpenAPI 3.0 Specification for Financial API
 *
 * This file contains the complete OpenAPI specification for all financial API endpoints.
 * Can be used with Swagger UI, Postman, or other API documentation tools.
 */

export const openAPISpec = {
  openapi: "3.0.0",
  info: {
    title: "Fynvita - Financial API",
    version: "1.0.0",
    description:
      "Comprehensive REST API for financial data access, health score calculation, goal tracking, and insights management",
    contact: {
      name: "Fynvita Support",
      email: "support@fynvita.com",
      url: "https://fynvita.com/support",
    },
    license: {
      name: "Proprietary",
      url: "https://fynvita.com/terms",
    },
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Development server",
    },
    {
      url: "https://app.fynvita.com",
      description: "Production server",
    },
  ],
  tags: [
    {
      name: "Financial Context",
      description: "Aggregated financial data and context",
    },
    {
      name: "Health Score",
      description: "Financial health score calculation and history",
    },
    {
      name: "Goals",
      description: "Financial goal tracking and management",
    },
    {
      name: "Insights",
      description: "AI-powered financial insights and recommendations",
    },
    {
      name: "Monitoring",
      description: "API monitoring and statistics (Admin only)",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "JWT token obtained from authentication endpoint",
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          success: {
            type: "boolean",
            example: false,
          },
          error: {
            type: "string",
            example: "Error message",
          },
          _meta: {
            type: "object",
            properties: {
              timestamp: {
                type: "string",
                format: "date-time",
              },
            },
          },
        },
      },
      FinancialContext: {
        type: "object",
        properties: {
          success: {
            type: "boolean",
            example: true,
          },
          data: {
            type: "object",
            properties: {
              summary: {
                type: "object",
                properties: {
                  totalAssets: { type: "number", example: 50000 },
                  totalLiabilities: { type: "number", example: 15000 },
                  netWorth: { type: "number", example: 35000 },
                },
              },
              accounts: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    type: { type: "string" },
                    balance: { type: "number" },
                    institution: { type: "string" },
                  },
                },
              },
              budgetStatus: { type: "array", items: { type: "object" } },
              goals: { type: "array", items: { type: "object" } },
              healthScore: { type: "object" },
              insights: { type: "array", items: { type: "object" } },
            },
          },
          _meta: {
            type: "object",
            properties: {
              generatedAt: { type: "string", format: "date-time" },
              cached: { type: "boolean" },
              ttl: { type: "number", example: 300 },
            },
          },
        },
      },
      HealthScore: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          data: {
            type: "object",
            properties: {
              overall: { type: "number", example: 78 },
              grade: { type: "string", example: "B" },
              categories: {
                type: "object",
                properties: {
                  savings: { type: "number", example: 85 },
                  debt: { type: "number", example: 72 },
                  spending: { type: "number", example: 80 },
                  credit: { type: "number", example: 75 },
                  investments: { type: "number", example: 70 },
                  insurance: { type: "number", example: 65 },
                },
              },
              recommendations: { type: "array", items: { type: "object" } },
              comparisons: { type: "object" },
              trend: { type: "object" },
            },
          },
        },
      },
    },
  },
  paths: {
    "/api/financial/context": {
      get: {
        tags: ["Financial Context"],
        summary: "Get financial context summary",
        description:
          "Returns aggregated financial data including accounts, budgets, goals, health score, and insights",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "refresh",
            in: "query",
            description: "Force refresh cache",
            required: false,
            schema: { type: "boolean", default: false },
          },
          {
            name: "enhanced",
            in: "query",
            description: "Include enhanced data (transactions, trends)",
            required: false,
            schema: { type: "boolean", default: false },
          },
        ],
        responses: {
          200: {
            description: "Financial context retrieved successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/FinancialContext" },
              },
            },
            headers: {
              "Cache-Control": {
                description: "Caching directives",
                schema: {
                  type: "string",
                  example: "private, max-age=300, stale-while-revalidate=60",
                },
              },
              "X-RateLimit-Limit": {
                description: "Rate limit maximum requests",
                schema: { type: "integer", example: 120 },
              },
              "X-RateLimit-Remaining": {
                description: "Rate limit remaining requests",
                schema: { type: "integer", example: 119 },
              },
              "X-Response-Time": {
                description: "Response time in milliseconds",
                schema: { type: "string", example: "150ms" },
              },
            },
          },
          401: {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          429: {
            description: "Rate limit exceeded",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
            headers: {
              "Retry-After": {
                description: "Seconds until retry",
                schema: { type: "integer", example: 30 },
              },
            },
          },
        },
      },
    },
    "/api/financial/health-score": {
      get: {
        tags: ["Health Score"],
        summary: "Get current health score",
        description:
          "Returns the current financial health score (cached for 1 hour)",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "history",
            in: "query",
            description: "Include historical scores",
            required: false,
            schema: { type: "boolean", default: false },
          },
          {
            name: "days",
            in: "query",
            description: "Number of days of history to include",
            required: false,
            schema: { type: "integer", default: 30 },
          },
        ],
        responses: {
          200: {
            description: "Health score retrieved successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HealthScore" },
              },
            },
          },
          401: { description: "Unauthorized" },
          429: { description: "Rate limit exceeded" },
        },
      },
      post: {
        tags: ["Health Score"],
        summary: "Calculate new health score",
        description:
          "Forces recalculation of health score and saves to database",
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  forceRecalculate: {
                    type: "boolean",
                    default: false,
                    description:
                      "Force recalculation even if cached score is valid",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Health score calculated successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HealthScore" },
              },
            },
          },
          401: { description: "Unauthorized" },
          429: { description: "Rate limit exceeded" },
        },
      },
    },
    "/api/financial/goals": {
      get: {
        tags: ["Goals"],
        summary: "List financial goals",
        description: "Returns all financial goals with optional filtering",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "status",
            in: "query",
            description: "Filter by goal status",
            required: false,
            schema: {
              type: "string",
              enum: ["active", "completed", "paused", "cancelled"],
            },
          },
          {
            name: "type",
            in: "query",
            description: "Filter by goal type",
            required: false,
            schema: { type: "string" },
          },
          {
            name: "priority",
            in: "query",
            description: "Filter by minimum priority",
            required: false,
            schema: {
              type: "string",
              enum: ["low", "medium", "high", "urgent"],
            },
          },
        ],
        responses: {
          200: { description: "Goals retrieved successfully" },
          401: { description: "Unauthorized" },
          429: { description: "Rate limit exceeded" },
        },
      },
      post: {
        tags: ["Goals"],
        summary: "Create new goal",
        description: "Creates a new financial goal with validation",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["type", "name", "targetAmount", "targetDate"],
                properties: {
                  type: { type: "string", example: "emergency_fund" },
                  name: { type: "string", example: "Build Emergency Fund" },
                  targetAmount: { type: "number", example: 10000 },
                  targetDate: {
                    type: "string",
                    format: "date",
                    example: "2026-12-31",
                  },
                  priority: {
                    type: "string",
                    enum: ["low", "medium", "high", "urgent"],
                    default: "medium",
                  },
                  description: {
                    type: "string",
                    example: "Save 6 months of expenses",
                  },
                  currentAmount: { type: "number", default: 0, example: 2000 },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Goal created successfully" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          429: { description: "Rate limit exceeded" },
        },
      },
    },
  },
};
