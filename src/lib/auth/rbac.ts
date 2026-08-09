/**
 * Role-Based Access Control (RBAC) Service
 *
 * Defines permissions for different user roles and provides
 * authorization checks.
 */

import type { User as SupabaseUser } from "@supabase/supabase-js";

import { type Role, isAtLeast, isRole } from "@/lib/auth/roles";

export type { Role };

// User type that works with both Supabase User and custom User
export interface RBACUser {
  id: string;
  email?: string;
  role?: Role;
  app_metadata?: { role?: Role };
  user_metadata?: { role?: Role };
}

// Generic user type for JWT validation (role is string, not strictly typed)
export interface GenericUser {
  id: string;
  email?: string;
  name?: string;
  role?: string;
}

// Union type for all user types that can be used with RBAC
export type User = RBACUser | SupabaseUser | GenericUser | null;

export type Permission =
  // Dispute permissions
  | "disputes:read"
  | "disputes:create"
  | "disputes:update"
  | "disputes:delete"
  | "disputes:generate_letter"
  // Document permissions
  | "documents:read"
  | "documents:upload"
  | "documents:delete"
  | "documents:share"
  | "billing:read"
  | "billing:update"
  // Credit monitoring permissions
  | "credit:read"
  | "credit:update_settings"
  | "credit:view_history"
  | "credit:alerts"
  | "credit:analyze"
  // Financial permissions
  | "financial:read"
  | "financial:write"
  | "financial:link_accounts"
  | "financial:create_budgets"
  | "financial:create_goals"
  | "financial:generate_reports"
  // Notification permissions
  | "notifications:read"
  | "notifications:mark_read"
  | "notifications:delete"
  // AI permissions
  | "ai:chat"
  | "ai:consensus"
  | "ai:strategy_recommendation"
  | "ai:predict_outcomes"
  | "ai:orchestrate_strategies"
  | "ai:create_workflow"
  // Student loans permissions
  | "student_loans:read"
  | "student_loans:strategy"
  | "student_loans:federal_programs"
  | "student_loans:analyze"
  // ML permissions
  | "ml:predict"
  // Servicer permissions
  | "servicers:analyze"
  | "servicers:detect_errors"
  // Federal programs permissions
  | "federal_programs:check_eligibility"
  | "federal_programs:submit_application"
  | "federal_programs:track_application"
  // Voice permissions
  | "voice:synthesize"
  // Automation permissions
  | "automation:workflows:read"
  | "automation:workflows:create"
  | "automation:workflows:cancel"
  | "automation:jobs:read"
  | "automation:jobs:create"
  | "automation:jobs:delete"
  | "automation:jobs:pause"
  | "automation:jobs:resume"
  // Admin permissions
  | "admin:users:read"
  | "admin:users:update"
  | "admin:users:delete"
  | "admin:analytics"
  | "admin:settings";

// Define permissions for each role
const rolePermissions: Record<Role, Permission[]> = {
  user: [
    "disputes:read",
    "disputes:create",
    "disputes:update",
    "disputes:generate_letter",
    "documents:read",
    "documents:upload",
    "documents:delete",
    "billing:read",
    "credit:read",
    "credit:update_settings",
    "credit:analyze",
    "financial:read",
    "financial:write",
    "financial:link_accounts",
    "notifications:read",
    "notifications:mark_read",
    "notifications:delete",
    "ai:chat",
    "ai:strategy_recommendation",
    "ai:predict_outcomes",
    "student_loans:read",
    "student_loans:strategy",
    "student_loans:federal_programs",
    "student_loans:analyze",
    "ml:predict",
    "servicers:analyze",
    "federal_programs:check_eligibility",
  ],
  premium: [
    "disputes:read",
    "disputes:create",
    "disputes:update",
    "disputes:delete",
    "disputes:generate_letter",
    "documents:read",
    "documents:upload",
    "documents:delete",
    "documents:share",
    "billing:read",
    "billing:update",
    "credit:read",
    "credit:update_settings",
    "credit:view_history",
    "credit:alerts",
    "credit:analyze",
    "financial:read",
    "financial:write",
    "financial:link_accounts",
    "financial:create_budgets",
    "financial:create_goals",
    "financial:generate_reports",
    "notifications:read",
    "notifications:mark_read",
    "notifications:delete",
    "ai:chat",
    "ai:consensus",
    "ai:strategy_recommendation",
    "ai:predict_outcomes",
    "ai:orchestrate_strategies",
    "ai:create_workflow",
    "student_loans:read",
    "student_loans:strategy",
    "student_loans:federal_programs",
    "student_loans:analyze",
    "ml:predict",
    "servicers:analyze",
    "servicers:detect_errors",
    "federal_programs:check_eligibility",
    "federal_programs:submit_application",
    "federal_programs:track_application",
    "voice:synthesize",
    "automation:workflows:read",
    "automation:workflows:create",
    "automation:workflows:cancel",
    "automation:jobs:read",
    "automation:jobs:create",
    "automation:jobs:delete",
    "automation:jobs:pause",
    "automation:jobs:resume",
  ],
  admin: [
    // All premium permissions plus admin
    "disputes:read",
    "disputes:create",
    "disputes:update",
    "disputes:delete",
    "disputes:generate_letter",
    "documents:read",
    "documents:upload",
    "documents:delete",
    "documents:share",
    "billing:read",
    "billing:update",
    "credit:read",
    "credit:update_settings",
    "credit:view_history",
    "credit:alerts",
    "credit:analyze",
    "financial:read",
    "financial:write",
    "financial:link_accounts",
    "financial:create_budgets",
    "financial:create_goals",
    "financial:generate_reports",
    "notifications:read",
    "notifications:mark_read",
    "notifications:delete",
    "ai:chat",
    "ai:consensus",
    "ai:strategy_recommendation",
    "ai:predict_outcomes",
    "ai:orchestrate_strategies",
    "ai:create_workflow",
    "student_loans:read",
    "student_loans:strategy",
    "student_loans:federal_programs",
    "student_loans:analyze",
    "ml:predict",
    "servicers:analyze",
    "servicers:detect_errors",
    "federal_programs:check_eligibility",
    "federal_programs:submit_application",
    "federal_programs:track_application",
    "voice:synthesize",
    "automation:workflows:read",
    "automation:workflows:create",
    "automation:workflows:cancel",
    "automation:jobs:read",
    "automation:jobs:create",
    "automation:jobs:delete",
    "automation:jobs:pause",
    "automation:jobs:resume",
    "admin:users:read",
    "admin:users:update",
    "admin:analytics",
  ],
  super_admin: [
    // All permissions
    "disputes:read",
    "disputes:create",
    "disputes:update",
    "disputes:delete",
    "disputes:generate_letter",
    "documents:read",
    "documents:upload",
    "documents:delete",
    "documents:share",
    "billing:read",
    "billing:update",
    "credit:read",
    "credit:update_settings",
    "credit:view_history",
    "credit:alerts",
    "credit:analyze",
    "financial:read",
    "financial:write",
    "financial:link_accounts",
    "financial:create_budgets",
    "financial:create_goals",
    "financial:generate_reports",
    "notifications:read",
    "notifications:mark_read",
    "notifications:delete",
    "ai:chat",
    "ai:consensus",
    "ai:strategy_recommendation",
    "ai:predict_outcomes",
    "ai:orchestrate_strategies",
    "ai:create_workflow",
    "student_loans:read",
    "student_loans:strategy",
    "student_loans:federal_programs",
    "student_loans:analyze",
    "ml:predict",
    "servicers:analyze",
    "servicers:detect_errors",
    "federal_programs:check_eligibility",
    "federal_programs:submit_application",
    "federal_programs:track_application",
    "voice:synthesize",
    "automation:workflows:read",
    "automation:workflows:create",
    "automation:workflows:cancel",
    "automation:jobs:read",
    "automation:jobs:create",
    "automation:jobs:delete",
    "automation:jobs:pause",
    "automation:jobs:resume",
    "admin:users:read",
    "admin:users:update",
    "admin:users:delete",
    "admin:analytics",
    "admin:settings",
  ],
};

/**
 * Get the user's authorization role.
 *
 * The role MUST be the DB-resolved role on the passed object — RBAC never
 * trusts the JWT claim, `app_metadata`, or `user_metadata` (FND-005). The
 * caller (`withRole`/`withPermission` in api-guard) is responsible for
 * resolving the role from `profiles` before reaching this function.
 */
function getUserRole(user: User): Role {
  if (!user) return "user";

  if ("role" in user && isRole(user.role)) {
    return user.role;
  }

  return "user";
}

class RBAC {
  /**
   * Check if a user has a specific permission
   * Accepts both typed Permission or string for flexibility with API guards
   */
  hasPermission(user: User, permission: Permission | string): boolean {
    if (!user) return false;
    const role = getUserRole(user);
    const permissions = rolePermissions[role] || [];
    return permissions.includes(permission as Permission);
  }

  /**
   * Check if a user has any of the specified permissions
   */
  hasAnyPermission(user: User, permissions: Permission[]): boolean {
    return permissions.some((permission) =>
      this.hasPermission(user, permission),
    );
  }

  /**
   * Check if a user has all of the specified permissions
   */
  hasAllPermissions(user: User, permissions: Permission[]): boolean {
    return permissions.every((permission) =>
      this.hasPermission(user, permission),
    );
  }

  /**
   * Get all permissions for a user
   */
  getPermissions(user: User): Permission[] {
    if (!user) return [];
    const role = getUserRole(user);
    return rolePermissions[role] || [];
  }

  /**
   * Get user's role
   */
  getRole(user: User): Role {
    return getUserRole(user);
  }

  /**
   * Check if user has a specific role or higher
   */
  hasRole(user: User, requiredRole: Role): boolean {
    return isAtLeast(getUserRole(user), requiredRole);
  }

  /**
   * Check if user is premium or higher
   */
  isPremium(user: User): boolean {
    return this.hasRole(user, "premium");
  }

  /**
   * Check if user is admin or higher
   */
  isAdmin(user: User): boolean {
    return this.hasRole(user, "admin");
  }

  /**
   * Check if user is super admin
   */
  isSuperAdmin(user: User): boolean {
    return this.hasRole(user, "super_admin");
  }
}

export const rbac = new RBAC();
export default rbac;
