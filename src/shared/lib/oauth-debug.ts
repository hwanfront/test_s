/**
 * OAuth2 Debugging and Diagnostics Utility
 * 
 * Provides debugging tools for OAuth2 authentication issues
 * Helps identify common configuration problems
 */

import { NextRequest } from 'next/server'

/**
 * OAuth2 configuration status
 */
export interface OAuthStatus {
  configured: boolean
  clientIdPresent: boolean
  clientSecretPresent: boolean
  clientIdLength?: number
  clientSecretLength?: number
  errors: string[]
  warnings: string[]
}

/**
 * Check Google OAuth configuration
 */
export function checkGoogleOAuthConfig(): OAuthStatus {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  
  const errors: string[] = []
  const warnings: string[] = []
  
  const clientIdPresent = !!clientId
  const clientSecretPresent = !!clientSecret
  
  if (!clientIdPresent) {
    errors.push('GOOGLE_CLIENT_ID environment variable is missing')
  } else if (clientId.length < 50) {
    warnings.push('GOOGLE_CLIENT_ID seems too short (should be ~72 characters)')
  }
  
  if (!clientSecretPresent) {
    errors.push('GOOGLE_CLIENT_SECRET environment variable is missing')
  } else if (clientSecret.length < 20) {
    warnings.push('GOOGLE_CLIENT_SECRET seems too short (should be ~24 characters)')
  }

  // Check for common client ID patterns
  if (clientId && !clientId.includes('.googleusercontent.com')) {
    errors.push('GOOGLE_CLIENT_ID should end with .googleusercontent.com')
  }

  return {
    configured: clientIdPresent && clientSecretPresent && errors.length === 0,
    clientIdPresent,
    clientSecretPresent,
    clientIdLength: clientId?.length,
    clientSecretLength: clientSecret?.length,
    errors,
    warnings
  }
}

/**
 * Check NextAuth URL configuration
 */
export function checkNextAuthConfig(): {
  urlConfigured: boolean
  secretConfigured: boolean
  url?: string
  secretLength?: number
  errors: string[]
  warnings: string[]
} {
  const url = process.env.NEXTAUTH_URL
  const secret = process.env.NEXTAUTH_SECRET
  
  const errors: string[] = []
  const warnings: string[] = []
  
  const urlConfigured = !!url
  const secretConfigured = !!secret
  
  if (!urlConfigured) {
    errors.push('NEXTAUTH_URL environment variable is missing')
  } else {
    try {
      new URL(url)
    } catch {
      errors.push('NEXTAUTH_URL is not a valid URL')
    }
  }
  
  if (!secretConfigured) {
    errors.push('NEXTAUTH_SECRET environment variable is missing')
  } else if (secret.length < 32) {
    errors.push('NEXTAUTH_SECRET should be at least 32 characters long')
  }

  return {
    urlConfigured,
    secretConfigured,
    url,
    secretLength: secret?.length,
    errors,
    warnings
  }
}

/**
 * Generate OAuth debug report
 */
export function generateOAuthDebugReport(): {
  overall: 'healthy' | 'warning' | 'error'
  google: OAuthStatus
  nextAuth: ReturnType<typeof checkNextAuthConfig>
  recommendations: string[]
} {
  const google = checkGoogleOAuthConfig()
  const nextAuth = checkNextAuthConfig()
  
  const totalErrors = google.errors.length + nextAuth.errors.length
  const totalWarnings = google.warnings.length + nextAuth.warnings.length
  
  const overall = totalErrors > 0 ? 'error' : totalWarnings > 0 ? 'warning' : 'healthy'
  
  const recommendations: string[] = []
  
  if (!google.configured) {
    recommendations.push('Set up Google OAuth2 credentials in Google Cloud Console')
    recommendations.push('Enable Google+ API in your Google Cloud project')
    recommendations.push('Add authorized redirect URIs: http://localhost:3000/api/auth/callback/google')
  }
  
  if (!nextAuth.urlConfigured) {
    recommendations.push('Set NEXTAUTH_URL=http://localhost:3000 for development')
  }
  
  if (!nextAuth.secretConfigured) {
    recommendations.push('Generate and set a NEXTAUTH_SECRET (openssl rand -base64 32)')
  }

  if (totalErrors === 0 && google.configured) {
    recommendations.push('Configuration looks good! Check Google Cloud Console for authorized domains.')
  }

  return {
    overall,
    google,
    nextAuth,
    recommendations
  }
}

/**
 * Log OAuth debug information
 */
export function logOAuthDebugInfo(): void {
  console.log('\n🔍 OAuth2 Configuration Debug Report:')
  console.log('=====================================')
  
  const report = generateOAuthDebugReport()
  
  // Overall status
  const statusIcon = report.overall === 'healthy' ? '✅' : report.overall === 'warning' ? '⚠️' : '❌'
  console.log(`\nOverall Status: ${statusIcon} ${report.overall.toUpperCase()}`)
  
  // Google OAuth status
  console.log('\n📱 Google OAuth Configuration:')
  if (report.google.configured) {
    console.log('  ✅ Google OAuth properly configured')
  } else {
    console.log('  ❌ Google OAuth configuration issues:')
    report.google.errors.forEach(error => console.log(`     • ${error}`))
  }
  
  if (report.google.warnings.length > 0) {
    console.log('  ⚠️  Google OAuth warnings:')
    report.google.warnings.forEach(warning => console.log(`     • ${warning}`))
  }
  
  // NextAuth status
  console.log('\n🔐 NextAuth Configuration:')
  if (report.nextAuth.urlConfigured && report.nextAuth.secretConfigured) {
    console.log('  ✅ NextAuth properly configured')
    console.log(`     URL: ${report.nextAuth.url}`)
    console.log(`     Secret: ${report.nextAuth.secretLength} characters`)
  } else {
    console.log('  ❌ NextAuth configuration issues:')
    report.nextAuth.errors.forEach(error => console.log(`     • ${error}`))
  }
  
  // Recommendations
  if (report.recommendations.length > 0) {
    console.log('\n💡 Recommendations:')
    report.recommendations.forEach((rec, index) => {
      console.log(`  ${index + 1}. ${rec}`)
    })
  }
  
  console.log('\n📚 For detailed setup instructions, see: README.md')
  console.log('=====================================\n')
}

/**
 * OAuth error handler for debugging
 */
export function handleOAuthError(error: string, req?: NextRequest): {
  userMessage: string
  debugInfo: any
  suggestions: string[]
} {
  const debugInfo = {
    error,
    timestamp: new Date().toISOString(),
    userAgent: req?.headers.get('user-agent'),
    url: req?.url,
    method: req?.method
  }
  
  let userMessage = 'Authentication failed. Please try again.'
  const suggestions: string[] = []
  
  switch (error) {
    case 'AccessDenied':
      userMessage = 'Access was denied. Please ensure you grant permission to the application.'
      suggestions.push('Try signing in again and allow all requested permissions')
      suggestions.push('Check if your Google account has any restrictions')
      suggestions.push('Ensure you are using a supported Google account type')
      break
      
    case 'OAuthCallback':
      userMessage = 'Authentication callback failed. This might be a configuration issue.'
      suggestions.push('Check if NEXTAUTH_URL is correctly configured')
      suggestions.push('Verify Google Cloud Console callback URLs')
      suggestions.push('Check for any browser security restrictions')
      break
      
    case 'OAuthCreateAccount':
      userMessage = 'Failed to create your account. Please try again.'
      suggestions.push('Check database connection and permissions')
      suggestions.push('Verify user table schema matches expected format')
      suggestions.push('Check Supabase service role key configuration')
      break
      
    case 'Configuration':
      userMessage = 'Authentication service is misconfigured. Please contact support.'
      suggestions.push('Check all environment variables are properly set')
      suggestions.push('Verify Google OAuth2 credentials are valid')
      suggestions.push('Ensure NextAuth configuration is complete')
      break
      
    default:
      suggestions.push('Check browser console for additional error details')
      suggestions.push('Try clearing browser cache and cookies')
      suggestions.push('Verify network connectivity')
  }
  
  return {
    userMessage,
    debugInfo,
    suggestions
  }
}

/**
 * Validate Google OAuth redirect URI format
 */
export function validateRedirectUri(baseUrl: string): {
  isValid: boolean
  expectedUri: string
  commonIssues: string[]
} {
  const expectedUri = `${baseUrl}/api/auth/callback/google`
  
  const commonIssues: string[] = []
  
  try {
    const url = new URL(baseUrl)
    
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      commonIssues.push('URL should use http:// or https:// protocol')
    }
    
    if (url.pathname !== '/') {
      commonIssues.push('Base URL should not include path components')
    }
    
    if (url.port && url.port !== '3000' && url.hostname === 'localhost') {
      commonIssues.push('For localhost, ensure port matches your development server')
    }
    
  } catch {
    commonIssues.push('Base URL is not a valid URL format')
  }
  
  return {
    isValid: commonIssues.length === 0,
    expectedUri,
    commonIssues
  }
}

// Auto-run debug logging in development
if (process.env.NODE_ENV === 'development' && process.env.DEBUG_OAUTH === 'true') {
  logOAuthDebugInfo()
}