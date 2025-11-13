import { NextRequest, NextResponse } from 'next/server';

/**
 * Readiness probe for Kubernetes/container orchestration
 * Checks if the application is ready to receive traffic
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Check if application dependencies are ready
    const checks = {
      environment: !!process.env.NODE_ENV,
      nextAuth: !!(process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_URL),
      database: !!process.env.SUPABASE_URL,
      ai: !!process.env.GEMINI_API_KEY
    };

    const allReady = Object.values(checks).every(Boolean);
    const uptime = process.uptime();
    
    // Consider ready if up for at least 10 seconds and all deps configured
    const isReady = allReady && uptime > 10;

    const response = {
      ready: isReady,
      uptime,
      checks,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response, { 
      status: isReady ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } catch (error) {
    return NextResponse.json({
      ready: false,
      error: String(error),
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }
}