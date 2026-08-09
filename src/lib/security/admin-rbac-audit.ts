/**
 * Admin RBAC Audit Service
 *
 * Scans admin routes to verify RBAC middleware usage and reports
 * routes with missing or incorrect permission checks.
 *
 * Defines the expected permissions matrix for all admin routes
 * and provides verification utilities for security audits.
 */

import { type Role, roleRank, isAtLeast } from "@/lib/auth/roles";

/** Supported HTTP methods for admin routes */
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/** Minimum required role for accessing a route. Alias of the canonical {@link Role}. */
export type RequiredRole = Role;

/** RBAC requirement for a single admin endpoint */
export interface AdminRouteRBAC {
  /** Route path (relative to /api/admin/) */
  path: string;
  /** HTTP method */
  method: HttpMethod;
  /** Minimum role required */
  requiredRole: RequiredRole;
  /** Description of what this endpoint does */
  description: string;
  /** Whether the route uses requireRole/requirePermission middleware */
  requiresAuth: boolean;
}

/** Result of scanning a single route for RBAC compliance */
export interface RBACCheckResult {
  route: AdminRouteRBAC;
  /** Whether the route has proper RBAC enforcement */
  compliant: boolean;
  /** Issues found during the scan */
  issues: string[];
  /** Warnings (non-blocking) */
  warnings: string[];
}

/** Summary of a full RBAC audit */
export interface RBACAuditReport {
  /** Timestamp of the audit */
  timestamp: Date;
  /** Total routes scanned */
  totalRoutes: number;
  /** Number of compliant routes */
  compliantRoutes: number;
  /** Number of non-compliant routes */
  nonCompliantRoutes: number;
  /** Compliance percentage */
  compliancePercentage: number;
  /** Detailed results per route */
  results: RBACCheckResult[];
  /** Overall issues found */
  criticalIssues: string[];
  /** Overall warnings */
  warnings: string[];
}

/**
 * Expected permissions matrix for all admin routes.
 *
 * This is the canonical reference for what role is required
 * to access each admin endpoint. When a new admin route is
 * added, it MUST be registered here.
 */
export const ADMIN_ROUTES_MATRIX: AdminRouteRBAC[] = [
  {
    path: "/api/admin/auth",
    method: "GET",
    requiredRole: "admin",
    description: "Verify admin authentication status",
    requiresAuth: true,
  },
  {
    path: "/api/admin/users",
    method: "GET",
    requiredRole: "admin",
    description: "List all platform users",
    requiresAuth: true,
  },
  {
    path: "/api/admin/users",
    method: "PATCH",
    requiredRole: "admin",
    description: "Update user profile (admin only)",
    requiresAuth: true,
  },
  {
    path: "/api/admin/stats",
    method: "GET",
    requiredRole: "admin",
    description: "Platform-wide statistics",
    requiresAuth: true,
  },
  {
    path: "/api/admin/metrics",
    method: "GET",
    requiredRole: "admin",
    description: "Platform metrics by period",
    requiresAuth: true,
  },
  {
    path: "/api/admin/settings",
    method: "GET",
    requiredRole: "admin",
    description: "Read platform settings",
    requiresAuth: true,
  },
  {
    path: "/api/admin/settings",
    method: "PATCH",
    requiredRole: "admin",
    description: "Update platform settings",
    requiresAuth: true,
  },
  {
    path: "/api/admin/disputes",
    method: "GET",
    requiredRole: "admin",
    description: "List all disputes",
    requiresAuth: true,
  },
  {
    path: "/api/admin/subscriptions",
    method: "GET",
    requiredRole: "admin",
    description: "List all subscriptions",
    requiresAuth: true,
  },
  {
    path: "/api/admin/logs",
    method: "GET",
    requiredRole: "admin",
    description: "Read system logs",
    requiresAuth: true,
  },
  {
    path: "/api/admin/audit",
    method: "GET",
    requiredRole: "admin",
    description: "Read audit trail",
    requiresAuth: true,
  },
  {
    path: "/api/admin/analytics",
    method: "GET",
    requiredRole: "admin",
    description: "Analytics dashboard data",
    requiresAuth: true,
  },
];

/**
 * Get the privilege level for a role (0-based rank in the canonical hierarchy).
 */
export function getRoleLevel(role: RequiredRole): number {
  return roleRank(role);
}

/**
 * Check whether `userRole` meets the minimum required role.
 */
export function meetsRoleRequirement(
  userRole: RequiredRole,
  requiredRole: RequiredRole,
): boolean {
  return isAtLeast(userRole, requiredRole);
}

/**
 * Verify a single route's RBAC configuration.
 *
 * @param route - The route definition from the permissions matrix
 * @param actualConfig - What was found when scanning the route file
 */
export function verifyRouteRBAC(
  route: AdminRouteRBAC,
  actualConfig: {
    hasAuthCheck: boolean;
    requiredRole: RequiredRole | null;
    usesRequireRole: boolean;
    usesRequirePermission: boolean;
    usesRequireAuth: boolean;
  },
): RBACCheckResult {
  const issues: string[] = [];
  const warnings: string[] = [];

  // Check 1: Route must have an authentication check
  if (!actualConfig.hasAuthCheck) {
    issues.push(
      `Route ${route.path} [${route.method}] has no authentication check`,
    );
  }

  // Check 2: Route must use requireRole or requirePermission
  if (!actualConfig.usesRequireRole && !actualConfig.usesRequirePermission) {
    if (actualConfig.usesRequireAuth) {
      warnings.push(
        `Route ${route.path} [${route.method}] uses requireAuth but not requireRole — role check may be missing`,
      );
    } else {
      issues.push(
        `Route ${route.path} [${route.method}] does not use requireRole or requirePermission middleware`,
      );
    }
  }

  // Check 3: If a role check exists, it must match or exceed the expected level
  if (actualConfig.requiredRole !== null) {
    const actualLevel = getRoleLevel(actualConfig.requiredRole);
    const expectedLevel = getRoleLevel(route.requiredRole);

    if (actualLevel < expectedLevel) {
      issues.push(
        `Route ${route.path} [${route.method}] requires "${actualConfig.requiredRole}" but should require "${route.requiredRole}" or higher`,
      );
    }
  }

  // Check 4: Admin routes must require at least "admin" role
  if (route.path.startsWith("/api/admin") && route.requiredRole !== "admin") {
    warnings.push(
      `Route ${route.path} [${route.method}] is under /api/admin/ but requires only "${route.requiredRole}"`,
    );
  }

  return {
    route,
    compliant: issues.length === 0,
    issues,
    warnings,
  };
}

/**
 * Run a full RBAC audit against the known routes matrix.
 *
 * @param routeConfigs - Map of "path:method" => actual configuration found in source
 */
export function runRBACAudit(
  routeConfigs: Map<
    string,
    {
      hasAuthCheck: boolean;
      requiredRole: RequiredRole | null;
      usesRequireRole: boolean;
      usesRequirePermission: boolean;
      usesRequireAuth: boolean;
    }
  >,
): RBACAuditReport {
  const results: RBACCheckResult[] = [];
  const criticalIssues: string[] = [];
  const warnings: string[] = [];

  for (const route of ADMIN_ROUTES_MATRIX) {
    const key = `${route.path}:${route.method}`;
    const actualConfig = routeConfigs.get(key);

    if (!actualConfig) {
      // Route not found in the scan — this could be a stale entry in the matrix
      // or the route file is missing
      const result: RBACCheckResult = {
        route,
        compliant: false,
        issues: [
          `Route ${route.path} [${route.method}] not found during scan — possible missing route file`,
        ],
        warnings: [],
      };
      results.push(result);
      criticalIssues.push(result.issues[0]);
      continue;
    }

    const result = verifyRouteRBAC(route, actualConfig);
    results.push(result);

    if (!result.compliant) {
      criticalIssues.push(...result.issues);
    }
    warnings.push(...result.warnings);
  }

  // Check for routes found during scan that are NOT in the matrix
  for (const [key] of routeConfigs) {
    const [path, method] = key.split(":");
    const inMatrix = ADMIN_ROUTES_MATRIX.some(
      (r) => r.path === path && r.method === method,
    );
    if (!inMatrix) {
      warnings.push(
        `Route ${path} [${method}] found during scan but not in the RBAC matrix — register it in ADMIN_ROUTES_MATRIX`,
      );
    }
  }

  const compliantRoutes = results.filter((r) => r.compliant).length;

  return {
    timestamp: new Date(),
    totalRoutes: results.length,
    compliantRoutes,
    nonCompliantRoutes: results.length - compliantRoutes,
    compliancePercentage:
      results.length > 0
        ? Math.round((compliantRoutes / results.length) * 100)
        : 100,
    results,
    criticalIssues,
    warnings,
  };
}

/**
 * Build the expected route config for all admin routes based on
 * their actual implementation pattern (all use requireRole("admin")).
 *
 * This is the "known good" state — used as a baseline for auditing.
 */
export function buildExpectedRouteConfigs(): Map<
  string,
  {
    hasAuthCheck: boolean;
    requiredRole: RequiredRole | null;
    usesRequireRole: boolean;
    usesRequirePermission: boolean;
    usesRequireAuth: boolean;
  }
> {
  const configs = new Map<
    string,
    {
      hasAuthCheck: boolean;
      requiredRole: RequiredRole | null;
      usesRequireRole: boolean;
      usesRequirePermission: boolean;
      usesRequireAuth: boolean;
    }
  >();

  for (const route of ADMIN_ROUTES_MATRIX) {
    const key = `${route.path}:${route.method}`;
    configs.set(key, {
      hasAuthCheck: true,
      requiredRole: route.requiredRole,
      usesRequireRole: true,
      usesRequirePermission: false,
      usesRequireAuth: false,
    });
  }

  return configs;
}

/**
 * Quick check: are all admin routes compliant when scanned against expectations?
 * Returns true if 100% compliant.
 */
export function isFullyCompliant(
  routeConfigs: Map<
    string,
    {
      hasAuthCheck: boolean;
      requiredRole: RequiredRole | null;
      usesRequireRole: boolean;
      usesRequirePermission: boolean;
      usesRequireAuth: boolean;
    }
  >,
): boolean {
  const report = runRBACAudit(routeConfigs);
  return report.compliancePercentage === 100;
}

/** Singleton-style default export */
export const adminRBACService = {
  ADMIN_ROUTES_MATRIX,
  getRoleLevel,
  meetsRoleRequirement,
  verifyRouteRBAC,
  runRBACAudit,
  buildExpectedRouteConfigs,
  isFullyCompliant,
};

export default adminRBACService;
