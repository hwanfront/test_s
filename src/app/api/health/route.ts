import { NextRequest, NextResponse } from 'next/server';

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    database: HealthCheck;
    gemini: HealthCheck;
    auth: HealthCheck;
    memory: HealthCheck;
    disk?: HealthCheck;
  };
  metadata?: {
    hostname?: string;
    region?: string;
    commit?: string;
  };
}

export interface HealthCheck {
  status: 'pass' | 'fail' | 'warn';
  responseTime?: number;
  message?: string;
  lastChecked: string;
  metadata?: Record<string, any>;
}

/**
 * Health check for Supabase database connection
 */
async function checkDatabase(): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    // Simple query to test database connectivity
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/`, {
      method: 'HEAD',
      headers: {
        'apikey': process.env.SUPABASE_ANON_KEY || '',
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
      }
    });

    const responseTime = Date.now() - startTime;

    if (response.ok) {
      return {
        status: responseTime > 1000 ? 'warn' : 'pass',
        responseTime,
        message: responseTime > 1000 ? 'Slow database response' : 'Database connection healthy',
        lastChecked: new Date().toISOString()
      };
    } else {
      return {
        status: 'fail',
        responseTime,
        message: `Database check failed with status ${response.status}`,
        lastChecked: new Date().toISOString()
      };
    }
  } catch (error) {
    return {
      status: 'fail',
      responseTime: Date.now() - startTime,
      message: `Database connection failed: ${error}`,
      lastChecked: new Date().toISOString()
    };
  }
}

/**
 * Health check for Google Gemini API
 */
async function checkGeminiAPI(): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    if (!process.env.GEMINI_API_KEY) {
      return {
        status: 'fail',
        message: 'Gemini API key not configured',
        lastChecked: new Date().toISOString()
      };
    }

    // Simple test to check API availability
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    const responseTime = Date.now() - startTime;

    if (response.ok) {
      return {
        status: responseTime > 2000 ? 'warn' : 'pass',
        responseTime,
        message: responseTime > 2000 ? 'Slow Gemini API response' : 'Gemini API healthy',
        lastChecked: new Date().toISOString()
      };
    } else {
      return {
        status: 'fail',
        responseTime,
        message: `Gemini API check failed with status ${response.status}`,
        lastChecked: new Date().toISOString()
      };
    }
  } catch (error) {
    return {
      status: 'fail',
      responseTime: Date.now() - startTime,
      message: `Gemini API connection failed: ${error}`,
      lastChecked: new Date().toISOString()
    };
  }
}

/**
 * Health check for authentication service
 */
async function checkAuthService(): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    if (!process.env.NEXTAUTH_SECRET || !process.env.NEXTAUTH_URL) {
      return {
        status: 'fail',
        message: 'NextAuth configuration incomplete',
        lastChecked: new Date().toISOString()
      };
    }

    // Check if OAuth providers are configured
    const hasGoogle = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
    const hasNaver = !!(process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET);

    if (!hasGoogle && !hasNaver) {
      return {
        status: 'warn',
        message: 'No OAuth providers configured',
        lastChecked: new Date().toISOString(),
        metadata: { providers: [] }
      };
    }

    const responseTime = Date.now() - startTime;
    const providers = [];
    if (hasGoogle) providers.push('google');
    if (hasNaver) providers.push('naver');

    return {
      status: 'pass',
      responseTime,
      message: 'Authentication service configured',
      lastChecked: new Date().toISOString(),
      metadata: { providers }
    };
  } catch (error) {
    return {
      status: 'fail',
      responseTime: Date.now() - startTime,
      message: `Auth service check failed: ${error}`,
      lastChecked: new Date().toISOString()
    };
  }
}

/**
 * Health check for memory usage
 */
function checkMemoryUsage(): HealthCheck {
  try {
    const memoryUsage = process.memoryUsage();
    const totalMemory = memoryUsage.heapTotal;
    const usedMemory = memoryUsage.heapUsed;
    const freeMemory = totalMemory - usedMemory;
    const usagePercentage = (usedMemory / totalMemory) * 100;

    let status: 'pass' | 'warn' | 'fail' = 'pass';
    let message = 'Memory usage normal';

    if (usagePercentage > 90) {
      status = 'fail';
      message = 'Critical memory usage';
    } else if (usagePercentage > 75) {
      status = 'warn';
      message = 'High memory usage';
    }

    return {
      status,
      message,
      lastChecked: new Date().toISOString(),
      metadata: {
        heapUsed: Math.round(usedMemory / 1024 / 1024), // MB
        heapTotal: Math.round(totalMemory / 1024 / 1024), // MB
        usagePercentage: Math.round(usagePercentage),
        external: Math.round(memoryUsage.external / 1024 / 1024), // MB
        rss: Math.round(memoryUsage.rss / 1024 / 1024) // MB
      }
    };
  } catch (error) {
    return {
      status: 'fail',
      message: `Memory check failed: ${error}`,
      lastChecked: new Date().toISOString()
    };
  }
}

/**
 * Perform comprehensive health check
 */
export async function performHealthCheck(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  // Run all health checks in parallel
  const [database, gemini, auth, memory] = await Promise.all([
    checkDatabase(),
    checkGeminiAPI(),
    checkAuthService(),
    Promise.resolve(checkMemoryUsage())
  ]);

  // Determine overall status
  const checks = { database, gemini, auth, memory };
  const checkResults = Object.values(checks);
  
  let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
  
  if (checkResults.some(check => check.status === 'fail')) {
    overallStatus = 'unhealthy';
  } else if (checkResults.some(check => check.status === 'warn')) {
    overallStatus = 'degraded';
  }

  const result: HealthCheckResult = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    checks,
    metadata: {
      hostname: process.env.HOSTNAME,
      region: process.env.VERCEL_REGION,
      commit: process.env.VERCEL_GIT_COMMIT_SHA
    }
  };

  return result;
}

/**
 * API Route Handler
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const healthCheck = await performHealthCheck();
    
    // Set appropriate HTTP status code
    const statusCode = 
      healthCheck.status === 'healthy' ? 200 :
      healthCheck.status === 'degraded' ? 200 :
      503; // Service Unavailable for unhealthy

    return NextResponse.json(healthCheck, { 
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      message: String(error)
    }, { 
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json'
      }
    });
  }
}

/**
 * Simple readiness check for load balancers
 */
export async function HEAD(request: NextRequest): Promise<NextResponse> {
  try {
    // Quick check - just verify the service is responding
    const isReady = process.uptime() > 5; // Service has been up for at least 5 seconds
    
    return new NextResponse(null, { 
      status: isReady ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
  } catch (error) {
    return new NextResponse(null, { status: 503 });
  }
}