/**
 * OpenAPI 3.0 Spec Generator
 *
 * Generates a complete OpenAPI specification from route metadata.
 * Works with Next.js App Router conventions (route.ts files with
 * exported GET/POST/PUT/PATCH/DELETE handlers).
 *
 * Design:
 *   RouteMetadata[] → generateOpenAPISpec() → OpenAPI 3.0 JSON
 *
 * The generator is pure (no filesystem access) so it can be tested
 * without mocking. A separate build script feeds it real route data.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

export interface RouteMetadata {
  /** API path, e.g. "/api/financial/spending" */
  path: string;
  /** HTTP methods exported by the route handler */
  methods: HttpMethod[];
  /** Dynamic path segments, e.g. ["id"] for /api/disputes/[id] */
  dynamicSegments: string[];
}

export interface OpenAPIParameter {
  name: string;
  in: "path" | "query" | "header";
  required: boolean;
  schema: { type: string };
  description: string;
}

export interface OpenAPIOperation {
  tags: string[];
  summary: string;
  description: string;
  operationId: string;
  security?: Array<Record<string, string[]>>;
  parameters?: OpenAPIParameter[];
  requestBody?: {
    required: boolean;
    content: { "application/json": { schema: { type: string } } };
  };
  responses: Record<
    string,
    { description: string; content?: Record<string, unknown> }
  >;
}

export interface OpenAPIPathItem {
  [method: string]: OpenAPIOperation;
}

export interface OpenAPITag {
  name: string;
  description: string;
}

export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description: string;
    contact: { name: string; email: string; url: string };
    license: { name: string; url: string };
  };
  servers: Array<{ url: string; description: string }>;
  tags: OpenAPITag[];
  components: {
    securitySchemes: Record<string, unknown>;
    schemas: Record<string, unknown>;
  };
  paths: Record<string, OpenAPIPathItem>;
}

// ---------------------------------------------------------------------------
// Tag derivation
// ---------------------------------------------------------------------------

const TAG_DESCRIPTIONS: Record<string, string> = {
  Admin: "Platform administration, metrics, and user management",
  AI: "AI-powered analysis, coaching, and orchestration",
  Analytics: "Platform analytics, reports, and event tracking",
  Auth: "Authentication and WebAuthn credential management",
  Automation: "Workflow automation and scheduled jobs",
  Chat: "Financial chat sessions and messaging",
  "Credit Builder": "Credit building tools, secured cards, and loans",
  "Credit Bureau": "Credit bureau integration and report analysis",
  "Credit Monitoring": "Real-time credit score monitoring and alerts",
  "Credit Repair": "Dispute management, negotiation, and credit repair tools",
  Credit: "Credit analysis and factor tracking",
  Cron: "Scheduled background tasks and maintenance jobs",
  CSRF: "Cross-site request forgery token management",
  Disputes: "Dispute generation, tracking, and strategies",
  Documents: "Document upload, processing, and sharing",
  Email: "Email preferences and unsubscribe management",
  Federal: "Federal program eligibility and applications",
  Financial: "Core financial services and data aggregation",
  "Financial - Accounts": "Bank account linking and management",
  "Financial - AI Insights": "AI-powered financial insights",
  "Financial - Bills": "Bill tracking, negotiation, and optimization",
  "Financial - Budgets": "Budget creation, analysis, and recommendations",
  "Financial - Context": "Aggregated financial context and summaries",
  "Financial - Credit": "Credit scoring and AI insights",
  "Financial - Dashboard": "Financial dashboard data aggregation",
  "Financial - Debt": "Debt management and payoff calculations",
  "Financial - Export": "Financial data export",
  "Financial - Goals": "Financial goal tracking and optimization",
  "Financial - Health Score": "Financial health score calculation",
  "Financial - Income": "Income tracking and detection",
  "Financial - Insights": "Financial insights and recommendations",
  "Financial - Investments": "Investment portfolio and AI insights",
  "Financial - Monitoring": "API monitoring and statistics",
  "Financial - OpenAPI": "API documentation and specification",
  "Financial - Plaid": "Plaid bank integration",
  "Financial - Savings": "Savings goals, automation, and analysis",
  "Financial - Spending": "Spending analysis, trends, and forecasting",
  "Financial - Transactions": "Transaction history and management",
  Gamification: "Achievements, badges, and rewards",
  Marketplace: "Financial product marketplace",
  Notifications: "User notifications and push messaging",
  Onboarding: "User onboarding flow and progress",
  Settings: "User settings and preferences",
  Trading: "Trading orders, positions, and paper trading",
  Webhooks: "External webhook handling (Stripe, etc.)",
};

/**
 * Derive an OpenAPI tag from an API route path.
 *
 * Examples:
 *   "/api/financial/spending/trends"  → "Financial - Spending"
 *   "/api/admin/metrics"              → "Admin"
 *   "/api/disputes/[id]/send"         → "Disputes"
 *   "/api/credit-repair/cards"        → "Credit Repair"
 */
export function deriveTagFromPath(path: string): string {
  // Strip "/api/" prefix and split
  const stripped = path.replace(/^\/api\//, "");
  const segments = stripped.split("/").filter(Boolean);

  if (segments.length === 0) return "General";

  const domain = segments[0];
  const kebabToTitle = (s: string) =>
    s
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  const domainTitle = kebabToTitle(domain);

  // Financial sub-domains get a two-level tag
  if (domain === "financial" && segments.length >= 2) {
    const sub = segments[1].replace(/^\[.*\]$/, "").trim();
    if (sub) {
      return `Financial - ${kebabToTitle(sub)}`;
    }
  }

  // AI sub-domains
  if (domain === "ai" && segments.length >= 2) {
    const sub = segments[1].replace(/^\[.*\]$/, "").trim();
    if (sub === "financial-coach") return "AI";
    if (sub) return "AI";
  }

  return domainTitle;
}

// ---------------------------------------------------------------------------
// Route description derivation
// ---------------------------------------------------------------------------

const METHOD_VERBS: Record<HttpMethod, string> = {
  get: "Get",
  post: "Create",
  put: "Update",
  patch: "Update",
  delete: "Delete",
};

/**
 * Derive a human-readable summary and description from a route path
 * and HTTP method. Uses heuristics based on REST conventions.
 */
export function deriveRouteDescription(
  path: string,
  method: HttpMethod,
): { summary: string; description: string } {
  const segments = path
    .replace(/^\/api\//, "")
    .split("/")
    .filter(Boolean);

  // Build resource name from non-dynamic, non-domain segments
  const meaningful = segments
    .filter((s) => !s.startsWith("["))
    .map((s) =>
      s
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" "),
    );

  const resource = meaningful.length > 1 ? meaningful.slice(1).join(" ") : meaningful[0] || "Resource";

  const hasDynamic = segments.some((s) => s.startsWith("["));
  const verb = METHOD_VERBS[method];

  let summary: string;
  if (method === "get" && !hasDynamic) {
    summary = `List ${resource}`;
  } else if (method === "get" && hasDynamic) {
    summary = `Get ${resource} by ID`;
  } else if (method === "post") {
    summary = `Create ${resource}`;
  } else if (method === "delete" && hasDynamic) {
    summary = `Delete ${resource}`;
  } else {
    summary = `${verb} ${resource}`;
  }

  const description = `${summary}. Requires authentication.`;

  return { summary, description };
}

// ---------------------------------------------------------------------------
// Operation ID generation
// ---------------------------------------------------------------------------

/**
 * Generate a unique operationId from path + method.
 *
 * Example: "/api/financial/spending/trends" + "get" → "getFinancialSpendingTrends"
 */
export function generateOperationId(
  path: string,
  method: HttpMethod,
): string {
  const parts = path
    .replace(/^\/api\//, "")
    .split("/")
    .filter(Boolean)
    .map((s) => {
      if (s.startsWith("[") && s.endsWith("]")) {
        return "By" + s.slice(1, -1).charAt(0).toUpperCase() + s.slice(2, -1);
      }
      return s
        .split("-")
        .map((w, i) =>
          i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1),
        )
        .join("");
    });

  const camelPath = parts
    .map((p, i) =>
      i === 0 ? p : p.charAt(0).toUpperCase() + p.slice(1),
    )
    .join("");

  return method + camelPath.charAt(0).toUpperCase() + camelPath.slice(1);
}

// ---------------------------------------------------------------------------
// OpenAPI path conversion
// ---------------------------------------------------------------------------

/**
 * Convert a Next.js dynamic route path to OpenAPI path syntax.
 *
 * Example: "/api/disputes/[id]/send" → "/api/disputes/{id}/send"
 */
export function toOpenAPIPath(path: string): string {
  return path.replace(/\[(\w+)\]/g, "{$1}");
}

// ---------------------------------------------------------------------------
// Auth detection
// ---------------------------------------------------------------------------

const PUBLIC_PATHS = [
  "/api/csrf",
  "/api/financial/openapi",
  "/api/email/unsubscribe",
];

const ADMIN_PATHS = ["/api/admin/"];

/**
 * Determine authentication requirement based on the route path.
 */
export function deriveAuth(
  path: string,
): "none" | "bearer" | "admin" {
  if (PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"))) {
    return "none";
  }
  if (ADMIN_PATHS.some((p) => path.startsWith(p))) {
    return "admin";
  }
  return "bearer";
}

// ---------------------------------------------------------------------------
// Main generator
// ---------------------------------------------------------------------------

/**
 * Generate a complete OpenAPI 3.0 specification from discovered route metadata.
 */
export function generateOpenAPISpec(routes: RouteMetadata[]): OpenAPISpec {
  const paths: Record<string, OpenAPIPathItem> = {};
  const tagSet = new Set<string>();

  for (const route of routes) {
    const openApiPath = toOpenAPIPath(route.path);
    const tag = deriveTagFromPath(route.path);
    tagSet.add(tag);

    const pathItem: OpenAPIPathItem = {};

    for (const method of route.methods) {
      const { summary, description } = deriveRouteDescription(
        route.path,
        method,
      );
      const operationId = generateOperationId(route.path, method);
      const auth = deriveAuth(route.path);

      const operation: OpenAPIOperation = {
        tags: [tag],
        summary,
        description,
        operationId,
        responses: {
          "200": {
            description: "Successful response",
            content: {
              "application/json": {
                schema: { type: "object" },
              },
            },
          },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal server error" },
        },
      };

      // Add security
      if (auth === "bearer" || auth === "admin") {
        operation.security = [{ bearerAuth: [] }];
      }
      if (auth === "admin") {
        operation.responses["403"] = { description: "Forbidden — admin role required" };
      }

      // Add path parameters for dynamic segments
      if (route.dynamicSegments.length > 0) {
        operation.parameters = route.dynamicSegments.map((seg) => ({
          name: seg,
          in: "path" as const,
          required: true,
          schema: { type: "string" },
          description: `The ${seg} of the resource`,
        }));
      }

      // Add request body for write methods
      if (method === "post" || method === "put" || method === "patch") {
        operation.requestBody = {
          required: method === "post" || method === "put",
          content: {
            "application/json": {
              schema: { type: "object" },
            },
          },
        };
        if (method === "post") {
          operation.responses["201"] = {
            description: "Resource created successfully",
            content: {
              "application/json": { schema: { type: "object" } },
            },
          };
        }
      }

      // Add 400 for methods that accept input
      if (method !== "get" && method !== "delete") {
        operation.responses["400"] = { description: "Validation error" };
      }

      // Add 404 for single-resource endpoints
      if (route.dynamicSegments.length > 0 && (method === "get" || method === "delete")) {
        operation.responses["404"] = { description: "Resource not found" };
      }

      pathItem[method] = operation;
    }

    paths[openApiPath] = pathItem;
  }

  // Build tags array sorted alphabetically
  const tags: OpenAPITag[] = Array.from(tagSet)
    .sort()
    .map((name) => ({
      name,
      description: TAG_DESCRIPTIONS[name] || `${name} operations`,
    }));

  return {
    openapi: "3.0.0",
    info: {
      title: "Fynvita API",
      version: "1.0.0",
      description:
        "Comprehensive REST API for the Fynvita Financial Vitality Platform. " +
        "Provides 248 endpoints across 41 domains including financial management, " +
        "credit repair, trading, AI insights, and more.",
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
      { url: "http://localhost:3000", description: "Development" },
      { url: "https://app.fynvita.com", description: "Production" },
    ],
    tags,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT token from Supabase Auth",
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            error: { type: "string" },
          },
        },
        Success: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { type: "object" },
          },
        },
      },
    },
    paths,
  };
}

// ---------------------------------------------------------------------------
// Route metadata extraction helpers (used by the build script)
// ---------------------------------------------------------------------------

const HTTP_METHODS: HttpMethod[] = ["get", "post", "put", "patch", "delete"];

/**
 * Extract HTTP methods from the source text of a route.ts file.
 * Looks for exported async function declarations matching HTTP method names.
 */
export function extractMethodsFromSource(source: string): HttpMethod[] {
  const methods: HttpMethod[] = [];
  for (const m of HTTP_METHODS) {
    // Match: export async function GET, export function GET, export const GET
    const pattern = new RegExp(
      `export\\s+(?:async\\s+)?(?:function|const)\\s+${m.toUpperCase()}\\b`,
    );
    if (pattern.test(source)) {
      methods.push(m);
    }
  }
  return methods;
}

/**
 * Extract dynamic path segments from a route path.
 *
 * Example: "/api/disputes/[id]/send" → ["id"]
 */
export function extractDynamicSegments(path: string): string[] {
  const matches = path.match(/\[(\w+)\]/g);
  if (!matches) return [];
  return matches.map((m) => m.slice(1, -1));
}

/**
 * Convert a filesystem path to an API route path.
 *
 * Example: "src/app/api/disputes/[id]/send/route.ts" → "/api/disputes/[id]/send"
 */
export function fsPathToRoutePath(fsPath: string): string {
  // Normalize to forward slashes
  const normalized = fsPath.replace(/\\/g, "/");

  // Find the "api/" segment
  const apiIdx = normalized.indexOf("/api/");
  if (apiIdx === -1) return fsPath;

  // Take from /api/ to the last segment before route.ts
  const afterApi = normalized.slice(apiIdx);
  return afterApi.replace(/\/route\.ts$/, "");
}

/**
 * Build route metadata from a filesystem path and source content.
 */
export function buildRouteMetadata(
  fsPath: string,
  source: string,
): RouteMetadata {
  const path = fsPathToRoutePath(fsPath);
  const methods = extractMethodsFromSource(source);
  const dynamicSegments = extractDynamicSegments(path);

  return { path, methods, dynamicSegments };
}
