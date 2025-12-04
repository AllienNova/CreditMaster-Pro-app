import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Health Check API
 * 
 * Returns the health status of the application and its dependencies
 */

interface HealthCheck {
  status: string;
  responseTime: number;
  error?: string;
}

interface HealthResponse {
  status: string;
  timestamp: string;
  version: string;
  environment: string;
  checks: {
    api: HealthCheck;
    database: HealthCheck;
    aiml: HealthCheck;
    storage: HealthCheck;
  };
}

export async function GET() {
  const startTime = Date.now();

  const health: HealthResponse = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    checks: {
      api: { status: 'healthy', responseTime: 0 },
      database: { status: 'unknown', responseTime: 0 },
      aiml: { status: 'unknown', responseTime: 0 },
      storage: { status: 'unknown', responseTime: 0 },
    },
  };

  // Check Database (Supabase)
  try {
    const dbStart = Date.now();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      health.checks.database = {
        status: 'unhealthy',
        responseTime: Date.now() - dbStart,
        error: 'Missing Supabase configuration',
      };
    } else {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { error } = await supabase.from('users').select('count').limit(1);
      
      health.checks.database = {
        status: error ? 'unhealthy' : 'healthy',
        responseTime: Date.now() - dbStart,
        error: error?.message,
      };
    }
  } catch (error) {
    health.checks.database = {
      status: 'unhealthy',
      responseTime: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  // Check AIML API
  try {
    const aimlStart = Date.now();
    const aimlApiKey = process.env.AIML_API_KEY;
    
    if (!aimlApiKey) {
      health.checks.aiml = {
        status: 'unhealthy',
        responseTime: Date.now() - aimlStart,
        error: 'Missing AIML API key',
      };
    } else {
      // Simple ping to AIML API
      const response = await fetch('https://api.aimlapi.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${aimlApiKey}`,
        },
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });
      
      health.checks.aiml = {
        status: response.ok ? 'healthy' : 'unhealthy',
        responseTime: Date.now() - aimlStart,
        error: response.ok ? undefined : `HTTP ${response.status}`,
      };
    }
  } catch (error) {
    health.checks.aiml = {
      status: 'unhealthy',
      responseTime: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  // Check AWS S3 (Storage)
  try {
    const s3Start = Date.now();
    const awsAccessKey = process.env.AWS_ACCESS_KEY_ID;
    const awsSecretKey = process.env.AWS_SECRET_ACCESS_KEY;
    const awsBucket = process.env.AWS_S3_BUCKET;
    
    if (!awsAccessKey || !awsSecretKey || !awsBucket) {
      health.checks.storage = {
        status: 'unhealthy',
        responseTime: Date.now() - s3Start,
        error: 'Missing AWS S3 configuration',
      };
    } else {
      // For now, just check if credentials are present
      // Full S3 check would require AWS SDK
      health.checks.storage = {
        status: 'healthy',
        responseTime: Date.now() - s3Start,
      };
    }
  } catch (error) {
    health.checks.storage = {
      status: 'unhealthy',
      responseTime: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  // Calculate API response time
  health.checks.api.responseTime = Date.now() - startTime;

  // Determine overall health status
  const hasUnhealthy = Object.values(health.checks).some(
    (check) => check.status === 'unhealthy'
  );
  
  if (hasUnhealthy) {
    health.status = 'degraded';
  }

  // Return appropriate status code
  const statusCode = health.status === 'healthy' ? 200 : 503;

  return NextResponse.json(health, { status: statusCode });
}
