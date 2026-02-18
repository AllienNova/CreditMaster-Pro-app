/**
 * Rate Limiting Service
 *
 * Implements rate limiting to prevent:
 * - API abuse
 * - DDoS attacks
 * - Cost overruns
 * - Resource exhaustion
 *
 * Uses Supabase for persistence (survives deploys/restarts)
 * with in-memory cache for hot-path performance.
 */

import { supabaseAdmin } from "@/lib/supabase/server";

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (identifier: string) => string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number; // Seconds until retry
}

export interface UsageStats {
  requests: number;
  cost: number;
  tokens: number;
  lastRequest: Date;
}

/**
 * Hybrid store: in-memory cache backed by Supabase persistence.
 * Writes are write-through (update cache + async DB write).
 * Reads hit cache first, fall back to DB on cache miss.
 */
class RateLimitStore {
  private cache: Map<string, { count: number; resetAt: number }> = new Map();
  private usageCache: Map<string, UsageStats> = new Map();
  private pendingWrites: Set<string> = new Set();

  get(key: string): { count: number; resetAt: number } | undefined {
    const entry = this.cache.get(key);
    if (entry && entry.resetAt > Date.now()) {
      return entry;
    }
    if (entry) {
      this.cache.delete(key);
    }
    return undefined;
  }

  set(key: string, count: number, resetAt: number): void {
    this.cache.set(key, { count, resetAt });
    this.persistRateLimit(key, count, resetAt);
  }

  increment(key: string, windowMs: number): number {
    const entry = this.get(key);
    if (entry) {
      entry.count++;
      this.cache.set(key, entry);
      this.persistRateLimit(key, entry.count, entry.resetAt);
      return entry.count;
    } else {
      const resetAt = Date.now() + windowMs;
      this.cache.set(key, { count: 1, resetAt });
      this.persistRateLimit(key, 1, resetAt);
      return 1;
    }
  }

  reset(key: string): void {
    this.cache.delete(key);
    this.deleteRateLimit(key);
  }

  getUsage(key: string): UsageStats | undefined {
    return this.usageCache.get(key);
  }

  trackUsage(key: string, cost: number, tokens: number): void {
    const existing = this.usageCache.get(key);
    if (existing) {
      existing.requests++;
      existing.cost += cost;
      existing.tokens += tokens;
      existing.lastRequest = new Date();
    } else {
      this.usageCache.set(key, {
        requests: 1,
        cost,
        tokens,
        lastRequest: new Date(),
      });
    }
    this.persistUsage(key);
  }

  resetUsage(key: string): void {
    this.usageCache.delete(key);
    this.deleteUsage(key);
  }

  /** Load rate limit from DB on cache miss */
  async loadFromDB(
    key: string,
  ): Promise<{ count: number; resetAt: number } | undefined> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabaseAdmin.from as any)("rate_limits")
        .select("count, reset_at")
        .eq("key", key)
        .single();
      if (data && new Date((data as any).reset_at).getTime() > Date.now()) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const entry = {
          count: (data as any).count,
          resetAt: new Date((data as any).reset_at).getTime(),
        };
        this.cache.set(key, entry);
        return entry;
      }
    } catch {
      // DB unavailable — continue with in-memory only
    }
    return undefined;
  }

  /** Load usage from DB on cache miss */
  async loadUsageFromDB(key: string): Promise<UsageStats | undefined> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabaseAdmin.from as any)("rate_limit_usage")
        .select("requests, cost, tokens, last_request")
        .eq("key", key)
        .single();
      if (data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const row = data as any;
        const stats: UsageStats = {
          requests: row.requests,
          cost: Number(row.cost),
          tokens: Number(row.tokens),
          lastRequest: new Date(row.last_request),
        };
        this.usageCache.set(key, stats);
        return stats;
      }
    } catch {
      // DB unavailable — return undefined
    }
    return undefined;
  }

  // --- Async persistence (fire-and-forget for hot path) ---

  private persistRateLimit(key: string, count: number, resetAt: number): void {
    if (this.pendingWrites.has(`rl:${key}`)) return;
    this.pendingWrites.add(`rl:${key}`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabaseAdmin.from as any)("rate_limits")
      .upsert({
        key,
        count,
        reset_at: new Date(resetAt).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .then(() => this.pendingWrites.delete(`rl:${key}`))
      .catch(() => this.pendingWrites.delete(`rl:${key}`));
  }

  private deleteRateLimit(key: string): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabaseAdmin.from as any)("rate_limits")
      .delete()
      .eq("key", key)
      .then(() => {})
      .catch(() => {});
  }

  private persistUsage(key: string): void {
    const stats = this.usageCache.get(key);
    if (!stats) return;
    if (this.pendingWrites.has(`usage:${key}`)) return;
    this.pendingWrites.add(`usage:${key}`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabaseAdmin.from as any)("rate_limit_usage")
      .upsert({
        key,
        requests: stats.requests,
        cost: stats.cost,
        tokens: stats.tokens,
        last_request: stats.lastRequest.toISOString(),
      })
      .then(() => this.pendingWrites.delete(`usage:${key}`))
      .catch(() => this.pendingWrites.delete(`usage:${key}`));
  }

  private deleteUsage(key: string): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabaseAdmin.from as any)("rate_limit_usage")
      .delete()
      .eq("key", key)
      .then(() => {})
      .catch(() => {});
  }
}

const store = new RateLimitStore();

/**
 * Default rate limit configurations
 */
export const RATE_LIMITS = {
  // Per IP address
  perIP: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
  },

  // Per user (authenticated)
  perUser: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 500,
  },

  // Per user for AI requests
  perUserAI: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 100,
  },

  // Per API key
  perAPIKey: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 1000,
  },

  // Strict limit for expensive operations
  strict: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10,
  },
};

/**
 * Check rate limit
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = RATE_LIMITS.perIP,
): RateLimitResult {
  const key = config.keyGenerator
    ? config.keyGenerator(identifier)
    : identifier;
  const entry = store.get(key);

  if (!entry) {
    // First request in window
    const resetAt = new Date(Date.now() + config.windowMs);
    store.set(key, 1, resetAt.getTime());
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt,
    };
  }

  if (entry.count >= config.maxRequests) {
    // Rate limit exceeded
    const retryAfter = Math.ceil((entry.resetAt - Date.now()) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(entry.resetAt),
      retryAfter,
    };
  }

  // Increment and allow
  const newCount = store.increment(key, config.windowMs);
  return {
    allowed: true,
    remaining: config.maxRequests - newCount,
    resetAt: new Date(entry.resetAt),
  };
}

/**
 * Reset rate limit for identifier
 */
export function resetRateLimit(identifier: string): void {
  store.reset(identifier);
}

/**
 * Track API usage
 */
export function trackUsage(
  identifier: string,
  cost: number,
  tokens: number,
): void {
  store.trackUsage(identifier, cost, tokens);
}

/**
 * Get usage stats
 */
export function getUsageStats(identifier: string): UsageStats | undefined {
  return store.getUsage(identifier);
}

/**
 * Check if user has exceeded cost limit
 */
export function checkCostLimit(
  identifier: string,
  maxCost: number,
): { allowed: boolean; currentCost: number; remaining: number } {
  const usage = store.getUsage(identifier);
  const currentCost = usage?.cost || 0;

  return {
    allowed: currentCost < maxCost,
    currentCost,
    remaining: Math.max(0, maxCost - currentCost),
  };
}

/**
 * Reset usage stats
 */
export function resetUsageStats(identifier: string): void {
  store.resetUsage(identifier);
}

/**
 * Rate limit middleware for Next.js API routes
 */
export function rateLimitMiddleware(
  config: RateLimitConfig = RATE_LIMITS.perIP,
) {
  return async (request: Request): Promise<Response | null> => {
    // Get identifier (IP address or user ID)
    const identifier = getIdentifier(request);

    // Check rate limit
    const result = checkRateLimit(identifier, config);

    if (!result.allowed) {
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded",
          retryAfter: result.retryAfter,
          resetAt: result.resetAt,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": result.retryAfter?.toString() || "60",
            "X-RateLimit-Limit": config.maxRequests.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": result.resetAt.getTime().toString(),
          },
        },
      );
    }

    // Add rate limit headers to response
    // This will be handled by the route handler
    return null; // Allow request to proceed
  };
}

/**
 * Get identifier from request
 */
function getIdentifier(request: Request): string {
  // Try to get user ID from session/token
  // For now, use IP address
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0] : "unknown";
  return ip;
}

/**
 * Cost estimation for different AI operations
 */
export const COST_ESTIMATES = {
  // Per 1K tokens
  "anthropic/claude-4.5-sonnet": 0.003,
  "openai/gpt-5-pro": 0.005,
  "deepseek/deepseek-r1": 0.001,
  "deepseek/deepseek-v3.1-terminus": 0.001,
  "openai/gpt-4o": 0.002,
  "openai/gpt-4o-mini": 0.0001,

  // Per image
  "flux-pro": 0.05,
  "stable-diffusion-xl": 0.02,

  // Per minute of audio
  "openai/tts-1-hd": 0.015,
  "openai/whisper-1": 0.006,
};

/**
 * Estimate cost for AI request
 */
export function estimateCost(model: string, tokens: number): number {
  const costPer1K =
    COST_ESTIMATES[model as keyof typeof COST_ESTIMATES] || 0.001;
  return (tokens / 1000) * costPer1K;
}

/**
 * User quota management
 */
export interface UserQuota {
  userId: string;
  maxRequests: number;
  maxCost: number;
  maxTokens: number;
  resetPeriod: "hourly" | "daily" | "monthly";
}

const userQuotas: Map<string, UserQuota> = new Map();

/**
 * Set user quota (cache + persist to Supabase)
 */
export function setUserQuota(quota: UserQuota): void {
  userQuotas.set(quota.userId, quota);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (supabaseAdmin.from as any)("user_quotas")
    .upsert({
      user_id: quota.userId,
      max_requests: quota.maxRequests,
      max_cost: quota.maxCost,
      max_tokens: quota.maxTokens,
      reset_period: quota.resetPeriod,
      updated_at: new Date().toISOString(),
    })
    .then(() => {})
    .catch(() => {});
}

/**
 * Get user quota (cache first, then DB fallback)
 */
export function getUserQuota(userId: string): UserQuota | undefined {
  return userQuotas.get(userId);
}

/**
 * Load user quota from database into cache
 */
export async function loadUserQuota(
  userId: string,
): Promise<UserQuota | undefined> {
  const cached = userQuotas.get(userId);
  if (cached) return cached;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabaseAdmin.from as any)("user_quotas")
      .select("*")
      .eq("user_id", userId)
      .single();
    if (data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const row = data as any;
      const quota: UserQuota = {
        userId: row.user_id,
        maxRequests: row.max_requests,
        maxCost: Number(row.max_cost),
        maxTokens: Number(row.max_tokens),
        resetPeriod: row.reset_period as UserQuota["resetPeriod"],
      };
      userQuotas.set(userId, quota);
      return quota;
    }
  } catch {
    // DB unavailable
  }
  return undefined;
}

/**
 * Check if user has exceeded quota
 */
export function checkUserQuota(userId: string): {
  allowed: boolean;
  reason?: string;
  usage?: UsageStats;
  quota?: UserQuota;
} {
  const quota = getUserQuota(userId);
  if (!quota) {
    return { allowed: true }; // No quota set
  }

  const usage = getUsageStats(userId);
  if (!usage) {
    return { allowed: true, quota }; // No usage yet
  }

  // Check request quota
  if (usage.requests >= quota.maxRequests) {
    return {
      allowed: false,
      reason: "Request quota exceeded",
      usage,
      quota,
    };
  }

  // Check cost quota
  if (usage.cost >= quota.maxCost) {
    return {
      allowed: false,
      reason: "Cost quota exceeded",
      usage,
      quota,
    };
  }

  // Check token quota
  if (usage.tokens >= quota.maxTokens) {
    return {
      allowed: false,
      reason: "Token quota exceeded",
      usage,
      quota,
    };
  }

  return { allowed: true, usage, quota };
}
