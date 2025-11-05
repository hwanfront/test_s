import { NextRequest, NextResponse } from 'next/server'
import { validateEnv } from '@/shared/config/env-validation'
import { checkGoogleOAuthConfig, handleOAuthError } from '@/shared/lib/oauth-debug'

export async function GET(request: NextRequest) {
  // Only allow in development or with specific debug header
  const isDevelopment = process.env.NODE_ENV === 'development'
  const hasDebugHeader = request.headers.get('x-debug-oauth') === 'true'
  
  if (!isDevelopment && !hasDebugHeader) {
    return NextResponse.json(
      { error: 'Debug endpoint not available in production' },
      { status: 403 }
    )
  }

  try {
    // Validate environment configuration
    let envValidation
    try {
      envValidation = validateEnv()
    } catch (error) {
      envValidation = null
    }
    
    // Get OAuth configuration status
    const oauthDebug = checkGoogleOAuthConfig()
    
    // Get current URL and request info
    const url = new URL(request.url)
    const requestInfo = {
      host: url.host,
      protocol: url.protocol,
      baseUrl: `${url.protocol}//${url.host}`,
      userAgent: request.headers.get('user-agent'),
      timestamp: new Date().toISOString()
    }

    // Check callback URL configuration
    const expectedCallbackUrl = `${requestInfo.baseUrl}/api/auth/callback/google`
    
    const response = {
      status: 'debug',
      timestamp: requestInfo.timestamp,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        nextAuthUrl: process.env.NEXTAUTH_URL,
        currentUrl: requestInfo.baseUrl,
        expectedCallbackUrl
      },
      validation: {
        environment: envValidation ? 'valid' : 'invalid',
        oauth: {
          configured: oauthDebug.configured,
          errors: oauthDebug.errors,
          warnings: oauthDebug.warnings,
          clientIdPresent: oauthDebug.clientIdPresent,
          clientSecretPresent: oauthDebug.clientSecretPresent
        }
      },
      configuration: {
        googleClientId: process.env.GOOGLE_CLIENT_ID ? 
          `${process.env.GOOGLE_CLIENT_ID.substring(0, 12)}...` : 'not set',
        googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ? 'configured' : 'not set',
        nextAuthSecret: process.env.NEXTAUTH_SECRET ? 'configured' : 'not set',
        databaseUrl: process.env.DATABASE_URL ? 'configured' : 'not set'
      },
      recommendations: generateRecommendations(envValidation, oauthDebug, requestInfo)
    }

    return NextResponse.json(response, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })

  } catch (error) {
    console.error('OAuth debug error:', error)
    
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV === 'development' && error instanceof Error ? 
          error.stack : undefined
      },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      }
    )
  }
}

function generateRecommendations(
  envValidation: any, 
  oauthDebug: any, 
  requestInfo: any
): string[] {
  const recommendations: string[] = []

  // Environment recommendations
  if (!envValidation) {
    recommendations.push('Fix environment variable configuration using OAUTH_SETUP.md guide')
  }

  // OAuth specific recommendations
  if (!process.env.GOOGLE_CLIENT_ID) {
    recommendations.push('Set GOOGLE_CLIENT_ID in your environment variables')
  }

  if (!process.env.GOOGLE_CLIENT_SECRET) {
    recommendations.push('Set GOOGLE_CLIENT_SECRET in your environment variables')
  }

  if (!process.env.NEXTAUTH_SECRET) {
    recommendations.push('Generate and set NEXTAUTH_SECRET using: openssl rand -base64 32')
  }

  // URL configuration recommendations
  const nextAuthUrl = process.env.NEXTAUTH_URL
  const currentUrl = requestInfo.baseUrl

  if (nextAuthUrl && nextAuthUrl !== currentUrl) {
    recommendations.push(`Update NEXTAUTH_URL to match current URL: ${currentUrl}`)
  }

  if (!nextAuthUrl) {
    recommendations.push(`Set NEXTAUTH_URL to: ${currentUrl}`)
  }

  // Google Cloud Console recommendations
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    recommendations.push(`Verify redirect URI in Google Cloud Console: ${requestInfo.baseUrl}/api/auth/callback/google`)
    recommendations.push(`Verify JavaScript origins in Google Cloud Console: ${requestInfo.baseUrl}`)
  }

  // Database recommendations
  if (!process.env.DATABASE_URL) {
    recommendations.push('Configure database connection (Supabase or other)')
  }

  // Development vs production recommendations
  if (process.env.NODE_ENV === 'production') {
    recommendations.push('Ensure all environment variables are set in production environment')
    recommendations.push('Verify OAuth consent screen is published (not in testing mode)')
  } else {
    recommendations.push('Add your email as a test user in Google Cloud Console OAuth consent screen')
  }

  return recommendations
}

// Also export as POST for more detailed debugging with request body
export async function POST(request: NextRequest) {
  return GET(request)
}