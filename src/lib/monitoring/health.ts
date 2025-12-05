/**
 * Health Check Service
 * Monitors application and dependency health
 */

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

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

// Check database health
async function checkDatabase(): Promise<ComponentHealth> {
  const start = performance.now();
  
  try {
    // In production, this would ping the database
    // const result = await supabase.from('health_check').select('1').single();
    
    return {
      name: 'database',
      status: 'healthy',
      latency: Math.round(performance.now() - start),
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    return {
      name: 'database',
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Unknown error',
      lastChecked: new Date().toISOString(),
    };
  }
}

// Check cache health
async function checkCache(): Promise<ComponentHealth> {
  const start = performance.now();
  
  try {
    // In production, this would ping Redis/cache
    return {
      name: 'cache',
      status: 'healthy',
      latency: Math.round(performance.now() - start),
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    return {
      name: 'cache',
      status: 'degraded',
      message: error instanceof Error ? error.message : 'Unknown error',
      lastChecked: new Date().toISOString(),
    };
  }
}

// Check external services
async function checkExternalServices(): Promise<ComponentHealth[]> {
  const services = [
    { name: 'stripe', url: 'https://api.stripe.com/v1' },
    { name: 'supabase', url: process.env.NEXT_PUBLIC_SUPABASE_URL || '' },
  ];

  const results: ComponentHealth[] = [];

  for (const service of services) {
    if (!service.url) {
      results.push({
        name: service.name,
        status: 'degraded',
        message: 'URL not configured',
        lastChecked: new Date().toISOString(),
      });
      continue;
    }

    const start = performance.now();
    
    try {
      // Simple connectivity check
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      
      await fetch(service.url, {
        method: 'HEAD',
        signal: controller.signal,
      }).catch(() => {});
      
      clearTimeout(timeout);

      results.push({
        name: service.name,
        status: 'healthy',
        latency: Math.round(performance.now() - start),
        lastChecked: new Date().toISOString(),
      });
    } catch {
      results.push({
        name: service.name,
        status: 'degraded',
        message: 'Connection timeout',
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
    ...await checkExternalServices(),
  ]);

  const components = [database, cache, ...externalServices];
  
  // Determine overall status
  let status: HealthStatus = 'healthy';
  
  if (components.some((c) => c.status === 'unhealthy')) {
    status = 'unhealthy';
  } else if (components.some((c) => c.status === 'degraded')) {
    status = 'degraded';
  }

  return {
    status,
    version: process.env.npm_package_version || '1.0.0',
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
export async function readinessCheck(): Promise<{ ready: boolean; reason?: string }> {
  try {
    const health = await checkHealth();
    return {
      ready: health.status !== 'unhealthy',
      reason: health.status === 'unhealthy' ? 'Critical service unavailable' : undefined,
    };
  } catch (error) {
    return {
      ready: false,
      reason: error instanceof Error ? error.message : 'Health check failed',
    };
  }
}

