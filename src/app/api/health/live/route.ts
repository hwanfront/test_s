import { NextRequest, NextResponse } from 'next/server';

/**
 * Liveness probe for Kubernetes/container orchestration
 * Checks if the application process is alive and responding
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Simple liveness check - if we can respond, we're alive
    const response = {
      alive: true,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      pid: process.pid,
      memory: {
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024), // MB
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) // MB
      },
      version: process.version,
      environment: process.env.NODE_ENV
    };

    return NextResponse.json(response, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } catch (error) {
    return NextResponse.json({
      alive: false,
      error: String(error),
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }
}