/**
 * White-Label Platform Service
 *
 * Provides multi-tenant white-label capabilities:
 * - Tenant configuration (branding, domains, feature flags)
 * - Subdomain-based tenant detection
 * - Feature flag management per tenant
 * - Data isolation enforcement
 * - Tenant subscription tier management
 *
 * @module WhiteLabelService
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type TenantStatus = "active" | "suspended" | "trial" | "cancelled";

export type SubscriptionTier =
  | "starter"
  | "growth"
  | "premium"
  | "enterprise"
  | "white_label";

export interface TenantBranding {
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string;
  faviconUrl?: string;
  appName: string;
  tagline?: string;
  supportEmail: string;
  customCss?: string;
}

export interface TenantConfig {
  id: string;
  slug: string; // subdomain identifier
  name: string;
  status: TenantStatus;
  tier: SubscriptionTier;
  branding: TenantBranding;
  domains: string[]; // custom domains
  featureFlags: Record<string, boolean>;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
  maxUsers: number;
  currentUsers: number;
  metadata?: Record<string, unknown>;
}

export interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  defaultEnabled: boolean;
  tierRequirement?: SubscriptionTier;
}

export interface TenantUser {
  userId: string;
  tenantId: string;
  role: "owner" | "admin" | "user";
  joinedAt: Date;
}

export interface TenantCreationRequest {
  name: string;
  slug: string;
  ownerId: string;
  tier: SubscriptionTier;
  branding?: Partial<TenantBranding>;
  maxUsers?: number;
}

export interface TenantDetectionResult {
  tenantId: string | null;
  slug: string | null;
  matched: boolean;
  method: "subdomain" | "custom_domain" | "header" | "none";
}

// ── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_BRANDING: TenantBranding = {
  primaryColor: "#6366F1",
  secondaryColor: "#8B5CF6",
  appName: "Fynvita",
  supportEmail: "support@fynvita.com",
};

const DEFAULT_MAX_USERS: Record<SubscriptionTier, number> = {
  starter: 5,
  growth: 25,
  premium: 100,
  enterprise: 500,
  white_label: 10000,
};

/** Platform features and their tier requirements. */
const PLATFORM_FEATURES: FeatureFlag[] = [
  {
    key: "credit_monitoring",
    name: "Credit Monitoring",
    description: "Real-time credit score tracking",
    defaultEnabled: true,
  },
  {
    key: "dispute_management",
    name: "Dispute Management",
    description: "Credit dispute filing and tracking",
    defaultEnabled: true,
  },
  {
    key: "ai_coach",
    name: "AI Financial Coach",
    description: "AI-powered financial coaching",
    defaultEnabled: true,
    tierRequirement: "growth",
  },
  {
    key: "trading",
    name: "Trading & Investments",
    description: "Investment tracking and trading",
    defaultEnabled: false,
    tierRequirement: "premium",
  },
  {
    key: "bill_negotiation",
    name: "Bill Negotiation",
    description: "Automated bill negotiation",
    defaultEnabled: false,
    tierRequirement: "growth",
  },
  {
    key: "tax_optimization",
    name: "Tax Optimization",
    description: "Tax planning and optimization tools",
    defaultEnabled: false,
    tierRequirement: "premium",
  },
  {
    key: "custom_branding",
    name: "Custom Branding",
    description: "Full white-label branding customization",
    defaultEnabled: false,
    tierRequirement: "white_label",
  },
  {
    key: "api_access",
    name: "API Access",
    description: "REST API access for integrations",
    defaultEnabled: false,
    tierRequirement: "enterprise",
  },
  {
    key: "multi_user",
    name: "Multi-User",
    description: "Team/household collaboration",
    defaultEnabled: false,
    tierRequirement: "growth",
  },
  {
    key: "advanced_analytics",
    name: "Advanced Analytics",
    description: "Detailed financial analytics and reports",
    defaultEnabled: false,
    tierRequirement: "premium",
  },
];

const TIER_RANK: Record<SubscriptionTier, number> = {
  starter: 1,
  growth: 2,
  premium: 3,
  enterprise: 4,
  white_label: 5,
};

const RESERVED_SLUGS = new Set([
  "www",
  "api",
  "admin",
  "app",
  "mail",
  "ftp",
  "docs",
  "help",
  "support",
  "status",
  "blog",
]);

// ── Helpers ──────────────────────────────────────────────────────────────────

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function isValidSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/.test(slug);
}

function meetsMinimumTier(
  currentTier: SubscriptionTier,
  requiredTier: SubscriptionTier,
): boolean {
  return TIER_RANK[currentTier] >= TIER_RANK[requiredTier];
}

// ── Service ──────────────────────────────────────────────────────────────────

class WhiteLabelService {
  private readonly tenants: Map<string, TenantConfig> = new Map();
  private readonly slugIndex: Map<string, string> = new Map(); // slug -> tenantId
  private readonly domainIndex: Map<string, string> = new Map(); // domain -> tenantId
  private readonly tenantUsers: Map<string, TenantUser[]> = new Map(); // tenantId -> users

  // ── Tenant CRUD ────────────────────────────────────────────────────────

  createTenant(request: TenantCreationRequest): TenantConfig | { error: string } {
    // Validate slug
    if (!isValidSlug(request.slug)) {
      return { error: "Invalid slug: must be 3-64 lowercase alphanumeric with hyphens" };
    }
    if (RESERVED_SLUGS.has(request.slug)) {
      return { error: `Slug '${request.slug}' is reserved` };
    }
    if (this.slugIndex.has(request.slug)) {
      return { error: `Slug '${request.slug}' is already taken` };
    }

    const maxUsers =
      request.maxUsers ?? DEFAULT_MAX_USERS[request.tier] ?? 5;

    const featureFlags = this.buildFeatureFlags(request.tier);

    const tenant: TenantConfig = {
      id: generateId("tenant"),
      slug: request.slug,
      name: request.name,
      status: "active",
      tier: request.tier,
      branding: { ...DEFAULT_BRANDING, ...request.branding },
      domains: [],
      featureFlags,
      createdAt: new Date(),
      updatedAt: new Date(),
      ownerId: request.ownerId,
      maxUsers,
      currentUsers: 1, // owner counts
    };

    this.tenants.set(tenant.id, tenant);
    this.slugIndex.set(tenant.slug, tenant.id);

    // Register owner as tenant user
    const users: TenantUser[] = [
      {
        userId: request.ownerId,
        tenantId: tenant.id,
        role: "owner",
        joinedAt: new Date(),
      },
    ];
    this.tenantUsers.set(tenant.id, users);

    return tenant;
  }

  getTenant(tenantId: string): TenantConfig | null {
    return this.tenants.get(tenantId) ?? null;
  }

  getTenantBySlug(slug: string): TenantConfig | null {
    const tenantId = this.slugIndex.get(slug);
    if (!tenantId) return null;
    return this.tenants.get(tenantId) ?? null;
  }

  updateTenant(
    tenantId: string,
    updates: Partial<Pick<TenantConfig, "name" | "status" | "tier" | "maxUsers" | "metadata">>,
  ): TenantConfig | null {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) return null;

    if (updates.name !== undefined) tenant.name = updates.name;
    if (updates.status !== undefined) tenant.status = updates.status;
    if (updates.maxUsers !== undefined) tenant.maxUsers = updates.maxUsers;
    if (updates.metadata !== undefined) tenant.metadata = updates.metadata;

    if (updates.tier !== undefined && updates.tier !== tenant.tier) {
      tenant.tier = updates.tier;
      tenant.featureFlags = this.buildFeatureFlags(updates.tier, tenant.featureFlags);
    }

    tenant.updatedAt = new Date();
    return tenant;
  }

  deleteTenant(tenantId: string): boolean {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) return false;

    // Clean up indexes
    this.slugIndex.delete(tenant.slug);
    for (const domain of tenant.domains) {
      this.domainIndex.delete(domain);
    }
    this.tenantUsers.delete(tenantId);
    this.tenants.delete(tenantId);

    return true;
  }

  listTenants(options?: {
    status?: TenantStatus;
    tier?: SubscriptionTier;
    limit?: number;
    offset?: number;
  }): { tenants: TenantConfig[]; total: number } {
    let results = Array.from(this.tenants.values());

    if (options?.status) {
      results = results.filter((t) => t.status === options.status);
    }
    if (options?.tier) {
      results = results.filter((t) => t.tier === options.tier);
    }

    const total = results.length;

    results.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );

    if (options?.offset) {
      results = results.slice(options.offset);
    }
    if (options?.limit) {
      results = results.slice(0, options.limit);
    }

    return { tenants: results, total };
  }

  // ── Branding ─────────────────────────────────────────────────────────

  updateBranding(
    tenantId: string,
    branding: Partial<TenantBranding>,
  ): TenantConfig | null {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) return null;

    tenant.branding = { ...tenant.branding, ...branding };
    tenant.updatedAt = new Date();
    return tenant;
  }

  getBranding(tenantId: string): TenantBranding | null {
    return this.tenants.get(tenantId)?.branding ?? null;
  }

  // ── Domain Management ────────────────────────────────────────────────

  addCustomDomain(
    tenantId: string,
    domain: string,
  ): TenantConfig | { error: string } {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) return { error: "Tenant not found" };

    if (this.domainIndex.has(domain)) {
      return { error: `Domain '${domain}' is already registered` };
    }

    tenant.domains.push(domain);
    this.domainIndex.set(domain, tenantId);
    tenant.updatedAt = new Date();
    return tenant;
  }

  removeCustomDomain(tenantId: string, domain: string): boolean {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) return false;

    const idx = tenant.domains.indexOf(domain);
    if (idx === -1) return false;

    tenant.domains.splice(idx, 1);
    this.domainIndex.delete(domain);
    tenant.updatedAt = new Date();
    return true;
  }

  // ── Tenant Detection ─────────────────────────────────────────────────

  /**
   * Detect tenant from request context (hostname or header).
   * Priority: custom domain → subdomain → header → none
   */
  detectTenant(
    hostname: string,
    headerTenantId?: string,
  ): TenantDetectionResult {
    // 1. Check custom domain
    const domainTenantId = this.domainIndex.get(hostname);
    if (domainTenantId) {
      const tenant = this.tenants.get(domainTenantId);
      if (tenant && tenant.status === "active") {
        return {
          tenantId: domainTenantId,
          slug: tenant.slug,
          matched: true,
          method: "custom_domain",
        };
      }
    }

    // 2. Check subdomain
    const parts = hostname.split(".");
    if (parts.length >= 3) {
      const subdomain = parts[0];
      const slugTenantId = this.slugIndex.get(subdomain);
      if (slugTenantId) {
        const tenant = this.tenants.get(slugTenantId);
        if (tenant && tenant.status === "active") {
          return {
            tenantId: slugTenantId,
            slug: subdomain,
            matched: true,
            method: "subdomain",
          };
        }
      }
    }

    // 3. Check header
    if (headerTenantId) {
      const tenant = this.tenants.get(headerTenantId);
      if (tenant && tenant.status === "active") {
        return {
          tenantId: headerTenantId,
          slug: tenant.slug,
          matched: true,
          method: "header",
        };
      }
    }

    return {
      tenantId: null,
      slug: null,
      matched: false,
      method: "none",
    };
  }

  // ── Feature Flags ────────────────────────────────────────────────────

  /**
   * Build feature flags based on subscription tier.
   */
  private buildFeatureFlags(
    tier: SubscriptionTier,
    existing?: Record<string, boolean>,
  ): Record<string, boolean> {
    const flags: Record<string, boolean> = {};

    for (const feature of PLATFORM_FEATURES) {
      if (feature.tierRequirement) {
        flags[feature.key] = meetsMinimumTier(tier, feature.tierRequirement);
      } else {
        flags[feature.key] = feature.defaultEnabled;
      }
    }

    // Preserve custom overrides from existing flags
    if (existing) {
      for (const [key, value] of Object.entries(existing)) {
        // Only preserve non-platform flags (custom ones)
        if (!PLATFORM_FEATURES.some((f) => f.key === key)) {
          flags[key] = value;
        }
      }
    }

    return flags;
  }

  isFeatureEnabled(tenantId: string, featureKey: string): boolean {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) return false;
    if (tenant.status !== "active") return false;
    return tenant.featureFlags[featureKey] ?? false;
  }

  setFeatureFlag(
    tenantId: string,
    featureKey: string,
    enabled: boolean,
  ): boolean {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) return false;

    tenant.featureFlags[featureKey] = enabled;
    tenant.updatedAt = new Date();
    return true;
  }

  getAvailableFeatures(): FeatureFlag[] {
    return [...PLATFORM_FEATURES];
  }

  // ── User Management ──────────────────────────────────────────────────

  addUser(
    tenantId: string,
    userId: string,
    role: "admin" | "user" = "user",
  ): TenantUser | { error: string } {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) return { error: "Tenant not found" };

    if (tenant.currentUsers >= tenant.maxUsers) {
      return { error: "Maximum user limit reached" };
    }

    const users = this.tenantUsers.get(tenantId) ?? [];
    if (users.some((u) => u.userId === userId)) {
      return { error: "User already belongs to this tenant" };
    }

    const tenantUser: TenantUser = {
      userId,
      tenantId,
      role,
      joinedAt: new Date(),
    };

    users.push(tenantUser);
    this.tenantUsers.set(tenantId, users);
    tenant.currentUsers = users.length;
    tenant.updatedAt = new Date();

    return tenantUser;
  }

  removeUser(tenantId: string, userId: string): boolean {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) return false;

    // Can't remove owner
    if (userId === tenant.ownerId) return false;

    const users = this.tenantUsers.get(tenantId) ?? [];
    const idx = users.findIndex((u) => u.userId === userId);
    if (idx === -1) return false;

    users.splice(idx, 1);
    tenant.currentUsers = users.length;
    tenant.updatedAt = new Date();
    return true;
  }

  getUsers(tenantId: string): TenantUser[] {
    return this.tenantUsers.get(tenantId) ?? [];
  }

  getUserTenant(userId: string): TenantConfig | null {
    for (const [tenantId, users] of this.tenantUsers) {
      if (users.some((u) => u.userId === userId)) {
        return this.tenants.get(tenantId) ?? null;
      }
    }
    return null;
  }

  // ── Data Isolation ───────────────────────────────────────────────────

  /**
   * Verify that a user belongs to a specific tenant.
   * Used for enforcing data isolation.
   */
  verifyTenantAccess(userId: string, tenantId: string): boolean {
    const users = this.tenantUsers.get(tenantId) ?? [];
    return users.some((u) => u.userId === userId);
  }

  /**
   * Get tenant-scoped data key for cache/storage namespacing.
   */
  getScopedKey(tenantId: string, key: string): string {
    return `tenant:${tenantId}:${key}`;
  }
}

// ── Export Singleton ─────────────────────────────────────────────────────────

export const whiteLabelService = new WhiteLabelService();
export default whiteLabelService;
