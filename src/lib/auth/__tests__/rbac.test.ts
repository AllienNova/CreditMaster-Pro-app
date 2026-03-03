/**
 * @jest-environment node
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { rbac, type Role } from "../rbac";

// ── Helpers ──────────────────────────────────────────────────────────────────

function user(role: string) {
  return { role } as any;
}

function appMeta(role: string) {
  return { app_metadata: { role } } as any;
}

function userMeta(role: string) {
  return { user_metadata: { role } } as any;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  getRole (delegates to non-exported getUserRole)
// ═══════════════════════════════════════════════════════════════════════════════
describe("RBAC – getRole", () => {
  it("should return 'user' for null", () => {
    expect(rbac.getRole(null)).toBe("user");
  });

  it("should return role from direct role property", () => {
    expect(rbac.getRole(user("admin"))).toBe("admin");
  });

  it("should return role from app_metadata", () => {
    expect(rbac.getRole(appMeta("premium"))).toBe("premium");
  });

  it("should return role from user_metadata", () => {
    expect(rbac.getRole(userMeta("super_admin"))).toBe("super_admin");
  });

  it("should default to 'user' for invalid role string", () => {
    expect(rbac.getRole(user("nonexistent"))).toBe("user");
  });

  it("should default to 'user' for empty object", () => {
    expect(rbac.getRole({} as any)).toBe("user");
  });

  it("should prioritize direct role over app_metadata", () => {
    expect(
      rbac.getRole({ role: "admin", app_metadata: { role: "user" } } as any),
    ).toBe("admin");
  });

  it("should prioritize app_metadata over user_metadata", () => {
    expect(
      rbac.getRole({
        app_metadata: { role: "premium" },
        user_metadata: { role: "admin" },
      } as any),
    ).toBe("premium");
  });

  it.each(["user", "premium", "admin", "super_admin"] as Role[])(
    "should accept valid role '%s'",
    (role) => {
      expect(rbac.getRole(user(role))).toBe(role);
    },
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
//  hasPermission
// ═══════════════════════════════════════════════════════════════════════════════
describe("RBAC – hasPermission", () => {
  it("should return false for null user", () => {
    expect(rbac.hasPermission(null, "disputes:read")).toBe(false);
  });

  it("should return true for a basic user permission", () => {
    expect(rbac.hasPermission(user("user"), "disputes:read")).toBe(true);
  });

  it("should return false for admin permission on basic user", () => {
    expect(rbac.hasPermission(user("user"), "admin:users:delete")).toBe(false);
  });

  it("should return true for admin permission on admin user", () => {
    expect(rbac.hasPermission(user("admin"), "admin:users:read")).toBe(true);
  });

  it("should return true for super_admin-only permission", () => {
    expect(rbac.hasPermission(user("super_admin"), "admin:users:delete")).toBe(
      true,
    );
  });

  it("should return false for super_admin permission on admin", () => {
    expect(rbac.hasPermission(user("admin"), "admin:settings")).toBe(false);
  });

  it("should return false for a completely unknown permission", () => {
    expect(
      rbac.hasPermission(user("super_admin"), "nonexistent:permission" as any),
    ).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  hasAnyPermission / hasAllPermissions
// ═══════════════════════════════════════════════════════════════════════════════
describe("RBAC – hasAnyPermission", () => {
  it("should return true if user has at least one listed permission", () => {
    expect(
      rbac.hasAnyPermission(user("user"), [
        "disputes:read",
        "admin:users:delete",
      ]),
    ).toBe(true);
  });

  it("should return false if user has none of the listed permissions", () => {
    expect(
      rbac.hasAnyPermission(user("user"), [
        "admin:users:delete",
        "admin:settings",
      ]),
    ).toBe(false);
  });

  it("should return false for null user", () => {
    expect(rbac.hasAnyPermission(null, ["disputes:read"])).toBe(false);
  });
});

describe("RBAC – hasAllPermissions", () => {
  it("should return true if user has all listed permissions", () => {
    expect(
      rbac.hasAllPermissions(user("user"), ["disputes:read", "credit:read"]),
    ).toBe(true);
  });

  it("should return false if user is missing any permission", () => {
    expect(
      rbac.hasAllPermissions(user("user"), [
        "disputes:read",
        "admin:users:delete",
      ]),
    ).toBe(false);
  });

  it("should return false for null user", () => {
    expect(rbac.hasAllPermissions(null, ["disputes:read"])).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  getPermissions
// ═══════════════════════════════════════════════════════════════════════════════
describe("RBAC – getPermissions", () => {
  it("should return empty array for null user", () => {
    expect(rbac.getPermissions(null)).toEqual([]);
  });

  it("should return permissions for user role", () => {
    const perms = rbac.getPermissions(user("user"));
    expect(perms.length).toBeGreaterThan(0);
    expect(perms).toContain("disputes:read");
  });

  it("should return more permissions for premium than user", () => {
    const userPerms = rbac.getPermissions(user("user"));
    const premiumPerms = rbac.getPermissions(user("premium"));
    expect(premiumPerms.length).toBeGreaterThan(userPerms.length);
  });

  it("should return more permissions for admin than premium", () => {
    const premiumPerms = rbac.getPermissions(user("premium"));
    const adminPerms = rbac.getPermissions(user("admin"));
    expect(adminPerms.length).toBeGreaterThan(premiumPerms.length);
  });

  it("should return most permissions for super_admin", () => {
    const adminPerms = rbac.getPermissions(user("admin"));
    const superPerms = rbac.getPermissions(user("super_admin"));
    expect(superPerms.length).toBeGreaterThanOrEqual(adminPerms.length);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  hasRole
// ═══════════════════════════════════════════════════════════════════════════════
describe("RBAC – hasRole", () => {
  it("should return true when user has exact role", () => {
    expect(rbac.hasRole(user("admin"), "admin")).toBe(true);
  });

  it("should return true when user has higher role than required", () => {
    expect(rbac.hasRole(user("admin"), "user")).toBe(true);
    expect(rbac.hasRole(user("super_admin"), "premium")).toBe(true);
  });

  it("should return false when user has lower role than required", () => {
    expect(rbac.hasRole(user("user"), "admin")).toBe(false);
    expect(rbac.hasRole(user("premium"), "super_admin")).toBe(false);
  });

  it("should return true for null user (defaults to 'user' role)", () => {
    // getUserRole(null) returns "user", so hasRole(null, "user") is true
    expect(rbac.hasRole(null, "user")).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  Convenience methods: isPremium / isAdmin / isSuperAdmin
// ═══════════════════════════════════════════════════════════════════════════════
describe("RBAC – convenience methods", () => {
  describe("isPremium", () => {
    it("returns true for premium and above", () => {
      expect(rbac.isPremium(user("premium"))).toBe(true);
      expect(rbac.isPremium(user("admin"))).toBe(true);
      expect(rbac.isPremium(user("super_admin"))).toBe(true);
    });

    it("returns false for basic user", () => {
      expect(rbac.isPremium(user("user"))).toBe(false);
    });

    it("returns false for null", () => {
      expect(rbac.isPremium(null)).toBe(false);
    });
  });

  describe("isAdmin", () => {
    it("returns true for admin and super_admin", () => {
      expect(rbac.isAdmin(user("admin"))).toBe(true);
      expect(rbac.isAdmin(user("super_admin"))).toBe(true);
    });

    it("returns false for user and premium", () => {
      expect(rbac.isAdmin(user("user"))).toBe(false);
      expect(rbac.isAdmin(user("premium"))).toBe(false);
    });
  });

  describe("isSuperAdmin", () => {
    it("returns true only for super_admin", () => {
      expect(rbac.isSuperAdmin(user("super_admin"))).toBe(true);
    });

    it("returns false for admin and below", () => {
      expect(rbac.isSuperAdmin(user("admin"))).toBe(false);
      expect(rbac.isSuperAdmin(user("premium"))).toBe(false);
      expect(rbac.isSuperAdmin(user("user"))).toBe(false);
    });
  });
});
