/**
 * Health Check Service
 * Monitors application and dependency health.
 *
 * Every probe in this file must be able to report failure. Until 2026-08-09
 * none of them could: the database and cache queries were commented out and
 * returned a literal "healthy", and the external-service check swallowed its
 * own fetch errors. `/api/health` therefore answered `healthy` for four
 * components it never contacted, `readinessCheck()` could never return false,
 * and the endpoint was being read back as evidence the system worked.
 *
 * If you add a component here, it either performs a real check or it reports
 * that it did not. There is no third option — a monitor that cannot go red is
 * worse than no monitor, because someone will trust it.
 */

import { getServiceRoleClient } from "@/lib/supabase/service-role";
import { redisCache } from "@/lib/cache/redis-cache-service";

export type HealthStatus = "healthy" | "degraded" | "unhealthy";

interface ComponentHealth {
  name: string;
  status: HealthStatus;
  latency?: number;
  message?: string;
  lastChecked: string;
}

interface HealthReport {
  status: HealthStatus;
  version: string;
  uptime: number;
  timestamp: string;
  components: ComponentHealth[];
}

const startTime = Date.now();

/**
 * This endpoint is PUBLIC and unauthenticated, so no component may put a raw
 * error into the response — a driver or Postgres message leaks schema, host and
 * version to anyone who asks. Details are logged server-side; the caller gets a
 * fixed string. `logDetail` exists so that split is deliberate rather than
 * accidental.
 */
function logDetail(component: string, error: unknown): void {
  console.error(
    `[health] ${component} check failed:`,
    error instanceof Error ? error.message : error,
  );
}

const DB_TIMEOUT_MS = 5000;

/**
 * Real query, not a comment.
 *
 * The previous version of this function had its query commented out and
 * returned `status: "healthy"` unconditionally, so `/api/health` reported a
 * healthy database without ever opening a connection — and `readinessCheck()`
 * below could therefore never return false, meaning an orchestrator would route
 * traffic to an instance with a dead database. It was cited in
 * docs/specs/smoke-test-report.md as evidence the app worked; that citation had
 * to be retracted. See gap-analysis.md G-012.
 *
 * `profiles` is the probe target because the signup trigger already depends on
 * it, so if it is unreachable the application is not serving anyone. `head:
 * true` fetches no rows — this measures reachability, not content, and an empty
 * table is a healthy answer.
 */
async function checkDatabase(): Promise<ComponentHealth> {
  const start = performance.now();

  try {
    const { error } = await Promise.race([
      getServiceRoleClient()
        .from("profiles")
        .select("id", { count: "exact", head: true }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`timeout after ${DB_TIMEOUT_MS}ms`)),
          DB_TIMEOUT_MS,
        ),
      ),
    ]);

    if (error) throw error;

    return {
      name: "database",
      status: "healthy",
      latency: Math.round(performance.now() - start),
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    logDetail("database", error);
    return {
      name: "database",
      status: "unhealthy",
      message: "query failed",
      latency: Math.round(performance.now() - start),
      lastChecked: new Date().toISOString(),
    };
  }
}

/**
 * Redis is optional here: without Upstash credentials RedisCacheService falls
 * back to an in-process cache. That is a working configuration, so it is not
 * "unhealthy" — but it is not "healthy" either, because on serverless every
 * instance then keeps its own copy and hit rates collapse. Reporting it as
 * `degraded` with a stated reason is the only answer that is true.
 */
async function checkCache(): Promise<ComponentHealth> {
  const start = performance.now();
  const result = await redisCache.ping();

  if (!result.configured) {
    return {
      name: "cache",
      status: "degraded",
      message: "Redis not configured — using per-instance in-memory fallback",
      latency: Math.round(performance.now() - start),
      lastChecked: new Date().toISOString(),
    };
  }

  if (!result.ok) {
    logDetail("cache", result.error);
    return {
      name: "cache",
      status: "degraded",
      message: "Redis unreachable — falling back to in-memory cache",
      latency: Math.round(performance.now() - start),
      lastChecked: new Date().toISOString(),
    };
  }

  return {
    name: "cache",
    status: "healthy",
    latency: Math.round(performance.now() - start),
    lastChecked: new Date().toISOString(),
  };
}

// Check external services
async function checkExternalServices(): Promise<ComponentHealth[]> {
  const services = [
    { name: "stripe", url: "https://api.stripe.com/v1" },
    { name: "supabase", url: process.env.NEXT_PUBLIC_SUPABASE_URL || "" },
  ];

  const results: ComponentHealth[] = [];

  for (const service of services) {
    if (!service.url) {
      results.push({
        name: service.name,
        status: "degraded",
        message: "URL not configured",
        lastChecked: new Date().toISOString(),
      });
      continue;
    }

    const start = performance.now();

    // The `.catch(() => {})` that used to sit on this fetch swallowed every
    // network error, so the `catch` block below was unreachable and every
    // service was reported healthy whether or not it answered. Removing it is
    // the entire fix: a rejected fetch now reaches the handler.
    //
    // Any HTTP response counts as reachable. `HEAD https://api.stripe.com/v1`
    // returns 401 without credentials, and a 401 still proves DNS, TLS and the
    // service are up — which is what this check is for. Only a transport-level
    // failure or the timeout means degraded.
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      try {
        await fetch(service.url, {
          method: "HEAD",
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }

      results.push({
        name: service.name,
        status: "healthy",
        latency: Math.round(performance.now() - start),
        lastChecked: new Date().toISOString(),
      });
    } catch (error) {
      logDetail(service.name, error);
      results.push({
        name: service.name,
        status: "degraded",
        message: "unreachable",
        latency: Math.round(performance.now() - start),
        lastChecked: new Date().toISOString(),
      });
    }
  }

  return results;
}

// Main health check
export async function checkHealth(): Promise<HealthReport> {
  const [database, cache, ...externalServices] = await Promise.all([
    checkDatabase(),
    checkCache(),
    ...(await checkExternalServices()),
  ]);

  const components = [database, cache, ...externalServices];

  // Determine overall status
  let status: HealthStatus = "healthy";

  if (components.some((c) => c.status === "unhealthy")) {
    status = "unhealthy";
  } else if (components.some((c) => c.status === "degraded")) {
    status = "degraded";
  }

  return {
    status,
    version: process.env.npm_package_version || "1.0.0",
    uptime: Math.round((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
    components,
  };
}

// Quick liveness check (for k8s)
export function livenessCheck(): { alive: boolean } {
  return { alive: true };
}

// Readiness check (for k8s)
export async function readinessCheck(): Promise<{
  ready: boolean;
  reason?: string;
}> {
  try {
    const health = await checkHealth();
    return {
      ready: health.status !== "unhealthy",
      reason:
        health.status === "unhealthy"
          ? "Critical service unavailable"
          : undefined,
    };
  } catch (error) {
    return {
      ready: false,
      reason: error instanceof Error ? error.message : "Health check failed",
    };
  }
}
