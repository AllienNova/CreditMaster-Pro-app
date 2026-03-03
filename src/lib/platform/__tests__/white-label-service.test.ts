/**
 * WhiteLabelService — Unit Tests
 *
 * Tests multi-tenant CRUD, branding, domain management, tenant detection,
 * feature flags, user management, and data isolation.
 */

import { whiteLabelService } from "../white-label-service";
import type {
  TenantCreationRequest,
  SubscriptionTier,
} from "../white-label-service";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let counter = 0;
function uid(): string {
  return `wl-test-user-${++counter}-${Date.now()}`;
}

function makeRequest(overrides?: Partial<TenantCreationRequest>): TenantCreationRequest {
  return {
    name: `Test Tenant ${counter}`,
    slug: `test-tenant-${++counter}-${Date.now()}`,
    ownerId: uid(),
    tier: "growth" as SubscriptionTier,
    ...overrides,
  };
}

function createTenant(overrides?: Partial<TenantCreationRequest>) {
  const req = makeRequest(overrides);
  const result = whiteLabelService.createTenant(req);
  if ("error" in result) throw new Error(result.error);
  return { tenant: result, request: req };
}

// =========================================================================
// Tests
// =========================================================================

describe("WhiteLabelService", () => {
  // -----------------------------------------------------------------------
  // Tenant CRUD
  // -----------------------------------------------------------------------

  describe("createTenant", () => {
    it("should create a tenant with generated ID and default branding", () => {
      const { tenant } = createTenant();

      expect(tenant.id).toMatch(/^tenant_/);
      expect(tenant.status).toBe("active");
      expect(tenant.currentUsers).toBe(1); // owner
      expect(tenant.branding.primaryColor).toBe("#6366F1");
      expect(tenant.branding.appName).toBe("Fynvita");
    });

    it("should set feature flags based on tier", () => {
      const { tenant } = createTenant({ tier: "premium" });

      // Premium should have trading enabled (requires premium)
      expect(tenant.featureFlags.trading).toBe(true);
      // Premium should have credit_monitoring (no tier requirement)
      expect(tenant.featureFlags.credit_monitoring).toBe(true);
      // Premium should NOT have custom_branding (requires white_label)
      expect(tenant.featureFlags.custom_branding).toBe(false);
    });

    it("should merge custom branding with defaults", () => {
      const { tenant } = createTenant({
        branding: { primaryColor: "#FF0000", appName: "Custom App" },
      });

      expect(tenant.branding.primaryColor).toBe("#FF0000");
      expect(tenant.branding.appName).toBe("Custom App");
      expect(tenant.branding.secondaryColor).toBe("#8B5CF6"); // default
    });

    it("should set default max users by tier", () => {
      const starter = createTenant({ tier: "starter" });
      const enterprise = createTenant({ tier: "enterprise" });

      expect(starter.tenant.maxUsers).toBe(5);
      expect(enterprise.tenant.maxUsers).toBe(500);
    });

    it("should allow custom max users", () => {
      const { tenant } = createTenant({ maxUsers: 50 });
      expect(tenant.maxUsers).toBe(50);
    });

    it("should reject invalid slug format", () => {
      const result = whiteLabelService.createTenant(
        makeRequest({ slug: "A" }), // too short and uppercase
      );
      expect("error" in result).toBe(true);
    });

    it("should reject reserved slugs", () => {
      const result = whiteLabelService.createTenant(
        makeRequest({ slug: "admin" }),
      );
      // "admin" is only 5 chars, also needs to match regex
      expect("error" in result).toBe(true);
    });

    it("should reject reserved slug 'support'", () => {
      const result = whiteLabelService.createTenant(
        makeRequest({ slug: "support" }),
      );
      expect("error" in result).toBe(true);
    });

    it("should reject duplicate slugs", () => {
      const slug = `unique-slug-${Date.now()}`;
      whiteLabelService.createTenant(makeRequest({ slug }));
      const duplicate = whiteLabelService.createTenant(makeRequest({ slug }));

      expect("error" in duplicate).toBe(true);
      if ("error" in duplicate) {
        expect(duplicate.error).toContain("already taken");
      }
    });
  });

  describe("getTenant", () => {
    it("should retrieve tenant by ID", () => {
      const { tenant } = createTenant();
      const fetched = whiteLabelService.getTenant(tenant.id);

      expect(fetched).not.toBeNull();
      expect(fetched!.id).toBe(tenant.id);
    });

    it("should return null for unknown ID", () => {
      expect(whiteLabelService.getTenant("nonexistent")).toBeNull();
    });
  });

  describe("getTenantBySlug", () => {
    it("should retrieve tenant by slug", () => {
      const { tenant } = createTenant();
      const fetched = whiteLabelService.getTenantBySlug(tenant.slug);

      expect(fetched).not.toBeNull();
      expect(fetched!.slug).toBe(tenant.slug);
    });

    it("should return null for unknown slug", () => {
      expect(whiteLabelService.getTenantBySlug("noslug")).toBeNull();
    });
  });

  describe("updateTenant", () => {
    it("should update tenant name and status", () => {
      const { tenant } = createTenant();
      const updated = whiteLabelService.updateTenant(tenant.id, {
        name: "Updated Name",
        status: "suspended",
      });

      expect(updated).not.toBeNull();
      expect(updated!.name).toBe("Updated Name");
      expect(updated!.status).toBe("suspended");
    });

    it("should rebuild feature flags when tier changes", () => {
      const { tenant } = createTenant({ tier: "starter" });
      expect(tenant.featureFlags.trading).toBe(false);

      const updated = whiteLabelService.updateTenant(tenant.id, {
        tier: "premium",
      });

      expect(updated!.featureFlags.trading).toBe(true);
    });

    it("should return null for unknown tenant", () => {
      expect(
        whiteLabelService.updateTenant("unknown", { name: "X" }),
      ).toBeNull();
    });

    it("should preserve custom flags when tier changes", () => {
      const { tenant } = createTenant({ tier: "starter" });
      whiteLabelService.setFeatureFlag(tenant.id, "my_custom_flag", true);

      whiteLabelService.updateTenant(tenant.id, { tier: "premium" });

      const updated = whiteLabelService.getTenant(tenant.id);
      expect(updated!.featureFlags.my_custom_flag).toBe(true);
    });
  });

  describe("deleteTenant", () => {
    it("should delete tenant and clean up indexes", () => {
      const { tenant } = createTenant();
      expect(whiteLabelService.deleteTenant(tenant.id)).toBe(true);
      expect(whiteLabelService.getTenant(tenant.id)).toBeNull();
      expect(whiteLabelService.getTenantBySlug(tenant.slug)).toBeNull();
    });

    it("should return false for unknown tenant", () => {
      expect(whiteLabelService.deleteTenant("nonexistent")).toBe(false);
    });

    it("should clean up domain index on delete", () => {
      const { tenant } = createTenant();
      whiteLabelService.addCustomDomain(tenant.id, "custom.example.com");

      whiteLabelService.deleteTenant(tenant.id);

      // Domain should no longer resolve
      const detection = whiteLabelService.detectTenant("custom.example.com");
      expect(detection.matched).toBe(false);
    });
  });

  describe("listTenants", () => {
    it("should list all tenants", () => {
      const before = whiteLabelService.listTenants();
      createTenant();
      createTenant();
      const after = whiteLabelService.listTenants();

      expect(after.total).toBe(before.total + 2);
    });

    it("should filter by status", () => {
      const { tenant } = createTenant();
      whiteLabelService.updateTenant(tenant.id, { status: "suspended" });

      const result = whiteLabelService.listTenants({ status: "suspended" });
      expect(result.tenants.some((t) => t.id === tenant.id)).toBe(true);
    });

    it("should filter by tier", () => {
      createTenant({ tier: "enterprise" });
      const result = whiteLabelService.listTenants({ tier: "enterprise" });
      expect(result.tenants.length).toBeGreaterThanOrEqual(1);
    });

    it("should support pagination with limit and offset", () => {
      createTenant();
      createTenant();
      createTenant();

      const page1 = whiteLabelService.listTenants({ limit: 2 });
      expect(page1.tenants.length).toBeLessThanOrEqual(2);

      const page2 = whiteLabelService.listTenants({ limit: 2, offset: 2 });
      expect(page2.tenants.length).toBeGreaterThanOrEqual(0);
    });

    it("should sort by created date descending", () => {
      const all = whiteLabelService.listTenants();
      for (let i = 1; i < all.tenants.length; i++) {
        expect(all.tenants[i].createdAt.getTime()).toBeLessThanOrEqual(
          all.tenants[i - 1].createdAt.getTime(),
        );
      }
    });
  });

  // -----------------------------------------------------------------------
  // Branding
  // -----------------------------------------------------------------------

  describe("branding", () => {
    it("should update branding", () => {
      const { tenant } = createTenant();
      const result = whiteLabelService.updateBranding(tenant.id, {
        primaryColor: "#000000",
        tagline: "Your money, simplified",
      });

      expect(result).not.toBeNull();
      expect(result!.branding.primaryColor).toBe("#000000");
      expect(result!.branding.tagline).toBe("Your money, simplified");
    });

    it("should get branding for a tenant", () => {
      const { tenant } = createTenant();
      const branding = whiteLabelService.getBranding(tenant.id);

      expect(branding).not.toBeNull();
      expect(branding!.appName).toBe("Fynvita");
    });

    it("should return null for unknown tenant", () => {
      expect(whiteLabelService.getBranding("unknown")).toBeNull();
      expect(whiteLabelService.updateBranding("unknown", {})).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // Domain Management
  // -----------------------------------------------------------------------

  describe("domain management", () => {
    it("should add a custom domain", () => {
      const { tenant } = createTenant();
      const result = whiteLabelService.addCustomDomain(
        tenant.id,
        "finance.example.com",
      );

      expect("error" in result).toBe(false);
      if (!("error" in result)) {
        expect(result.domains).toContain("finance.example.com");
      }
    });

    it("should reject duplicate domains", () => {
      const { tenant: t1 } = createTenant();
      const { tenant: t2 } = createTenant();

      whiteLabelService.addCustomDomain(t1.id, "shared.example.com");
      const result = whiteLabelService.addCustomDomain(
        t2.id,
        "shared.example.com",
      );

      expect("error" in result).toBe(true);
    });

    it("should remove a custom domain", () => {
      const { tenant } = createTenant();
      whiteLabelService.addCustomDomain(tenant.id, "remove.example.com");

      expect(
        whiteLabelService.removeCustomDomain(tenant.id, "remove.example.com"),
      ).toBe(true);

      const updated = whiteLabelService.getTenant(tenant.id);
      expect(updated!.domains).not.toContain("remove.example.com");
    });

    it("should return false when removing unknown domain", () => {
      const { tenant } = createTenant();
      expect(
        whiteLabelService.removeCustomDomain(tenant.id, "nothere.com"),
      ).toBe(false);
    });

    it("should return error for unknown tenant when adding domain", () => {
      const result = whiteLabelService.addCustomDomain("unknown", "test.com");
      expect("error" in result).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Tenant Detection
  // -----------------------------------------------------------------------

  describe("detectTenant", () => {
    it("should detect by custom domain", () => {
      const { tenant } = createTenant();
      whiteLabelService.addCustomDomain(tenant.id, "app.myfinance.com");

      const result = whiteLabelService.detectTenant("app.myfinance.com");
      expect(result.matched).toBe(true);
      expect(result.method).toBe("custom_domain");
      expect(result.tenantId).toBe(tenant.id);
    });

    it("should detect by subdomain", () => {
      const { tenant } = createTenant();

      const result = whiteLabelService.detectTenant(
        `${tenant.slug}.fynvita.com`,
      );
      expect(result.matched).toBe(true);
      expect(result.method).toBe("subdomain");
      expect(result.slug).toBe(tenant.slug);
    });

    it("should detect by header as fallback", () => {
      const { tenant } = createTenant();

      const result = whiteLabelService.detectTenant(
        "random.unrelated.com",
        tenant.id,
      );
      expect(result.matched).toBe(true);
      expect(result.method).toBe("header");
    });

    it("should return no match when nothing matches", () => {
      const result = whiteLabelService.detectTenant("unknown.example.com");

      expect(result.matched).toBe(false);
      expect(result.method).toBe("none");
      expect(result.tenantId).toBeNull();
      expect(result.slug).toBeNull();
    });

    it("should not match suspended tenant by domain", () => {
      const { tenant } = createTenant();
      whiteLabelService.addCustomDomain(tenant.id, "suspended.example.com");
      whiteLabelService.updateTenant(tenant.id, { status: "suspended" });

      const result = whiteLabelService.detectTenant("suspended.example.com");
      expect(result.matched).toBe(false);
    });

    it("should not match suspended tenant by subdomain", () => {
      const { tenant } = createTenant();
      whiteLabelService.updateTenant(tenant.id, { status: "suspended" });

      const result = whiteLabelService.detectTenant(
        `${tenant.slug}.fynvita.com`,
      );
      expect(result.matched).toBe(false);
    });

    it("should not match suspended tenant by header", () => {
      const { tenant } = createTenant();
      whiteLabelService.updateTenant(tenant.id, { status: "suspended" });

      const result = whiteLabelService.detectTenant("any.com", tenant.id);
      expect(result.matched).toBe(false);
    });

    it("should prioritize custom domain over subdomain", () => {
      const { tenant } = createTenant();
      whiteLabelService.addCustomDomain(
        tenant.id,
        `${tenant.slug}.fynvita.com`, // same as what subdomain would resolve
      );

      const result = whiteLabelService.detectTenant(
        `${tenant.slug}.fynvita.com`,
      );
      expect(result.method).toBe("custom_domain");
    });

    it("should not detect subdomain from hostnames with fewer than 3 parts", () => {
      const result = whiteLabelService.detectTenant("fynvita.com");
      expect(result.matched).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Feature Flags
  // -----------------------------------------------------------------------

  describe("feature flags", () => {
    it("should build correct flags for starter tier", () => {
      const { tenant } = createTenant({ tier: "starter" });

      expect(tenant.featureFlags.credit_monitoring).toBe(true);
      expect(tenant.featureFlags.dispute_management).toBe(true);
      expect(tenant.featureFlags.ai_coach).toBe(false); // requires growth
      expect(tenant.featureFlags.trading).toBe(false); // requires premium
    });

    it("should build correct flags for white_label tier", () => {
      const { tenant } = createTenant({ tier: "white_label" });

      // All features should be enabled
      expect(tenant.featureFlags.credit_monitoring).toBe(true);
      expect(tenant.featureFlags.trading).toBe(true);
      expect(tenant.featureFlags.custom_branding).toBe(true);
      expect(tenant.featureFlags.api_access).toBe(true);
    });

    it("should check feature enabled status", () => {
      const { tenant } = createTenant({ tier: "premium" });

      expect(whiteLabelService.isFeatureEnabled(tenant.id, "trading")).toBe(true);
      expect(whiteLabelService.isFeatureEnabled(tenant.id, "custom_branding")).toBe(false);
    });

    it("should return false for unknown tenant or feature", () => {
      expect(whiteLabelService.isFeatureEnabled("unknown", "trading")).toBe(false);

      const { tenant } = createTenant();
      expect(whiteLabelService.isFeatureEnabled(tenant.id, "nonexistent")).toBe(false);
    });

    it("should return false for suspended tenant", () => {
      const { tenant } = createTenant({ tier: "white_label" });
      whiteLabelService.updateTenant(tenant.id, { status: "suspended" });

      expect(whiteLabelService.isFeatureEnabled(tenant.id, "trading")).toBe(false);
    });

    it("should set custom feature flag", () => {
      const { tenant } = createTenant();

      expect(
        whiteLabelService.setFeatureFlag(tenant.id, "beta_feature", true),
      ).toBe(true);

      expect(whiteLabelService.isFeatureEnabled(tenant.id, "beta_feature")).toBe(true);
    });

    it("should return false for unknown tenant when setting flag", () => {
      expect(
        whiteLabelService.setFeatureFlag("unknown", "flag", true),
      ).toBe(false);
    });

    it("should return available platform features", () => {
      const features = whiteLabelService.getAvailableFeatures();

      expect(features.length).toBe(10);
      expect(features.some((f) => f.key === "credit_monitoring")).toBe(true);
      expect(features.some((f) => f.key === "trading")).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // User Management
  // -----------------------------------------------------------------------

  describe("user management", () => {
    it("should register owner as first user on creation", () => {
      const { tenant, request } = createTenant();
      const users = whiteLabelService.getUsers(tenant.id);

      expect(users).toHaveLength(1);
      expect(users[0].userId).toBe(request.ownerId);
      expect(users[0].role).toBe("owner");
    });

    it("should add a user to tenant", () => {
      const { tenant } = createTenant();
      const newUserId = uid();
      const result = whiteLabelService.addUser(tenant.id, newUserId, "user");

      expect("error" in result).toBe(false);
      if (!("error" in result)) {
        expect(result.userId).toBe(newUserId);
        expect(result.role).toBe("user");
      }

      const updated = whiteLabelService.getTenant(tenant.id);
      expect(updated!.currentUsers).toBe(2);
    });

    it("should reject adding user when at max capacity", () => {
      const { tenant } = createTenant({ tier: "starter", maxUsers: 1 });
      const result = whiteLabelService.addUser(tenant.id, uid());

      expect("error" in result).toBe(true);
      if ("error" in result) {
        expect(result.error).toContain("Maximum user limit");
      }
    });

    it("should reject adding duplicate user", () => {
      const { tenant } = createTenant();
      const userId = uid();
      whiteLabelService.addUser(tenant.id, userId);
      const result = whiteLabelService.addUser(tenant.id, userId);

      expect("error" in result).toBe(true);
    });

    it("should return error for unknown tenant", () => {
      const result = whiteLabelService.addUser("unknown", uid());
      expect("error" in result).toBe(true);
    });

    it("should remove a user", () => {
      const { tenant } = createTenant();
      const userId = uid();
      whiteLabelService.addUser(tenant.id, userId);

      expect(whiteLabelService.removeUser(tenant.id, userId)).toBe(true);

      const users = whiteLabelService.getUsers(tenant.id);
      expect(users.some((u) => u.userId === userId)).toBe(false);
    });

    it("should not allow removing the owner", () => {
      const { tenant, request } = createTenant();
      expect(whiteLabelService.removeUser(tenant.id, request.ownerId)).toBe(false);
    });

    it("should return false for removing non-existent user", () => {
      const { tenant } = createTenant();
      expect(whiteLabelService.removeUser(tenant.id, "nobody")).toBe(false);
    });

    it("should find tenant by user ID", () => {
      const { tenant, request } = createTenant();
      const found = whiteLabelService.getUserTenant(request.ownerId);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(tenant.id);
    });

    it("should return null for user not in any tenant", () => {
      expect(whiteLabelService.getUserTenant("nobody")).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // Data Isolation
  // -----------------------------------------------------------------------

  describe("data isolation", () => {
    it("should verify tenant access for member", () => {
      const { tenant, request } = createTenant();
      expect(
        whiteLabelService.verifyTenantAccess(request.ownerId, tenant.id),
      ).toBe(true);
    });

    it("should deny access for non-member", () => {
      const { tenant } = createTenant();
      expect(whiteLabelService.verifyTenantAccess("outsider", tenant.id)).toBe(
        false,
      );
    });

    it("should generate scoped key", () => {
      const key = whiteLabelService.getScopedKey("tenant-123", "users:list");
      expect(key).toBe("tenant:tenant-123:users:list");
    });
  });
});
