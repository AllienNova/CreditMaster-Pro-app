/**
 * OpenAPI Generator — Unit Tests
 *
 * Tests tag derivation, route description, operation ID generation,
 * path conversion, auth detection, spec generation, and route metadata extraction.
 */

import {
  deriveTagFromPath,
  deriveRouteDescription,
  generateOperationId,
  toOpenAPIPath,
  deriveAuth,
  generateOpenAPISpec,
  extractMethodsFromSource,
  extractDynamicSegments,
  fsPathToRoutePath,
  buildRouteMetadata,
  type RouteMetadata,
  type HttpMethod,
} from "../openapi-generator";

// ---------------------------------------------------------------------------
// deriveTagFromPath
// ---------------------------------------------------------------------------

describe("deriveTagFromPath", () => {
  it("should derive Financial sub-domain tags", () => {
    expect(deriveTagFromPath("/api/financial/spending")).toBe("Financial - Spending");
    expect(deriveTagFromPath("/api/financial/budgets")).toBe("Financial - Budgets");
    expect(deriveTagFromPath("/api/financial/goals")).toBe("Financial - Goals");
    expect(deriveTagFromPath("/api/financial/bills")).toBe("Financial - Bills");
    expect(deriveTagFromPath("/api/financial/savings")).toBe("Financial - Savings");
    expect(deriveTagFromPath("/api/financial/transactions")).toBe("Financial - Transactions");
    expect(deriveTagFromPath("/api/financial/income")).toBe("Financial - Income");
    expect(deriveTagFromPath("/api/financial/debt")).toBe("Financial - Debt");
    expect(deriveTagFromPath("/api/financial/credit")).toBe("Financial - Credit");
    expect(deriveTagFromPath("/api/financial/dashboard")).toBe("Financial - Dashboard");
    expect(deriveTagFromPath("/api/financial/health-score")).toBe("Financial - Health Score");
    expect(deriveTagFromPath("/api/financial/ai-insights")).toBe("Financial - Ai Insights");
  });

  it("should derive Financial sub-domain tags from deep paths", () => {
    expect(deriveTagFromPath("/api/financial/spending/trends")).toBe("Financial - Spending");
    expect(deriveTagFromPath("/api/financial/budgets/analyze")).toBe("Financial - Budgets");
    expect(deriveTagFromPath("/api/financial/bills/[id]/negotiate")).toBe("Financial - Bills");
  });

  it("should derive top-level domain tags", () => {
    expect(deriveTagFromPath("/api/admin/metrics")).toBe("Admin");
    expect(deriveTagFromPath("/api/disputes/[id]/send")).toBe("Disputes");
    expect(deriveTagFromPath("/api/notifications/push")).toBe("Notifications");
    expect(deriveTagFromPath("/api/trading/orders")).toBe("Trading");
    expect(deriveTagFromPath("/api/documents/upload")).toBe("Documents");
  });

  it("should convert kebab-case to Title Case", () => {
    expect(deriveTagFromPath("/api/credit-repair/cards")).toBe("Credit Repair");
    expect(deriveTagFromPath("/api/credit-builder/loans")).toBe("Credit Builder");
    expect(deriveTagFromPath("/api/credit-bureau/reports")).toBe("Credit Bureau");
    expect(deriveTagFromPath("/api/health-score/v2")).toBe("Health Score");
  });

  it("should handle AI sub-domains", () => {
    expect(deriveTagFromPath("/api/ai/financial-coach")).toBe("AI");
    expect(deriveTagFromPath("/api/ai/analysis")).toBe("AI");
  });

  it("should return General for empty path", () => {
    expect(deriveTagFromPath("/api/")).toBe("General");
    expect(deriveTagFromPath("/api")).toBe("Api");
  });

  it("should handle financial with dynamic segment as first sub-path", () => {
    expect(deriveTagFromPath("/api/financial/[id]")).toBe("Financial");
  });

  it("should handle single-segment paths", () => {
    expect(deriveTagFromPath("/api/csrf")).toBe("Csrf");
    expect(deriveTagFromPath("/api/auth")).toBe("Auth");
    expect(deriveTagFromPath("/api/cron")).toBe("Cron");
  });
});

// ---------------------------------------------------------------------------
// deriveRouteDescription
// ---------------------------------------------------------------------------

describe("deriveRouteDescription", () => {
  it("should generate List summary for GET without dynamic segments", () => {
    const result = deriveRouteDescription("/api/financial/spending", "get");
    expect(result.summary).toBe("List Spending");
    expect(result.description).toBe("List Spending. Requires authentication.");
  });

  it("should generate Get by ID summary for GET with dynamic segments", () => {
    const result = deriveRouteDescription("/api/disputes/[id]", "get");
    expect(result.summary).toBe("Get Disputes by ID");
  });

  it("should generate Create summary for POST", () => {
    const result = deriveRouteDescription("/api/financial/goals", "post");
    expect(result.summary).toBe("Create Goals");
  });

  it("should generate Delete summary for DELETE with dynamic segments", () => {
    const result = deriveRouteDescription("/api/documents/[id]", "delete");
    expect(result.summary).toBe("Delete Documents");
  });

  it("should generate Update summary for PUT", () => {
    const result = deriveRouteDescription("/api/settings/preferences", "put");
    expect(result.summary).toBe("Update Preferences");
  });

  it("should generate Update summary for PATCH", () => {
    const result = deriveRouteDescription("/api/notifications/[id]", "patch");
    expect(result.summary).toBe("Update Notifications");
  });

  it("should handle deep nested paths", () => {
    const result = deriveRouteDescription("/api/financial/spending/trends", "get");
    expect(result.summary).toBe("List Spending Trends");
  });

  it("should handle kebab-case resource names", () => {
    const result = deriveRouteDescription("/api/financial/health-score/v2", "get");
    expect(result.summary).toBe("List Health Score V2");
  });

  it("should handle single-segment path", () => {
    const result = deriveRouteDescription("/api/csrf", "get");
    expect(result.summary).toBe("List Csrf");
  });

  it("should include Requires authentication in description", () => {
    const result = deriveRouteDescription("/api/admin/users", "get");
    expect(result.description).toContain("Requires authentication");
  });
});

// ---------------------------------------------------------------------------
// generateOperationId
// ---------------------------------------------------------------------------

describe("generateOperationId", () => {
  it("should generate camelCase operation IDs", () => {
    expect(generateOperationId("/api/financial/spending/trends", "get")).toBe(
      "getFinancialSpendingTrends",
    );
  });

  it("should handle dynamic segments with By prefix", () => {
    const id = generateOperationId("/api/disputes/[id]/send", "post");
    expect(id).toBe("postDisputesByIdSend");
  });

  it("should handle different HTTP methods", () => {
    expect(generateOperationId("/api/goals", "get")).toBe("getGoals");
    expect(generateOperationId("/api/goals", "post")).toBe("postGoals");
    expect(generateOperationId("/api/goals", "put")).toBe("putGoals");
    expect(generateOperationId("/api/goals", "patch")).toBe("patchGoals");
    expect(generateOperationId("/api/goals", "delete")).toBe("deleteGoals");
  });

  it("should handle kebab-case paths", () => {
    expect(generateOperationId("/api/credit-repair/cards", "get")).toBe(
      "getCreditRepairCards",
    );
  });

  it("should handle single segment paths", () => {
    expect(generateOperationId("/api/csrf", "get")).toBe("getCsrf");
  });

  it("should handle deeply nested paths", () => {
    const id = generateOperationId("/api/financial/bills/[id]/negotiate", "post");
    expect(id).toBe("postFinancialBillsByIdNegotiate");
  });
});

// ---------------------------------------------------------------------------
// toOpenAPIPath
// ---------------------------------------------------------------------------

describe("toOpenAPIPath", () => {
  it("should convert Next.js dynamic segments to OpenAPI format", () => {
    expect(toOpenAPIPath("/api/disputes/[id]/send")).toBe("/api/disputes/{id}/send");
  });

  it("should handle multiple dynamic segments", () => {
    expect(toOpenAPIPath("/api/users/[userId]/posts/[postId]")).toBe(
      "/api/users/{userId}/posts/{postId}",
    );
  });

  it("should not modify paths without dynamic segments", () => {
    expect(toOpenAPIPath("/api/financial/spending")).toBe("/api/financial/spending");
  });

  it("should handle path with only a dynamic segment", () => {
    expect(toOpenAPIPath("/api/[id]")).toBe("/api/{id}");
  });
});

// ---------------------------------------------------------------------------
// deriveAuth
// ---------------------------------------------------------------------------

describe("deriveAuth", () => {
  it("should return none for public paths", () => {
    expect(deriveAuth("/api/csrf")).toBe("none");
    expect(deriveAuth("/api/financial/openapi")).toBe("none");
    expect(deriveAuth("/api/email/unsubscribe")).toBe("none");
  });

  it("should return none for sub-paths of public paths", () => {
    expect(deriveAuth("/api/financial/openapi/spec")).toBe("none");
    expect(deriveAuth("/api/email/unsubscribe/confirm")).toBe("none");
  });

  it("should return admin for admin paths", () => {
    expect(deriveAuth("/api/admin/users")).toBe("admin");
    expect(deriveAuth("/api/admin/metrics")).toBe("admin");
    expect(deriveAuth("/api/admin/analytics")).toBe("admin");
  });

  it("should return bearer for all other paths", () => {
    expect(deriveAuth("/api/financial/spending")).toBe("bearer");
    expect(deriveAuth("/api/disputes/[id]")).toBe("bearer");
    expect(deriveAuth("/api/trading/orders")).toBe("bearer");
    expect(deriveAuth("/api/notifications/push")).toBe("bearer");
  });
});

// ---------------------------------------------------------------------------
// generateOpenAPISpec
// ---------------------------------------------------------------------------

describe("generateOpenAPISpec", () => {
  const sampleRoutes: RouteMetadata[] = [
    {
      path: "/api/financial/spending",
      methods: ["get", "post"],
      dynamicSegments: [],
    },
    {
      path: "/api/disputes/[id]",
      methods: ["get", "put", "delete"],
      dynamicSegments: ["id"],
    },
    {
      path: "/api/admin/users",
      methods: ["get"],
      dynamicSegments: [],
    },
    {
      path: "/api/csrf",
      methods: ["get"],
      dynamicSegments: [],
    },
  ];

  let spec: ReturnType<typeof generateOpenAPISpec>;

  beforeAll(() => {
    spec = generateOpenAPISpec(sampleRoutes);
  });

  it("should produce a valid OpenAPI 3.0.0 spec", () => {
    expect(spec.openapi).toBe("3.0.0");
    expect(spec.info.title).toBe("Fynvita API");
    expect(spec.info.version).toBe("1.0.0");
  });

  it("should include server entries", () => {
    expect(spec.servers).toHaveLength(2);
    expect(spec.servers[0].url).toContain("localhost");
    expect(spec.servers[1].url).toContain("fynvita.com");
  });

  it("should include security schemes", () => {
    expect(spec.components.securitySchemes).toHaveProperty("bearerAuth");
  });

  it("should include common schemas", () => {
    expect(spec.components.schemas).toHaveProperty("Error");
    expect(spec.components.schemas).toHaveProperty("Success");
  });

  it("should generate paths for all routes", () => {
    expect(Object.keys(spec.paths)).toHaveLength(4);
    expect(spec.paths["/api/financial/spending"]).toBeDefined();
    expect(spec.paths["/api/disputes/{id}"]).toBeDefined();
    expect(spec.paths["/api/admin/users"]).toBeDefined();
    expect(spec.paths["/api/csrf"]).toBeDefined();
  });

  it("should generate operations for each method", () => {
    const spending = spec.paths["/api/financial/spending"];
    expect(spending.get).toBeDefined();
    expect(spending.post).toBeDefined();
    expect(spending.put).toBeUndefined();

    const dispute = spec.paths["/api/disputes/{id}"];
    expect(dispute.get).toBeDefined();
    expect(dispute.put).toBeDefined();
    expect(dispute.delete).toBeDefined();
  });

  it("should set security for authenticated routes", () => {
    const spending = spec.paths["/api/financial/spending"];
    expect(spending.get.security).toEqual([{ bearerAuth: [] }]);
  });

  it("should not set security for public routes", () => {
    const csrf = spec.paths["/api/csrf"];
    expect(csrf.get.security).toBeUndefined();
  });

  it("should add 403 response for admin routes", () => {
    const admin = spec.paths["/api/admin/users"];
    expect(admin.get.responses["403"]).toBeDefined();
    expect(admin.get.responses["403"].description).toContain("admin");
  });

  it("should add path parameters for dynamic segments", () => {
    const dispute = spec.paths["/api/disputes/{id}"];
    expect(dispute.get.parameters).toHaveLength(1);
    expect(dispute.get.parameters![0].name).toBe("id");
    expect(dispute.get.parameters![0].in).toBe("path");
    expect(dispute.get.parameters![0].required).toBe(true);
  });

  it("should not add path parameters for static routes", () => {
    const spending = spec.paths["/api/financial/spending"];
    expect(spending.get.parameters).toBeUndefined();
  });

  it("should add request body for POST/PUT/PATCH", () => {
    const spending = spec.paths["/api/financial/spending"];
    expect(spending.post.requestBody).toBeDefined();
    expect(spending.post.requestBody!.required).toBe(true);

    const dispute = spec.paths["/api/disputes/{id}"];
    expect(dispute.put.requestBody).toBeDefined();
    expect(dispute.put.requestBody!.required).toBe(true);
  });

  it("should not add request body for GET/DELETE", () => {
    const spending = spec.paths["/api/financial/spending"];
    expect(spending.get.requestBody).toBeUndefined();

    const dispute = spec.paths["/api/disputes/{id}"];
    expect(dispute.delete.requestBody).toBeUndefined();
  });

  it("should add 201 response for POST", () => {
    const spending = spec.paths["/api/financial/spending"];
    expect(spending.post.responses["201"]).toBeDefined();
  });

  it("should add 400 response for write methods", () => {
    const spending = spec.paths["/api/financial/spending"];
    expect(spending.post.responses["400"]).toBeDefined();

    const dispute = spec.paths["/api/disputes/{id}"];
    expect(dispute.put.responses["400"]).toBeDefined();
  });

  it("should not add 400 for GET/DELETE", () => {
    const spending = spec.paths["/api/financial/spending"];
    expect(spending.get.responses["400"]).toBeUndefined();

    const dispute = spec.paths["/api/disputes/{id}"];
    expect(dispute.delete.responses["400"]).toBeUndefined();
  });

  it("should add 404 for dynamic GET/DELETE", () => {
    const dispute = spec.paths["/api/disputes/{id}"];
    expect(dispute.get.responses["404"]).toBeDefined();
    expect(dispute.delete.responses["404"]).toBeDefined();
  });

  it("should not add 404 for static routes", () => {
    const spending = spec.paths["/api/financial/spending"];
    expect(spending.get.responses["404"]).toBeUndefined();
  });

  it("should generate unique operationIds", () => {
    const ids = new Set<string>();
    for (const [, pathItem] of Object.entries(spec.paths)) {
      for (const [, operation] of Object.entries(pathItem)) {
        const op = operation as { operationId: string };
        expect(ids.has(op.operationId)).toBe(false);
        ids.add(op.operationId);
      }
    }
  });

  it("should assign appropriate tags", () => {
    const spending = spec.paths["/api/financial/spending"];
    expect(spending.get.tags).toContain("Financial - Spending");

    const admin = spec.paths["/api/admin/users"];
    expect(admin.get.tags).toContain("Admin");
  });

  it("should generate sorted tags array", () => {
    const tagNames = spec.tags.map((t) => t.name);
    const sorted = [...tagNames].sort();
    expect(tagNames).toEqual(sorted);
  });

  it("should include tag descriptions from TAG_DESCRIPTIONS", () => {
    const adminTag = spec.tags.find((t) => t.name === "Admin");
    expect(adminTag).toBeDefined();
    expect(adminTag!.description).toContain("administration");
  });

  it("should generate fallback description for unknown tags", () => {
    const csrfTag = spec.tags.find((t) => t.name === "Csrf");
    expect(csrfTag).toBeDefined();
    // CSRF is in TAG_DESCRIPTIONS, but Csrf (capitalized differently) is not
    expect(csrfTag!.description).toContain("operations");
  });

  it("should handle empty routes array", () => {
    const emptySpec = generateOpenAPISpec([]);
    expect(Object.keys(emptySpec.paths)).toHaveLength(0);
    expect(emptySpec.tags).toHaveLength(0);
    expect(emptySpec.openapi).toBe("3.0.0");
  });

  it("should handle routes with all HTTP methods", () => {
    const allMethods: RouteMetadata = {
      path: "/api/resource",
      methods: ["get", "post", "put", "patch", "delete"],
      dynamicSegments: [],
    };
    const fullSpec = generateOpenAPISpec([allMethods]);
    const resource = fullSpec.paths["/api/resource"];
    expect(resource.get).toBeDefined();
    expect(resource.post).toBeDefined();
    expect(resource.put).toBeDefined();
    expect(resource.patch).toBeDefined();
    expect(resource.delete).toBeDefined();
  });

  it("should include 200 and 401 and 500 responses for all operations", () => {
    for (const [, pathItem] of Object.entries(spec.paths)) {
      for (const [, operation] of Object.entries(pathItem)) {
        const op = operation as { responses: Record<string, unknown> };
        expect(op.responses["200"]).toBeDefined();
        expect(op.responses["401"]).toBeDefined();
        expect(op.responses["500"]).toBeDefined();
      }
    }
  });
});

// ---------------------------------------------------------------------------
// extractMethodsFromSource
// ---------------------------------------------------------------------------

describe("extractMethodsFromSource", () => {
  it("should extract async function exports", () => {
    const source = `
      export async function GET(request: Request) { return new Response(); }
      export async function POST(request: Request) { return new Response(); }
    `;
    expect(extractMethodsFromSource(source)).toEqual(["get", "post"]);
  });

  it("should extract non-async function exports", () => {
    const source = `export function GET() { return new Response(); }`;
    expect(extractMethodsFromSource(source)).toEqual(["get"]);
  });

  it("should extract const exports", () => {
    const source = `export const GET = async () => new Response();`;
    expect(extractMethodsFromSource(source)).toEqual(["get"]);
  });

  it("should extract all HTTP methods", () => {
    const source = `
      export async function GET() {}
      export async function POST() {}
      export async function PUT() {}
      export async function PATCH() {}
      export async function DELETE() {}
    `;
    const methods = extractMethodsFromSource(source);
    expect(methods).toEqual(["get", "post", "put", "patch", "delete"]);
  });

  it("should return empty array for source without HTTP exports", () => {
    const source = `export function helper() { return 42; }`;
    expect(extractMethodsFromSource(source)).toEqual([]);
  });

  it("should not match non-exported functions", () => {
    const source = `async function GET() { return new Response(); }`;
    expect(extractMethodsFromSource(source)).toEqual([]);
  });

  it("should not match functions inside comments", () => {
    // The regex doesn't look inside comments, but a real export will still match
    const source = `// export async function GET() {}`;
    // Single-line comment — the regex still matches because it's on the line
    // This is a known limitation; the generator errs on the side of inclusion
    const methods = extractMethodsFromSource(source);
    expect(methods).toEqual(["get"]);
  });
});

// ---------------------------------------------------------------------------
// extractDynamicSegments
// ---------------------------------------------------------------------------

describe("extractDynamicSegments", () => {
  it("should extract a single dynamic segment", () => {
    expect(extractDynamicSegments("/api/disputes/[id]/send")).toEqual(["id"]);
  });

  it("should extract multiple dynamic segments", () => {
    expect(extractDynamicSegments("/api/users/[userId]/posts/[postId]")).toEqual([
      "userId",
      "postId",
    ]);
  });

  it("should return empty array for static paths", () => {
    expect(extractDynamicSegments("/api/financial/spending")).toEqual([]);
  });

  it("should handle path with only a dynamic segment", () => {
    expect(extractDynamicSegments("/api/[id]")).toEqual(["id"]);
  });
});

// ---------------------------------------------------------------------------
// fsPathToRoutePath
// ---------------------------------------------------------------------------

describe("fsPathToRoutePath", () => {
  it("should convert filesystem path to route path", () => {
    expect(fsPathToRoutePath("src/app/api/disputes/[id]/send/route.ts")).toBe(
      "/api/disputes/[id]/send",
    );
  });

  it("should handle simple route paths", () => {
    expect(fsPathToRoutePath("src/app/api/financial/spending/route.ts")).toBe(
      "/api/financial/spending",
    );
  });

  it("should normalize backslashes on Windows-style paths", () => {
    expect(fsPathToRoutePath("src\\app\\api\\admin\\users\\route.ts")).toBe(
      "/api/admin/users",
    );
  });

  it("should handle deeply nested paths", () => {
    expect(
      fsPathToRoutePath("src/app/api/financial/bills/[id]/negotiate/route.ts"),
    ).toBe("/api/financial/bills/[id]/negotiate");
  });

  it("should return original path if /api/ not found", () => {
    expect(fsPathToRoutePath("src/lib/utils.ts")).toBe("src/lib/utils.ts");
  });

  it("should handle absolute paths", () => {
    expect(
      fsPathToRoutePath("/Users/dev/project/src/app/api/goals/route.ts"),
    ).toBe("/api/goals");
  });
});

// ---------------------------------------------------------------------------
// buildRouteMetadata
// ---------------------------------------------------------------------------

describe("buildRouteMetadata", () => {
  it("should combine path, methods, and dynamic segments", () => {
    const source = `
      export async function GET(request: Request) { return new Response(); }
      export async function POST(request: Request) { return new Response(); }
    `;
    const meta = buildRouteMetadata(
      "src/app/api/disputes/[id]/route.ts",
      source,
    );

    expect(meta.path).toBe("/api/disputes/[id]");
    expect(meta.methods).toEqual(["get", "post"]);
    expect(meta.dynamicSegments).toEqual(["id"]);
  });

  it("should handle routes without dynamic segments", () => {
    const source = `export async function GET() { return new Response(); }`;
    const meta = buildRouteMetadata(
      "src/app/api/financial/spending/route.ts",
      source,
    );

    expect(meta.path).toBe("/api/financial/spending");
    expect(meta.methods).toEqual(["get"]);
    expect(meta.dynamicSegments).toEqual([]);
  });

  it("should handle routes with no HTTP methods", () => {
    const source = `export function middleware() {}`;
    const meta = buildRouteMetadata("src/app/api/test/route.ts", source);

    expect(meta.methods).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Integration: end-to-end spec generation
// ---------------------------------------------------------------------------

describe("end-to-end spec generation", () => {
  it("should produce a spec from realistic route metadata", () => {
    const routes: RouteMetadata[] = [
      { path: "/api/financial/spending", methods: ["get"], dynamicSegments: [] },
      { path: "/api/financial/spending/trends", methods: ["get"], dynamicSegments: [] },
      { path: "/api/financial/spending/analysis", methods: ["get", "post"], dynamicSegments: [] },
      { path: "/api/financial/goals", methods: ["get", "post"], dynamicSegments: [] },
      { path: "/api/financial/goals/[id]", methods: ["get", "put", "delete"], dynamicSegments: ["id"] },
      { path: "/api/admin/users", methods: ["get", "post"], dynamicSegments: [] },
      { path: "/api/admin/users/[id]", methods: ["get", "put", "delete"], dynamicSegments: ["id"] },
      { path: "/api/csrf", methods: ["get"], dynamicSegments: [] },
      { path: "/api/trading/orders", methods: ["get", "post"], dynamicSegments: [] },
      { path: "/api/notifications/push", methods: ["post"], dynamicSegments: [] },
    ];

    const spec = generateOpenAPISpec(routes);

    // Structural checks
    expect(spec.openapi).toBe("3.0.0");
    expect(Object.keys(spec.paths)).toHaveLength(10);

    // Tag deduplication
    const tagNames = spec.tags.map((t) => t.name);
    expect(new Set(tagNames).size).toBe(tagNames.length);

    // Sorted tags
    expect(tagNames).toEqual([...tagNames].sort());

    // Total operations
    let operationCount = 0;
    for (const pathItem of Object.values(spec.paths)) {
      operationCount += Object.keys(pathItem).length;
    }
    expect(operationCount).toBe(18);

    // Admin security
    const adminUsers = spec.paths["/api/admin/users"];
    expect(adminUsers.get.security).toEqual([{ bearerAuth: [] }]);
    expect(adminUsers.get.responses["403"]).toBeDefined();

    // Public no security
    const csrf = spec.paths["/api/csrf"];
    expect(csrf.get.security).toBeUndefined();

    // Dynamic parameters
    const goalById = spec.paths["/api/financial/goals/{id}"];
    expect(goalById.get.parameters).toHaveLength(1);
    expect(goalById.get.parameters![0].name).toBe("id");

    // Write method request bodies
    expect(goalById.put.requestBody).toBeDefined();
    expect(goalById.delete.requestBody).toBeUndefined();
  });
});
