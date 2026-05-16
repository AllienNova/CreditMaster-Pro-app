/**
 * @jest-environment node
 */

import {
  ADMIN_ROUTES_MATRIX,
  getRoleLevel,
  meetsRoleRequirement,
  verifyRouteRBAC,
  runRBACAudit,
  buildExpectedRouteConfigs,
  isFullyCompliant,
  type AdminRouteRBAC,
  type RequiredRole,
  type RBACCheckResult,
  type RBACAuditReport,
} from "../admin-rbac-audit";

// ═══════════════════════════════════════════════════════════════════════════════
//  ADMIN_ROUTES_MATRIX
// ═══════════════════════════════════════════════════════════════════════════════
describe("ADMIN_ROUTES_MATRIX", () => {
  it("should contain all known admin routes", () => {
    expect(ADMIN_ROUTES_MATRIX.length).toBeGreaterThanOrEqual(10);
  });

  it("should have unique path+method combinations", () => {
    const keys = ADMIN_ROUTES_MATRIX.map((r) => `${r.path}:${r.method}`);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(keys.length);
  });

  it("should require admin role for all admin routes", () => {
    for (const route of ADMIN_ROUTES_MATRIX) {
      expect(route.requiredRole).toBe("admin");
      expect(route.requiresAuth).toBe(true);
    }
  });

  it("should have valid HTTP methods", () => {
    const validMethods = ["GET", "POST", "PUT", "PATCH", "DELETE"];
    for (const route of ADMIN_ROUTES_MATRIX) {
      expect(validMethods).toContain(route.method);
    }
  });

  it("should have non-empty descriptions", () => {
    for (const route of ADMIN_ROUTES_MATRIX) {
      expect(route.description.length).toBeGreaterThan(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  getRoleLevel
// ═══════════════════════════════════════════════════════════════════════════════
describe("getRoleLevel", () => {
  it("should return 0 for user", () => {
    expect(getRoleLevel("user")).toBe(0);
  });

  it("should return 1 for premium", () => {
    expect(getRoleLevel("premium")).toBe(1);
  });

  it("should return 2 for admin", () => {
    expect(getRoleLevel("admin")).toBe(2);
  });

  it("should return 3 for super_admin", () => {
    expect(getRoleLevel("super_admin")).toBe(3);
  });

  it("should return ascending levels for role hierarchy", () => {
    const roles: RequiredRole[] = ["user", "premium", "admin", "super_admin"];
    for (let i = 1; i < roles.length; i++) {
      expect(getRoleLevel(roles[i])).toBeGreaterThan(getRoleLevel(roles[i - 1]));
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  meetsRoleRequirement
// ═══════════════════════════════════════════════════════════════════════════════
describe("meetsRoleRequirement", () => {
  it("should allow admin to access any role-protected resource", () => {
    expect(meetsRoleRequirement("admin", "user")).toBe(true);
    expect(meetsRoleRequirement("admin", "premium")).toBe(true);
    expect(meetsRoleRequirement("admin", "admin")).toBe(true);
    expect(meetsRoleRequirement("super_admin", "admin")).toBe(true);
  });

  it("should deny user from accessing admin resources", () => {
    expect(meetsRoleRequirement("user", "admin")).toBe(false);
  });

  it("should deny user from accessing premium resources", () => {
    expect(meetsRoleRequirement("user", "premium")).toBe(false);
  });

  it("should allow premium to access user resources", () => {
    expect(meetsRoleRequirement("premium", "user")).toBe(true);
  });

  it("should allow admin to access premium resources", () => {
    expect(meetsRoleRequirement("admin", "premium")).toBe(true);
  });

  it("should deny premium from accessing admin resources", () => {
    expect(meetsRoleRequirement("premium", "admin")).toBe(false);
  });

  it("should allow same-role access", () => {
    const roles: RequiredRole[] = ["user", "premium", "admin", "super_admin"];
    for (const role of roles) {
      expect(meetsRoleRequirement(role, role)).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  verifyRouteRBAC
// ═══════════════════════════════════════════════════════════════════════════════
describe("verifyRouteRBAC", () => {
  const sampleRoute: AdminRouteRBAC = {
    path: "/api/admin/users",
    method: "GET",
    requiredRole: "admin",
    description: "List all users",
    requiresAuth: true,
  };

  it("should pass a fully compliant route", () => {
    const result = verifyRouteRBAC(sampleRoute, {
      hasAuthCheck: true,
      requiredRole: "admin",
      usesRequireRole: true,
      usesRequirePermission: false,
      usesRequireAuth: false,
    });

    expect(result.compliant).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("should fail a route with no auth check", () => {
    const result = verifyRouteRBAC(sampleRoute, {
      hasAuthCheck: false,
      requiredRole: "admin",
      usesRequireRole: true,
      usesRequirePermission: false,
      usesRequireAuth: false,
    });

    expect(result.compliant).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.issues[0]).toContain("no authentication check");
  });

  it("should fail a route missing requireRole and requirePermission", () => {
    const result = verifyRouteRBAC(sampleRoute, {
      hasAuthCheck: true,
      requiredRole: null,
      usesRequireRole: false,
      usesRequirePermission: false,
      usesRequireAuth: false,
    });

    expect(result.compliant).toBe(false);
    expect(result.issues.some((i) => i.includes("requireRole"))).toBe(true);
  });

  it("should warn when route uses requireAuth but not requireRole", () => {
    const result = verifyRouteRBAC(sampleRoute, {
      hasAuthCheck: true,
      requiredRole: null,
      usesRequireRole: false,
      usesRequirePermission: false,
      usesRequireAuth: true,
    });

    expect(result.warnings.some((w) => w.includes("requireAuth"))).toBe(true);
  });

  it("should fail when actual role level is lower than expected", () => {
    const result = verifyRouteRBAC(sampleRoute, {
      hasAuthCheck: true,
      requiredRole: "user",
      usesRequireRole: true,
      usesRequirePermission: false,
      usesRequireAuth: false,
    });

    expect(result.compliant).toBe(false);
    expect(
      result.issues.some((i) => i.includes("should require")),
    ).toBe(true);
  });

  it("should pass when actual role level is equal to expected", () => {
    const result = verifyRouteRBAC(sampleRoute, {
      hasAuthCheck: true,
      requiredRole: "admin",
      usesRequireRole: true,
      usesRequirePermission: false,
      usesRequireAuth: false,
    });

    expect(result.compliant).toBe(true);
  });

  it("should pass when using requirePermission instead of requireRole", () => {
    const result = verifyRouteRBAC(sampleRoute, {
      hasAuthCheck: true,
      requiredRole: "admin",
      usesRequireRole: false,
      usesRequirePermission: true,
      usesRequireAuth: false,
    });

    expect(result.compliant).toBe(true);
  });

  it("should warn if admin route requires lower role in matrix", () => {
    const lowRoleAdminRoute: AdminRouteRBAC = {
      path: "/api/admin/public-info",
      method: "GET",
      requiredRole: "user",
      description: "Public admin info",
      requiresAuth: true,
    };

    const result = verifyRouteRBAC(lowRoleAdminRoute, {
      hasAuthCheck: true,
      requiredRole: "user",
      usesRequireRole: true,
      usesRequirePermission: false,
      usesRequireAuth: false,
    });

    expect(
      result.warnings.some((w) => w.includes("only")),
    ).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  runRBACAudit
// ═══════════════════════════════════════════════════════════════════════════════
describe("runRBACAudit", () => {
  it("should return 100% compliance for expected configs", () => {
    const configs = buildExpectedRouteConfigs();
    const report = runRBACAudit(configs);

    expect(report.compliancePercentage).toBe(100);
    expect(report.nonCompliantRoutes).toBe(0);
    expect(report.criticalIssues).toHaveLength(0);
  });

  it("should return non-compliant routes when configs are missing", () => {
    const emptyConfigs = new Map<
      string,
      {
        hasAuthCheck: boolean;
        requiredRole: RequiredRole | null;
        usesRequireRole: boolean;
        usesRequirePermission: boolean;
        usesRequireAuth: boolean;
      }
    >();

    const report = runRBACAudit(emptyConfigs);

    expect(report.nonCompliantRoutes).toBe(ADMIN_ROUTES_MATRIX.length);
    expect(report.compliancePercentage).toBe(0);
    expect(report.criticalIssues.length).toBeGreaterThan(0);
  });

  it("should detect partially compliant configurations", () => {
    const configs = buildExpectedRouteConfigs();
    // Remove one route to make it partially compliant
    const firstKey = Array.from(configs.keys())[0];
    configs.delete(firstKey);

    const report = runRBACAudit(configs);

    expect(report.nonCompliantRoutes).toBe(1);
    expect(report.compliancePercentage).toBeLessThan(100);
  });

  it("should include timestamp in report", () => {
    const configs = buildExpectedRouteConfigs();
    const report = runRBACAudit(configs);

    expect(report.timestamp).toBeInstanceOf(Date);
  });

  it("should warn about routes found but not in matrix", () => {
    const configs = buildExpectedRouteConfigs();
    configs.set("/api/admin/unknown:GET", {
      hasAuthCheck: true,
      requiredRole: "admin",
      usesRequireRole: true,
      usesRequirePermission: false,
      usesRequireAuth: false,
    });

    const report = runRBACAudit(configs);

    expect(report.warnings.some((w) => w.includes("not in the RBAC matrix"))).toBe(true);
  });

  it("should report total route count matching matrix length", () => {
    const configs = buildExpectedRouteConfigs();
    const report = runRBACAudit(configs);

    expect(report.totalRoutes).toBe(ADMIN_ROUTES_MATRIX.length);
  });

  it("should detect routes with missing auth check", () => {
    const configs = buildExpectedRouteConfigs();
    const firstKey = Array.from(configs.keys())[0];
    configs.set(firstKey, {
      hasAuthCheck: false,
      requiredRole: "admin",
      usesRequireRole: true,
      usesRequirePermission: false,
      usesRequireAuth: false,
    });

    const report = runRBACAudit(configs);

    expect(report.nonCompliantRoutes).toBeGreaterThanOrEqual(1);
    expect(report.criticalIssues.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  buildExpectedRouteConfigs
// ═══════════════════════════════════════════════════════════════════════════════
describe("buildExpectedRouteConfigs", () => {
  it("should return a Map with correct size", () => {
    const configs = buildExpectedRouteConfigs();
    expect(configs.size).toBe(ADMIN_ROUTES_MATRIX.length);
  });

  it("should have keys matching path:method format", () => {
    const configs = buildExpectedRouteConfigs();
    for (const key of configs.keys()) {
      expect(key).toMatch(/^\/api\/admin\/.+:(GET|POST|PUT|PATCH|DELETE)$/);
    }
  });

  it("should set all routes as having auth checks", () => {
    const configs = buildExpectedRouteConfigs();
    for (const config of configs.values()) {
      expect(config.hasAuthCheck).toBe(true);
      expect(config.usesRequireRole).toBe(true);
    }
  });

  it("should set correct role for each route", () => {
    const configs = buildExpectedRouteConfigs();
    for (const route of ADMIN_ROUTES_MATRIX) {
      const key = `${route.path}:${route.method}`;
      const config = configs.get(key);
      expect(config).toBeDefined();
      expect(config?.requiredRole).toBe(route.requiredRole);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  isFullyCompliant
// ═══════════════════════════════════════════════════════════════════════════════
describe("isFullyCompliant", () => {
  it("should return true for expected configs", () => {
    const configs = buildExpectedRouteConfigs();
    expect(isFullyCompliant(configs)).toBe(true);
  });

  it("should return false for empty configs", () => {
    const emptyConfigs = new Map<
      string,
      {
        hasAuthCheck: boolean;
        requiredRole: RequiredRole | null;
        usesRequireRole: boolean;
        usesRequirePermission: boolean;
        usesRequireAuth: boolean;
      }
    >();
    expect(isFullyCompliant(emptyConfigs)).toBe(false);
  });

  it("should return false when any route is non-compliant", () => {
    const configs = buildExpectedRouteConfigs();
    const firstKey = Array.from(configs.keys())[0];
    configs.set(firstKey, {
      hasAuthCheck: false,
      requiredRole: null,
      usesRequireRole: false,
      usesRequirePermission: false,
      usesRequireAuth: false,
    });

    expect(isFullyCompliant(configs)).toBe(false);
  });
});
