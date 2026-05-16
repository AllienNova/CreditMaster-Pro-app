/**
 * Single source of truth for application role types.
 *
 * The canonical role set is the four-member hierarchy below. Any other
 * role union (notably the legacy `enterprise` alias) is invalid — import
 * `Role` from here rather than redefining it.
 */

export const ROLES = ["user", "premium", "admin", "super_admin"] as const;
export type Role = (typeof ROLES)[number];

const RANK: Record<Role, number> = { user: 0, premium: 1, admin: 2, super_admin: 3 };

export function roleRank(role: Role): number {
  return RANK[role];
}

export function isAtLeast(actual: Role, required: Role): boolean {
  return RANK[actual] >= RANK[required];
}

export function isRole(v: unknown): v is Role {
  return typeof v === "string" && (ROLES as readonly string[]).includes(v);
}
